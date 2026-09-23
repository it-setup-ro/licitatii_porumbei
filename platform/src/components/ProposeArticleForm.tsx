"use client";

import { useState } from "react";
import { useTranslations } from "next-intl";
import MediaPicker, { type PickedMedia } from "@/components/MediaPicker";

/**
 * Crescătorul își scrie povestea, adminul o publică.
 *
 * Formularul e simplu dinadins: titlu, text, poze. Traducerea, rubrica și
 * legătura cu crescătorul le pune administratorul când citește propunerea —
 * omul care crește porumbei nu trebuie să știe ce e un slug.
 */
export default function ProposeArticleForm() {
  const t = useTranslations("propose");
  const [titlu, setTitlu] = useState("");
  const [text, setText] = useState("");
  const [media, setMedia] = useState<PickedMedia[]>([]);
  const [busy, setBusy] = useState(false);
  const [gata, setGata] = useState(false);
  const [erori, setErori] = useState<Record<string, string>>({});
  const [eroare, setEroare] = useState<string | null>(null);

  const trimite = async (e: React.FormEvent) => {
    e.preventDefault();
    setBusy(true);
    setEroare(null);
    setErori({});
    try {
      const res = await fetch("/api/articles/propose", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          title: titlu,
          body: text,
          media: media.map((m) => ({ url: m.url, type: m.type })),
        }),
      });
      const body = await res.json();
      if (body.ok) {
        setGata(true);
        setTitlu("");
        setText("");
        setMedia([]);
      } else if (body.fields) {
        setErori(body.fields);
      } else if (body.error === "RATE_LIMITED") {
        setEroare(t("tooMany"));
      } else {
        setEroare(t("failed"));
      }
    } catch {
      setEroare(t("failed"));
    } finally {
      setBusy(false);
    }
  };

  if (gata) {
    return (
      <div
        className="rounded-2xl border border-wing-blue/30 bg-wing-blue/5 p-6"
        data-testid="propose-success"
      >
        <h2 className="font-display text-xl font-bold">{t("thanksTitle")}</h2>
        <p className="mt-2 text-ink/70">{t("thanksText")}</p>
        <button
          type="button"
          className="mt-4 rounded-xl border border-ink/20 px-5 py-2.5 text-sm font-semibold hover:border-wing-blue"
          onClick={() => setGata(false)}
          data-testid="propose-again"
        >
          {t("again")}
        </button>
      </div>
    );
  }

  const camp = "w-full rounded-xl border border-ink/20 px-4 py-3";

  return (
    <form onSubmit={trimite} className="space-y-5" data-testid="propose-form">
      <label className="block">
        <span className="text-sm font-semibold">{t("titleLabel")}</span>
        <input
          className={camp}
          value={titlu}
          onChange={(e) => setTitlu(e.target.value)}
          placeholder={t("titlePlaceholder")}
          data-testid="propose-title"
        />
        {erori.title && (
          <span className="mt-1 block text-sm font-semibold text-wing-red" data-testid="propose-title-error">
            {erori.title}
          </span>
        )}
      </label>

      <label className="block">
        <span className="text-sm font-semibold">{t("bodyLabel")}</span>
        <textarea
          className={camp}
          rows={12}
          value={text}
          onChange={(e) => setText(e.target.value)}
          placeholder={t("bodyPlaceholder")}
          data-testid="propose-body"
        />
        <span className="mt-1 block text-xs text-ink/50">{t("bodyHint")}</span>
        {erori.body && (
          <span className="mt-1 block text-sm font-semibold text-wing-red" data-testid="propose-body-error">
            {erori.body}
          </span>
        )}
      </label>

      <MediaPicker value={media} onChange={setMedia} maxFiles={6} label={t("mediaLabel")} />

      {eroare && (
        <p className="rounded-xl bg-wing-red/10 px-4 py-3 text-sm font-semibold text-wing-red" data-testid="propose-error">
          {eroare}
        </p>
      )}

      <button
        type="submit"
        disabled={busy}
        className="rounded-xl bg-ink px-6 py-3 font-bold text-ivory hover:bg-wing-orange disabled:opacity-50"
        data-testid="propose-submit"
      >
        {busy ? t("sending") : t("submit")}
      </button>
    </form>
  );
}
