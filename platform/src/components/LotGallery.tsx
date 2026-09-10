"use client";

import { useState } from "react";
import Lightbox from "./Lightbox";

/**
 * Galeria lotului: poze, clipuri și pedigree, în același cadru mare.
 *
 * Pedigree-ul era o secțiune separată, mai jos în pagină. Aici e o filă lângă
 * poze — cum e și pe pipa.be — pentru că e al doilea lucru pe care îl caută
 * cineva după ce vede pasărea, nu ceva de derulat până la el.
 *
 * Un clic pe poză o deschide pe tot ecranul, cu încă un nivel de mărire: la un
 * porumbel contează detaliul (ochiul, inelul), iar la pedigree scrisul e
 * mărunt. Clipurile nu se măresc — au deja ecranul complet al playerului.
 */

export type LotMedia = { url: string; type: string; title: string | null };

type Tab = "PHOTO" | "VIDEO" | "PEDIGREE";

export default function LotGallery({
  media,
  alt,
  pedigreeUrl,
  labels,
}: {
  media: LotMedia[];
  alt: string;
  /** poză sau PDF; lipsă = fila nu apare */
  pedigreeUrl?: string | null;
  labels: { photos: string; video: string; pedigree: string; openPedigree: string };
}) {
  const photos = media.filter((m) => m.type !== "VIDEO");
  const videos = media.filter((m) => m.type === "VIDEO");
  const items = photos.length > 0 ? photos : [{ url: "/pigeons/p1.svg", type: "IMAGE", title: null }];

  const [tab, setTab] = useState<Tab>("PHOTO");
  const [active, setActive] = useState(0);
  const [zoomAt, setZoomAt] = useState<number | null>(null);
  const [zoomPedigree, setZoomPedigree] = useState(false);

  const pedigreeIsPdf = Boolean(pedigreeUrl && pedigreeUrl.toLowerCase().endsWith(".pdf"));
  const current = items[Math.min(active, items.length - 1)];
  const activeVideo = videos[Math.min(active, videos.length - 1)];

  const tabs: { key: Tab; label: string; count?: number }[] = [
    { key: "PHOTO", label: labels.photos, count: photos.length },
    ...(videos.length > 0 ? [{ key: "VIDEO" as Tab, label: labels.video, count: videos.length }] : []),
    ...(pedigreeUrl ? [{ key: "PEDIGREE" as Tab, label: labels.pedigree }] : []),
  ];

  const switchTo = (t: Tab) => {
    setTab(t);
    setActive(0);
  };

  return (
    <div data-testid="lot-gallery">
      {/* ── File ── */}
      {tabs.length > 1 && (
        <div
          className="mb-3 flex gap-1 rounded-xl bg-ivory-soft p-1"
          role="tablist"
          data-testid="gallery-tabs"
        >
          {tabs.map((tb) => (
            <button
              key={tb.key}
              role="tab"
              aria-selected={tab === tb.key}
              onClick={() => switchTo(tb.key)}
              data-testid={`gallery-tab-${tb.key.toLowerCase()}`}
              className={`flex-1 rounded-lg px-3 py-2.5 text-sm font-bold transition-colors ${
                tab === tb.key ? "bg-ink text-white shadow-sm" : "text-ink/60 hover:text-ink"
              }`}
            >
              {tb.label}
              {tb.count !== undefined && tb.count > 1 && (
                <span className={tab === tb.key ? "text-white/60" : "text-ink/40"}> ({tb.count})</span>
              )}
            </button>
          ))}
        </div>
      )}

      {/* ── Cadrul mare ── */}
      <div className="overflow-hidden rounded-2xl border border-ink/10 bg-white">
        {tab === "PEDIGREE" && pedigreeUrl ? (
          pedigreeIsPdf ? (
            <div className="p-4">
              <a
                href={pedigreeUrl}
                target="_blank"
                rel="noopener noreferrer"
                data-testid="pedigree-open"
                className="inline-block rounded-xl border border-ink/20 px-5 py-3 text-sm font-semibold text-wing-blue hover:border-wing-blue"
              >
                📄 {labels.openPedigree}
              </a>
              {/* iframe, nu object: CSP-ul are object-src 'none' */}
              <iframe
                src={pedigreeUrl}
                title={`${labels.pedigree} ${alt}`}
                className="mt-3 hidden h-[70vh] w-full rounded-xl border border-ink/10 sm:block"
              />
            </div>
          ) : (
            <button
              type="button"
              onClick={() => setZoomPedigree(true)}
              aria-label={`${labels.pedigree} — ${alt}`}
              data-testid="pedigree-open"
              className="block w-full cursor-zoom-in"
            >
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img src={pedigreeUrl} alt={`${labels.pedigree} ${alt}`} className="w-full" />
            </button>
          )
        ) : tab === "VIDEO" && activeVideo ? (
          <video
            key={activeVideo.url}
            src={activeVideo.url}
            controls
            playsInline
            preload="metadata"
            className="aspect-[4/3] w-full bg-black object-contain"
            data-testid="lot-video"
          />
        ) : (
          <button
            type="button"
            onClick={() => setZoomAt(active)}
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

      {/* ── Miniaturi, doar pentru fila curentă ── */}
      {((tab === "PHOTO" && items.length > 1) || (tab === "VIDEO" && videos.length > 1)) && (
        <div className="mt-3 flex gap-2 overflow-x-auto pb-1" data-testid="lot-thumbs">
          {(tab === "VIDEO" ? videos : items).map((m, i) => (
            <button
              key={m.url}
              type="button"
              onClick={() => setActive(i)}
              aria-label={`${alt} ${i + 1}`}
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

      {zoomAt !== null && (
        <Lightbox
          items={items.map((m) => ({ url: m.url, alt: m.title ?? alt }))}
          index={Math.max(0, Math.min(zoomAt, items.length - 1))}
          onIndex={setZoomAt}
          onClose={() => setZoomAt(null)}
        />
      )}

      {zoomPedigree && pedigreeUrl && (
        <Lightbox
          items={[{ url: pedigreeUrl, alt: `${labels.pedigree} ${alt}` }]}
          index={0}
          onIndex={() => {}}
          onClose={() => setZoomPedigree(false)}
        />
      )}
    </div>
  );
}
