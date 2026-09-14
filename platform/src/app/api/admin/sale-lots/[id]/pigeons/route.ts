import { z } from "zod";
import { prisma } from "@/lib/db";
import { requireAdmin } from "@/lib/auth";
import { getSettings } from "@/lib/settings";
import { MAX_MONEY_CENTS } from "@/lib/limits";
import { jsonOk, jsonError, handleApiError, jsonValidationError } from "@/lib/api";

/**
 * Un porumbel nou într-un lot în ciornă.
 *
 * Aici se cer doar datele de identificare și prețul. Pozele, pedigree-ul,
 * video-ul și restul fișei se completează în pagina porumbelului, cu același
 * formular folosit și până acum.
 */

const schema = z.object({
  ringNumber: z.string().trim().min(3, "Scrie seria inelului.").max(40),
  birthYear: z
    .number({ message: "Scrie anul." })
    .int()
    .min(1990, "An prea vechi.")
    .max(2100, "An în viitor."),
  sex: z.enum(["M", "F", "U"], { message: "Alege sexul." }),
  name: z.string().trim().min(2, "Scrie numele porumbelului.").max(120),
  startPriceCents: z
    .number({ message: "Scrie prețul de pornire." })
    .int()
    .positive("Prețul de pornire trebuie să fie mai mare decât zero.")
    .max(MAX_MONEY_CENTS),
  reservePriceCents: z.number().int().positive().max(MAX_MONEY_CENTS).nullable().optional(),
});

export async function POST(req: Request, ctx: { params: Promise<{ id: string }> }) {
  try {
    const admin = await requireAdmin();
    const { id: lotId } = await ctx.params;
    const body = schema.safeParse(await req.json());
    if (!body.success) return jsonValidationError(body.error);
    const d = body.data;

    const settings = await getSettings();
    if (d.startPriceCents < settings.minStartPriceCents) {
      return jsonError("VALIDATION", 422, {
        fields: {
          startPriceCents: `Prețul de pornire minim e ${settings.minStartPriceCents / 100} ${settings.platformCurrency}.`,
        },
      });
    }

    const lot = await prisma.lot.findUnique({
      where: { id: lotId },
      include: {
        sale: { include: { breeder: true } },
        auctions: { select: { lotPosition: true } },
      },
    });
    if (!lot) return jsonError("NOT_FOUND", 404);
    // porumbei noi doar într-un lot în ciornă: unul programat se scoate întâi din program
    if (lot.status !== "DRAFT") return jsonError("LOT_NOT_DRAFT", 409);
    if (lot.auctions.length >= settings.lotMaxPigeons) {
      return jsonError("LOT_FULL", 409, { max: settings.lotMaxPigeons });
    }

    const position = Math.max(0, ...lot.auctions.map((a) => a.lotPosition ?? 0)) + 1;

    const pigeon = await prisma.pigeon.create({
      data: {
        // porumbeii din loturi îi introduce administratorul; crescătorul e în licitație
        sellerId: admin.id,
        ringNumber: d.ringNumber,
        birthYear: d.birthYear,
        sex: d.sex,
        name: d.name,
        category: "RACING",
        offeredBy: lot.sale.breeder.name,
        auction: {
          create: {
            sellerId: admin.id,
            status: "DRAFT",
            currency: settings.platformCurrency,
            startPriceCents: d.startPriceCents,
            reservePriceCents:
              settings.reservePriceEnabled &&
              d.reservePriceCents &&
              d.reservePriceCents > d.startPriceCents
                ? d.reservePriceCents
                : null,
            startsAt: lot.startsAt,
            endsAt: lot.endsAt,
            originalEndsAt: lot.endsAt,
            lotId: lot.id,
            lotPosition: position,
          },
        },
      },
      include: { auction: true },
    });

    await prisma.auditLog.create({
      data: {
        actorId: admin.id,
        action: "LOT_PIGEON_ADDED",
        entity: "Auction",
        entityId: pigeon.auction!.id,
        dataJson: JSON.stringify({ lotId, position }),
      },
    });

    return jsonOk({ auctionId: pigeon.auction!.id, position });
  } catch (e) {
    return handleApiError(e);
  }
}
