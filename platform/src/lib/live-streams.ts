/**
 * Ce trebuie oprit frumos când se oprește serviciul.
 *
 * Fluxurile live (SSE) deschise de telefoanele din licitație și ceasul
 * sweeperului țineau procesul în viață: systemd aștepta un minut și jumătate,
 * apoi îl omora cu forța, iar în jurnal rămâneau excepții „Controller is
 * already closed". Pentru cumpărători, asta însemna un minut și jumătate de
 * site picat la fiecare publicare — tocmai în minutele de licitație.
 *
 * Evidența stă în `globalThis`: în dezvoltare, Next reîncarcă modulele la
 * fiecare salvare și altfel am pierde-o.
 */

type Inchidere = () => void;

const g = globalThis as unknown as {
  __liveStreams?: Set<Inchidere>;
  __laOprire?: Set<Inchidere>;
  __opriremHooked?: boolean;
};

function registru(): Set<Inchidere> {
  if (!g.__liveStreams) g.__liveStreams = new Set();
  return g.__liveStreams;
}

/** Ține minte un flux live deschis. Întoarce funcția de uitare. */
export function registerLiveStream(inchide: Inchidere): () => void {
  const r = registru();
  r.add(inchide);
  return () => r.delete(inchide);
}

/** Închide toate fluxurile deschise. Întoarce câte au fost. */
export function closeLiveStreams(): number {
  const r = registru();
  const cate = r.size;
  for (const inchide of [...r]) {
    try {
      inchide();
    } catch {
      // un flux care nu se mai poate închide nu-i oprește pe ceilalți
    }
  }
  r.clear();
  return cate;
}

/** Alte lucruri de oprit la final (ceasuri, abonamente). */
export function laOprire(treaba: Inchidere): void {
  if (!g.__laOprire) g.__laOprire = new Set();
  g.__laOprire.add(treaba);
}

/**
 * Ascultă semnalele de oprire.
 *
 * Stă aici, nu în `instrumentation.ts`: acela se compilează și pentru Edge, iar
 * analizatorul se plângea de `process.once`, deși codul rulează doar pe Node.
 */
export function ascultaOprirea(): void {
  if (g.__opriremHooked) return;
  g.__opriremHooked = true;
  for (const semnal of ["SIGTERM", "SIGINT"] as const) {
    process.once(semnal, () => {
      const cate = closeLiveStreams();
      for (const treaba of g.__laOprire ?? []) {
        try {
          treaba();
        } catch {
          // oprirea nu are voie să se împiedice
        }
      }
      console.log(`[oprire] fluxuri live închise: ${cate}; ceasuri oprite`);
    });
  }
}
