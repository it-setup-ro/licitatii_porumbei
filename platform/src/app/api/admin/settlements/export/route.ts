import ExcelJS from "exceljs";
import { prisma } from "@/lib/db";
import { requireAdmin } from "@/lib/auth";
import { getSettings } from "@/lib/settings";
import { lotLabel } from "@/lib/lots";
import { loadSettlementGroup, type SettlementGroup } from "@/lib/orders";
import { SETTLEABLE_STATUSES } from "@/lib/settlement-math";
import { handleApiError, jsonError } from "@/lib/api";

/**
 * Decontul în Excel (.xlsx): porumbeii plătiți, totalul de decontat, cei încă
 * neplătiți separat și deconturile deja făcute.
 */

const STATUS: Record<string, string> = {
  PENDING_PAYMENT: "Așteaptă plata",
  PAID: "Plătit",
  SHIPPED: "Plătit",
  DELIVERED: "Predat",
};
const METHOD: Record<string, string> = { TRANSFER: "Transfer", CASH: "Numerar" };

function fileSlug(s: string) {
  return (
    s
      .normalize("NFD")
      .replace(/[̀-ͯ]/g, "")
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, "-")
      .replace(/^-|-$/g, "") || "fara-nume"
  );
}

export async function GET(req: Request) {
  try {
    await requireAdmin();
    const url = new URL(req.url);
    const saleId = url.searchParams.get("saleId");
    const offeredBy = url.searchParams.get("offeredBy");
    const settings = await getSettings();

    let group: SettlementGroup;
    let title: string;
    let fileKey: string;
    let commission: string;
    if (saleId) {
      const sale = await prisma.sale.findUnique({ where: { id: saleId }, include: { breeder: true } });
      if (!sale) return jsonError("NOT_FOUND", 404);
      group = { saleId };
      title = `${sale.titleRo} — ${sale.breeder.name}`;
      fileKey = sale.slug;
      commission = `${sale.commissionPercent}%`;
    } else if (offeredBy !== null) {
      group = { offeredBy };
      title = `Preț fix — ${offeredBy || "fără „Oferit de”"}`;
      fileKey = `pret-fix-${fileSlug(offeredBy)}`;
      commission = `${settings.commissionPercent}% (din Setări, la data cumpărării)`;
    } else {
      return jsonError("VALIDATION", 422);
    }

    const { orders, settlements, summary } = await loadSettlementGroup(group);
    const unit = settings.platformCurrency === "EUR" ? "€" : "lei";
    const moneyFmt = `#,##0.00 "${unit}"`;
    const day = (d: Date | null | undefined) =>
      d ? d.toLocaleDateString("ro-RO", { timeZone: "Europe/Bucharest" }) : "";

    const wb = new ExcelJS.Workbook();
    wb.creator = "No.1 & Best Pigeons";
    const ws = wb.addWorksheet("Decont");
    [10, 28, 20, 28, 16, 14, 14, 20, 16, 12, 12, 12, 13].forEach((w, i) => (ws.getColumn(i + 1).width = w));

    ws.addRow([`Decont — ${title}`]).font = { bold: true, size: 14 };
    ws.addRow([
      `Generat la ${new Date().toLocaleString("ro-RO", { timeZone: "Europe/Bucharest" })} · comision ${commission}`,
    ]);
    ws.addRow([]);

    const header = [
      "Lot",
      "Porumbel",
      "Serie inel",
      "Cumpărător",
      "Telefon",
      "Sumă",
      "Comision",
      "De plătit crescătorului",
      "Stare",
      "Plătit la",
      "Metodă",
      "Predat la",
      "Decontat la",
    ];
    const addHeader = () => {
      const h = ws.addRow(header);
      h.font = { bold: true };
      h.eachCell((c) => {
        c.fill = { type: "pattern", pattern: "solid", fgColor: { argb: "FFE8EEF5" } };
      });
    };
    const money = (row: ExcelJS.Row, cols: number[]) => cols.forEach((c) => (row.getCell(c).numFmt = moneyFmt));

    const section = (label: string, rows: typeof orders) => {
      ws.addRow([label]).font = { bold: true, size: 12 };
      addHeader();
      for (const o of rows) {
        const a = o.auction;
        const r = ws.addRow([
          a.lot && a.lotPosition ? lotLabel(a.lot.number, a.lotPosition) : "Preț fix",
          a.pigeon.name,
          a.pigeon.ringNumber,
          `${o.buyer.name}${o.buyer.nickname ? ` (${o.buyer.nickname})` : ""}`,
          o.buyer.phone ?? "",
          o.amountCents / 100,
          o.commissionCents / 100,
          (o.amountCents - o.commissionCents) / 100,
          STATUS[o.status] ?? o.status,
          day(o.paidAt),
          o.paymentMethod ? METHOD[o.paymentMethod] ?? o.paymentMethod : "",
          day(o.deliveredAt),
          day(o.settlement?.settledAt),
        ]);
        money(r, [6, 7, 8]);
      }
    };

    section("Plătiți", orders.filter((o) => SETTLEABLE_STATUSES.includes(o.status)));
    const tot = ws.addRow([
      "",
      "",
      "",
      "",
      "De decontat acum",
      summary.due.totalCents / 100,
      summary.due.commissionCents / 100,
      summary.due.payoutCents / 100,
    ]);
    tot.font = { bold: true };
    money(tot, [6, 7, 8]);
    ws.addRow([]);

    section(
      "Încă neplătiți — nu intră în decont",
      orders.filter((o) => o.status === "PENDING_PAYMENT")
    );

    if (settlements.length > 0) {
      ws.addRow([]);
      ws.addRow(["Deconturi făcute"]).font = { bold: true, size: 12 };
      const h = ws.addRow(["Data", "Porumbei", "Total", "Comision", "Plătit crescătorului"]);
      h.font = { bold: true };
      for (const s of settlements) {
        const r = ws.addRow([day(s.settledAt), s.orderCount, s.totalCents / 100, s.commissionCents / 100, s.payoutCents / 100]);
        money(r, [3, 4, 5]);
      }
    }

    const buf = await wb.xlsx.writeBuffer();
    const date = new Date().toISOString().slice(0, 10);
    return new Response(new Uint8Array(buf as ArrayBuffer), {
      headers: {
        "Content-Type": "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
        "Content-Disposition": `attachment; filename="decont-${fileKey}-${date}.xlsx"`,
      },
    });
  } catch (e) {
    return handleApiError(e);
  }
}
