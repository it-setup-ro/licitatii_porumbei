import { z } from "zod";
import { getSettings } from "@/lib/settings";
import { prisma } from "@/lib/db";
import { alertAdmin } from "@/lib/alerts";
import { requireUser } from "@/lib/auth";
import { readCart, writeCart } from "@/lib/cart";
import { rateLimit } from "@/lib/rate-limit";
import { jsonOk, jsonError, jsonTooManyRequests, handleApiError } from "@/lib/api";

const schema = z.object({
  shippingName: z.string().min(2).max(120),
  shippingPhone: z.string().min(5).max(30),
  shippingAddress: z.string().min(10).max(500),
  note: z.string().max(1000).optional(),
});

/** Transport fix pentru comenzile din magazin (produse fizice). */

/**
 * Finalizează comanda din magazin.
 *
 * Prețurile se recitesc din DB (nu din coșul clientului), iar stocul se scade
 * într-o singură tranzacție cu verificare condiționată: dacă între timp cineva
 * a cumpărat ultimul exemplar, comanda e refuzată în loc să vândă stoc inexistent.
 */
export async function POST(req: Request) {
  try {
    const user = await requireUser();

    const check = rateLimit(`shoporder:${user.id}`, 10, 60 * 60_000);
    if (!check.allowed) return jsonTooManyRequests(check.retryAfterSeconds);

    const body = schema.safeParse(await req.json());
    if (!body.success) return jsonError("VALIDATION", 422);

    const cart = await readCart();
    const ids = Object.keys(cart);
    if (ids.length === 0) return jsonError("EMPTY_CART", 400);

    const products = await prisma.product.findMany({
      where: { id: { in: ids }, active: true },
    });
    if (products.length === 0) return jsonError("EMPTY_CART", 400);

    const lines = products
      .map((p) => ({ product: p, quantity: Math.min(cart[p.id] ?? 0, p.stock) }))
      .filter((l) => l.quantity > 0);
    if (lines.length === 0) return jsonError("OUT_OF_STOCK", 400);

    const subtotalCents = lines.reduce((s, l) => s + l.product.priceCents * l.quantity, 0);
    // transportul vine din Setări, ca să-l poată schimba clientul
    const { shopShippingCents } = await getSettings();
    const totalCents = subtotalCents + shopShippingCents;

    const order = await prisma.$transaction(async (tx) => {
      // scade stocul conditionat: doar daca mai exista cantitatea ceruta
      for (const line of lines) {
        const updated = await tx.product.updateMany({
          where: { id: line.product.id, stock: { gte: line.quantity } },
          data: { stock: { decrement: line.quantity } },
        });
        if (updated.count !== 1) throw new Error("OUT_OF_STOCK");
      }

      return tx.shopOrder.create({
        data: {
          buyerId: user.id,
          subtotalCents,
          shippingCents: shopShippingCents,
          totalCents,
          currency: lines[0].product.currency,
          shippingName: body.data.shippingName,
          shippingPhone: body.data.shippingPhone,
          shippingAddress: body.data.shippingAddress,
          note: body.data.note,
          items: {
            create: lines.map((l) => ({
              productId: l.product.id,
              nameSnapshot: l.product.nameRo,
              priceCents: l.product.priceCents,
              quantity: l.quantity,
            })),
          },
        },
      });
    });

    await writeCart({});
    await alertAdmin("SHOP_ORDER", {
      titlu: `${(order.totalCents / 100).toFixed(0)} ${order.currency}`,
      linii: [
        `Cumpărător: ${order.shippingName} (${user.email})`,
        ...lines.map((l) => `${l.quantity} × ${l.product.nameRo}`),
      ],
      cale: "/ro/admin/shop-orders",
    });
    return jsonOk({ orderId: order.id });
  } catch (e) {
    if (e instanceof Error && e.message === "OUT_OF_STOCK") {
      return jsonError("OUT_OF_STOCK", 409);
    }
    return handleApiError(e);
  }
}
