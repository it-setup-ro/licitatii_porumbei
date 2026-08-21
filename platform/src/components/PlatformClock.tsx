"use client";

import { useEffect, useState } from "react";
import { useLocale, useTranslations } from "next-intl";

/**
 * Ora oficială a platformei — referința pentru închiderea licitațiilor.
 *
 * Arată ora SERVERULUI, nu ceasul vizitatorului: primim marcajul de timp al
 * serverului la randare, calculăm o dată decalajul față de ceasul local și
 * ticăim de acolo. Dacă utilizatorul are ceasul greșit cu o oră, tot vede ora
 * corectă a licitațiilor — exact ce elimină disputele de tip „la mine arăta altfel”.
 */
export default function PlatformClock({ serverNowIso }: { serverNowIso: string }) {
  const t = useTranslations("nav");
  const locale = useLocale();
  const [offsetMs] = useState(() => new Date(serverNowIso).getTime() - Date.now());
  const [now, setNow] = useState(() => new Date(serverNowIso));

  useEffect(() => {
    const id = setInterval(() => setNow(new Date(Date.now() + offsetMs)), 1000);
    return () => clearInterval(id);
  }, [offsetMs]);

  const formatted = new Intl.DateTimeFormat(locale === "ro" ? "ro-RO" : "en-GB", {
    timeZone: "Europe/Bucharest",
    day: "2-digit",
    month: "short",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
    second: "2-digit",
    hour12: false,
  }).format(now);

  return (
    <span
      className="flex items-center gap-1.5 tabular-nums"
      data-testid="platform-clock"
      title={t("officialTime")}
      suppressHydrationWarning
    >
      <svg
        width="14"
        height="14"
        viewBox="0 0 24 24"
        fill="none"
        stroke="currentColor"
        strokeWidth="2"
        strokeLinecap="round"
        aria-hidden="true"
      >
        <circle cx="12" cy="12" r="9" />
        <path d="M12 7v5l3 2" />
      </svg>
      <span className="hidden sm:inline">{formatted}</span>
      <span className="sm:hidden">
        {new Intl.DateTimeFormat(locale === "ro" ? "ro-RO" : "en-GB", {
          timeZone: "Europe/Bucharest",
          hour: "2-digit",
          minute: "2-digit",
          second: "2-digit",
          hour12: false,
        }).format(now)}
      </span>
    </span>
  );
}
