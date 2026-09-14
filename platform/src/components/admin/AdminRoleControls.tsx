"use client";

import { useState } from "react";
import { useRouter } from "@/i18n/navigation";

/** Formularul care dă drepturi de administrator unui cont existent. */
export default function AdminRoleControls() {
  const router = useRouter();
  const [email, setEmail] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [done, setDone] = useState<string | null>(null);

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    setBusy(true);
    setError(null);
    setDone(null);
    const res = await fetch("/api/admin/admins", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ email }),
    });
    const data = await res.json();
    setBusy(false);
    if (data.ok) {
      setDone(email);
      setEmail("");
      router.refresh();
    } else {
      setError(data.fields?.email ?? "Drepturile nu s-au putut da.");
    }
  };

  return (
    <form onSubmit={submit} className="rounded-2xl border border-dashed border-ink/25 bg-white p-5" data-testid="admin-grant-form">
      <h2 className="font-display text-xl font-bold">Adaugă un administrator</h2>
      <p className="mt-1 text-sm text-ink/60">
        Omul își face întâi cont pe site, obișnuit. Apoi scrii aici adresa lui de e-mail.
      </p>
      <div className="mt-4 flex flex-wrap gap-2">
        <input
          type="email"
          required
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          placeholder="adresa@exemplu.ro"
          data-testid="admin-grant-email"
          className={`min-w-0 flex-1 rounded-xl border bg-ivory-soft px-4 py-2.5 text-sm outline-none focus:border-wing-blue ${
            error ? "border-wing-red" : "border-ink/20"
          }`}
        />
        <button
          type="submit"
          disabled={busy}
          data-testid="admin-grant-submit"
          className="rounded-xl bg-ink px-5 py-2.5 text-sm font-bold text-ivory hover:bg-wing-orange disabled:opacity-50"
        >
          Dă drepturi de administrator
        </button>
      </div>
      {error && (
        <p className="mt-2 text-sm font-semibold text-wing-red" data-testid="admin-grant-error">
          {error}
        </p>
      )}
      {done && (
        <p className="mt-2 text-sm font-semibold text-green-700" data-testid="admin-grant-done">
          ✓ {done} e acum administrator.
        </p>
      )}
    </form>
  );
}

/** Butonul care retrage drepturile de administrator. */
export function RevokeAdminButton({ userId, name }: { userId: string; name: string }) {
  const router = useRouter();
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const revoke = async () => {
    if (!window.confirm(`Retragi drepturile de administrator pentru ${name}?`)) return;
    setBusy(true);
    const res = await fetch(`/api/admin/admins/${userId}`, { method: "DELETE" });
    const data = await res.json();
    setBusy(false);
    if (data.ok) router.refresh();
    else
      setError(
        data.error === "LAST_ADMIN"
          ? "Platforma nu poate rămâne fără administrator."
          : "Nu s-a putut retrage."
      );
  };

  return (
    <div className="text-right">
      <button
        type="button"
        onClick={revoke}
        disabled={busy}
        data-testid="admin-revoke"
        className="rounded-xl border border-wing-red/40 px-4 py-2 text-sm font-semibold text-wing-red hover:bg-wing-red/10 disabled:opacity-50"
      >
        Retrage drepturile
      </button>
      {error && <p className="mt-1 text-xs text-wing-red">{error}</p>}
    </div>
  );
}
