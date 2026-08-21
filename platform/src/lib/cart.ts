import { cookies } from "next/headers";
import { prisma } from "./db";

/**
 * Coșul de cumpărături, ținut într-un cookie (id produs → cantitate).
 *
 * De ce cookie și nu tabel în DB: coșul trebuie să funcționeze și pentru
 * vizitatorii nelogați (adaugi produse, apoi te autentifici la finalizare).
 * Prețurile NU se țin în cookie — se citesc mereu din DB la afișare, ca un
 * client să nu-și poată „edita” prețul modificând cookie-ul.
 */

const COOKIE = "nbp_cart";
const MAX_ITEMS = 20;
const MAX_QTY = 50;

export type CartMap = Record<string, number>;

export async function readCart(): Promise<CartMap> {
  const raw = (await cookies()).get(COOKIE)?.value;
  if (!raw) return {};
  try {
    const parsed = JSON.parse(decodeURIComponent(raw));
    if (typeof parsed !== "object" || parsed === null) return {};
    const clean: CartMap = {};
    for (const [id, qty] of Object.entries(parsed as Record<string, unknown>)) {
      const n = Number(qty);
      if (typeof id === "string" && id.length < 40 && Number.isInteger(n) && n > 0) {
        clean[id] = Math.min(n, MAX_QTY);
      }
      if (Object.keys(clean).length >= MAX_ITEMS) break;
    }
    return clean;
  } catch {
    return {};
  }
}

export async function writeCart(cart: CartMap) {
  const store = await cookies();
  const entries = Object.entries(cart).filter(([, q]) => q > 0);
  if (entries.length === 0) {
    store.delete(COOKIE);
    return;
  }
  store.set(COOKIE, encodeURIComponent(JSON.stringify(Object.fromEntries(entries))), {
    httpOnly: true,
    sameSite: "lax",
    secure: process.env.COOKIE_SECURE === "true",
    path: "/",
    maxAge: 60 * 60 * 24 * 30,
  });
}

export async function cartItemCount(): Promise<number> {
  const cart = await readCart();
  return Object.values(cart).reduce((sum, q) => sum + q, 0);
}

export type CartLine = {
  productId: string;
  slug: string;
  nameRo: string;
  nameEn: string;
  imageUrl: string | null;
  priceCents: number;
  quantity: number;
  stock: number;
  lineTotalCents: number;
};

/** Îmbogățește coșul cu date proaspete din DB (preț, stoc, denumire). */
export async function getCartLines(): Promise<{
  lines: CartLine[];
  subtotalCents: number;
  currency: string;
  hasStockIssue: boolean;
}> {
  const cart = await readCart();
  const ids = Object.keys(cart);
  if (ids.length === 0)
    return { lines: [], subtotalCents: 0, currency: "EUR", hasStockIssue: false };

  const products = await prisma.product.findMany({
    where: { id: { in: ids }, active: true },
  });

  const lines: CartLine[] = products.map((p) => {
    const wanted = cart[p.id] ?? 0;
    const quantity = Math.min(wanted, p.stock);
    return {
      productId: p.id,
      slug: p.slug,
      nameRo: p.nameRo,
      nameEn: p.nameEn,
      imageUrl: p.imageUrl,
      priceCents: p.priceCents,
      quantity,
      stock: p.stock,
      lineTotalCents: p.priceCents * quantity,
    };
  });

  const hasStockIssue = lines.some((l) => l.quantity < (cart[l.productId] ?? 0));
  const subtotalCents = lines.reduce((s, l) => s + l.lineTotalCents, 0);
  return {
    lines: lines.filter((l) => l.quantity > 0),
    subtotalCents,
    currency: products[0]?.currency ?? "EUR",
    hasStockIssue,
  };
}
