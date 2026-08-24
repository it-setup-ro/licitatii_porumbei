"use client";

import { useState } from "react";
import { useRouter } from "@/i18n/navigation";
import MediaPicker, { type PickedMedia } from "@/components/MediaPicker";

/**
 * Editor generic pentru înregistrările din admin (produse, articole, concursuri,
 * pagini de conținut). Un singur formular configurabil prin câmpuri, ca să nu
 * dublăm aceeași logică de salvare de patru ori.
 */

export type FieldDef = {
  key: string;
  label: string;
  /** "image" = alegere de poza cu acelasi selector ca la articole/loturi */
  type: "text" | "textarea" | "number" | "money" | "boolean" | "select" | "datetime" | "image";
  options?: { value: string; label: string }[];
  hint?: string;
  rows?: number;
  full?: boolean;
};

export default function RecordEditor({
  endpoint,
  fields,
  initial,
  title,
  onSavedRedirect,
}: {
  endpoint: string;
  fields: FieldDef[];
  initial: Record<string, unknown>;
  title: string;
  onSavedRedirect?: string;
}) {
  const router = useRouter();
  const [values, setValues] = useState<Record<string, unknown>>(initial);
  const [busy, setBusy] = useState(false);
  const [saved, setSaved] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const set = (key: string, value: unknown) => {
    setValues((v) => ({ ...v, [key]: value }));
    setSaved(false);
  };

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    setBusy(true);
    setError(null);

    // sumele se trimit în cenți; datele ca ISO
    const payload: Record<string, unknown> = { ...values };
    for (const f of fields) {
      if (f.type === "money") payload[f.key] = Math.round(Number(values[f.key] ?? 0) * 100);
      if (f.type === "number") payload[f.key] = Number(values[f.key] ?? 0);
      if (f.type === "datetime" && values[f.key])
        payload[f.key] = new Date(String(values[f.key])).toISOString();
    }

    const res = await fetch(endpoint, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(payload),
    });
    const data = await res.json();
    setBusy(false);
    if (data.ok) {
      setSaved(true);
      router.refresh();
      if (onSavedRedirect) router.push(onSavedRedirect);
    } else {
      setError(
        data.error === "SLUG_TAKEN"
          ? "Identificatorul (slug) este deja folosit."
          : data.error === "END_BEFORE_START"
            ? "Data de final trebuie să fie după cea de început."
            : "Datele nu sunt valide. Verifică câmpurile."
      );
    }
  };

  const input =
    "mt-1 w-full rounded-xl border border-ink/20 bg-ivory-soft px-3 py-2 text-sm outline-none focus:border-wing-blue";

  return (
    <form onSubmit={submit} className="space-y-4" data-testid="record-editor">
      <h2 className="font-display text-xl font-bold">{title}</h2>

      <div className="grid gap-4 rounded-2xl border border-ink/10 bg-white p-5 sm:grid-cols-2">
        {fields.map((f) => (
          <div key={f.key} className={f.full || f.type === "textarea" ? "sm:col-span-2" : ""}>
            <label className="text-sm font-medium" htmlFor={`f-${f.key}`}>
              {f.label}
            </label>

            {f.type === "image" ? (
              <div className="mt-1">
                <MediaPicker
                  value={
                    values[f.key]
                      ? ([{ url: String(values[f.key]), type: "IMAGE" }] as PickedMedia[])
                      : []
                  }
                  onChange={(next) => set(f.key, next[0]?.url ?? "")}
                  maxFiles={1}
                  allowVideo={false}
                />
              </div>
            ) : f.type === "boolean" ? (
              <div className="mt-1">
                <button
                  type="button"
                  id={`f-${f.key}`}
                  data-testid={`field-${f.key}`}
                  role="switch"
                  aria-checked={Boolean(values[f.key])}
                  onClick={() => set(f.key, !values[f.key])}
                  className={`h-8 w-14 rounded-full p-1 transition-colors ${
                    values[f.key] ? "bg-wing-blue" : "bg-ink/20"
                  }`}
                >
                  <span
                    className={`block h-6 w-6 rounded-full bg-white transition-transform ${
                      values[f.key] ? "translate-x-6" : ""
                    }`}
                  />
                </button>
              </div>
            ) : f.type === "select" ? (
              <select
                id={`f-${f.key}`}
                data-testid={`field-${f.key}`}
                value={String(values[f.key] ?? "")}
                onChange={(e) => set(f.key, e.target.value)}
                className={input}
              >
                {f.options!.map((o) => (
                  <option key={o.value} value={o.value}>
                    {o.label}
                  </option>
                ))}
              </select>
            ) : f.type === "textarea" ? (
              <textarea
                id={`f-${f.key}`}
                data-testid={`field-${f.key}`}
                rows={f.rows ?? 6}
                value={String(values[f.key] ?? "")}
                onChange={(e) => set(f.key, e.target.value)}
                className={input}
              />
            ) : (
              <input
                id={`f-${f.key}`}
                data-testid={`field-${f.key}`}
                type={
                  f.type === "number" || f.type === "money"
                    ? "number"
                    : f.type === "datetime"
                      ? "datetime-local"
                      : "text"
                }
                step={f.type === "money" ? "0.01" : undefined}
                value={String(values[f.key] ?? "")}
                onChange={(e) => set(f.key, e.target.value)}
                className={input}
              />
            )}
            {f.hint && <p className="mt-1 text-xs text-ink/50">{f.hint}</p>}
          </div>
        ))}
      </div>

      {error && (
        <p className="rounded-lg bg-wing-red/10 px-3 py-2 text-sm text-wing-red" data-testid="editor-error">
          {error}
        </p>
      )}

      <div className="flex items-center gap-4">
        <button
          type="submit"
          disabled={busy}
          data-testid="editor-save"
          className="rounded-xl bg-ink px-8 py-2.5 font-bold text-ivory hover:bg-wing-orange disabled:opacity-40"
        >
          {busy ? "…" : "Salvează"}
        </button>
        {saved && (
          <p className="text-sm font-semibold text-green-700" data-testid="editor-saved">
            ✓ Salvat
          </p>
        )}
      </div>
    </form>
  );
}
