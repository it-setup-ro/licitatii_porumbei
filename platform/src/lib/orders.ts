import type { Prisma } from "@prisma/client";
import { prisma } from "./db";
import { notify } from "./notify";
import { getSettings } from "./settings";
import { getEurRate } from "./fx";
import { lotLabel } from "./lots";
import { paymentInstructionsText } from "./payment-instructions";
import { normalizeLocale } from "./locales";
import { SETTLEABLE_STATUSES, settlementSummary } from "./settlement-math";

/**
 * Faza 2 — plata în afara site-ului.
 *
 * Comanda trece prin: Așteaptă plata → Plătit (transfer / numerar, marcat de
 * administrator) → Predat. Un câștigător care nu plătește se anulează. Porumbeii
 * plătiți intră în decontul cu crescătorul; după decont, marcajele nu se mai
 * schimbă — suma plătită crescătorului trebuie să rămână cea din ziua decontului.
 */

export class OrderError extends Error {
  constructor(
    public code: string,
    public status = 409
  ) {
    super(code);
  }
}

/** Grupul de decont: licitația crescătorului sau, la preț fix, „Oferit de". */
export type SettlementGroup = { saleId: string } | { offeredBy: string };

export function orderWhereForGroup(g: SettlementGroup): Prisma.OrderWhereInput {
  if ("saleId" in g) return { auction: { is: { lot: { is: { saleId: g.saleId } } } } };
  return {
    auction: {
      is: {
        saleMode: "FIXED",
        pigeon: {
          is: g.offeredBy ? { offeredBy: g.offeredBy } : { OR: [{ offeredBy: null }, { offeredBy: "" }] },
        },
      },
    },
  };
}

async function audit(actorId: string, action: string, orderId: string, data: unknown) {
  await prisma.auditLog.create({
    data: { actorId, action, entity: "Order", entityId: orderId, dataJson: JSON.stringify(data) },
  });
}

function orderWithPigeon(id: string) {
  return prisma.order.findUniqueOrThrow({
    where: { id },
    include: { auction: { include: { pigeon: { select: { name: true } } } } },
  });
}

export async function markOrderPaid(
  orderId: string,
  adminId: string,
  method: "TRANSFER" | "CASH",
  paidAt: Date
) {
  // condiționat de stare: două clicuri simultane nu marchează plata de două ori
  const r = await prisma.order.updateMany({
    where: { id: orderId, status: "PENDING_PAYMENT" },
    data: { status: "PAID", paymentMethod: method, paidAt, paidMarkedById: adminId },
  });
  if (r.count !== 1) throw new OrderError("NOT_PENDING");
  const order = await orderWithPigeon(orderId);
  await prisma.user.update({
    where: { id: order.buyerId },
    data: { completedOrders: { increment: 1 } },
  });
  await audit(adminId, "ORDER_PAID", orderId, { method, paidAt });
  await notify(order.buyerId, "ORDER_PAID", { lot: order.auction.pigeon.name }, `/orders/${orderId}`);
}

export async function markOrderDelivered(orderId: string, adminId: string, carrier: string | null) {
  const r = await prisma.order.updateMany({
    where: { id: orderId, status: { in: ["PAID", "SHIPPED"] } },
    data: { status: "DELIVERED", deliveredAt: new Date(), deliveredById: adminId, carrier },
  });
  if (r.count !== 1) throw new OrderError("NOT_PAID");
  await audit(adminId, "ORDER_DELIVERED", orderId, { carrier });
}

/** Un marcaj pus din greșeală se poate retrage — doar cât porumbelul nu e decontat. */
export async function undoOrderStep(orderId: string, adminId: string) {
  const order = await prisma.order.findUnique({ where: { id: orderId } });
  if (!order) throw new OrderError("NOT_FOUND", 404);
  if (order.settlementId) throw new OrderError("SETTLED");

  if (order.status === "DELIVERED") {
    const r = await prisma.order.updateMany({
      where: { id: orderId, status: "DELIVERED", settlementId: null },
      data: { status: "PAID", deliveredAt: null, deliveredById: null, carrier: null },
    });
    if (r.count !== 1) throw new OrderError("CHANGED");
  } else if (order.status === "PAID" || order.status === "SHIPPED") {
    const r = await prisma.order.updateMany({
      where: { id: orderId, status: order.status, settlementId: null },
      data: { status: "PENDING_PAYMENT", paymentMethod: null, paidAt: null, paidMarkedById: null },
    });
    if (r.count !== 1) throw new OrderError("CHANGED");
    await prisma.user.updateMany({
      where: { id: order.buyerId, completedOrders: { gt: 0 } },
      data: { completedOrders: { decrement: 1 } },
    });
  } else {
    throw new OrderError("NOTHING_TO_UNDO");
  }
  await audit(adminId, "ORDER_UNDO", orderId, { from: order.status });
}

export async function cancelUnpaidOrder(orderId: string, adminId: string, reason: string | null) {
  const r = await prisma.order.updateMany({
    where: { id: orderId, status: "PENDING_PAYMENT" },
    data: { status: "CANCELLED", cancelledAt: new Date(), cancelReason: reason },
  });
  if (r.count !== 1) throw new OrderError("NOT_PENDING");
  const order = await orderWithPigeon(orderId);
  await audit(adminId, "ORDER_CANCELLED_UNPAID", orderId, { reason });
  await notify(
    order.buyerId,
    "ORDER_CANCELLED",
    { lot: order.auction.pigeon.name, reason: reason ?? "" },
    `/orders/${orderId}`
  );
}

/** Comenzile, deconturile făcute și sumele unui grup — pentru pagină și pentru Excel. */
export async function loadSettlementGroup(g: SettlementGroup) {
  const orders = await prisma.order.findMany({
    where: { ...orderWhereForGroup(g), status: { not: "CANCELLED" } },
    include: {
      buyer: { select: { name: true, nickname: true, phone: true } },
      auction: {
        include: {
          pigeon: { select: { name: true, ringNumber: true } },
          lot: { select: { number: true } },
        },
      },
      settlement: { select: { settledAt: true } },
    },
    orderBy: { createdAt: "asc" },
  });
  const settlements = await prisma.settlement.findMany({
    where: "saleId" in g ? { saleId: g.saleId } : { kind: "FIXED", offeredBy: g.offeredBy },
    orderBy: { settledAt: "desc" },
  });
  return { orders, settlements, summary: settlementSummary(orders) };
}

export async function settleGroup(g: SettlementGroup, adminId: string) {
  const orders = await prisma.order.findMany({
    where: { ...orderWhereForGroup(g), status: { in: SETTLEABLE_STATUSES }, settlementId: null },
    select: { id: true, amountCents: true, commissionCents: true, currency: true },
  });
  if (orders.length === 0) throw new OrderError("NOTHING_TO_SETTLE");

  const totalCents = orders.reduce((n, o) => n + o.amountCents, 0);
  const commissionCents = orders.reduce((n, o) => n + o.commissionCents, 0);

  return prisma.$transaction(async (tx) => {
    const s = await tx.settlement.create({
      data: {
        kind: "saleId" in g ? "SALE" : "FIXED",
        saleId: "saleId" in g ? g.saleId : null,
        offeredBy: "offeredBy" in g ? g.offeredBy : null,
        currency: orders[0].currency,
        totalCents,
        commissionCents,
        payoutCents: totalCents - commissionCents,
        orderCount: orders.length,
        settledById: adminId,
      },
    });
    // doar comenzile încă nedecontate și încă plătite; altfel s-a schimbat ceva între timp
    const r = await tx.order.updateMany({
      where: { id: { in: orders.map((o) => o.id) }, settlementId: null, status: { in: SETTLEABLE_STATUSES } },
      data: { settlementId: s.id },
    });
    if (r.count !== orders.length) throw new OrderError("CHANGED");
    await tx.auditLog.create({
      data: {
        actorId: adminId,
        action: "SETTLEMENT_CREATED",
        entity: "Settlement",
        entityId: s.id,
        dataJson: JSON.stringify({ group: g, orderIds: orders.map((o) => o.id), payoutCents: s.payoutCents }),
      },
    });
    return s;
  });
}

/**
 * Câștigătorul (sau cumpărătorul la preț fix) primește pe site și pe e-mail
 * suma, datele de plată ale firmei, regula predării și telefonul.
 */
export async function notifyBuyerWithPaymentDetails(orderId: string, kind: "WON" | "BOUGHT") {
  const order = await prisma.order.findUnique({
    where: { id: orderId },
    include: {
      buyer: { select: { locale: true } },
      auction: { include: { pigeon: { select: { name: true, ringNumber: true } }, lot: { select: { number: true } } } },
    },
  });
  if (!order) return;
  const [s, eurRate] = await Promise.all([getSettings(), getEurRate()]);
  const locale = normalizeLocale(order.buyer.locale);
  const label =
    order.auction.lot && order.auction.lotPosition
      ? lotLabel(order.auction.lot.number, order.auction.lotPosition)
      : null;
  const base = (process.env.PUBLIC_BASE_URL ?? "").replace(/\/$/, "");
  const text = paymentInstructionsText({
    locale,
    won: kind === "WON",
    pigeon: order.auction.pigeon.name,
    label,
    ring: order.auction.pigeon.ringNumber,
    amountCents: order.amountCents,
    currency: order.currency,
    eurRate,
    details: { companyName: s.companyName, iban: s.companyIban, bank: s.companyBank, phone: s.contactPhone },
    orderUrl: `${base}/${locale}/orders/${order.id}`,
  });
  await notify(
    order.buyerId,
    kind === "WON" ? "AUCTION_WON" : "PAYMENT_INSTRUCTIONS",
    { lot: order.auction.pigeon.name, priceCents: order.amountCents, currency: order.currency },
    `/orders/${order.id}`,
    { emailText: text }
  );
}
