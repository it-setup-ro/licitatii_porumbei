"use client";

import { useLocale } from "next-intl";
import { TRAIT_GROUPS, type PigeonTraits } from "@/lib/pigeon-traits";

/**
 * Completarea caracteristicilor din fisa de tip pipa.
 *
 * Toate sunt optionale si pornesc pe „—": nimeni nu completeaza douazeci de
 * randuri la fiecare porumbel, iar un camp lasat gol pur si simplu nu apare pe
 * pagina lotului.
 *
 * Campurile cu mai multe raspunsuri (specializarea la distante) sunt bife, nu
 * liste derulante — un porumbel poate fi si de demifond, si de fond.
 */

export default function TraitsEditor({
  value,
  onChange,
}: {
  value: PigeonTraits;
  onChange: (next: PigeonTraits) => void;
}) {
  const locale = useLocale();
  const lang = locale === "en" ? "en" : "ro";

  const setOne = (key: string, v: string) => {
    const next = { ...value };
    if (v === "") delete next[key];
    else next[key] = v;
    onChange(next);
  };

  const toggleMany = (key: string, v: string, on: boolean) => {
    const current = Array.isArray(value[key]) ? (value[key] as string[]) : [];
    const picked = on ? [...current, v] : current.filter((x) => x !== v);
    const next = { ...value };
    if (picked.length === 0) delete next[key];
    else next[key] = picked;
    onChange(next);
  };

  const input =
    "mt-1 w-full rounded-xl border border-ink/20 bg-ivory-soft px-3 py-2.5 text-sm outline-none focus:border-wing-blue";

  return (
    <div className="space-y-5" data-testid="traits-editor">
      {TRAIT_GROUPS.map((group) => (
        <div key={group.key}>
          <p className="mb-2 text-sm font-bold">{group[lang]}</p>
          <div className="grid gap-3 sm:grid-cols-2">
            {group.fields.map((f) =>
              f.multi ? (
                <div key={f.key} className="sm:col-span-2">
                  <p className="text-sm font-medium">{f[lang]}</p>
                  <div className="mt-1 flex flex-wrap gap-x-5 gap-y-2">
                    {f.options.map((o) => {
                      const on =
                        Array.isArray(value[f.key]) && (value[f.key] as string[]).includes(o.value);
                      return (
                        <label key={o.value} className="flex items-center gap-2 text-sm">
                          <input
                            type="checkbox"
                            className="h-5 w-5 shrink-0 accent-wing-blue"
                            checked={on}
                            onChange={(e) => toggleMany(f.key, o.value, e.target.checked)}
                            data-testid={`trait-${f.key}-${o.value}`}
                          />
                          {o[lang]}
                        </label>
                      );
                    })}
                  </div>
                </div>
              ) : (
                <label key={f.key} className="block text-sm">
                  <span className="font-medium">{f[lang]}</span>
                  <select
                    value={typeof value[f.key] === "string" ? (value[f.key] as string) : ""}
                    onChange={(e) => setOne(f.key, e.target.value)}
                    data-testid={`trait-${f.key}`}
                    className={input}
                  >
                    <option value="">—</option>
                    {f.options.map((o) => (
                      <option key={o.value} value={o.value}>
                        {o[lang]}
                      </option>
                    ))}
                  </select>
                </label>
              )
            )}
          </div>
        </div>
      ))}
    </div>
  );
}
