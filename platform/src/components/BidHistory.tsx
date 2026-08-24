"use client";

import { useState } from "react";
import { useTranslations } from "next-intl";

/**
 * Istoricul ofertelor, ca pe pipa.be: se vad ultimele cateva, iar restul se
 * desfasoara in pagina la apasarea butonului. Pe o licitatie cu 60 de oferte,
 * lista completa ar impinge tot restul paginii in jos.
 *
 * Numele apar mascate (M. P***) — pe pagina publica nu are ce cauta numele
 * intreg al unui ofertant.
 */

const VISIBLE = 3;

export type BidRow = { id: string; name: string; amount: string; when: string; leading: boolean };

export default function BidHistory({ bids, live }: { bids: BidRow[]; live: boolean }) {
  const t = useTranslations("auction");
  const [expanded, setExpanded] = useState(false);

  if (bids.length === 0) {
    return (
      <p className="text-sm text-ink/50" data-testid="bid-history-empty">
        {t("noBidsYet")}
      </p>
    );
  }

  const shown = expanded ? bids : bids.slice(0, VISIBLE);

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
                    <span className="ml-2 rounded bg-wing-blue/10 px-1.5 py-0.5 text-xs font-bold text-wing-blue">
                      ★
                    </span>
                  )}
                </td>
                <td className="px-4 py-2.5 font-semibold">{b.amount}</td>
                <td className="px-4 py-2.5 text-right text-ink/50">{b.when}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {bids.length > VISIBLE && (
        <button
          type="button"
          onClick={() => setExpanded((v) => !v)}
          aria-expanded={expanded}
          data-testid="bid-history-toggle"
          className="mt-2 rounded-lg px-3 py-2 text-sm font-semibold text-wing-blue hover:bg-wing-blue/10"
        >
          {expanded ? t("hideAllBids") : t("showAllBids", { count: bids.length })}
        </button>
      )}
    </div>
  );
}
