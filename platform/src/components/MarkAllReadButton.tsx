"use client";

import { useTranslations } from "next-intl";
import { useRouter } from "@/i18n/navigation";

export default function MarkAllReadButton() {
  const t = useTranslations("account");
  const router = useRouter();
  return (
    <button
      onClick={async () => {
        await fetch("/api/notifications/read", { method: "POST" });
        router.refresh();
      }}
      data-testid="mark-all-read"
      className="rounded-full border border-ink/15 px-4 py-1.5 text-sm font-semibold hover:border-ink/40"
    >
      {t("markAllRead")}
    </button>
  );
}
