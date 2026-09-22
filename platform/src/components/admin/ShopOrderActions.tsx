"use client";

import { useState } from "react";
import { useRouter } from "@/i18n/navigation";

/**
 * Mutarea unei comenzi din magazin: plătită, expediată, livrată sau anulată.
 * La anulare, produsele se întorc în stoc (o face serverul).
 */

const URMATOR: Record<string, { key: string; label: string }[]> = {
  PENDING_PAYMENT: [
    { key: "PAID", label: "Plătită" },
    { key: "CANCELLED", label: "Anulează" },
  ],
  PAID: [
    { key: "SHIPPED", label: "Expediată" },
    { key: "CANCELLED", label: "Anulează" },
  ],
  SHIPPED: [
    { key: "DELIVERED", label: "Livrată" },
    { key: "CANCELLED", label: "Anulează" },
  ],
  DELIVERED: [],
  CANCELLED: [{ key: "PENDING_PAYMENT", label: "Redeschide" }],
};

export default function ShopOrderActions({ orderId, status }: { orderId: string; status: string }) {
  const router = useRouter();
  const [busy, setBusy] = useState<string | null>(null);
  const [eroare, setEroare] = useState<string | null>(null);

  const schimba = async (nou: string, label: string) => {
    if (nou === "CANCELLED" && !window.confirm("Anulezi comanda? Produsele se întorc în stoc.")) return;
    setBusy(nou);
    setEroare(null);
    try {
      const res = await fetch(`/api/admin/shop-orders/${orderId}`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ status: nou }),
      });
      if (res.ok) router.refresh();
      else setEroare(`Nu s-a putut marca „${label}".`);
    } finally {
      setBusy(null);
    }
  };

  const optiuni = URMATOR[status] ?? [];
  if (optiuni.length === 0) {
    return (
      <span className="text-xs font-bold uppercase tracking-wide text-ink/40" data-testid="shop-order-done">
        gata
      </span>
    );
  }

  return (
    <span className="inline-flex flex-wrap items-center gap-2" data-testid="shop-order-actions">
      {optiuni.map((o) => (
        <button
          key={o.key}
          type="button"
          onClick={() => schimba(o.key, o.label)}
          disabled={busy !== null}
          data-testid={`shop-order-${o.key.toLowerCase()}`}
          className={`rounded-xl px-4 py-2 text-sm font-bold disabled:opacity-50 ${
            o.key === "CANCELLED"
              ? "border border-ink/20 text-wing-red hover:border-wing-red"
              : "bg-ink text-ivory hover:bg-wing-orange"
          }`}
        >
          {busy === o.key ? "…" : o.label}
        </button>
      ))}
      {eroare && <span className="text-xs text-wing-red">{eroare}</span>}
    </span>
  );
}
