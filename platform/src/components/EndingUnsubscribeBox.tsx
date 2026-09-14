"use client";

import { useState } from "react";
import { useTranslations } from "next-intl";

export default function EndingUnsubscribeBox({ userId, token }: { userId: string; token: string }) {
  const t = useTranslations("sales");
  const [state, setState] = useState<"IDLE" | "DONE" | "BAD">(userId && token ? "IDLE" : "BAD");
  const [busy, setBusy] = useState(false);

  const stop = async () => {
    setBusy(true);
    const res = await fetch("/api/account/ending-notices/unsubscribe", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ u: userId, t: token }),
    });
    const data = await res.json();
    setBusy(false);
    setState(data.ok ? "DONE" : "BAD");
  };

  return (
    <div className="rounded-2xl border border-ink/10 bg-white p-8" data-testid="ending-unsubscribe">
      <h1 className="font-display text-2xl font-bold">{t("unsubTitle")}</h1>
      {state === "DONE" ? (
        <p className="mt-4 font-semibold text-green-700" data-testid="ending-unsub-done">
          ✓ {t("unsubDone")}
        </p>
      ) : state === "BAD" ? (
        <p className="mt-4 text-wing-red" data-testid="ending-unsub-bad">
          {t("unsubBad")}
        </p>
      ) : (
        <>
          <p className="mt-3 text-ink/70">{t("unsubIntro")}</p>
          <button
            onClick={stop}
            disabled={busy}
            data-testid="ending-unsub-button"
            className="mt-5 rounded-xl bg-ink px-6 py-2.5 font-bold text-ivory hover:bg-wing-orange disabled:opacity-50"
          >
            {t("unsubButton")}
          </button>
        </>
      )}
    </div>
  );
}
