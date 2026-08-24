import { auctionBus, type AuctionEvent } from "@/lib/events";
import { getSession } from "@/lib/auth";

export const dynamic = "force-dynamic";

/**
 * SSE: actualizari live pentru o licitatie (pret, oferte, prelungiri, inchidere).
 *
 * Confidentialitate: fluxul e public (oricine poate urmari o licitatie), asa ca
 * NU trimitem id-urile utilizatorilor pe fir. Serverul le compara cu sesiunea
 * curenta si trimite doar `youAreLeading` / `youWon` — altfel oricine ar putea
 * corela in timp real cine liciteaza pe ce, desi numele sunt mascate in pagina.
 */
export async function GET(req: Request, ctx: { params: Promise<{ id: string }> }) {
  const { id } = await ctx.params;
  const session = await getSession();
  const viewerId = session?.uid ?? null;
  const encoder = new TextEncoder();

  const toPublic = (event: AuctionEvent) => {
    if (event.kind === "bid") {
      const { leadingBidderId, ...rest } = event;
      return { ...rest, youAreLeading: viewerId !== null && leadingBidderId === viewerId };
    }
    if (event.kind === "closed") {
      const { winnerId, ...rest } = event;
      return { ...rest, youWon: viewerId !== null && winnerId === viewerId };
    }
    // „rescheduled": doar noua ora de inchidere, nimic personal
    return event;
  };

  const stream = new ReadableStream({
    start(controller) {
      const send = (event: AuctionEvent) => {
        try {
          controller.enqueue(encoder.encode(`data: ${JSON.stringify(toPublic(event))}\n\n`));
        } catch {
          // stream inchis
        }
      };
      const channel = `auction:${id}`;
      auctionBus().on(channel, send);

      const keepalive = setInterval(() => {
        try {
          controller.enqueue(encoder.encode(`: ping\n\n`));
        } catch {
          clearInterval(keepalive);
        }
      }, 25_000);

      req.signal.addEventListener("abort", () => {
        auctionBus().off(channel, send);
        clearInterval(keepalive);
        try {
          controller.close();
        } catch {
          // deja inchis
        }
      });
    },
  });

  return new Response(stream, {
    headers: {
      "Content-Type": "text/event-stream",
      "Cache-Control": "no-cache, no-transform",
      Connection: "keep-alive",
    },
  });
}
