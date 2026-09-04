"use client";

import { useState } from "react";
import { useLocale, useTranslations } from "next-intl";
import { useRouter } from "@/i18n/navigation";
import { formatMoney } from "@/lib/money";
import MediaPicker, { type PickedMedia } from "@/components/MediaPicker";
import TraitsEditor from "@/components/TraitsEditor";
import type { PigeonTraits } from "@/lib/pigeon-traits";
import type { EditScope } from "@/lib/lot-editing";

/**
 * Modificarea unui lot existent.
 *
 * Două formulare, după cât are voie omul:
 *  - FULL             — aceleași câmpuri ca la listare, precompletate
 *  - ADDITIONS_ONLY   — doar adăugiri: fișiere noi și o completare la descriere
 *
 * Regula e verificată și pe server; aici doar nu arătăm ce oricum ar fi refuzat.
 */

export type LotEditData = {
  id: string;
  ringNumber: string;
  birthYear: number;
  sex: string;
  name: string;
  taglineRo: string;
  taglineEn: string;
  descRo: string;
  descEn: string;
  bredBy: string;
  offeredBy: string;
  color: string;
  strain: string;
  pedigreeUrl: string;
  traits: PigeonTraits;
  media: PickedMedia[];
  results: { raceName: string; distanceKm: string; place: string; participants: string }[];
  startPrice: string;
};

export default function LotEditForm({
  lot,
  scope,
  isAdmin,
  currency,
  minStartCents,
}: {
  lot: LotEditData;
  scope: EditScope;
  isAdmin: boolean;
  currency: string;
  minStartCents: number;
}) {
  const t = useTranslations("sell");
  const tp = useTranslations("pigeon");
  const locale = useLocale();
  const router = useRouter();

  const additions = scope === "ADDITIONS_ONLY";

  const [form, setForm] = useState(lot);
  const [traits, setTraits] = useState<PigeonTraits>(lot.traits);
  const [media, setMedia] = useState<PickedMedia[]>(lot.media);
  const [pedigree, setPedigree] = useState<PickedMedia[]>(
    lot.pedigreeUrl ? [{ url: lot.pedigreeUrl, type: "IMAGE" }] : []
  );
  const [addMedia, setAddMedia] = useState<PickedMedia[]>([]);
  const [note, setNote] = useState("");

  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [saved, setSaved] = useState<{ reapproval: boolean } | null>(null);

  const set = (k: keyof LotEditData, v: unknown) => setForm((f) => ({ ...f, [k]: v }));

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    setBusy(true);
    setError(null);

    const payload = additions
      ? {
          addMedia: addMedia.map((m) => ({ url: m.url, type: m.type })),
          note: note.trim() || undefined,
          pedigreeUrl: lot.pedigreeUrl ? undefined : (pedigree[0]?.url ?? ""),
        }
      : {
          ringNumber: form.ringNumber,
          birthYear: Number(form.birthYear),
          sex: form.sex,
          name: form.name,
          taglineRo: form.taglineRo,
          taglineEn: form.taglineEn,
          descRo: form.descRo,
          descEn: form.descEn,
          bredBy: form.bredBy,
          offeredBy: form.offeredBy,
          color: form.color,
          strain: form.strain,
          pedigreeUrl: pedigree[0]?.url ?? "",
          traits,
          media: media.map((m) => ({ url: m.url, type: m.type })),
          results: form.results
            .filter((r) => r.raceName && r.place)
            .map((r) => ({
              raceName: r.raceName,
              distanceKm: r.distanceKm ? Number(r.distanceKm) : undefined,
              place: Number(r.place),
              participants: r.participants ? Number(r.participants) : undefined,
            })),
          startPriceCents: Math.round(Number(String(form.startPrice).replace(",", ".")) * 100),
        };

    const res = await fetch(`/api/lots/${lot.id}`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(payload),
    });
    const data = await res.json();
    setBusy(false);

    if (data.ok) {
      setSaved({ reapproval: Boolean(data.reapproval) });
      setAddMedia([]);
      setNote("");
      router.refresh();
      return;
    }
    setError(
      data.error === "START_PRICE_TOO_LOW"
        ? t("startPriceMin", { min: formatMoney(data.minimumCents, currency, locale) })
        : data.error === "LOT_LOCKED"
          ? t("editFailed")
          : t("editFailed")
    );
  };

  const input =
    "mt-1 w-full rounded-xl border border-ink/20 bg-ivory-soft px-4 py-2.5 outline-none focus:border-wing-blue";
  const section = "space-y-4 rounded-2xl border border-ink/10 bg-white p-6";

  const hint = isAdmin
    ? t("editAdminHint")
    : additions
      ? t("editAdditionsHint")
      : t("editFullHint");

  return (
    <form onSubmit={submit} className="space-y-6" data-testid="lot-edit-form">
      <p
        className={`rounded-2xl border p-4 text-sm ${
          additions
            ? "border-wing-orange/40 bg-wing-orange/5"
            : "border-wing-blue/30 bg-wing-blue/5"
        }`}
        data-testid="edit-scope-hint"
      >
        {hint}
      </p>

      {additions ? (
        <>
          <section className={section}>
            <h2 className="font-display text-xl font-bold">{t("addPhotos")}</h2>
            {lot.media.length > 0 && (
              <div>
                <p className="mb-2 text-sm font-medium text-ink/60">{t("currentMedia")}</p>
                <div className="flex flex-wrap gap-2" data-testid="existing-media">
                  {lot.media.map((m) =>
                    m.type === "VIDEO" ? (
                      <video
                        key={m.url}
                        src={m.url}
                        muted
                        playsInline
                        preload="metadata"
                        className="h-20 w-24 rounded-lg border border-ink/10 object-cover"
                      />
                    ) : (
                      // eslint-disable-next-line @next/next/no-img-element
                      <img
                        key={m.url}
                        src={m.url}
                        alt=""
                        className="h-20 w-24 rounded-lg border border-ink/10 object-cover"
                      />
                    )
                  )}
                </div>
              </div>
            )}
            <div data-testid="add-media-picker">
              <MediaPicker value={addMedia} onChange={setAddMedia} maxFiles={8} />
            </div>
          </section>

          {!lot.pedigreeUrl && (
            <section className={section}>
              <h2 className="font-display text-xl font-bold">{tp("pedigree")}</h2>
              <div data-testid="edit-pedigree-picker">
                <MediaPicker
                  value={pedigree}
                  onChange={setPedigree}
                  maxFiles={1}
                  allowVideo={false}
                  allowPdf
                />
              </div>
            </section>
          )}

          <section className={section}>
            <h2 className="font-display text-xl font-bold">{t("addNote")}</h2>
            <p className="text-sm text-ink/60">{t("addNoteHint")}</p>
            <textarea
              rows={4}
              value={note}
              onChange={(e) => setNote(e.target.value)}
              data-testid="edit-note"
              className={input}
            />
          </section>
        </>
      ) : (
        <>
          <section className={section}>
            <h2 className="font-display text-xl font-bold">{t("identitySection")}</h2>
            <div className="grid gap-3 sm:grid-cols-3">
              <label className="block text-sm">
                <span className="font-medium">{tp("ring")}</span>
                <input
                  required
                  data-testid="edit-ring"
                  value={form.ringNumber}
                  onChange={(e) => set("ringNumber", e.target.value)}
                  className={input}
                />
              </label>
              <label className="block text-sm">
                <span className="font-medium">{tp("year")}</span>
                <input
                  required
                  type="number"
                  data-testid="edit-year"
                  value={form.birthYear}
                  onChange={(e) => set("birthYear", e.target.value)}
                  className={input}
                />
              </label>
              <label className="block text-sm">
                <span className="font-medium">{tp("sex")}</span>
                <select
                  data-testid="edit-sex"
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
            <label className="block text-sm">
              <span className="font-medium">{tp("name")}</span>
              <input
                required
                data-testid="edit-name"
                value={form.name}
                onChange={(e) => set("name", e.target.value)}
                className={input}
              />
            </label>
          </section>

          <section className={section}>
            <h2 className="font-display text-xl font-bold">{t("descriptionSection")}</h2>
            <label className="block text-sm">
              <span className="font-medium">{tp("tagline")}</span>
              <input
                data-testid="edit-tagline"
                maxLength={200}
                value={form.taglineRo}
                onChange={(e) => set("taglineRo", e.target.value)}
                className={input}
              />
            </label>
            <label className="block text-sm">
              <span className="font-medium">{t("descRo")}</span>
              <textarea
                rows={6}
                data-testid="edit-desc"
                value={form.descRo}
                onChange={(e) => set("descRo", e.target.value)}
                className={input}
              />
            </label>
          </section>

          <section className={section}>
            <h2 className="font-display text-xl font-bold">{t("mediaSection")}</h2>
            <div data-testid="edit-pedigree-picker">
              <MediaPicker
                value={pedigree}
                onChange={setPedigree}
                maxFiles={1}
                allowVideo={false}
                allowPdf
                label={tp("pedigree")}
              />
            </div>
            <div className="border-t border-ink/10 pt-4" data-testid="edit-media-picker">
              <MediaPicker value={media} onChange={setMedia} maxFiles={10} label={t("photos")} />
            </div>
          </section>

          <section className={section}>
            <h2 className="font-display text-xl font-bold">{t("originSection")}</h2>
            <div className="grid gap-3 sm:grid-cols-2">
              <label className="block text-sm">
                <span className="font-medium">{tp("bredBy")}</span>
                <input
                  data-testid="edit-bred-by"
                  value={form.bredBy}
                  onChange={(e) => set("bredBy", e.target.value)}
                  className={input}
                />
              </label>
              <label className="block text-sm">
                <span className="font-medium">{tp("offeredBy")}</span>
                <input
                  data-testid="edit-offered-by"
                  value={form.offeredBy}
                  onChange={(e) => set("offeredBy", e.target.value)}
                  className={input}
                />
              </label>
            </div>
          </section>

          <section className={section}>
            <h2 className="font-display text-xl font-bold">{t("auctionSection")}</h2>
            <label className="block text-sm">
              <span className="font-medium">{t("startPrice", { currency })}</span>
              <input
                required
                type="number"
                step="1"
                min={minStartCents / 100}
                data-testid="edit-start-price"
                value={form.startPrice}
                onChange={(e) => set("startPrice", e.target.value)}
                className={input}
              />
              <span className="text-xs text-ink/50">
                {t("startPriceMin", { min: formatMoney(minStartCents, currency, locale) })}
              </span>
            </label>
          </section>

          <details className="rounded-2xl border border-ink/10 bg-white" data-testid="edit-more">
            <summary className="cursor-pointer px-6 py-4 font-display text-xl font-bold">
              {t("moreSection")}
            </summary>
            <div className="space-y-4 border-t border-ink/10 p-6">
              <div className="grid gap-3 sm:grid-cols-2">
                <label className="block text-sm">
                  <span className="font-medium">{tp("color")}</span>
                  <input
                    data-testid="edit-color"
                    value={form.color}
                    onChange={(e) => set("color", e.target.value)}
                    className={input}
                  />
                </label>
                <label className="block text-sm">
                  <span className="font-medium">{tp("strain")}</span>
                  <input
                    data-testid="edit-strain"
                    value={form.strain}
                    onChange={(e) => set("strain", e.target.value)}
                    className={input}
                  />
                </label>
              </div>
              <div className="border-t border-ink/10 pt-4">
                <p className="mb-3 text-sm font-bold">{t("traitsSection")}</p>
                <TraitsEditor value={traits} onChange={setTraits} />
              </div>
            </div>
          </details>
        </>
      )}

      {error && (
        <p
          className="rounded-lg bg-wing-red/10 px-3 py-2 text-sm text-wing-red"
          data-testid="edit-error"
        >
          {error}
        </p>
      )}

      {saved && (
        <p
          className="rounded-2xl border border-green-300 bg-green-50 px-4 py-3 text-sm font-medium text-green-800"
          data-testid="edit-saved"
        >
          ✓ {t("editSaved")}
          {saved.reapproval && ` ${t("editReapproval")}`}
        </p>
      )}

      <button
        type="submit"
        disabled={busy}
        data-testid="edit-submit"
        className="w-full rounded-xl bg-ink py-3 font-bold text-ivory hover:bg-wing-orange disabled:opacity-50"
      >
        {busy ? "…" : t("saveEdit")}
      </button>
    </form>
  );
}
