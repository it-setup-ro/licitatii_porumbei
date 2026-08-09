import { prisma } from "./db";

/**
 * Panoul de setari platforma (client-decisions.md, sectiunea G).
 * Toate valorile comerciale sunt configurabile — nimic hard-codat.
 * Stocare: PlatformSetting rows (key -> JSON), suprapuse peste defaults.
 */

export type IncrementTier = { upToCents: number | null; stepCents: number };

export type PlatformSettings = {
  // Comercial
  commissionPercent: number;
  assistedExtraPercent: number;
  assistedListingEnabled: boolean;
  buyerPremiumPercent: number;
  adminFeeEnabled: boolean;
  adminFeeCents: number;
  platformCurrency: "EUR" | "RON";
  minStartPriceCents: number;
  defaultDurationDays: number;
  sellerChoosesDuration: boolean;
  // Licitare
  snipeWindowMinutes: number;
  extensionMinutes: number;
  maxExtensions: number;
  increments: IncrementTier[];
  newAccountBidLimitCents: number;
  bidGuaranteeEnabled: boolean;
  bidGuaranteeThresholdCents: number;
  // Plati
  paymentProvider: "mock" | "stripe";
  payoutMode: "IMMEDIATE" | "AFTER_DAYS" | "ON_DELIVERY";
  payoutAfterDays: number;
  // Livrare & garantii
  platformShippingEnabled: boolean;
  defaultShippingPayer: "BUYER" | "SELLER";
  aftersalesInfertileMonths: number;
  aftersalesSickHours: number;
  aftersalesDeadHours: number;
  dnaSexGuaranteeMandatory: boolean;
  // Comunicare
  emailEnabled: boolean;
  smsEnabled: boolean;
  // Continut & brand
  siteName: string;
  blogEnabled: boolean;
  fancyCategoryEnabled: boolean;
  // Experienta
  winAnimationEnabled: boolean;
  winSoundEnabled: boolean;
  reviewEditDays: number;
  // Facturare (date firma)
  companyName: string;
  companyCui: string;
  companyRegCom: string;
  companyAddress: string;
  companyIban: string;
  companyBank: string;
  companyVatPayer: boolean;
  invoiceSeries: string;
};

export const DEFAULT_SETTINGS: PlatformSettings = {
  commissionPercent: 12,
  assistedExtraPercent: 5,
  assistedListingEnabled: true,
  buyerPremiumPercent: 0,
  adminFeeEnabled: false,
  adminFeeCents: 0,
  platformCurrency: "EUR",
  minStartPriceCents: 10_000, // 100 EUR
  defaultDurationDays: 14,
  sellerChoosesDuration: false,
  snipeWindowMinutes: 5,
  extensionMinutes: 5,
  maxExtensions: 50,
  increments: [
    { upToCents: 10_000, stepCents: 500 }, // sub 100 EUR: pas 5
    { upToCents: 50_000, stepCents: 1_000 }, // 100–500: pas 10
    { upToCents: 100_000, stepCents: 2_500 }, // 500–1000: pas 25
    { upToCents: 500_000, stepCents: 5_000 }, // 1000–5000: pas 50
    { upToCents: null, stepCents: 10_000 }, // peste: pas 100
  ],
  newAccountBidLimitCents: 100_000, // 1000 EUR pana la prima tranzactie finalizata
  bidGuaranteeEnabled: false,
  bidGuaranteeThresholdCents: 50_000,
  paymentProvider: "mock",
  payoutMode: "IMMEDIATE",
  payoutAfterDays: 7,
  platformShippingEnabled: false,
  defaultShippingPayer: "BUYER",
  aftersalesInfertileMonths: 2,
  aftersalesSickHours: 24,
  aftersalesDeadHours: 24,
  dnaSexGuaranteeMandatory: false,
  emailEnabled: true,
  smsEnabled: false,
  siteName: "No.1 & Best Pigeons",
  blogEnabled: false,
  fancyCategoryEnabled: false,
  winAnimationEnabled: true,
  winSoundEnabled: false,
  reviewEditDays: 30,
  companyName: "",
  companyCui: "",
  companyRegCom: "",
  companyAddress: "",
  companyIban: "",
  companyBank: "",
  companyVatPayer: false,
  invoiceSeries: "NBP",
};

type Cache = { value: PlatformSettings; at: number } | null;
const g = globalThis as unknown as { __settingsCache?: Cache };

export async function getSettings(): Promise<PlatformSettings> {
  const cached = g.__settingsCache;
  if (cached && Date.now() - cached.at < 5_000) return cached.value;
  const rows = await prisma.platformSetting.findMany();
  const merged: PlatformSettings = { ...DEFAULT_SETTINGS };
  for (const row of rows) {
    if (row.key in merged) {
      try {
        (merged as Record<string, unknown>)[row.key] = JSON.parse(row.value);
      } catch {
        // valoare corupta -> ramane default
      }
    }
  }
  g.__settingsCache = { value: merged, at: Date.now() };
  return merged;
}

export async function setSetting(
  key: keyof PlatformSettings,
  value: unknown,
  actorId: string | null
): Promise<void> {
  const json = JSON.stringify(value);
  await prisma.$transaction([
    prisma.platformSetting.upsert({
      where: { key },
      update: { value: json },
      create: { key, value: json },
    }),
    prisma.auditLog.create({
      data: {
        actorId,
        action: "SETTING_CHANGED",
        entity: "PlatformSetting",
        entityId: key,
        dataJson: json,
      },
    }),
  ]);
  g.__settingsCache = null;
}

export function invalidateSettingsCache() {
  g.__settingsCache = null;
}
