"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";

/**
 * Contul de crescător, din fișa lui: administratorul scrie adresa de e-mail și
 * omul primește un link prin care își pune parola.
 *
 * Aceeași apăsare trimite din nou linkul, dacă s-a pierdut e-mailul.
 */
export default function BreederAccountForm({
  breederId,
  email,
}: {
  breederId: string;
  /** adresa contului legat, dacă are deja unul */
  email: string | null;
}) {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [adresa, setAdresa] = useState(email ?? "");
  const [busy, setBusy] = useState(false);
  const [gata, setGata] = useState<string | null>(null);
  const [eroare, setEroare] = useState<string | null>(null);

  const trimite = async () => {
    setBusy(true);
    setEroare(null);
    setGata(null);
    const res = await fetch(`/api/admin/breeders/${breederId}/account`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ email: adresa }),
    });
    const data = await res.json();
    setBusy(false);
    if (data.ok) {
      setGata(data.email as string);
      setOpen(false);
      router.refresh();
    } else {
      setEroare(data.fields?.email ?? "Nu am putut face contul.");
    }
  };

  const dezleaga = async () => {
    if (!confirm("Contul nu va mai vedea licitațiile acestui crescător. Continui?")) return;
    setBusy(true);
    await fetch(`/api/admin/breeders/${breederId}/account`, { method: "DELETE" });
    setBusy(false);
    router.refresh();
  };

  if (!open) {
    return (
      <div className="text-sm">
        {email ? (
          <>
            <span className="font-medium" data-testid="breeder-account-email">
              {email}
            </span>
            <div className="mt-1 flex gap-2 text-xs">
              <button
                type="button"
                onClick={() => setOpen(true)}
                className="font-semibold text-wing-blue hover:underline"
                data-testid="breeder-account-resend"
              >
                Trimite iar linkul
              </button>
              <button
                type="button"
                onClick={dezleaga}
                disabled={busy}
                className="font-semibold text-wing-red hover:underline disabled:opacity-50"
                data-testid="breeder-account-unlink"
              >
                Dezleagă
              </button>
            </div>
          </>
        ) : (
          <button
            type="button"
            onClick={() => setOpen(true)}
            className="font-semibold text-wing-blue hover:underline"
            data-testid="breeder-account-new"
          >
            + Fă-i cont
          </button>
        )}
        {gata && (
          <p className="mt-1 text-xs font-semibold text-green-700" data-testid="breeder-account-sent">
            Linkul a plecat la {gata}
          </p>
        )}
      </div>
    );
  }

  return (
    <div className="text-sm" data-testid="breeder-account-form">
      <input
        type="email"
        value={adresa}
        onChange={(e) => setAdresa(e.target.value)}
        placeholder="email@exemplu.ro"
        data-testid="breeder-account-input"
        className={`w-56 rounded-lg border bg-ivory-soft px-3 py-1.5 outline-none focus:border-wing-blue ${
          eroare ? "border-wing-red" : "border-ink/20"
        }`}
      />
      <div className="mt-1 flex gap-2 text-xs">
        <button
          type="button"
          onClick={trimite}
          disabled={busy || adresa.trim().length < 5}
          className="rounded-lg bg-ink px-3 py-1.5 font-bold text-ivory hover:bg-wing-orange disabled:opacity-50"
          data-testid="breeder-account-send"
        >
          {busy ? "…" : "Trimite linkul"}
        </button>
        <button
          type="button"
          onClick={() => {
            setOpen(false);
            setEroare(null);
          }}
          className="px-2 py-1.5 font-semibold text-ink/60 hover:underline"
        >
          Renunț
        </button>
      </div>
      {eroare && (
        <p className="mt-1 text-xs text-wing-red" data-testid="breeder-account-error">
          {eroare}
        </p>
      )}
    </div>
  );
}
