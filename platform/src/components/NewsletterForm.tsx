"use client";

import { useState } from "react";
import { useLocale, useTranslations } from "next-intl";
import { Link } from "@/i18n/navigation";

/**
 * Abonarea la newsletter, din subsol.
 *
 * Bifa nu e pre-bifata si nu se poate trimite fara ea: consimtamantul trebuie
 * dat, nu presupus. Sub caseta scrie unde ajung datele si ca dezabonarea e la
 * un clic — altfel oamenii nu-si dau adresa.
 */
export default function NewsletterForm() {
  const t = useTranslations("footer");
  const locale = useLocale();
  const [email, setEmail] = useState("");
  const [consent, setConsent] = useState(false);
  const [busy, setBusy] = useState(false);
  const [done, setDone] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setBusy(true);
    const res = await fetch("/api/newsletter", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ email, consent, locale }),
    });
    const data = await res.json();
    setBusy(false);
    if (data.ok) {
      setDone(true);
      setEmail("");
      setConsent(false);
      return;
    }
    setError(data.error === "RATE_LIMITED" ? t("newsletterTooMany") : t("newsletterError"));
  };

  if (done) {
    return (
      <p className="rounded-xl bg-white/10 p-4 text-sm text-ivory" data-testid="newsletter-done">
        ✓ {t("newsletterDone")}
      </p>
    );
  }

  return (
    <form onSubmit={submit} className="max-w-xl" data-testid="newsletter-form">
      <h2 className="font-display text-sm font-bold uppercase tracking-wider text-wing-yellow">
        {t("newsletterTitle")}
      </h2>
      <p className="mt-2 text-sm text-ivory/70">{t("newsletterIntro")}</p>

      <div className="mt-3 flex flex-wrap gap-2">
        <input
          type="email"
          required
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          placeholder={t("newsletterPlaceholder")}
          aria-label={t("newsletterPlaceholder")}
          data-testid="newsletter-email"
          className="min-w-0 flex-1 rounded-full border border-white/20 bg-white/10 px-4 py-2.5 text-sm text-ivory outline-none placeholder:text-ivory/40 focus:border-wing-yellow"
        />
        <button
          type="submit"
          disabled={busy || !consent}
          data-testid="newsletter-submit"
          className="rounded-full bg-wing-orange px-6 py-2.5 text-sm font-bold text-white transition-colors hover:bg-wing-red disabled:cursor-not-allowed disabled:opacity-40"
        >
          {t("newsletterCta")}
        </button>
      </div>

      <label className="mt-3 flex items-start gap-2 text-xs leading-relaxed text-ivory/70">
        <input
          type="checkbox"
          checked={consent}
          onChange={(e) => setConsent(e.target.checked)}
          data-testid="newsletter-consent"
          className="mt-0.5 h-4 w-4 shrink-0 accent-wing-orange"
        />
        <span>
          {t("newsletterConsent")}{" "}
          <Link href="/info/alte-info" className="underline hover:text-ivory">
            {t("privacy")}
          </Link>
        </span>
      </label>

      {error && (
        <p className="mt-2 text-sm text-wing-yellow" data-testid="newsletter-error">
          {error}
        </p>
      )}
    </form>
  );
}
