"use client";

import { useMemo, useState } from "react";
import { useLocale, useTranslations } from "next-intl";
import { Link, useRouter } from "@/i18n/navigation";
import { NICKNAME_RE, suggestNickname } from "@/lib/nickname";
import { countryOptions, isRomania, RO_COUNTIES } from "@/lib/regions";
import PasswordField from "@/components/PasswordField";
import CaptchaField from "@/components/CaptchaField";

/**
 * Formularul de cont nou, după exemplele clientului (voiajor.net, columbofil.net).
 *
 * Clientul: „date complete, obligatorii doar ce e obligatoriu; ce nu e
 * obligatoriu să nu fie cu steluță, dar să fie completabile". Persoana juridică
 * primește în plus datele firmei. Contul nou îl aprobă administratorul.
 */
export default function RegisterForm({
  sellerSignupEnabled,
  strictSignup,
  captchaEnabled = true,
}: {
  /** fluxul vechi, prin care crescătorii își cereau cont de vânzător */
  sellerSignupEnabled: boolean;
  /** contul nou așteaptă aprobarea administratorului */
  strictSignup: boolean;
  /**
   * Bifa „Nu sunt robot". Browserele permit calculul ei doar pe HTTPS, deci pe
   * serverul fără certificat e oprită (CAPTCHA_DISABLED) și nu se afișează.
   */
  captchaEnabled?: boolean;
}) {
  const t = useTranslations("auth");
  const locale = useLocale();
  const router = useRouter();
  const countries = useMemo(() => countryOptions(locale), [locale]);
  const [form, setForm] = useState({
    accountType: "PERSON" as "PERSON" | "COMPANY",
    firstName: "",
    lastName: "",
    nickname: "",
    email: "",
    password: "",
    phone: "",
    addressCountry: countries[0],
    addressCounty: "",
    addressCity: "",
    addressPostalCode: "",
    addressStreet: "",
    companyName: "",
    companyCui: "",
    companyRegCom: "",
    companyAddress: "",
    companyBank: "",
    companyIban: "",
    acceptTerms: false,
    notifyAuctionEnding: false,
    captcha: "",
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

  const company = form.accountType === "COMPANY";
  const romania = isRomania(form.addressCountry);

  const set = (k: string, v: string | boolean) => {
    setForm((f) => ({ ...f, [k]: v }));
    setFieldErrors((e) => {
      if (!e[k]) return e;
      const next = { ...e };
      delete next[k];
      return next;
    });
  };

  const suggest = (first: string, last: string) => {
    // propunem un nume de utilizator din nume, cât timp omul nu l-a atins
    if (!nicknameTouched) set("nickname", suggestNickname(`${first} ${last}`.trim()));
  };

  /**
   * Ce scrie chiar în câmp, când starea din React e goală.
   *
   * Gestionarele de parole completează câmpul fără să anunțe React, iar ce se
   * scrie înainte de hidratare se pierde la fel: omul vedea parola în câmp și
   * platforma se plângea că lipsește.
   */
  const dinCamp = (formular: HTMLFormElement, testid: string, dinStare: string) => {
    if (dinStare) return dinStare;
    const camp = formular.querySelector(`[data-testid="${testid}"]`) as HTMLInputElement | null;
    return camp?.value ?? "";
  };

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    const formular = e.currentTarget as HTMLFormElement;
    const parola = dinCamp(formular, "reg-password", form.password);
    const porecla = dinCamp(formular, "reg-nickname", form.nickname);
    // ce am cules din câmp intră și în stare, ca să nu se piardă la retrimitere
    if (parola !== form.password) set("password", parola);
    if (porecla !== form.nickname) set("nickname", porecla);

    if (parola.length < 10) {
      setFieldErrors({ password: t("errWeakPassword") });
      setError(t("errWeakPassword"));
      return;
    }
    if (!NICKNAME_RE.test(porecla.trim())) {
      setFieldErrors({ nickname: t("errNickname") });
      setError(t("errNickname"));
      return;
    }
    setBusy(true);
    setError(null);
    setFieldErrors({});

    const payload: Record<string, unknown> = { ...form, password: parola, nickname: porecla, locale };
    if (!(sellerSignupEnabled && form.wantsSeller)) {
      delete payload.wantsSeller;
      delete payload.sellerCompany;
      delete payload.sellerIban;
      delete payload.sellerCui;
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

  const inputCls = (k: string) =>
    `mt-1 w-full rounded-xl border bg-ivory-soft px-4 py-2.5 outline-none focus:border-wing-blue ${
      fieldErrors[k] ? "border-wing-red" : "border-ink/20"
    }`;
  const errorOf = (k: string, testid: string) =>
    fieldErrors[k] ? (
      <span className="mt-1 block text-sm text-wing-red" data-testid={`${testid}-error`}>
        {fieldErrors[k]}
      </span>
    ) : null;
  const star = <span className="font-bold text-wing-red"> *</span>;
  const section = "space-y-3 rounded-xl bg-ivory-soft/60 p-4";

  return (
    <div className="mx-auto max-w-2xl px-4 py-14">
      <h1 className="font-display mb-2 text-3xl font-bold">{t("registerTitle")}</h1>
      <p className="mb-6 text-sm text-ink/60">
        {t("requiredNote")} <span className="font-bold text-wing-red">*</span>
      </p>
      <form onSubmit={submit} noValidate className="space-y-5 rounded-2xl border border-ink/10 bg-white p-6">
        {/* ── Tipul contului ── */}
        <fieldset>
          <legend className="text-sm font-semibold">{t("accountType")}</legend>
          <div className="mt-2 flex gap-2 rounded-full border border-ink/15 p-1 text-sm">
            {(["PERSON", "COMPANY"] as const).map((type) => (
              <button
                key={type}
                type="button"
                onClick={() => set("accountType", type)}
                aria-pressed={form.accountType === type}
                data-testid={type === "PERSON" ? "reg-type-person" : "reg-type-company"}
                className={`flex-1 rounded-full px-4 py-2 font-semibold ${
                  form.accountType === type ? "bg-ink text-ivory" : "hover:bg-ink/5"
                }`}
              >
                {type === "PERSON" ? t("typePerson") : t("typeCompany")}
              </button>
            ))}
          </div>
        </fieldset>

        {/* ── Datele personale și contul ── */}
        <fieldset className={section}>
          <legend className="px-1 text-sm font-semibold">{t("personalTitle")}</legend>
          <div className="grid gap-3 sm:grid-cols-2">
            <Field label={t("lastName")} value={form.lastName} testid="reg-last-name" required error={fieldErrors.lastName}
              onChange={(v) => { set("lastName", v); suggest(form.firstName, v); }} autoComplete="family-name" />
            <Field label={t("firstName")} value={form.firstName} testid="reg-first-name" required error={fieldErrors.firstName}
              onChange={(v) => { set("firstName", v); suggest(v, form.lastName); }} autoComplete="given-name" />
          </div>
          <Field
            label={t("nickname")}
            value={form.nickname}
            onChange={(v) => {
              setNicknameTouched(true);
              set("nickname", v);
            }}
            testid="reg-nickname"
            required
            error={fieldErrors.nickname}
            autoComplete="username"
          />
          <p className="-mt-2 text-xs text-ink/55">{t("nicknameHint")}</p>
          <div className="grid gap-3 sm:grid-cols-2">
            <Field label={t("email")} type="email" value={form.email} onChange={(v) => set("email", v)} testid="reg-email" required error={fieldErrors.email} autoComplete="email" />
            <Field label={t("phone")} type="tel" value={form.phone} onChange={(v) => set("phone", v)} testid="reg-phone" required error={fieldErrors.phone} autoComplete="tel" />
          </div>
          <PasswordField
            label={t("password")}
            value={form.password}
            onChange={(v) => set("password", v)}
            testid="reg-password"
            autoComplete="new-password"
            hint={t("passwordHint")}
            error={fieldErrors.password}
          />
        </fieldset>

        {/* ── Adresa ── */}
        <fieldset className={section} data-testid="reg-address">
          <legend className="px-1 text-sm font-semibold">{t("addressTitle")}</legend>
          <div className="grid gap-3 sm:grid-cols-2">
            <label className="block">
              <span className="text-sm font-medium">{t("addressCountry")}{star}</span>
              <select
                value={form.addressCountry}
                onChange={(e) => {
                  set("addressCountry", e.target.value);
                  set("addressCounty", "");
                }}
                data-testid="reg-country"
                className={inputCls("addressCountry")}
              >
                {countries.map((c) => (
                  <option key={c} value={c}>
                    {c}
                  </option>
                ))}
              </select>
              {errorOf("addressCountry", "reg-country")}
            </label>
            {romania ? (
              <label className="block">
                <span className="text-sm font-medium">{t("addressCounty")}{star}</span>
                <select
                  value={form.addressCounty}
                  onChange={(e) => set("addressCounty", e.target.value)}
                  data-testid="reg-county"
                  className={inputCls("addressCounty")}
                >
                  <option value="">{t("chooseCounty")}</option>
                  {RO_COUNTIES.map((c) => (
                    <option key={c} value={c}>
                      {c}
                    </option>
                  ))}
                </select>
                {errorOf("addressCounty", "reg-county")}
              </label>
            ) : (
              <Field label={t("addressRegion")} value={form.addressCounty} onChange={(v) => set("addressCounty", v)} testid="reg-county" error={fieldErrors.addressCounty} />
            )}
            <Field label={t("addressCity")} value={form.addressCity} onChange={(v) => set("addressCity", v)} testid="reg-city" required error={fieldErrors.addressCity} autoComplete="address-level2" />
            <Field label={t("addressPostalCode")} value={form.addressPostalCode} onChange={(v) => set("addressPostalCode", v)} testid="reg-postal" error={fieldErrors.addressPostalCode} autoComplete="postal-code" />
          </div>
          <Field label={t("addressStreetFull")} value={form.addressStreet} onChange={(v) => set("addressStreet", v)} testid="reg-street" required error={fieldErrors.addressStreet} autoComplete="street-address" />
        </fieldset>

        {/* ── Datele firmei (persoană juridică) ── */}
        {company && (
          <fieldset className={section} data-testid="reg-company">
            <legend className="px-1 text-sm font-semibold">{t("companyTitle")}</legend>
            <Field label={t("companyName")} value={form.companyName} onChange={(v) => set("companyName", v)} testid="reg-company-name" required error={fieldErrors.companyName} autoComplete="organization" />
            <div className="grid gap-3 sm:grid-cols-2">
              <Field label={t("companyCui")} value={form.companyCui} onChange={(v) => set("companyCui", v)} testid="reg-company-cui" required error={fieldErrors.companyCui} placeholder="RO12345678" />
              <Field label={t("companyRegCom")} value={form.companyRegCom} onChange={(v) => set("companyRegCom", v)} testid="reg-company-regcom" required error={fieldErrors.companyRegCom} placeholder="J02/1234/2020" />
            </div>
            <Field label={t("companyAddress")} value={form.companyAddress} onChange={(v) => set("companyAddress", v)} testid="reg-company-address" required error={fieldErrors.companyAddress} />
            <div className="grid gap-3 sm:grid-cols-2">
              <Field label={t("companyBank")} value={form.companyBank} onChange={(v) => set("companyBank", v)} testid="reg-company-bank" error={fieldErrors.companyBank} />
              <Field label={t("companyIban")} value={form.companyIban} onChange={(v) => set("companyIban", v)} testid="reg-company-iban" error={fieldErrors.companyIban} />
            </div>
          </fieldset>
        )}

        {/* ── Acordurile ── */}
        <div className="space-y-3">
          <label className="flex items-start gap-2 text-sm">
            <input
              type="checkbox"
              checked={form.acceptTerms}
              data-testid="reg-terms"
              onChange={(e) => set("acceptTerms", e.target.checked)}
              className="mt-0.5 h-5 w-5 shrink-0 accent-wing-blue"
            />
            <span>
              {t("acceptTermsBefore")}{" "}
              <Link href="/info/termeni-si-conditii" target="_blank" className="font-semibold text-wing-blue underline">
                {t("termsLink")}
              </Link>{" "}
              {t("acceptTermsAnd")}{" "}
              <Link href="/info/politica-de-confidentialitate" target="_blank" className="font-semibold text-wing-blue underline">
                {t("privacyLink")}
              </Link>
              {star}
            </span>
          </label>
          {errorOf("acceptTerms", "reg-terms")}

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
        </div>

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
            <Field label={t("firstName") + " (loft)"} value={form.sellerCompany} onChange={(v) => set("sellerCompany", v)} testid="reg-seller-company" />
            <Field label="IBAN" value={form.sellerIban} onChange={(v) => set("sellerIban", v)} testid="reg-seller-iban" />
            <Field label="CUI / CNP" value={form.sellerCui} onChange={(v) => set("sellerCui", v)} testid="reg-seller-cui" />
          </div>
        )}

        {captchaEnabled && <CaptchaField onChange={(p) => set("captcha", p)} error={fieldErrors.captcha} />}

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
        {strictSignup && (
          <p className="text-center text-sm text-ink/60" data-testid="reg-approval-note">
            {t("approvalNote")}
          </p>
        )}
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
  required = false,
  error,
  autoComplete,
  placeholder,
}: {
  label: string;
  type?: string;
  value: string;
  onChange: (v: string) => void;
  testid: string;
  /** câmp obligatoriu: primește steluța roșie */
  required?: boolean;
  error?: string;
  autoComplete?: string;
  placeholder?: string;
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
        autoComplete={autoComplete}
        placeholder={placeholder}
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
