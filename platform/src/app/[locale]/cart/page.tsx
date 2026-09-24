import { getTranslations, setRequestLocale } from "next-intl/server";
import { getCurrentUser } from "@/lib/auth";
import { getCartLines } from "@/lib/cart";
import CartView from "@/components/CartView";
import { getSettings } from "@/lib/settings";

export const dynamic = "force-dynamic";

export default async function CartPage({ params }: { params: Promise<{ locale: string }> }) {
  const { locale } = await params;
  setRequestLocale(locale);
  const t = await getTranslations("cart");

  // transportul e o setare: îl schimbă clientul din Administrare → Setări
  const [{ lines, subtotalCents, currency, hasStockIssue }, user, setari] = await Promise.all([
    getCartLines(),
    getCurrentUser(),
    getSettings(),
  ]);

  return (
    <div className="mx-auto max-w-6xl px-4 py-10">
      <h1 className="font-display mb-6 text-3xl font-bold">{t("title")}</h1>
      <CartView
        lines={lines}
        subtotalCents={subtotalCents}
        shippingCents={lines.length > 0 ? setari.shopShippingCents : 0}
        currency={currency}
        isLoggedIn={user !== null}
        hasStockIssue={hasStockIssue}
        defaultName={user?.name ?? ""}
        defaultPhone={user?.phone ?? ""}
      />
    </div>
  );
}
