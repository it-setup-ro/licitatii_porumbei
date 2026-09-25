import { PrismaClient } from "@prisma/client";

/**
 * Mută ora de final a unui lot în trecut, ca sweeperul să-l închidă la runda
 * următoare. Un lot se închide doar când i-a trecut ora ȘI nu mai are niciun
 * porumbel deschis — altfel testul ar trebui să aștepte ore.
 *
 * Al doilea argument, „status", întoarce doar starea lotului (fără să schimbe
 * nimic), pentru testele care așteaptă închiderea.
 */
const prisma = new PrismaClient();

async function main() {
  const id = process.argv[2];
  const doarStarea = process.argv[3] === "status";
  if (!doarStarea) {
    await prisma.lot.update({ where: { id }, data: { endsAt: new Date(Date.now() - 60_000) } });
  }
  const lot = await prisma.lot.findUnique({ where: { id }, select: { status: true } });
  console.log(JSON.stringify({ status: lot?.status ?? null }));
}

main().finally(() => prisma.$disconnect());
