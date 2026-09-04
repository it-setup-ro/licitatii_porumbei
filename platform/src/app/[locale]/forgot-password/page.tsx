"use client";

import { useState } from "react";
import { useLocale, useTranslations } from "next-intl";
import { Link } from "@/i18n/navigation";

/**
 * „Am uitat parola" — se cere doar adresa.
 *
 * Confirmarea e aceeași și când adresa nu există în platformă: altfel oricine
 * putea folosi formularul ca să afle cine are cont aici.
 */
export default function ForgotPasswordPage() {
  const t = useTranslations("auth");
  const locale = useLocale();
  const [email, setEmail] = useState("");
  const [sent, setSent] = useState(false);
  const [busy, setBusy] = useState(false);

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    setBusy(true);
    await fetch("/api/auth/forgot", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ email, locale }),
    });
    setBusy(false);
    setSent(true);
  };

  return (
    <div className="mx-auto max-w-md px-4 py-14">
      <h1 className="font-display mb-2 text-3xl font-bold">{t("forgotTitle")}</h1>

      {sent ? (
        <div
          className="mt-6 rounded-2xl border border-green-300 bg-green-50 p-6"
          data-testid="forgot-sent"
        >
          <p className="font-medium text-green-800">{t("forgotSent")}</p>
          <p className="mt-2 text-sm text-green-800/80">{t("forgotSentHint")}</p>
          <Link
            href="/login"
            className="mt-4 inline-block font-semibold text-wing-blue hover:underline"
          >
            ← {t("loginTitle")}
          </Link>
        </div>
      ) : (
        <>
          <p className="mb-6 text-sm text-ink/60">{t("forgotIntro")}</p>
          <form
            onSubmit={submit}
            className="space-y-4 rounded-2xl border border-ink/10 bg-white p-6"
            data-testid="forgot-form"
          >
            <label className="block">
              <span className="text-sm font-medium">{t("email")}</span>
              <input
                type="email"
                required
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                data-testid="forgot-email"
                autoComplete="email"
                className="mt-1 w-full rounded-xl border border-ink/20 bg-ivory-soft px-4 py-2.5 outline-none focus:border-wing-blue"
              />
            </label>
            <button
              type="submit"
              disabled={busy}
              data-testid="forgot-submit"
              className="w-full rounded-xl bg-ink py-3 font-bold text-ivory hover:bg-wing-orange disabled:opacity-50"
            >
              {busy ? "…" : t("forgotButton")}
            </button>
            <p className="text-center text-sm text-ink/60">
              <Link href="/login" className="-my-1 inline-block py-2.5 font-semibold text-wing-blue hover:underline">
                ← {t("loginTitle")}
              </Link>
            </p>
          </form>
        </>
      )}
    </div>
  );
}
