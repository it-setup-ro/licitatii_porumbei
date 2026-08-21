"use client";

import { useState } from "react";
import { useLocale, useTranslations } from "next-intl";
import { useRouter } from "@/i18n/navigation";
import { formatMoney } from "@/lib/money";
import { queueCartUpdate } from "@/lib/cart-client";
import type { CartLine } from "@/lib/cart";

export default function CartView({
  lines,
  subtotalCents,
  shippingCents,
  currency,
  isLoggedIn,
  hasStockIssue,
  defaultName,
  defaultPhone,
}: {
  lines: CartLine[];
  subtotalCents: number;
  shippingCents: number;
  currency: string;
  isLoggedIn: boolean;
  hasStockIssue: boolean;
  defaultName: string;
  defaultPhone: string;
}) {
  const t = useTranslations("cart");
  const locale = useLocale();
  const router = useRouter();

  const [form, setForm] = useState({
    shippingName: defaultName,
    shippingPhone: defaultPhone,
    shippingAddress: "",
    note: "",
  });
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const fmt = (c: number) => formatMoney(c, currency, locale);
  const total = subtotalCents + shippingCents;

  const setQty = async (productId: string, quantity: number) => {
    await queueCartUpdate(productId, quantity);
    router.refresh();
  };

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    setBusy(true);
    setError(null);
    const res = await fetch("/api/shop-orders", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(form),
    });
    const data = await res.json();
    setBusy(false);
    if (data.ok) {
      router.push(`/account/shop-orders/${data.orderId}`);
      router.refresh();
    } else {
      setError(data.error === "OUT_OF_STOCK" ? t("stockChanged") : t("stockChanged"));
      router.refresh();
    }
  };

  if (lines.length === 0) {
    return (
      <div className="rounded-2xl border border-ink/10 bg-white p-8 text-center" data-testid="cart-empty">
        <p className="text-ink/60">{t("empty")}</p>
        <a
          href={`/${locale}/products`}
          className="mt-4 inline-block rounded-xl bg-ink px-6 py-2.5 font-bold text-ivory hover:bg-wing-orange"
        >
          {t("continueShopping")}
        </a>
      </div>
    );
  }

  const input =
    "mt-1 w-full rounded-xl border border-ink/20 bg-ivory-soft px-4 py-2.5 outline-none focus:border-wing-blue";

  return (
    <div className="grid gap-8 lg:grid-cols-[1fr_360px]">
      {/* Liniile din coș */}
      <div className="space-y-3" data-testid="cart-lines">
        {hasStockIssue && (
          <p className="rounded-xl bg-wing-yellow/20 px-4 py-3 text-sm" data-testid="stock-warning">
            {t("stockChanged")}
          </p>
        )}
        {lines.map((line) => (
          <div
            key={line.productId}
            className="flex items-center gap-4 rounded-2xl border border-ink/10 bg-white p-4"
            data-testid="cart-line"
          >
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img
              src={line.imageUrl ?? "/products/feed.svg"}
              alt=""
              className="h-20 w-24 rounded-lg object-cover"
            />
            <div className="min-w-0 flex-1">
              <p className="font-display font-bold">
                {locale === "en" ? line.nameEn : line.nameRo}
              </p>
              <p className="text-sm text-ink/60">{fmt(line.priceCents)}</p>
            </div>
            <div className="flex items-center gap-2">
              <input
                type="number"
                min={1}
                max={line.stock}
                value={line.quantity}
                data-testid="cart-qty"
                onChange={(e) => setQty(line.productId, Number(e.target.value) || 1)}
                className="w-16 rounded-lg border border-ink/20 px-2 py-1.5 text-center"
              />
              <button
                onClick={() => setQty(line.productId, 0)}
                data-testid="cart-remove"
                aria-label={t("remove")}
                className="rounded-lg px-2 py-1.5 text-wing-red hover:bg-wing-red/10"
              >
                ✕
              </button>
            </div>
            <p className="w-24 text-right font-bold">{fmt(line.lineTotalCents)}</p>
          </div>
        ))}
      </div>

      {/* Sumar + livrare */}
      <div className="space-y-4">
        <div className="rounded-2xl border border-ink/10 bg-white p-5 text-sm">
          <div className="flex justify-between">
            <span className="text-ink/60">{t("subtotal")}</span>
            <span className="font-semibold" data-testid="cart-subtotal">
              {fmt(subtotalCents)}
            </span>
          </div>
          <div className="mt-2 flex justify-between">
            <span className="text-ink/60">{t("shipping")}</span>
            <span className="font-semibold">{fmt(shippingCents)}</span>
          </div>
          <div className="mt-3 flex justify-between border-t border-ink/10 pt-3 text-lg">
            <span className="font-bold">{t("total")}</span>
            <span className="font-bold text-wing-orange" data-testid="cart-total">
              {fmt(total)}
            </span>
          </div>
        </div>

        {isLoggedIn ? (
          <form
            onSubmit={submit}
            className="space-y-3 rounded-2xl border border-ink/10 bg-white p-5"
            data-testid="checkout-form"
          >
            <h2 className="font-display text-lg font-bold">{t("shippingData")}</h2>
            <label className="block text-sm">
              <span className="font-medium">{t("name")}</span>
              <input
                required
                data-testid="ship-name"
                value={form.shippingName}
                onChange={(e) => setForm((f) => ({ ...f, shippingName: e.target.value }))}
                className={input}
              />
            </label>
            <label className="block text-sm">
              <span className="font-medium">{t("phone")}</span>
              <input
                required
                data-testid="ship-phone"
                value={form.shippingPhone}
                onChange={(e) => setForm((f) => ({ ...f, shippingPhone: e.target.value }))}
                className={input}
              />
            </label>
            <label className="block text-sm">
              <span className="font-medium">{t("address")}</span>
              <textarea
                required
                rows={3}
                data-testid="ship-address"
                value={form.shippingAddress}
                onChange={(e) => setForm((f) => ({ ...f, shippingAddress: e.target.value }))}
                className={input}
              />
            </label>
            <label className="block text-sm">
              <span className="font-medium">{t("note")}</span>
              <textarea
                rows={2}
                data-testid="ship-note"
                value={form.note}
                onChange={(e) => setForm((f) => ({ ...f, note: e.target.value }))}
                className={input}
              />
            </label>
            {error && (
              <p className="rounded-lg bg-wing-red/10 px-3 py-2 text-sm text-wing-red" data-testid="checkout-error">
                {error}
              </p>
            )}
            <button
              type="submit"
              disabled={busy}
              data-testid="place-order"
              className="w-full rounded-xl bg-ink py-3 font-bold text-ivory hover:bg-wing-orange disabled:opacity-50"
            >
              {t("placeOrder")}
            </button>
          </form>
        ) : (
          <a
            href={`/${locale}/login`}
            data-testid="cart-login"
            className="block rounded-xl bg-ink px-6 py-3 text-center font-bold text-ivory hover:bg-wing-orange"
          >
            {t("loginRequired")}
          </a>
        )}
      </div>
    </div>
  );
}
