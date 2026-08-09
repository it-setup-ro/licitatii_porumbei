"use client";

import { useState } from "react";
import { useTranslations } from "next-intl";

export default function WatchButton({
  auctionId,
  initialWatching,
}: {
  auctionId: string;
  initialWatching: boolean;
}) {
  const t = useTranslations("auction");
  const [watching, setWatching] = useState(initialWatching);
  const [busy, setBusy] = useState(false);

  const toggle = async () => {
    setBusy(true);
    try {
      const res = await fetch(`/api/auctions/${auctionId}/watch`, { method: "POST" });
      const data = await res.json();
      if (data.ok) setWatching(data.watching);
    } finally {
      setBusy(false);
    }
  };

  return (
    <button
      onClick={toggle}
      disabled={busy}
      data-testid="watch-button"
      className={`w-full rounded-2xl border px-4 py-3 text-sm font-semibold transition-colors ${
        watching
          ? "border-wing-yellow bg-wing-yellow/15 text-ink"
          : "border-ink/15 bg-white hover:border-wing-yellow"
      }`}
    >
      {watching ? `★ ${t("unwatch")}` : `☆ ${t("watch")}`}
    </button>
  );
}
