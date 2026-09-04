"use client";

import { Suspense, useState } from "react";
import { useSearchParams } from "next/navigation";
import { useTranslations } from "next-intl";
import { Link, useRouter } from "@/i18n/navigation";
import PasswordField from "@/components/PasswordField";

/**
 * Alegerea parolei noi, pe baza tokenului din link.
 *
 * După reușită NU autentificăm automat: cine deschide linkul trebuie să știe
 * și parola nouă ca să intre în cont.
 */
export default function ResetPasswordPage() {
  return (
    <Suspense fallback={null}>
      <ResetForm />
    </Suspense>
  );
}

function ResetForm() {
  const t = useTranslations("auth");
  const router = useRouter();
  const token = useSearchParams().get("token") ?? "";

  const [password, setPassword] = useState("");
  const [confirm, setConfirm] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [done, setDone] = useState(false);
  const [busy, setBusy] = useState(false);

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    if (password !== confirm) {
      setError(t("passwordsDiffer"));
      return;
    }
    setBusy(true);
    const res = await fetch("/api/auth/reset", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ token, password }),
    });
    const data = await res.json();
    setBusy(false);
    if (data.ok) {
      setDone(true);
      return;
    }
    setError(
      data.error === "INVALID_TOKEN"
        ? t("resetInvalid")
        : data.error === "WEAK_PASSWORD"
          ? (data.message ?? t("passwordHint"))
          : t("resetFailed")
    );
  };

  if (!token) {
    return (
      <div className="mx-auto max-w-md px-4 py-14">
        <p
          className="rounded-2xl border border-wing-red/40 bg-wing-red/5 p-6 text-sm font-medium text-wing-red"
          data-testid="reset-no-token"
        >
          {t("resetInvalid")}
        </p>
        <Link
          href="/forgot-password"
          className="mt-4 inline-block font-semibold text-wing-blue hover:underline"
        >
          {t("forgotTitle")} →
        </Link>
      </div>
    );
  }

  if (done) {
    return (
      <div className="mx-auto max-w-md px-4 py-14">
        <div
          className="rounded-2xl border border-green-300 bg-green-50 p-6"
          data-testid="reset-done"
        >
          <p className="font-medium text-green-800">✓ {t("resetDone")}</p>
          <button
            onClick={() => router.push("/login")}
            data-testid="reset-to-login"
            className="mt-4 w-full rounded-xl bg-ink py-3 font-bold text-ivory hover:bg-wing-orange"
          >
            {t("loginTitle")}
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="mx-auto max-w-md px-4 py-14">
      <h1 className="font-display mb-2 text-3xl font-bold">{t("resetTitle")}</h1>
      <p className="mb-6 text-sm text-ink/60">{t("resetIntro")}</p>

      <form
        onSubmit={submit}
        className="space-y-4 rounded-2xl border border-ink/10 bg-white p-6"
        data-testid="reset-form"
      >
        <PasswordField
          label={t("newPassword")}
          value={password}
          onChange={setPassword}
          testid="reset-password"
          autoComplete="new-password"
          hint={t("passwordHint")}
        />
        <PasswordField
          label={t("confirmPassword")}
          value={confirm}
          onChange={setConfirm}
          testid="reset-confirm"
          autoComplete="new-password"
        />
        {error && (
          <p
            className="rounded-lg bg-wing-red/10 px-3 py-2 text-sm text-wing-red"
            data-testid="reset-error"
          >
            {error}
          </p>
        )}
        <button
          type="submit"
          disabled={busy}
          data-testid="reset-submit"
          className="w-full rounded-xl bg-ink py-3 font-bold text-ivory hover:bg-wing-orange disabled:opacity-50"
        >
          {busy ? "…" : t("resetButton")}
        </button>
      </form>
    </div>
  );
}
