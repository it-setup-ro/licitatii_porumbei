import { z } from "zod";
import { prisma } from "@/lib/db";
import { requireApprovedSeller } from "@/lib/auth";
import { getSettings } from "@/lib/settings";
import { MAX_COUNT, MAX_MONEY_CENTS, MAX_PEDIGREE_CHARS, SAFE_MEDIA_URL } from "@/lib/limits";
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

const schema = z.object({
  ringNumber: z.string().min(3).max(40),
  birthYear: z.number().int().min(1990).max(2100),
  sex: z.enum(["M", "F", "U"]),
  color: z.string().max(60).optional(),
  strain: z.string().max(120).optional(),
  titleRo: z.string().min(5).max(160),
  titleEn: z.string().min(5).max(160),
  descRo: z.string().max(4000).optional(),
  descEn: z.string().max(4000).optional(),
  pedigree: pedigreeSchema.optional(),
  startPriceCents: z.number().int().positive().max(MAX_MONEY_CENTS),
  listingType: z.enum(["SELF", "ASSISTED"]).default("SELF"),
  shippingMode: z.enum(["SELLER", "PICKUP"]).default("SELLER"),
  dnaSexGuaranteed: z.boolean().default(false),
  // doar poze urcate pe platforma sau imaginile demo — nu URL-uri externe
  // (un URL extern ar functiona ca pixel de urmarire pentru fiecare vizitator)
  mediaUrls: z.array(z.string().max(300).regex(SAFE_MEDIA_URL)).max(12).default([]),
  results: z.array(resultSchema).max(30).default([]),
});

export async function POST(req: Request) {
  try {
    const seller = await requireApprovedSeller();
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
    const startsAt = new Date(Date.now() + 24 * 3_600_000);
    const endsAt = new Date(startsAt.getTime() + settings.defaultDurationDays * 86_400_000);

    const pigeon = await prisma.pigeon.create({
      data: {
        sellerId: seller.id,
        ringNumber: d.ringNumber,
        birthYear: d.birthYear,
        sex: d.sex,
        color: d.color,
        strain: d.strain,
        category: "RACING",
        titleRo: d.titleRo,
        titleEn: d.titleEn,
        descRo: d.descRo,
        descEn: d.descEn,
        pedigreeJson,
        media: {
          create: d.mediaUrls.map((url, i) => ({ type: "IMAGE", url, sortIdx: i })),
        },
        results: { create: d.results },
        auction: {
          create: {
            sellerId: seller.id,
            status: "PENDING_APPROVAL",
            listingType: d.listingType,
            currency: settings.platformCurrency,
            startPriceCents: d.startPriceCents,
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

    return jsonOk({ pigeonId: pigeon.id, auctionId: pigeon.auction?.id });
  } catch (e) {
    return handleApiError(e);
  }
}
