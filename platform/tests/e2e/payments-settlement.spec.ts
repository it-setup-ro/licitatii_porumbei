import { test, expect, type Page, type APIRequestContext } from "@playwright/test";
import { execSync } from "child_process";
import path from "path";
import { login } from "./helpers";
import { TEST_DATABASE_URL } from "../../playwright.config";

/**
 * Faza 2 — plata în afara site-ului (cerințe, capitolul 6): câștigătorul primește
 * datele de plată ale firmei, adminul marchează Plătit / Predat sau anulează un
 * câștigător care nu plătește, iar decontul cu crescătorul se face din porumbeii
 * plătiți și se descarcă în Excel.
 */

const MIN = 60_000;
const uid = () => `${Date.now()}${Math.floor(Math.random() * 1000)}`;
const COMPANY = {
  companyName: "Demeco Test SRL",
  companyIban: "RO49AAAA1B31007593840000",
  companyBank: "Banca Test",
  contactPhone: "0740 000 000",
};

async function post(req: APIRequestContext, url: string, data?: unknown) {
  const res = await req.post(url, data === undefined ? {} : { data });
  return { status: res.status(), body: await res.json() };
}

async function setSettings(req: APIRequestContext, updates: Record<string, unknown>) {
  const r = await post(req, "/api/admin/settings", { updates });
  expect(r.body.ok, JSON.stringify(r.body)).toBe(true);
}

function emails(address: string): { subject: string; body: string }[] {
  const root = path.resolve(__dirname, "../..");
  const out = execSync(`npx tsx tests/e2e/fixtures/email-log.ts ${address}`, {
    cwd: root,
    env: { ...process.env, DATABASE_URL: TEST_DATABASE_URL },
  }).toString();
  const line = out.split(/\r?\n/).filter((l) => l.trim().startsWith("[")).pop()!;
  return JSON.parse(line);
}

/** O licitație de crescător cu 10% comision și un lot pornit cu porumbeii dați. */
async function liveLot(page: Page, names: string[]) {
  const id = uid();
  const breeder = await post(page.request, "/api/admin/breeders", { name: `Crescător Plăți ${id}` });
  const sale = await post(page.request, "/api/admin/sales", {
    breederId: breeder.body.id,
    slug: `plati-${id}`,
    titleRo: `Licitația plăți ${id}`,
    titleEn: `Payments auction ${id}`,
    commissionPercent: 10,
  });
  expect(sale.body.ok, JSON.stringify(sale.body)).toBe(true);
  const lot = await post(page.request, `/api/admin/sales/${sale.body.id}/lots`, {
    startsAt: new Date(Date.now() - MIN).toISOString(),
    endsAt: new Date(Date.now() + 120 * MIN).toISOString(),
  });
  const auctionIds: string[] = [];
  for (const [i, name] of names.entries()) {
    const ring = `RO 2025 ${id.slice(-5)}${i}`;
    const add = await post(page.request, `/api/admin/sale-lots/${lot.body.id}/pigeons`, {
      ringNumber: ring,
      sex: "M",
      name,
      startPriceCents: 15_000,
    });
    expect(add.body.ok, JSON.stringify(add.body)).toBe(true);
    await post(page.request, `/api/lots/${add.body.auctionId}`, {
      ringNumber: ring,
      sex: "M",
      name,
      startPriceCents: 15_000,
      media: [{ url: "/pigeons/voiajor-grizzle.jpg", type: "IMAGE" }],
    });
    auctionIds.push(add.body.auctionId);
  }
  expect((await post(page.request, `/api/admin/sale-lots/${lot.body.id}/start`)).body.ok).toBe(true);
  return { saleId: sale.body.id as string, auctionIds };
}

test.describe.configure({ mode: "serial" });

test.describe("Faza 2 — plata în afara site-ului", () => {
  test("câștig → datele de plată → Plătit → Predat → decont și Excel; neplătitul se anulează", async ({
    page,
    browser,
  }) => {
    test.setTimeout(330_000);
    await login(page, "admin@nbp.test", "admin1234");
    await setSettings(page.request, COMPANY);

    const id = uid().slice(-5);
    // nume care nu se conțin unul pe altul: filtrul după text caută subșiruri
    const nameA = `Achitat ${id}`;
    const nameB = `Restant ${id}`;
    const { saleId, auctionIds } = await liveLot(page, [nameA, nameB]);
    const [a, b] = auctionIds;

    const ctx2 = await browser.newContext({ locale: "ro-RO" });
    const buyer2 = await ctx2.newPage();
    await login(buyer2, "buyer2@nbp.test", "buyer1234");
    expect((await post(buyer2.request, `/api/auctions/${a}/bid`, { maxCents: 20_000 })).body.ok).toBe(true);

    const ctx1 = await browser.newContext({ locale: "ro-RO" });
    const buyer1 = await ctx1.newPage();
    await login(buyer1, "buyer1@nbp.test", "buyer1234");
    expect((await post(buyer1.request, `/api/auctions/${b}/bid`, { maxCents: 20_000 })).body.ok).toBe(true);

    for (const x of [a, b]) {
      expect((await post(page.request, `/api/admin/lots/${x}/shorten`)).body.ok).toBe(true);
    }

    // după închidere, comanda apare la cumpărător
    await expect(async () => {
      await buyer2.goto("/ro/account/purchases");
      await expect(buyer2.getByTestId("purchase-row").filter({ hasText: nameA })).toBeVisible({
        timeout: 2_000,
      });
    }).toPass({ timeout: 200_000, intervals: [5_000] });

    await buyer2.getByTestId("purchase-row").filter({ hasText: nameA }).click();
    const box = buyer2.getByTestId("payment-instructions");
    await expect(box).toContainText(COMPANY.companyIban);
    await expect(box).toContainText("Lotul 1.01");
    await expect(box).toContainText("numerar");
    await expect(box).toContainText("după plată");
    await expect(box).toContainText(COMPANY.contactPhone);
    await expect(buyer2.locator('[data-testid="pay-button"]')).toHaveCount(0);
    const orderA = buyer2.url().split("/").pop()!;

    // e-mailul de câștig are aceleași date
    const mail = emails("buyer2@nbp.test").find((e) => e.body.includes(nameA));
    expect(mail?.body).toContain(COMPANY.companyIban);
    // e-mailul e în limba contului (buyer2 are contul în engleză)
    expect(mail?.body).toMatch(/Porumbeii se predau după plată\.|Pigeons are handed over after payment\./);

    // admin: Plătit (numerar)
    await page.goto("/ro/admin/orders?status=PENDING_PAYMENT");
    const rowA = page.getByTestId("order-row").filter({ hasText: nameA });
    await expect(async () => {
      await rowA.getByTestId("order-method").selectOption("CASH");
      await expect(rowA.getByTestId("order-method")).toHaveValue("CASH", { timeout: 1_000 });
    }).toPass({ timeout: 15_000 });
    await rowA.getByTestId("order-mark-paid").click();
    await expect(page.getByTestId("order-row").filter({ hasText: nameA })).toHaveCount(0);

    // admin: Predat, cu transportatorul
    await page.goto("/ro/admin/orders?status=PAID");
    const paidA = page.getByTestId("order-row").filter({ hasText: nameA });
    await expect(async () => {
      await paidA.getByTestId("order-carrier").fill("Curier Test");
      await expect(paidA.getByTestId("order-carrier")).toHaveValue("Curier Test", { timeout: 1_000 });
    }).toPass({ timeout: 15_000 });
    await paidA.getByTestId("order-mark-delivered").click();
    await expect(page.getByTestId("order-row").filter({ hasText: nameA })).toHaveCount(0);

    await buyer2.reload();
    await expect(buyer2.getByTestId("order-status")).toHaveText("Predată");
    await expect(buyer2.getByTestId("order-paid-info")).toContainText("numerar");
    await expect(buyer2.getByTestId("order-delivered-info")).toContainText("Curier Test");
    await expect(buyer2.locator('[data-testid="payment-instructions"]')).toHaveCount(0);

    // câștigătorul care nu plătește: anulat din listă
    await page.goto("/ro/admin/orders?status=PENDING_PAYMENT");
    const rowB = page.getByTestId("order-row").filter({ hasText: nameB });
    await expect(rowB).toBeVisible();
    page.once("dialog", (d) => d.accept("Nu a plătit în termen"));
    await rowB.getByTestId("order-cancel").click();
    await expect(page.getByTestId("order-row").filter({ hasText: nameB })).toHaveCount(0);
    await buyer1.goto("/ro/account/notifications");
    await expect(buyer1.getByText("a fost anulată").first()).toBeVisible();

    // decontul pe licitație: 150 vândut și plătit, 10% comision
    await page.goto(`/ro/admin/sales/${saleId}`);
    const dec = page.getByTestId("settlement");
    await expect(dec.getByTestId("settlement-total")).toContainText("150");
    await expect(dec.getByTestId("settlement-commission")).toContainText("15");
    await expect(dec.getByTestId("settlement-payout")).toContainText("135");
    await expect(dec.getByTestId("settlement-unpaid")).toHaveText("Niciun porumbel neplătit.");

    const xlsx = await page.request.get(`/api/admin/settlements/export?saleId=${saleId}`);
    expect(xlsx.status()).toBe(200);
    expect(xlsx.headers()["content-type"]).toContain("spreadsheetml");
    const bytes = await xlsx.body();
    expect(bytes.subarray(0, 2).toString()).toBe("PK");
    expect(bytes.length).toBeGreaterThan(3_000);

    page.once("dialog", (d) => d.accept());
    await dec.getByTestId("settlement-settle").click();
    await expect(dec.getByTestId("settlement-history-row")).toHaveCount(1);
    await expect(dec.getByTestId("settlement-history-row")).toContainText("135");
    await expect(dec.getByTestId("settlement-payout")).toHaveText(/^0\s*€$/);

    // după decont, marcajele nu se mai schimbă
    const undo = await post(page.request, `/api/admin/orders/${orderA}`, { action: "UNDO" });
    expect(undo.body.error).toBe("SETTLED");

    await ctx1.close();
    await ctx2.close();
  });

  test("preț fix: datele de plată la cumpărare și decont pe „Oferit de”", async ({ page, browser }) => {
    test.setTimeout(120_000);
    await login(page, "admin@nbp.test", "admin1234");
    await setSettings(page.request, COMPANY);

    const id = uid();
    const offeredBy = `Oferitor ${id.slice(-5)}`;
    const sell = await post(page.request, "/api/sell", {
      ringNumber: `RO 2025 ${id.slice(-6)}`,
      sex: "M",
      name: `Fix Plată ${id.slice(-5)}`,
      offeredBy,
      startPriceCents: 30_000,
      saleMode: "FIXED",
    });
    expect(sell.body.status, JSON.stringify(sell.body)).toBe("LIVE");

    const ctx = await browser.newContext({ locale: "ro-RO" });
    const buyer = await ctx.newPage();
    await login(buyer, "buyer1@nbp.test", "buyer1234");
    const buy = await post(buyer.request, `/api/auctions/${sell.body.auctionId}/buy`);
    expect(buy.body.ok, JSON.stringify(buy.body)).toBe(true);
    await buyer.goto(`/ro/orders/${buy.body.orderId}`);
    await expect(buyer.getByTestId("payment-instructions")).toContainText(COMPANY.companyIban);
    await ctx.close();

    const paid = await post(page.request, `/api/admin/orders/${buy.body.orderId}`, {
      action: "PAID",
      method: "TRANSFER",
    });
    expect(paid.body.ok, JSON.stringify(paid.body)).toBe(true);

    // comisionul din Setări (12% în teste): 300 − 36 = 264
    await page.goto("/ro/admin/settlements");
    const dec = page.getByTestId("settlement").filter({ hasText: offeredBy });
    await expect(dec.getByTestId("settlement-total")).toContainText("300");
    await expect(dec.getByTestId("settlement-payout")).toContainText("264");
  });
});
