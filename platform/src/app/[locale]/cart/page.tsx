import { getTranslations, setRequestLocale } from "next-intl/server";
import { getCurrentUser } from "@/lib/auth";
import { getCartLines } from "@/lib/cart";
import CartView from "@/components/CartView";

export const dynamic = "force-dynamic";

/** Transport fix — trebuie să coincidă cu SHIPPING_CENTS din /api/shop-orders. */
const SHIPPING_CENTS = 2_500;

export default async function CartPage({ params }: { params: Promise<{ locale: string }> }) {
  const { locale } = await params;
  setRequestLocale(locale);
  const t = await getTranslations("cart");

  const [{ lines, subtotalCents, currency, hasStockIssue }, user] = await Promise.all([
    getCartLines(),
    getCurrentUser(),
  ]);

  return (
    <div className="mx-auto max-w-6xl px-4 py-10">
      <h1 className="font-display mb-6 text-3xl font-bold">{t("title")}</h1>
      <CartView
        lines={lines}
        subtotalCents={subtotalCents}
        shippingCents={lines.length > 0 ? SHIPPING_CENTS : 0}
        currency={currency}
        isLoggedIn={user !== null}
        hasStockIssue={hasStockIssue}
        defaultName={user?.name ?? ""}
        defaultPhone={user?.phone ?? ""}
      />
    </div>
  );
}
