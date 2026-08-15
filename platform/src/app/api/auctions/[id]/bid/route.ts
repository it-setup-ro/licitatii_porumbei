import { z } from "zod";
import { MAX_MONEY_CENTS } from "@/lib/limits";
import { requireUser } from "@/lib/auth";
import { placeBid } from "@/lib/auction-service";
import { sweepAuctions } from "@/lib/auction-service";
import { jsonOk, jsonError, handleApiError } from "@/lib/api";

const schema = z.object({
  // plafon superior obligatoriu: fara el, o oferta de miliarde ar depasi coloana
  // Int din Postgres (eroare 500) sau ar genera comenzi fictive uriase
  maxCents: z.number().int().positive().max(MAX_MONEY_CENTS),
});

export async function POST(req: Request, ctx: { params: Promise<{ id: string }> }) {
  try {
    const user = await requireUser();
    const { id } = await ctx.params;
    const body = schema.safeParse(await req.json());
    if (!body.success) return jsonError("VALIDATION", 422);

    // oportunist: porneste/inchide licitatiile scadente inainte de a valida oferta
    await sweepAuctions();

    const result = await placeBid(id, user.id, body.data.maxCents);
    if (!result.ok) {
      return jsonError(result.error, 400, {
        minimumCents: result.minimumCents,
        limitCents: result.limitCents,
      });
    }
    return jsonOk({
      priceCents: result.priceCents,
      leading: result.leading,
      extended: result.extended,
      endsAt: result.endsAt.toISOString(),
    });
  } catch (e) {
    return handleApiError(e);
  }
}
