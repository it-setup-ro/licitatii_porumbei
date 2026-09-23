import { yearFromRing } from "@/lib/pigeon";
import { z } from "zod";
import { prisma } from "@/lib/db";
import { alertAdmin } from "@/lib/alerts";
import { requireApprovedSeller } from "@/lib/auth";
import { getSettings } from "@/lib/settings";
import {
  MAX_COUNT,
  MAX_MONEY_CENTS,
  MAX_PEDIGREE_CHARS,
  SAFE_GALLERY_URL,
  SAFE_PEDIGREE_URL,
} from "@/lib/limits";
import { sanitizeTraits } from "@/lib/pigeon-traits";
import { jsonOk, jsonError, handleApiError } from "@/lib/api";

const resultSchema = z.object({
  raceName: z.string().min(1).max(120),
  year: z.number().int().min(1990).max(2100).optional(),
  distanceKm: z.number().int().positive().max(MAX_COUNT).optional(),
  place: z.number().int().positive().max(MAX_COUNT),
  participants: z.number().int().positive().max(MAX_COUNT).optional(),
});

/** Un strămoș din arborele genealogic. Adâncime limitată la 3 generații. */
const ancestorSchema: z.ZodType<unknown> = z.lazy(() =>
  z
    .object({
      ring: z.string().max(60).optional(),
      name: z.string().max(120).optional(),
      note: z.string().max(300).optional(),
      sire: ancestorSchema.optional(),
      dam: ancestorSchema.optional(),
    })
    .strict()
);

const pedigreeSchema = z
  .object({ sire: ancestorSchema.optional(), dam: ancestorSchema.optional() })
  .strict();

/** Poze si clipuri, in ordinea aleasa de crescator. */
const mediaSchema = z.object({
  // doar fisiere urcate pe platforma sau imaginile demo — nu URL-uri externe
  // (un URL extern ar functiona ca pixel de urmarire pentru fiecare vizitator)
  url: z.string().max(300).regex(SAFE_GALLERY_URL),
  type: z.enum(["IMAGE", "VIDEO"]),
});

const schema = z.object({
  ringNumber: z.string().min(3).max(40),
  // clientul: „e suficient inelul" — anul se deduce din serie
  birthYear: z.number().int().min(1990).max(2100).optional(),
  sex: z.enum(["M", "F", "U"]),
  color: z.string().max(60).optional(),
  strain: z.string().max(120).optional(),
  name: z.string().min(2).max(120),
  taglineRo: z.string().max(200).optional(),
  taglineEn: z.string().max(200).optional(),
  descRo: z.string().max(20_000).optional(),
  descEn: z.string().max(20_000).optional(),
  bredBy: z.string().max(160).optional(),
  offeredBy: z.string().max(160).optional(),
  pedigreeUrl: z.string().max(300).regex(SAFE_PEDIGREE_URL).optional().or(z.literal("")),
  pedigree: pedigreeSchema.optional(),
  /** caracteristicile din fisa (ochi, constitutie, aripa) — filtrate cu whitelist */
  traits: z.unknown().optional(),
  startPriceCents: z.number().int().positive().max(MAX_MONEY_CENTS),
  /** suma sub care crescatorul nu vinde; ramane ascunsa cumparatorilor */
  reservePriceCents: z.number().int().positive().max(MAX_MONEY_CENTS).optional(),
  listingType: z.enum(["SELF", "ASSISTED"]).default("SELF"),
  /** licitație sau preț fix (clientul, „Punctul 9") */
  saleMode: z.enum(["AUCTION", "FIXED"]).default("AUCTION"),
  shippingMode: z.enum(["SELLER", "PICKUP"]).default("SELLER"),
  dnaSexGuaranteed: z.boolean().default(false),
  media: z.array(mediaSchema).max(12).default([]),
  results: z.array(resultSchema).max(30).default([]),
});

/** Prețul fix stă pe site până se vinde; data de final e doar o plasă de siguranță. */
const FIXED_PRICE_YEARS = 10;

export async function POST(req: Request) {
  try {
    const seller = await requireApprovedSeller();
    // Clientul: porumbeii îi pun doar administratorii. Fluxul vechi rămâne doar
    // pentru ei, cât timp nu e pornit din Setări.
    if (seller.role !== "ADMIN" && !(await getSettings()).breederSelfServiceEnabled) {
      return jsonError("BREEDER_SELF_SERVICE_OFF", 403);
    }
    const body = schema.safeParse(await req.json());
    if (!body.success) return jsonError("VALIDATION", 422);
    const d = body.data;

    const settings = await getSettings();
    if (d.startPriceCents < settings.minStartPriceCents) {
      return jsonError("START_PRICE_TOO_LOW", 400, {
        minimumCents: settings.minStartPriceCents,
      });
    }
    if (d.listingType === "ASSISTED" && !settings.assistedListingEnabled) {
      return jsonError("ASSISTED_DISABLED", 400);
    }

    // pedigree-ul e re-parsat la fiecare afisare a lotului — limitam dimensiunea
    const pedigreeJson = d.pedigree ? JSON.stringify(d.pedigree) : null;
    if (pedigreeJson && pedigreeJson.length > MAX_PEDIGREE_CHARS) {
      return jsonError("PEDIGREE_TOO_LARGE", 400);
    }

    // Durata: setata de platforma (client-decisions D15); startul efectiv il da adminul la aprobare.
    // Clientul, „Punctul 9": porumbelul cu preț fix se salvează și se postează.
    // Îl pune adminul, deci nu mai așteaptă o aprobare.
    const fixed = d.saleMode === "FIXED";
    const postNow = fixed && seller.role === "ADMIN";
    const startsAt = postNow ? new Date() : new Date(Date.now() + 24 * 3_600_000);
    const endsAt = fixed
      ? new Date(startsAt.getTime() + FIXED_PRICE_YEARS * 365 * 86_400_000)
      : new Date(startsAt.getTime() + settings.defaultDurationDays * 86_400_000);

    const pigeon = await prisma.pigeon.create({
      data: {
        sellerId: seller.id,
        ringNumber: d.ringNumber,
        birthYear: d.birthYear ?? yearFromRing(d.ringNumber),
        sex: d.sex,
        color: d.color,
        strain: d.strain,
        category: "RACING",
        name: d.name,
        taglineRo: d.taglineRo || null,
        taglineEn: d.taglineEn || d.taglineRo || null,
        descRo: d.descRo,
        descEn: d.descEn,
        bredBy: d.bredBy || null,
        // daca nu spune altcineva, porumbelul e oferit de cel care il listeaza
        offeredBy: d.offeredBy || seller.sellerCompany || seller.name,
        pedigreeUrl: d.pedigreeUrl || null,
        pedigreeJson,
        traitsJson: (() => {
          const clean = sanitizeTraits(d.traits);
          return Object.keys(clean).length > 0 ? JSON.stringify(clean) : null;
        })(),
        media: {
          create: d.media.map((m, i) => ({ type: m.type, url: m.url, sortIdx: i })),
        },
        results: { create: d.results },
        auction: {
          create: {
            sellerId: seller.id,
            status: postNow ? "LIVE" : "PENDING_APPROVAL",
            saleMode: d.saleMode,
            ...(fixed ? { currentPriceCents: d.startPriceCents } : {}),
            ...(postNow ? { approvedAt: new Date(), approvedById: seller.id } : {}),
            listingType: d.listingType,
            currency: settings.platformCurrency,
            startPriceCents: d.startPriceCents,
            reservePriceCents:
              !fixed && settings.reservePriceEnabled && d.reservePriceCents && d.reservePriceCents > d.startPriceCents
                ? d.reservePriceCents
                : null,
            startsAt,
            endsAt,
            originalEndsAt: endsAt,
            shippingMode: d.shippingMode,
            shippingPayer: settings.defaultShippingPayer,
            dnaSexGuaranteed: d.dnaSexGuaranteed || settings.dnaSexGuaranteeMandatory,
          },
        },
      },
      include: { auction: true },
    });

    if (pigeon.auction?.status === "PENDING_APPROVAL") {
      await alertAdmin("PIGEON_PENDING", {
        titlu: `${pigeon.name ?? pigeon.ringNumber}`,
        linii: [`Inel: ${pigeon.ringNumber}`, `Trimis de: ${seller.name ?? seller.email}`],
        cale: "/ro/admin/lots",
      });
    }

    return jsonOk({
      pigeonId: pigeon.id,
      auctionId: pigeon.auction?.id,
      status: pigeon.auction?.status,
    });
  } catch (e) {
    return handleApiError(e);
  }
}
