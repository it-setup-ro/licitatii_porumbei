"use client";

import { useState } from "react";
import Lightbox from "./Lightbox";

/**
 * O imagine care se deschide pe tot ecranul la clic.
 *
 * Folosită la pedigree: în pagină e un document dens, cu inele și rezultate
 * scrise mărunt — pe telefon, nelizibil fără mărire.
 */
export default function ZoomableImage({
  src,
  alt,
  className,
  testid,
}: {
  src: string;
  alt: string;
  className?: string;
  testid?: string;
}) {
  const [open, setOpen] = useState(false);

  return (
    <>
      <button
        type="button"
        onClick={() => setOpen(true)}
        aria-label={`${alt} — mărește`}
        data-testid={testid}
        className="block w-full cursor-zoom-in"
      >
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img src={src} alt={alt} className={className} />
      </button>
      {open && (
        <Lightbox
          items={[{ url: src, alt }]}
          index={0}
          onIndex={() => {}}
          onClose={() => setOpen(false)}
        />
      )}
    </>
  );
}
