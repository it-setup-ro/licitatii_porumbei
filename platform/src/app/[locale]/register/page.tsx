"use client";

import { useState } from "react";
import { useLocale, useTranslations } from "next-intl";
import { Link, useRouter } from "@/i18n/navigation";
import PasswordField from "@/components/PasswordField";

export default function RegisterPage() {
  const t = useTranslations("auth");
  const locale = useLocale();
  const router = useRouter();
  const [form, setForm] = useState({
    name: "",
    email: "",
    password: "",
    phone: "",
    wantsSeller: false,
    sellerCompany: "",
    sellerIban: "",
    sellerCui: "",
  });
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  const set = (k: string, v: string | boolean) => setForm((f) => ({ ...f, [k]: v }));

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (form.password.length < 10) {
      setError(t("errWeakPassword"));
      return;
    }
    setBusy(true);
    setError(null);
    const res = await fetch("/api/auth/register", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ ...form, locale }),
    });
    const data = await res.json();
    setBusy(false);
    if (data.ok) {
      router.push("/");
      router.refresh();
    } else if (data.error === "EMAIL_TAKEN") {
      setError(t("errEmailTaken"));
    } else {
      setError(t("errWeakPassword"));
    }
  };

  return (
    <div className="mx-auto max-w-md px-4 py-14">
      <h1 className="font-display mb-6 text-3xl font-bold">{t("registerTitle")}</h1>
      <form onSubmit={submit} className="space-y-4 rounded-2xl border border-ink/10 bg-white p-6">
        <Field label={t("name")} value={form.name} onChange={(v) => set("name", v)} testid="reg-name" />
        <Field
          label={t("email")}
          type="email"
          value={form.email}
          onChange={(v) => set("email", v)}
          testid="reg-email"
        />
        <PasswordField
          label={t("password")}
          value={form.password}
          onChange={(v) => set("password", v)}
          testid="reg-password"
          autoComplete="new-password"
          hint={t("passwordHint")}
        />
        <Field
          label={t("phone")}
          value={form.phone}
          onChange={(v) => set("phone", v)}
          testid="reg-phone"
          required={false}
        />

        <label className="flex items-start gap-2 text-sm">
          <input
            type="checkbox"
            checked={form.wantsSeller}
            data-testid="reg-wants-seller"
            onChange={(e) => set("wantsSeller", e.target.checked)}
            className="mt-0.5 h-5 w-5 shrink-0 accent-wing-blue"
          />
          <span>
            <span className="font-medium">{t("wantToSell")}</span>
            <br />
            <span className="text-xs text-ink/60">{t("sellerNote")}</span>
          </span>
        </label>

        {form.wantsSeller && (
          <div className="space-y-3 rounded-xl bg-ivory-soft p-3">
            <Field
              label={t("name") + " (loft)"}
              value={form.sellerCompany}
              onChange={(v) => set("sellerCompany", v)}
              testid="reg-seller-company"
            />
            <Field
              label="IBAN"
              value={form.sellerIban}
              onChange={(v) => set("sellerIban", v)}
              testid="reg-seller-iban"
            />
            <Field
              label="CUI / CNP"
              value={form.sellerCui}
              onChange={(v) => set("sellerCui", v)}
              testid="reg-seller-cui"
              required={false}
            />
          </div>
        )}

        {error && (
          <p className="rounded-lg bg-wing-red/10 px-3 py-2 text-sm text-wing-red" data-testid="reg-error">
            {error}
          </p>
        )}
        <button
          type="submit"
          disabled={busy}
          data-testid="reg-submit"
          className="w-full rounded-xl bg-ink py-3 font-bold text-ivory hover:bg-wing-orange disabled:opacity-50"
        >
          {t("registerButton")}
        </button>
        <p className="text-center text-sm text-ink/60">
          {t("haveAccount")}{" "}
          <Link href="/login" className="-my-1 inline-block py-2.5 font-semibold text-wing-blue hover:underline">
            {t("loginTitle")}
          </Link>
        </p>
      </form>
    </div>
  );
}

function Field({
  label,
  type = "text",
  value,
  onChange,
  testid,
  required = true,
}: {
  label: string;
  type?: string;
  value: string;
  onChange: (v: string) => void;
  testid: string;
  required?: boolean;
}) {
  return (
    <label className="block">
      <span className="text-sm font-medium">{label}</span>
      <input
        type={type}
        value={value}
        required={required}
        data-testid={testid}
        onChange={(e) => onChange(e.target.value)}
        className="mt-1 w-full rounded-xl border border-ink/20 bg-ivory-soft px-4 py-2.5 outline-none focus:border-wing-blue"
      />
    </label>
  );
}
