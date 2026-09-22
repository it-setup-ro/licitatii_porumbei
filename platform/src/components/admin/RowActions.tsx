"use client";

import { useState } from "react";
import { useRouter } from "@/i18n/navigation";

/**
 * Butoanele de pe un rând din administrare: un comutator (ascuns/arătat,
 * rezolvat/redeschis, blocat/deblocat) și/sau ștergerea.
 *
 * Una singură pentru toate listele, ca să arate și să se poarte la fel peste
 * tot: aceeași confirmare, același mesaj când serverul refuză.
 */
export default function RowActions({
  toggle,
  remove,
  testid,
}: {
  /** comutator: trimite { [field]: !on } la url */
  toggle?: { url: string; on: boolean; onLabel: string; offLabel: string; field: string };
  /** ștergere definitivă, cu întrebare înainte */
  remove?: { url: string; confirm: string; label?: string };
  testid: string;
}) {
  const router = useRouter();
  const [busy, setBusy] = useState<string | null>(null);
  const [eroare, setEroare] = useState<string | null>(null);

  const buton =
    "rounded-lg border border-ink/20 px-3 py-1.5 text-xs font-semibold hover:border-wing-blue disabled:opacity-50";

  const comuta = async () => {
    if (!toggle) return;
    setBusy("toggle");
    setEroare(null);
    try {
      const res = await fetch(toggle.url, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ [toggle.field]: !toggle.on }),
      });
      if (!res.ok) setEroare("Nu s-a putut schimba.");
      else router.refresh();
    } finally {
      setBusy(null);
    }
  };

  const sterge = async () => {
    if (!remove) return;
    if (!window.confirm(remove.confirm)) return;
    setBusy("delete");
    setEroare(null);
    try {
      const res = await fetch(remove.url, { method: "DELETE" });
      const data = await res.json().catch(() => ({}));
      if (res.ok) router.refresh();
      else if (data.error === "HAS_HISTORY") setEroare("Are istoric: nu se șterge.");
      else setEroare("Nu s-a putut șterge.");
    } finally {
      setBusy(null);
    }
  };

  return (
    <span className="inline-flex flex-wrap items-center gap-1.5" data-testid={testid}>
      {toggle && (
        <button
          type="button"
          onClick={comuta}
          disabled={busy !== null}
          data-testid={`${testid}-toggle`}
          className={buton}
        >
          {busy === "toggle" ? "…" : toggle.on ? toggle.onLabel : toggle.offLabel}
        </button>
      )}
      {remove && (
        <button
          type="button"
          onClick={sterge}
          disabled={busy !== null}
          data-testid={`${testid}-delete`}
          className={`${buton} text-wing-red hover:border-wing-red`}
        >
          {busy === "delete" ? "…" : (remove.label ?? "Șterge")}
        </button>
      )}
      {eroare && <span className="text-xs text-wing-red">{eroare}</span>}
    </span>
  );
}
