"use client";

import { useEffect, useState } from "react";

/**
 * Comutatorul Grilă / Listă de pe pagina licitației, ca la PIPA.
 *
 * Nu randează el porumbeii — doar pune `data-view` pe container, iar cele două
 * forme, grila și lista, se arată sau se ascund din CSS. Așa cardurile rămân
 * randate pe server, cu prețurile și traducerile lor. Alegerea se ține minte în
 * browser, pentru următoarea vizită.
 */
export default function ViewToggle({
  labels,
  children,
}: {
  labels: { grid: string; list: string };
  children: React.ReactNode;
}) {
  const [view, setView] = useState<"grid" | "list">("grid");

  useEffect(() => {
    try {
      const saved = localStorage.getItem("sale-view");
      if (saved === "list" || saved === "grid") {
        // se citește după montare: pe server nu există localStorage
        // eslint-disable-next-line react-hooks/set-state-in-effect
        setView(saved);
      }
    } catch {
      // stocare blocată — rămâne grila
    }
  }, []);

  const choose = (v: "grid" | "list") => {
    setView(v);
    try {
      localStorage.setItem("sale-view", v);
    } catch {
      // stocare blocată — alegerea ține doar până la reîncărcare
    }
  };

  const btn = (v: "grid" | "list", label: string) => (
    <button
      type="button"
      onClick={() => choose(v)}
      aria-pressed={view === v}
      data-testid={`view-${v}`}
      className={`rounded-full px-4 py-1.5 text-sm font-semibold ${
        view === v ? "bg-ink text-ivory" : "text-ink/70 hover:bg-ink/5"
      }`}
    >
      {label}
    </button>
  );

  return (
    <div data-view={view} className="group" data-testid="sale-view">
      <div className="mb-4 flex justify-end">
        <div className="flex gap-1 rounded-full border border-ink/15 bg-white p-1">
          {btn("grid", labels.grid)}
          {btn("list", labels.list)}
        </div>
      </div>
      {children}
    </div>
  );
}
