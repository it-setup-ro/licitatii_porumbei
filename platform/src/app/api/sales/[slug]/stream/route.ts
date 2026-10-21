import { auctionBus, type AuctionEvent } from "@/lib/events";
import { prisma } from "@/lib/db";
import { registerLiveStream } from "@/lib/live-streams";

export const dynamic = "force-dynamic";

/**
 * SSE pentru pagina unei licitații (lotul întreg), nu pentru un porumbel.
 *
 * Clientul: „dacă sunt cu pagina deschisă pe același porumbel de conturi
 * diferite se face actualizarea automat; dacă e pe un cont tot lotul și altul
 * licitează sau se termină timpul / prelungește, atunci nu se actualizează”.
 *
 * Un singur fir pe pagină, nu unul pe porumbel: un lot de cinci ar deschide
 * cinci conexiuni, iar browserul ține cel mult șase către același server pe
 * http — pagina ar rămâne blocată tocmai în minutele de licitație.
 *
 * Pe fir nu pleacă nimic personal (nici id-uri, nici nume): pagina află doar
 * că ceva s-a mișcat la un porumbel din licitație și își cere datele din nou.
 */
export type SaleLiveEvent =
  | { kind: "bid"; auctionId: string; priceCents: number; endsAt: string; extended: boolean }
  | { kind: "closed"; auctionId: string; priceCents: number }
  | { kind: "rescheduled"; auctionId: string; endsAt: string };

export async function GET(req: Request, ctx: { params: Promise<{ slug: string }> }) {
  const { slug } = await ctx.params;

  const sale = await prisma.sale.findFirst({
    where: { slug, archivedAt: null },
    select: {
      lots: {
        where: { status: { not: "DRAFT" } },
        select: { auctions: { where: { hiddenAt: null }, select: { id: true } } },
      },
    },
  });
  if (!sale) return new Response("not found", { status: 404 });

  const aiciE = new Set(sale.lots.flatMap((l) => l.auctions).map((a) => a.id));
  const encoder = new TextEncoder();

  const stream = new ReadableStream({
    start(controller) {
      let inchis = false;
      const scrie = (text: string) => {
        if (inchis) return;
        try {
          controller.enqueue(encoder.encode(text));
        } catch {
          inchis = true;
        }
      };

      // Primul octet pleacă acum: altfel browserul rămâne „în conectare” și
      // pierde exact ofertele din intervalul ăla.
      scrie(": ready\n\n");

      const send = (event: AuctionEvent) => {
        if (!aiciE.has(event.auctionId)) return;
        let util: SaleLiveEvent | null = null;
        if (event.kind === "bid")
          util = {
            kind: "bid",
            auctionId: event.auctionId,
            priceCents: event.priceCents,
            endsAt: event.endsAt,
            extended: event.extended,
          };
        else if (event.kind === "closed")
          util = { kind: "closed", auctionId: event.auctionId, priceCents: event.priceCents };
        else if (event.kind === "rescheduled")
          util = { kind: "rescheduled", auctionId: event.auctionId, endsAt: event.endsAt };
        if (util) scrie(`data: ${JSON.stringify(util)}\n\n`);
      };

      // Un singur canal pentru toată licitația: ascultăm tot ce mișcă și
      // păstrăm doar porumbeii de aici.
      auctionBus().on("auction:*", send);

      const keepalive = setInterval(() => scrie(": ping\n\n"), 15_000);

      const inchide = () => {
        if (inchis) return;
        inchis = true;
        auctionBus().off("auction:*", send);
        clearInterval(keepalive);
        uita();
        try {
          controller.close();
        } catch {
          // deja închis
        }
      };

      const uita = registerLiveStream(inchide);
      req.signal.addEventListener("abort", inchide);
    },
  });

  return new Response(stream, {
    headers: {
      "Content-Type": "text/event-stream",
      "Cache-Control": "no-cache, no-transform",
      Connection: "keep-alive",
      "X-Accel-Buffering": "no",
    },
  });
}
