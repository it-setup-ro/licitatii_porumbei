"use client";

import { useState } from "react";
import { useTranslations } from "next-intl";
import { useRouter } from "@/i18n/navigation";

export default function PayButton({
  orderId,
  amountLabel,
}: {
  orderId: string;
  amountLabel: string;
}) {
  const t = useTranslations("orders");
  const router = useRouter();
  const [busy, setBusy] = useState(false);
  const [done, setDone] = useState(false);

  const pay = async () => {
    setBusy(true);
    const res = await fetch(`/api/orders/${orderId}/pay`, { method: "POST" });
    const data = await res.json();
    setBusy(false);
    if (data.ok) {
      setDone(true);
      router.refresh();
    }
  };

  if (done) {
    return (
      <p
        className="rounded-2xl border border-green-300 bg-green-50 p-4 font-semibold text-green-800"
        data-testid="payment-done"
      >
        ✓ {t("paymentDone")}
      </p>
    );
  }

  return (
    <div className="rounded-2xl border border-ink/10 bg-white p-5">
      <button
        onClick={pay}
        disabled={busy}
        data-testid="pay-button"
        className="w-full rounded-xl bg-wing-orange py-3 font-bold text-white hover:bg-wing-red disabled:opacity-50"
      >
        {t("payNow")} · {amountLabel}
      </button>
      <p className="mt-2 text-center text-xs text-ink/50">{t("paymentInfo")}</p>
    </div>
  );
}
