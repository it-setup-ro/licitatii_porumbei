/** Utilitar de test: verifica starea comenzilor, notificarilor si emailurilor. */
import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();

async function main() {
  const emails = await prisma.emailLog.findMany({
    orderBy: { createdAt: "desc" },
    take: 8,
    select: { toEmail: true, subject: true },
  });
  const notifs = await prisma.notification.findMany({
    orderBy: { createdAt: "desc" },
    take: 8,
    select: { type: true, user: { select: { email: true } } },
  });
  const order = await prisma.order.findFirst({
    where: { auction: { pigeon: { ringNumber: "RO 2022 118822" } } },
    select: { status: true, amountCents: true, commissionCents: true, payoutStatus: true },
  });
  const buyer2 = await prisma.user.findUnique({
    where: { email: "buyer2@nbp.test" },
    select: { completedOrders: true },
  });
  console.log(JSON.stringify({ emails, notifs, order, buyer2 }, null, 1));
}

main().then(() => prisma.$disconnect());
