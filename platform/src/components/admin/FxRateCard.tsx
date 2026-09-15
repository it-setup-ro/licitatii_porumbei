"use client";

import { useState } from "react";
import { useRouter } from "@/i18n/navigation";
import { formatRate } from "@/lib/fx-math";

/**
 * Cursul lei / euro, în Setări. Cursul BNR vine singur, zilnic; adminul îl
 * poate înlocui cu unul scris de el, până apasă „Revino la cursul BNR".
 */
export default function FxRateCard({
  mode,
  manualRate,
  bnrRate,
  bnrDate,
}: {
  mode: "BNR" | "MANUAL";
  manualRate: number;
  bnrRate: number;
  bnrDate: string;
}) {
  const router = useRouter();
  const [rate, setRate] = useState(
    manualRate > 0 ? String(manualRate) : bnrRate > 0 ? String(bnrRate) : ""
  );
  const [busy, setBusy] = useState<string | null>(null);
  const [msg, setMsg] = useState<{ kind: "ok" | "err"; text: string } | null>(null);

  const send = async (key: string, body: unknown, okText: string) => {
    setBusy(key);
    setMsg(null);
    const res = await fetch("/api/admin/fx", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(body),
    });
    const data = await res.json();
    setBusy(null);
    if (data.ok) {
      setMsg({ kind: "ok", text: okText });
      router.refresh();
    } else if (data.error === "BNR_UNAVAILABLE") {
      setMsg({
        kind: "err",
        text: "Cursul BNR nu s-a putut lua acum. Încearcă mai târziu sau pune un curs manual.",
      });
    } else {
      setMsg({ kind: "err", text: data.fields?.rate ?? "Cursul nu s-a putut salva." });
    }
  };

  const manualActive = mode === "MANUAL" && manualRate > 0;
  const current = manualActive ? manualRate : bnrRate;
  const day = bnrDate ? new Date(`${bnrDate}T12:00:00Z`).toLocaleDateString("ro-RO") : null;

  return (
    <section className="mb-8 rounded-2xl border border-ink/10 bg-white p-6" data-testid="fx-card">
      <h2 className="font-display text-xl font-bold">Curs valutar (lei / €)</h2>
      <p className="mt-1 text-sm text-ink/60">
        Lângă fiecare preț apare echivalentul în cealaltă monedă, iar în formulare căsuțele de lei
        și de euro se completează una din cealaltă. Cursul BNR se ia automat în fiecare zi; îl poți
        înlocui cu unul scris de tine.
      </p>

      <dl className="mt-4 grid gap-3 text-sm sm:grid-cols-2">
        <div className="rounded-xl bg-ivory-soft p-3">
          <dt className="text-xs uppercase tracking-wide text-ink/50">Cursul folosit acum</dt>
          <dd className="mt-1 text-lg font-bold" data-testid="fx-current">
            {current > 0 ? `1 € = ${formatRate(current, "ro")} lei` : "—"}
          </dd>
          <dd className="text-xs text-ink/60" data-testid="fx-mode">
            {manualActive ? "scris de administrator" : "de la BNR"}
          </dd>
        </div>
        <div className="rounded-xl bg-ivory-soft p-3">
          <dt className="text-xs uppercase tracking-wide text-ink/50">Ultimul curs BNR</dt>
          <dd className="mt-1 text-lg font-bold" data-testid="fx-bnr">
            {bnrRate > 0 ? `1 € = ${formatRate(bnrRate, "ro")} lei` : "încă nepreluat"}
          </dd>
          {day && <dd className="text-xs text-ink/60">din {day}</dd>}
        </div>
      </dl>

      <div className="mt-4 flex flex-wrap items-end gap-3">
        <label className="text-sm font-medium">
          Curs manual (lei pentru 1 €)
          <input
            type="number"
            step="0.0001"
            min="0"
            value={rate}
            onChange={(e) => setRate(e.target.value)}
            data-testid="fx-manual-input"
            className="mt-1 block w-40 rounded-xl border border-ink/20 bg-ivory-soft px-3 py-2 outline-none focus:border-wing-blue"
          />
        </label>
        <button
          type="button"
          disabled={busy !== null}
          onClick={() =>
            send(
              "manual",
              { action: "MANUAL", rate: Number(rate.replace(",", ".")) },
              "Cursul manual e folosit de acum."
            )
          }
          data-testid="fx-manual-save"
          className="rounded-xl bg-ink px-4 py-2.5 text-sm font-bold text-ivory hover:bg-wing-orange disabled:opacity-50"
        >
          Folosește cursul manual
        </button>
        {mode === "MANUAL" && (
          <button
            type="button"
            disabled={busy !== null}
            onClick={() => send("bnr", { action: "BNR" }, "Se folosește din nou cursul BNR.")}
            data-testid="fx-back-bnr"
            className="rounded-xl border border-ink/20 px-4 py-2.5 text-sm font-semibold hover:border-wing-blue disabled:opacity-50"
          >
            Revino la cursul BNR
          </button>
        )}
        <button
          type="button"
          disabled={busy !== null}
          onClick={() => send("refresh", { action: "REFRESH" }, "Cursul BNR a fost actualizat.")}
          data-testid="fx-refresh"
          className="rounded-xl border border-ink/20 px-4 py-2.5 text-sm font-semibold hover:border-wing-blue disabled:opacity-50"
        >
          Ia cursul BNR acum
        </button>
      </div>
      {msg && (
        <p
          className={`mt-3 text-sm ${msg.kind === "ok" ? "text-green-700" : "text-wing-red"}`}
          data-testid="fx-message"
        >
          {msg.text}
        </p>
      )}
    </section>
  );
}
