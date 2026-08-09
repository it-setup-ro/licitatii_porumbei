/**
 * Sweeper de fundal: porneste licitatiile programate si le inchide pe cele
 * expirate la fiecare 15 secunde. Ruleaza doar in runtime-ul Node.
 */
export async function register() {
  if (process.env.NEXT_RUNTIME !== "nodejs") return;
  const g = globalThis as unknown as { __sweeperStarted?: boolean };
  if (g.__sweeperStarted) return;
  g.__sweeperStarted = true;

  const { sweepAuctions } = await import("./lib/auction-service");
  const { releaseDuePayouts } = await import("./lib/payments");

  setInterval(async () => {
    try {
      await sweepAuctions();
      await releaseDuePayouts();
    } catch (e) {
      console.error("[sweeper]", e);
    }
  }, 15_000);
}
