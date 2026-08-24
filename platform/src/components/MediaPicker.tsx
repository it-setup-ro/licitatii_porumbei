"use client";

import { useRef, useState } from "react";

/**
 * Alegerea fisierelor — aceeasi peste tot: articole, listare porumbel, produse.
 *
 * Pe telefon apar butoanele „Fă o poză" si „Filmează", care deschid direct
 * camera (atributul `capture`). Pe calculator butoanele acelea sunt ascunse:
 * acolo `capture` e ignorat de browser si ar deschide tot selectorul de
 * fisiere, adica doua butoane care fac acelasi lucru. Ramane „Alege fișiere".
 *
 * Durata clipurilor se verifica INAINTE de incarcare, ca utilizatorul sa nu
 * astepte degeaba un fisier care oricum ar fi respins.
 */

export type PickedMedia = { url: string; type: "IMAGE" | "VIDEO" | "DOC" };

const MAX_VIDEO_SECONDS = 60;

/** Citeste durata unui clip din metadate, fara sa-l incarce pe server. */
function readDuration(file: File): Promise<number> {
  return new Promise((resolve) => {
    const url = URL.createObjectURL(file);
    const probe = document.createElement("video");
    probe.preload = "metadata";
    const done = (value: number) => {
      URL.revokeObjectURL(url);
      resolve(value);
    };
    probe.onloadedmetadata = () => done(probe.duration);
    probe.onerror = () => done(NaN); // nu putem citi durata -> lasam serverul sa decida
    probe.src = url;
  });
}

export default function MediaPicker({
  value,
  onChange,
  maxFiles = 10,
  allowImages = true,
  allowVideo = true,
  allowPdf = false,
  label,
}: {
  value: PickedMedia[];
  onChange: (next: PickedMedia[]) => void;
  maxFiles?: number;
  /** pus pe false, selectorul accepta doar clipuri (rubrica „Video") */
  allowImages?: boolean;
  allowVideo?: boolean;
  /** pentru pedigree: se accepta si un PDF scanat, nu doar poza */
  allowPdf?: boolean;
  label?: string;
}) {
  const filesRef = useRef<HTMLInputElement>(null);
  const photoRef = useRef<HTMLInputElement>(null);
  const videoRef = useRef<HTMLInputElement>(null);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const remaining = maxFiles - value.length;

  const handle = async (list: FileList | null) => {
    if (!list || list.length === 0) return;
    setBusy(true);
    setError(null);

    const chosen = Array.from(list).slice(0, Math.max(0, remaining));

    // verificam durata clipurilor inainte sa urcam ceva
    for (const file of chosen) {
      if (file.type.startsWith("video/")) {
        const seconds = await readDuration(file);
        if (Number.isFinite(seconds) && seconds > MAX_VIDEO_SECONDS + 1) {
          setError(
            `Clipul e prea lung (${Math.round(seconds)} secunde). Maxim ${MAX_VIDEO_SECONDS} de secunde.`
          );
          setBusy(false);
          resetInputs();
          return;
        }
      }
    }

    const data = new FormData();
    for (const f of chosen) data.append("files", f);

    try {
      const res = await fetch("/api/upload", { method: "POST", body: data });
      const out = await res.json();
      if (out.ok) {
        onChange([...value, ...out.files].slice(0, maxFiles));
      } else {
        setError(
          out.error === "FILE_TOO_LARGE"
            ? out.isVideo
              ? "Clipul e prea mare (maxim 60 MB). Filmează mai scurt."
              : out.isDoc
                ? "PDF-ul e prea mare (maxim 10 MB)."
                : "Poza e prea mare (maxim 5 MB)."
            : out.error === "INVALID_TYPE"
              ? `Format neacceptat. Poze: JPG, PNG, WebP.${allowVideo ? " Video: MP4, WebM, MOV." : ""}${allowPdf ? " Document: PDF." : ""}`
              : "Încărcarea a eșuat. Încearcă din nou."
        );
      }
    } catch {
      setError("Încărcarea a eșuat. Încearcă din nou.");
    } finally {
      setBusy(false);
      resetInputs();
    }
  };

  const resetInputs = () => {
    for (const r of [filesRef, photoRef, videoRef]) if (r.current) r.current.value = "";
  };

  const move = (index: number, delta: number) => {
    const next = [...value];
    const target = index + delta;
    if (target < 0 || target >= next.length) return;
    [next[index], next[target]] = [next[target], next[index]];
    onChange(next);
  };

  const btn =
    "flex items-center justify-center gap-2 rounded-xl border border-ink/20 bg-white px-4 py-3 text-sm font-semibold transition-colors hover:border-wing-blue hover:text-wing-blue disabled:opacity-50";

  return (
    <div data-testid="media-picker">
      {label && <p className="mb-2 text-sm font-medium">{label}</p>}

      {/* Intrari ascunse: fisiere, camera foto, camera video */}
      <input
        ref={filesRef}
        type="file"
        accept={[
          allowImages ? "image/jpeg,image/png,image/webp," : "",
          allowVideo ? "video/mp4,video/webm,video/quicktime," : "",
          allowPdf ? "application/pdf," : "",
        ]
          .join("")
          .replace(/,$/, "")}
        multiple={maxFiles > 1}
        className="hidden"
        data-testid="media-input-files"
        onChange={(e) => handle(e.target.files)}
      />
      <input
        ref={photoRef}
        type="file"
        accept="image/*"
        disabled={!allowImages}
        capture="environment"
        className="hidden"
        data-testid="media-input-photo"
        onChange={(e) => handle(e.target.files)}
      />
      {allowVideo && (
        <input
          ref={videoRef}
          type="file"
          accept="video/*"
          capture="environment"
          className="hidden"
          data-testid="media-input-video"
          onChange={(e) => handle(e.target.files)}
        />
      )}

      <div className="grid grid-cols-2 gap-2 sm:flex sm:flex-wrap">
        {/* Camera — doar pe ecrane mici, unde chiar exista o camera de folosit */}
        {allowImages && (
          <button
            type="button"
            onClick={() => photoRef.current?.click()}
            disabled={busy || remaining <= 0}
            data-testid="media-take-photo"
            className={`${btn} sm:hidden`}
          >
            <CameraIcon />
            Fă o poză
          </button>
        )}
        {allowVideo && (
          <button
            type="button"
            onClick={() => videoRef.current?.click()}
            disabled={busy || remaining <= 0}
            data-testid="media-record-video"
            className={`${btn} sm:hidden`}
          >
            <VideoIcon />
            Filmează
          </button>
        )}

        <button
          type="button"
          onClick={() => filesRef.current?.click()}
          disabled={busy || remaining <= 0}
          data-testid="media-choose-files"
          className={`${btn} col-span-2`}
        >
          {busy ? (
            "Se încarcă…"
          ) : (
            <>
              <GalleryIcon />
              {!allowImages
                ? maxFiles === 1
                  ? "Alege un clip"
                  : "Alege clipuri"
                : allowVideo
                ? "Alege poze / clipuri"
                : allowPdf
                  ? maxFiles === 1
                    ? "Alege poza sau PDF-ul"
                    : "Alege poze sau PDF"
                  : maxFiles === 1
                    ? "Alege poza"
                    : "Alege poze"}
            </>
          )}
        </button>
      </div>

      <p className="mt-2 text-xs text-ink/50">
        {allowImages && "Poze JPG/PNG/WebP până la 5 MB"}
        {allowVideo &&
          `${allowImages ? "; c" : "C"}lipuri MP4/WebM/MOV până la ${MAX_VIDEO_SECONDS} de secunde (60 MB)`}
        {allowPdf && "; PDF până la 10 MB"}. Maxim{" "}
        {maxFiles} {maxFiles === 1 ? "fișier" : "fișiere"}.
      </p>

      {error && (
        <p
          className="mt-2 rounded-lg bg-wing-red/10 px-3 py-2 text-sm text-wing-red"
          data-testid="media-error"
        >
          {error}
        </p>
      )}

      {value.length > 0 && (
        <div className="mt-3 grid grid-cols-2 gap-3 sm:grid-cols-3" data-testid="media-previews">
          {value.map((m, i) => (
            <div key={m.url} className="relative overflow-hidden rounded-xl bg-ink/5">
              {m.type === "DOC" ? (
                <a
                  href={m.url}
                  target="_blank"
                  rel="noopener noreferrer"
                  data-testid="media-doc-preview"
                  className="flex aspect-square w-full flex-col items-center justify-center gap-2 bg-white text-center text-xs font-semibold text-wing-blue"
                >
                  <DocIcon />
                  Deschide PDF-ul
                </a>
              ) : m.type === "VIDEO" ? (
                <video
                  src={m.url}
                  className="aspect-square w-full object-cover"
                  muted
                  playsInline
                  preload="metadata"
                />
              ) : (
                // eslint-disable-next-line @next/next/no-img-element
                <img src={m.url} alt="" className="aspect-square w-full object-cover" />
              )}

              {m.type === "VIDEO" && (
                <span className="pointer-events-none absolute left-2 top-2 rounded bg-ink/70 px-1.5 py-0.5 text-xs font-bold text-white">
                  VIDEO
                </span>
              )}

              <button
                type="button"
                onClick={() => onChange(value.filter((x) => x.url !== m.url))}
                aria-label="Șterge"
                data-testid="media-remove"
                className="absolute right-1.5 top-1.5 flex h-8 w-8 items-center justify-center rounded-full bg-wing-red text-sm font-bold text-white shadow"
              >
                ✕
              </button>

              {value.length > 1 && (
                <div className="absolute inset-x-1.5 bottom-1.5 flex justify-between">
                  <button
                    type="button"
                    onClick={() => move(i, -1)}
                    disabled={i === 0}
                    aria-label="Mută înainte"
                    className="flex h-8 w-8 items-center justify-center rounded-full bg-ink/70 text-white disabled:opacity-25"
                  >
                    ‹
                  </button>
                  <button
                    type="button"
                    onClick={() => move(i, 1)}
                    disabled={i === value.length - 1}
                    aria-label="Mută înapoi"
                    className="flex h-8 w-8 items-center justify-center rounded-full bg-ink/70 text-white disabled:opacity-25"
                  >
                    ›
                  </button>
                </div>
              )}
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

function DocIcon() {
  return (
    <svg width="30" height="30" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
      <path d="M14 3H7a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h10a2 2 0 0 0 2-2V8l-5-5Z" />
      <path d="M14 3v5h5" />
    </svg>
  );
}

function CameraIcon() {
  return (
    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
      <path d="M14.5 4h-5L7 7H4a2 2 0 0 0-2 2v9a2 2 0 0 0 2 2h16a2 2 0 0 0 2-2V9a2 2 0 0 0-2-2h-3l-2.5-3Z" />
      <circle cx="12" cy="13" r="3.5" />
    </svg>
  );
}

function VideoIcon() {
  return (
    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
      <rect x="2" y="6" width="14" height="12" rx="2" />
      <path d="m22 8-6 4 6 4V8Z" />
    </svg>
  );
}

function GalleryIcon() {
  return (
    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
      <rect x="3" y="3" width="18" height="18" rx="2" />
      <circle cx="8.5" cy="8.5" r="1.5" />
      <path d="m21 15-5-5L5 21" />
    </svg>
  );
}
