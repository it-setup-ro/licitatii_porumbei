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
  /** marcat cu * si oprit de browser daca ramane gol */
  required?: boolean;
  /** curata textul in forma de slug chiar in timp ce se scrie */
  slugify?: boolean;
};

/**
 * „Concursul Daniel 2026" -> „concursul-daniel-2026".
 *
 * Slug-ul are o regula stricta pe server (doar litere mici, cifre, liniuțe).
 * In loc sa refuzam dupa salvare, corectam din mers: nimeni nu trebuie sa
 * stie ce e un slug ca sa poata face un concurs.
 */
function toSlug(text: string): string {
  return text
    .normalize("NFD")
    .replace(/[̀-ͯ]/g, "") // scoate diacriticele: ă -> a
    .toLowerCase()
    .replace(/[^a-z0-9-]+/g, "-")
    .replace(/-{2,}/g, "-")
    .replace(/^-/, "");
}

export default function RecordEditor({
  endpoint,
  fields,
  initial,
  title,
  help,
  onSavedRedirect,
}: {
  endpoint: string;
  fields: FieldDef[];
  initial: Record<string, unknown>;
  title: string;
  /** doua-trei randuri despre ce se completeaza aici si unde se vede rezultatul */
  help?: React.ReactNode;
  onSavedRedirect?: string;
}) {
  const router = useRouter();
  const [values, setValues] = useState<Record<string, unknown>>(initial);
  const [busy, setBusy] = useState(false);
  const [saved, setSaved] = useState(false);
  const [error, setError] = useState<string | null>(null);
  /** camp -> ce e gresit la el, venit de la server */
  const [fieldErrors, setFieldErrors] = useState<Record<string, string>>({});

  const set = (key: string, value: unknown) => {
    setValues((v) => ({ ...v, [key]: value }));
    setSaved(false);
    // eroarea de pe camp dispare de indata ce omul umbla la el
    setFieldErrors((e) => {
      if (!e[key]) return e;
      const next = { ...e };
      delete next[key];
      return next;
    });
  };

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    setBusy(true);
    setError(null);
    setFieldErrors({});

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
    } else if (data.fields && typeof data.fields === "object") {
      // serverul spune exact ce campuri sunt gresite si de ce
      const errs = data.fields as Record<string, string>;
      setFieldErrors(errs);
      const nume = Object.keys(errs)
        .map((k) => fields.find((f) => f.key === k)?.label ?? k)
        .join(", ");
      setError(`Verifică: ${nume}. Explicația e scrisă sub fiecare câmp.`);
      // ducem omul la primul camp cu problema — formularul e lung
      const first = Object.keys(errs)[0];
      document
        .querySelector(`[data-testid="field-${first}"]`)
        ?.scrollIntoView({ behavior: "smooth", block: "center" });
    } else {
      setError(
        data.error === "SLUG_TAKEN"
          ? "Identificatorul (slug) este deja folosit. Alege altul."
          : "Datele nu sunt valide. Verifică câmpurile."
      );
    }
  };

  const inputBase =
    "mt-1 w-full rounded-xl border bg-ivory-soft px-3 py-2 text-sm outline-none focus:border-wing-blue";
  /** campul gresit se vede si fara sa citesti: chenar rosu */
  const inputFor = (key: string) =>
    `${inputBase} ${fieldErrors[key] ? "border-wing-red" : "border-ink/20"}`;

  return (
    <form onSubmit={submit} className="space-y-4" data-testid="record-editor">
      <h2 className="font-display text-xl font-bold">{title}</h2>

      {help && (
        <div
          className="rounded-2xl border border-wing-blue/25 bg-wing-blue/5 p-4 text-sm leading-relaxed text-ink/80"
          data-testid="editor-help"
        >
          {help}
        </div>
      )}

      {fields.some((f) => f.required) && (
        <p className="text-sm text-ink/60" data-testid="editor-required-note">
          Câmpurile cu <span className="font-bold text-wing-red">*</span> sunt obligatorii.
          Restul se pot completa mai târziu.
        </p>
      )}

      <div className="grid gap-4 rounded-2xl border border-ink/10 bg-white p-5 sm:grid-cols-2">
        {fields.map((f) => (
          <div key={f.key} className={f.full || f.type === "textarea" ? "sm:col-span-2" : ""}>
            <label className="text-sm font-medium" htmlFor={`f-${f.key}`}>
              {f.label}
              {f.required && (
                <span className="font-bold text-wing-red" aria-hidden="true">
                  {" "}
                  *
                </span>
              )}
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
                required={f.required}
                value={String(values[f.key] ?? "")}
                onChange={(e) => set(f.key, e.target.value)}
                className={inputFor(f.key)}
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
                required={f.required}
                rows={f.rows ?? 6}
                value={String(values[f.key] ?? "")}
                onChange={(e) => set(f.key, e.target.value)}
                className={inputFor(f.key)}
              />
            ) : (
              <input
                id={`f-${f.key}`}
                data-testid={`field-${f.key}`}
                required={f.required}
                type={
                  f.type === "number" || f.type === "money"
                    ? "number"
                    : f.type === "datetime"
                      ? "datetime-local"
                      : "text"
                }
                step={f.type === "money" ? "0.01" : undefined}
                value={String(values[f.key] ?? "")}
                onChange={(e) => set(f.key, f.slugify ? toSlug(e.target.value) : e.target.value)}
                className={inputFor(f.key)}
              />
            )}
            {fieldErrors[f.key] && (
              <p
                className="mt-1 text-sm font-semibold text-wing-red"
                data-testid={`field-error-${f.key}`}
              >
                {fieldErrors[f.key]}
              </p>
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
