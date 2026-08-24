import { prisma } from "./db";
import { getSettings } from "./settings";
import { notify } from "./notify";

/**
 * Strat de abstractizare peste procesatorul de plati (client-decisions B6).
 * - MockProvider: dev/teste — plata reuseste instant.
 * - StripeProvider: schelet pentru integrarea Stripe Connect (chei in env).
 * Payout conform setarii payoutMode (B9): IMMEDIATE | AFTER_DAYS | ON_DELIVERY.
 */

export interface PaymentProvider {
  name: string;
  /** Initiaza plata; returneaza referinta si (optional) un URL de redirect. */
  createPayment(order: {
    id: string;
    amountCents: number;
    currency: string;
    buyerEmail: string;
  }): Promise<{ ref: string; redirectUrl: string | null }>;
  /** Confirma plata (mock: instant; stripe: webhook). */
  confirmPayment(ref: string): Promise<boolean>;
}

class MockProvider implements PaymentProvider {
  name = "mock";
  async createPayment(order: { id: string }) {
    return { ref: `mock_${order.id}_${Math.random().toString(36).slice(2, 10)}`, redirectUrl: null };
  }
  async confirmPayment() {
    return true;
  }
}

class StripeProvider implements PaymentProvider {
  name = "stripe";
  async createPayment(): Promise<{ ref: string; redirectUrl: string | null }> {
    // Integrarea reala: stripe.checkout.sessions.create cu destination charge
    // catre contul Connect al vanzatorului. Necesita STRIPE_SECRET_KEY.
    throw new Error("Stripe nu este configurat. Seteaza STRIPE_SECRET_KEY si activeaza providerul.");
  }
  async confirmPayment(): Promise<boolean> {
    throw new Error("Stripe nu este configurat.");
  }
}

export async function getPaymentProvider(): Promise<PaymentProvider> {
  const settings = await getSettings();
  return settings.paymentProvider === "stripe" ? new StripeProvider() : new MockProvider();
}

export async function payOrder(orderId: string, buyerId: string) {
  const order = await prisma.order.findUnique({
    where: { id: orderId },
    include: { buyer: true, auction: { include: { pigeon: true } } },
  });
  if (!order || order.buyerId !== buyerId) return { ok: false as const, error: "NOT_FOUND" };
  if (order.status !== "PENDING_PAYMENT") return { ok: false as const, error: "ALREADY_PAID" };

  const provider = await getPaymentProvider();
  const { ref } = await provider.createPayment({
    id: order.id,
    amountCents: order.amountCents,
    currency: order.currency,
    buyerEmail: order.buyer.email,
  });
  const confirmed = await provider.confirmPayment(ref);
  if (!confirmed) return { ok: false as const, error: "PAYMENT_FAILED" };

  const settings = await getSettings();
  const now = new Date();
  const payout =
    settings.payoutMode === "IMMEDIATE"
      ? { payoutStatus: "RELEASED", payoutAt: now }
      : settings.payoutMode === "AFTER_DAYS"
        ? {
            payoutStatus: "SCHEDULED",
            payoutAt: new Date(now.getTime() + settings.payoutAfterDays * 86_400_000),
          }
        : { payoutStatus: "PENDING", payoutAt: null }; // ON_DELIVERY

  // Update conditionat: doar tranzactia care prinde comanda inca in PENDING_PAYMENT
  // trece mai departe. Fara asta, doua cereri paralele de plata ar incrementa
  // completedOrders de doua ori si ar inregistra doua plati pentru aceeasi comanda.
  const claimed = await prisma.order.updateMany({
    where: { id: order.id, status: "PENDING_PAYMENT" },
    data: { status: "PAID", paymentRef: ref, paidAt: now, ...payout },
  });
  if (claimed.count !== 1) return { ok: false as const, error: "ALREADY_PAID" };

  await prisma.user.update({
    where: { id: buyerId },
    data: { completedOrders: { increment: 1 } },
  });

  await notify(
    order.sellerId,
    "ORDER_PAID",
    { lot: order.auction.pigeon.name, amountCents: order.amountCents },
    "/account/sales"
  );
  return { ok: true as const, ref };
}

/** Elibereaza payout-urile programate scadente (AFTER_DAYS) sau la livrare. */
export async function releaseDuePayouts() {
  const now = new Date();
  await prisma.order.updateMany({
    where: { status: { in: ["PAID", "SHIPPED", "DELIVERED"] }, payoutStatus: "SCHEDULED", payoutAt: { lte: now } },
    data: { payoutStatus: "RELEASED" },
  });
}
