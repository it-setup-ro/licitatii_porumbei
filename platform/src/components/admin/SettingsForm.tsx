"use client";

import { useState } from "react";
import { useTranslations } from "next-intl";
import type { PlatformSettings } from "@/lib/settings";

/**
 * Panoul de setari platforma (client-decisions.md §G).
 * Grupat pe taburi; salveaza doar cheile modificate; audit trail pe server.
 */

type FieldDef = {
  key: keyof PlatformSettings;
  label: string;
  type: "number" | "boolean" | "text" | "select";
  options?: string[];
  hint?: string;
};

export default function SettingsForm({ initial }: { initial: PlatformSettings }) {
  const t = useTranslations("admin");
  const [values, setValues] = useState<Record<string, unknown>>({ ...initial });
  const [dirty, setDirty] = useState<Set<string>>(new Set());
  const [saved, setSaved] = useState(false);
  const [busy, setBusy] = useState(false);
  const [tab, setTab] = useState(0);

  const groups: { title: string; fields: FieldDef[] }[] = [
    {
      title: t("groupCommercial"),
      fields: [
        { key: "commissionPercent", label: "Comision vânzător (%)", type: "number" },
        { key: "assistedExtraPercent", label: "Extra comision assisted (%)", type: "number" },
        { key: "assistedListingEnabled", label: "Assisted listing activ", type: "boolean" },
        { key: "buyerPremiumPercent", label: "Buyer's premium (%)", type: "number" },
        { key: "adminFeeEnabled", label: "Taxă administrativă activă", type: "boolean" },
        { key: "adminFeeCents", label: "Taxă administrativă (cenți)", type: "number" },
        { key: "platformCurrency", label: "Moneda platformei", type: "select", options: ["EUR", "RON"] },
        { key: "minStartPriceCents", label: "Preț minim de pornire (cenți)", type: "number" },
        { key: "defaultDurationDays", label: "Durata licitației (zile)", type: "number" },
        { key: "sellerChoosesDuration", label: "Vânzătorul alege durata", type: "boolean" },
      ],
    },
    {
      title: t("groupBidding"),
      fields: [
        { key: "snipeWindowMinutes", label: "Fereastră anti-sniping (min)", type: "number" },
        { key: "extensionMinutes", label: "Prelungire (min)", type: "number" },
        { key: "maxExtensions", label: "Prelungiri maxime", type: "number" },
        { key: "newAccountBidLimitCents", label: "Limită conturi noi (cenți)", type: "number" },
        { key: "bidGuaranteeEnabled", label: "Garanții de licitare active", type: "boolean" },
        { key: "bidGuaranteeThresholdCents", label: "Prag garanție (cenți)", type: "number" },
      ],
    },
    {
      title: t("groupPayments"),
      fields: [
        { key: "paymentProvider", label: "Procesator", type: "select", options: ["mock", "stripe"] },
        {
          key: "payoutMode",
          label: "Momentul payout-ului",
          type: "select",
          options: ["IMMEDIATE", "AFTER_DAYS", "ON_DELIVERY"],
        },
        { key: "payoutAfterDays", label: "Zile până la payout", type: "number" },
      ],
    },
    {
      title: t("groupShipping"),
      fields: [
        { key: "platformShippingEnabled", label: "Transport asistat de platformă", type: "boolean" },
        { key: "defaultShippingPayer", label: "Cine plătește default", type: "select", options: ["BUYER", "SELLER"] },
        { key: "aftersalesInfertileMonths", label: "Garanție infertil (luni)", type: "number" },
        { key: "aftersalesSickHours", label: "Bolnav la sosire (ore)", type: "number" },
        { key: "aftersalesDeadHours", label: "Mort la sosire (ore)", type: "number" },
        { key: "dnaSexGuaranteeMandatory", label: "Garanție ADN obligatorie la pui", type: "boolean" },
      ],
    },
    {
      title: t("groupComms"),
      fields: [
        { key: "emailEnabled", label: "E-mail activ", type: "boolean" },
        { key: "smsEnabled", label: "SMS activ (pregătit, dezactivat la lansare)", type: "boolean" },
      ],
    },
    {
      title: t("groupBrand"),
      fields: [
        { key: "siteName", label: "Numele site-ului", type: "text" },
        { key: "blogEnabled", label: "Blog activ", type: "boolean" },
        { key: "fancyCategoryEnabled", label: "Categoria ornament activă", type: "boolean" },
      ],
    },
    {
      title: t("groupUx"),
      fields: [
        { key: "winAnimationEnabled", label: "Animația stolului la câștig", type: "boolean" },
        { key: "winSoundEnabled", label: "Sunet la câștig (fâlfâit)", type: "boolean" },
        { key: "reviewEditDays", label: "Zile de editare recenzie", type: "number" },
      ],
    },
    {
      title: t("groupBilling"),
      fields: [
        { key: "companyName", label: "Denumire firmă", type: "text" },
        { key: "companyCui", label: "CUI", type: "text" },
        { key: "companyRegCom", label: "Nr. Reg. Com.", type: "text" },
        { key: "companyAddress", label: "Sediu social", type: "text" },
        { key: "companyIban", label: "IBAN", type: "text" },
        { key: "companyBank", label: "Banca", type: "text" },
        { key: "companyVatPayer", label: "Plătitor de TVA", type: "boolean" },
        { key: "invoiceSeries", label: "Serie facturi", type: "text" },
      ],
    },
  ];

  const setValue = (key: string, value: unknown) => {
    setValues((v) => ({ ...v, [key]: value }));
    setDirty((d) => new Set(d).add(key));
    setSaved(false);
  };

  const save = async () => {
    setBusy(true);
    const updates: Record<string, unknown> = {};
    for (const key of dirty) updates[key] = values[key];
    const res = await fetch("/api/admin/settings", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ updates }),
    });
    const data = await res.json();
    setBusy(false);
    if (data.ok) {
      setDirty(new Set());
      setSaved(true);
    }
  };

  return (
    <div data-testid="settings-form">
      <div className="mb-6 flex flex-wrap gap-2">
        {groups.map((g, i) => (
          <button
            key={g.title}
            onClick={() => setTab(i)}
            data-testid={`settings-tab-${i}`}
            className={`rounded-full px-4 py-1.5 text-sm font-semibold ${
              tab === i ? "bg-ink text-ivory" : "border border-ink/15 bg-white hover:border-ink/40"
            }`}
          >
            {g.title}
          </button>
        ))}
      </div>

      <div className="grid gap-4 rounded-2xl border border-ink/10 bg-white p-6 sm:grid-cols-2">
        {groups[tab].fields.map((f) => (
          <div key={f.key} className="text-sm">
            <label className="font-medium" htmlFor={`set-${f.key}`}>
              {f.label}
            </label>
            {f.type === "boolean" ? (
              <div className="mt-1">
                <button
                  id={`set-${f.key}`}
                  data-testid={`setting-${f.key}`}
                  onClick={() => setValue(f.key, !values[f.key])}
                  className={`h-7 w-12 rounded-full p-1 transition-colors ${
                    values[f.key] ? "bg-wing-blue" : "bg-ink/20"
                  }`}
                  role="switch"
                  aria-checked={Boolean(values[f.key])}
                >
                  <span
                    className={`block h-5 w-5 rounded-full bg-white transition-transform ${
                      values[f.key] ? "translate-x-5" : ""
                    }`}
                  />
                </button>
              </div>
            ) : f.type === "select" ? (
              <select
                id={`set-${f.key}`}
                data-testid={`setting-${f.key}`}
                value={String(values[f.key])}
                onChange={(e) => setValue(f.key, e.target.value)}
                className="mt-1 w-full rounded-xl border border-ink/20 bg-ivory-soft px-3 py-2 outline-none focus:border-wing-blue"
              >
                {f.options!.map((o) => (
                  <option key={o} value={o}>
                    {o}
                  </option>
                ))}
              </select>
            ) : (
              <input
                id={`set-${f.key}`}
                data-testid={`setting-${f.key}`}
                type={f.type === "number" ? "number" : "text"}
                value={String(values[f.key] ?? "")}
                onChange={(e) =>
                  setValue(f.key, f.type === "number" ? Number(e.target.value) : e.target.value)
                }
                className="mt-1 w-full rounded-xl border border-ink/20 bg-ivory-soft px-3 py-2 outline-none focus:border-wing-blue"
              />
            )}
          </div>
        ))}
      </div>

      <div className="mt-5 flex items-center gap-4">
        <button
          onClick={save}
          disabled={busy || dirty.size === 0}
          data-testid="settings-save"
          className="rounded-xl bg-ink px-8 py-2.5 font-bold text-ivory hover:bg-wing-orange disabled:opacity-40"
        >
          {busy ? "…" : "Save"}
        </button>
        {saved && (
          <p className="text-sm font-semibold text-green-700" data-testid="settings-saved">
            ✓ {t("settingsSaved")}
          </p>
        )}
      </div>
    </div>
  );
}
