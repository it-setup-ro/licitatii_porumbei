"use client";

import { useEffect, useState } from "react";
import { useTranslations } from "next-intl";

/**
 * Cronometrul mare din capul licitației, pe casete: zile, ore, minute, secunde.
 *
 * Macheta clientului: patru căsuțe aliniate, nu un rând de text — se citește
 * dintr-o privire cât mai e. Când ora a trecut dar licitația nu s-a încheiat
 * (se prelungește), scrie „se închide acum", nu o liniuță.
 */
function parti(msRamase: number) {
  const s = Math.max(0, Math.floor(msRamase / 1000));
  return {
    zile: Math.floor(s / 86400),
    ore: Math.floor((s % 86400) / 3600),
    minute: Math.floor((s % 3600) / 60),
    secunde: s % 60,
  };
}

export default function CountdownBoxes({
  target,
  labels,
  zeroLabel,
}: {
  target: string; // ISO
  labels: { days: string; hours: string; minutes: string; seconds: string };
  zeroLabel: string;
}) {
  const t = useTranslations("auction");
  const [acum, setAcum] = useState(() => Date.now());

  useEffect(() => {
    const id = setInterval(() => setAcum(Date.now()), 1000);
    return () => clearInterval(id);
  }, []);

  const ms = new Date(target).getTime() - acum;
  if (ms <= 0) {
    return (
      <span
        data-testid="countdown-boxes"
        suppressHydrationWarning
        className="rounded-xl bg-ink/45 px-4 py-2 text-sm font-bold uppercase tracking-wide text-white"
      >
        {zeroLabel}
      </span>
    );
  }

  const p = parti(ms);
  const caseta = (valoare: number, eticheta: string) => (
    <span className="min-w-[3.5rem] rounded-xl bg-ink/45 px-3 py-2 text-center backdrop-blur-sm">
      {/* secunda de pe server nu e secunda din browser: React are „suppressHydrationWarning"
          exact pentru asta, dar ea ține doar pentru textul elementului pe care stă */}
      <span
        suppressHydrationWarning
        className="font-display block text-2xl font-bold leading-none tabular-nums text-white"
      >
        {String(valoare).padStart(2, "0")}
      </span>
      <span className="mt-1 block text-[10px] uppercase tracking-wide text-white/70">{eticheta}</span>
    </span>
  );

  return (
    <span
      className="flex flex-wrap items-center gap-2"
      data-testid="countdown-boxes"
      suppressHydrationWarning
      aria-label={t("endsIn")}
    >
      {caseta(p.zile, labels.days)}
      {caseta(p.ore, labels.hours)}
      {caseta(p.minute, labels.minutes)}
      {caseta(p.secunde, labels.seconds)}
    </span>
  );
}
