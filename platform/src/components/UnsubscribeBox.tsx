"use client";

import { useState } from "react";
import { useTranslations } from "next-intl";

export default function UnsubscribeBox({ token }: { token: string }) {
  const t = useTranslations("footer");
  const [state, setState] = useState<"IDLE" | "DONE" | "BAD">(token ? "IDLE" : "BAD");
  const [busy, setBusy] = useState(false);

  const unsubscribe = async () => {
    setBusy(true);
    const res = await fetch("/api/newsletter/unsubscribe", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ token }),
    });
    const data = await res.json();
    setBusy(false);
    setState(data.ok ? "DONE" : "BAD");
  };

  return (
    <div className="rounded-2xl border border-ink/10 bg-white p-8" data-testid="unsubscribe">
      <h1 className="font-display text-2xl font-bold">{t("unsubTitle")}</h1>
      {state === "DONE" ? (
        <p className="mt-4 font-semibold text-green-700" data-testid="unsub-done">
          ✓ {t("unsubDone")}
        </p>
      ) : state === "BAD" ? (
        <p className="mt-4 text-wing-red" data-testid="unsub-bad">
          {t("unsubBad")}
        </p>
      ) : (
        <>
          <p className="mt-3 text-ink/70">{t("unsubIntro")}</p>
          <button
            onClick={unsubscribe}
            disabled={busy}
            data-testid="unsub-button"
            className="mt-5 rounded-xl bg-ink px-6 py-2.5 font-bold text-ivory hover:bg-wing-orange disabled:opacity-50"
          >
            {t("unsubButton")}
          </button>
        </>
      )}
    </div>
  );
}
