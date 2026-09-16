"use client";

import { useState } from "react";
import { useRouter } from "@/i18n/navigation";

/** Bifa „am sunat omul" de pe o cerere de licitație. Se poate și scoate. */
export default function RequestHandledButton({
  id,
  handled,
}: {
  id: string;
  handled: boolean;
}) {
  const router = useRouter();
  const [busy, setBusy] = useState(false);

  const toggle = async () => {
    setBusy(true);
    try {
      await fetch(`/api/admin/auction-requests/${id}`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ handled: !handled }),
      });
      router.refresh();
    } finally {
      setBusy(false);
    }
  };

  return (
    <button
      onClick={toggle}
      disabled={busy}
      data-testid={handled ? "request-unhandle" : "request-handle"}
      className={`rounded-xl px-4 py-2 text-sm font-bold disabled:opacity-50 ${
        handled
          ? "border border-ink/20 hover:border-wing-blue"
          : "bg-ink text-ivory hover:bg-wing-orange"
      }`}
    >
      {busy ? "…" : handled ? "Redeschide" : "Rezolvată"}
    </button>
  );
}
