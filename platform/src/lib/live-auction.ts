"use client";

/**
 * O singură legătură live pe pagină, împărțită între cine are nevoie de ea.
 *
 * Pe pagina unui porumbel, două bucăți ascultă aceleași actualizări: panoul de
 * licitat (preț, cronometru, „ai fost depășit") și istoricul ofertelor. Fără
 * partajare, fiecare ar deschide propria conexiune către server — de două ori
 * mai multe conexiuni ținute deschise, degeaba.
 *
 * Pe telefon, legătura cade des: blochezi ecranul, pierzi semnalul, treci prin
 * tunel. Browserul nu o reface întotdeauna singur, iar omul rămâne cu prețul
 * vechi pe ecran — exact ce a reclamat clientul. De aceea, la revenirea în
 * pagină sau la revenirea internetului, legăturile închise se deschid din nou,
 * iar serverul trimite pe loc starea de acum (evenimentul „sync").
 */

import type { PublicAuctionEvent } from "./events";

type Handler = (event: PublicAuctionEvent) => void;

type Canal = { es: EventSource; handlers: Set<Handler> };

const canale = new Map<string, Canal>();

/** Deschide (sau redeschide) firul către server pentru o licitație. */
function deschide(auctionId: string, canal: Canal): void {
  const es = new EventSource(`/api/auctions/${auctionId}/stream`);
  es.onmessage = (e) => {
    let ev: PublicAuctionEvent;
    try {
      ev = JSON.parse(e.data);
    } catch {
      return; // mesaj invalid — îl ignorăm
    }
    // o copie a listei: un handler care se dezabonează în timpul buclei
    // nu trebuie să sară peste ceilalți
    for (const h of [...canal.handlers]) {
      try {
        h(ev);
      } catch {
        // o eroare într-un ascultător nu-i oprește pe ceilalți
      }
    }
  };
  canal.es = es;
}

/** Legăturile închise se refac; cele vii se lasă în pace. */
function refaLegaturile(): void {
  for (const [auctionId, canal] of canale) {
    if (canal.handlers.size === 0) continue;
    if (canal.es.readyState === EventSource.CLOSED) deschide(auctionId, canal);
  }
}

let ascultam = false;
function ascultaRevenirea(): void {
  if (ascultam || typeof window === "undefined") return;
  ascultam = true;
  document.addEventListener("visibilitychange", () => {
    if (!document.hidden) refaLegaturile();
  });
  window.addEventListener("online", refaLegaturile);
  window.addEventListener("pageshow", refaLegaturile);
}

export function subscribeAuction(auctionId: string, handler: Handler): () => void {
  ascultaRevenirea();

  let canal = canale.get(auctionId);
  if (!canal) {
    canal = { es: null as unknown as EventSource, handlers: new Set() };
    canale.set(auctionId, canal);
    deschide(auctionId, canal);
  } else if (canal.es.readyState === EventSource.CLOSED) {
    // cineva se abonează pe o legătură căzută între timp
    deschide(auctionId, canal);
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
