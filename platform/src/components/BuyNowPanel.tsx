"use client";

import { useState } from "react";
import { useLocale, useTranslations } from "next-intl";
import { useRouter } from "@/i18n/navigation";
import { formatMoney } from "@/lib/money";

/** Panoul de cumpărare pentru loturile cu preț fix (fără licitație). */
export default function BuyNowPanel({
  auctionId,
  priceCents,
  currency,
  sold,
  userId,
  userIsSeller,
}: {
  auctionId: string;
  priceCents: number;
  currency: string;
  sold: boolean;
  userId: string | null;
  userIsSeller: boolean;
}) {
  const t = useTranslations("fixed");
  const locale = useLocale();
  const router = useRouter();
  const [confirming, setConfirming] = useState(false);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const price = formatMoney(priceCents, currency, locale);

  const buy = async () => {
    setBusy(true);
    setError(null);
    const res = await fetch(`/api/auctions/${auctionId}/buy`, { method: "POST" });
    const data = await res.json();
    setBusy(false);
    if (data.ok) {
      router.push(`/orders/${data.orderId}`);
    } else {
      const key = `err${data.error}` as const;
      setError(t.has(key) ? t(key) : t("errNOT_AVAILABLE"));
      setConfirming(false);
      router.refresh();
    }
  };

  return (
    <div className="rounded-2xl border border-ink/10 bg-white p-5 shadow-sm" data-testid="buy-panel">
      <p className="text-xs uppercase tracking-wide text-ink/50">{t("price")}</p>
      <p className="text-3xl font-bold text-wing-orange" data-testid="fixed-price">
        {price}
      </p>

      {sold ? (
        <p
          className="mt-4 rounded-xl bg-ink/5 px-4 py-3 text-center font-bold text-ink/60"
          data-testid="sold-badge"
        >
          {t("sold")}
        </p>
      ) : !userId ? (
        <a
          href={`/${locale}/login`}
          data-testid="login-to-buy"
          className="mt-4 block rounded-xl bg-ink px-6 py-3 text-center font-bold text-ivory hover:bg-wing-orange"
        >
          {t("loginToBuy")}
        </a>
      ) : userIsSeller ? (
        <p className="mt-4 text-sm text-ink/50">{t("errOWN_AUCTION")}</p>
      ) : confirming ? (
        <div className="mt-4 space-y-3">
          <p className="rounded-xl bg-wing-yellow/15 px-4 py-3 text-sm" data-testid="buy-confirm-text">
            {t("confirmText", { price })}
          </p>
          <div className="flex gap-2">
            <button
              onClick={buy}
              disabled={busy}
              data-testid="buy-confirm"
              className="flex-1 rounded-xl bg-wing-orange py-3 font-bold text-white hover:bg-wing-red disabled:opacity-50"
            >
              {t("buyNow")}
            </button>
            <button
              onClick={() => setConfirming(false)}
              disabled={busy}
              className="rounded-xl border border-ink/20 px-4 py-3 font-semibold hover:border-ink/40"
            >
              ✕
            </button>
          </div>
        </div>
      ) : (
        <button
          onClick={() => setConfirming(true)}
          data-testid="buy-now"
          className="mt-4 w-full rounded-xl bg-wing-orange py-3 font-bold text-white transition-colors hover:bg-wing-red"
        >
          {t("buyNow")}
        </button>
      )}

      {error && (
        <p
          className="mt-3 rounded-lg bg-wing-red/10 px-3 py-2 text-sm font-medium text-wing-red"
          data-testid="buy-error"
        >
          {error}
        </p>
      )}
    </div>
  );
}
