"use client";

import { useState } from "react";

/**
 * Caseta de stare a e-mailului, sus în „E-mailuri".
 *
 * Daniel: „unde se setează datele de SMTP… fă locul evident în administrare, că
 * uităm de situație". Aici se vede dintr-o privire dacă platforma poate trimite,
 * de pe ce adresă, câte a trimis și câte au eșuat — plus un buton de probă.
 */
export default function EmailSetupCard({
  configurat,
  host,
  port,
  user,
  furnizor,
  expeditor,
  limita,
  trimise,
  esuate,
  neplecate,
}: {
  configurat: boolean;
  host: string | null;
  port: number | null;
  user: string | null;
  furnizor: string | null;
  expeditor: string | null;
  limita: string | null;
  trimise: number;
  esuate: number;
  neplecate: number;
}) {
  const [adresa, setAdresa] = useState("");
  const [busy, setBusy] = useState(false);
  const [rezultat, setRezultat] = useState<{ bun: boolean; text: string } | null>(null);

  const proba = async () => {
    setBusy(true);
    setRezultat(null);
    try {
      const res = await fetch("/api/admin/email-test", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ to: adresa }),
      });
      const body = await res.json();
      if (body.ok) {
        setRezultat({ bun: true, text: `A plecat către ${adresa}. Verifică și în „spam”.` });
      } else if (body.error === "SMTP_NECONFIGURAT") {
        setRezultat({ bun: false, text: "Nu e configurat niciun serviciu de e-mail pe server." });
      } else if (body.fields) {
        setRezultat({ bun: false, text: Object.values(body.fields).join(" ") });
      } else {
        setRezultat({
          bun: false,
          text: "Serverul de e-mail a refuzat mesajul. Detaliile sunt în lista de mai jos, la rândul roșu.",
        });
      }
    } catch {
      setRezultat({ bun: false, text: "Nu s-a putut trimite. Mai încearcă." });
    } finally {
      setBusy(false);
    }
  };

  const camp = "rounded-xl border border-ink/20 px-3 py-2 text-sm";
  const buton =
    "rounded-xl border border-ink/20 px-4 py-2 text-sm font-semibold hover:border-wing-blue disabled:opacity-50";

  return (
    <section
      className={`rounded-2xl border p-5 ${configurat ? "border-ink/10 bg-white" : "border-wing-red/40 bg-wing-red/5"}`}
      data-testid="email-setup"
    >
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <h2 className="font-display text-xl font-bold">Trimiterea e-mailurilor</h2>
          {configurat ? (
            <p className="mt-1 text-sm text-ink/70" data-testid="email-setup-ok">
              Pornită prin <b>{furnizor}</b> ({host}
              {port ? `:${port}` : ""}
              {user ? `, cont ${user}` : ""}). Mesajele pleacă de la:{" "}
              <b>{expeditor ?? "(nesetat — se folosește o adresă implicită)"}</b>.
            </p>
          ) : (
            <p className="mt-1 text-sm font-semibold text-wing-red" data-testid="email-setup-missing">
              Nu e configurat niciun serviciu de e-mail. Mesajele se scriu aici, dar nu pleacă la
              nimeni: nici datele de plată către câștigători, nici anunțurile.
            </p>
          )}
        </div>
        <dl className="flex gap-4 text-sm">
          <div>
            <dt className="text-xs uppercase tracking-wide text-ink/50">Trimise</dt>
            <dd className="font-display text-xl font-bold">{trimise}</dd>
          </div>
          <div>
            <dt className="text-xs uppercase tracking-wide text-ink/50">Eșuate</dt>
            <dd className={`font-display text-xl font-bold ${esuate > 0 ? "text-wing-red" : ""}`}>
              {esuate}
            </dd>
          </div>
          <div>
            <dt className="text-xs uppercase tracking-wide text-ink/50">Neplecate</dt>
            <dd className="font-display text-xl font-bold">{neplecate}</dd>
          </div>
        </dl>
      </div>

      {limita && <p className="mt-3 text-sm text-ink/60">{limita}</p>}

      {configurat ? (
        <div className="mt-4 flex flex-wrap items-center gap-3">
          <input
            className={camp}
            placeholder="adresa ta@exemplu.ro"
            value={adresa}
            onChange={(e) => setAdresa(e.target.value)}
            data-testid="email-test-address"
          />
          <button
            type="button"
            className={buton}
            disabled={busy || adresa.trim().length < 5}
            onClick={proba}
            data-testid="email-test-send"
          >
            {busy ? "Se trimite…" : "Trimite un e-mail de probă"}
          </button>
          {rezultat && (
            <span
              className={`text-sm font-semibold ${rezultat.bun ? "text-green-700" : "text-wing-red"}`}
              data-testid="email-test-result"
            >
              {rezultat.text}
            </span>
          )}
        </div>
      ) : (
        <div className="mt-4 text-sm text-ink/80">
          <p className="font-semibold">Cum se pornește (o singură dată, pe server):</p>
          <ol className="mt-2 list-decimal space-y-1 ps-5">
            <li>
              Intri pe server și rulezi:{" "}
              <code className="rounded bg-ink/5 px-1">
                bash /opt/licitatii-porumbei/platform/scripts/set-smtp.sh
              </code>
            </li>
            <li>
              Alegi furnizorul: <b>Gmail</b> (bun pentru probe, cu „parolă de aplicație”),{" "}
              <b>Brevo</b> (300 de e-mailuri pe zi gratuit) sau altul.
            </li>
            <li>Scrii adresa de pe care pleacă mesajele și cheia. Scriptul trimite un e-mail de probă și repornește site-ul.</li>
          </ol>
          <p className="mt-2 text-ink/60">
            Cheia nu se scrie aici și nu intră în cod: rămâne doar pe server, în fișierul de
            configurare.
          </p>
        </div>
      )}
    </section>
  );
}
