"use client";

import { useState } from "react";
import { useTranslations } from "next-intl";
import { useRouter } from "@/i18n/navigation";

export default function SellerRequestForm() {
  const t = useTranslations("account");
  const router = useRouter();
  const [form, setForm] = useState({
    sellerCompany: "",
    sellerCui: "",
    sellerIban: "",
    sellerBio: "",
  });
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState(false);

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    setBusy(true);
    setError(false);
    const res = await fetch("/api/account/seller-request", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(form),
    });
    const data = await res.json();
    setBusy(false);
    if (data.ok) router.refresh();
    else setError(true);
  };

  return (
    <form onSubmit={submit} className="space-y-3" data-testid="seller-request-form">
      <h2 className="font-display text-xl font-bold">{t("becomeSeller")}</h2>
      <label className="block text-sm">
        <span className="font-medium">{t("sellerCompany")}</span>
        <input
          required
          data-testid="sr-company"
          value={form.sellerCompany}
          onChange={(e) => setForm((f) => ({ ...f, sellerCompany: e.target.value }))}
          className="mt-1 w-full rounded-xl border border-ink/20 bg-ivory-soft px-4 py-2.5 outline-none focus:border-wing-blue"
        />
      </label>
      <label className="block text-sm">
        <span className="font-medium">{t("sellerIban")}</span>
        <input
          required
          data-testid="sr-iban"
          value={form.sellerIban}
          onChange={(e) => setForm((f) => ({ ...f, sellerIban: e.target.value }))}
          className="mt-1 w-full rounded-xl border border-ink/20 bg-ivory-soft px-4 py-2.5 outline-none focus:border-wing-blue"
        />
      </label>
      <label className="block text-sm">
        <span className="font-medium">{t("sellerCui")}</span>
        <input
          data-testid="sr-cui"
          value={form.sellerCui}
          onChange={(e) => setForm((f) => ({ ...f, sellerCui: e.target.value }))}
          className="mt-1 w-full rounded-xl border border-ink/20 bg-ivory-soft px-4 py-2.5 outline-none focus:border-wing-blue"
        />
      </label>
      <label className="block text-sm">
        <span className="font-medium">{t("sellerBio")}</span>
        <textarea
          data-testid="sr-bio"
          value={form.sellerBio}
          onChange={(e) => setForm((f) => ({ ...f, sellerBio: e.target.value }))}
          rows={3}
          className="mt-1 w-full rounded-xl border border-ink/20 bg-ivory-soft px-4 py-2.5 outline-none focus:border-wing-blue"
        />
      </label>
      {error && <p className="text-sm text-wing-red">Error</p>}
      <button
        type="submit"
        disabled={busy}
        data-testid="sr-submit"
        className="rounded-xl bg-ink px-6 py-2.5 font-bold text-ivory hover:bg-wing-orange disabled:opacity-50"
      >
        {t("requestSeller")}
      </button>
    </form>
  );
}
