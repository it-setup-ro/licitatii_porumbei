"use client";

import { useState } from "react";
import { useRouter } from "@/i18n/navigation";

/**
 * Scrii un newsletter și îl trimiți abonaților.
 *
 * Lipsea cu totul: abonații se vedeau, dar nu se putea trimite nimic. Mesajul
 * pleacă în reprize (sweeperul duce câte un pumn la fiecare rundă), iar
 * progresul se vede mai jos — nu rămâne nimeni cu ochii pe o rotiță.
 */
export default function NewsletterComposer({ abonati }: { abonati: number }) {
  const router = useRouter();
  const [form, setForm] = useState({ subjectRo: "", subjectEn: "", bodyRo: "", bodyEn: "" });
  const [busy, setBusy] = useState(false);
  const [erori, setErori] = useState<Record<string, string>>({});
  const [mesaj, setMesaj] = useState<{ bun: boolean; text: string } | null>(null);

  const set = (k: string, v: string) => setForm((f) => ({ ...f, [k]: v }));

  const trimite = async () => {
    if (
      !window.confirm(
        `Trimiți mesajul către ${abonati} ${abonati === 1 ? "abonat" : "de abonați"}? Nu se poate opri după ce pleacă.`
      )
    )
      return;
    setBusy(true);
    setErori({});
    setMesaj(null);
    try {
      const res = await fetch("/api/admin/newsletter/campaigns", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(form),
      });
      const body = await res.json();
      if (body.ok) {
        setForm({ subjectRo: "", subjectEn: "", bodyRo: "", bodyEn: "" });
        setMesaj({
          bun: true,
          text: `A pornit. Pleacă rând pe rând către ${body.total} de abonați; vezi mai jos cât a ajuns.`,
        });
        router.refresh();
      } else if (body.fields) {
        setErori(body.fields);
        setMesaj({ bun: false, text: "Verifică ce e scris cu roșu." });
      } else if (body.error === "TRIMITERE_IN_CURS") {
        setMesaj({ bun: false, text: "Mai e un newsletter în curs de trimitere. Așteaptă să se termine." });
      } else if (body.error === "FARA_ABONATI") {
        setMesaj({ bun: false, text: "Nu e niciun abonat căruia să-i trimitem." });
      } else {
        setMesaj({ bun: false, text: "Nu a pornit trimiterea." });
      }
    } catch {
      setMesaj({ bun: false, text: "Nu a pornit trimiterea." });
    } finally {
      setBusy(false);
    }
  };

  return (
    <section className="rounded-2xl border border-ink/10 bg-white p-5" data-testid="newsletter-composer">
      <h2 className="font-display text-xl font-bold">Trimite un newsletter</h2>
      <p className="mt-1 text-sm text-ink/60">
        Ajunge la <b>{abonati}</b> {abonati === 1 ? "abonat" : "de abonați"}, fiecare în limba lui
        (română sau engleză), cu link de dezabonare la final.
      </p>

      <div className="mt-4 grid gap-3 sm:grid-cols-2">
        <CampNewsletter form={form} erori={erori} set={set} cheie="subjectRo" eticheta="Subiect (RO)" />
        <CampNewsletter form={form} erori={erori} set={set} cheie="subjectEn" eticheta="Subiect (EN)" />
        <CampNewsletter form={form} erori={erori} set={set} cheie="bodyRo" eticheta="Mesaj (RO)" randuri={8} />
        <CampNewsletter form={form} erori={erori} set={set} cheie="bodyEn" eticheta="Mesaj (EN)" randuri={8} />
      </div>

      <div className="mt-4 flex flex-wrap items-center gap-3">
        <button
          type="button"
          className="rounded-xl bg-ink px-5 py-2.5 text-sm font-bold text-ivory hover:bg-wing-orange disabled:opacity-50"
          disabled={busy || abonati === 0}
          onClick={trimite}
          data-testid="nl-send"
        >
          {busy ? "Pornește…" : "Trimite acum"}
        </button>
        {mesaj && (
          <span
            className={`text-sm font-semibold ${mesaj.bun ? "text-green-700" : "text-wing-red"}`}
            data-testid="nl-result"
          >
            {mesaj.text}
          </span>
        )}
      </div>
    </section>
  );
}

/** Un câmp din formularul de newsletter. Ținut în afara componentei: altfel
 *  React l-ar remonta la fiecare tastă și cursorul ar sări din câmp. */
function CampNewsletter({
  cheie,
  eticheta,
  randuri,
  form,
  erori,
  set,
}: {
  cheie: string;
  eticheta: string;
  randuri?: number;
  form: Record<string, string>;
  erori: Record<string, string>;
  set: (k: string, v: string) => void;
}) {
  const clase = `w-full rounded-xl border px-3 py-2 text-sm ${
    erori[cheie] ? "border-wing-red" : "border-ink/20"
  }`;
  return (
    <label className="block">
      <span className="text-xs font-bold uppercase tracking-wide text-ink/50">{eticheta}</span>
      {randuri ? (
        <textarea
          className={clase}
          rows={randuri}
          value={form[cheie] ?? ""}
          onChange={(e) => set(cheie, e.target.value)}
          data-testid={`nl-${cheie}`}
        />
      ) : (
        <input
          className={clase}
          value={form[cheie] ?? ""}
          onChange={(e) => set(cheie, e.target.value)}
          data-testid={`nl-${cheie}`}
        />
      )}
      {erori[cheie] && <span className="mt-1 block text-sm text-wing-red">{erori[cheie]}</span>}
    </label>
  );
}

