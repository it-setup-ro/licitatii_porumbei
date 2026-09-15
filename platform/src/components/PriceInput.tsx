"use client";

import { useState } from "react";
import { convertCents, otherCurrency } from "@/lib/fx-math";

/**
 * Prețul în două căsuțe: lei și euro. Clientul: se scrie în oricare, iar
 * cealaltă se completează imediat, după cursul zilei.
 *
 * Valoarea păstrată e cea din moneda platformei; căsuța cealaltă e doar un
 * ajutor de calcul, rotunjit la unități întregi.
 */

const SYMBOL: Record<string, string> = { RON: "lei", EUR: "€" };

function toCents(v: string): number | null {
  if (v.trim() === "") return null;
  const n = Number(v.replace(/\s/g, "").replace(",", "."));
  return Number.isFinite(n) && n >= 0 ? Math.round(n * 100) : null;
}

export default function PriceInput({
  currency,
  eurRate,
  value,
  onChange,
  testid,
  inputClassName,
  required,
  min,
}: {
  currency: string;
  /** lei pentru un euro; fără curs, rămâne o singură căsuță */
  eurRate: number | null | undefined;
  value: string;
  onChange: (value: string) => void;
  testid: string;
  inputClassName: string;
  required?: boolean;
  min?: number;
}) {
  const rate = eurRate && eurRate > 0 ? eurRate : null;
  const other = rate ? otherCurrency(currency) : null;
  // ce a scris omul în căsuța cealaltă; null = se calculează din prețul principal
  const [otherText, setOtherText] = useState<string | null>(null);

  const derived = (() => {
    if (!other || !rate) return "";
    const c = toCents(value);
    return c === null ? "" : String(Math.round(convertCents(c, currency, rate) / 100));
  })();

  const suffix = (label: string) => (
    <span
      aria-hidden="true"
      className="pointer-events-none absolute bottom-0 right-3 top-1 flex items-center text-sm font-semibold text-ink/50"
    >
      {label}
    </span>
  );

  return (
    <div className={`grid gap-2 ${other ? "grid-cols-2" : "grid-cols-1"}`}>
      <div className="relative">
        <input
          type="number"
          step="1"
          min={min}
          required={required}
          value={value}
          aria-label={SYMBOL[currency] ?? currency}
          data-testid={testid}
          onChange={(e) => {
            setOtherText(null);
            onChange(e.target.value);
          }}
          className={`${inputClassName} pr-12`}
        />
        {suffix(SYMBOL[currency] ?? currency)}
      </div>
      {other && rate ? (
        <div className="relative">
          <input
            type="number"
            step="1"
            min={0}
            value={otherText ?? derived}
            aria-label={SYMBOL[other]}
            data-testid={`${testid}-other`}
            onChange={(e) => {
              const v = e.target.value;
              setOtherText(v);
              const c = toCents(v);
              onChange(c === null ? "" : String(Math.round(convertCents(c, other, rate) / 100)));
            }}
            className={`${inputClassName} pr-12`}
          />
          {suffix(SYMBOL[other])}
        </div>
      ) : null}
    </div>
  );
}
