"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { useLocale, useTranslations } from "next-intl";
import { useRouter } from "@/i18n/navigation";
import { formatMoney } from "@/lib/money";
import Countdown from "./Countdown";
import WinCelebration from "./WinCelebration";

type Props = {
  auctionId: string;
  status: string;
  currency: string;
  initialPriceCents: number;
  startPriceCents: number;
  initialBidCount: number;
  initialEndsAt: string;
  minNextCents: number;
  userId: string | null;
  userIsSeller: boolean;
  userIsLeading: boolean;
  winAnimationEnabled: boolean;
  winSoundEnabled: boolean;
  snipeMinutes: number;
  extensionMinutes: number;
};

export default function LiveAuctionPanel(props: Props) {
  const t = useTranslations("auction");
  const locale = useLocale();
  const router = useRouter();

  const [status, setStatus] = useState(props.status);
  const [priceCents, setPriceCents] = useState(props.initialPriceCents);
  const [bidCount, setBidCount] = useState(props.initialBidCount);
  const [endsAt, setEndsAt] = useState(props.initialEndsAt);
  const [leading, setLeading] = useState(props.userIsLeading);
  const [minNext, setMinNext] = useState(props.minNextCents);
  const [input, setInput] = useState("");
  const [message, setMessage] = useState<{ kind: "ok" | "err" | "info"; text: string } | null>(
    null
  );
  const [flash, setFlash] = useState(0);
  const [shake, setShake] = useState(0);
  const [extendedNote, setExtendedNote] = useState(false);
  const [celebrate, setCelebrate] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const wasLeading = useRef(props.userIsLeading);

  const fmt = useCallback(
    (c: number) => formatMoney(c, props.currency, locale),
    [props.currency, locale]
  );

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
          setEndsAt(ev.endsAt);
          setFlash((f) => f + 1);
          if (ev.extended) {
            setExtendedNote(true);
            setTimeout(() => setExtendedNote(false), 5000);
          }
          if (props.userId) {
            const isLeadingNow = ev.leadingBidderId === props.userId;
            setLeading(isLeadingNow);
            if (wasLeading.current && !isLeadingNow) {
              setShake((s) => s + 1);
            }
            wasLeading.current = isLeadingNow;
          }
        } else if (ev.kind === "closed") {
          setStatus("CLOSED");
          setPriceCents(ev.priceCents);
          if (props.userId && ev.winnerId === props.userId && props.winAnimationEnabled) {
            setCelebrate(true);
          }
          router.refresh();
        }
      } catch {
        // mesaj invalid — ignoram
      }
    };
    return () => es.close();
  }, [props.auctionId, props.userId, props.winAnimationEnabled, status, router]);

  const submitBid = async () => {
    const value = Number(input.replace(",", "."));
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
        setInput("");
        if (data.leading) {
          setMessage({ kind: "ok", text: t("bidPlacedLeading", { amount: fmt(data.priceCents) }) });
        } else {
          setMessage({ kind: "info", text: t("bidPlacedOutbid") });
          setShake((s) => s + 1);
        }
        setMinNext(data.priceCents + 1); // reactualizat oricum de urmatorul refresh
      } else {
        const key = `err${data.error}` as const;
        const params: Record<string, string> = {};
        if (data.minimumCents) params.minimum = fmt(data.minimumCents);
        if (data.limitCents) params.limit = fmt(data.limitCents);
        setMessage({
          kind: "err",
          text: t.has(key) ? t(key, params) : t("errNOT_FOUND"),
        });
        if (data.error === "BELOW_MINIMUM" && data.minimumCents) setMinNext(data.minimumCents);
      }
    } catch {
      setMessage({ kind: "err", text: t("errNOT_FOUND") });
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div
      key={shake > 0 ? `shake-${shake}` : "panel"}
      className={`rounded-2xl border border-ink/10 bg-white p-5 shadow-sm ${
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

      <div className="flex items-end justify-between">
        <div>
          <p className="text-xs uppercase tracking-wide text-ink/50">
            {bidCount > 0 ? t("currentBid") : t("startPrice")}
          </p>
          <p
            key={`price-${flash}`}
            data-testid="current-price"
            className={`text-3xl font-bold text-wing-orange ${flash > 0 ? "price-flash" : ""}`}
          >
            {fmt(bidCount > 0 || status === "CLOSED" ? priceCents : props.startPriceCents)}
          </p>
          <p className="mt-1 text-sm text-ink/60" data-testid="bid-count">
            {t("bidsCount", { count: bidCount })}
          </p>
        </div>
        {status === "LIVE" && (
          <div className="text-right">
            <p className="text-xs uppercase tracking-wide text-ink/50">{t("endsIn")}</p>
            <Countdown target={endsAt} onZero={() => fetch("/api/sweep", { method: "POST" })} />
            {extendedNote && (
              <p className="mt-1 text-xs font-bold text-wing-red" data-testid="extended-note">
                {t("extended")}
              </p>
            )}
          </div>
        )}
      </div>

      {status === "LIVE" && props.userId && !props.userIsSeller && (
        <div className="mt-5 border-t border-ink/10 pt-4">
          {leading && (
            <p
              className="mb-2 rounded-lg bg-wing-blue/10 px-3 py-2 text-sm font-semibold text-wing-blue"
              data-testid="leading-badge"
            >
              ✓ {t("youAreLeading")}
            </p>
          )}
          {!leading && wasLeading.current === false && shake > 0 && (
            <p
              className="mb-2 rounded-lg bg-wing-red/10 px-3 py-2 text-sm font-semibold text-wing-red"
              data-testid="outbid-badge"
            >
              {t("youWereOutbid")}
            </p>
          )}
          <label className="text-sm font-medium" htmlFor="bid-input">
            {t("yourMaxBid")}
          </label>
          <div className="mt-1 flex gap-2">
            <input
              id="bid-input"
              data-testid="bid-input"
              type="number"
              inputMode="decimal"
              min={minNext / 100}
              step="1"
              value={input}
              onChange={(e) => setInput(e.target.value)}
              onKeyDown={(e) => e.key === "Enter" && !submitting && submitBid()}
              placeholder={(minNext / 100).toString()}
              className="w-full rounded-xl border border-ink/20 bg-ivory-soft px-4 py-2.5 text-lg font-semibold outline-none focus:border-wing-blue"
            />
            <button
              onClick={submitBid}
              disabled={submitting}
              data-testid="bid-submit"
              className="rounded-xl bg-ink px-6 py-2.5 font-bold text-ivory transition-colors hover:bg-wing-orange disabled:opacity-50"
            >
              {t("placeBid")}
            </button>
          </div>
          <p className="mt-1.5 text-xs text-ink/50">{t("minimumBid", { amount: fmt(minNext) })}</p>
          {message && (
            <p
              data-testid="bid-message"
              className={`mt-2 rounded-lg px-3 py-2 text-sm font-medium ${
                message.kind === "ok"
                  ? "bg-green-100 text-green-800"
                  : message.kind === "err"
                    ? "bg-wing-red/10 text-wing-red"
                    : "bg-wing-yellow/20 text-ink"
              }`}
            >
              {message.text}
            </p>
          )}
          <details className="mt-3 text-xs text-ink/60">
            <summary className="cursor-pointer font-medium">{t("proxyExplain").slice(0, 24)}…</summary>
            <p className="mt-1">{t("proxyExplain")}</p>
          </details>
          <p className="mt-2 text-xs text-ink/50">
            {t("antiSnipeNote", {
              minutes: props.snipeMinutes,
              extension: props.extensionMinutes,
            })}
          </p>
        </div>
      )}

      {status === "LIVE" && !props.userId && (
        <a
          href={`/${locale}/login`}
          data-testid="login-to-bid"
          className="mt-5 block rounded-xl bg-ink px-6 py-3 text-center font-bold text-ivory hover:bg-wing-orange"
        >
          {t("loginToBid")}
        </a>
      )}
    </div>
  );
}
