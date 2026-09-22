"use client";

import { useState } from "react";
import { useRouter } from "@/i18n/navigation";

/**
 * Arhivarea sau ștergerea unei licitații de crescător.
 *
 * Daniel: o licitație care a vândut se arhivează — dispare din site și din
 * listele de lucru, dar rămâne în Istoric tranzacții, la cumpărător și în
 * deconturi. Ștergerea merge doar dacă n-a vândut nimic; serverul verifică, iar
 * dacă refuză, omul vede de ce.
 */
export default function SaleAdminActions({
  saleId,
  archived,
  title,
}: {
  saleId: string;
  archived: boolean;
  title: string;
}) {
  const router = useRouter();
  const [busy, setBusy] = useState<string | null>(null);
  const [eroare, setEroare] = useState<string | null>(null);

  const buton =
    "rounded-xl border border-ink/20 px-4 py-2 text-sm font-semibold hover:border-wing-blue disabled:opacity-50";

  const arhiveaza = async () => {
    setBusy("arch");
    setEroare(null);
    try {
      const res = await fetch(`/api/admin/sales/${saleId}/archive`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ archived: !archived }),
      });
      if (!res.ok) setEroare("Nu s-a putut schimba.");
      else router.refresh();
    } finally {
      setBusy(null);
    }
  };

  const sterge = async () => {
    const ok = window.confirm(
      `Ștergi definitiv licitația „${title}", cu loturile și porumbeii ei?\n\n` +
        "Merge doar dacă n-a vândut nimic. Nu se poate da înapoi."
    );
    if (!ok) return;
    setBusy("del");
    setEroare(null);
    try {
      const res = await fetch(`/api/admin/sales/${saleId}`, { method: "DELETE" });
      const data = await res.json().catch(() => ({}));
      if (res.ok) {
        router.push("/admin/sales");
      } else if (data.error === "HAS_HISTORY") {
        setEroare(
          `Licitația are ${data.orders ?? 0} vânzări și ${data.bids ?? 0} porumbei cu oferte. ` +
            "Nu se șterge — arhivează-o."
        );
      } else {
        setEroare("Nu s-a putut șterge.");
      }
    } finally {
      setBusy(null);
    }
  };

  return (
    <div className="flex flex-wrap items-center gap-2" data-testid="sale-admin-actions">
      <button
        type="button"
        onClick={arhiveaza}
        disabled={busy !== null}
        data-testid={archived ? "sale-unarchive" : "sale-archive"}
        className={buton}
      >
        {busy === "arch" ? "…" : archived ? "Scoate din arhivă" : "Arhivează"}
      </button>
      <button
        type="button"
        onClick={sterge}
        disabled={busy !== null}
        data-testid="sale-delete"
        className={`${buton} text-wing-red hover:border-wing-red`}
      >
        {busy === "del" ? "…" : "Șterge licitația"}
      </button>
      {archived && (
        <span
          className="text-xs font-bold uppercase tracking-wide text-wing-orange"
          data-testid="sale-archived-note"
        >
          arhivată — nu se vede pe site
        </span>
      )}
      {eroare && (
        <span className="text-xs text-wing-red" data-testid="sale-actions-error">
          {eroare}
        </span>
      )}
    </div>
  );
}
