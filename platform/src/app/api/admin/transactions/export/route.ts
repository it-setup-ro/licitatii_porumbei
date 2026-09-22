import ExcelJS from "exceljs";
import { prisma } from "@/lib/db";
import { requireAdmin } from "@/lib/auth";
import { getSettings } from "@/lib/settings";
import { lotLabel } from "@/lib/lots";
import { handleApiError } from "@/lib/api";

/**
 * Istoricul tranzacțiilor în Excel, cu aceleași filtre ca pagina din
 * administrare. Contabilul cere un fișier, nu capturi de ecran.
 */

const STATUS: Record<string, string> = {
  PENDING_PAYMENT: "Așteaptă plata",
  PAID: "Plătit",
  SHIPPED: "Plătit",
  DELIVERED: "Predat",
  CANCELLED: "Anulat",
  DISPUTED: "În dispută",
};
const METODA: Record<string, string> = { TRANSFER: "Transfer", CASH: "Numerar" };

export async function GET(req: Request) {
  try {
    await requireAdmin();
    const url = new URL(req.url);
    const from = url.searchParams.get("from") ?? "";
    const to = url.searchParams.get("to") ?? "";
    const saleId = (url.searchParams.get("saleId") ?? "").trim();
    const status = (url.searchParams.get("status") ?? "").trim();
    const q = (url.searchParams.get("q") ?? "").trim();
    const settings = await getSettings();

    const contains = { contains: q, mode: "insensitive" as const };
    const where = {
      ...(status ? { status: status === "PAID" ? { in: ["PAID", "SHIPPED"] } : status } : {}),
      ...(/^\d{4}-\d{2}-\d{2}$/.test(from) || /^\d{4}-\d{2}-\d{2}$/.test(to)
        ? {
            createdAt: {
              ...(/^\d{4}-\d{2}-\d{2}$/.test(from) ? { gte: new Date(`${from}T00:00:00`) } : {}),
              ...(/^\d{4}-\d{2}-\d{2}$/.test(to) ? { lte: new Date(`${to}T23:59:59`) } : {}),
            },
          }
        : {}),
      ...(saleId ? { auction: { is: { lot: { is: { saleId } } } } } : {}),
      ...(q
        ? {
            OR: [
              { auction: { is: { pigeon: { is: { name: contains } } } } },
              { auction: { is: { pigeon: { is: { ringNumber: contains } } } } },
              { buyer: { is: { name: contains } } },
              { buyer: { is: { nickname: contains } } },
              { buyer: { is: { email: contains } } },
            ],
          }
        : {}),
    };

    const orders = await prisma.order.findMany({
      where,
      include: {
        buyer: { select: { name: true, nickname: true, email: true, phone: true } },
        auction: {
          include: {
            pigeon: { select: { name: true, ringNumber: true, offeredBy: true } },
            lot: { include: { sale: { include: { breeder: { select: { name: true } } } } } },
          },
        },
      },
      orderBy: { createdAt: "desc" },
      take: 5000,
    });

    const wb = new ExcelJS.Workbook();
    wb.creator = settings.siteName;
    const ws = wb.addWorksheet("Tranzacții");

    const perioada = [from ? `de la ${from}` : "", to ? `până la ${to}` : ""].filter(Boolean).join(" ");
    ws.addRow([`Istoric tranzacții — ${settings.siteName}`]);
    ws.getRow(1).font = { bold: true, size: 14 };
    ws.addRow([
      `Generat la ${new Date().toLocaleString("ro-RO", { timeZone: "Europe/Bucharest" })}` +
        (perioada ? ` · ${perioada}` : "") +
        (status ? ` · ${STATUS[status] ?? status}` : ""),
    ]);
    ws.addRow([]);

    ws.addRow([
      "Data",
      "Porumbel",
      "Serie inel",
      "Licitație / Oferit de",
      "Crescător",
      "Cumpărător",
      "E-mail",
      "Telefon",
      "Preț",
      "Comision",
      "Rămas crescătorului",
      "Monedă",
      "Stare",
      "Plată",
      "Plătit la",
      "Predat la",
      "Decontat",
    ]);
    ws.getRow(4).font = { bold: true };

    let sumaTotal = 0;
    let comisionTotal = 0;
    for (const o of orders) {
      const lot = o.auction.lot;
      const eticheta = lot && o.auction.lotPosition ? lotLabel(lot.number, o.auction.lotPosition) : "";
      sumaTotal += o.amountCents;
      comisionTotal += o.commissionCents;
      ws.addRow([
        o.createdAt.toLocaleDateString("ro-RO", { timeZone: "Europe/Bucharest" }),
        `${eticheta ? eticheta + " " : ""}${o.auction.pigeon.name}`,
        o.auction.pigeon.ringNumber,
        lot ? lot.sale.titleRo : (o.auction.pigeon.offeredBy ?? ""),
        lot ? lot.sale.breeder.name : "",
        o.buyer.nickname ?? o.buyer.name,
        o.buyer.email,
        o.buyer.phone ?? "",
        o.amountCents / 100,
        o.commissionCents / 100,
        (o.amountCents - o.commissionCents) / 100,
        o.currency,
        STATUS[o.status] ?? o.status,
        o.paymentMethod ? (METODA[o.paymentMethod] ?? o.paymentMethod) : "",
        o.paidAt ? o.paidAt.toLocaleDateString("ro-RO", { timeZone: "Europe/Bucharest" }) : "",
        o.deliveredAt ? o.deliveredAt.toLocaleDateString("ro-RO", { timeZone: "Europe/Bucharest" }) : "",
        o.settlementId ? "da" : "",
      ]);
    }

    ws.addRow([]);
    const total = ws.addRow([
      `TOTAL (${orders.length} tranzacții)`,
      "",
      "",
      "",
      "",
      "",
      "",
      "",
      sumaTotal / 100,
      comisionTotal / 100,
      (sumaTotal - comisionTotal) / 100,
      settings.platformCurrency,
    ]);
    total.font = { bold: true };

    // lățimi ca să se citească fără ajustări manuale
    const latimi = [12, 26, 18, 28, 22, 22, 26, 14, 12, 12, 18, 8, 16, 12, 12, 12, 10];
    latimi.forEach((w, i) => (ws.getColumn(i + 1).width = w));
    for (const col of [9, 10, 11]) ws.getColumn(col).numFmt = "#,##0.00";

    const buf = await wb.xlsx.writeBuffer();
    const nume = `tranzactii${from ? `-${from}` : ""}${to ? `-${to}` : ""}.xlsx`;
    return new Response(buf, {
      headers: {
        "Content-Type": "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
        "Content-Disposition": `attachment; filename="${nume}"`,
      },
    });
  } catch (e) {
    return handleApiError(e);
  }
}
