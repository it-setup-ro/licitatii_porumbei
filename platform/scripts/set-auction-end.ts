/** Utilitar de test: muta endsAt al unei licitatii LIVE. Uz: tsx scripts/set-auction-end.ts <auctionId> <secondsFromNow> */
import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();
const [id, seconds] = process.argv.slice(2);

async function main() {
  const endsAt = new Date(Date.now() + Number(seconds) * 1000);
  await prisma.auction.update({ where: { id }, data: { endsAt } });
  console.log(`endsAt -> ${endsAt.toISOString()}`);
}

main().then(() => prisma.$disconnect());
