"use client";

import { useEffect, useState } from "react";
import { useTranslations } from "next-intl";

function parts(msLeft: number) {
  const s = Math.max(0, Math.floor(msLeft / 1000));
  return {
    d: Math.floor(s / 86400),
    h: Math.floor((s % 86400) / 3600),
    m: Math.floor((s % 3600) / 60),
    s: s % 60,
  };
}

export default function Countdown({
  target,
  onZero,
  compact = false,
}: {
  target: string; // ISO
  onZero?: () => void;
  compact?: boolean;
}) {
  const t = useTranslations("auction");
  const [now, setNow] = useState(() => Date.now());
  const [fired, setFired] = useState(false);

  useEffect(() => {
    const id = setInterval(() => setNow(Date.now()), 1000);
    return () => clearInterval(id);
  }, []);

  const msLeft = new Date(target).getTime() - now;

  useEffect(() => {
    if (msLeft <= 0 && !fired) {
      setFired(true);
      onZero?.();
    }
  }, [msLeft, fired, onZero]);

  const p = parts(msLeft);
  const critical = msLeft > 0 && msLeft < 60_000;

  const text =
    p.d > 0
      ? `${p.d}${t("days")} ${p.h}${t("hours")} ${p.m}${t("minutes")}`
      : p.h > 0
        ? `${p.h}${t("hours")} ${p.m}${t("minutes")} ${p.s}${t("seconds")}`
        : `${p.m}${t("minutes")} ${p.s}${t("seconds")}`;

  return (
    <span
      data-testid="countdown"
      // textul depinde de ceas: serverul si clientul difera cu cateva ms,
      // iar React are exact pentru asta suppressHydrationWarning
      suppressHydrationWarning
      className={`tabular-nums font-semibold ${critical ? "timer-critical" : ""} ${
        compact ? "text-sm" : "text-lg"
      }`}
    >
      {msLeft <= 0 ? "—" : text}
    </span>
  );
}
