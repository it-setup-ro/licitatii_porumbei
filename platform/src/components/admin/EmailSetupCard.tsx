"use client";

import { useState } from "react";
import { useRouter } from "@/i18n/navigation";

/**
 * Caseta de e-mail din administrare: starea, formularul de conectare și proba.
 *
 * Daniel, de două ori: „fă locul evident în administrare, că uităm de situație"
 * și „tot nu văd unde se scriu datele de Google". Deci datele se scriu chiar
 * aici, nu pe server. Parola nu se întoarce niciodată în pagină: la o editare
 * ulterioară câmpul e gol, iar dacă îl lași gol rămâne parola dinainte.
 */

type Config = {
  provider: string;
  host: string;
  port: number;
  user: string;
  fromEmail: string;
  fromName: string;
  updatedAt: string;
} | null;

const PRESETURI: Record<string, { eticheta: string; host: string; port: number; ajutor: string }> = {
  GMAIL: {
    eticheta: "Gmail",
    host: "smtp.gmail.com",
    port: 587,
    ajutor:
      "La „Parolă” pui o parolă de aplicație, nu parola contului: în Google → Securitate, pornești verificarea în doi pași, apoi „Parole pentru aplicații”. Bun pentru probe; pentru trimiteri multe folosește Brevo.",
  },
  BREVO: {
    eticheta: "Brevo",
    host: "smtp-relay.brevo.com",
    port: 587,
    ajutor:
      "Datele sunt în Brevo → Transactional → Email → Settings → SMTP & API. Utilizatorul arată ca 9a1b2c001@smtp-brevo.com, iar „Parola” e cheia SMTP. Gratuit: 300 de e-mailuri pe zi.",
  },
  OTHER: {
    eticheta: "Alt server",
    host: "",
    port: 587,
    ajutor: "Datele ți le dă cine îți ține e-mailul: server, port, utilizator și parolă.",
  },
};

export default function EmailSetupCard({
  configurat,
  sursa,
  host,
  port,
  user,
  furnizor,
  expeditor,
  limita,
  trimise,
  esuate,
  neplecate,
  config,
}: {
  configurat: boolean;
  sursa: "server" | "site" | null;
  host: string | null;
  port: number | null;
  user: string | null;
  furnizor: string | null;
  expeditor: string | null;
  limita: string | null;
  trimise: number;
  esuate: number;
  neplecate: number;
  config: Config;
}) {
  const router = useRouter();
  const [deschis, setDeschis] = useState(!configurat);
  const [form, setForm] = useState({
    provider: config?.provider ?? "GMAIL",
    host: config?.host ?? PRESETURI.GMAIL.host,
    port: String(config?.port ?? 587),
    user: config?.user ?? "",
    pass: "",
    fromEmail: config?.fromEmail ?? "",
    fromName: config?.fromName ?? "No.1 & Best Pigeons",
  });
  const [erori, setErori] = useState<Record<string, string>>({});
  const [busy, setBusy] = useState<string | null>(null);
  const [rezultat, setRezultat] = useState<{ bun: boolean; text: string } | null>(null);
  const [adresaProba, setAdresaProba] = useState("");

  const set = (k: string, v: string) => setForm((f) => ({ ...f, [k]: v }));

  const alegeFurnizor = (p: string) => {
    const preset = PRESETURI[p];
    setForm((f) => ({
      ...f,
      provider: p,
      host: preset.host || f.host,
      port: String(preset.port),
    }));
  };

  const salveaza = async () => {
    setBusy("save");
    setErori({});
    setRezultat(null);
    try {
      const res = await fetch("/api/admin/email-config", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          provider: form.provider,
          host: form.host.trim(),
          port: Number(form.port) || 587,
          user: form.user.trim(),
          pass: form.pass,
          fromEmail: form.fromEmail.trim() || form.user.trim(),
          fromName: form.fromName.trim(),
        }),
      });
      const body = await res.json();
      if (body.ok) {
        setForm((f) => ({ ...f, pass: "" }));
        setRezultat({ bun: true, text: "Salvat. Acum trimite un e-mail de probă." });
        setDeschis(false);
        router.refresh();
      } else if (body.fields) {
        setErori(body.fields);
        setRezultat({ bun: false, text: "Verifică ce e scris cu roșu." });
      } else {
        setRezultat({ bun: false, text: "Nu s-a putut salva." });
      }
    } catch {
      setRezultat({ bun: false, text: "Nu s-a putut salva." });
    } finally {
      setBusy(null);
    }
  };

  const proba = async () => {
    setBusy("test");
    setRezultat(null);
    try {
      const res = await fetch("/api/admin/email-test", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ to: adresaProba }),
      });
      const body = await res.json();
      if (body.ok) {
        setRezultat({ bun: true, text: `A plecat către ${adresaProba}. Caută și în „spam”.` });
      } else if (body.error === "SMTP_NECONFIGURAT") {
        setRezultat({ bun: false, text: "Nu sunt scrise datele serviciului de e-mail." });
      } else if (body.fields) {
        setRezultat({ bun: false, text: Object.values(body.fields).join(" ") });
      } else {
        setRezultat({
          bun: false,
          text: "Serverul de e-mail a refuzat mesajul. Motivul exact e mai jos, pe rândul roșu din listă.",
        });
      }
      router.refresh();
    } catch {
      setRezultat({ bun: false, text: "Nu s-a putut trimite." });
    } finally {
      setBusy(null);
    }
  };

  const sterge = async () => {
    if (!window.confirm("Scoți datele de e-mail scrise aici? Site-ul nu va mai trimite mesaje.")) return;
    setBusy("delete");
    try {
      await fetch("/api/admin/email-config", { method: "DELETE" });
      setDeschis(true);
      router.refresh();
    } finally {
      setBusy(null);
    }
  };

  const camp = "w-full rounded-xl border border-ink/20 px-3 py-2 text-sm";
  const buton =
    "rounded-xl border border-ink/20 px-4 py-2 text-sm font-semibold hover:border-wing-blue disabled:opacity-50";
  const butonPlin =
    "rounded-xl bg-ink px-5 py-2.5 text-sm font-bold text-ivory hover:bg-wing-orange disabled:opacity-50";

  return (
    <section
      className={`rounded-2xl border p-5 ${configurat ? "border-ink/10 bg-white" : "border-wing-red/40 bg-wing-red/5"}`}
      data-testid="email-setup"
    >
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div className="min-w-0">
          <h2 className="font-display text-xl font-bold">Trimiterea e-mailurilor</h2>
          {configurat ? (
            <p className="mt-1 text-sm text-ink/70" data-testid="email-setup-ok">
              Pornită prin <b>{furnizor}</b> ({host}
              {port ? `:${port}` : ""}
              {user ? `, cont ${user}` : ""}), mesajele pleacă de la <b>{expeditor}</b>.{" "}
              {sursa === "server"
                ? "Datele sunt scrise pe server."
                : "Datele sunt scrise aici, în administrare."}
            </p>
          ) : (
            <p className="mt-1 text-sm font-semibold text-wing-red" data-testid="email-setup-missing">
              Nu e conectat niciun serviciu de e-mail. Mesajele se scriu mai jos, dar nu pleacă la
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
            <dd className={`font-display text-xl font-bold ${esuate > 0 ? "text-wing-red" : ""}`}>{esuate}</dd>
          </div>
          <div>
            <dt className="text-xs uppercase tracking-wide text-ink/50">Neplecate</dt>
            <dd className="font-display text-xl font-bold">{neplecate}</dd>
          </div>
        </dl>
      </div>

      {limita && <p className="mt-3 text-sm text-ink/60">{limita}</p>}

      {/* ── proba ── */}
      {configurat && (
        <div className="mt-4 flex flex-wrap items-center gap-3">
          <input
            className={camp + " w-64"}
            placeholder="adresa ta@exemplu.ro"
            value={adresaProba}
            onChange={(e) => setAdresaProba(e.target.value)}
            data-testid="email-test-address"
          />
          <button
            type="button"
            className={buton}
            disabled={busy !== null || adresaProba.trim().length < 5}
            onClick={proba}
            data-testid="email-test-send"
          >
            {busy === "test" ? "Se trimite…" : "Trimite un e-mail de probă"}
          </button>
          <button type="button" className={buton} onClick={() => setDeschis((v) => !v)} data-testid="email-config-toggle">
            {deschis ? "Renunță" : "Schimbă datele"}
          </button>
        </div>
      )}

      {rezultat && (
        <p
          className={`mt-3 text-sm font-semibold ${rezultat.bun ? "text-green-700" : "text-wing-red"}`}
          data-testid="email-setup-result"
        >
          {rezultat.text}
        </p>
      )}

      {/* ── formularul ── */}
      {deschis && sursa !== "server" && (
        <div className="mt-5 border-t border-ink/10 pt-5" data-testid="email-config-form">
          <div className="flex flex-wrap gap-2">
            {Object.entries(PRESETURI).map(([k, v]) => (
              <button
                key={k}
                type="button"
                onClick={() => alegeFurnizor(k)}
                className={`rounded-full border px-4 py-1.5 text-sm font-semibold ${
                  form.provider === k ? "border-wing-blue bg-wing-blue/10 text-wing-blue" : "border-ink/20"
                }`}
                data-testid={`smtp-preset-${k}`}
              >
                {v.eticheta}
              </button>
            ))}
          </div>
          <p className="mt-2 text-sm text-ink/60">{PRESETURI[form.provider]?.ajutor}</p>

          <div className="mt-4 grid gap-3 sm:grid-cols-2">
            <CampSmtp form={form} erori={erori} set={set} cheie="user" eticheta="Utilizator" placeholder="adresa@gmail.com" />
            <CampSmtp form={form} erori={erori} set={set} cheie="pass"
              eticheta={config ? "Parolă (lasă gol ca să rămână cea de acum)" : "Parolă / cheie"}
              tip="password"
            />
            <CampSmtp form={form} erori={erori} set={set} cheie="fromEmail" eticheta="Mesajele pleacă de la" placeholder="adresa@gmail.com" />
            <CampSmtp form={form} erori={erori} set={set} cheie="fromName" eticheta="Numele expeditorului" />
            <CampSmtp form={form} erori={erori} set={set} cheie="host" eticheta="Server" placeholder="smtp.gmail.com" />
            <CampSmtp form={form} erori={erori} set={set} cheie="port" eticheta="Port" />
          </div>

          <div className="mt-4 flex flex-wrap items-center gap-3">
            <button
              type="button"
              className={butonPlin}
              disabled={busy !== null}
              onClick={salveaza}
              data-testid="email-config-save"
            >
              {busy === "save" ? "Se salvează…" : "Salvează"}
            </button>
            {config && (
              <button
                type="button"
                className={`${buton} text-wing-red`}
                disabled={busy !== null}
                onClick={sterge}
                data-testid="email-config-delete"
              >
                Șterge datele
              </button>
            )}
            <span className="text-xs text-ink/50">
              Parola se păstrează criptată și nu se mai arată niciodată în pagină.
            </span>
          </div>
        </div>
      )}

      {sursa === "server" && (
        <p className="mt-4 text-sm text-ink/60">
          Datele sunt scrise în fișierul de configurare de pe server, deci nu se pot schimba de aici.
          Ca să le muți în administrare, scoate liniile <code className="rounded bg-ink/5 px-1">SMTP_URL</code> și{" "}
          <code className="rounded bg-ink/5 px-1">SMTP_FROM</code> din fișierul <code className="rounded bg-ink/5 px-1">.env</code>.
        </p>
      )}
    </section>
  );
}

/** Un câmp din formularul de e-mail. Ținut în afara componentei: altfel React
 *  l-ar remonta la fiecare tastă și cursorul ar sări din câmp. */
function CampSmtp({
  cheie,
  eticheta,
  tip = "text",
  placeholder,
  ajutor,
  form,
  erori,
  set,
}: {
  cheie: string;
  eticheta: string;
  tip?: string;
  placeholder?: string;
  ajutor?: string;
  form: Record<string, string>;
  erori: Record<string, string>;
  set: (k: string, v: string) => void;
}) {
  return (
    <label className="block">
      <span className="text-xs font-bold uppercase tracking-wide text-ink/50">{eticheta}</span>
      <input
        className={`w-full rounded-xl border px-3 py-2 text-sm ${
          erori[cheie] ? "border-wing-red" : "border-ink/20"
        }`}
        type={tip}
        value={form[cheie] ?? ""}
        placeholder={placeholder}
        onChange={(e) => set(cheie, e.target.value)}
        data-testid={`smtp-${cheie}`}
      />
      {erori[cheie] && <span className="mt-1 block text-sm text-wing-red">{erori[cheie]}</span>}
      {ajutor && !erori[cheie] && <span className="mt-1 block text-xs text-ink/50">{ajutor}</span>}
    </label>
  );
}
