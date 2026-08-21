import { notFound } from "next/navigation";
import { getTranslations, getLocale, setRequestLocale } from "next-intl/server";
import { prisma } from "@/lib/db";
import { formatMoney } from "@/lib/money";
import { Link } from "@/i18n/navigation";
import AddToCartButton from "@/components/AddToCartButton";

export const dynamic = "force-dynamic";

export default async function ProductPage({
  params,
}: {
  params: Promise<{ locale: string; slug: string }>;
}) {
  const { locale, slug } = await params;
  setRequestLocale(locale);
  const t = await getTranslations("products");
  const currentLocale = await getLocale();

  const product = await prisma.product.findFirst({ where: { slug, active: true } });
  if (!product) notFound();

  const name = currentLocale === "en" ? product.nameEn : product.nameRo;
  const desc = currentLocale === "en" ? product.descEn : product.descRo;

  return (
    <div className="mx-auto max-w-4xl px-4 py-10">
      <Link href="/products" className="-ml-2 inline-block rounded-lg px-2 py-2 text-sm text-ink/60 hover:text-wing-orange">
        {t("backToList")}
      </Link>

      <div className="mt-4 grid gap-8 md:grid-cols-2">
        <div className="overflow-hidden rounded-2xl border border-ink/10 bg-white">
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img
            src={product.imageUrl ?? "/products/feed.svg"}
            alt={name}
            className="aspect-[4/3] w-full object-cover"
          />
        </div>

        <div>
          <span className="text-xs font-semibold uppercase tracking-wide text-wing-blue">
            {t(`category${product.category}` as "categoryFEED")}
          </span>
          <h1 className="font-display mt-1 text-3xl font-bold" data-testid="product-title">
            {name}
          </h1>
          {desc && <p className="mt-3 leading-relaxed text-ink/80">{desc}</p>}

          <p className="mt-6 text-3xl font-bold text-wing-orange" data-testid="product-price">
            {formatMoney(product.priceCents, product.currency, currentLocale)}
          </p>
          <p className="mb-4 mt-1 text-sm text-ink/50" data-testid="product-stock">
            {product.stock > 0 ? t("inStock", { count: product.stock }) : t("outOfStock")}
          </p>

          <AddToCartButton productId={product.id} stock={product.stock} />
        </div>
      </div>
    </div>
  );
}
