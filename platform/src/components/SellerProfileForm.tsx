"use client";

import { useState } from "react";
import { useTranslations } from "next-intl";
import { useRouter } from "@/i18n/navigation";

/**
 * Datele publice ale crescatoriei, editabile de crescator.
 *
 * Stau stranse sub un buton: pagina de cont e deja lunga, iar datele astea se
 * schimba o data la cativa ani. Localitatea apare pe cardul de pe prima pagina.
 */
export default function SellerProfileForm({
  initial,
}: {
  initial: { sellerCompany: string; sellerCity: string; sellerBio: string };
}) {
  const t = useTranslations("account");
  const c = useTranslations("common");
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [form, setForm] = useState(initial);
  const [busy, setBusy] = useState(false);
  const [done, setDone] = useState(false);
  const [error, setError] = useState(false);

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    setBusy(true);
    setError(false);
    const res = await fetch("/api/account/seller-profile", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(form),
    });
    const data = await res.json();
    setBusy(false);
    if (!data.ok) {
      setError(true);
      return;
    }
    setDone(true);
    setOpen(false);
    router.refresh();
  };

  return (
    <div className="mt-4 border-t border-ink/10 pt-4" data-testid="seller-profile">
      {!open ? (
        <div className="flex flex-wrap items-center gap-3">
          <button
            onClick={() => {
              setOpen(true);
              setDone(false);
            }}
            data-testid="sp-open"
            className="rounded-xl border border-ink/20 px-4 py-2 text-sm font-semibold text-wing-blue hover:border-wing-blue"
          >
            {t("editSellerProfile")}
          </button>
          {done && (
            <p className="text-sm font-semibold text-green-700" data-testid="sp-done">
              ✓ {t("sellerProfileSaved")}
            </p>
          )}
        </div>
      ) : (
        <form onSubmit={submit} className="space-y-3" data-testid="sp-form">
          <label className="block text-sm">
            <span className="font-medium">{t("sellerCompany")}</span>
            <input
              required
              data-testid="sp-company"
              value={form.sellerCompany}
              onChange={(e) => setForm((f) => ({ ...f, sellerCompany: e.target.value }))}
              className="mt-1 w-full rounded-xl border border-ink/20 bg-ivory-soft px-4 py-2.5 outline-none focus:border-wing-blue"
            />
          </label>
          <label className="block text-sm">
            <span className="font-medium">{t("sellerCity")}</span>
            <input
              data-testid="sp-city"
              value={form.sellerCity}
              onChange={(e) => setForm((f) => ({ ...f, sellerCity: e.target.value }))}
              className="mt-1 w-full rounded-xl border border-ink/20 bg-ivory-soft px-4 py-2.5 outline-none focus:border-wing-blue"
            />
          </label>
          <label className="block text-sm">
            <span className="font-medium">{t("sellerBio")}</span>
            <textarea
              data-testid="sp-bio"
              rows={3}
              value={form.sellerBio}
              onChange={(e) => setForm((f) => ({ ...f, sellerBio: e.target.value }))}
              className="mt-1 w-full rounded-xl border border-ink/20 bg-ivory-soft px-4 py-2.5 outline-none focus:border-wing-blue"
            />
          </label>
          {error && <p className="text-sm text-wing-red">{t("sellerProfileError")}</p>}
          <div className="flex gap-2">
            <button
              type="submit"
              disabled={busy}
              data-testid="sp-save"
              className="rounded-xl bg-ink px-6 py-2.5 font-bold text-ivory hover:bg-wing-orange disabled:opacity-50"
            >
              {c("save")}
            </button>
            <button
              type="button"
              onClick={() => setOpen(false)}
              className="rounded-xl border border-ink/20 px-4 py-2.5 font-semibold"
            >
              {c("cancel")}
            </button>
          </div>
        </form>
      )}
    </div>
  );
}
