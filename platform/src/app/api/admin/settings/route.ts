import { z } from "zod";
import { requireAdmin } from "@/lib/auth";
import { setSetting, type PlatformSettings } from "@/lib/settings";
import { MAX_COUNT, MAX_MONEY_CENTS } from "@/lib/limits";
import { jsonOk, jsonError, handleApiError } from "@/lib/api";

/**
 * Validare per-cheie cu intervale reale. Inainte se compara doar `typeof` cu
 * valoarea default, ceea ce lasa sa treaca: comision negativ sau 10000%, durata
 * 0 zile, moneda inexistenta si — cel mai grav — un `increments` de forma gresita
 * (array-ul trecea ca "object"), care arunca eroare la FIECARE oferta, blocand
 * licitarea pe toata platforma.
 */

const pct = z.number().min(0).max(100);
const money = z.number().int().min(0).max(MAX_MONEY_CENTS);

const incrementTier = z.object({
  upToCents: z.number().int().positive().max(MAX_MONEY_CENTS).nullable(),
  stepCents: z.number().int().positive().max(MAX_MONEY_CENTS),
});

const SETTING_SCHEMAS: Record<keyof PlatformSettings, z.ZodTypeAny> = {
  // Comercial
  commissionPercent: pct,
  assistedExtraPercent: pct,
  assistedListingEnabled: z.boolean(),
  buyerPremiumPercent: pct,
  adminFeeEnabled: z.boolean(),
  adminFeeCents: money,
  platformCurrency: z.enum(["EUR", "RON"]),
  minStartPriceCents: money,
  defaultDurationDays: z.number().int().min(1).max(365),
  sellerChoosesDuration: z.boolean(),
  // Licitare
  snipeWindowMinutes: z.number().int().min(0).max(1440),
  extensionMinutes: z.number().int().min(1).max(1440),
  maxExtensions: z.number().int().min(0).max(1000),
  increments: z.array(incrementTier).min(1).max(20),
  newAccountBidLimitCents: money,
  bidGuaranteeEnabled: z.boolean(),
  bidGuaranteeThresholdCents: money,
  // Plati
  paymentProvider: z.enum(["mock", "stripe"]),
  payoutMode: z.enum(["IMMEDIATE", "AFTER_DAYS", "ON_DELIVERY"]),
  payoutAfterDays: z.number().int().min(0).max(365),
  // Livrare & garantii
  platformShippingEnabled: z.boolean(),
  defaultShippingPayer: z.enum(["BUYER", "SELLER"]),
  aftersalesInfertileMonths: z.number().int().min(0).max(120),
  aftersalesSickHours: z.number().int().min(0).max(8760),
  aftersalesDeadHours: z.number().int().min(0).max(8760),
  dnaSexGuaranteeMandatory: z.boolean(),
  // Comunicare
  emailEnabled: z.boolean(),
  smsEnabled: z.boolean(),
  // Continut & brand
  siteName: z.string().min(1).max(80),
  blogEnabled: z.boolean(),
  fancyCategoryEnabled: z.boolean(),
  // Experienta
  winAnimationEnabled: z.boolean(),
  winSoundEnabled: z.boolean(),
  reviewEditDays: z.number().int().min(0).max(365),
  // Facturare
  companyName: z.string().max(200),
  companyCui: z.string().max(40),
  companyRegCom: z.string().max(60),
  companyAddress: z.string().max(300),
  companyIban: z.string().max(40),
  companyBank: z.string().max(120),
  companyVatPayer: z.boolean(),
  invoiceSeries: z.string().max(20),
};

const schema = z.object({ updates: z.record(z.string(), z.unknown()) });

export async function POST(req: Request) {
  try {
    const admin = await requireAdmin();
    const body = schema.safeParse(await req.json());
    if (!body.success) return jsonError("VALIDATION", 422);

    const applied: string[] = [];
    const rejected: string[] = [];

    for (const [key, value] of Object.entries(body.data.updates)) {
      const fieldSchema = SETTING_SCHEMAS[key as keyof PlatformSettings];
      if (!fieldSchema) {
        rejected.push(key);
        continue;
      }
      const parsed = fieldSchema.safeParse(value);
      if (!parsed.success) {
        rejected.push(key);
        continue;
      }
      await setSetting(key as keyof PlatformSettings, parsed.data, admin.id);
      applied.push(key);
    }

    if (applied.length === 0 && rejected.length > 0) {
      return jsonError("INVALID_VALUES", 400, { rejected });
    }
    return jsonOk({ applied, ...(rejected.length ? { rejected } : {}) });
  } catch (e) {
    return handleApiError(e);
  }
}
