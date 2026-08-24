"use client";

import { useRef, useState } from "react";
import { useRouter } from "@/i18n/navigation";

/**
 * Compunerea unui articol, in stil retea sociala: titlu, text, poze/clipuri.
 *
 * Tot ce se poate deduce se deduce automat (adresa articolului, rezumatul,
 * versiunea engleza), ca sa ramana doar trei lucruri de completat. Traducerea
 * in engleza e optionala, ascunsa sub un buton — daca nu o completezi, se
 * foloseste textul romanesc si pentru vizitatorii straini.
 */

export type ComposerMedia = { url: string; type: "IMAGE" | "VIDEO" };

export default function ArticleComposer({
  articleId,
  initialTitle = "",
  initialBody = "",
  initialTitleEn = "",
  initialBodyEn = "",
  initialMedia = [],
  initialPublished = true,
}: {
  articleId?: string;
  initialTitle?: string;
  initialBody?: string;
  initialTitleEn?: string;
  initialBodyEn?: string;
  initialMedia?: ComposerMedia[];
  initialPublished?: boolean;
}) {
  const router = useRouter();
  const fileRef = useRef<HTMLInputElement>(null);

  const [title, setTitle] = useState(initialTitle);
  const [body, setBody] = useState(initialBody);
  const [media, setMedia] = useState<ComposerMedia[]>(initialMedia);
  const [published, setPublished] = useState(initialPublished);

  const [showEn, setShowEn] = useState(Boolean(initialTitleEn || initialBodyEn));
  const [titleEn, setTitleEn] = useState(initialTitleEn);
  const [bodyEn, setBodyEn] = useState(initialBodyEn);

  const [uploading, setUploading] = useState(false);
  const [uploadError, setUploadError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [savedSlug, setSavedSlug] = useState<string | null>(null);

  const attach = async (list: FileList | null) => {
    if (!list || list.length === 0) return;
    setUploading(true);
    setUploadError(null);
    const data = new FormData();
    for (const f of Array.from(list)) data.append("files", f);
    try {
      const res = await fetch("/api/upload", { method: "POST", body: data });
      const out = await res.json();
      if (out.ok) {
        setMedia((prev) => [...prev, ...out.files].slice(0, 10));
      } else {
        setUploadError(
          out.error === "FILE_TOO_LARGE"
            ? out.isVideo
              ? "Clipul e prea mare (maxim 60 MB)."
              : "Poza e prea mare (maxim 5 MB)."
            : out.error === "INVALID_TYPE"
              ? "Format neacceptat. Poze: JPG, PNG, WebP. Video: MP4, WebM, MOV."
              : "Încărcarea a eșuat. Încearcă din nou."
        );
      }
    } catch {
      setUploadError("Încărcarea a eșuat. Încearcă din nou.");
    } finally {
      setUploading(false);
      if (fileRef.current) fileRef.current.value = "";
    }
  };

  const move = (index: number, delta: number) => {
    setMedia((prev) => {
      const next = [...prev];
      const target = index + delta;
      if (target < 0 || target >= next.length) return prev;
      [next[index], next[target]] = [next[target], next[index]];
      return next;
    });
  };

  const publish = async (e: React.FormEvent) => {
    e.preventDefault();
    setBusy(true);
    setError(null);
    const res = await fetch("/api/admin/articles", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        id: articleId,
        title: title.trim(),
        body: body.trim(),
        titleEn: showEn ? titleEn.trim() : undefined,
        bodyEn: showEn ? bodyEn.trim() : undefined,
        media,
        published,
      }),
    });
    const out = await res.json();
    setBusy(false);
    if (out.ok) {
      setSavedSlug(out.slug);
      router.refresh();
    } else {
      setError("Verifică titlul (minim 3 caractere) și textul.");
    }
  };

  if (savedSlug) {
    return (
      <div
        className="rounded-2xl border border-green-300 bg-green-50 p-6 text-center"
        data-testid="composer-saved"
      >
        <p className="font-display text-xl font-bold text-green-800">
          {published ? "Articol publicat!" : "Salvat ca ciornă."}
        </p>
        <div className="mt-4 flex flex-col justify-center gap-2 sm:flex-row">
          {published && (
            <a
              href={`/ro/articles/${savedSlug}`}
              className="rounded-xl bg-ink px-6 py-3 font-bold text-ivory hover:bg-wing-orange"
              data-testid="composer-view"
            >
              Vezi articolul
            </a>
          )}
          <a
            href="?new=1"
            className="rounded-xl border border-ink/20 px-6 py-3 font-semibold hover:border-ink/40"
            data-testid="composer-again"
          >
            Scrie altul
          </a>
        </div>
      </div>
    );
  }

  const canPublish = title.trim().length >= 3 && body.trim().length > 0 && !busy && !uploading;

  return (
    <form
      onSubmit={publish}
      className="overflow-hidden rounded-2xl border border-ink/10 bg-white"
      data-testid="article-composer"
    >
      {/* Titlu */}
      <input
        value={title}
        onChange={(e) => setTitle(e.target.value)}
        data-testid="composer-title"
        placeholder="Titlul articolului"
        maxLength={200}
        className="w-full border-b border-ink/10 px-4 py-4 font-display text-xl font-bold outline-none placeholder:font-sans placeholder:text-base placeholder:font-normal placeholder:text-ink/35 focus:bg-ivory-soft"
      />

      {/* Text */}
      <textarea
        value={body}
        onChange={(e) => setBody(e.target.value)}
        data-testid="composer-body"
        placeholder="Scrie aici…"
        rows={9}
        className="w-full resize-y px-4 py-4 text-base leading-relaxed outline-none placeholder:text-ink/35 focus:bg-ivory-soft"
      />

      {/* Previzualizări */}
      {media.length > 0 && (
        <div className="grid grid-cols-2 gap-3 px-4 pb-4 sm:grid-cols-3" data-testid="composer-media">
          {media.map((m, i) => (
            <div key={m.url} className="group relative overflow-hidden rounded-xl bg-ink/5">
              {m.type === "VIDEO" ? (
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
                onClick={() => setMedia((prev) => prev.filter((x) => x.url !== m.url))}
                aria-label="Șterge"
                data-testid="composer-remove"
                className="absolute right-1.5 top-1.5 flex h-8 w-8 items-center justify-center rounded-full bg-wing-red text-sm font-bold text-white shadow"
              >
                ✕
              </button>

              {media.length > 1 && (
                <div className="absolute inset-x-1.5 bottom-1.5 flex justify-between">
                  <button
                    type="button"
                    onClick={() => move(i, -1)}
                    disabled={i === 0}
                    aria-label="Mută la stânga"
                    className="flex h-8 w-8 items-center justify-center rounded-full bg-ink/70 text-white disabled:opacity-25"
                  >
                    ‹
                  </button>
                  <button
                    type="button"
                    onClick={() => move(i, 1)}
                    disabled={i === media.length - 1}
                    aria-label="Mută la dreapta"
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

      {uploadError && (
        <p
          className="mx-4 mb-3 rounded-lg bg-wing-red/10 px-3 py-2 text-sm text-wing-red"
          data-testid="composer-upload-error"
        >
          {uploadError}
        </p>
      )}

      {/* Bara de acțiuni */}
      <div className="flex flex-wrap items-center gap-2 border-t border-ink/10 bg-ivory-soft px-3 py-3">
        <input
          ref={fileRef}
          type="file"
          accept="image/jpeg,image/png,image/webp,video/mp4,video/webm,video/quicktime"
          multiple
          className="hidden"
          data-testid="composer-file-input"
          onChange={(e) => attach(e.target.files)}
        />
        <button
          type="button"
          onClick={() => fileRef.current?.click()}
          disabled={uploading || media.length >= 10}
          data-testid="composer-attach"
          className="flex items-center gap-2 rounded-xl border border-ink/20 bg-white px-4 py-2.5 text-sm font-semibold hover:border-wing-blue hover:text-wing-blue disabled:opacity-50"
        >
          {uploading ? (
            "Se încarcă…"
          ) : (
            <>
              <svg
                width="18"
                height="18"
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                strokeWidth="1.8"
                strokeLinecap="round"
                strokeLinejoin="round"
                aria-hidden="true"
              >
                <rect x="3" y="3" width="18" height="18" rx="2" />
                <circle cx="8.5" cy="8.5" r="1.5" />
                <path d="m21 15-5-5L5 21" />
              </svg>
              Foto / video
            </>
          )}
        </button>

        <label className="flex cursor-pointer items-center gap-2 rounded-xl px-3 py-2.5 text-sm font-medium hover:bg-ink/5">
          <input
            type="checkbox"
            checked={published}
            onChange={(e) => setPublished(e.target.checked)}
            data-testid="composer-published"
            className="h-5 w-5 shrink-0 accent-wing-blue"
          />
          Publică acum
        </label>

        <button
          type="submit"
          disabled={!canPublish}
          data-testid="composer-submit"
          className="ml-auto rounded-xl bg-ink px-7 py-2.5 font-bold text-ivory transition-colors hover:bg-wing-orange disabled:opacity-40"
        >
          {busy ? "…" : articleId ? "Salvează" : published ? "Publică" : "Salvează ciorna"}
        </button>
      </div>

      {/* Traducere engleză — optională, ascunsă implicit */}
      <div className="border-t border-ink/10 px-4 py-3">
        {showEn ? (
          <div className="space-y-3">
            <div className="flex items-center justify-between">
              <p className="text-sm font-semibold">Traducere în engleză (opțional)</p>
              <button
                type="button"
                onClick={() => setShowEn(false)}
                className="rounded-lg px-3 py-1.5 text-sm text-ink/60 hover:bg-ink/5"
              >
                Ascunde
              </button>
            </div>
            <input
              value={titleEn}
              onChange={(e) => setTitleEn(e.target.value)}
              data-testid="composer-title-en"
              placeholder="Title in English"
              className="w-full rounded-xl border border-ink/20 bg-ivory-soft px-4 py-2.5 text-sm outline-none focus:border-wing-blue"
            />
            <textarea
              value={bodyEn}
              onChange={(e) => setBodyEn(e.target.value)}
              data-testid="composer-body-en"
              placeholder="Text in English"
              rows={5}
              className="w-full rounded-xl border border-ink/20 bg-ivory-soft px-4 py-2.5 text-sm outline-none focus:border-wing-blue"
            />
          </div>
        ) : (
          <button
            type="button"
            onClick={() => setShowEn(true)}
            data-testid="composer-add-en"
            className="text-sm text-ink/55 hover:text-wing-blue"
          >
            + Adaugă traducere în engleză{" "}
            <span className="text-ink/40">(altfel apare textul în română)</span>
          </button>
        )}
      </div>

      {error && (
        <p
          className="mx-4 mb-4 rounded-lg bg-wing-red/10 px-3 py-2 text-sm text-wing-red"
          data-testid="composer-error"
        >
          {error}
        </p>
      )}
    </form>
  );
}
