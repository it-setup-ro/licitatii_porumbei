"use client";

import { useState } from "react";
import { useTranslations } from "next-intl";
import { useRouter } from "@/i18n/navigation";

export default function OrderActions({
  orderId,
  action,
}: {
  orderId: string;
  action: "SHIP" | "DELIVER";
}) {
  const t = useTranslations("orders");
  const router = useRouter();
  const [busy, setBusy] = useState(false);

  const run = async () => {
    setBusy(true);
    await fetch(`/api/orders/${orderId}/status`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ action }),
    });
    router.refresh();
    setBusy(false);
  };

  return (
    <button
      onClick={run}
      disabled={busy}
      data-testid={`order-action-${action.toLowerCase()}`}
      className="mt-3 rounded-xl border border-ink/20 px-4 py-2 text-sm font-semibold hover:border-wing-blue hover:text-wing-blue disabled:opacity-50"
    >
      {action === "SHIP" ? t("markShipped") : t("markDelivered")}
    </button>
  );
}
