import { z } from "zod";
import { prisma } from "@/lib/db";
import { requireAdmin } from "@/lib/auth";
import { SAFE_ARTICLE_MEDIA_URL } from "@/lib/limits";
import { jsonOk, jsonError, handleApiError } from "@/lib/api";

/**
 * Publicarea unui articol, in stil „scrie si posteaza": titlu + text + fisiere.
 *
 * Restul se completeaza singur:
 *  - slug-ul, din titlu (cu sufix numeric daca exista deja)
 *  - rezumatul, din primele randuri ale textului
 *  - versiunea EN, copiata din RO daca nu e completata explicit — site-ul e
 *    bilingv, iar un articol fara EN ar aparea gol pentru vizitatorii straini
 */

const mediaSchema = z.object({
  url: z.string().max(300).regex(SAFE_ARTICLE_MEDIA_URL),
  type: z.enum(["IMAGE", "VIDEO"]),
});

const schema = z.object({
  id: z.string().max(40).optional(),
  title: z.string().min(3).max(200),
  body: z.string().min(1).max(50_000),
  /** completate doar daca adminul deschide sectiunea de traducere */
  titleEn: z.string().max(200).optional(),
  bodyEn: z.string().max(50_000).optional(),
  media: z.array(mediaSchema).max(10).default([]),
  published: z.boolean().default(true),
});

const DIACRITICS: Record<string, string> = {
  ă: "a", â: "a", î: "i", ș: "s", ş: "s", ț: "t", ţ: "t",
};

function slugify(text: string): string {
  const base = text
    .toLowerCase()
    .replace(/[ăâîșşțţ]/g, (c) => DIACRITICS[c] ?? c)
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, 80);
  return base || "articol";
}

/** Primele ~180 de caractere, taiate la sfarsit de propozitie/cuvant. */
function excerptFrom(body: string): string {
  const flat = body.replace(/\s+/g, " ").trim();
  if (flat.length <= 180) return flat;
  const cut = flat.slice(0, 180);
  const lastStop = Math.max(cut.lastIndexOf(". "), cut.lastIndexOf("! "), cut.lastIndexOf("? "));
  if (lastStop > 90) return cut.slice(0, lastStop + 1);
  return cut.slice(0, cut.lastIndexOf(" ")) + "…";
}

async function uniqueSlug(base: string, ignoreId?: string): Promise<string> {
  let candidate = base;
  for (let i = 2; i < 100; i++) {
    const existing = await prisma.article.findUnique({ where: { slug: candidate } });
    if (!existing || existing.id === ignoreId) return candidate;
    candidate = `${base}-${i}`;
  }
  return `${base}-${Date.now()}`;
}

export async function POST(req: Request) {
  try {
    const admin = await requireAdmin();
    const body = schema.safeParse(await req.json());
    if (!body.success) return jsonError("VALIDATION", 422);
    const d = body.data;

    const existing = d.id ? await prisma.article.findUnique({ where: { id: d.id } }) : null;
    if (d.id && !existing) return jsonError("NOT_FOUND", 404);

    // slug-ul se recalculeaza doar daca titlul s-a schimbat (ca sa nu strice linkuri existente)
    const slug =
      existing && existing.titleRo === d.title
        ? existing.slug
        : await uniqueSlug(slugify(d.title), d.id);

    const firstImage = d.media.find((m) => m.type === "IMAGE")?.url ?? null;

    const data = {
      slug,
      titleRo: d.title,
      titleEn: d.titleEn?.trim() || d.title,
      bodyRo: d.body,
      bodyEn: d.bodyEn?.trim() || d.body,
      excerptRo: excerptFrom(d.body),
      excerptEn: excerptFrom(d.bodyEn?.trim() || d.body),
      coverUrl: firstImage,
      publishedAt: d.published ? (existing?.publishedAt ?? new Date()) : null,
    };

    const saved = d.id
      ? await prisma.article.update({ where: { id: d.id }, data })
      : await prisma.article.create({ data });

    // media se rescrie complet la fiecare salvare (lista din compozitor e sursa adevarului)
    await prisma.articleMedia.deleteMany({ where: { articleId: saved.id } });
    if (d.media.length > 0) {
      await prisma.articleMedia.createMany({
        data: d.media.map((m, i) => ({
          articleId: saved.id,
          type: m.type,
          url: m.url,
          sortIdx: i,
        })),
      });
    }

    await prisma.auditLog.create({
      data: {
        actorId: admin.id,
        action: d.id ? "ARTICLE_UPDATED" : "ARTICLE_CREATED",
        entity: "Article",
        entityId: saved.id,
      },
    });

    return jsonOk({ id: saved.id, slug: saved.slug });
  } catch (e) {
    if ((e as { code?: string }).code === "P2002") return jsonError("SLUG_TAKEN", 409);
    return handleApiError(e);
  }
}
