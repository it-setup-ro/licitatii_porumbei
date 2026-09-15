"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { useLocale, useTranslations } from "next-intl";
import { useRouter } from "@/i18n/navigation";
import { formatMoney } from "@/lib/money";
import { equivalentLabel } from "@/lib/fx-math";
import Countdown from "./Countdown";
import WinCelebration from "./WinCelebration";

/**
 * Panoul de licitare.
 *
 * Ordinea de pe ecran urmareste ordinea intrebarilor din capul cuiva care se
 * uita la un lot: se mai liciteaza? cat e acum? cati vor porumbelul asta? cat
 * mai am? cat trebuie sa dau? — si abia apoi butonul.
 *
 * „Cati ofertanti" sta langa pret dinadins: un lot cu cinci oameni pe el se
 * citeste altfel decat unul cu douasprezece oferte de la doi.
 */

export type ReserveState = "NONE" | "MET" | "NOT_MET";

type Props = {
  auctionId: string;
  status: string;
  currency: string;
  initialPriceCents: number;
  startPriceCents: number;
  initialBidCount: number;
  initialBidderCount: number;
  initialEndsAt: string;
  minNextCents: number;
  stepCents: number;
  reserve: ReserveState;
  userId: string | null;
  userIsSeller: boolean;
  userIsLeading: boolean;
  winAnimationEnabled: boolean;
  winSoundEnabled: boolean;
  snipeMinutes: number;
  extensionMinutes: number;
  /** contul nu e încă aprobat de administrator: vede licitația, dar nu licitează */
  accountBlocked?: "PENDING" | "REJECTED" | null;
  /** lei pentru un euro — echivalentul de sub preț */
  eurRate?: number | null;
};

export default function LiveAuctionPanel(props: Props) {
  const t = useTranslations("auction");
  const locale = useLocale();
  const router = useRouter();

  const [status, setStatus] = useState(props.status);
  const [priceCents, setPriceCents] = useState(props.initialPriceCents);
  const [bidCount, setBidCount] = useState(props.initialBidCount);
  const [bidderCount, setBidderCount] = useState(props.initialBidderCount);
  const [endsAt, setEndsAt] = useState(props.initialEndsAt);
  const [leading, setLeading] = useState(props.userIsLeading);
  const [minNext, setMinNext] = useState(props.minNextCents);
  const [step, setStep] = useState(props.stepCents);
  const [reserve, setReserve] = useState<ReserveState>(props.reserve);
  /** Campul porneste pe suma minima — asta e „oferta propusa". */
  const [input, setInput] = useState(String(props.minNextCents / 100));
  const [message, setMessage] = useState<{ kind: "ok" | "err" | "info"; text: string } | null>(
    null
  );
  const [flash, setFlash] = useState(0);
  const [shake, setShake] = useState(0);
  const [extendedNote, setExtendedNote] = useState(false);
  const [celebrate, setCelebrate] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  /** „ai fost depasit" — stare, nu ref: refurile nu se citesc in timpul randarii */
  const [showOutbid, setShowOutbid] = useState(false);
  const wasLeading = useRef(props.userIsLeading);

  const fmt = useCallback(
    (c: number) => formatMoney(c, props.currency, locale),
    [props.currency, locale]
  );

  /** Suma minima creste: daca in camp era mai putin, o ridicam si acolo. */
  const bumpInput = useCallback((nou: number) => {
    setInput((curent) => {
      const val = Number(String(curent).replace(",", "."));
      return !Number.isFinite(val) || val * 100 < nou ? String(nou / 100) : curent;
    });
  }, []);

  // Abonare la actualizari live (SSE)
  useEffect(() => {
    if (status !== "LIVE") return;
    const es = new EventSource(`/api/auctions/${props.auctionId}/stream`);
    es.onmessage = (e) => {
      try {
        const ev = JSON.parse(e.data);
        if (ev.kind === "bid") {
          setPriceCents(ev.priceCents);
          setBidCount(ev.bidCount);
          if (typeof ev.bidderCount === "number") setBidderCount(ev.bidderCount);
          if (typeof ev.stepCents === "number") setStep(ev.stepCents);
          if (ev.reserve) setReserve(ev.reserve);
          setEndsAt(ev.endsAt);
          // si suma propusa, nu doar pretul: altfel ecranul asta ramane cu
          // minimul de acum cinci oferte si trimite o suma deja depasita.
          // Pe fir vine minimul pentru un contracandidat; daca TU conduci, al tau
          // e altul (peste propriul plafon) si il lasam asa cum e.
          if (typeof ev.minNextCents === "number" && ev.youAreLeading !== true) {
            setMinNext(ev.minNextCents);
            bumpInput(ev.minNextCents);
          }
          setFlash((f) => f + 1);
          if (ev.extended) {
            setExtendedNote(true);
            setTimeout(() => setExtendedNote(false), 5000);
          }
          if (props.userId) {
            // serverul ne spune direct daca noi conducem (nu mai trimite id-uri)
            const isLeadingNow = ev.youAreLeading === true;
            setLeading(isLeadingNow);
            if (wasLeading.current && !isLeadingNow) {
              setShake((s) => s + 1);
              setShowOutbid(true);
            }
            if (isLeadingNow) setShowOutbid(false);
            wasLeading.current = isLeadingNow;
          }
        } else if (ev.kind === "rescheduled") {
          // ora de inchidere a fost mutata din administrare
          setEndsAt(ev.endsAt);
          setStatus("LIVE");
        } else if (ev.kind === "closed") {
          setStatus("CLOSED");
          setPriceCents(ev.priceCents);
          if (props.userId && ev.youWon === true && props.winAnimationEnabled) {
            setCelebrate(true);
          }
          router.refresh();
        }
      } catch {
        // mesaj invalid — ignoram
      }
    };
    return () => es.close();
  }, [props.auctionId, props.userId, props.winAnimationEnabled, status, router, bumpInput]);

  const nudge = (delta: number) => {
    const val = Number(String(input).replace(",", ".")) * 100;
    const baza = Number.isFinite(val) && val > 0 ? val : minNext;
    setInput(String(Math.max(minNext, Math.round(baza + delta)) / 100));
  };

  const submitBid = async () => {
    const value = Number(String(input).replace(",", "."));
    if (!Number.isFinite(value) || value <= 0) return;
    setSubmitting(true);
    setMessage(null);
    try {
      const res = await fetch(`/api/auctions/${props.auctionId}/bid`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ maxCents: Math.round(value * 100) }),
      });
      const data = await res.json();
      if (data.ok) {
        if (data.leading) {
          setMessage({ kind: "ok", text: t("bidPlacedLeading", { amount: fmt(data.priceCents) }) });
          setShowOutbid(false);
        } else {
          setMessage({ kind: "info", text: t("bidPlacedOutbid") });
          setShake((s) => s + 1);
        }
        const nou = data.minNextCents ?? data.priceCents;
        setMinNext(nou);
        setInput(String(nou / 100));
        if (data.reserve) setReserve(data.reserve);
      } else {
        const key = `err${data.error}` as const;
        const params: Record<string, string> = {};
        if (data.minimumCents) params.minimum = fmt(data.minimumCents);
        if (data.limitCents) params.limit = fmt(data.limitCents);
        setMessage({
          kind: "err",
          text: t.has(key) ? t(key, params) : t("errNOT_FOUND"),
        });
        if (data.error === "BELOW_MINIMUM" && data.minimumCents) {
          setMinNext(data.minimumCents);
          setInput(String(data.minimumCents / 100));
        }
      }
    } catch {
      setMessage({ kind: "err", text: t("errNOT_FOUND") });
    } finally {
      setSubmitting(false);
    }
  };

  const canBid =
    status === "LIVE" && props.userId && !props.userIsSeller && !props.accountBlocked;

  return (
    <div
      key={shake > 0 ? `shake-${shake}` : "panel"}
      className={`overflow-hidden rounded-2xl border border-ink/10 bg-white shadow-sm ${
        shake > 0 ? "outbid-shake" : ""
      }`}
      data-testid="bid-panel"
    >
      {celebrate && (
        <WinCelebration
          soundEnabled={props.winSoundEnabled}
          orderHref={`/${locale}/account/purchases`}
          onDone={() => setCelebrate(false)}
        />
      )}

      {/* ── Antet: „licitatie live" ── */}
      {status === "LIVE" && (
        <div
          className="flex items-center gap-2 bg-ink px-5 py-2.5 text-xs font-bold uppercase tracking-wider text-white"
          data-testid="live-badge"
        >
          <span className="live-dot h-2 w-2 rounded-full bg-wing-red" aria-hidden="true" />
          {t("liveAuction")}
        </div>
      )}

      <div className="p-5">
        {/* ── Pretul, cu cati oameni sunt pe el ── */}
        <p className="text-xs uppercase tracking-wide text-ink/50">
          {bidCount > 0 ? t("currentBid") : t("startPrice")}
        </p>
        <p
          key={`price-${flash}`}
          data-testid="current-price"
          className={`font-display text-4xl font-bold text-wing-orange ${
            flash > 0 ? "price-flash" : ""
          }`}
        >
          {fmt(bidCount > 0 || status === "CLOSED" ? priceCents : props.startPriceCents)}
        </p>
        {props.eurRate ? (
          <p className="text-sm font-medium text-ink/50" data-testid="price-equiv">
            {equivalentLabel(
              bidCount > 0 || status === "CLOSED" ? priceCents : props.startPriceCents,
              props.currency,
              locale,
              props.eurRate
            )}
          </p>
        ) : null}

        <div className="mt-2 flex flex-wrap items-center gap-x-4 gap-y-1 text-sm text-ink/70">
          <span data-testid="bidder-count" className="flex items-center gap-1.5">
            <IconPeople />
            {t("biddersCount", { count: bidderCount })}
          </span>
          <span data-testid="bid-count" className="flex items-center gap-1.5">
            <IconHammer />
            {t("bidsCount", { count: bidCount })}
          </span>
        </div>

        {reserve !== "NONE" && (
          <p
            data-testid="reserve-state"
            className={`mt-3 inline-flex items-center gap-2 rounded-full px-3 py-1 text-xs font-bold ${
              reserve === "MET"
                ? "bg-green-100 text-green-800"
                : "bg-wing-yellow/25 text-wing-orange"
            }`}
          >
            <span aria-hidden="true">●</span>
            {reserve === "MET" ? t("reserveMet") : t("reserveNotMet")}
          </p>
        )}

        {/* ── Cat mai e ── */}
        {status === "LIVE" && (
          <div className="mt-4 rounded-xl bg-ivory-soft px-4 py-3">
            <p className="text-xs uppercase tracking-wide text-ink/50">{t("endsIn")}</p>
            <Countdown target={endsAt} onZero={() => fetch("/api/sweep", { method: "POST" })} />
            {extendedNote && (
              <p className="mt-1 text-xs font-bold text-wing-red" data-testid="extended-note">
                {t("extended")}
              </p>
            )}
          </div>
        )}

        {/* ── Licitarea ── */}
        {canBid && (
          <div className="mt-5 border-t border-ink/10 pt-4">
            {leading && (
              <p
                className="mb-3 rounded-lg bg-wing-blue/10 px-3 py-2 text-sm font-semibold text-wing-blue"
                data-testid="leading-badge"
              >
                ✓ {t("youAreLeading")}
              </p>
            )}
            {!leading && showOutbid && (
              <p
                className="mb-3 rounded-lg bg-wing-red/10 px-3 py-2 text-sm font-semibold text-wing-red"
                data-testid="outbid-badge"
              >
                {t("youWereOutbid")}
              </p>
            )}

            <label className="text-sm font-medium" htmlFor="bid-input">
              {t("yourMaxBid")}
            </label>

            {/* Stepper: pe telefon, a scrie o suma de mana dupa fiecare oferta
                noua e cea mai sigura cale spre „oferta prea mica". */}
            <div className="mt-1.5 flex items-stretch overflow-hidden rounded-xl border border-ink/20 bg-white">
              <button
                type="button"
                onClick={() => nudge(-step)}
                aria-label={t("decrease")}
                data-testid="bid-minus"
                className="w-14 shrink-0 border-r border-ink/15 text-2xl font-bold text-ink/60 transition-colors hover:bg-ink/5 hover:text-ink"
              >
                −
              </button>
              <input
                id="bid-input"
                data-testid="bid-input"
                type="number"
                inputMode="decimal"
                min={minNext / 100}
                step={step / 100}
                value={input}
                onChange={(e) => setInput(e.target.value)}
                onKeyDown={(e) => e.key === "Enter" && !submitting && submitBid()}
                className="w-full min-w-0 bg-transparent px-3 py-3 text-center text-xl font-bold outline-none"
              />
              <button
                type="button"
                onClick={() => nudge(step)}
                aria-label={t("increase")}
                data-testid="bid-plus"
                className="w-14 shrink-0 border-l border-ink/15 text-2xl font-bold text-ink/60 transition-colors hover:bg-ink/5 hover:text-ink"
              >
                +
              </button>
            </div>

            <button
              onClick={submitBid}
              disabled={submitting}
              data-testid="bid-submit"
              className="mt-3 w-full rounded-xl bg-wing-orange px-6 py-3.5 font-display text-lg font-bold uppercase tracking-wide text-white shadow-sm transition-colors hover:bg-wing-red disabled:opacity-50"
            >
              {submitting ? "…" : t("placeBid")}
            </button>

            <button
              type="button"
              onClick={() => setInput(String(minNext / 100))}
              data-testid="bid-use-minimum"
              className="-mx-1 mt-2 rounded-lg px-1 py-1.5 text-xs text-ink/55 transition-colors hover:bg-ink/5 hover:text-wing-blue"
            >
              {t("minimumBid", { amount: fmt(minNext) })}
            </button>

            {message && (
              <p
                data-testid="bid-message"
                className={`mt-2 rounded-lg px-3 py-2 text-sm font-medium ${
                  message.kind === "ok"
                    ? "bg-green-100 text-green-800"
                    : message.kind === "err"
                      ? "bg-wing-red/10 text-wing-red"
                      : "bg-wing-yellow/25 text-ink"
                }`}
              >
                {message.text}
              </p>
            )}

            <details className="mt-3 text-xs text-ink/60" data-testid="proxy-explain">
              <summary className="cursor-pointer py-1 font-medium">{t("proxyTitle")}</summary>
              <p className="mt-1">{t("proxyExplain")}</p>
            </details>
            <p className="mt-1 text-xs text-ink/50">
              {t("antiSnipeNote", {
                minutes: props.snipeMinutes,
                extension: props.extensionMinutes,
              })}
            </p>
          </div>
        )}

        {status === "LIVE" && props.userId && props.accountBlocked && (
          <p
            className="mt-5 rounded-xl border border-wing-blue/30 bg-wing-blue/5 px-4 py-3 text-sm"
            data-testid="account-pending-notice"
          >
            {props.accountBlocked === "REJECTED"
              ? t("errACCOUNT_REJECTED")
              : t("errACCOUNT_PENDING")}
          </p>
        )}

        {status === "LIVE" && !props.userId && (
          <a
            href={`/${locale}/login`}
            data-testid="login-to-bid"
            className="mt-5 block rounded-xl bg-wing-orange px-6 py-3.5 text-center font-display text-lg font-bold uppercase tracking-wide text-white hover:bg-wing-red"
          >
            {t("loginToBid")}
          </a>
        )}
      </div>
    </div>
  );
}

function IconPeople() {
  return (
    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.9" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
      <path d="M16 21v-2a4 4 0 0 0-4-4H6a4 4 0 0 0-4 4v2" />
      <circle cx="9" cy="7" r="4" />
      <path d="M22 21v-2a4 4 0 0 0-3-3.9" />
    </svg>
  );
}

function IconHammer() {
  return (
    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.9" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
      <path d="m14 3 7 7-3 3-7-7z" />
      <path d="M11.5 5.5 5 12l7 7 6.5-6.5" />
      <path d="M3 21h8" />
    </svg>
  );
}
