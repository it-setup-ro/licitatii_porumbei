import { z } from "zod";
import { prisma } from "@/lib/db";
import { requireUser } from "@/lib/auth";
import { getSettings } from "@/lib/settings";
import {
  MAX_COUNT,
  MAX_MONEY_CENTS,
  SAFE_GALLERY_URL,
  SAFE_PEDIGREE_URL,
} from "@/lib/limits";
import { sanitizeTraits } from "@/lib/pigeon-traits";
import { editScope, needsReapproval, changedFields, appendNote } from "@/lib/lot-editing";
import { notify } from "@/lib/notify";
import { jsonOk, jsonError, handleApiError } from "@/lib/api";

/**
 * Modificarea unui lot de către crescător (sau de către admin, care poate orice).
 *
 * Cât poate schimba se decide AICI, din starea citită în bază — niciodată din
 * ce trimite pagina. Un formular poate fi ocolit; regula nu.
 */

const mediaSchema = z.object({
  url: z.string().max(300).regex(SAFE_GALLERY_URL),
  type: z.enum(["IMAGE", "VIDEO"]),
});

const resultSchema = z.object({
  raceName: z.string().min(1).max(120),
  year: z.number().int().min(1990).max(2100).optional(),
  distanceKm: z.number().int().positive().max(MAX_COUNT).optional(),
  place: z.number().int().positive().max(MAX_COUNT),
  participants: z.number().int().positive().max(MAX_COUNT).optional(),
});

/** Ce se poate trimite la o modificare completă. */
const fullSchema = z.object({
  ringNumber: z.string().min(3).max(40),
  birthYear: z.number().int().min(1990).max(2100),
  sex: z.enum(["M", "F", "U"]),
  name: z.string().min(2).max(120),
  taglineRo: z.string().max(200).optional(),
  taglineEn: z.string().max(200).optional(),
  descRo: z.string().max(20_000).optional(),
  descEn: z.string().max(20_000).optional(),
  bredBy: z.string().max(160).optional(),
  offeredBy: z.string().max(160).optional(),
  color: z.string().max(60).optional(),
  strain: z.string().max(120).optional(),
  pedigreeUrl: z.string().max(300).regex(SAFE_PEDIGREE_URL).optional().or(z.literal("")),
  traits: z.unknown().optional(),
  media: z.array(mediaSchema).max(12).default([]),
  results: z.array(resultSchema).max(30).default([]),
  startPriceCents: z.number().int().positive().max(MAX_MONEY_CENTS),
});

/**
 * Ce se poate trimite când lotul are deja oferte: doar adăugiri.
 * `.strict()` — o cerere care încearcă totuși să schimbe prețul sau seria
 * primește refuz, nu o reușită tăcută în care nu s-a schimbat nimic.
 */
const additionsSchema = z.strictObject({
  /** poze/clipuri NOI — cele existente rămân pe loc */
  addMedia: z.array(mediaSchema).max(12).default([]),
  /** o completare la descriere; textul vechi nu se rescrie */
  note: z.string().max(2000).optional(),
  /** pedigree-ul se poate adăuga dacă lipsea, dar nu se poate înlocui */
  pedigreeUrl: z.string().max(300).regex(SAFE_PEDIGREE_URL).optional().or(z.literal("")),
});

export async function POST(req: Request, ctx: { params: Promise<{ id: string }> }) {
  try {
    const user = await requireUser();
    const { id } = await ctx.params;
    const isAdmin = user.role === "ADMIN";

    const auction = await prisma.auction.findUnique({
      where: { id },
      include: { pigeon: { include: { media: true } }, _count: { select: { bids: true } } },
    });
    if (!auction) return jsonError("NOT_FOUND", 404);
    if (auction.sellerId !== user.id && !isAdmin) return jsonError("FORBIDDEN", 403);

    const scope = editScope(
      { status: auction.status, bidCount: auction._count.bids },
      isAdmin
    );
    if (scope === "NONE") return jsonError("LOT_LOCKED", 400);

    const payload = await req.json();

    // ─── lot cu oferte: doar adăugiri ───
    if (scope === "ADDITIONS_ONLY") {
      const body = additionsSchema.safeParse(payload);
      if (!body.success) return jsonError("VALIDATION", 422);
      const d = body.data;

      const sortStart = auction.pigeon.media.length;
      await prisma.$transaction([
        prisma.pigeon.update({
          where: { id: auction.pigeonId },
          data: {
            descRo: d.note ? appendNote(auction.pigeon.descRo, d.note) : undefined,
            descEn: d.note ? appendNote(auction.pigeon.descEn, d.note) : undefined,
            // pedigree-ul se completează doar dacă lipsea
            pedigreeUrl: auction.pigeon.pedigreeUrl ? undefined : d.pedigreeUrl || undefined,
          },
        }),
        ...(d.addMedia.length > 0
          ? [
              prisma.mediaAsset.createMany({
                data: d.addMedia.map((m, i) => ({
                  pigeonId: auction.pigeonId,
                  type: m.type,
                  url: m.url,
                  sortIdx: sortStart + i,
                })),
              }),
            ]
          : []),
        prisma.auditLog.create({
          data: {
            actorId: user.id,
            action: "LOT_SUPPLEMENTED",
            entity: "Auction",
            entityId: id,
            dataJson: JSON.stringify({ media: d.addMedia.length, note: Boolean(d.note) }),
          },
        }),
      ]);

      return jsonOk({ scope, reapproval: false });
    }

    // ─── modificare completă ───
    const body = fullSchema.safeParse(payload);
    if (!body.success) return jsonError("VALIDATION", 422);
    const d = body.data;

    const settings = await getSettings();
    if (d.startPriceCents < settings.minStartPriceCents) {
      return jsonError("START_PRICE_TOO_LOW", 400, { minimumCents: settings.minStartPriceCents });
    }

    const before = {
      ringNumber: auction.pigeon.ringNumber,
      birthYear: auction.pigeon.birthYear,
      sex: auction.pigeon.sex,
      startPriceCents: auction.startPriceCents,
    };
    const changed = changedFields(before, {
      ringNumber: d.ringNumber,
      birthYear: d.birthYear,
      sex: d.sex,
      startPriceCents: d.startPriceCents,
    });
    const reapproval = needsReapproval(
      { status: auction.status, bidCount: auction._count.bids },
      changed,
      isAdmin
    );

    const clean = sanitizeTraits(d.traits);

    await prisma.$transaction([
      prisma.pigeon.update({
        where: { id: auction.pigeonId },
        data: {
          ringNumber: d.ringNumber,
          birthYear: d.birthYear,
          sex: d.sex,
          name: d.name,
          taglineRo: d.taglineRo || null,
          taglineEn: d.taglineEn || d.taglineRo || null,
          descRo: d.descRo || null,
          descEn: d.descEn || d.descRo || null,
          bredBy: d.bredBy || null,
          offeredBy: d.offeredBy || null,
          color: d.color || null,
          strain: d.strain || null,
          pedigreeUrl: d.pedigreeUrl || null,
          traitsJson: Object.keys(clean).length > 0 ? JSON.stringify(clean) : null,
        },
      }),
      // media si palmaresul se rescriu din lista trimisa (ea e sursa adevarului)
      prisma.mediaAsset.deleteMany({ where: { pigeonId: auction.pigeonId } }),
      prisma.mediaAsset.createMany({
        data: d.media.map((m, i) => ({
          pigeonId: auction.pigeonId,
          type: m.type,
          url: m.url,
          sortIdx: i,
        })),
      }),
      prisma.pigeonResult.deleteMany({ where: { pigeonId: auction.pigeonId } }),
      prisma.pigeonResult.createMany({
        data: d.results.map((r) => ({ ...r, pigeonId: auction.pigeonId })),
      }),
      prisma.auction.update({
        where: { id },
        data: {
          startPriceCents: d.startPriceCents,
          ...(reapproval
            ? { status: "PENDING_APPROVAL", approvedAt: null, approvedById: null }
            : {}),
        },
      }),
      prisma.auditLog.create({
        data: {
          actorId: user.id,
          action: isAdmin ? "LOT_EDITED_BY_ADMIN" : "LOT_EDITED",
          entity: "Auction",
          entityId: id,
          dataJson: JSON.stringify({ changed, reapproval }),
        },
      }),
    ]);

    // adminul care corectează lotul altcuiva îl anunță pe crescător
    if (isAdmin && auction.sellerId !== user.id) {
      await notify(
        auction.sellerId,
        "LOT_EDITED_BY_ADMIN",
        { lot: d.name },
        `/account/lots`
      );
    }

    return jsonOk({ scope, reapproval });
  } catch (e) {
    return handleApiError(e);
  }
}
