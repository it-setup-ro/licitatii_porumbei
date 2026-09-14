"use client";

import { useState } from "react";
import { useLocale, useTranslations } from "next-intl";
import { Link, useRouter } from "@/i18n/navigation";
import { NICKNAME_RE, suggestNickname } from "@/lib/nickname";
import PasswordField from "@/components/PasswordField";

/**
 * Formularul de cont nou.
 *
 * Cu aprobarea conturilor pornită (cerința clientului), cere și telefonul și
 * adresa, iar contul nou așteaptă aprobarea: omul vede licitațiile de la
 * început, dar licitează abia după ce îl aprobă administratorul.
 */
export default function RegisterForm({
  sellerSignupEnabled,
  strictSignup,
}: {
  /** fluxul vechi, prin care crescătorii își cereau cont de vânzător */
  sellerSignupEnabled: boolean;
  /** telefon și adresă obligatorii, cont care așteaptă aprobarea */
  strictSignup: boolean;
}) {
  const t = useTranslations("auth");
  const locale = useLocale();
  const router = useRouter();
  const [form, setForm] = useState({
    name: "",
    nickname: "",
    email: "",
    password: "",
    phone: "",
    addressStreet: "",
    addressCity: "",
    addressCounty: "",
    addressPostalCode: "",
    addressCountry: "România",
    notifyAuctionEnding: false,
    wantsSeller: false,
    sellerCompany: "",
    sellerIban: "",
    sellerCui: "",
  });
  const [nicknameTouched, setNicknameTouched] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [fieldErrors, setFieldErrors] = useState<Record<string, string>>({});
  const [busy, setBusy] = useState(false);
  const [pending, setPending] = useState(false);

  const set = (k: string, v: string | boolean) => {
    setForm((f) => ({ ...f, [k]: v }));
    setFieldErrors((e) => {
      if (!e[k]) return e;
      const next = { ...e };
      delete next[k];
      return next;
    });
  };

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (form.password.length < 10) {
      setError(t("errWeakPassword"));
      return;
    }
    if (!NICKNAME_RE.test(form.nickname.trim())) {
      setError(t("errNickname"));
      return;
    }
    setBusy(true);
    setError(null);
    setFieldErrors({});

    const payload: Record<string, unknown> = {
      name: form.name,
      nickname: form.nickname,
      email: form.email,
      password: form.password,
      phone: form.phone,
      locale,
    };
    if (strictSignup) {
      Object.assign(payload, {
        addressStreet: form.addressStreet,
        addressCity: form.addressCity,
        addressCounty: form.addressCounty,
        addressPostalCode: form.addressPostalCode,
        addressCountry: form.addressCountry,
        notifyAuctionEnding: form.notifyAuctionEnding,
      });
    }
    if (sellerSignupEnabled && form.wantsSeller) {
      Object.assign(payload, {
        wantsSeller: true,
        sellerCompany: form.sellerCompany,
        sellerIban: form.sellerIban,
        sellerCui: form.sellerCui,
      });
    }

    const res = await fetch("/api/auth/register", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(payload),
    });
    const data = await res.json();
    setBusy(false);
    if (data.ok) {
      if (data.accountStatus === "PENDING") {
        setPending(true);
        router.refresh();
        return;
      }
      router.push("/");
      router.refresh();
      return;
    }
    if (data.fields) setFieldErrors(data.fields);
    setError(
      data.error === "EMAIL_TAKEN"
        ? t("errEmailTaken")
        : data.error === "NICKNAME_TAKEN"
          ? t("errNICKNAME_TAKEN")
          : data.fields
            ? t("errCheckFields")
            : t("errWeakPassword")
    );
  };

  if (pending) {
    return (
      <div className="mx-auto max-w-md px-4 py-14">
        <div className="rounded-2xl border border-wing-blue/30 bg-white p-6" data-testid="reg-pending">
          <h1 className="font-display text-2xl font-bold">{t("pendingTitle")}</h1>
          <p className="mt-3 text-ink/80">{t("pendingText")}</p>
          <Link
            href="/auctions"
            className="mt-5 inline-block rounded-xl bg-ink px-5 py-2.5 font-bold text-ivory hover:bg-wing-orange"
          >
            {t("pendingBrowse")} →
          </Link>
        </div>
      </div>
    );
  }

  return (
    <div className="mx-auto max-w-md px-4 py-14">
      <h1 className="font-display mb-6 text-3xl font-bold">{t("registerTitle")}</h1>
      <form onSubmit={submit} className="space-y-4 rounded-2xl border border-ink/10 bg-white p-6">
        {strictSignup && <p className="text-sm text-ink/60">{t("approvalNote")}</p>}

        <Field
          label={t("name")}
          value={form.name}
          onChange={(v) => {
            set("name", v);
            // propunem o poreclă din nume, dar doar cât timp omul nu a atins-o
            if (!nicknameTouched) set("nickname", suggestNickname(v));
          }}
          testid="reg-name"
          error={fieldErrors.name}
        />
        <Field
          label={t("nickname")}
          value={form.nickname}
          onChange={(v) => {
            setNicknameTouched(true);
            set("nickname", v);
          }}
          testid="reg-nickname"
          error={fieldErrors.nickname}
        />
        <p className="-mt-2 text-xs text-ink/55">{t("nicknameHint")}</p>
        <Field
          label={t("email")}
          type="email"
          value={form.email}
          onChange={(v) => set("email", v)}
          testid="reg-email"
          error={fieldErrors.email}
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
          type="tel"
          value={form.phone}
          onChange={(v) => set("phone", v)}
          testid="reg-phone"
          required={strictSignup}
          error={fieldErrors.phone}
        />

        {strictSignup && (
          <fieldset className="space-y-3 rounded-xl bg-ivory-soft p-4" data-testid="reg-address">
            <legend className="px-1 text-sm font-semibold">{t("addressTitle")}</legend>
            <Field label={t("addressStreet")} value={form.addressStreet} onChange={(v) => set("addressStreet", v)} testid="reg-street" error={fieldErrors.addressStreet} />
            <Field label={t("addressCity")} value={form.addressCity} onChange={(v) => set("addressCity", v)} testid="reg-city" error={fieldErrors.addressCity} />
            <div className="grid grid-cols-2 gap-3">
              <Field label={t("addressCounty")} value={form.addressCounty} onChange={(v) => set("addressCounty", v)} testid="reg-county" required={false} error={fieldErrors.addressCounty} />
              <Field label={t("addressPostalCode")} value={form.addressPostalCode} onChange={(v) => set("addressPostalCode", v)} testid="reg-postal" required={false} error={fieldErrors.addressPostalCode} />
            </div>
            <Field label={t("addressCountry")} value={form.addressCountry} onChange={(v) => set("addressCountry", v)} testid="reg-country" error={fieldErrors.addressCountry} />
          </fieldset>
        )}

        {strictSignup && (
          <label className="flex items-start gap-2 text-sm">
            <input
              type="checkbox"
              checked={form.notifyAuctionEnding}
              data-testid="reg-notify-ending"
              onChange={(e) => set("notifyAuctionEnding", e.target.checked)}
              className="mt-0.5 h-5 w-5 shrink-0 accent-wing-blue"
            />
            <span>
              <span className="font-medium">{t("notifyEndingLabel")}</span>
              <br />
              <span className="text-xs text-ink/60">{t("notifyEndingHint")}</span>
            </span>
          </label>
        )}

        {sellerSignupEnabled && (
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
        )}

        {sellerSignupEnabled && form.wantsSeller && (
          <div className="space-y-3 rounded-xl bg-ivory-soft p-3">
            <Field label={t("name") + " (loft)"} value={form.sellerCompany} onChange={(v) => set("sellerCompany", v)} testid="reg-seller-company" />
            <Field label="IBAN" value={form.sellerIban} onChange={(v) => set("sellerIban", v)} testid="reg-seller-iban" />
            <Field label="CUI / CNP" value={form.sellerCui} onChange={(v) => set("sellerCui", v)} testid="reg-seller-cui" required={false} />
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
  error,
}: {
  label: string;
  type?: string;
  value: string;
  onChange: (v: string) => void;
  testid: string;
  required?: boolean;
  error?: string;
}) {
  return (
    <label className="block">
      <span className="text-sm font-medium">
        {label}
        {required && <span className="font-bold text-wing-red"> *</span>}
      </span>
      <input
        type={type}
        value={value}
        required={required}
        data-testid={testid}
        onChange={(e) => onChange(e.target.value)}
        className={`mt-1 w-full rounded-xl border bg-ivory-soft px-4 py-2.5 outline-none focus:border-wing-blue ${
          error ? "border-wing-red" : "border-ink/20"
        }`}
      />
      {error && (
        <span className="mt-1 block text-sm text-wing-red" data-testid={`${testid}-error`}>
          {error}
        </span>
      )}
    </label>
  );
}
