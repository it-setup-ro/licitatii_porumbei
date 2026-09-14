import { Link } from "@/i18n/navigation";
import { formatDistance } from "@/lib/distance";

/**
 * Banda concursului de pe prima pagina, dupa macheta clientului: trofeu,
 * destinatia scrisa mare, distanta cu steagul tarii, sloganul, rubricile de
 * imbarcare/lansare/meteo/primul sosit si butonul auriu.
 *
 * Toate rubricile sunt optionale: apar doar cele completate in administrare.
 * O banda fara date nu inventeaza nimic — raman titlul si butonul.
 */

export type BannerContest = {
  slug: string;
  title: string;
  destination: string | null;
  distanceKm: number | null;
  distanceMaxKm: number | null;
  countryCode: string | null;
  boardingAt: Date | null;
  boardingPlace: string | null;
  releaseAt: Date | null;
  weatherUrl: string | null;
  slogan: string | null;
  status: string;
};

/**
 * "DE" -> "Germania". In macheta e un stegulet, dar emoji-ul de steag nu are
 * desen pe Windows: acolo apare literalmente „DE". Numele tarii se vede la fel
 * peste tot si se si traduce.
 */
function countryName(code: string | null, locale: string): string {
  if (!code || !/^[A-Za-z]{2}$/.test(code)) return "";
  try {
    return new Intl.DisplayNames([locale], { type: "region" }).of(code.toUpperCase()) ?? "";
  } catch {
    return code.toUpperCase();
  }
}

export default function ContestBanner({
  contest,
  locale,
  labels,
}: {
  contest: BannerContest;
  locale: string;
  labels: {
    boarding: string;
    release: string;
    weather: string;
    weatherSub: string;
    firstHome: string;
    soon: string;
    results: string;
    cta: string;
    at: string;
  };
}) {
  const loc = locale === "en" ? "en-GB" : "ro-RO";
  const zi = (d: Date) =>
    new Intl.DateTimeFormat(loc, { day: "numeric", month: "long", year: "numeric" }).format(d);
  const ora = (d: Date) =>
    new Intl.DateTimeFormat(loc, { hour: "2-digit", minute: "2-digit" }).format(d);

  const cells: { key: string; icon: React.ReactNode; label: string; lines: React.ReactNode[] }[] =
    [];

  if (contest.boardingAt) {
    cells.push({
      key: "boarding",
      icon: <IconTruck />,
      label: labels.boarding,
      lines: [zi(contest.boardingAt), contest.boardingPlace].filter(Boolean),
    });
  }
  if (contest.releaseAt) {
    cells.push({
      key: "release",
      icon: <IconDove />,
      label: labels.release,
      lines: [zi(contest.releaseAt), `${labels.at} ${ora(contest.releaseAt)}`],
    });
  }
  if (contest.weatherUrl) {
    cells.push({
      key: "weather",
      icon: <IconWeather />,
      label: labels.weather,
      lines: [
        <a
          key="w"
          href={contest.weatherUrl}
          target="_blank"
          rel="noopener noreferrer"
          className="underline decoration-wing-yellow/40 underline-offset-2 hover:text-wing-yellow"
        >
          {labels.weatherSub}
        </a>,
      ],
    });
  }
  cells.push({
    key: "first",
    icon: <IconCup />,
    label: labels.firstHome,
    lines: [contest.status === "FINISHED" ? labels.results : labels.soon],
  });

  return (
    <section className="mx-auto max-w-6xl px-4 py-10" data-testid="contest-banner">
      <div className="relative isolate overflow-hidden rounded-3xl border border-wing-yellow/25 bg-ink text-white shadow-xl">
        {/* Decorul din banda desenata de client: cetatea si porumbeii, in dreapta,
            sub buton. Restul benzii ramane bleumarin plin, ca textul sa se citeasca. */}
        <div
          className="absolute inset-y-0 right-0 -z-10 hidden w-[30%] bg-cover bg-center lg:block [mask-image:linear-gradient(to_right,transparent,black_45%)]"
          style={{ backgroundImage: "url(/pigeons/banda-cetate.jpg)" }}
          aria-hidden="true"
        />
        <div
          className="absolute inset-0 -z-10 bg-gradient-to-r from-ink via-ink to-ink/55"
          aria-hidden="true"
        />

        <div className="flex flex-col gap-6 p-6 lg:flex-row lg:items-center lg:gap-5 lg:p-6">
          {/* Trofeu + titlu */}
          <div className="flex min-w-0 shrink-0 items-center gap-4 lg:max-w-[36%] lg:gap-5 lg:pr-2">
            <IconTrophy />
            <div className="min-w-0">
              <p className="font-display text-base font-bold uppercase leading-tight tracking-wide">
                {contest.title}
              </p>
              {contest.destination && (
                <p
                  className="font-display break-words text-3xl font-bold uppercase leading-none text-wing-yellow"
                  data-testid="contest-destination"
                >
                  {contest.destination}
                </p>
              )}
              {contest.distanceKm ? (
                <p className="font-display mt-1.5 flex flex-wrap items-center gap-2 text-2xl font-bold leading-none">
                  {formatDistance(contest.distanceKm, contest.distanceMaxKm, loc)} KM
                  {contest.countryCode && (
                    <span className="rounded-full border border-wing-yellow/40 px-2.5 py-1 text-xs font-semibold uppercase tracking-wider text-wing-yellow">
                      {countryName(contest.countryCode, loc)}
                    </span>
                  )}
                </p>
              ) : null}
              {contest.slogan && (
                <p className="mt-2 text-[11px] font-semibold uppercase tracking-[0.18em] text-ivory/60">
                  {contest.slogan}
                </p>
              )}
            </div>
          </div>

          {/* Rubrici */}
          <div className="flex flex-1 flex-wrap items-center justify-center gap-y-5 border-y border-white/10 py-5 lg:flex-nowrap lg:border-x lg:border-y-0 lg:px-2 lg:py-2">
            {cells.map((c) => (
              <div
                key={c.key}
                className="min-w-[7.5rem] flex-1 px-3 text-center lg:min-w-0 lg:px-2.5 lg:[&+&]:border-l lg:[&+&]:border-white/10"
                data-testid="contest-cell"
              >
                <span className="flex justify-center text-wing-yellow">{c.icon}</span>
                <p className="font-display mt-1.5 font-bold leading-tight">{c.label}</p>
                {c.lines.map((l, i) => (
                  <p key={i} className="text-sm leading-snug text-ivory/70">
                    {l}
                  </p>
                ))}
              </div>
            ))}
          </div>

          {/* Buton */}
          <div className="shrink-0 text-center">
            <Link
              href={`/contests/${contest.slug}`}
              data-testid="contest-cta"
              className="font-display inline-block rounded-full bg-gradient-to-b from-wing-yellow to-wing-orange px-7 py-3.5 font-bold text-ink shadow-lg transition-opacity hover:opacity-90 lg:px-5 lg:py-3 lg:text-sm"
            >
              {labels.cta} →
            </Link>
          </div>
        </div>
      </div>
    </section>
  );
}

/* Pictograme, desenate aici: aurii, in linia machetei. */

function IconTrophy() {
  return (
    <svg
      width="62"
      height="62"
      viewBox="0 0 24 24"
      fill="none"
      className="shrink-0 text-wing-yellow"
      aria-hidden="true"
    >
      <path
        d="M7 4h10v5a5 5 0 0 1-10 0V4Z"
        fill="currentColor"
        stroke="currentColor"
        strokeWidth="1.2"
        strokeLinejoin="round"
      />
      <path
        d="M7 5H4.5v1.5A3.5 3.5 0 0 0 8 10M17 5h2.5v1.5A3.5 3.5 0 0 1 16 10"
        stroke="currentColor"
        strokeWidth="1.4"
        strokeLinecap="round"
      />
      <path d="M12 14v3" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" />
      <path d="M8.5 20h7l-.6-3h-5.8l-.6 3Z" fill="currentColor" />
      <path d="M7 20.5h10" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" />
    </svg>
  );
}

function IconTruck() {
  return (
    <svg
      width="26"
      height="26"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.7"
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden="true"
    >
      <path d="M3 16V6h11v10" />
      <path d="M14 9h4l3 3.5V16h-7" />
      <circle cx="7.5" cy="17.5" r="1.8" />
      <circle cx="17" cy="17.5" r="1.8" />
    </svg>
  );
}

function IconDove() {
  return (
    <svg width="26" height="26" viewBox="0 0 24 24" fill="currentColor" aria-hidden="true">
      <path d="M2 14c2.6.5 4.7-.2 6.3-1.7 1.3-1.2 2.3-2.8 3.2-4.4.8-1.4 1.7-2.7 3-3.4 1-.6 2.2-.8 3.5-.5-.5.9-1.3 1.5-2 2.1.9.2 1.8.1 2.7-.2-.5 1-1.4 1.7-2.4 2.1 1 .3 2 .2 3-.2-1 1.9-2.6 3-4.4 3.6.4.9.4 1.9 0 2.9-.6-.7-1.3-1.2-2.2-1.5-1.2 1.6-2.8 2.9-4.7 3.7-2.2.9-4.5 1-7 .4l1-2.9Z" />
    </svg>
  );
}

function IconWeather() {
  return (
    <svg
      width="26"
      height="26"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.7"
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden="true"
    >
      <circle cx="8" cy="8" r="3" />
      <path d="M8 2v1.5M8 12.5V14M2 8h1.5M12.5 8H14M4 4l1 1M11 11l1 1M12 4l-1 1M5 11l-1 1" />
      <path
        d="M11 19a3.5 3.5 0 0 1 .4-7 5 5 0 0 1 9.4 1.6A2.9 2.9 0 0 1 20 19H11Z"
        fill="currentColor"
        stroke="none"
      />
    </svg>
  );
}

function IconCup() {
  return (
    <svg width="26" height="26" viewBox="0 0 24 24" fill="currentColor" aria-hidden="true">
      <path d="M8 3h8v5a4 4 0 0 1-8 0V3Z" />
      <path d="M11 12h2v4h-2z" />
      <path d="M8 19h8l-.5-2h-7L8 19Z" />
    </svg>
  );
}
