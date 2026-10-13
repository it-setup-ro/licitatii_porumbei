/**
 * Evidența fluxurilor live deschise (SSE), ca să le putem închide la oprirea
 * serviciului.
 *
 * Fără asta, o repornire dura un minut și jumătate: conexiunile live ținute
 * deschise de telefoanele din licitație nu lăsau procesul să se termine, iar
 * systemd îl omora cu forța. În jurnal rămânea „Controller is already closed",
 * iar cumpărătorii vedeau site-ul picat tocmai în minutele de licitație.
 *
 * Numărul lor se ține în `globalThis`: în dezvoltare, Next reîncarcă modulele
 * la fiecare salvare și altfel am pierde evidența.
 */

type Inchidere = () => void;

const g = globalThis as unknown as { __liveStreams?: Set<Inchidere> };

function registru(): Set<Inchidere> {
  if (!g.__liveStreams) g.__liveStreams = new Set();
  return g.__liveStreams;
}

/** Ține minte un flux deschis. Întoarce funcția de uitare. */
export function registerLiveStream(inchide: Inchidere): () => void {
  const r = registru();
  r.add(inchide);
  return () => r.delete(inchide);
}

/** Închide toate fluxurile deschise — la oprirea serviciului. */
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
