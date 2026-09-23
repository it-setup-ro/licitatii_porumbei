"use client";

/**
 * O singură legătură live pe pagină, împărțită între cine are nevoie de ea.
 *
 * Pe pagina unui porumbel, două bucăți ascultă aceleași actualizări: panoul de
 * licitat (preț, cronometru, „ai fost depășit") și istoricul ofertelor. Fără
 * partajare, fiecare ar deschide propria conexiune către server — de două ori
 * mai multe conexiuni ținute deschise, degeaba.
 */

import type { PublicAuctionEvent } from "./events";

type Handler = (event: PublicAuctionEvent) => void;

type Canal = { es: EventSource; handlers: Set<Handler> };

const canale = new Map<string, Canal>();

export function subscribeAuction(auctionId: string, handler: Handler): () => void {
  let canal = canale.get(auctionId);

  if (!canal) {
    const es = new EventSource(`/api/auctions/${auctionId}/stream`);
    const nou: Canal = { es, handlers: new Set() };
    es.onmessage = (e) => {
      let ev: PublicAuctionEvent;
      try {
        ev = JSON.parse(e.data);
      } catch {
        return; // mesaj invalid — îl ignorăm
      }
      // o copie a listei: un handler care se dezabonează în timpul buclei
      // nu trebuie să sară peste ceilalți
      for (const h of [...nou.handlers]) {
        try {
          h(ev);
        } catch {
          // o eroare într-un ascultător nu-i oprește pe ceilalți
        }
      }
    };
    canale.set(auctionId, nou);
    canal = nou;
  }

  canal.handlers.add(handler);

  return () => {
    const c = canale.get(auctionId);
    if (!c) return;
    c.handlers.delete(handler);
    // ultimul care pleacă închide conexiunea
    if (c.handlers.size === 0) {
      c.es.close();
      canale.delete(auctionId);
    }
  };
}
