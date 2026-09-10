"use client";

import { useEffect, useState } from "react";

/**
 * Bara fixă de jos, pe telefon: prețul curent și butonul de licitat.
 *
 * Pagina unui lot are galerie, pedigree, palmares, poveste — derulezi mult, iar
 * panoul de licitație rămâne sus. Bara asta ține butonul la îndemână oriunde ai
 * ajunge, fără să acopere nimic: apare doar după ce ai depășit panoul, și
 * dispare la loc când te întorci la el.
 *
 * Apăsarea nu deschide alt formular — te duce înapoi la panou, cu suma deja în
 * câmp. Un al doilea loc de licitat ar însemna două stări de ținut în acord.
 */
export default function StickyBidBar({
  priceLabel,
  buttonLabel,
  loggedIn,
  isSeller,
  loginHref,
}: {
  priceLabel: string;
  buttonLabel: string;
  loggedIn: boolean;
  isSeller: boolean;
  loginHref: string;
}) {
  const [shown, setShown] = useState(false);

  useEffect(() => {
    // vânzătorul nu licitează la propriul lot — nu-i ocupăm ecranul degeaba
    if (isSeller) return;
    const panel = document.querySelector('[data-testid="bid-panel"]');
    if (!panel) return;

    const io = new IntersectionObserver(
      ([entry]) => setShown(!entry.isIntersecting),
      { rootMargin: "-80px 0px 0px 0px" }
    );
    io.observe(panel);
    return () => io.disconnect();
  }, [isSeller]);

  if (isSeller || !shown) return null;

  const goToPanel = () => {
    const panel = document.querySelector('[data-testid="bid-panel"]');
    panel?.scrollIntoView({ behavior: "smooth", block: "center" });
    setTimeout(() => {
      const input = document.querySelector<HTMLInputElement>('[data-testid="bid-input"]');
      input?.focus();
      input?.select();
    }, 450);
  };

  return (
    <div
      className="fixed inset-x-0 bottom-0 z-40 border-t border-ink/10 bg-white/95 px-4 py-3 shadow-[0_-6px_20px_-12px_rgba(16,36,63,0.5)] backdrop-blur lg:hidden"
      data-testid="sticky-bid-bar"
    >
      <div className="mx-auto flex max-w-lg items-center gap-3">
        <p className="min-w-0 flex-1">
          <span className="block text-[11px] uppercase tracking-wide text-ink/50">
            {/* eticheta scurtă: pe 375px nu încape mai mult */}
            &nbsp;
          </span>
          <span
            className="font-display text-xl font-bold text-wing-orange"
            data-testid="sticky-price"
          >
            {priceLabel}
          </span>
        </p>

        {loggedIn ? (
          <button
            onClick={goToPanel}
            data-testid="sticky-bid-button"
            className="shrink-0 rounded-xl bg-wing-orange px-6 py-3 font-bold uppercase tracking-wide text-white"
          >
            {buttonLabel} →
          </button>
        ) : (
          <a
            href={loginHref}
            data-testid="sticky-bid-login"
            className="shrink-0 rounded-xl bg-wing-orange px-6 py-3 font-bold uppercase tracking-wide text-white"
          >
            {buttonLabel} →
          </a>
        )}
      </div>
    </div>
  );
}
