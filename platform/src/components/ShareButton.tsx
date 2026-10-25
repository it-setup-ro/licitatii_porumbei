"use client";

import { useState } from "react";
import { useTranslations } from "next-intl";

/**
 * „Distribuie" — cerut de client pentru pagina unei licitații: linkul circulă
 * oricum pe WhatsApp, în grupurile de columbofili, dar trebuia copiat de mână
 * din bara browserului.
 *
 * Pe telefon folosim fereastra de distribuire a sistemului (aceeași cu cea din
 * orice aplicație); pe calculator, unde nu există, arătăm trei butoane:
 * WhatsApp, Facebook și copierea linkului.
 */
export default function ShareButton({ title }: { title: string }) {
  const t = useTranslations("common");
  const [deschis, setDeschis] = useState(false);
  const [copiat, setCopiat] = useState(false);

  const adresa = () => (typeof window === "undefined" ? "" : window.location.href);

  const apasa = async () => {
    const url = adresa();
    // fereastra sistemului, acolo unde există (telefon, tabletă)
    if (typeof navigator !== "undefined" && navigator.share) {
      try {
        await navigator.share({ title, url });
        return;
      } catch {
        // a închis fereastra: nu e o eroare
        return;
      }
    }
    setDeschis((d) => !d);
  };

  const copiaza = async () => {
    try {
      await navigator.clipboard.writeText(adresa());
      setCopiat(true);
      setTimeout(() => setCopiat(false), 2500);
    } catch {
      // unele browsere refuză fără permisiune: lăsăm linkurile de mai sus
    }
  };

  const linkClass =
    "block rounded-lg px-3 py-2 text-sm font-semibold hover:bg-ink/5 whitespace-nowrap";

  return (
    <div className="relative inline-block">
      <button
        type="button"
        onClick={apasa}
        data-testid="share-button"
        className="inline-flex items-center gap-2 rounded-full border border-white/40 bg-white/15 px-4 py-2 text-sm font-bold text-white backdrop-blur transition-colors hover:bg-white/25"
      >
        <svg width="16" height="16" viewBox="0 0 24 24" fill="none" aria-hidden="true">
          <path
            d="M4 12v7a1 1 0 0 0 1 1h14a1 1 0 0 0 1-1v-7M12 15V3m0 0L8 7m4-4 4 4"
            stroke="currentColor"
            strokeWidth="2"
            strokeLinecap="round"
            strokeLinejoin="round"
          />
        </svg>
        {t("share")}
      </button>

      {deschis && (
        <div
          className="absolute end-0 z-30 mt-2 w-48 rounded-xl border border-ink/10 bg-white p-1 text-ink shadow-xl"
          data-testid="share-menu"
        >
          <a
            className={linkClass}
            href={`https://wa.me/?text=${encodeURIComponent(`${title} ${adresa()}`)}`}
            target="_blank"
            rel="noopener noreferrer"
            data-testid="share-whatsapp"
          >
            {t("shareWhatsapp")}
          </a>
          <a
            className={linkClass}
            href={`https://www.facebook.com/sharer/sharer.php?u=${encodeURIComponent(adresa())}`}
            target="_blank"
            rel="noopener noreferrer"
            data-testid="share-facebook"
          >
            {t("shareFacebook")}
          </a>
          <button type="button" onClick={copiaza} className={`${linkClass} w-full text-start`} data-testid="share-copy">
            {copiat ? t("shareCopied") : t("shareCopy")}
          </button>
        </div>
      )}
    </div>
  );
}
