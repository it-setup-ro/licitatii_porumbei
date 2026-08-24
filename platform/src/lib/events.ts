import { EventEmitter } from "events";

/**
 * Bus de evenimente in-memory pentru actualizari live (SSE).
 * Suficient pentru o singura instanta (dev/MVP); in productie se inlocuieste
 * cu Redis pub/sub in spatele aceleiasi interfete.
 */

export type AuctionEvent =
  | {
      kind: "bid";
      auctionId: string;
      priceCents: number;
      bidCount: number;
      leadingBidderId: string;
      endsAt: string;
      extended: boolean;
    }
  | { kind: "closed"; auctionId: string; winnerId: string | null; priceCents: number }
  /** ora de inchidere s-a schimbat din administrare (deocamdata: unealta de test) */
  | { kind: "rescheduled"; auctionId: string; endsAt: string };

const g = globalThis as unknown as { __auctionBus?: EventEmitter };

export function auctionBus(): EventEmitter {
  if (!g.__auctionBus) {
    g.__auctionBus = new EventEmitter();
    g.__auctionBus.setMaxListeners(1000);
  }
  return g.__auctionBus;
}

export function emitAuctionEvent(event: AuctionEvent) {
  auctionBus().emit(`auction:${event.auctionId}`, event);
  auctionBus().emit("auction:*", event);
}
