"use client";

import { useState } from "react";
import { useRouter } from "@/i18n/navigation";

/**
 * Răspunsul la o propunere de articol. „Respinge" cere un motiv, pentru că
 * omul care a scris trebuie să afle de ce — altfel nu mai trimite nimic.
 */
export default function ProposalActions({ articleId }: { articleId: string }) {
  const router = useRouter();
  const [busy, setBusy] = useState(false);
  const [eroare, setEroare] = useState<string | null>(null);

  const buton =
    "rounded-lg border border-ink/20 px-2.5 py-1.5 text-xs font-semibold hover:border-wing-blue disabled:opacity-50";

  const raspunde = async (action: "PUBLISH" | "REJECT", note?: string) => {
    setBusy(true);
    setEroare(null);
    try {
      const res = await fetch(`/api/admin/articles/${articleId}/review`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action, note }),
      });
      const body = await res.json();
      if (!body.ok) throw new Error(body.error ?? "Nu a mers.");
      router.refresh();
    } catch (e) {
      setEroare(e instanceof Error ? e.message : "Nu a mers.");
    } finally {
      setBusy(false);
    }
  };

  return (
    <span className="flex flex-wrap items-center gap-2">
      <button
        type="button"
        className={buton}
        disabled={busy}
        onClick={() => raspunde("PUBLISH")}
        data-testid="proposal-publish"
      >
        Publică
      </button>
      <button
        type="button"
        className={`${buton} text-wing-red`}
        disabled={busy}
        onClick={() => {
          const motiv = window.prompt("De ce nu se publică? (îi ajunge autorului)");
          if (motiv === null) return;
          raspunde("REJECT", motiv.trim() || undefined);
        }}
        data-testid="proposal-reject"
      >
        Respinge
      </button>
      {eroare && <span className="text-xs font-semibold text-wing-red">{eroare}</span>}
    </span>
  );
}
