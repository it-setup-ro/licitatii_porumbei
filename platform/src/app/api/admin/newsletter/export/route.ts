import { prisma } from "@/lib/db";
import { requireAdmin } from "@/lib/auth";
import { handleApiError } from "@/lib/api";

/**
 * Exportul listei, in CSV.
 *
 * Ies doar abonatii activi: cine s-a dezabonat n-are ce cauta intr-un fisier
 * care ajunge intr-un serviciu de trimitere. Textul acordului merge cu ei,
 * ca dovada sa nu ramana doar la noi in baza.
 */
export async function GET() {
  try {
    await requireAdmin();
    const rows = await prisma.newsletterSubscriber.findMany({
      where: { unsubscribedAt: null },
      orderBy: { createdAt: "asc" },
    });

    // punem un apostrof in fata semnelor cu care Excel porneste o formula
    const cell = (v: string) => {
      const safe = /^[=+\-@]/.test(v) ? `'${v}` : v;
      return `"${safe.replace(/"/g, '""')}"`;
    };

    const csv = [
      ["email", "limba", "acord_la", "text_acord"].join(","),
      ...rows.map((r) =>
        [cell(r.email), cell(r.locale), cell(r.consentAt.toISOString()), cell(r.consentText)].join(
          ","
        )
      ),
    ].join("\r\n");

    return new Response("\uFEFF" + csv, {
      headers: {
        "Content-Type": "text/csv; charset=utf-8",
        "Content-Disposition": `attachment; filename="abonati-newsletter-${new Date().toISOString().slice(0, 10)}.csv"`,
      },
    });
  } catch (e) {
    return handleApiError(e);
  }
}
