import { EventEmitter } from "events";

/**
 * Bus de evenimente in-memory pentru actualizari live (SSE).
 * Suficient pentru o singura instanta (dev/MVP); in productie se inlocuieste
 * cu Redis pub/sub in spatele aceleiasi interfete.
 */

/** Oferta așa cum o vede oricine: porecla sau numele mascat, suma, ora. */
export type PublicBid = {
  id: string;
  name: string;
  amountCents: number;
  at: string;
  /** răspunsul platformei în numele liderului, nu o apăsare de buton */
  auto: boolean;
};

export type AuctionEvent =
  | {
      kind: "bid";
      auctionId: string;
      priceCents: number;
      /** minimul acceptat pentru urmatoarea oferta, dupa aceasta */
      minNextCents: number;
      /** treapta de licitare la nivelul de pret curent */
      stepCents: number;
      bidCount: number;
      /** cati oameni distincti au licitat */
      bidderCount: number;
      /** „NONE" | „MET" | „NOT_MET" — suma de rezerva ramane ascunsa */
      reserve: "NONE" | "MET" | "NOT_MET";
      leadingBidderId: string;
      endsAt: string;
      extended: boolean;
      /** rândurile noi de istoric: oferta omului și, uneori, răspunsul automat */
      newBids: PublicBid[];
      /** care ofertă conduce acum (id de ofertă, nu de utilizator) */
      leadingBidId: string | null;
    }
  /**
   * Starea curentă, trimisă la deschiderea fluxului. Fără ea, ofertele date
   * cât timp conexiunea se stabilea se pierdeau: ecranul rămânea cu prețul
   * de la randarea paginii.
   */
  | {
      kind: "sync";
      auctionId: string;
      priceCents: number;
      minNextCents: number;
      stepCents: number;
      bidCount: number;
      bidderCount: number;
      reserve: "NONE" | "MET" | "NOT_MET";
      leadingBidderId: string | null;
      endsAt: string;
      /** ultimele oferte, ca istoricul să fie complet și după o reconectare */
      bids: PublicBid[];
      leadingBidId: string | null;
    }
  | { kind: "closed"; auctionId: string; winnerId: string | null; priceCents: number }
  /** ora de inchidere s-a schimbat din administrare (deocamdata: unealta de test) */
  | { kind: "rescheduled"; auctionId: string; endsAt: string };

/**
 * Ce ajunge efectiv la browser: fără id-uri de utilizatori. Serverul le compară
 * cu sesiunea și trimite doar „tu conduci” / „tu ai câștigat”.
 */
export type PublicAuctionEvent =
  | (Omit<Extract<AuctionEvent, { kind: "bid" }>, "leadingBidderId"> & { youAreLeading: boolean })
  | (Omit<Extract<AuctionEvent, { kind: "sync" }>, "leadingBidderId"> & { youAreLeading: boolean })
  | (Omit<Extract<AuctionEvent, { kind: "closed" }>, "winnerId"> & { youWon: boolean })
  | Extract<AuctionEvent, { kind: "rescheduled" }>;
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
