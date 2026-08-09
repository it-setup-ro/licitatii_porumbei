"use client";

import { useState } from "react";
import { useTranslations } from "next-intl";
import { useRouter } from "@/i18n/navigation";

export default function ReviewForm({ orderId }: { orderId: string }) {
  const t = useTranslations("reviews");
  const router = useRouter();
  const [rating, setRating] = useState(5);
  const [comment, setComment] = useState("");
  const [busy, setBusy] = useState(false);

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    setBusy(true);
    const res = await fetch("/api/reviews", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ orderId, rating, comment: comment || undefined }),
    });
    const data = await res.json();
    setBusy(false);
    if (data.ok) router.refresh();
  };

  return (
    <form
      onSubmit={submit}
      className="space-y-3 rounded-2xl border border-ink/10 bg-white p-5"
      data-testid="review-form"
    >
      <h3 className="font-display text-lg font-bold">{t("title")}</h3>
      <div className="flex items-center gap-1" role="radiogroup" aria-label={t("rating")}>
        {[1, 2, 3, 4, 5].map((i) => (
          <button
            key={i}
            type="button"
            data-testid={`star-${i}`}
            onClick={() => setRating(i)}
            aria-checked={rating === i}
            role="radio"
            className="text-2xl"
          >
            {i <= rating ? "★" : "☆"}
          </button>
        ))}
      </div>
      <textarea
        value={comment}
        data-testid="review-comment"
        onChange={(e) => setComment(e.target.value)}
        rows={3}
        placeholder={t("comment")}
        className="w-full rounded-xl border border-ink/20 bg-ivory-soft px-4 py-2.5 text-sm outline-none focus:border-wing-blue"
      />
      <button
        type="submit"
        disabled={busy}
        data-testid="review-submit"
        className="rounded-xl bg-ink px-6 py-2.5 font-bold text-ivory hover:bg-wing-orange disabled:opacity-50"
      >
        {t("submit")}
      </button>
    </form>
  );
}
