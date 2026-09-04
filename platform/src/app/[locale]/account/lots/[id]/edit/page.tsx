import { notFound } from "next/navigation";
import { getTranslations, setRequestLocale } from "next-intl/server";
import { redirect, Link } from "@/i18n/navigation";
import { getCurrentUser } from "@/lib/auth";
import { prisma } from "@/lib/db";
import { getSettings } from "@/lib/settings";
import { parseTraits } from "@/lib/pigeon-traits";
import { editScope } from "@/lib/lot-editing";
import LotEditForm, { type LotEditData } from "@/components/LotEditForm";

export const dynamic = "force-dynamic";

/**
 * Pagina de modificare a unui lot. Accesibilă crescătorului care l-a listat
 * și adminului. Cât se poate schimba se decide din starea lotului.
 */
export default async function EditLotPage({
  params,
}: {
  params: Promise<{ locale: string; id: string }>;
}) {
  const { locale, id } = await params;
  setRequestLocale(locale);
  const t = await getTranslations("sell");
  const ta = await getTranslations("account");

  const user = await getCurrentUser();
  if (!user) redirect({ href: "/login", locale });

  const auction = await prisma.auction.findUnique({
    where: { id },
    include: {
      pigeon: {
        include: {
          media: { orderBy: { sortIdx: "asc" } },
          results: { orderBy: [{ year: "desc" }, { place: "asc" }] },
        },
      },
      _count: { select: { bids: true } },
    },
  });
  if (!auction) notFound();

  const isAdmin = user!.role === "ADMIN";
  if (auction.sellerId !== user!.id && !isAdmin) notFound();

  const scope = editScope(
    { status: auction.status, bidCount: auction._count.bids },
    isAdmin
  );

  if (scope === "NONE") {
    return (
      <div className="mx-auto max-w-2xl px-4 py-10">
        <p
          className="rounded-2xl border border-ink/15 bg-white p-6 text-sm"
          data-testid="lot-locked"
        >
          {ta("lotLocked")}
        </p>
        <Link
          href="/account/lots"
          className="-my-1 mt-4 inline-block py-2.5 font-semibold text-wing-blue hover:underline"
        >
          ← {ta("myLots")}
        </Link>
      </div>
    );
  }

  const settings = await getSettings();
  const p = auction.pigeon;

  const lot: LotEditData = {
    id: auction.id,
    ringNumber: p.ringNumber,
    birthYear: p.birthYear,
    sex: p.sex,
    name: p.name,
    taglineRo: p.taglineRo ?? "",
    taglineEn: p.taglineEn ?? "",
    descRo: p.descRo ?? "",
    descEn: p.descEn ?? "",
    bredBy: p.bredBy ?? "",
    offeredBy: p.offeredBy ?? "",
    color: p.color ?? "",
    strain: p.strain ?? "",
    pedigreeUrl: p.pedigreeUrl ?? "",
    traits: parseTraits(p.traitsJson),
    media: p.media.map((m) => ({
      url: m.url,
      type: m.type === "VIDEO" ? "VIDEO" : "IMAGE",
    })),
    results: p.results.map((r) => ({
      raceName: r.raceName,
      distanceKm: r.distanceKm ? String(r.distanceKm) : "",
      place: String(r.place),
      participants: r.participants ? String(r.participants) : "",
    })),
    startPrice: String(auction.startPriceCents / 100),
  };

  return (
    <div className="mx-auto max-w-2xl px-4 py-10">
      <Link
        href="/account/lots"
        className="-my-1 mb-2 inline-block py-2.5 text-sm font-semibold text-wing-blue hover:underline"
      >
        ← {ta("myLots")}
      </Link>
      <h1 className="font-display mb-1 text-3xl font-bold">{t("editTitle")}</h1>
      <p className="mb-6 text-ink/60">
        {p.name} · {p.ringNumber}
      </p>

      <LotEditForm
        lot={lot}
        scope={scope}
        isAdmin={isAdmin}
        currency={settings.platformCurrency}
        minStartCents={settings.minStartPriceCents}
      />
    </div>
  );
}
