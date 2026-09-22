"use client";

import { useState } from "react";
import { useRouter } from "@/i18n/navigation";

/**
 * Scoate un porumbel de pe site, îl aduce înapoi, sau îl șterge de tot.
 *
 * Clientul: „porumbei de la preț fix, și aceia să se poată ascunde să nu mai
 * apară sau să se șteargă". Ștergerea merge doar dacă n-are oferte și n-are
 * comandă — altfel serverul refuză și omul vede de ce.
 */
export default function AuctionVisibility({
  auctionId,
  hidden,
  name,
  compact = false,
  canWithdraw = false,
}: {
  auctionId: string;
  hidden: boolean;
  /** numele porumbelului, pentru întrebarea de confirmare */
  name: string;
  compact?: boolean;
  /** licitație pornită: se poate retrage, cu anunț la ofertanți */
  canWithdraw?: boolean;
}) {
  const router = useRouter();
  const [busy, setBusy] = useState<string | null>(null);
  const [eroare, setEroare] = useState<string | null>(null);

  const buton = compact
    ? "rounded-lg border border-ink/20 px-2.5 py-1.5 text-xs font-semibold hover:border-wing-blue disabled:opacity-50"
    : "rounded-xl border border-ink/20 px-4 py-2 text-sm font-semibold hover:border-wing-blue disabled:opacity-50";

  const ascunde = async () => {
    setBusy("hide");
    setEroare(null);
    try {
      const res = await fetch(`/api/admin/auctions/${auctionId}/hide`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ hidden: !hidden }),
      });
      if (!res.ok) setEroare("Nu s-a putut schimba.");
      else router.refresh();
    } finally {
      setBusy(null);
    }
  };

  const retrage = async () => {
    const motiv = window.prompt(
      `Retragi porumbelul „${name}" din licitație?\n\n` +
        "Licitația lui se închide fără câștigător, iese de pe site, iar cei care au licitat primesc un e-mail.\n\n" +
        "Scrie motivul (apare în e-mail; poate rămâne gol):",
      ""
    );
    if (motiv === null) return;
    setBusy("withdraw");
    setEroare(null);
    try {
      const res = await fetch(`/api/admin/auctions/${auctionId}/withdraw`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ reason: motiv }),
      });
      const data = await res.json().catch(() => ({}));
      if (res.ok) router.refresh();
      else if (data.error === "ALREADY_SOLD")
        setEroare("Are câștigător: folosește „Porumbel indisponibil”.");
      else setEroare("Nu s-a putut retrage.");
    } finally {
      setBusy(null);
    }
  };

  const sterge = async () => {
    const ok = window.confirm(
      `Ștergi definitiv porumbelul „${name}" și licitația lui?\n\n` +
        "Dispar și pozele, și fișa lui. Nu se poate da înapoi."
    );
    if (!ok) return;
    setBusy("delete");
    setEroare(null);
    try {
      const res = await fetch(`/api/admin/auctions/${auctionId}`, { method: "DELETE" });
      const data = await res.json().catch(() => ({}));
      if (res.ok) {
        router.refresh();
      } else if (data.error === "HAS_HISTORY") {
        setEroare(
          data.hasOrder
            ? "Are o comandă: nu se șterge. Îl poți doar ascunde."
            : `Are ${data.bids} oferte: nu se șterge. Îl poți ascunde sau retrage.`
        );
      } else {
        setEroare("Nu s-a putut șterge.");
      }
    } finally {
      setBusy(null);
    }
  };

  return (
    <div className={compact ? "flex flex-wrap items-center gap-1.5" : "flex flex-wrap items-center gap-2"}>
      <button
        type="button"
        onClick={ascunde}
        disabled={busy !== null}
        data-testid={hidden ? "auction-show" : "auction-hide"}
        className={buton}
      >
        {busy === "hide" ? "…" : hidden ? "Arată pe site" : "Ascunde de pe site"}
      </button>
      {canWithdraw && (
        <button
          type="button"
          onClick={retrage}
          disabled={busy !== null}
          data-testid="auction-withdraw"
          className={`${buton} text-wing-orange hover:border-wing-orange`}
        >
          {busy === "withdraw" ? "…" : "Retrage"}
        </button>
      )}
      <button
        type="button"
        onClick={sterge}
        disabled={busy !== null}
        data-testid="auction-delete"
        className={`${buton} text-wing-red hover:border-wing-red`}
      >
        {busy === "delete" ? "…" : "Șterge"}
      </button>
      {hidden && (
        <span className="text-xs font-bold uppercase tracking-wide text-wing-orange" data-testid="auction-hidden-note">
          ascuns
        </span>
      )}
      {eroare && (
        <span className="text-xs text-wing-red" data-testid="auction-vis-error">
          {eroare}
        </span>
      )}
    </div>
  );
}
