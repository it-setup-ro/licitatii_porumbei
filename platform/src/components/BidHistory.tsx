"use client";

import { useEffect, useState } from "react";
import { useLocale, useTranslations } from "next-intl";
import { subscribeAuction } from "@/lib/live-auction";
import { formatMoney } from "@/lib/money";
import { intlLocale } from "@/lib/locales";

/**
 * Istoricul ofertelor, ca pe pipa.be: se vad ultimele cateva, iar restul se
 * desfasoara in pagina la apasarea butonului. Pe o licitatie cu 60 de oferte,
 * lista completa ar impinge tot restul paginii in jos.
 *
 * Numele apar mascate (M. P***) — pe pagina publica nu are ce cauta numele
 * intreg al unui ofertant.
 */

const VISIBLE = 3;

export type BidRow = {
  id: string;
  name: string;
  amount: string;
  when: string;
  leading: boolean;
  /** răspunsul automat al platformei pentru lider, nu o apăsare de buton */
  auto: boolean;
};

export default function BidHistory({
  bids,
  live,
  auctionId,
  currency,
}: {
  bids: BidRow[];
  live: boolean;
  /** lipsesc la licitațiile încheiate: acolo lista nu se mai schimbă */
  auctionId?: string;
  currency?: string;
}) {
  const t = useTranslations("auction");
  const locale = useLocale();
  const [expanded, setExpanded] = useState(false);
  const [rows, setRows] = useState<BidRow[]>(bids);

  // Ofertele vin pe aceeași legătură live ca prețul. Înainte lista rămânea
  // cea de la deschiderea paginii: licitai de trei ori și vedeai doar prima.
  useEffect(() => {
    if (!live || !auctionId || !currency) return;
    const oraFmt = new Intl.DateTimeFormat(intlLocale(locale), {
      dateStyle: "short",
      timeStyle: "short",
    });
    const toRow = (b: {
      id: string;
      name: string;
      amountCents: number;
      at: string;
      auto: boolean;
    }): BidRow => ({
      id: b.id,
      name: b.name,
      amount: formatMoney(b.amountCents, currency, locale),
      when: oraFmt.format(new Date(b.at)),
      leading: false,
      auto: b.auto,
    });
    const cuLider = (lista: BidRow[], leadingBidId: string | null) =>
      lista.map((r) => ({ ...r, leading: leadingBidId !== null && r.id === leadingBidId }));

    return subscribeAuction(auctionId, (ev) => {
      if (ev.kind === "bid") {
        setRows((vechi) => {
          // pot veni două: oferta omului și răspunsul automat al liderului
          const noi = ev.newBids.map(toRow).reverse();
          const idNoi = new Set(noi.map((r) => r.id));
          const fara = vechi.filter((r) => !idNoi.has(r.id));
          return cuLider([...noi, ...fara], ev.leadingBidId);
        });
      } else if (ev.kind === "sync" && ev.bids.length > 0) {
        // la (re)conectare: lista completă, ca să nu lipsească ce s-a pierdut
        setRows(cuLider(ev.bids.map(toRow), ev.leadingBidId));
      }
    });
  }, [live, auctionId, currency, locale]);

  if (rows.length === 0) {
    return (
      <p className="text-sm text-ink/50" data-testid="bid-history-empty">
        {t("noBidsYet")}
      </p>
    );
  }

  const shown = expanded ? rows : rows.slice(0, VISIBLE);

  return (
    <div data-testid="bid-history">
      <div className="overflow-hidden rounded-2xl border border-ink/10 bg-white">
        <table className="w-full text-sm">
          <tbody>
            {shown.map((b) => (
              <tr key={b.id} className="border-b border-ink/5 last:border-0" data-testid="bid-row">
                <td className="px-4 py-2.5 font-medium">
                  {b.name}
                  {b.leading && live && (
                    <span className="ms-2 rounded bg-wing-blue/10 px-1.5 py-0.5 text-xs font-bold text-wing-blue">
                      ★
                    </span>
                  )}
                </td>
                <td className="px-4 py-2.5 font-semibold">
                  {b.amount}
                  {b.auto && (
                    <span className="ms-2 text-xs font-normal text-ink/50" data-testid="bid-auto">
                      {t("bidAuto")}
                    </span>
                  )}
                </td>
                <td className="px-4 py-2.5 text-end text-ink/50">{b.when}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {rows.length > VISIBLE && (
        <button
          type="button"
          onClick={() => setExpanded((v) => !v)}
          aria-expanded={expanded}
          data-testid="bid-history-toggle"
          className="mt-2 rounded-lg px-3 py-2 text-sm font-semibold text-wing-blue hover:bg-wing-blue/10"
        >
          {expanded ? t("hideAllBids") : t("showAllBids", { count: rows.length })}
        </button>
      )}
    </div>
  );
}
