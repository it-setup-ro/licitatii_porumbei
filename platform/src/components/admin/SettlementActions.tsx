"use client";

import { useState } from "react";
import { useRouter } from "@/i18n/navigation";

/** „Marchează decontat" și descărcarea decontului în Excel. */
export default function SettlementActions({
  saleId,
  offeredBy,
  canSettle,
  payoutLabel,
  exportHref,
}: {
  saleId?: string;
  offeredBy?: string;
  canSettle: boolean;
  payoutLabel: string;
  exportHref: string;
}) {
  const router = useRouter();
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const settle = async () => {
    if (
      !window.confirm(
        `Marchezi decontul? De plătit crescătorului: ${payoutLabel}.\nPorumbeii plătiți intră în decont, iar marcajele lor nu se mai pot schimba.`
      )
    )
      return;
    setBusy(true);
    setError(null);
    const res = await fetch("/api/admin/settlements", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(saleId ? { saleId } : { offeredBy: offeredBy ?? "" }),
    });
    const data = await res.json();
    setBusy(false);
    if (data.ok) router.refresh();
    else if (data.error === "NOTHING_TO_SETTLE") setError("Nu e niciun porumbel plătit și nedecontat.");
    else setError("Decontul nu s-a putut salva. Reîncarcă pagina.");
  };

  return (
    <div className="mt-4 flex flex-wrap items-center gap-3">
      <button
        type="button"
        onClick={settle}
        disabled={!canSettle || busy}
        data-testid="settlement-settle"
        className="rounded-xl bg-ink px-4 py-2.5 text-sm font-bold text-ivory hover:bg-wing-orange disabled:opacity-40"
      >
        ✓ Marchează decontat
      </button>
      <a
        href={exportHref}
        data-testid="settlement-export"
        className="rounded-xl border border-ink/20 px-4 py-2.5 text-sm font-semibold hover:border-wing-blue"
      >
        ⬇ Descarcă Excel
      </a>
      {error && <p className="w-full text-sm text-wing-red">{error}</p>}
    </div>
  );
}
