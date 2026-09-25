"use client";

import { useState } from "react";
import { useTranslations } from "next-intl";
import { useRouter } from "@/i18n/navigation";
import MediaPicker, { type PickedMedia } from "@/components/MediaPicker";

export type BreederProfileData = {
  alias: string;
  city: string;
  country: string;
  photoUrl: string;
  storyRo: string;
  storyEn: string;
  resultsRo: string;
  resultsEn: string;
  notifyByEmail: boolean;
};

/**
 * Fișa crescătorului, scrisă de el însuși.
 *
 * Povestea are două rubrici: româna, care se vede în România, și engleza, pe
 * care o citesc cumpărătorii din afară. Dacă engleza rămâne goală, pe site se
 * arată textul românesc — mai bine ceva decât nimic.
 */
export default function BreederProfileForm({ initial }: { initial: BreederProfileData }) {
  const t = useTranslations("breeder");
  const router = useRouter();
  const [form, setForm] = useState(initial);
  const [busy, setBusy] = useState(false);
  const [saved, setSaved] = useState(false);
  const [errors, setErrors] = useState<Record<string, string>>({});

  const set = (k: keyof BreederProfileData, v: string | boolean) => {
    setForm((f) => ({ ...f, [k]: v }));
    setSaved(false);
    setErrors((e) => {
      const next = { ...e };
      delete next[k];
      return next;
    });
  };

  const poza: PickedMedia[] = form.photoUrl ? [{ url: form.photoUrl, type: "IMAGE" }] : [];

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    setBusy(true);
    setErrors({});
    const res = await fetch("/api/breeder/profile", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(form),
    });
    const data = await res.json();
    setBusy(false);
    if (data.ok) {
      setSaved(true);
      router.refresh();
    } else {
      setErrors(data.fields ?? { form: t("saveError") });
    }
  };

  const cls = (k: string) =>
    `mt-1 w-full rounded-xl border bg-ivory-soft px-4 py-2.5 outline-none focus:border-wing-blue ${
      errors[k] ? "border-wing-red" : "border-ink/20"
    }`;

  const field = (k: keyof BreederProfileData, label: string, testid: string, hint?: string) => (
    <label className="block text-sm">
      <span className="font-medium">{label}</span>
      <input
        value={String(form[k])}
        onChange={(e) => set(k, e.target.value)}
        data-testid={testid}
        className={cls(k)}
      />
      {hint && !errors[k] && <span className="mt-1 block text-xs text-ink/50">{hint}</span>}
      {errors[k] && <span className="mt-1 block text-wing-red">{errors[k]}</span>}
    </label>
  );

  const area = (k: keyof BreederProfileData, label: string, testid: string, rows = 6) => (
    <label className="block text-sm">
      <span className="font-medium">{label}</span>
      <textarea
        value={String(form[k])}
        onChange={(e) => set(k, e.target.value)}
        rows={rows}
        data-testid={testid}
        className={cls(k)}
      />
      {errors[k] && <span className="mt-1 block text-wing-red">{errors[k]}</span>}
    </label>
  );

  return (
    <form
      onSubmit={submit}
      className="mt-6 rounded-2xl border border-ink/10 bg-white p-6"
      data-testid="breeder-profile-form"
    >
      <div className="grid gap-4 sm:grid-cols-2">
        {field("alias", t("alias"), "breeder-alias", t("aliasHint"))}
        {field("city", t("city"), "breeder-city")}
        {field("country", t("country"), "breeder-country")}
      </div>

      <div className="mt-5">
        <p className="text-sm font-medium">{t("photo")}</p>
        <p className="text-xs text-ink/50">{t("photoHint")}</p>
        {form.photoUrl && (
          // poza de acum, ca omul să vadă ce schimbă
          // eslint-disable-next-line @next/next/no-img-element
          <img
            src={form.photoUrl}
            alt=""
            className="mt-2 h-32 w-32 rounded-xl object-cover"
            data-testid="breeder-photo-preview"
          />
        )}
        <div className="mt-2">
          <MediaPicker
            value={poza}
            onChange={(next) => set("photoUrl", next[0]?.url ?? "")}
            maxFiles={1}
            allowVideo={false}
          />
        </div>
      </div>

      <div className="mt-5 grid gap-4">
        {area("storyRo", t("story"), "breeder-story-ro")}
        {area("storyEn", t("storyEn"), "breeder-story-en", 4)}
        {area("resultsRo", t("results"), "breeder-results-ro")}
        {area("resultsEn", t("resultsEn"), "breeder-results-en", 4)}
      </div>

      <label className="mt-6 flex items-start gap-2 text-sm">
        <input
          type="checkbox"
          checked={form.notifyByEmail}
          onChange={(e) => set("notifyByEmail", e.target.checked)}
          data-testid="breeder-notify"
          className="mt-0.5 h-5 w-5 shrink-0 accent-wing-blue"
        />
        <span>
          <span className="font-medium">{t("notifyLabel")}</span>
          <br />
          <span className="text-xs text-ink/60">{t("notifyHint")}</span>
        </span>
      </label>

      {errors.form && <p className="mt-3 text-sm text-wing-red">{errors.form}</p>}
      <div className="mt-5 flex items-center gap-4">
        <button
          type="submit"
          disabled={busy}
          data-testid="breeder-profile-save"
          className="rounded-xl bg-ink px-6 py-2.5 font-bold text-ivory hover:bg-wing-orange disabled:opacity-50"
        >
          {busy ? "…" : t("save")}
        </button>
        {saved && (
          <span className="text-sm font-semibold text-green-700" data-testid="breeder-profile-saved">
            ✓ {t("saved")}
          </span>
        )}
      </div>
    </form>
  );
}
