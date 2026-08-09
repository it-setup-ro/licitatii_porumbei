"use client";

import { useState } from "react";
import { useTranslations } from "next-intl";
import { useRouter } from "@/i18n/navigation";

export default function ModerationButtons({
  endpoint,
  approveAction,
  rejectAction,
  askReason = false,
  startNow = false,
}: {
  endpoint: string;
  approveAction: string;
  rejectAction: string;
  askReason?: boolean;
  startNow?: boolean;
}) {
  const t = useTranslations("admin");
  const router = useRouter();
  const [busy, setBusy] = useState(false);
  const [reason, setReason] = useState("");

  const run = async (action: string) => {
    setBusy(true);
    const body: Record<string, unknown> = { action };
    if (action === rejectAction && reason) body.reason = reason;
    if (action === approveAction && startNow) body.startsAt = new Date().toISOString();
    await fetch(endpoint, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(body),
    });
    router.refresh();
    setBusy(false);
  };

  return (
    <div className="flex items-center gap-2">
      {askReason && (
        <input
          value={reason}
          onChange={(e) => setReason(e.target.value)}
          placeholder={t("rejectReason")}
          data-testid="mod-reason"
          className="rounded-lg border border-ink/20 px-3 py-1.5 text-sm outline-none focus:border-wing-blue"
        />
      )}
      <button
        onClick={() => run(approveAction)}
        disabled={busy}
        data-testid="mod-approve"
        className="rounded-lg bg-green-600 px-4 py-1.5 text-sm font-bold text-white hover:bg-green-700 disabled:opacity-50"
      >
        {approveAction === "KEEP" ? t("keep") : t("approve")}
      </button>
      <button
        onClick={() => run(rejectAction)}
        disabled={busy}
        data-testid="mod-reject"
        className="rounded-lg bg-wing-red px-4 py-1.5 text-sm font-bold text-white hover:opacity-85 disabled:opacity-50"
      >
        {rejectAction === "HIDE" ? t("hide") : t("reject")}
      </button>
    </div>
  );
}
