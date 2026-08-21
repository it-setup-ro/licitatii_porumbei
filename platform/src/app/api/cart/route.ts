import { z } from "zod";
import { prisma } from "@/lib/db";
import { readCart, writeCart } from "@/lib/cart";
import { jsonOk, jsonError, handleApiError } from "@/lib/api";

const schema = z.object({
  productId: z.string().min(1).max(40),
  /** Cantitatea finală dorită; 0 scoate produsul din coș. */
  quantity: z.number().int().min(0).max(50),
});

/**
 * Actualizează coșul (cookie). Cantitatea e plafonată la stocul real, ca
 * utilizatorul să nu poată comanda mai mult decât există trimițând un request
 * modificat manual.
 */
export async function POST(req: Request) {
  try {
    const body = schema.safeParse(await req.json());
    if (!body.success) return jsonError("VALIDATION", 422);
    const { productId, quantity } = body.data;

    const cart = await readCart();

    if (quantity === 0) {
      delete cart[productId];
      await writeCart(cart);
      return jsonOk({ quantity: 0 });
    }

    const product = await prisma.product.findFirst({
      where: { id: productId, active: true },
      select: { id: true, stock: true },
    });
    if (!product) return jsonError("NOT_FOUND", 404);
    if (product.stock <= 0) return jsonError("OUT_OF_STOCK", 400);

    const finalQty = Math.min(quantity, product.stock);
    cart[productId] = finalQty;
    await writeCart(cart);

    const count = Object.values(cart).reduce((s, q) => s + q, 0);
    return jsonOk({ quantity: finalQty, cartCount: count });
  } catch (e) {
    return handleApiError(e);
  }
}
