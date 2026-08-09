import { auctionBus, type AuctionEvent } from "@/lib/events";

export const dynamic = "force-dynamic";

/** SSE: actualizari live pentru o licitatie (pret, oferte, prelungiri, inchidere). */
export async function GET(req: Request, ctx: { params: Promise<{ id: string }> }) {
  const { id } = await ctx.params;
  const encoder = new TextEncoder();

  const stream = new ReadableStream({
    start(controller) {
      const send = (event: AuctionEvent) => {
        try {
          controller.enqueue(encoder.encode(`data: ${JSON.stringify(event)}\n\n`));
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
