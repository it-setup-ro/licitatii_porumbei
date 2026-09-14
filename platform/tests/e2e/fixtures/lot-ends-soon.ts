import { PrismaClient } from "@prisma/client";

/**
 * Aduce finalul unui lot pornit la „peste N minute", cu porumbeii lui cu tot.
 * Un lot pornit nu se mai poate muta din aplicație; testele avizului de
 * 30 de minute au nevoie să liciteze întâi și abia apoi să intre în fereastră.
 */
const prisma = new PrismaClient();

async function main() {
  const lotId = process.argv[2];
  const minutes = Number(process.argv[3] ?? "20");
  const endsAt = new Date(Date.now() + minutes * 60_000);
  await prisma.$transaction([
    prisma.lot.update({ where: { id: lotId }, data: { endsAt } }),
    prisma.auction.updateMany({
      where: { lotId, status: "LIVE" },
      data: { endsAt, originalEndsAt: endsAt },
    }),
  ]);
  console.log(JSON.stringify({ ok: true }));
}

main().finally(() => prisma.$disconnect());
