/** Utilitar de test: afiseaza id-ul recenziei din seed (pentru testele de moderare). */
import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();

async function main() {
  const review = await prisma.review.findFirst({
    where: { comment: { contains: "Porumbel superb" } },
    select: { id: true },
  });
  if (!review) throw new Error("Recenzia din seed nu a fost gasita");
  process.stdout.write(review.id);
}

main().then(() => prisma.$disconnect());
