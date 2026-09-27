/**
 * Anunțul „ai fost depășit", cu tot ce-i trebuie omului.
 *
 * Datele se citesc după ce oferta a fost scrisă, nu în tranzacție: o cerere în
 * plus la baza de date nu are ce căuta înăuntrul unei tranzacții serializabile,
 * pe care o dispută mai mulți ofertanți deodată.
 */

import { prisma } from "./db";
import { notify } from "./notify";
import { lotLabel } from "./lots";
import { normalizeLocale, pick } from "./locales";
import { outbidSubject, outbidText, type OutbidData } from "./outbid-email";

export async function notifyOutbid(p: {
  auctionId: string;
  /** cine a fost depășit */
  userId: string;
  /** plafonul lui, cel care tocmai a fost bătut */
  yourMaxCents: number;
  priceCents: number;
  minNextCents: number;
  endsAt: Date;
  currency: string;
}): Promise<void> {
  const [auction, user] = await Promise.all([
    prisma.auction.findUnique({
      where: { id: p.auctionId },
      include: {
        pigeon: { select: { name: true, ringNumber: true } },
        lot: { include: { sale: { select: { titleRo: true, titleEn: true } } } },
      },
    }),
    prisma.user.findUnique({ where: { id: p.userId }, select: { locale: true } }),
  ]);
  if (!auction) return;

  const locale = normalizeLocale(user?.locale);
  const base = (process.env.SITE_URL ?? process.env.PUBLIC_BASE_URL ?? "").replace(/\/+$/, "");
  const date: OutbidData = {
    locale,
    pigeon: auction.pigeon.name,
    ring: auction.pigeon.ringNumber,
    lotLabel:
      auction.lot && auction.lotPosition ? lotLabel(auction.lot.number, auction.lotPosition) : null,
    sale: auction.lot ? pick(locale, auction.lot.sale.titleRo, auction.lot.sale.titleEn) : null,
    currency: p.currency,
    priceCents: p.priceCents,
    yourMaxCents: p.yourMaxCents,
    minNextCents: p.minNextCents,
    endsAt: p.endsAt,
    url: base ? `${base}/${locale}/auctions/${p.auctionId}` : `/auctions/${p.auctionId}`,
  };

  await notify(
    p.userId,
    "OUTBID",
    { lot: auction.pigeon.name, priceCents: p.priceCents, currency: p.currency },
    `/auctions/${p.auctionId}`,
    { emailText: outbidText(date), subject: outbidSubject(date) }
  );
}
