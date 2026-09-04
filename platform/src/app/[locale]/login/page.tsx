"use client";

import { useState } from "react";
import { useTranslations } from "next-intl";
import { Link, useRouter } from "@/i18n/navigation";
import PasswordField from "@/components/PasswordField";

export default function LoginPage() {
  const t = useTranslations("auth");
  const router = useRouter();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    setBusy(true);
    setError(null);
    const res = await fetch("/api/auth/login", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ email, password }),
    });
    const data = await res.json();
    setBusy(false);
    if (data.ok) {
      router.push("/");
      router.refresh();
    } else {
      setError(t("errInvalidCredentials"));
    }
  };

  return (
    <div className="mx-auto max-w-md px-4 py-14">
      <h1 className="font-display mb-6 text-3xl font-bold">{t("loginTitle")}</h1>
      <form onSubmit={submit} className="space-y-4 rounded-2xl border border-ink/10 bg-white p-6">
        <Field
          label={t("email")}
          type="email"
          value={email}
          onChange={setEmail}
          testid="login-email"
        />
        <PasswordField
          label={t("password")}
          value={password}
          onChange={setPassword}
          testid="login-password"
        />
        <p className="text-right">
          <Link
            href="/forgot-password"
            data-testid="forgot-link"
            className="-my-1 inline-block py-2.5 text-sm font-semibold text-wing-blue hover:underline"
          >
            {t("forgotPassword")}
          </Link>
        </p>
        {error && (
          <p className="rounded-lg bg-wing-red/10 px-3 py-2 text-sm text-wing-red" data-testid="login-error">
            {error}
          </p>
        )}
        <button
          type="submit"
          disabled={busy}
          data-testid="login-submit"
          className="w-full rounded-xl bg-ink py-3 font-bold text-ivory hover:bg-wing-orange disabled:opacity-50"
        >
          {t("loginButton")}
        </button>
        <p className="text-center text-sm text-ink/60">
          {t("noAccount")}{" "}
          <Link href="/register" className="-my-1 inline-block py-2.5 font-semibold text-wing-blue hover:underline">
            {t("registerTitle")}
          </Link>
        </p>
      </form>
    </div>
  );
}

function Field({
  label,
  type,
  value,
  onChange,
  testid,
}: {
  label: string;
  type: string;
  value: string;
  onChange: (v: string) => void;
  testid: string;
}) {
  return (
    <label className="block">
      <span className="text-sm font-medium">{label}</span>
      <input
        type={type}
        value={value}
        required
        data-testid={testid}
        onChange={(e) => onChange(e.target.value)}
        className="mt-1 w-full rounded-xl border border-ink/20 bg-ivory-soft px-4 py-2.5 outline-none focus:border-wing-blue"
      />
    </label>
  );
}
