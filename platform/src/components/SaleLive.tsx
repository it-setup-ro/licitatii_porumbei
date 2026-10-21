"use client";

import { useEffect } from "react";
import { useRouter } from "@/i18n/navigation";

/**
 * Ține pagina unei licitații la zi, fără să apese nimeni nimic.
 *
 * Clientul: „dacă e pe un cont tot lotul și altul licitează sau se termină
 * timpul / prelungește, atunci nu se actualizează”. Pagina e randată pe
 * server (preț pe lot, preț pe fiecare porumbel, insigne, ore), așa că cel
 * mai cinstit e să-i cerem serverului datele din nou când s-a mișcat ceva —
 * nu să rescriem aici, pe furiș, numerele din pagină.
 *
 * Un fir, nu unul pe porumbel (vezi ruta `/api/sales/[slug]/stream`), și o
 * reîmprospătare la cel mult două secunde și jumătate: la zece oferte în zece
 * secunde, pagina nu se cere de zece ori.
 */
export default function SaleLive({ slug }: { slug: string }) {
  const router = useRouter();

  useEffect(() => {
    let es: EventSource | null = null;
    let ultima = 0;
    let programata: ReturnType<typeof setTimeout> | null = null;
    let viu = true;
    const PAUZA = 2500;

    const cere = () => {
      if (!viu) return;
      const acum = Date.now();
      const trecut = acum - ultima;
      if (trecut >= PAUZA) {
        ultima = acum;
        router.refresh();
        return;
      }
      // ultima ofertă dintr-un val nu se pierde: o luăm la sfârșitul pauzei
      if (programata) return;
      programata = setTimeout(() => {
        programata = null;
        ultima = Date.now();
        if (viu) router.refresh();
      }, PAUZA - trecut);
    };

    const deschide = () => {
      if (!viu || (es && es.readyState !== EventSource.CLOSED)) return;
      es = new EventSource(`/api/sales/${slug}/stream`);
      es.onmessage = cere;
    };

    // Pe telefon legătura cade (ecran blocat, tunel, semnal pierdut). La
    // revenire o deschidem din nou și cerem pagina: altfel omul se uită la
    // prețul de acum zece minute.
    const laRevenire = () => {
      if (document.hidden) return;
      deschide();
      cere();
    };

    deschide();
    document.addEventListener("visibilitychange", laRevenire);
    window.addEventListener("online", laRevenire);
    window.addEventListener("pageshow", laRevenire);

    return () => {
      viu = false;
      if (programata) clearTimeout(programata);
      document.removeEventListener("visibilitychange", laRevenire);
      window.removeEventListener("online", laRevenire);
      window.removeEventListener("pageshow", laRevenire);
      es?.close();
    };
  }, [router, slug]);

  return null;
}
