"use client";

import { useState } from "react";
import { useRouter } from "@/i18n/navigation";
import MediaPicker, { type PickedMedia } from "@/components/MediaPicker";

/**
 * Compunerea unui articol, in stil retea sociala: titlu, text, poze/clipuri.
 *
 * Tot ce se poate deduce se deduce automat (adresa articolului, rezumatul,
 * versiunea engleza), ca sa ramana doar trei lucruri de completat. Traducerea
 * in engleza e optionala, ascunsa sub un buton — daca nu o completezi, se
 * foloseste textul romanesc si pentru vizitatorii straini.
 */

export type ComposerMedia = PickedMedia;

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

  const [title, setTitle] = useState(initialTitle);
  const [body, setBody] = useState(initialBody);
  const [media, setMedia] = useState<ComposerMedia[]>(initialMedia);
  const [published, setPublished] = useState(initialPublished);

  const [showEn, setShowEn] = useState(Boolean(initialTitleEn || initialBodyEn));
  const [titleEn, setTitleEn] = useState(initialTitleEn);
  const [bodyEn, setBodyEn] = useState(initialBodyEn);

  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [savedSlug, setSavedSlug] = useState<string | null>(null);

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

  const canPublish = title.trim().length >= 3 && body.trim().length > 0 && !busy;

  return (
    <form
      onSubmit={publish}
      className="overflow-hidden rounded-2xl border border-ink/10 bg-white"
      data-testid="article-composer"
    >
      <input
        value={title}
        onChange={(e) => setTitle(e.target.value)}
        data-testid="composer-title"
        placeholder="Titlul articolului"
        maxLength={200}
        className="w-full border-b border-ink/10 px-4 py-4 font-display text-xl font-bold outline-none placeholder:font-sans placeholder:text-base placeholder:font-normal placeholder:text-ink/35 focus:bg-ivory-soft"
      />

      <textarea
        value={body}
        onChange={(e) => setBody(e.target.value)}
        data-testid="composer-body"
        placeholder="Scrie aici…"
        rows={9}
        className="w-full resize-y px-4 py-4 text-base leading-relaxed outline-none placeholder:text-ink/35 focus:bg-ivory-soft"
      />

      <div className="border-t border-ink/10 px-4 py-4">
        <MediaPicker value={media} onChange={setMedia} maxFiles={10} />
      </div>

      <div className="flex flex-wrap items-center gap-2 border-t border-ink/10 bg-ivory-soft px-3 py-3">
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

      {/* Traducere engleză — opțională, ascunsă implicit */}
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
