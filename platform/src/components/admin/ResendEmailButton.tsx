"use client";

import { useState } from "react";
import { useRouter } from "@/i18n/navigation";

/** „Trimite din nou" pentru un e-mail din jurnal. */
export default function ResendEmailButton({ emailId }: { emailId: string }) {
  const router = useRouter();
  const [busy, setBusy] = useState(false);
  const [rezultat, setRezultat] = useState<string | null>(null);

  const trimite = async () => {
    setBusy(true);
    setRezultat(null);
    try {
      const res = await fetch(`/api/admin/emails/${emailId}/resend`, { method: "POST" });
      const data = await res.json().catch(() => ({}));
      if (res.ok && data.sent) {
        setRezultat("trimis");
        router.refresh();
      } else if (res.ok) {
        // fără SMTP configurat mesajul nu pleacă nicăieri, dar nici nu e o eroare
        setRezultat("nu a plecat — verifică setările de e-mail");
      } else {
        setRezultat("nu s-a putut trimite");
      }
    } finally {
      setBusy(false);
    }
  };

  return (
    <span className="inline-flex items-center gap-2">
      <button
        type="button"
        onClick={trimite}
        disabled={busy}
        data-testid="email-resend"
        className="rounded-lg border border-ink/20 px-3 py-1.5 text-xs font-semibold hover:border-wing-blue disabled:opacity-50"
      >
        {busy ? "…" : "Trimite din nou"}
      </button>
      {rezultat && (
        <span className="text-xs text-ink/60" data-testid="email-resend-result">
          {rezultat}
        </span>
      )}
    </span>
  );
}
