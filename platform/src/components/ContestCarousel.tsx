"use client";

import { useEffect, useState } from "react";
import { Link } from "@/i18n/navigation";
import ContestBanner from "./ContestBanner";

type BannerProps = React.ComponentProps<typeof ContestBanner>;

/**
 * Mai multe concursuri în desfășurare, unul după altul.
 *
 * Clientul: „mai multe concursuri active să se ruleze" — banda se schimbă
 * singură la câteva secunde, iar clicul duce la concursul afișat atunci.
 * Punctele de jos opresc rotirea: dacă omul alege singur un concurs, nu i-l
 * mai schimbăm sub ochi.
 */
export default function ContestCarousel({
  contests,
  locale,
  labels,
  allLabel,
}: {
  contests: BannerProps["contest"][];
  locale: string;
  labels: BannerProps["labels"];
  allLabel: string;
}) {
  const [i, setI] = useState(0);
  const [oprit, setOprit] = useState(false);

  useEffect(() => {
    if (contests.length < 2 || oprit) return;
    const t = setInterval(() => setI((v) => (v + 1) % contests.length), 7000);
    return () => clearInterval(t);
  }, [contests.length, oprit]);

  const curent = contests[Math.min(i, contests.length - 1)];
  if (!curent) return null;

  return (
    <div data-testid="contest-carousel">
      <ContestBanner contest={curent} locale={locale} labels={labels} />

      <div className="mx-auto -mt-4 flex max-w-6xl flex-wrap items-center justify-between gap-3 px-4 pb-6">
        {contests.length > 1 ? (
          <div className="flex items-center gap-2" data-testid="contest-dots">
            {contests.map((c, idx) => (
              <button
                key={c.slug}
                type="button"
                onClick={() => {
                  setI(idx);
                  setOprit(true);
                }}
                aria-label={c.title}
                aria-current={idx === i}
                data-testid="contest-dot"
                className={`h-2.5 rounded-full transition-all ${
                  idx === i ? "w-7 bg-wing-orange" : "w-2.5 bg-ink/25 hover:bg-ink/50"
                }`}
              />
            ))}
          </div>
        ) : (
          <span />
        )}
        <Link
          href="/contests"
          data-testid="contests-all"
          className="font-semibold text-wing-blue hover:underline"
        >
          {allLabel} →
        </Link>
      </div>
    </div>
  );
}
