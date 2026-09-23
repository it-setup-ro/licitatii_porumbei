"use client";

import { useState } from "react";
import { useRouter } from "@/i18n/navigation";

/**
 * Panoul de anunțuri: pașii de urmat, lista destinatarilor și bifele lor.
 *
 * Pașii sunt scriși aici, nu într-un fișier de instrucțiuni, pentru că omul care
 * face legătura îi citește exact în clipa în care are nevoie de ei.
 */

type Destinatar = {
  id: string;
  kind: "EMAIL" | "TELEGRAM";
  label: string;
  email: string | null;
  chatId: string | null;
  code: string | null;
  linked: boolean;
  active: boolean;
  events: string[];
  lastSentAt: string | null;
  lastError: string | null;
};

const caseta = "rounded-2xl border border-ink/10 bg-white p-5";
const buton =
  "rounded-xl border border-ink/20 px-4 py-2 text-sm font-semibold hover:border-wing-blue disabled:opacity-50";
const butonMic =
  "rounded-lg border border-ink/20 px-2.5 py-1.5 text-xs font-semibold hover:border-wing-blue disabled:opacity-50";
const camp = "w-full rounded-xl border border-ink/20 px-3 py-2 text-sm";

export default function AlertsPanel({
  botName,
  botConfigured,
  botError,
  siteUrl,
  events,
  recipients,
}: {
  botName: string | null;
  botConfigured: boolean;
  botError: string | null;
  siteUrl: string | null;
  events: Record<string, string>;
  recipients: Destinatar[];
}) {
  const router = useRouter();
  const [busy, setBusy] = useState<string | null>(null);
  const [mesaj, setMesaj] = useState<string | null>(null);
  const [eroare, setEroare] = useState<string | null>(null);
  const [emailNou, setEmailNou] = useState({ label: "", email: "" });
  const [telegramNou, setTelegramNou] = useState("");
  const [invitatie, setInvitatie] = useState<{ label: string; code: string; link: string | null } | null>(null);
  /** ce a bifat omul acum; dispare cand vine lista proaspata de la server */
  const [bifeLocale, setBifeLocale] = useState<Record<string, string[]>>({});

  const cheie = Object.keys(events);

  async function cere(url: string, init?: RequestInit) {
    setEroare(null);
    setMesaj(null);
    const res = await fetch(url, {
      ...init,
      headers: { "Content-Type": "application/json", ...(init?.headers ?? {}) },
    });
    const body = await res.json().catch(() => ({ ok: false, error: "RASPUNS_NEASTEPTAT" }));
    if (!body.ok) {
      const fields = body.fields ? Object.values(body.fields).join(" ") : null;
      throw new Error(fields ?? body.detail ?? body.error ?? "Nu a mers.");
    }
    return body;
  }

  const adaugaEmail = async () => {
    setBusy("email");
    try {
      await cere("/api/admin/alerts", {
        method: "POST",
        body: JSON.stringify({ kind: "EMAIL", label: emailNou.label, email: emailNou.email }),
      });
      setEmailNou({ label: "", email: "" });
      setMesaj("Adresa a fost adăugată.");
      router.refresh();
    } catch (e) {
      setEroare(e instanceof Error ? e.message : "Nu a mers.");
    } finally {
      setBusy(null);
    }
  };

  const adaugaTelegram = async () => {
    setBusy("telegram");
    try {
      const body = await cere("/api/admin/alerts", {
        method: "POST",
        body: JSON.stringify({ kind: "TELEGRAM", label: telegramNou }),
      });
      setInvitatie({ label: telegramNou, code: body.code, link: body.link ?? null });
      setTelegramNou("");
      router.refresh();
    } catch (e) {
      setEroare(e instanceof Error ? e.message : "Nu a mers.");
    } finally {
      setBusy(null);
    }
  };

  const schimba = async (id: string, date: Record<string, unknown>) => {
    setBusy(id);
    // bifa se misca pe loc: altfel omul apasa si pare ca nu s-a intamplat nimic
    if (Array.isArray(date.events)) {
      setBifeLocale((v) => ({ ...v, [id]: date.events as string[] }));
    }
    try {
      await cere(`/api/admin/alerts/${id}`, { method: "PATCH", body: JSON.stringify(date) });
      router.refresh();
    } catch (e) {
      setBifeLocale((v) => {
        const copie = { ...v };
        delete copie[id];
        return copie;
      });
      setEroare(e instanceof Error ? e.message : "Nu a mers.");
    } finally {
      setBusy(null);
    }
  };

  /** ce primeste un destinatar: ce a bifat omul acum, altfel ce stie serverul */
  const evenimentele = (d: Destinatar) => bifeLocale[d.id] ?? d.events;

  const testeaza = async (id: string) => {
    setBusy(id);
    try {
      await cere(`/api/admin/alerts/${id}/test`, { method: "POST" });
      setMesaj("Mesajul de test a plecat.");
      router.refresh();
    } catch (e) {
      setEroare(e instanceof Error ? e.message : "Nu a mers.");
    } finally {
      setBusy(null);
    }
  };

  const sterge = async (d: Destinatar) => {
    if (!window.confirm(`Scoți „${d.label}” de la anunțuri?`)) return;
    setBusy(d.id);
    try {
      await cere(`/api/admin/alerts/${d.id}`, { method: "DELETE" });
      router.refresh();
    } catch (e) {
      setEroare(e instanceof Error ? e.message : "Nu a mers.");
    } finally {
      setBusy(null);
    }
  };

  return (
    <div className="mt-6 space-y-6" data-testid="alerts-panel">
      {mesaj && (
        <p className="rounded-xl bg-wing-blue/10 px-4 py-3 text-sm font-semibold text-wing-blue" data-testid="alerts-message">
          {mesaj}
        </p>
      )}
      {eroare && (
        <p className="rounded-xl bg-wing-red/10 px-4 py-3 text-sm font-semibold text-wing-red" data-testid="alerts-error">
          {eroare}
        </p>
      )}

      {/* ── Telegram: starea botului și pașii ── */}
      <section className={caseta} data-testid="alerts-telegram-box">
        <h2 className="font-display text-xl font-bold">Telegram</h2>
        {botConfigured ? (
          <p className="mt-2 text-sm text-ink/70">
            Botul este pornit{botName ? ` (@${botName})` : ""}.
            {botError && <span className="text-wing-red"> Nu răspunde acum: {botError}</span>}
          </p>
        ) : (
          <div className="mt-3 text-sm text-ink/80">
            <p className="font-semibold">Botul nu e pornit încă. Pașii, o singură dată:</p>
            <ol className="mt-2 list-decimal space-y-1 ps-5">
              <li>
                În Telegram, caută <b>@BotFather</b> și scrie-i <b>/newbot</b>.
              </li>
              <li>Îți cere un nume (ex. „No.1 &amp; Best Pigeons”) și un nume de utilizator care se termină în „bot”.</li>
              <li>Îți răspunde cu un token lung, de forma 123456789:AA...</li>
              <li>
                Token-ul se pune pe server în fișierul <b>.env</b>, pe linia{" "}
                <code className="rounded bg-ink/5 px-1">TELEGRAM_BOT_TOKEN=...</code>, apoi se repornește
                serviciul. (Nu-l trimite prin chat — e ca o parolă.)
              </li>
            </ol>
          </div>
        )}

        <div className="mt-4 border-t border-ink/10 pt-4">
          <p className="text-sm font-semibold">Adaugă pe cineva pe Telegram</p>
          <ol className="mt-2 list-decimal space-y-1 ps-5 text-sm text-ink/70">
            <li>Scrii mai jos cine e (ex. „Ionuț” sau „Grup No.1 &amp; Best”) și apeși „Fă un link”.</li>
            <li>Îi trimiți linkul pe WhatsApp. El îl deschide pe telefon și apasă <b>Start</b>.</li>
            <li>Gata: apare în listă ca „legat” și primește anunțurile. Pentru un grup, adaugi întâi botul în grup și scrii acolo codul.</li>
          </ol>
          <div className="mt-3 flex flex-wrap items-end gap-3">
            <label className="min-w-[14rem] flex-1">
              <span className="text-xs font-bold uppercase tracking-wide text-ink/50">Cine e</span>
              <input
                className={camp}
                value={telegramNou}
                onChange={(e) => setTelegramNou(e.target.value)}
                placeholder="Ionuț (client)"
                data-testid="alerts-telegram-label"
              />
            </label>
            <button
              type="button"
              className={buton}
              disabled={busy !== null || telegramNou.trim().length < 2 || !botConfigured}
              onClick={adaugaTelegram}
              data-testid="alerts-telegram-add"
            >
              Fă un link
            </button>
          </div>

          {invitatie && (
            <div className="mt-4 rounded-xl border border-wing-blue/30 bg-wing-blue/5 p-4 text-sm" data-testid="alerts-invite">
              <p className="font-semibold">Linkul pentru „{invitatie.label}” — bun o oră:</p>
              {invitatie.link ? (
                <p className="mt-1 break-all font-mono text-wing-blue">{invitatie.link}</p>
              ) : (
                <p className="mt-1">
                  Botul nu a răspuns, dar codul e bun: <b>{invitatie.code}</b>. Omul deschide botul în
                  Telegram și scrie codul.
                </p>
              )}
              <p className="mt-1 text-ink/60">Codul: {invitatie.code}</p>
            </div>
          )}
        </div>
      </section>

      {/* ── E-mail ── */}
      <section className={caseta} data-testid="alerts-email-box">
        <h2 className="font-display text-xl font-bold">E-mail</h2>
        <p className="mt-2 text-sm text-ink/70">
          Aceleași anunțuri, pe adresă. (Ca să plece, serverul are nevoie de setările de e-mail —
          altfel rămân doar în „E-mailuri”.)
        </p>
        <div className="mt-3 flex flex-wrap items-end gap-3">
          <label className="min-w-[10rem] flex-1">
            <span className="text-xs font-bold uppercase tracking-wide text-ink/50">Cine e</span>
            <input
              className={camp}
              value={emailNou.label}
              onChange={(e) => setEmailNou({ ...emailNou, label: e.target.value })}
              placeholder="Daniel"
              data-testid="alerts-email-label"
            />
          </label>
          <label className="min-w-[14rem] flex-1">
            <span className="text-xs font-bold uppercase tracking-wide text-ink/50">Adresa</span>
            <input
              className={camp}
              value={emailNou.email}
              onChange={(e) => setEmailNou({ ...emailNou, email: e.target.value })}
              placeholder="nume@exemplu.ro"
              data-testid="alerts-email-address"
            />
          </label>
          <button
            type="button"
            className={buton}
            disabled={busy !== null}
            onClick={adaugaEmail}
            data-testid="alerts-email-add"
          >
            Adaugă
          </button>
        </div>
      </section>

      {/* ── Cine primește ce ── */}
      <section className={caseta}>
        <h2 className="font-display text-xl font-bold">Cine primește anunțurile</h2>
        {recipients.length === 0 ? (
          <p className="mt-3 text-ink/60" data-testid="alerts-empty">
            Deocamdată nimeni. Anunțurile nu pleacă nicăieri.
          </p>
        ) : (
          <div className="mt-4 space-y-4">
            {recipients.map((d) => (
              <div key={d.id} className="rounded-xl border border-ink/10 p-4" data-testid="alerts-row">
                <div className="flex flex-wrap items-start justify-between gap-3">
                  <div className="min-w-0">
                    <p className="font-semibold">
                      {d.label}{" "}
                      <span className="text-xs font-normal uppercase tracking-wide text-ink/50">
                        {d.kind === "EMAIL" ? "e-mail" : "Telegram"}
                      </span>
                    </p>
                    <p className="text-sm text-ink/60">
                      {d.kind === "EMAIL"
                        ? d.email
                        : d.linked
                          ? "legat"
                          : `așteaptă să apese Start (cod ${d.code})`}
                      {!d.active && " · pe pauză"}
                    </p>
                    {d.lastError && (
                      <p className="text-sm text-wing-red" data-testid="alerts-row-error">
                        Ultima încercare a eșuat: {d.lastError}
                      </p>
                    )}
                  </div>
                  <div className="flex flex-wrap gap-2">
                    <button
                      type="button"
                      className={butonMic}
                      disabled={busy !== null}
                      onClick={() => testeaza(d.id)}
                      data-testid="alerts-test"
                    >
                      Trimite test
                    </button>
                    <button
                      type="button"
                      className={butonMic}
                      disabled={busy !== null}
                      onClick={() => schimba(d.id, { active: !d.active })}
                      data-testid="alerts-toggle"
                    >
                      {d.active ? "Pune pe pauză" : "Pornește"}
                    </button>
                    <button
                      type="button"
                      className={`${butonMic} text-wing-red`}
                      disabled={busy !== null}
                      onClick={() => sterge(d)}
                      data-testid="alerts-delete"
                    >
                      Șterge
                    </button>
                  </div>
                </div>

                <div className="mt-3 flex flex-wrap gap-x-5 gap-y-2">
                  {cheie.map((k) => (
                    <label key={k} className="flex items-center gap-2 text-sm">
                      <input
                        type="checkbox"
                        checked={evenimentele(d).includes(k)}
                        onChange={(e) =>
                          schimba(d.id, {
                            events: e.target.checked
                              ? [...evenimentele(d), k]
                              : evenimentele(d).filter((x) => x !== k),
                          })
                        }
                        data-testid={`alerts-event-${k}`}
                      />
                      {events[k]}
                    </label>
                  ))}
                </div>
              </div>
            ))}
          </div>
        )}
        {!siteUrl && (
          <p className="mt-4 text-sm text-ink/60">
            Sfat: pune pe server <code className="rounded bg-ink/5 px-1">SITE_URL=http://adresa-site</code>{" "}
            ca anunțurile să conțină linkuri apăsabile, nu doar calea din site.
          </p>
        )}
      </section>
    </div>
  );
}
