/**
 * Cozile de cereri către /api/cart.
 *
 * Coșul e ținut într-un cookie, deci fiecare cerere face citește-modifică-scrie.
 * Dacă utilizatorul apasă rapid „Adaugă în coș" la două produse, ambele cereri
 * pleacă în paralel, citesc același cookie gol și ultima câștigă — un produs se
 * pierde. Serializăm cererile într-un singur lanț, ca a doua să pornească după
 * ce prima a scris cookie-ul.
 */

let chain: Promise<unknown> = Promise.resolve();

export function queueCartUpdate(productId: string, quantity: number): Promise<{ ok: boolean }> {
  const run = async () => {
    const res = await fetch("/api/cart", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ productId, quantity }),
    });
    return (await res.json()) as { ok: boolean };
  };
  const next = chain.then(run, run);
  chain = next.catch(() => undefined);
  return next;
}
