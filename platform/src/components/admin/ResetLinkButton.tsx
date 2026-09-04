"use client";

import { useState } from "react";

/**
 * Generează un link de resetare pentru un utilizator și îl arată o singură dată.
 *
 * Linkul nu se salvează nicăieri în clar, deci după ce închizi rândul nu mai
 * poate fi recuperat — se generează altul. Adminul nu vede și nu poate afla
 * parola nimănui.
 */
export default function ResetLinkButton({ userId }: { userId: string }) {
  const [link, setLink] = useState<string | null>(null);
  const [minutes, setMinutes] = useState(60);
  const [copied, setCopied] = useState(false);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState(false);

  const generate = async () => {
    setBusy(true);
    setError(false);
    try {
      const res = await fetch(`/api/admin/users/${userId}/reset-link`, { method: "POST" });
      const data = await res.json();
      if (data.ok) {
        setLink(data.link);
        setMinutes(data.minutes);
      } else setError(true);
    } catch {
      setError(true);
    } finally {
      setBusy(false);
    }
  };

  const copy = async () => {
    if (!link) return;
    try {
      await navigator.clipboard.writeText(link);
      setCopied(true);
      setTimeout(() => setCopied(false), 2500);
    } catch {
      // browserul poate refuza clipboard-ul — linkul ramane la vedere, se copiaza manual
    }
  };

  if (link) {
    return (
      <div className="w-full space-y-2" data-testid="reset-link-box">
        <p className="text-xs text-ink/50">
          Valabil {minutes} de minute, o singură folosire. Nu se mai poate afișa după ce pleci de
          pe pagină.
        </p>
        <div className="flex flex-wrap gap-2">
          <input
            readOnly
            value={link}
            data-testid="reset-link-value"
            onFocus={(e) => e.currentTarget.select()}
            className="min-w-0 flex-1 rounded-lg border border-ink/20 bg-ivory-soft px-3 py-2 text-xs"
          />
          <button
            onClick={copy}
            data-testid="reset-link-copy"
            className="rounded-lg bg-ink px-4 py-2 text-sm font-bold text-ivory hover:bg-wing-orange"
          >
            {copied ? "✓ Copiat" : "Copiază"}
          </button>
        </div>
      </div>
    );
  }

  return (
    <button
      onClick={generate}
      disabled={busy}
      data-testid="reset-link-generate"
      className="rounded-lg border border-ink/20 px-4 py-2.5 text-sm font-semibold hover:border-wing-blue hover:text-wing-blue disabled:opacity-50"
    >
      {busy ? "…" : error ? "Nu s-a putut — încearcă din nou" : "Link de resetare"}
    </button>
  );
}
