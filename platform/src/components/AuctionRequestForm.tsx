"use client";

import { useState } from "react";
import { useLocale, useTranslations } from "next-intl";

/**
 * „Vreau să organizez o licitație" — cererea unui crescător, de pe prima pagină.
 *
 * Cere strictul necesar ca să poți suna omul: nume, telefon, e-mail și de unde
 * este. Restul se discută la telefon, cum face și clientul acum.
 */
export default function AuctionRequestForm() {
  const t = useTranslations("home");
  const locale = useLocale();
  const [form, setForm] = useState({ name: "", phone: "", email: "", place: "" });
  const [busy, setBusy] = useState(false);
  const [done, setDone] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [fields, setFields] = useState<Record<string, string>>({});

  const set = (key: keyof typeof form, value: string) =>
    setForm((f) => ({ ...f, [key]: value }));

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    setBusy(true);
    setError(null);
    setFields({});
    try {
      const res = await fetch("/api/auction-requests", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ ...form, locale }),
      });
      const data = await res.json();
      if (data.ok) {
        setDone(true);
        setForm({ name: "", phone: "", email: "", place: "" });
      } else if (data.fields) {
        setFields(data.fields);
      } else if (res.status === 429) {
        setError(t("organizeTooMany"));
      } else {
        setError(t("organizeError"));
      }
    } catch {
      setError(t("organizeError"));
    } finally {
      setBusy(false);
    }
  };

  if (done) {
    return (
      <p className="rounded-xl bg-white/15 p-4 text-sm font-semibold" data-testid="organize-done">
        {t("organizeDone")}
      </p>
    );
  }

  const input =
    "mt-1 w-full rounded-xl border border-white/25 bg-white/10 px-3 py-2.5 text-sm text-white outline-none placeholder:text-white/50 focus:border-white";

  return (
    <form onSubmit={submit} className="space-y-3" data-testid="organize-form">
      {(
        [
          ["name", t("organizeName"), "text", "organize-name"],
          ["phone", t("organizePhone"), "tel", "organize-phone"],
          ["email", t("organizeEmail"), "email", "organize-email"],
          ["place", t("organizePlace"), "text", "organize-place"],
        ] as const
      ).map(([key, label, type, testid]) => (
        <label key={key} className="block text-sm font-medium text-white/90">
          {label} <span className="font-bold text-wing-yellow">*</span>
          <input
            type={type}
            required
            value={form[key]}
            onChange={(e) => set(key, e.target.value)}
            data-testid={testid}
            className={input}
          />
          {fields[key] && (
            <span className="mt-1 block text-xs text-wing-yellow">{fields[key]}</span>
          )}
        </label>
      ))}
      {error && <p className="text-sm text-wing-yellow">{error}</p>}
      <button
        type="submit"
        disabled={busy}
        data-testid="organize-submit"
        className="w-full rounded-xl bg-wing-orange px-5 py-3 font-bold text-white transition-colors hover:bg-wing-red disabled:opacity-50"
      >
        {busy ? "…" : t("organizeCta")}
      </button>
    </form>
  );
}
