import { PrismaClient } from "@prisma/client";

/**
 * Adresa paginii unui porumbel, după nume (sau prima licitație live, fără nume).
 *
 * Lista publică „Licitații" arată acum doar licitațiile crescătorilor — clientul:
 * „ATÂT, FĂRĂ PORUMBEI" — așa că testele care au treabă cu pagina unui porumbel
 * intră direct pe ea, nu prin listă.
 */
const prisma = new PrismaClient();

async function main() {
  const nume = process.argv.slice(2).join(" ").trim();
  const a = await prisma.auction.findFirst({
    where: {
      hiddenAt: null,
      ...(nume ? { pigeon: { name: { contains: nume, mode: "insensitive" } } } : { status: "LIVE" }),
    },
    orderBy: nume ? { createdAt: "desc" } : { endsAt: "asc" },
    select: { id: true, status: true, pigeon: { select: { name: true } } },
  });
  console.log(JSON.stringify(a ? { id: a.id, status: a.status, name: a.pigeon.name } : null));
}

main().finally(() => prisma.$disconnect());
