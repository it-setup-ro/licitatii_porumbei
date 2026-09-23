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
  const { refreshBnrRate } = await import("./lib/fx");
  const { pollTelegramLinks } = await import("./lib/telegram-link");

  setInterval(async () => {
    try {
      await sweepAuctions();
    } catch (e) {
      console.error("[sweeper]", e);
    }
    try {
      // cursul BNR: se încearcă cel mult o dată pe oră
      await refreshBnrRate();
    } catch (e) {
      console.error("[curs BNR]", e);
    }
    try {
      // cine a apăsat „Start" pe bot de la ultima rundă încoace
      await pollTelegramLinks();
    } catch (e) {
      console.error("[telegram]", e);
    }
  }, 15_000);
}
