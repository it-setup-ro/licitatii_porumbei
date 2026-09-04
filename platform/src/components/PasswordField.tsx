"use client";

import { useState } from "react";

/**
 * Câmp de parolă cu buton de arătat/ascuns.
 *
 * Pe telefon, unde tastatura greșește ușor, a scrie o parolă „în orb" e prima
 * cauză de „nu merge autentificarea". Butonul pornește ascuns și revine la
 * ascuns când pleci din câmp, ca parola să nu rămână la vedere pe ecran.
 */
export default function PasswordField({
  label,
  value,
  onChange,
  testid,
  autoComplete = "current-password",
  hint,
  required = true,
}: {
  label: string;
  value: string;
  onChange: (v: string) => void;
  testid: string;
  autoComplete?: "current-password" | "new-password";
  hint?: string;
  required?: boolean;
}) {
  const [shown, setShown] = useState(false);

  return (
    <label className="block">
      <span className="text-sm font-medium">{label}</span>
      <div className="relative mt-1">
        <input
          type={shown ? "text" : "password"}
          value={value}
          required={required}
          autoComplete={autoComplete}
          data-testid={testid}
          onChange={(e) => onChange(e.target.value)}
          onBlur={() => setShown(false)}
          className="w-full rounded-xl border border-ink/20 bg-ivory-soft py-2.5 pl-4 pr-12 outline-none focus:border-wing-blue"
        />
        <button
          type="button"
          // fara asta, apasarea butonului scoate cursorul din camp: blur-ul s-ar
          // consuma aici, iar parola ar ramane la vedere dupa ce pleci mai departe
          onMouseDown={(e) => e.preventDefault()}
          onClick={() => setShown((v) => !v)}
          aria-pressed={shown}
          aria-label={shown ? "Ascunde parola" : "Arată parola"}
          title={shown ? "Ascunde parola" : "Arată parola"}
          data-testid={`${testid}-toggle`}
          className="absolute inset-y-0 right-0 flex w-12 items-center justify-center rounded-r-xl text-ink/45 transition-colors hover:text-ink"
        >
          {shown ? <EyeOff /> : <Eye />}
        </button>
      </div>
      {hint && <span className="mt-1 block text-xs text-ink/50">{hint}</span>}
    </label>
  );
}

function Eye() {
  return (
    <svg
      width="20"
      height="20"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.8"
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden="true"
    >
      <path d="M2 12s3.6-7 10-7 10 7 10 7-3.6 7-10 7-10-7-10-7Z" />
      <circle cx="12" cy="12" r="3" />
    </svg>
  );
}

function EyeOff() {
  return (
    <svg
      width="20"
      height="20"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.8"
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden="true"
    >
      <path d="M10.6 6.2A9.6 9.6 0 0 1 12 5c6.4 0 10 7 10 7a17 17 0 0 1-2.6 3.5M6.6 6.7A17 17 0 0 0 2 12s3.6 7 10 7a9.5 9.5 0 0 0 4.3-1" />
      <path d="M9.9 9.9a3 3 0 0 0 4.2 4.2" />
      <path d="m3 3 18 18" />
    </svg>
  );
}
