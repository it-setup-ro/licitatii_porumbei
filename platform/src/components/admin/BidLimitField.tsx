"use client";

import { useState } from "react";
import { useRouter } from "@/i18n/navigation";

/**
 * Limita de licitare a unui cont, scrisă în lei (nu în bani): câmpul e pentru
 * om, nu pentru calculator.
 *
 * Gol = merge pe limita generală din Setări. 0 = fără limită, pentru un
 * cumpărător cunoscut. Limita oricum nu se mai aplică după prima comandă
 * plătită — atunci câmpul spune doar asta.
 */
export default function BidLimitField({
  userId,
  limitCents,
  implicitCents,
  currency,
  aCumparat,
}: {
  userId: string;
  limitCents: number | null;
  implicitCents: number;
  currency: string;
  aCumparat: boolean;
}) {
  const router = useRouter();
  const [val, setVal] = useState(limitCents === null ? "" : String(limitCents / 100));
  const [busy, setBusy] = useState(false);
  const [mesaj, setMesaj] = useState<string | null>(null);

  const bani = (cents: number) =>
    `${(cents / 100).toLocaleString("ro-RO")} ${currency === "RON" ? "lei" : currency}`;

  const salveaza = async () => {
    const curat = val.trim().replace(",", ".");
    const numar = curat === "" ? null : Number(curat);
    if (numar !== null && (!Number.isFinite(numar) || numar < 0)) {
      setMesaj("Scrie o sumă în lei, sau lasă gol.");
      return;
    }
    setBusy(true);
    setMesaj(null);
    const res = await fetch(`/api/admin/users/${userId}/bid-limit`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ limitCents: numar === null ? null : Math.round(numar * 100) }),
    });
    const data = await res.json();
    setBusy(false);
    if (data.ok) {
      setMesaj("Salvat.");
      router.refresh();
    } else {
      setMesaj("Nu s-a putut salva.");
    }
  };

  return (
    <div className="w-full text-sm" data-testid="bid-limit-field">
      <label className="font-medium" htmlFor={`limita-${userId}`}>
        Limită de licitare
      </label>
      <div className="mt-1 flex flex-wrap items-center gap-2">
        <input
          id={`limita-${userId}`}
          inputMode="decimal"
          value={val}
          onChange={(e) => setVal(e.target.value)}
          placeholder={`implicit ${bani(implicitCents)}`}
          data-testid="bid-limit-input"
          className="w-40 rounded-xl border border-ink/15 px-3 py-1.5 outline-none focus:border-wing-blue"
        />
        <span className="text-ink/60">{currency === "RON" ? "lei" : currency}</span>
        <button
          type="button"
          onClick={salveaza}
          disabled={busy}
          data-testid="bid-limit-save"
          className="rounded-xl bg-ink px-4 py-1.5 font-bold text-ivory hover:bg-wing-orange disabled:opacity-50"
        >
          {busy ? "…" : "Salvează"}
        </button>
        {mesaj && <span className="text-ink/60" data-testid="bid-limit-msg">{mesaj}</span>}
      </div>
      <p className="mt-1 text-xs text-ink/50">
        {aCumparat ? (
          <>A cumpărat deja: licitează fără limită, orice scrie aici.</>
        ) : (
          <>
            Gol = limita generală ({bani(implicitCents)}). <strong>0 = fără limită.</strong> Limita
            dispare oricum după prima comandă plătită.
          </>
        )}
      </p>
    </div>
  );
}
