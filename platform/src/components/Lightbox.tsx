"use client";

import { useEffect, useState } from "react";

/**
 * Mărirea unei imagini pe tot ecranul.
 *
 * La un lot contează detaliul: culoarea ochiului, inelul de la picior, rândurile
 * dintr-un pedigree scanat. Pe telefon, imaginea din pagină e prea mică pentru
 * asta, iar pedigree-ul e practic ilizibil.
 *
 * Se închide cu Escape, cu butonul, sau cu un clic în afara imaginii. Cât e
 * deschisă, pagina din spate nu se mai derulează.
 */

export type LightboxItem = { url: string; alt?: string };

export default function Lightbox({
  items,
  index,
  onClose,
  onIndex,
}: {
  items: LightboxItem[];
  index: number;
  onClose: () => void;
  onIndex: (i: number) => void;
}) {
  const [zoom, setZoom] = useState(false);
  const many = items.length > 1;

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") onClose();
      if (many && e.key === "ArrowRight") onIndex((index + 1) % items.length);
      if (many && e.key === "ArrowLeft") onIndex((index - 1 + items.length) % items.length);
    };
    document.addEventListener("keydown", onKey);
    const prev = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => {
      document.removeEventListener("keydown", onKey);
      document.body.style.overflow = prev;
    };
  }, [index, items.length, many, onClose, onIndex]);

  const item = items[index];
  if (!item) return null;

  return (
    <div
      className="fixed inset-0 z-[60] flex items-center justify-center bg-ink/90 p-4"
      onClick={onClose}
      role="dialog"
      aria-modal="true"
      aria-label={item.alt ?? "Imagine mărită"}
      data-testid="lightbox"
    >
      <button
        onClick={onClose}
        aria-label="Închide"
        data-testid="lightbox-close"
        className="absolute right-3 top-3 flex h-11 w-11 items-center justify-center rounded-full bg-white/15 text-2xl text-white hover:bg-white/25"
      >
        ✕
      </button>

      {many && (
        <>
          <button
            onClick={(e) => {
              e.stopPropagation();
              onIndex((index - 1 + items.length) % items.length);
            }}
            aria-label="Imaginea anterioară"
            data-testid="lightbox-prev"
            className="absolute left-2 flex h-12 w-12 items-center justify-center rounded-full bg-white/15 text-2xl text-white hover:bg-white/25"
          >
            ‹
          </button>
          <button
            onClick={(e) => {
              e.stopPropagation();
              onIndex((index + 1) % items.length);
            }}
            aria-label="Imaginea următoare"
            data-testid="lightbox-next"
            className="absolute right-2 flex h-12 w-12 items-center justify-center rounded-full bg-white/15 text-2xl text-white hover:bg-white/25"
          >
            ›
          </button>
        </>
      )}

      {/* Containerul poate fi derulat cand imaginea e marita — asa functioneaza
          si „lupa" pe telefon: apesi si te plimbi prin poza. */}
      <div
        className={`max-h-full max-w-full ${zoom ? "overflow-auto" : "overflow-hidden"}`}
        onClick={(e) => e.stopPropagation()}
      >
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img
          src={item.url}
          alt={item.alt ?? ""}
          onClick={() => setZoom((v) => !v)}
          data-testid="lightbox-image"
          className={
            zoom
              ? "max-w-none cursor-zoom-out"
              : "max-h-[88vh] max-w-[92vw] cursor-zoom-in object-contain"
          }
          style={zoom ? { width: "200vw" } : undefined}
        />
      </div>

      {many && (
        <p
          className="absolute bottom-4 rounded-full bg-white/15 px-3 py-1 text-sm text-white"
          data-testid="lightbox-counter"
        >
          {index + 1} / {items.length}
        </p>
      )}
    </div>
  );
}
