"use client";

import { useState } from "react";

/**
 * Un text lung arătat pe scurt, cu „citește mai mult".
 *
 * Clientul: „vreau povestea să fie în text cu câteva propoziții care îl poți
 * mări". Nu tăiem textul la un număr de caractere — l-am putea rupe în mijlocul
 * unei idei; îi limităm înălțimea și îl stingem în alb la bază, iar butonul îl
 * desface întreg. Fără JavaScript pornit, textul rămâne limitat, dar întreg în
 * pagină pentru cititoarele de ecran și pentru motoarele de căutare.
 */
export default function ExpandableText({
  children,
  moreLabel,
  lessLabel,
  testid,
}: {
  children: React.ReactNode;
  moreLabel: string;
  lessLabel: string;
  testid?: string;
}) {
  const [desfacut, setDesfacut] = useState(false);

  return (
    <div data-testid={testid}>
      <div className={desfacut ? "" : "relative max-h-32 overflow-hidden"}>
        {children}
        {!desfacut && (
          <div
            className="absolute inset-x-0 bottom-0 h-12 bg-gradient-to-t from-white to-transparent"
            aria-hidden="true"
          />
        )}
      </div>
      <button
        type="button"
        onClick={() => setDesfacut((v) => !v)}
        aria-expanded={desfacut}
        data-testid={testid ? `${testid}-toggle` : undefined}
        className="mt-2 text-sm font-semibold text-wing-blue hover:underline"
      >
        {desfacut ? lessLabel : moreLabel} {desfacut ? "↑" : "→"}
      </button>
    </div>
  );
}
