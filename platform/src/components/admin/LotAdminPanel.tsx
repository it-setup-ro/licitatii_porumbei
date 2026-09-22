"use client";

import { useState } from "react";
import { useRouter } from "@/i18n/navigation";
import AuctionVisibility from "./AuctionVisibility";
import { formatMoney } from "@/lib/money";
import PriceInput from "@/components/PriceInput";
import type { FxInfo } from "@/lib/fx-math";
import { isoToLocalInput, localInputToIso } from "@/lib/local-datetime";

/**
 * Un lot, în pagina licitației din administrare.
 *
 *  - în ciornă: orele, porumbeii (adăugare, ordine, scoatere) și „Start lot";
 *  - programat, înainte de ora de început: orele și „Scoate din program";
 *  - pornit sau închis: doar de citit — prețuri, oferte, link la site.
 */

export type LotAdminData = {
  id: string;
  number: number;
  status: string;
  startsAt: string;
  endsAt: string;
  locked: boolean;
  pigeons: {
    auctionId: string;
    position: number;
    label: string;
    name: string;
    ringNumber: string;
    sex: string;
    birthYear: number;
    startPriceCents: number;
    currentPriceCents: number;
    bidCount: number;
    imageCount: number;
    status: string;
    /** scos de pe site de administrator */
    hidden: boolean;
  }[];
};

type Problem =
  | { code: "NOT_DRAFT"; status: string }
  | { code: "EMPTY" }
  | { code: "TOO_MANY"; max: number; count: number }
  | { code: "END_BEFORE_START" }
  | { code: "ENDS_IN_PAST" }
  | { code: "INCOMPLETE"; pigeons: { position: number; missing: string[] }[] };

const MISSING_LABEL: Record<string, string> = {
  ringNumber: "seria inelului",
  birthYear: "anul",
  sex: "sexul",
  photo: "fotografia",
  startPrice: "prețul de pornire",
};

const STATUS: Record<string, { label: string; cls: string }> = {
  DRAFT: { label: "ciornă", cls: "bg-ink/10 text-ink/70" },
  SCHEDULED: { label: "programat", cls: "bg-wing-blue/10 text-wing-blue" },
  LIVE: { label: "activ", cls: "bg-wing-red/10 text-wing-red" },
  CLOSED: { label: "închis", cls: "bg-ink/10 text-ink/60" },
};

const SEX_LABEL: Record<string, string> = { M: "♂ Mascul", F: "♀ Femelă", U: "Pui / nedeterminat" };

export default function LotAdminPanel({
  saleId,
  lot,
  locale,
  currency,
  maxPigeons,
  fx = null,
}: {
  saleId: string;
  lot: LotAdminData;
  locale: string;
  currency: string;
  maxPigeons: number;
  fx?: FxInfo | null;
}) {
  const router = useRouter();
  const draft = lot.status === "DRAFT";
  const scheduledUnlocked = lot.status === "SCHEDULED" && !lot.locked;
  const timesEditable = draft || scheduledUnlocked;

  const [start, setStart] = useState(() => isoToLocalInput(lot.startsAt));
  const [end, setEnd] = useState(() => isoToLocalInput(lot.endsAt));
  const [busy, setBusy] = useState<string | null>(null);
  const [timesError, setTimesError] = useState<string | null>(null);
  const [problems, setProblems] = useState<Problem[] | null>(null);
  const [notice, setNotice] = useState<string | null>(null);

  const [add, setAdd] = useState({ ring: "", year: "", sex: "", name: "", price: "", reserve: "" });
  const [addErrors, setAddErrors] = useState<Record<string, string>>({});
  const [added, setAdded] = useState<{ auctionId: string; label: string } | null>(null);

  const fmt = (cents: number) => formatMoney(cents, currency, locale);
  const dateFmt = new Intl.DateTimeFormat(locale === "en" ? "en-GB" : "ro-RO", {
    dateStyle: "medium",
    timeStyle: "short",
  });

  const call = async (key: string, url: string, init: RequestInit = { method: "POST" }) => {
    setBusy(key);
    try {
      const res = await fetch(url, init);
      return await res.json();
    } finally {
      setBusy(null);
    }
  };

  const saveTimes = async () => {
    setTimesError(null);
    const data = await call("times", `/api/admin/sale-lots/${lot.id}`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ startsAt: localInputToIso(start), endsAt: localInputToIso(end) }),
    });
    if (data.ok) {
      setNotice("Orele au fost salvate.");
      router.refresh();
    } else if (data.fields) {
      setTimesError(Object.values(data.fields as Record<string, string>).join(" "));
    } else if (data.error === "LOT_LOCKED") {
      setTimesError("Lotul a pornit: orele nu se mai schimbă.");
    } else {
      setTimesError("Orele nu s-au putut salva.");
    }
  };

  const startLot = async () => {
    const ok = window.confirm(
      `Pornești Lotul ${lot.number} cu ${lot.pigeons.length} porumbei?\n\n` +
        "După ora de început, orele, porumbeii și prețurile nu se mai pot schimba."
    );
    if (!ok) return;
    setProblems(null);
    const data = await call("start", `/api/admin/sale-lots/${lot.id}/start`);
    if (data.ok) {
      setNotice(
        data.status === "LIVE"
          ? `Lotul ${lot.number} a pornit. Se licitează.`
          : `Lotul ${lot.number} e programat și pornește singur la ora de început.`
      );
      router.refresh();
    } else if (data.problems) {
      setProblems(data.problems);
    } else {
      setProblems([]);
      setNotice("Lotul nu s-a putut porni.");
    }
  };

  const deleteLot = async () => {
    const ok = window.confirm(
      `Ștergi Lotul ${lot.number}, cu cei ${lot.pigeons.length} porumbei din el?\n\n` +
        "Merge doar cât lotul e ciornă și nimeni n-a licitat. Nu se poate da înapoi."
    );
    if (!ok) return;
    const data = await call("del-lot", `/api/admin/sale-lots/${lot.id}`, { method: "DELETE" });
    if (data.ok) {
      router.refresh();
    } else if (data.error === "HAS_HISTORY") {
      setNotice("Lotul are porumbei cu oferte sau comenzi: nu se șterge.");
    } else if (data.error === "NOT_DRAFT") {
      setNotice("Lotul a pornit deja: nu se mai șterge.");
    } else {
      setNotice("Lotul nu s-a putut șterge.");
    }
  };

  const unschedule = async () => {
    const data = await call("unschedule", `/api/admin/sale-lots/${lot.id}/unschedule`);
    if (data.ok) {
      setNotice(`Lotul ${lot.number} e din nou ciornă.`);
      router.refresh();
    } else {
      setNotice("Lotul a pornit deja și nu mai poate fi scos din program.");
    }
  };

  const move = async (index: number, dir: -1 | 1) => {
    const ids = lot.pigeons.map((p) => p.auctionId);
    const j = index + dir;
    if (j < 0 || j >= ids.length) return;
    [ids[index], ids[j]] = [ids[j], ids[index]];
    const data = await call("order", `/api/admin/sale-lots/${lot.id}/order`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ auctionIds: ids }),
    });
    if (data.ok) router.refresh();
  };

  const remove = async (auctionId: string, label: string, name: string) => {
    if (!window.confirm(`Scoți porumbelul ${label} „${name}" din lot? Fișa lui se șterge.`)) return;
    const data = await call(`rm-${auctionId}`, `/api/admin/sale-pigeons/${auctionId}`, {
      method: "DELETE",
    });
    if (data.ok) router.refresh();
    else setNotice("Porumbelul nu s-a putut scoate.");
  };

  const addPigeon = async (e: React.FormEvent) => {
    e.preventDefault();
    setAddErrors({});
    setAdded(null);
    const toCents = (v: string) => Math.round(Number(v.replace(",", ".")) * 100);
    const data = await call("add", `/api/admin/sale-lots/${lot.id}/pigeons`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        ringNumber: add.ring,
        sex: add.sex,
        name: add.name,
        startPriceCents: toCents(add.price),
        reservePriceCents: add.reserve ? toCents(add.reserve) : null,
      }),
    });
    if (data.ok) {
      setAdded({ auctionId: data.auctionId, label: `${lot.number}.${String(data.position).padStart(2, "0")}` });
      setAdd({ ring: "", year: add.year, sex: "", name: "", price: add.price, reserve: "" });
      router.refresh();
    } else if (data.fields) {
      setAddErrors(data.fields);
    } else if (data.error === "LOT_FULL") {
      setAddErrors({ form: `Lotul are deja ${data.max} porumbei.` });
    } else if (data.error === "LOT_NOT_DRAFT") {
      setAddErrors({ form: "Lotul nu mai e în ciornă. Scoate-l întâi din program." });
    } else {
      setAddErrors({ form: "Porumbelul nu s-a putut adăuga." });
    }
  };

  const describeProblem = (p: Problem): string[] => {
    switch (p.code) {
      case "EMPTY":
        return ["Lotul nu are niciun porumbel."];
      case "TOO_MANY":
        return [`Lotul are ${p.count} porumbei; maximum ${p.max}.`];
      case "END_BEFORE_START":
        return ["Ora de sfârșit trebuie să fie după cea de început."];
      case "ENDS_IN_PAST":
        return ["Ora de sfârșit a trecut. Mută-o în viitor."];
      case "NOT_DRAFT":
        return ["Lotul a fost deja pornit."];
      case "INCOMPLETE":
        return p.pigeons.map(
          (x) =>
            `Lotul ${lot.number}.${String(x.position).padStart(2, "0")}: lipsește ${x.missing
              .map((m) => MISSING_LABEL[m] ?? m)
              .join(", ")}.`
        );
    }
  };

  const st = STATUS[lot.status] ?? STATUS.DRAFT;
  const input =
    "mt-1 w-full rounded-xl border bg-ivory-soft px-3 py-2 text-sm outline-none focus:border-wing-blue";
  const inputFor = (k: string) => `${input} ${addErrors[k] ? "border-wing-red" : "border-ink/20"}`;
  const showLive = lot.status === "LIVE" || lot.status === "CLOSED";

  return (
    <section className="rounded-2xl border border-ink/10 bg-white p-5" data-testid="lot-panel">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div className="flex items-center gap-3">
          <h2 className="font-display text-2xl font-bold">Lotul {lot.number}</h2>
          <span className={`rounded px-2 py-0.5 text-xs font-bold ${st.cls}`} data-testid="lot-status">
            {st.label}
          </span>
          <span className="text-sm text-ink/50">
            {lot.pigeons.length} / {maxPigeons} porumbei
          </span>
          {draft && (
            <button
              type="button"
              onClick={deleteLot}
              disabled={busy !== null}
              data-testid="lot-delete"
              className="rounded-lg px-2.5 py-1.5 text-xs font-semibold text-wing-red hover:bg-wing-red/10 disabled:opacity-50"
            >
              Șterge lotul
            </button>
          )}
        </div>
        <p className="text-sm text-ink/60">
          {dateFmt.format(new Date(lot.startsAt))} → {dateFmt.format(new Date(lot.endsAt))}
        </p>
      </div>

      {/* ── orele ── */}
      {timesEditable && (
        <div className="mt-4 grid gap-3 rounded-xl bg-ivory-soft p-4 sm:grid-cols-[1fr_1fr_auto] sm:items-end">
          <label className="text-sm font-medium">
            Începe la
            <input
              type="datetime-local"
              value={start}
              onChange={(e) => setStart(e.target.value)}
              data-testid="lot-times-start"
              className={`${input} border-ink/20 bg-white`}
            />
          </label>
          <label className="text-sm font-medium">
            Se termină la
            <input
              type="datetime-local"
              value={end}
              onChange={(e) => setEnd(e.target.value)}
              data-testid="lot-times-end"
              className={`${input} border-ink/20 bg-white`}
            />
          </label>
          <button
            type="button"
            onClick={saveTimes}
            disabled={busy !== null}
            data-testid="lot-times-save"
            className="rounded-xl border border-ink/20 bg-white px-4 py-2 text-sm font-semibold hover:border-wing-blue disabled:opacity-50"
          >
            Salvează orele
          </button>
          {timesError && (
            <p className="text-sm text-wing-red sm:col-span-3" data-testid="lot-times-error">
              {timesError}
            </p>
          )}
        </div>
      )}

      {/* ── porumbeii ── */}
      {lot.pigeons.length === 0 ? (
        <p className="mt-4 text-sm text-ink/50" data-testid="lot-empty">
          Niciun porumbel încă.
        </p>
      ) : (
        <div className="mt-4 overflow-x-auto">
          <table className="w-full min-w-[40rem] text-sm">
            <tbody>
              {lot.pigeons.map((p, i) => (
                <tr key={p.auctionId} className="border-b border-ink/5 last:border-0" data-testid="lot-pigeon-row">
                  <td className="w-16 px-2 py-2 font-display font-bold" data-testid="lot-pigeon-label">
                    {p.label}
                  </td>
                  <td className="px-2 py-2">
                    <p className="font-semibold">{p.name}</p>
                    <p className="text-xs text-ink/50">
                      {p.ringNumber} · {SEX_LABEL[p.sex] ?? p.sex}
                    </p>
                  </td>
                  <td className="px-2 py-2">
                    {p.imageCount === 0 ? (
                      <span className="rounded bg-wing-orange/15 px-2 py-0.5 text-xs font-bold text-wing-orange" data-testid="lot-pigeon-nophoto">
                        fără poză
                      </span>
                    ) : (
                      <span className="text-xs text-ink/50">{p.imageCount} poze</span>
                    )}
                  </td>
                  <td className="px-2 py-2 text-end">
                    {showLive ? (
                      <>
                        <p className="font-semibold">{fmt(p.bidCount > 0 ? p.currentPriceCents : p.startPriceCents)}</p>
                        <p className="text-xs text-ink/50">
                          {p.bidCount === 1 ? "1 ofertă" : `${p.bidCount} oferte`}
                        </p>
                      </>
                    ) : (
                      <p className="text-ink/70">{fmt(p.startPriceCents)}</p>
                    )}
                  </td>
                  <td className="whitespace-nowrap px-2 py-2 text-end">
                    {draft && (
                      <>
                        <button
                          type="button"
                          onClick={() => move(i, -1)}
                          disabled={i === 0 || busy !== null}
                          aria-label="Mută mai sus"
                          data-testid="lot-pigeon-up"
                          className="rounded-lg px-2 py-1.5 text-ink/60 hover:bg-ink/5 disabled:opacity-30"
                        >
                          ↑
                        </button>
                        <button
                          type="button"
                          onClick={() => move(i, 1)}
                          disabled={i === lot.pigeons.length - 1 || busy !== null}
                          aria-label="Mută mai jos"
                          data-testid="lot-pigeon-down"
                          className="rounded-lg px-2 py-1.5 text-ink/60 hover:bg-ink/5 disabled:opacity-30"
                        >
                          ↓
                        </button>
                      </>
                    )}
                    <a
                      href={`/${locale}/admin/sales/${saleId}/pigeons/${p.auctionId}`}
                      data-testid="lot-pigeon-edit"
                      className="rounded-lg px-3 py-1.5 font-semibold text-wing-blue hover:bg-wing-blue/10"
                    >
                      {lot.locked ? "Fișa" : "Completează fișa"}
                    </a>
                    {showLive && (
                      <a
                        href={`/${locale}/auctions/${p.auctionId}`}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="rounded-lg px-3 py-1.5 font-semibold text-ink/60 hover:bg-ink/5"
                      >
                        Pe site ↗
                      </a>
                    )}
                    {draft && (
                      <button
                        type="button"
                        onClick={() => remove(p.auctionId, p.label, p.name)}
                        disabled={busy !== null}
                        data-testid="lot-pigeon-remove"
                        className="rounded-lg px-3 py-1.5 font-semibold text-wing-red hover:bg-wing-red/10 disabled:opacity-50"
                      >
                        Scoate
                      </button>
                    )}
                    {!draft && (
                      <span className="ms-2 inline-flex">
                        <AuctionVisibility
                          auctionId={p.auctionId}
                          hidden={p.hidden}
                          name={p.name}
                          compact
                        />
                      </span>
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {/* ── porumbel nou ── */}
      {draft && lot.pigeons.length < maxPigeons && (
        <form onSubmit={addPigeon} className="mt-4 rounded-xl border border-dashed border-ink/20 p-4" data-testid="lot-add-form">
          <p className="font-semibold">Adaugă porumbel — Lotul {lot.number}.{String(lot.pigeons.length + 1).padStart(2, "0")}</p>
          <p className="text-xs text-ink/50">
            Datele de bază și prețul. Pozele, pedigree-ul și restul le completezi în fișă.
          </p>
          <div className="mt-3 grid gap-3 sm:grid-cols-3">
            <label className="text-sm font-medium">
              Seria inelului <span className="font-bold text-wing-red">*</span>
              <input required value={add.ring} onChange={(e) => setAdd({ ...add, ring: e.target.value })} data-testid="lot-add-ring" className={inputFor("ringNumber")} placeholder="RO 2025 123456" />
              {addErrors.ringNumber && <span className="mt-1 block text-xs text-wing-red">{addErrors.ringNumber}</span>}
            </label>
            <label className="text-sm font-medium">
              Sexul <span className="font-bold text-wing-red">*</span>
              <select required value={add.sex} onChange={(e) => setAdd({ ...add, sex: e.target.value })} data-testid="lot-add-sex" className={inputFor("sex")}>
                <option value="">— alege —</option>
                <option value="M">♂ Mascul</option>
                <option value="F">♀ Femelă</option>
                <option value="U">Pui / nedeterminat</option>
              </select>
              {addErrors.sex && <span className="mt-1 block text-xs text-wing-red">{addErrors.sex}</span>}
            </label>
            <label className="text-sm font-medium sm:col-span-3">
              Numele porumbelului <span className="font-bold text-wing-red">*</span>
              <input required value={add.name} onChange={(e) => setAdd({ ...add, name: e.target.value })} data-testid="lot-add-name" className={inputFor("name")} />
              {addErrors.name && <span className="mt-1 block text-xs text-wing-red">{addErrors.name}</span>}
            </label>
            <div className="text-sm font-medium">
              Preț de pornire <span className="font-bold text-wing-red">*</span>
              <PriceInput currency={currency} fx={fx} canChangeRate value={add.price} onChange={(v) => setAdd({ ...add, price: v })} testid="lot-add-price" inputClassName={inputFor("startPriceCents")} required />
              {addErrors.startPriceCents && <span className="mt-1 block text-xs text-wing-red">{addErrors.startPriceCents}</span>}
            </div>
            <div className="text-sm font-medium">
              Preț de rezervă
              <PriceInput currency={currency} fx={fx} showRate={false} value={add.reserve} onChange={(v) => setAdd({ ...add, reserve: v })} testid="lot-add-reserve" inputClassName={inputFor("reservePriceCents")} />
              <span className="mt-1 block text-xs text-ink/50">Opțional. Suma rămâne ascunsă.</span>
            </div>
            <div className="flex items-end">
              <button type="submit" disabled={busy !== null} data-testid="lot-add-submit" className="w-full rounded-xl bg-ink px-4 py-2.5 font-bold text-ivory hover:bg-wing-orange disabled:opacity-50">
                {busy === "add" ? "…" : "+ Adaugă"}
              </button>
            </div>
          </div>
          {addErrors.form && <p className="mt-2 text-sm text-wing-red">{addErrors.form}</p>}
          {added && (
            <p className="mt-2 text-sm text-green-700" data-testid="lot-add-done">
              ✓ Adăugat Lotul {added.label}.{" "}
              <a href={`/${locale}/admin/sales/${saleId}/pigeons/${added.auctionId}`} className="font-semibold text-wing-blue underline">
                Completează fișa
              </a>
            </p>
          )}
        </form>
      )}

      {/* ── pornirea ── */}
      <div className="mt-4 flex flex-wrap items-center gap-3">
        {draft && (
          <button
            type="button"
            onClick={startLot}
            disabled={busy !== null}
            data-testid="lot-start"
            className="rounded-xl bg-wing-orange px-6 py-2.5 font-bold text-white hover:bg-wing-red disabled:opacity-50"
          >
            {busy === "start" ? "…" : `Start Lotul ${lot.number}`}
          </button>
        )}
        {scheduledUnlocked && (
          <button
            type="button"
            onClick={unschedule}
            disabled={busy !== null}
            data-testid="lot-unschedule"
            className="rounded-xl border border-ink/20 px-4 py-2.5 text-sm font-semibold hover:border-wing-blue disabled:opacity-50"
          >
            Scoate din program
          </button>
        )}
        {lot.locked && lot.status !== "CLOSED" && (
          <p className="text-sm text-ink/60">
            Lotul a pornit: orele, porumbeii și prețurile nu se mai schimbă.
          </p>
        )}
        {notice && (
          <p className="text-sm font-semibold text-green-700" data-testid="lot-notice">
            {notice}
          </p>
        )}
      </div>

      {problems && problems.length > 0 && (
        <div className="mt-3 rounded-xl border border-wing-red/30 bg-wing-red/5 p-4 text-sm" data-testid="lot-problems">
          <p className="font-semibold text-wing-red">Lotul nu poate porni încă:</p>
          <ul className="mt-2 list-disc space-y-1 ps-5">
            {problems.flatMap(describeProblem).map((line) => (
              <li key={line}>{line}</li>
            ))}
          </ul>
        </div>
      )}
    </section>
  );
}
