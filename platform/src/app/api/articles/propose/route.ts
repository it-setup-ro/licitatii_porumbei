import { z } from "zod";
import { prisma } from "@/lib/db";
import { requireApprovedSeller } from "@/lib/auth";
import { clientIp, rateLimit } from "@/lib/rate-limit";
import { jsonOk, jsonTooManyRequests, handleApiError, jsonValidationError } from "@/lib/api";
import { alertAdmin } from "@/lib/alerts";

/**
 * „Propune un articol": crescătorul scrie, administratorul publică.
 *
 * Până acum articolele veneau numai de la admin, deși povestea o are
 * crescătorul. Propunerea intră nepublicată — pe site nu apare nimic până când
 * cineva o citește.
 */
const schema = z.object({
  title: z.string().trim().min(5, "Scrie un titlu (cel puțin 5 litere).").max(200),
  body: z.string().trim().min(100, "Scrie mai mult — cel puțin 100 de litere.").max(30_000),
  media: z
    .array(z.object({ url: z.string().max(500), type: z.enum(["IMAGE", "VIDEO"]) }))
    .max(10)
    .optional(),
});

/** „Povestea lui Fulger" -> „povestea-lui-fulger-7f3a" (unic, fără diacritice). */
function slugify(titlu: string): string {
  const baza = titlu
    .normalize("NFD")
    .replace(/[̀-ͯ]/g, "")
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/-{2,}/g, "-")
    .replace(/^-|-$/g, "")
    .slice(0, 60);
  const coada = Math.random().toString(36).slice(2, 6);
  return `${baza || "articol"}-${coada}`;
}

export async function POST(req: Request) {
  try {
    const autor = await requireApprovedSeller();

    // un om, câteva propuneri pe zi: cât să nu se transforme în reclamă
    const limita = rateLimit(`propose:${autor.id}:${clientIp(req)}`, 3, 24 * 60 * 60_000);
    if (!limita.allowed) return jsonTooManyRequests(limita.retryAfterSeconds);

    const body = schema.safeParse(await req.json());
    if (!body.success) return jsonValidationError(body.error);
    const d = body.data;

    const propus = await prisma.article.create({
      data: {
        slug: slugify(d.title),
        titleRo: d.title,
        // fără traducere încă: adminul o scrie când publică
        titleEn: d.title,
        bodyRo: d.body,
        bodyEn: d.body,
        coverUrl: d.media?.find((m) => m.type === "IMAGE")?.url ?? null,
        authorName: autor.sellerCompany || autor.name || "Crescător",
        proposedById: autor.id,
        proposedAt: new Date(),
        publishedAt: null,
        ...(d.media && d.media.length > 0
          ? {
              media: {
                create: d.media.map((m, i) => ({ url: m.url, type: m.type, sortIdx: i })),
              },
            }
          : {}),
      },
    });

    await alertAdmin("ARTICLE_PROPOSAL", {
      titlu: d.title,
      linii: [`Propus de: ${autor.name ?? autor.email}`, `Lungime: ${d.body.length} de caractere`],
      cale: "/ro/admin/articles",
    });

    return jsonOk({ id: propus.id });
  } catch (e) {
    return handleApiError(e);
  }
}
