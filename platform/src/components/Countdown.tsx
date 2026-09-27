"use client";

import { useEffect, useState } from "react";
import { useTranslations } from "next-intl";
import { useRouter } from "@/i18n/navigation";

/**
 * O prelungire prinsă de mai multe carduri deodată n-are rost să ceară pagina
 * de zeci de ori: o singură reîmprospătare la 15 secunde ajunge.
 */
let ultimaReimprospatare = 0;
function cerePaginaDinNou(router: { refresh: () => void }) {
  const acum = Date.now();
  if (acum - ultimaReimprospatare < 15_000) return;
  ultimaReimprospatare = acum;
  router.refresh();
}

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
  zeroLabel,
  refreshOnZero = false,
}: {
  target: string; // ISO
  onZero?: () => void;
  compact?: boolean;
  /** ce scrie când a trecut ora („se închide acum"); implicit o liniuță */
  zeroLabel?: string;
  /** cardurile din liste n-au legătură live: la zero își cer datele noi */
  refreshOnZero?: boolean;
}) {
  const t = useTranslations("auction");
  const router = useRouter();
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
      // poate s-a prelungit, poate s-a încheiat — oricum, ce vede omul e vechi
      if (refreshOnZero) cerePaginaDinNou(router);
    }
  }, [msLeft, fired, onZero, refreshOnZero, router]);

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
      {msLeft <= 0 ? (zeroLabel ?? "—") : text}
    </span>
  );
}
