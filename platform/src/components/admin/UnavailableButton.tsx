"use client";

import { useState } from "react";
import { useRouter } from "@/i18n/navigation";

/** Butonul adminului pe un porumbel licitat care nu mai poate fi predat. */
export default function UnavailableButton({ auctionId }: { auctionId: string }) {
  const router = useRouter();
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const mark = async () => {
    const reason = window.prompt(
      "De ce nu mai e disponibil porumbelul? (ex.: s-a îmbolnăvit, a murit) — mesajul ajunge la câștigător."
    );
    if (reason === null) return;
    setBusy(true);
    setError(null);
    const res = await fetch(`/api/admin/auctions/${auctionId}/unavailable`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ reason }),
    });
    const data = await res.json();
    setBusy(false);
    if (data.ok) router.refresh();
    else setError("Nu s-a putut marca porumbelul ca indisponibil.");
  };

  return (
    <div className="rounded-2xl border border-wing-red/30 bg-wing-red/5 p-4 text-sm" data-testid="unavailable-admin">
      <p className="font-semibold">Administrator</p>
      <p className="mt-1 text-ink/70">
        Dacă porumbelul s-a îmbolnăvit sau a murit după licitație, anunță câștigătorul. Comanda se
        anulează și nu se ia comision.
      </p>
      <button
        type="button"
        onClick={mark}
        disabled={busy}
        data-testid="pigeon-unavailable-button"
        className="mt-3 rounded-xl border border-wing-red px-4 py-2 font-semibold text-wing-red hover:bg-wing-red hover:text-white disabled:opacity-50"
      >
        Porumbel indisponibil
      </button>
      {error && <p className="mt-2 text-wing-red">{error}</p>}
    </div>
  );
}
