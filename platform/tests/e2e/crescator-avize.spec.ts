import { test, expect, type Page, type APIRequestContext } from "@playwright/test";
import { execSync } from "child_process";
import path from "path";
import { login } from "./helpers";
import { TEST_DATABASE_URL } from "../../playwright.config";

/**
 * Cele două e-mailuri ale crescătorului: rezumatul la închiderea lotului și
 * confirmarea decontului. Un lot are până la 20 de porumbei, de aceea pleacă un
 * singur mesaj pe lot — iar bifa din Fișa mea le oprește pe amândouă.
 */

const MIN = 60_000;
const uid = () => `${Date.now()}${Math.floor(Math.random() * 1000)}`;

async function post(req: APIRequestContext, url: string, data?: unknown) {
  const res = await req.post(url, data === undefined ? {} : { data });
  return { status: res.status(), body: await res.json() };
}

function peTestDb(script: string, args: string[]) {
  const root = path.resolve(__dirname, "../..");
  const out = execSync(`npx tsx tests/e2e/fixtures/${script} ${args.join(" ")}`, {
    cwd: root,
    env: { ...process.env, DATABASE_URL: TEST_DATABASE_URL },
  }).toString();
  return out.split(/\r?\n/).filter((l) => l.trim().startsWith("{") || l.trim().startsWith("[")).pop()!;
}

function emails(address: string): { subject: string; body: string }[] {
  return JSON.parse(peTestDb("email-log.ts", [address]));
}

/** Crescător cu cont, licitație cu 10% comision și un lot pornit cu doi porumbei. */
async function crescatorCuLot(page: Page) {
  const id = uid();
  const email = `avize-${id}@e2e.test`;
  const b = await post(page.request, "/api/admin/breeders", { name: `Crescător Avize ${id}` });
  expect(b.body.ok, JSON.stringify(b.body)).toBe(true);
  const cont = await post(page.request, `/api/admin/breeders/${b.body.id}/account`, { email });
  expect(cont.body.ok, JSON.stringify(cont.body)).toBe(true);

  const sale = await post(page.request, "/api/admin/sales", {
    breederId: b.body.id,
    slug: `avize-${id}`,
    titleRo: `Licitația avize ${id}`,
    titleEn: `Notices auction ${id}`,
    commissionPercent: 10,
  });
  expect(sale.body.ok, JSON.stringify(sale.body)).toBe(true);
  const lot = await post(page.request, `/api/admin/sales/${sale.body.id}/lots`, {
    startsAt: new Date(Date.now() - MIN).toISOString(),
    endsAt: new Date(Date.now() + 120 * MIN).toISOString(),
  });
  expect(lot.body.ok, JSON.stringify(lot.body)).toBe(true);

  const auctionIds: string[] = [];
  for (const [i, name] of [`Vândut ${id}`, `Rămas ${id}`].entries()) {
    const ring = `RO 2025 ${id.slice(-5)}${i}`;
    const add = await post(page.request, `/api/admin/sale-lots/${lot.body.id}/pigeons`, {
      ringNumber: ring,
      sex: "M",
      name,
      startPriceCents: 15_000,
    });
    expect(add.body.ok, JSON.stringify(add.body)).toBe(true);
    // „Start lot" cere fișa completă, cu cel puțin o poză
    const fisa = await post(page.request, `/api/lots/${add.body.auctionId}`, {
      ringNumber: ring,
      sex: "M",
      name,
      startPriceCents: 15_000,
      media: [{ url: "/pigeons/voiajor-grizzle.jpg", type: "IMAGE" }],
    });
    expect(fisa.body.ok, JSON.stringify(fisa.body)).toBe(true);
    auctionIds.push(add.body.auctionId);
  }
  expect((await post(page.request, `/api/admin/sale-lots/${lot.body.id}/start`)).body.ok).toBe(true);

  return {
    email,
    breederId: b.body.id as string,
    saleId: sale.body.id as string,
    lotId: lot.body.id as string,
    auctionIds,
    numeVandut: `Vândut ${id}`,
  };
}

/** Închide lotul: porumbeii se scurtează, apoi ora lotului trece în urmă. */
async function inchideLotul(page: Page, lotId: string, auctionIds: string[]) {
  for (const a of auctionIds) {
    expect((await post(page.request, `/api/admin/lots/${a}/shorten`)).body.ok).toBe(true);
  }
  peTestDb("lot-ends-now.ts", [lotId]);
  await expect(async () => {
    const stare = JSON.parse(peTestDb("lot-ends-now.ts", [lotId, "status"])).status;
    expect(stare).toBe("CLOSED");
  }).toPass({ timeout: 180_000, intervals: [5_000] });
}

test.describe.configure({ mode: "serial" });

test.describe("Avizele crescătorului", () => {
  test("rezumatul lotului și confirmarea decontului ajung pe e-mail", async ({ page, browser }) => {
    test.setTimeout(330_000);
    await login(page, "admin@nbp.test", "admin1234");
    const lot = await crescatorCuLot(page);

    // un porumbel se vinde, celălalt rămâne nevândut
    const ctx = await browser.newContext({ locale: "ro-RO" });
    const buyer = await ctx.newPage();
    await login(buyer, "buyer1@nbp.test", "buyer1234");
    expect((await post(buyer.request, `/api/auctions/${lot.auctionIds[0]}/bid`, { maxCents: 20_000 })).body.ok).toBe(
      true
    );

    await inchideLotul(page, lot.lotId, lot.auctionIds);

    // 1) rezumatul: un singur mesaj, cu sumele scrise pentru om
    let rezumat: { subject: string; body: string } | undefined;
    await expect(async () => {
      rezumat = emails(lot.email).find((m) => m.body.includes("s-a încheiat"));
      expect(rezumat, "rezumatul lotului n-a ajuns").toBeTruthy();
    }).toPass({ timeout: 60_000, intervals: [3_000] });

    expect(rezumat!.body).toContain("Lotul 1");
    expect(rezumat!.body).toContain("S-au vândut 1 din 2 porumbei.");
    expect(rezumat!.body).toContain("Total: 150");
    expect(rezumat!.body).toContain("Comision (10%): 15");
    expect(rezumat!.body).toContain("Îți revin: 135");
    expect(rezumat!.body).toContain(lot.numeVandut);
    expect(rezumat!.body).not.toContain("Cents");
    // până la plată, cumpărătorul apare cu aliasul, nu cu numele real
    expect(rezumat!.body).not.toContain("Popescu");

    // 2) plata și decontul
    const comanda = await page.request.get(`/api/admin/settlements/export?saleId=${lot.saleId}`);
    expect(comanda.status()).toBe(200);
    await page.goto("/ro/admin/orders?status=PENDING_PAYMENT");
    const rand = page.getByTestId("order-row").filter({ hasText: lot.numeVandut });
    await expect(rand).toBeVisible();
    const orderId = await rand.getAttribute("data-order-id");
    expect(orderId, "rândul comenzii n-are id").toBeTruthy();
    expect(
      (await post(page.request, `/api/admin/orders/${orderId}`, { action: "PAID", method: "CASH" })).body.ok
    ).toBe(true);

    const decont = await post(page.request, "/api/admin/settlements", { saleId: lot.saleId });
    expect(decont.body.ok, JSON.stringify(decont.body)).toBe(true);

    const confirmare = emails(lot.email).find((m) => m.body.includes("Decontul pentru licitația"));
    expect(confirmare, "confirmarea decontului n-a ajuns").toBeTruthy();
    expect(confirmare!.body).toContain("1 porumbei plătiți, total 150");
    expect(confirmare!.body).toContain("Îți revin: 135");

    await ctx.close();
  });

  test("cu bifa scoasă din Fișa mea nu mai pleacă nimic", async ({ page, browser }) => {
    test.setTimeout(330_000);
    await login(page, "admin@nbp.test", "admin1234");
    const lot = await crescatorCuLot(page);

    // crescătorul intră cu linkul de parolă și scoate bifa
    await page.goto("/ro/admin/emails");
    const row = page.getByTestId("email-row").filter({ hasText: lot.email }).first();
    await expect(row).toBeVisible();
    await row.locator("summary").click();
    const link = (await row.getByTestId("email-body").innerText()).match(
      /https?:\/\/\S+\/reset-password\?token=[a-f0-9]+/
    )![0];

    const ctx = await browser.newContext({ locale: "ro-RO" });
    const crescator = await ctx.newPage();
    await crescator.goto(link.replace(/^https?:\/\/[^/]+/, ""));
    await crescator.getByTestId("reset-password").fill("AvizeTest2026!");
    await crescator.getByTestId("reset-confirm").fill("AvizeTest2026!");
    await crescator.getByTestId("reset-submit").click();
    await expect(crescator.getByTestId("reset-done")).toBeVisible();
    await login(crescator, lot.email, "AvizeTest2026!");

    const oprit = await post(crescator.request, "/api/breeder/profile", {
      alias: `Fara${uid().slice(-6)}`,
      notifyByEmail: false,
    });
    expect(oprit.body.ok, JSON.stringify(oprit.body)).toBe(true);

    const inainte = emails(lot.email).length;
    await inchideLotul(page, lot.lotId, lot.auctionIds);
    // lotul s-a închis; dacă ar fi plecat un e-mail, ar fi plecat până acum
    expect(emails(lot.email).filter((m) => m.body.includes("s-a încheiat")).length).toBe(0);
    expect(emails(lot.email).length).toBe(inainte);

    await ctx.close();
  });
});
