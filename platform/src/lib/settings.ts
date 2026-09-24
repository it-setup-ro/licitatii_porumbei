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
  /** lângă fiecare preț apare echivalentul în cealaltă monedă (lei / €) */
  currencyEquivalentEnabled: boolean;
  /** de unde se ia cursul euro: BNR, zilnic, sau cel scris de administrator */
  fxMode: "BNR" | "MANUAL";
  /** lei pentru un euro, scris de administrator */
  fxManualRate: number;
  /** ultimul curs BNR preluat și ziua lui — le scrie serverul, nu formularul */
  fxBnrRate: number;
  fxBnrDate: string;
  minStartPriceCents: number;
  /** transportul pentru comenzile din magazin (nu pentru porumbei) */
  shopShippingCents: number;
  defaultDurationDays: number;
  sellerChoosesDuration: boolean;
  /** crescatorii pot pune un pret de rezerva (suma ramane ascunsa) */
  reservePriceEnabled: boolean;
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
  /* Datele de contact si retelele — apar in subsol. Goale = randul lipseste,
     ca sa nu scrie nimeni un telefon inventat pe pagina de start. */
  contactEmail: string;
  contactPhone: string;
  contactCity: string;
  /** Adresa completă și programul, cerute de client în subsol, la Contact. */
  contactAddress: string;
  contactSchedule: string;
  facebookUrl: string;
  youtubeUrl: string;
  instagramUrl: string;
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
  /** UNELTE DE TEST — se sting de aici cand platforma intra pe public */
  testShortenEnabled: boolean;
  // Licitatii pe crescatori si loturi
  /** cati porumbei incap intr-un lot */
  lotMaxPigeons: number;
  /** cate loturi are o licitatie de crescator */
  saleMaxLots: number;
  /** cu cate minute inainte de finalul unui lot pleaca avizul */
  endingNoticeMinutes: number;
  /**
   * avizul general „se încheie o licitație" și la cei care n-au licitat. Oprit:
   * pe planul gratuit de e-mail (300 / zi) pleacă doar la cei care au licitat.
   */
  endingNoticeGeneralEnabled: boolean;
  /** conturile noi asteapta aprobarea administratorului inainte sa liciteze */
  accountApprovalRequired: boolean;
  /** crescatorii isi pot pune singuri porumbeii (fluxul vechi, oprit) */
  breederSelfServiceEnabled: boolean;
};

export const DEFAULT_SETTINGS: PlatformSettings = {
  commissionPercent: 12,
  assistedExtraPercent: 5,
  assistedListingEnabled: true,
  buyerPremiumPercent: 0,
  adminFeeEnabled: false,
  adminFeeCents: 0,
  platformCurrency: "EUR",
  currencyEquivalentEnabled: true,
  fxMode: "BNR",
  fxManualRate: 0,
  fxBnrRate: 0,
  fxBnrDate: "",
  minStartPriceCents: 10_000, // 100 EUR
  shopShippingCents: 2_500, // 25 EUR, cât era scris în cod
  defaultDurationDays: 14,
  sellerChoosesDuration: false,
  reservePriceEnabled: true,
  // cerinta clientului: o oferta in ultimele 10 minute prelungeste cu 10
  snipeWindowMinutes: 10,
  extensionMinutes: 10,
  // 0 = fara limita: „pana nu mai liciteaza nimeni"
  maxExtensions: 0,
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
  siteName: "No.1° & Best Racing Pigeons",
  blogEnabled: false,
  contactEmail: "",
  contactPhone: "",
  contactCity: "",
  contactAddress: "",
  contactSchedule: "",
  facebookUrl: "",
  youtubeUrl: "",
  instagramUrl: "",
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
  // activ cat timp platforma e in testare; se stinge din Setari inainte de lansare
  testShortenEnabled: true,
  lotMaxPigeons: 20,
  saleMaxLots: 5,
  endingNoticeMinutes: 30,
  endingNoticeGeneralEnabled: false,
  accountApprovalRequired: true,
  // clientul: „Porumbeii îi pune doar ADMINISTRATORUL. Exclus să pună altcineva!"
  breederSelfServiceEnabled: false,
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
