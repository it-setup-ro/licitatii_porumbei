import { PrismaClient } from "@prisma/client";

/**
 * Starea unui porumbel dintr-un lot, după închidere: comanda și comisionul.
 * Folosit de testele licitațiilor pe loturi — comisionul nu se vede în pagini.
 */
const prisma = new PrismaClient();

async function main() {
  const id = process.argv[2];
  const a = await prisma.auction.findUnique({
    where: { id },
    include: { order: true, lot: { include: { sale: true } } },
  });
  console.log(
    JSON.stringify({
      status: a?.status ?? null,
      amount: a?.order?.amountCents ?? null,
      commission: a?.order?.commissionCents ?? null,
      salePercent: a?.lot?.sale.commissionPercent ?? null,
    })
  );
}

main().finally(() => prisma.$disconnect());
