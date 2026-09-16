import { prisma } from "./db";
import { getSettings } from "./settings";
import { buildEndingNotices, type EndingLot, type EndingNotice } from "./lots";
import { sendEmail } from "./mailer";
import { formatMoney } from "./money";
import { endingUnsubscribeUrl } from "./ending-unsubscribe";
import { getEurRate } from "./fx";
import { equivalentLabel } from "./fx-math";
import { intlLocale, normalizeLocale, pick } from "./locales";
import { emailTranslator } from "./messages";

/**
 * Avizul „se încheie în 30 de minute", pentru loturi.
 *
 * Cerința clientului: cu 30 de minute înainte de final, e-mail tuturor celor
 * cu cont care l-au ales, iar celor care au licitat, special, cu porumbeii lor.
 *
 * Un singur e-mail pe om pentru toate loturile care ajung la prag în aceeași
 * trecere — cu 15 crescători și câte 5 loturi, altfel același om ar primi
 * zeci de mesaje în aceeași seară. Avizul pleacă o singură dată pe lot, chiar
 * dacă prelungirile mută ora de final.
 */
export async function notifyLotsEnding(now: Date): Promise<number> {
  const settings = await getSettings();
  const prag = new Date(now.getTime() + settings.endingNoticeMinutes * 60_000);

  const candidates = await prisma.lot.findMany({
    where: { status: "LIVE", endingNotifiedAt: null, endsAt: { gt: now, lte: prag } },
    select: { id: true },
  });
  if (candidates.length === 0) return 0;

  // Fiecare lot se „revendică" separat: dacă două treceri rulează în paralel
  // (sweeper-ul și o ofertă), doar una dintre ele trimite avizul.
  const claimed: string[] = [];
  for (const c of candidates) {
    const r = await prisma.lot.updateMany({
      where: { id: c.id, endingNotifiedAt: null },
      data: { endingNotifiedAt: now },
    });
    if (r.count === 1) claimed.push(c.id);
  }
  if (claimed.length === 0) return 0;

  const lots = await prisma.lot.findMany({
    where: { id: { in: claimed } },
    include: {
      sale: { include: { breeder: true } },
      auctions: {
        where: { status: "LIVE" },
        include: {
          pigeon: { select: { name: true } },
          bids: { select: { bidderId: true, isLeading: true } },
        },
      },
    },
  });

  const ending: EndingLot[] = lots.map((l) => ({
    lotId: l.id,
    lotNumber: l.number,
    saleSlug: l.sale.slug,
    saleTitle: l.sale.titleRo,
    breederName: l.sale.breeder.name,
    endsAt: l.endsAt,
    pigeons: l.auctions.map((a) => ({
      auctionId: a.id,
      position: a.lotPosition ?? 0,
      name: a.pigeon.name,
      priceCents: a.bids.length > 0 ? a.currentPriceCents : a.startPriceCents,
      leaderId: a.bids.find((b) => b.isLeading)?.bidderId ?? null,
      bidderIds: [...new Set(a.bids.map((b) => b.bidderId))],
    })),
  }));

  const optedIn = await prisma.user.findMany({
    where: { notifyAuctionEnding: true, suspendedAt: null },
    select: { id: true },
  });
  // Pe planul gratuit de e-mail, avizul pleacă doar la cei care au licitat;
  // cei care doar au bifat avizele îl primesc când e pornit din Setări.
  const notices = buildEndingNotices(
    ending,
    settings.endingNoticeGeneralEnabled ? optedIn.map((u) => u.id) : []
  );

  const users = await prisma.user.findMany({
    where: { id: { in: notices.map((n) => n.userId) }, suspendedAt: null },
    select: { id: true, email: true, locale: true },
  });
  const byId = new Map(users.map((u) => [u.id, u]));

  const titles = new Map(lots.map((l) => [l.id, { ro: l.sale.titleRo, en: l.sale.titleEn }]));

  for (const notice of notices) {
    const user = byId.get(notice.userId);
    if (!user) continue;
    const locale = normalizeLocale(user.locale);
    const email = renderEndingEmail(notice, {
      locale,
      minutes: settings.endingNoticeMinutes,
      currency: settings.platformCurrency,
      eurRate: await getEurRate(),
      titles,
      unsubscribeUrl: notice.kind === "GENERAL" ? endingUnsubscribeUrl(user.id, locale) : null,
    });

    await prisma.notification.create({
      data: {
        userId: user.id,
        type: notice.kind === "BIDDER" ? "LOTS_ENDING_BIDDER" : "LOTS_ENDING",
        paramsJson: JSON.stringify({
          count: notice.lots.length,
          minutes: settings.endingNoticeMinutes,
        }),
        link: `/sales/${notice.lots[0].saleSlug}`,
      },
    });
    await sendEmail({ to: user.email, subject: email.subject, text: email.text });
  }

  return notices.length;
}

/** Textul e-mailului. Separat, ca să poată fi citit și verificat ușor. */
export function renderEndingEmail(
  notice: EndingNotice,
  ctx: {
    /** limba contului; titlul licitației e în română sau, altfel, în engleză */
    locale: string;
    minutes: number;
    currency: string;
    eurRate?: number | null;
    titles: Map<string, { ro: string; en: string }>;
    unsubscribeUrl: string | null;
  }
): { subject: string; text: string } {
  const locale = normalizeLocale(ctx.locale);
  const t = emailTranslator(locale);
  const base = (process.env.PUBLIC_BASE_URL ?? "").replace(/\/$/, "");
  const ora = new Intl.DateTimeFormat(intlLocale(locale), {
    timeStyle: "short",
    timeZone: "Europe/Bucharest",
  });
  const bani = (c: number) => {
    const suma = formatMoney(c, ctx.currency, locale);
    const eq = ctx.eurRate ? equivalentLabel(c, ctx.currency, locale, ctx.eurRate) : null;
    return eq ? `${suma} (${eq})` : suma;
  };
  const minutes = ctx.minutes;

  const subject = t(notice.kind === "BIDDER" ? "lots.subjectBidder" : "lots.subjectGeneral", { minutes });

  const lines: string[] = [t("hello"), "", t("lots.intro", { minutes }), ""];
  for (const lot of notice.lots) {
    const titles = ctx.titles.get(lot.lotId);
    const title = titles ? pick(locale, titles.ro, titles.en) : lot.saleTitle;
    lines.push(t("lots.lotLine", { title, lot: String(lot.lotNumber), time: ora.format(lot.endsAt) }));
    lines.push(`  ${base}/${locale}/sales/${lot.saleSlug}`);
  }

  if (notice.kind === "BIDDER") {
    lines.push("", t("lots.mineTitle"), "");
    for (const p of notice.mine) {
      const state = t(p.leading ? "lots.leading" : "lots.outbid");
      lines.push(t("lots.pigeonLine", { label: p.label, name: p.name, price: bani(p.priceCents), state }));
      lines.push(`  ${base}/${locale}/auctions/${p.auctionId}`);
    }
  }

  lines.push("", t("lots.extension"));
  if (ctx.unsubscribeUrl) lines.push("", t("lots.unsubscribe", { url: ctx.unsubscribeUrl }));

  return { subject, text: lines.join("\n") };
}
