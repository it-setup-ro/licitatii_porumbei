"use client";

import { useState } from "react";
import Lightbox from "./Lightbox";

/**
 * Galeria lotului: poze si clipuri in acelasi loc, ca pe pipa.be.
 *
 * Miniaturile de sub imaginea mare comuta ce se vede. Clipurile au un semn
 * „play" pe miniatura, ca sa se stie din prima ca acolo e video, nu poza.
 *
 * Un clic pe poza o deschide pe tot ecranul, cu inca un nivel de marire: la un
 * porumbel conteaza detaliul — ochiul, inelul de la picior — iar poza din pagina
 * e prea mica pentru asta, mai ales pe telefon. Clipurile nu se maresc: ele au
 * deja butonul de ecran complet al playerului.
 */

export type LotMedia = { url: string; type: string; title: string | null };

export default function LotGallery({
  media,
  alt,
  videoLabel,
}: {
  media: LotMedia[];
  alt: string;
  videoLabel: string;
}) {
  const [active, setActive] = useState(0);
  const [zoomAt, setZoomAt] = useState<number | null>(null);
  const items = media.length > 0 ? media : [{ url: "/pigeons/p1.svg", type: "IMAGE", title: null }];
  const current = items[Math.min(active, items.length - 1)];
  // in fereastra de marire intra doar pozele — clipurile au ecranul complet al playerului
  const images = items.filter((m) => m.type !== "VIDEO");

  return (
    <div data-testid="lot-gallery">
      <div className="overflow-hidden rounded-2xl border border-ink/10 bg-white">
        {current.type === "VIDEO" ? (
          <video
            key={current.url}
            src={current.url}
            controls
            playsInline
            preload="metadata"
            className="aspect-[4/3] w-full bg-black object-contain"
            data-testid="lot-video"
          />
        ) : (
          <button
            type="button"
            onClick={() => setZoomAt(images.findIndex((m) => m.url === current.url))}
            aria-label={`${alt} — mărește`}
            data-testid="lot-image-zoom"
            className="block w-full cursor-zoom-in"
          >
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img
              src={current.url}
              alt={current.title ?? alt}
              className="aspect-[4/3] w-full object-cover"
              data-testid="lot-image"
            />
          </button>
        )}
      </div>

      {items.length > 1 && (
        <div className="mt-3 flex gap-2 overflow-x-auto pb-1" data-testid="lot-thumbs">
          {items.map((m, i) => (
            <button
              key={m.url}
              type="button"
              onClick={() => setActive(i)}
              aria-label={m.type === "VIDEO" ? videoLabel : `${alt} ${i + 1}`}
              aria-current={i === active}
              data-testid="lot-thumb"
              className={`relative h-16 w-20 shrink-0 overflow-hidden rounded-lg border-2 ${
                i === active ? "border-wing-blue" : "border-ink/10"
              }`}
            >
              {m.type === "VIDEO" ? (
                <>
                  <video src={m.url} muted playsInline preload="metadata" className="h-full w-full object-cover" />
                  <span className="absolute inset-0 flex items-center justify-center bg-ink/40 text-lg text-white">
                    ▶
                  </span>
                </>
              ) : (
                // eslint-disable-next-line @next/next/no-img-element
                <img src={m.url} alt="" className="h-full w-full object-cover" />
              )}
            </button>
          ))}
        </div>
      )}

      {zoomAt !== null && images.length > 0 && (
        <Lightbox
          items={images.map((m) => ({ url: m.url, alt: m.title ?? alt }))}
          index={Math.max(0, zoomAt)}
          onIndex={setZoomAt}
          onClose={() => setZoomAt(null)}
        />
      )}
    </div>
  );
}
