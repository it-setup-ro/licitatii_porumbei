import { getTranslations, getLocale, setRequestLocale } from "next-intl/server";
import { prisma } from "@/lib/db";
import { formatMoney } from "@/lib/money";
import { Link } from "@/i18n/navigation";
import AddToCartButton from "@/components/AddToCartButton";

export const dynamic = "force-dynamic";

const CATEGORIES = ["FEED", "SUPPLEMENTS", "ACCESSORIES", "RINGS", "OTHER"] as const;

export default async function ProductsPage({
  params,
  searchParams,
}: {
  params: Promise<{ locale: string }>;
  searchParams: Promise<{ cat?: string }>;
}) {
  const { locale } = await params;
  setRequestLocale(locale);
  const t = await getTranslations("products");
  const currentLocale = await getLocale();
  const sp = await searchParams;

  const cat = CATEGORIES.includes(sp.cat as (typeof CATEGORIES)[number]) ? sp.cat : undefined;

  const products = await prisma.product.findMany({
    where: { active: true, ...(cat ? { category: cat } : {}) },
    orderBy: [{ sortIdx: "asc" }, { nameRo: "asc" }],
  });

  return (
    <div className="mx-auto max-w-6xl px-4 py-10">
      <h1 className="font-display text-3xl font-bold">{t("title")}</h1>
      <p className="mt-2 text-ink/70">{t("subtitle")}</p>

      <div className="mt-6 flex flex-wrap gap-2">
        <Link
          href="/products"
          data-testid="cat-all"
          className={`rounded-full px-4 py-1.5 text-sm font-semibold ${
            !cat ? "bg-ink text-ivory" : "border border-ink/15 bg-white hover:border-ink/40"
          }`}
        >
          {t("all")}
        </Link>
        {CATEGORIES.map((c) => (
          <Link
            key={c}
            href={`/products?cat=${c}`}
            data-testid={`cat-${c.toLowerCase()}`}
            className={`rounded-full px-4 py-1.5 text-sm font-semibold ${
              cat === c ? "bg-ink text-ivory" : "border border-ink/15 bg-white hover:border-ink/40"
            }`}
          >
            {t(`category${c}` as "categoryFEED")}
          </Link>
        ))}
      </div>

      {products.length === 0 ? (
        <p className="mt-10 text-ink/50" data-testid="products-empty">
          {t("empty")}
        </p>
      ) : (
        <div className="mt-8 grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
          {products.map((p) => {
            const name = currentLocale === "en" ? p.nameEn : p.nameRo;
            const desc = currentLocale === "en" ? p.descEn : p.descRo;
            return (
              <div
                key={p.id}
                className="flex flex-col overflow-hidden rounded-2xl border border-ink/10 bg-white"
                data-testid="product-card"
              >
                <Link href={`/products/${p.slug}`} className="block">
                  <div className="aspect-[4/3] bg-ivory-soft">
                    {/* eslint-disable-next-line @next/next/no-img-element */}
                    <img
                      src={p.imageUrl ?? "/products/feed.svg"}
                      alt={name}
                      className="h-full w-full object-cover"
                    />
                  </div>
                </Link>
                <div className="flex flex-1 flex-col gap-2 p-4">
                  <span className="text-xs font-semibold uppercase tracking-wide text-wing-blue">
                    {t(`category${p.category}` as "categoryFEED")}
                  </span>
                  <Link href={`/products/${p.slug}`}>
                    <h2 className="font-display text-lg font-bold leading-snug hover:text-wing-orange">
                      {name}
                    </h2>
                  </Link>
                  {desc && <p className="line-clamp-2 text-sm text-ink/60">{desc}</p>}
                  <div className="mt-auto pt-2">
                    <p className="text-xl font-bold text-wing-orange">
                      {formatMoney(p.priceCents, p.currency, currentLocale)}
                    </p>
                    <p className="mb-2 text-xs text-ink/50">
                      {p.stock > 0 ? t("inStock", { count: p.stock }) : t("outOfStock")}
                    </p>
                    <AddToCartButton productId={p.id} stock={p.stock} compact />
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
