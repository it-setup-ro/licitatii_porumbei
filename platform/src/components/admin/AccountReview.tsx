"use client";

import { useState } from "react";
import { useRouter } from "@/i18n/navigation";

/** Butoanele de aprobare și respingere ale unui cont. */
export default function AccountReview({ userId, status }: { userId: string; status: string }) {
  const router = useRouter();
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const send = async (action: "APPROVE" | "REJECT") => {
    let reason: string | undefined;
    if (action === "REJECT") {
      const r = window.prompt("Motivul respingerii (opțional — îl vede omul):", "");
      if (r === null) return;
      reason = r.trim() || undefined;
    }
    setBusy(true);
    setError(null);
    const res = await fetch(`/api/admin/accounts/${userId}`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ action, reason }),
    });
    const data = await res.json();
    setBusy(false);
    if (data.ok) router.refresh();
    else setError("Nu s-a putut salva.");
  };

  return (
    <div className="flex flex-wrap items-center gap-2">
      {status !== "APPROVED" && (
        <button
          type="button"
          onClick={() => send("APPROVE")}
          disabled={busy}
          data-testid="account-approve"
          className="rounded-xl bg-green-700 px-4 py-2 text-sm font-bold text-white hover:bg-green-800 disabled:opacity-50"
        >
          ✓ Aprobă
        </button>
      )}
      {status !== "REJECTED" && (
        <button
          type="button"
          onClick={() => send("REJECT")}
          disabled={busy}
          data-testid="account-reject"
          className="rounded-xl border border-wing-red/40 px-4 py-2 text-sm font-semibold text-wing-red hover:bg-wing-red/10 disabled:opacity-50"
        >
          Respinge
        </button>
      )}
      {error && <span className="text-sm text-wing-red">{error}</span>}
    </div>
  );
}
