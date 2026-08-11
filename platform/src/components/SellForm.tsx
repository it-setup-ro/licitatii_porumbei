"use client";

import { useRef, useState } from "react";
import { useLocale, useTranslations } from "next-intl";
import { formatMoney } from "@/lib/money";

type ResultRow = { raceName: string; distanceKm: string; place: string; participants: string };

export default function SellForm({
  currency,
  minStartCents,
  commissionPercent,
  assistedPercent,
  assistedEnabled,
  durationDays,
}: {
  currency: string;
  minStartCents: number;
  commissionPercent: number;
  assistedPercent: number;
  assistedEnabled: boolean;
  durationDays: number;
}) {
  const t = useTranslations("sell");
  const tp = useTranslations("pigeon");
  const locale = useLocale();

  const [form, setForm] = useState({
    ringNumber: "",
    birthYear: new Date().getFullYear() - 1,
    sex: "M",
    color: "",
    strain: "",
    titleRo: "",
    titleEn: "",
    descRo: "",
    descEn: "",
    startPrice: "",
    listingType: "SELF",
    shippingMode: "SELLER",
    dnaSexGuaranteed: false,
    mediaUrls: "",
  });
  const [results, setResults] = useState<ResultRow[]>([]);
  const [uploadedUrls, setUploadedUrls] = useState<string[]>([]);
  const [uploading, setUploading] = useState(false);
  const [uploadError, setUploadError] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [done, setDone] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  const set = (k: string, v: unknown) => setForm((f) => ({ ...f, [k]: v }));

  const uploadFiles = async (fileList: FileList | null) => {
    if (!fileList || fileList.length === 0) return;
    setUploading(true);
    setUploadError(null);
    const data = new FormData();
    for (const file of Array.from(fileList)) data.append("files", file);
    try {
      const res = await fetch("/api/upload", { method: "POST", body: data });
      const body = await res.json();
      if (body.ok) {
        setUploadedUrls((prev) => [...prev, ...body.urls]);
      } else {
        setUploadError(
          body.error === "FILE_TOO_LARGE"
            ? t("uploadTooLarge")
            : body.error === "INVALID_TYPE"
              ? t("uploadInvalidType")
              : t("uploadFailed")
        );
      }
    } catch {
      setUploadError(t("uploadFailed"));
    } finally {
      setUploading(false);
      if (fileInputRef.current) fileInputRef.current.value = "";
    }
  };

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
        mediaUrls: [
          ...uploadedUrls,
          ...form.mediaUrls
            .split("\n")
            .map((s) => s.trim())
            .filter(Boolean),
        ],
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

  return (
    <form onSubmit={submit} className="space-y-6" data-testid="sell-form">
      <section className="space-y-3 rounded-2xl border border-ink/10 bg-white p-6">
        <h2 className="font-display text-xl font-bold">{t("pigeonSection")}</h2>
        <div className="grid gap-3 sm:grid-cols-2">
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
          <label className="block text-sm">
            <span className="font-medium">{tp("color")}</span>
            <input
              data-testid="sf-color"
              value={form.color}
              onChange={(e) => set("color", e.target.value)}
              className={input}
            />
          </label>
          <label className="block text-sm sm:col-span-2">
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
        <label className="block text-sm">
          <span className="font-medium">{t("titleRo")}</span>
          <input
            required
            data-testid="sf-title-ro"
            value={form.titleRo}
            onChange={(e) => set("titleRo", e.target.value)}
            className={input}
          />
        </label>
        <label className="block text-sm">
          <span className="font-medium">{t("titleEn")}</span>
          <input
            required
            data-testid="sf-title-en"
            value={form.titleEn}
            onChange={(e) => set("titleEn", e.target.value)}
            className={input}
          />
        </label>
        <label className="block text-sm">
          <span className="font-medium">{t("descRo")}</span>
          <textarea
            rows={3}
            data-testid="sf-desc-ro"
            value={form.descRo}
            onChange={(e) => set("descRo", e.target.value)}
            className={input}
          />
        </label>
        <label className="block text-sm">
          <span className="font-medium">{t("descEn")}</span>
          <textarea
            rows={3}
            data-testid="sf-desc-en"
            value={form.descEn}
            onChange={(e) => set("descEn", e.target.value)}
            className={input}
          />
        </label>
        {/* Poze: upload de pe calculator (principal) */}
        <div className="text-sm">
          <span className="font-medium">{t("photos")}</span>
          <div className="mt-2">
            <input
              ref={fileInputRef}
              type="file"
              accept="image/jpeg,image/png,image/webp"
              multiple
              className="hidden"
              data-testid="sf-file-input"
              onChange={(e) => uploadFiles(e.target.files)}
            />
            <button
              type="button"
              data-testid="sf-browse"
              onClick={() => fileInputRef.current?.click()}
              disabled={uploading}
              className="rounded-xl border-2 border-dashed border-ink/25 bg-ivory-soft px-5 py-3 font-semibold text-ink/70 hover:border-wing-blue hover:text-wing-blue disabled:opacity-50"
            >
              {uploading ? t("uploading") : `📷 ${t("browsePhotos")}`}
            </button>
            <p className="mt-1 text-xs text-ink/50">{t("uploadHint")}</p>
            {uploadError && (
              <p className="mt-1 rounded-lg bg-wing-red/10 px-3 py-1.5 text-xs text-wing-red" data-testid="upload-error">
                {uploadError}
              </p>
            )}
            {uploadedUrls.length > 0 && (
              <div className="mt-3 flex flex-wrap gap-3" data-testid="upload-previews">
                {uploadedUrls.map((url) => (
                  <div key={url} className="relative">
                    {/* eslint-disable-next-line @next/next/no-img-element */}
                    <img
                      src={url}
                      alt=""
                      className="h-20 w-28 rounded-lg border border-ink/10 object-cover"
                    />
                    <button
                      type="button"
                      aria-label={t("removePhoto")}
                      onClick={() => setUploadedUrls((prev) => prev.filter((u) => u !== url))}
                      className="absolute -right-2 -top-2 flex h-6 w-6 items-center justify-center rounded-full bg-wing-red text-xs font-bold text-white shadow hover:opacity-85"
                    >
                      ×
                    </button>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>

        <details className="text-sm">
          <summary className="cursor-pointer text-ink/60" data-testid="sf-media-toggle">
            {t("mediaUrls")}
          </summary>
          <textarea
            rows={2}
            data-testid="sf-media"
            value={form.mediaUrls}
            onChange={(e) => set("mediaUrls", e.target.value)}
            placeholder="/pigeons/p1.svg"
            className={input}
          />
        </details>

        {/* Palmares */}
        <div>
          <p className="text-sm font-medium">{t("resultsHint")}</p>
          {results.map((r, i) => (
            <div key={i} className="mt-2 grid grid-cols-4 gap-2">
              <input
                placeholder={t("raceName")}
                data-testid={`sf-race-${i}`}
                value={r.raceName}
                onChange={(e) =>
                  setResults((rs) => rs.map((x, j) => (j === i ? { ...x, raceName: e.target.value } : x)))
                }
                className={input}
              />
              <input
                placeholder={t("distanceKm")}
                type="number"
                value={r.distanceKm}
                onChange={(e) =>
                  setResults((rs) => rs.map((x, j) => (j === i ? { ...x, distanceKm: e.target.value } : x)))
                }
                className={input}
              />
              <input
                placeholder={t("place")}
                type="number"
                data-testid={`sf-place-${i}`}
                value={r.place}
                onChange={(e) =>
                  setResults((rs) => rs.map((x, j) => (j === i ? { ...x, place: e.target.value } : x)))
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
              setResults((rs) => [...rs, { raceName: "", distanceKm: "", place: "", participants: "" }])
            }
            className="mt-2 rounded-lg border border-ink/20 px-3 py-1.5 text-xs font-semibold hover:border-wing-blue"
          >
            + {t("addResult")}
          </button>
        </div>
      </section>

      <section className="space-y-3 rounded-2xl border border-ink/10 bg-white p-6">
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
        <div className="text-sm">
          <span className="font-medium">{t("listingType")}</span>
          <div className="mt-2 space-y-2">
            <label className="flex items-center gap-2">
              <input
                type="radio"
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
            checked={form.dnaSexGuaranteed}
            onChange={(e) => set("dnaSexGuaranteed", e.target.checked)}
            data-testid="sf-dna"
          />
          {t("dnaGuarantee")}
        </label>
        <p className="text-xs text-ink/50">{t("duration", { days: durationDays })}</p>
      </section>

      {error && (
        <p className="rounded-lg bg-wing-red/10 px-3 py-2 text-sm text-wing-red" data-testid="sell-error">
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
