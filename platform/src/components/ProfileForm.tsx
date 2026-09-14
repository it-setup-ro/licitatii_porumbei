"use client";

import { useState } from "react";
import { useTranslations } from "next-intl";
import { useRouter } from "@/i18n/navigation";

export type ProfileData = {
  phone: string;
  addressStreet: string;
  addressCity: string;
  addressCounty: string;
  addressPostalCode: string;
  addressCountry: string;
  notifyAuctionEnding: boolean;
};

/**
 * Telefonul, adresa și avizele, în Contul meu.
 *
 * Avizul „se încheie o licitație" e alegerea omului: bifa pornește nebifată și
 * se poate schimba oricând de aici.
 */
export default function ProfileForm({ initial }: { initial: ProfileData }) {
  const t = useTranslations("auth");
  const ta = useTranslations("account");
  const router = useRouter();
  const [form, setForm] = useState(initial);
  const [busy, setBusy] = useState(false);
  const [saved, setSaved] = useState(false);
  const [errors, setErrors] = useState<Record<string, string>>({});

  const set = (k: keyof ProfileData, v: string | boolean) => {
    setForm((f) => ({ ...f, [k]: v }));
    setSaved(false);
    setErrors((e) => {
      const next = { ...e };
      delete next[k];
      return next;
    });
  };

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    setBusy(true);
    setErrors({});
    const res = await fetch("/api/account/profile", {
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
      setErrors(data.fields ?? { form: ta("profileError") });
    }
  };

  const input = (k: string) =>
    `mt-1 w-full rounded-xl border bg-ivory-soft px-4 py-2.5 outline-none focus:border-wing-blue ${
      errors[k] ? "border-wing-red" : "border-ink/20"
    }`;

  const field = (k: keyof ProfileData, label: string, testid: string, required = true) => (
    <label className="block text-sm">
      <span className="font-medium">
        {label}
        {required && <span className="font-bold text-wing-red"> *</span>}
      </span>
      <input
        value={String(form[k])}
        onChange={(e) => set(k, e.target.value)}
        required={required}
        data-testid={testid}
        className={input(k)}
      />
      {errors[k] && <span className="mt-1 block text-wing-red">{errors[k]}</span>}
    </label>
  );

  return (
    <form onSubmit={submit} className="rounded-2xl border border-ink/10 bg-white p-6" data-testid="profile-form">
      <h2 className="font-display text-xl font-bold">{ta("contactTitle")}</h2>
      <p className="mt-1 text-sm text-ink/60">{t("addressHint")}</p>
      <div className="mt-4 grid gap-4 sm:grid-cols-2">
        {field("phone", t("phone"), "profile-phone")}
        {field("addressStreet", t("addressStreet"), "profile-street")}
        {field("addressCity", t("addressCity"), "profile-city")}
        {field("addressCounty", t("addressCounty"), "profile-county", false)}
        {field("addressPostalCode", t("addressPostalCode"), "profile-postal", false)}
        {field("addressCountry", t("addressCountry"), "profile-country")}
      </div>

      <label className="mt-5 flex items-start gap-2 text-sm">
        <input
          type="checkbox"
          checked={form.notifyAuctionEnding}
          onChange={(e) => set("notifyAuctionEnding", e.target.checked)}
          data-testid="profile-notify-ending"
          className="mt-0.5 h-5 w-5 shrink-0 accent-wing-blue"
        />
        <span>
          <span className="font-medium">{t("notifyEndingLabel")}</span>
          <br />
          <span className="text-xs text-ink/60">{t("notifyEndingHint")}</span>
        </span>
      </label>

      {errors.form && <p className="mt-3 text-sm text-wing-red">{errors.form}</p>}
      <div className="mt-5 flex items-center gap-4">
        <button
          type="submit"
          disabled={busy}
          data-testid="profile-save"
          className="rounded-xl bg-ink px-6 py-2.5 font-bold text-ivory hover:bg-wing-orange disabled:opacity-50"
        >
          {busy ? "…" : ta("saveProfile")}
        </button>
        {saved && (
          <span className="text-sm font-semibold text-green-700" data-testid="profile-saved">
            ✓ {ta("profileSaved")}
          </span>
        )}
      </div>
    </form>
  );
}
