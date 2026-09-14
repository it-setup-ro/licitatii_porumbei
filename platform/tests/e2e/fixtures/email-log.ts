import { PrismaClient } from "@prisma/client";

/**
 * Ultimele e-mailuri trimise unei adrese, din jurnalul de e-mailuri.
 * Folosit de testele avizului „se încheie în 30 de minute".
 */
const prisma = new PrismaClient();

async function main() {
  const email = process.argv[2];
  const rows = await prisma.emailLog.findMany({
    where: { toEmail: email },
    orderBy: { createdAt: "desc" },
    take: 10,
    select: { subject: true, body: true },
  });
  console.log(JSON.stringify(rows));
}

main().finally(() => prisma.$disconnect());
