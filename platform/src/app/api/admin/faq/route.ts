import { z } from "zod";
import { prisma } from "@/lib/db";
import { requireAdmin } from "@/lib/auth";
import { jsonOk, handleApiError, jsonValidationError } from "@/lib/api";
import { FAQ_CATEGORIES } from "@/lib/faq";

const schema = z.object({
  id: z.string().optional(),
  category: z.enum(FAQ_CATEGORIES),
  questionRo: z.string().trim().min(3, "Scrie întrebarea.").max(300),
  questionEn: z.string().trim().min(3, "Scrie întrebarea în engleză.").max(300),
  answerRo: z.string().trim().min(3, "Scrie răspunsul.").max(5_000),
  answerEn: z.string().trim().min(3, "Scrie răspunsul în engleză.").max(5_000),
  sortIdx: z.number().int().min(0).max(999).optional(),
  published: z.boolean().optional(),
});

/** Scrie o întrebare de la Ajutor — una nouă sau una existentă. */
export async function POST(req: Request) {
  try {
    const admin = await requireAdmin();
    const body = schema.safeParse(await req.json());
    if (!body.success) return jsonValidationError(body.error);
    const { id, ...date } = body.data;

    const salvat = id
      ? await prisma.faqItem.update({ where: { id }, data: date })
      : await prisma.faqItem.create({ data: { ...date, sortIdx: date.sortIdx ?? 0 } });

    await prisma.auditLog.create({
      data: {
        actorId: admin.id,
        action: id ? "FAQ_UPDATED" : "FAQ_CREATED",
        entity: "FaqItem",
        entityId: salvat.id,
        dataJson: JSON.stringify({ intrebare: salvat.questionRo }),
      },
    });
    return jsonOk({ id: salvat.id });
  } catch (e) {
    return handleApiError(e);
  }
}
