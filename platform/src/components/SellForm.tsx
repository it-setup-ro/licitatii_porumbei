"use client";

import { useState } from "react";
import { useLocale, useTranslations } from "next-intl";
import { formatMoney } from "@/lib/money";
import MediaPicker, { type PickedMedia } from "@/components/MediaPicker";

/**
 * Formularul de listare, in ordinea de pe pipa.be:
 *   serie/an/sex → nume → descriere → pedigree → foto → video →
 *   reprodus de → oferit de → pret de pornire
 *
 * Restul (culoare, linie, palmares, ADN, livrare, tip listare) sta pliat sub
 * „Alte detalii" — sunt campuri pe care putini le completeaza, iar in fata lor
 * formularul parea de doua ori mai lung decat este.
 */

type ResultRow = { raceName: string; distanceKm: string; place: string; participants: string };

export default function SellForm({
  currency,
  minStartCents,
  commissionPercent,
  assistedPercent,
  assistedEnabled,
  durationDays,
  defaultOfferedBy,
}: {
  currency: string;
  minStartCents: number;
  commissionPercent: number;
  assistedPercent: number;
  assistedEnabled: boolean;
  durationDays: number;
  /** numele contului care listeaza — precompleteaza „Oferit de" */
  defaultOfferedBy: string;
}) {
  const t = useTranslations("sell");
  const tp = useTranslations("pigeon");
  const locale = useLocale();

  const [form, setForm] = useState({
    ringNumber: "",
    birthYear: new Date().getFullYear() - 1,
    sex: "M",
    name: "",
    taglineRo: "",
    taglineEn: "",
    descRo: "",
    descEn: "",
    bredBy: "",
    offeredBy: defaultOfferedBy,
    color: "",
    strain: "",
    startPrice: "",
    listingType: "SELF",
    shippingMode: "SELLER",
    dnaSexGuaranteed: false,
  });
  const [photos, setPhotos] = useState<PickedMedia[]>([]);
  const [videos, setVideos] = useState<PickedMedia[]>([]);
  const [pedigree, setPedigree] = useState<PickedMedia[]>([]);
  const [results, setResults] = useState<ResultRow[]>([]);
  const [showEn, setShowEn] = useState(false);
  const [done, setDone] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  const set = (k: string, v: unknown) => setForm((f) => ({ ...f, [k]: v }));

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    setBusy(true);
    setError(null);
    const res = await fetch("/api/sell", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        ...form,
        birthYear: Number(form.birthYear),
        startPriceCents: Math.round(Number(form.startPrice.replace(",", ".")) * 100),
        pedigreeUrl: pedigree[0]?.url ?? "",
        // pozele intai, clipurile dupa — prima poza devine coperta lotului
        media: [...photos, ...videos].map((m) => ({ url: m.url, type: m.type })),
        results: results
          .filter((r) => r.raceName && r.place)
          .map((r) => ({
            raceName: r.raceName,
            distanceKm: r.distanceKm ? Number(r.distanceKm) : undefined,
            place: Number(r.place),
            participants: r.participants ? Number(r.participants) : undefined,
          })),
      }),
    });
    const data = await res.json();
    setBusy(false);
    if (data.ok) setDone(true);
    else if (data.error === "START_PRICE_TOO_LOW")
      setError(t("startPriceMin", { min: formatMoney(data.minimumCents, currency, locale) }));
    else setError(data.error);
  };

  if (done) {
    return (
      <p
        className="rounded-2xl border border-green-300 bg-green-50 p-5 font-medium text-green-800"
        data-testid="sell-success"
      >
        ✓ {t("submitted")}
      </p>
    );
  }

  const input =
    "mt-1 w-full rounded-xl border border-ink/20 bg-ivory-soft px-4 py-2.5 outline-none focus:border-wing-blue";
  const section = "space-y-4 rounded-2xl border border-ink/10 bg-white p-6";

  return (
    <form onSubmit={submit} className="space-y-6" data-testid="sell-form">
      {/* 1. Serie · an · sex */}
      <section className={section}>
        <h2 className="font-display text-xl font-bold">{t("identitySection")}</h2>
        <div className="grid gap-3 sm:grid-cols-3">
          <label className="block text-sm">
            <span className="font-medium">{tp("ring")}</span>
            <input
              required
              data-testid="sf-ring"
              value={form.ringNumber}
              onChange={(e) => set("ringNumber", e.target.value)}
              placeholder="RO 2024 123456"
              className={input}
            />
          </label>
          <label className="block text-sm">
            <span className="font-medium">{tp("year")}</span>
            <input
              required
              type="number"
              data-testid="sf-year"
              value={form.birthYear}
              onChange={(e) => set("birthYear", e.target.value)}
              className={input}
            />
          </label>
          <label className="block text-sm">
            <span className="font-medium">{tp("sex")}</span>
            <select
              data-testid="sf-sex"
              value={form.sex}
              onChange={(e) => set("sex", e.target.value)}
              className={input}
            >
              <option value="M">{tp("sexM")}</option>
              <option value="F">{tp("sexF")}</option>
              <option value="U">{tp("sexU")}</option>
            </select>
          </label>
        </div>

        {/* 2. Numele porumbelului */}
        <label className="block text-sm">
          <span className="font-medium">{tp("name")}</span>
          <input
            required
            data-testid="sf-name"
            value={form.name}
            onChange={(e) => set("name", e.target.value)}
            placeholder={t("namePlaceholder")}
            className={input}
          />
          <span className="text-xs text-ink/50">{t("nameHint")}</span>
        </label>
      </section>

      {/* 3. Descrierea: randul scurt + textul lung */}
      <section className={section}>
        <h2 className="font-display text-xl font-bold">{t("descriptionSection")}</h2>
        <label className="block text-sm">
          <span className="font-medium">{tp("tagline")}</span>
          <input
            data-testid="sf-tagline"
            value={form.taglineRo}
            onChange={(e) => set("taglineRo", e.target.value)}
            maxLength={200}
            placeholder={t("taglinePlaceholder")}
            className={input}
          />
          <span className="text-xs text-ink/50">{t("taglineHint")}</span>
        </label>
        <label className="block text-sm">
          <span className="font-medium">{t("descRo")}</span>
          <textarea
            rows={6}
            data-testid="sf-desc-ro"
            value={form.descRo}
            onChange={(e) => set("descRo", e.target.value)}
            placeholder={t("descPlaceholder")}
            className={input}
          />
        </label>

        {!showEn ? (
          <button
            type="button"
            onClick={() => setShowEn(true)}
            data-testid="sf-add-en"
            className="rounded-lg border border-ink/20 px-4 py-2.5 text-xs font-semibold hover:border-wing-blue"
          >
            + {t("addEnglish")}
          </button>
        ) : (
          <div className="space-y-3 rounded-xl border border-ink/10 bg-ivory-soft p-4">
            <p className="text-xs text-ink/60">{t("englishHint")}</p>
            <label className="block text-sm">
              <span className="font-medium">{tp("tagline")} (EN)</span>
              <input
                data-testid="sf-tagline-en"
                value={form.taglineEn}
                onChange={(e) => set("taglineEn", e.target.value)}
                maxLength={200}
                className={input}
              />
            </label>
            <label className="block text-sm">
              <span className="font-medium">{t("descEn")}</span>
              <textarea
                rows={5}
                data-testid="sf-desc-en"
                value={form.descEn}
                onChange={(e) => set("descEn", e.target.value)}
                className={input}
              />
            </label>
          </div>
        )}
      </section>

      {/* 4-6. Pedigree, foto, video */}
      <section className={section}>
        <h2 className="font-display text-xl font-bold">{t("mediaSection")}</h2>

        <div data-testid="sf-pedigree-picker">
          <MediaPicker
            value={pedigree}
            onChange={setPedigree}
            maxFiles={1}
            allowVideo={false}
            allowPdf
            label={tp("pedigree")}
          />
          <p className="mt-1 text-xs text-ink/50">{t("pedigreeHint")}</p>
        </div>

        <div className="border-t border-ink/10 pt-4" data-testid="sf-photos-picker">
          <MediaPicker
            value={photos}
            onChange={setPhotos}
            maxFiles={8}
            allowVideo={false}
            label={t("photos")}
          />
        </div>

        <div className="border-t border-ink/10 pt-4" data-testid="sf-videos-picker">
          <MediaPicker
            value={videos}
            onChange={setVideos}
            maxFiles={2}
            allowImages={false}
            label={t("videos")}
          />
        </div>
      </section>

      {/* 7-8. Reprodus de / oferit de */}
      <section className={section}>
        <h2 className="font-display text-xl font-bold">{t("originSection")}</h2>
        <div className="grid gap-3 sm:grid-cols-2">
          <label className="block text-sm">
            <span className="font-medium">{tp("bredBy")}</span>
            <input
              data-testid="sf-bred-by"
              value={form.bredBy}
              onChange={(e) => set("bredBy", e.target.value)}
              placeholder={t("bredByPlaceholder")}
              className={input}
            />
          </label>
          <label className="block text-sm">
            <span className="font-medium">{tp("offeredBy")}</span>
            <input
              data-testid="sf-offered-by"
              value={form.offeredBy}
              onChange={(e) => set("offeredBy", e.target.value)}
              className={input}
            />
            <span className="text-xs text-ink/50">{t("offeredByHint")}</span>
          </label>
        </div>
      </section>

      {/* 9. Pretul de pornire */}
      <section className={section}>
        <h2 className="font-display text-xl font-bold">{t("auctionSection")}</h2>
        <label className="block text-sm">
          <span className="font-medium">{t("startPrice", { currency })}</span>
          <input
            required
            type="number"
            step="1"
            min={minStartCents / 100}
            data-testid="sf-start-price"
            value={form.startPrice}
            onChange={(e) => set("startPrice", e.target.value)}
            className={input}
          />
          <span className="text-xs text-ink/50">
            {t("startPriceMin", { min: formatMoney(minStartCents, currency, locale) })}
          </span>
        </label>
        <p className="text-xs text-ink/50">{t("duration", { days: durationDays })}</p>
      </section>

      {/* Restul informatiilor — pliate, ca formularul sa nu sperie */}
      <details className="rounded-2xl border border-ink/10 bg-white" data-testid="sf-more">
        <summary className="cursor-pointer px-6 py-4 font-display text-xl font-bold">
          {t("moreSection")}
        </summary>
        <div className="space-y-4 border-t border-ink/10 p-6">
          <div className="grid gap-3 sm:grid-cols-2">
            <label className="block text-sm">
              <span className="font-medium">{tp("color")}</span>
              <input
                data-testid="sf-color"
                value={form.color}
                onChange={(e) => set("color", e.target.value)}
                className={input}
              />
            </label>
            <label className="block text-sm">
              <span className="font-medium">{tp("strain")}</span>
              <input
                data-testid="sf-strain"
                value={form.strain}
                onChange={(e) => set("strain", e.target.value)}
                placeholder="Janssen, Van Loon…"
                className={input}
              />
            </label>
          </div>

          {/* Palmares */}
          <div>
            <p className="text-sm font-medium">{t("resultsHint")}</p>
            {results.map((r, i) => (
              <div key={i} className="mt-2 grid grid-cols-2 gap-2 sm:grid-cols-4">
                <input
                  placeholder={t("raceName")}
                  data-testid={`sf-race-${i}`}
                  value={r.raceName}
                  onChange={(e) =>
                    setResults((rs) =>
                      rs.map((x, j) => (j === i ? { ...x, raceName: e.target.value } : x))
                    )
                  }
                  className={input}
                />
                <input
                  placeholder={t("distanceKm")}
                  type="number"
                  value={r.distanceKm}
                  onChange={(e) =>
                    setResults((rs) =>
                      rs.map((x, j) => (j === i ? { ...x, distanceKm: e.target.value } : x))
                    )
                  }
                  className={input}
                />
                <input
                  placeholder={t("place")}
                  type="number"
                  data-testid={`sf-place-${i}`}
                  value={r.place}
                  onChange={(e) =>
                    setResults((rs) =>
                      rs.map((x, j) => (j === i ? { ...x, place: e.target.value } : x))
                    )
                  }
                  className={input}
                />
                <input
                  placeholder={t("participants")}
                  type="number"
                  value={r.participants}
                  onChange={(e) =>
                    setResults((rs) =>
                      rs.map((x, j) => (j === i ? { ...x, participants: e.target.value } : x))
                    )
                  }
                  className={input}
                />
              </div>
            ))}
            <button
              type="button"
              data-testid="sf-add-result"
              onClick={() =>
                setResults((rs) => [
                  ...rs,
                  { raceName: "", distanceKm: "", place: "", participants: "" },
                ])
              }
              className="mt-2 rounded-lg border border-ink/20 px-4 py-2.5 text-xs font-semibold hover:border-wing-blue"
            >
              + {t("addResult")}
            </button>
          </div>

          <div className="text-sm">
            <span className="font-medium">{t("listingType")}</span>
            <div className="mt-2 space-y-2">
              <label className="flex items-center gap-2">
                <input
                  type="radio"
                  className="h-5 w-5 shrink-0 accent-wing-blue"
                  name="listingType"
                  checked={form.listingType === "SELF"}
                  onChange={() => set("listingType", "SELF")}
                  data-testid="sf-listing-self"
                />
                {t("listingSELF", { percent: commissionPercent })}
              </label>
              {assistedEnabled && (
                <label className="flex items-center gap-2">
                  <input
                    type="radio"
                    className="h-5 w-5 shrink-0 accent-wing-blue"
                    name="listingType"
                    checked={form.listingType === "ASSISTED"}
                    onChange={() => set("listingType", "ASSISTED")}
                    data-testid="sf-listing-assisted"
                  />
                  {t("listingASSISTED", { percent: assistedPercent })}
                </label>
              )}
            </div>
          </div>

          <label className="block text-sm">
            <span className="font-medium">{t("shippingMode")}</span>
            <select
              data-testid="sf-shipping"
              value={form.shippingMode}
              onChange={(e) => set("shippingMode", e.target.value)}
              className={input}
            >
              <option value="SELLER">SELLER</option>
              <option value="PICKUP">PICKUP</option>
            </select>
          </label>

          <label className="flex items-center gap-2 text-sm">
            <input
              type="checkbox"
              className="h-5 w-5 shrink-0 accent-wing-blue"
              checked={form.dnaSexGuaranteed}
              onChange={(e) => set("dnaSexGuaranteed", e.target.checked)}
              data-testid="sf-dna"
            />
            {t("dnaGuarantee")}
          </label>
        </div>
      </details>

      {error && (
        <p
          className="rounded-lg bg-wing-red/10 px-3 py-2 text-sm text-wing-red"
          data-testid="sell-error"
        >
          {error}
        </p>
      )}
      <button
        type="submit"
        disabled={busy}
        data-testid="sell-submit"
        className="w-full rounded-xl bg-ink py-3 font-bold text-ivory hover:bg-wing-orange disabled:opacity-50"
      >
        {t("submit")}
      </button>
    </form>
  );
}
