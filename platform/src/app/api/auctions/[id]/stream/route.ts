import { auctionBus, type AuctionEvent } from "@/lib/events";
import { getSession } from "@/lib/auth";
import { prisma } from "@/lib/db";
import { getSettings } from "@/lib/settings";
import { incrementFor } from "@/lib/bidding";
import { bidderCountForAuction, nextMinimumForAuction, reserveState } from "@/lib/auction-service";
import { publicBidderName } from "@/lib/mask-name";

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
    if (event.kind === "bid" || event.kind === "sync") {
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

      // Primul octet pleacă acum, nu la primul eveniment: altfel antetele stau
      // în așteptare, browserul rămâne „în conectare” și ofertele din acel
      // interval nu ajung la el niciodată.
      void (async () => {
        try {
          const [auction, settings] = await Promise.all([
            prisma.auction.findUnique({
              where: { id },
              select: {
                currentPriceCents: true,
                startPriceCents: true,
                reservePriceCents: true,
                endsAt: true,
                _count: { select: { bids: true } },
              },
            }),
            getSettings(),
          ]);
          if (!auction) return;
          const ultimele = await prisma.bid.findMany({
            where: { auctionId: id },
            orderBy: { createdAt: "desc" },
            take: 10,
            include: { bidder: { select: { nickname: true, name: true } } },
          });
          const [bidderCount, leading, minNext] = await Promise.all([
            bidderCountForAuction(id),
            prisma.bid.findFirst({
              where: { auctionId: id, isLeading: true },
              select: { id: true, bidderId: true },
            }),
            nextMinimumForAuction(id),
          ]);
          const priceCents =
            auction._count.bids > 0 ? auction.currentPriceCents : auction.startPriceCents;
          send({
            kind: "sync",
            auctionId: id,
            priceCents,
            minNextCents: minNext ?? priceCents,
            stepCents: incrementFor(priceCents, settings.increments),
            bidCount: auction._count.bids,
            bidderCount,
            reserve: reserveState(auction.reservePriceCents, priceCents),
            leadingBidderId: leading?.bidderId ?? null,
            endsAt: auction.endsAt.toISOString(),
            bids: ultimele.map((b) => ({
              id: b.id,
              name: publicBidderName(b.bidder.nickname, b.bidder.name),
              amountCents: b.amountCents,
              at: b.createdAt.toISOString(),
            })),
            leadingBidId: leading?.id ?? null,
          });
        } catch {
          // dacă starea nu se poate citi, fluxul rămâne deschis pentru evenimente
        }
      })();

      const keepalive = setInterval(() => {
        try {
          controller.enqueue(encoder.encode(`: ping\n\n`));
        } catch {
          clearInterval(keepalive);
        }
      }, 15_000);

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
      // dacă mai târziu apare un nginx în față, să nu adune fluxul în tampon
      "X-Accel-Buffering": "no",
    },
  });
}
