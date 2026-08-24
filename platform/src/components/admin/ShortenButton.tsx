"use client";

import { useState } from "react";
import { useRouter } from "@/i18n/navigation";

/**
 * UNEALTA DE TEST: inchide licitatia peste un minut.
 * Se ascunde din Setari → „Unelte de test" cand platforma intra pe public.
 */

export default function ShortenButton({ auctionId }: { auctionId: string }) {
  const router = useRouter();
  const [busy, setBusy] = useState(false);
  const [done, setDone] = useState(false);
  const [error, setError] = useState(false);

  const run = async () => {
    setBusy(true);
    setError(false);
    try {
      const res = await fetch(`/api/admin/lots/${auctionId}/shorten`, { method: "POST" });
      const data = await res.json();
      if (data.ok) {
        setDone(true);
        router.refresh();
      } else {
        setError(true);
      }
    } catch {
      setError(true);
    } finally {
      setBusy(false);
    }
  };

  return (
    <div className="flex items-center gap-2">
      <button
        onClick={run}
        disabled={busy}
        data-testid="lot-shorten"
        title="Mută închiderea licitației peste un minut"
        className="rounded-lg border border-wing-orange bg-wing-orange/10 px-4 py-2.5 text-sm font-bold text-wing-orange hover:bg-wing-orange hover:text-white disabled:opacity-50"
      >
        {busy ? "…" : "⏱ Închide în 1 minut"}
      </button>
      {done && (
        <span className="text-sm font-semibold text-green-700" data-testid="lot-shorten-done">
          ✓ se închide în 1 minut
        </span>
      )}
      {error && (
        <span className="text-sm font-semibold text-wing-red" data-testid="lot-shorten-error">
          nu s-a putut
        </span>
      )}
    </div>
  );
}
