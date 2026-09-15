"use client";

import { useState } from "react";
import { useRouter } from "@/i18n/navigation";

/**
 * Butoanele adminului pe o vânzare: Plătit (transfer / numerar, cu data),
 * Predat (cu transportatorul, opțional), anularea când câștigătorul nu plătește
 * și retragerea ultimului marcaj pus din greșeală.
 */

const ERRORS: Record<string, string> = {
  NOT_PENDING: "Vânzarea nu mai așteaptă plata. Reîncarcă pagina.",
  NOT_PAID: "Vânzarea nu e marcată plătită. Reîncarcă pagina.",
  SETTLED: "Porumbelul e deja într-un decont; marcajele nu se mai schimbă.",
  NOTHING_TO_UNDO: "Nu e nimic de retras.",
  CHANGED: "Între timp s-a schimbat ceva. Reîncarcă pagina.",
};

function today() {
  const d = new Date();
  const p = (n: number) => String(n).padStart(2, "0");
  return `${d.getFullYear()}-${p(d.getMonth() + 1)}-${p(d.getDate())}`;
}

export default function OrderAdminActions({
  orderId,
  status,
  settled,
}: {
  orderId: string;
  status: string;
  settled: boolean;
}) {
  const router = useRouter();
  const [method, setMethod] = useState("");
  const [paidAt, setPaidAt] = useState(today);
  const [carrier, setCarrier] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const send = async (body: Record<string, unknown>) => {
    setBusy(true);
    setError(null);
    const res = await fetch(`/api/admin/orders/${orderId}`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(body),
    });
    const data = await res.json();
    setBusy(false);
    if (data.ok) router.refresh();
    else setError(data.fields?.method ?? data.fields?.paidAt ?? ERRORS[data.error] ?? "Nu s-a putut salva.");
  };

  const input =
    "rounded-xl border border-ink/20 bg-ivory-soft px-3 py-2 text-sm outline-none focus:border-wing-blue";
  const primary =
    "rounded-xl bg-ink px-4 py-2 text-sm font-bold text-ivory hover:bg-wing-orange disabled:opacity-50";
  const secondary =
    "rounded-xl border border-ink/20 px-3 py-2 text-sm font-semibold hover:border-wing-blue disabled:opacity-50";

  if (settled) {
    return (
      <p className="mt-3 text-sm font-semibold text-green-700" data-testid="order-settled">
        ✓ Decontat cu crescătorul
      </p>
    );
  }

  return (
    <div className="mt-3 border-t border-ink/10 pt-3">
      <div className="flex flex-wrap items-end gap-2">
        {status === "PENDING_PAYMENT" && (
          <>
            <label className="text-xs font-medium text-ink/70">
              Cum s-a plătit
              <select
                value={method}
                onChange={(e) => setMethod(e.target.value)}
                data-testid="order-method"
                className={`${input} mt-1 block`}
              >
                <option value="">— alege —</option>
                <option value="TRANSFER">Transfer bancar</option>
                <option value="CASH">Numerar</option>
              </select>
            </label>
            <label className="text-xs font-medium text-ink/70">
              Data plății
              <input
                type="date"
                value={paidAt}
                onChange={(e) => setPaidAt(e.target.value)}
                data-testid="order-paid-date"
                className={`${input} mt-1 block`}
              />
            </label>
            <button
              type="button"
              disabled={busy}
              onClick={() => send({ action: "PAID", method: method || undefined, paidAt })}
              data-testid="order-mark-paid"
              className={primary}
            >
              ✓ Plătit
            </button>
            <button
              type="button"
              disabled={busy}
              onClick={() => {
                const reason = window.prompt(
                  "De ce se anulează vânzarea? (ex.: nu a plătit în termen) — mesajul ajunge la cumpărător."
                );
                if (reason !== null) send({ action: "CANCEL", reason });
              }}
              data-testid="order-cancel"
              className={`${secondary} text-wing-red`}
            >
              Anulează – nu a plătit
            </button>
          </>
        )}

        {(status === "PAID" || status === "SHIPPED") && (
          <>
            <label className="text-xs font-medium text-ink/70">
              Transportator (opțional)
              <input
                value={carrier}
                onChange={(e) => setCarrier(e.target.value)}
                data-testid="order-carrier"
                className={`${input} mt-1 block`}
              />
            </label>
            <button
              type="button"
              disabled={busy}
              onClick={() => send({ action: "DELIVERED", carrier })}
              data-testid="order-mark-delivered"
              className={primary}
            >
              ✓ Predat
            </button>
          </>
        )}

        {["PAID", "SHIPPED", "DELIVERED"].includes(status) && (
          <button
            type="button"
            disabled={busy}
            onClick={() => {
              const what = status === "DELIVERED" ? "predarea" : "plata";
              if (window.confirm(`Retragi marcajul pentru ${what}?`)) send({ action: "UNDO" });
            }}
            data-testid="order-undo"
            className={secondary}
          >
            ↩ Retrage {status === "DELIVERED" ? "predarea" : "plata"}
          </button>
        )}
      </div>
      {error && (
        <p className="mt-2 text-sm text-wing-red" data-testid="order-action-error">
          {error}
        </p>
      )}
    </div>
  );
}
