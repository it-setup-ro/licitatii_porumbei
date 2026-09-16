"use client";

import { useState } from "react";
import { useLocale, useTranslations } from "next-intl";
import { Link } from "@/i18n/navigation";
import { convertCents, formatRate, otherCurrency, type FxInfo } from "@/lib/fx-math";
import { intlLocale } from "@/lib/locales";

/**
 * Prețul în două căsuțe: lei și euro. Clientul: se scrie în oricare, iar
 * cealaltă se completează imediat, după cursul zilei.
 *
 * Sub căsuțe stă cursul folosit la calcul („Curs: 1 € = 5,2567 lei · BNR"):
 * Daniel: „la scriere preț ar trebui să scrie rata curentă" — altfel omul vede
 * suma din cealaltă căsuță schimbându-se fără să știe după ce curs.
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
  fx,
  value,
  onChange,
  testid,
  inputClassName,
  required,
  min,
  showRate = true,
  canChangeRate = false,
}: {
  currency: string;
  /** cursul lei / €; fără curs, rămâne o singură căsuță */
  fx: FxInfo | null | undefined;
  value: string;
  onChange: (value: string) => void;
  testid: string;
  inputClassName: string;
  required?: boolean;
  min?: number;
  /** rândul cu cursul — o singură dată pe formular, nu sub fiecare preț */
  showRate?: boolean;
  /** adminul primește și legătura spre cardul de curs din Setări */
  canChangeRate?: boolean;
}) {
  const t = useTranslations("sell");
  const locale = useLocale();
  const rate = fx && fx.rate > 0 ? fx.rate : null;
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
      className="pointer-events-none absolute bottom-0 end-3 top-1 flex items-center text-sm font-semibold text-ink/50"
    >
      {label}
    </span>
  );

  const source = fx?.manual
    ? t("rateManual")
    : fx?.date
      ? t("rateBnr", {
          date: new Date(`${fx.date}T12:00:00Z`).toLocaleDateString(intlLocale(locale)),
        })
      : "BNR";

  return (
    <div>
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
            className={`${inputClassName} pe-12`}
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
              className={`${inputClassName} pe-12`}
            />
            {suffix(SYMBOL[other])}
          </div>
        ) : null}
      </div>
      {other && rate && showRate ? (
        <p className="mt-1 text-xs font-normal text-ink/60" data-testid={`${testid}-rate`}>
          {t("rateLine", { rate: formatRate(rate, locale) })} · {source}
          {canChangeRate && (
            <>
              {" · "}
              <Link
                href="/admin/settings#curs"
                className="font-semibold text-wing-blue hover:underline"
                data-testid={`${testid}-rate-change`}
              >
                {t("rateChange")}
              </Link>
            </>
          )}
        </p>
      ) : null}
    </div>
  );
}
