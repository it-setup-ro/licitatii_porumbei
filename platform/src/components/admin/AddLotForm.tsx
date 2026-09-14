"use client";

import { useState } from "react";
import { useRouter } from "@/i18n/navigation";
import { isoToLocalInput, localInputToIso } from "@/lib/local-datetime";

/**
 * Un lot nou. Orele se scriu în ora calculatorului celui care le pune — nu în
 * ora serverului, care poate fi alta.
 */
export default function AddLotForm({
  saleId,
  nextNumber,
  suggestedStart,
}: {
  saleId: string;
  nextNumber: number;
  suggestedStart: string | null;
}) {
  const router = useRouter();
  const [start, setStart] = useState(() => (suggestedStart ? isoToLocalInput(suggestedStart) : ""));
  const [end, setEnd] = useState("");
  const [busy, setBusy] = useState(false);
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [error, setError] = useState<string | null>(null);

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    setBusy(true);
    setErrors({});
    setError(null);
    const res = await fetch(`/api/admin/sales/${saleId}/lots`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ startsAt: localInputToIso(start), endsAt: localInputToIso(end) }),
    });
    const data = await res.json();
    setBusy(false);
    if (data.ok) {
      setStart("");
      setEnd("");
      router.refresh();
      return;
    }
    if (data.fields) setErrors(data.fields);
    else if (data.error === "TOO_MANY_LOTS") setError(`O licitație are cel mult ${data.max} loturi.`);
    else setError("Lotul nu s-a putut adăuga.");
  };

  const input =
    "mt-1 w-full rounded-xl border border-ink/20 bg-ivory-soft px-3 py-2 text-sm outline-none focus:border-wing-blue";

  return (
    <form
      onSubmit={submit}
      className="mt-6 rounded-2xl border border-dashed border-ink/25 bg-white p-5"
      data-testid="add-lot-form"
    >
      <h2 className="font-display text-xl font-bold">Adaugă Lotul {nextNumber}</h2>
      <p className="mt-1 text-sm text-ink/60">
        Orele se pot schimba până la pornire. Porumbeii se adaugă după ce lotul există.
      </p>
      <div className="mt-4 grid gap-4 sm:grid-cols-2">
        <label className="text-sm font-medium">
          Începe la <span className="font-bold text-wing-red">*</span>
          <input
            type="datetime-local"
            required
            value={start}
            onChange={(e) => setStart(e.target.value)}
            data-testid="add-lot-start"
            className={input}
          />
          {errors.startsAt && <span className="mt-1 block text-wing-red">{errors.startsAt}</span>}
        </label>
        <label className="text-sm font-medium">
          Se termină la <span className="font-bold text-wing-red">*</span>
          <input
            type="datetime-local"
            required
            value={end}
            onChange={(e) => setEnd(e.target.value)}
            data-testid="add-lot-end"
            className={input}
          />
          {errors.endsAt && (
            <span className="mt-1 block text-wing-red" data-testid="add-lot-error">
              {errors.endsAt}
            </span>
          )}
        </label>
      </div>
      {error && <p className="mt-3 text-sm text-wing-red">{error}</p>}
      <button
        type="submit"
        disabled={busy}
        data-testid="add-lot-submit"
        className="mt-4 rounded-xl bg-ink px-6 py-2.5 font-bold text-ivory hover:bg-wing-orange disabled:opacity-50"
      >
        {busy ? "…" : `+ Adaugă Lotul ${nextNumber}`}
      </button>
    </form>
  );
}
