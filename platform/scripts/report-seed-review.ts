/** Utilitar de test: marcheaza recenzia din seed ca raportata, pentru testul de moderare. */
import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();

async function main() {
  const review = await prisma.review.findFirst({
    where: { comment: { contains: "Porumbel superb" } },
  });
  if (!review) throw new Error("Recenzia din seed nu a fost gasita");
  await prisma.review.update({
    where: { id: review.id },
    data: { status: "REPORTED", reportReason: "Test de moderare e2e" },
  });
  console.log("reported", review.id);
}

main().then(() => prisma.$disconnect());
