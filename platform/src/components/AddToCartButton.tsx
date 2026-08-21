"use client";

import { useState } from "react";
import { useTranslations } from "next-intl";
import { useRouter } from "@/i18n/navigation";
import { queueCartUpdate } from "@/lib/cart-client";

export default function AddToCartButton({
  productId,
  stock,
  compact = false,
}: {
  productId: string;
  stock: number;
  compact?: boolean;
}) {
  const t = useTranslations("products");
  const router = useRouter();
  const [qty, setQty] = useState(1);
  const [busy, setBusy] = useState(false);
  const [done, setDone] = useState(false);

  const add = async () => {
    setBusy(true);
    const data = await queueCartUpdate(productId, qty);
    setBusy(false);
    if (data.ok) {
      setDone(true);
      setTimeout(() => setDone(false), 2500);
      router.refresh(); // actualizeaza numarul din cosul din header
    }
  };

  if (stock <= 0) {
    return (
      <p
        className="rounded-xl bg-ink/5 px-4 py-2.5 text-center text-sm font-semibold text-ink/50"
        data-testid="out-of-stock"
      >
        {t("outOfStock")}
      </p>
    );
  }

  return (
    <div className={compact ? "space-y-2" : "flex items-end gap-3"}>
      {!compact && (
        <label className="text-sm">
          <span className="font-medium">{t("quantity")}</span>
          <input
            type="number"
            min={1}
            max={stock}
            value={qty}
            data-testid="qty-input"
            onChange={(e) => setQty(Math.max(1, Math.min(stock, Number(e.target.value) || 1)))}
            className="mt-1 w-20 rounded-xl border border-ink/20 bg-ivory-soft px-3 py-2 outline-none focus:border-wing-blue"
          />
        </label>
      )}
      <button
        onClick={add}
        disabled={busy}
        data-testid="add-to-cart"
        className={`rounded-xl px-5 py-2.5 font-bold text-white transition-colors disabled:opacity-50 ${
          done ? "bg-green-600" : "bg-wing-orange hover:bg-wing-red"
        } ${compact ? "w-full" : ""}`}
      >
        {done ? `✓ ${t("added")}` : t("addToCart")}
      </button>
    </div>
  );
}
