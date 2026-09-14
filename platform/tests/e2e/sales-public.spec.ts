import { test, expect, type Page, type APIRequestContext } from "@playwright/test";
import { execSync } from "child_process";
import path from "path";
import { login, runOnTestDb } from "./helpers";
import { TEST_DATABASE_URL } from "../../playwright.config";

/**
 * Partea publică a licitațiilor pe loturi: pagina licitației crescătorului,
 * „Lotul 1.01" pe carduri și pe pagina porumbelului, avizul de 30 de minute.
 */

const MIN = 60_000;
const uid = () => `${Date.now()}${Math.floor(Math.random() * 1000)}`;

async function post(req: APIRequestContext, url: string, data?: unknown) {
  const res = await req.post(url, data === undefined ? {} : { data });
  return { status: res.status(), body: await res.json() };
}

async function sale(page: Page) {
  const id = uid();
  const breeder = await post(page.request, "/api/admin/breeders", {
    name: `Frații Test ${id}`,
    city: "Arad",
    country: "România",
  });
  expect(breeder.body.ok, JSON.stringify(breeder.body)).toBe(true);
  const s = await post(page.request, "/api/admin/sales", {
    breederId: breeder.body.id,
    slug: `publica-${id}`,
    titleRo: `Licitația publică ${id}`,
    titleEn: `Public auction ${id}`,
    commissionPercent: 10,
  });
  expect(s.body.ok, JSON.stringify(s.body)).toBe(true);
  return { saleId: s.body.id as string, slug: `publica-${id}`, title: `Licitația publică ${id}`, breeder: `Frații Test ${id}` };
}

async function lot(page: Page, saleId: string, startsAt: Date, endsAt: Date) {
  const r = await post(page.request, `/api/admin/sales/${saleId}/lots`, {
    startsAt: startsAt.toISOString(),
    endsAt: endsAt.toISOString(),
  });
  expect(r.body.ok, JSON.stringify(r.body)).toBe(true);
  return r.body.id as string;
}

async function pigeon(page: Page, lotId: string, name: string) {
  const ring = `RO 2025 ${uid().slice(-6)}`;
  const add = await post(page.request, `/api/admin/sale-lots/${lotId}/pigeons`, {
    ringNumber: ring,
    birthYear: 2025,
    sex: "M",
    name,
    startPriceCents: 15_000,
  });
  expect(add.body.ok, JSON.stringify(add.body)).toBe(true);
  const fisa = await post(page.request, `/api/lots/${add.body.auctionId}`, {
    ringNumber: ring,
    birthYear: 2025,
    sex: "M",
    name,
    startPriceCents: 15_000,
    media: [{ url: "/pigeons/voiajor-grizzle.jpg", type: "IMAGE" }],
  });
  expect(fisa.body.ok, JSON.stringify(fisa.body)).toBe(true);
  return add.body.auctionId as string;
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

test.describe("Licitații pe loturi — ce vede cumpărătorul", () => {
  test("pagina licitației: crescătorul, loturile pornite, grilă și listă; ciorna nu se vede", async ({
    page,
  }) => {
    test.setTimeout(120_000);
    await login(page, "admin@nbp.test", "admin1234");
    const s = await sale(page);

    const lot1 = await lot(page, s.saleId, new Date(Date.now() - MIN), new Date(Date.now() + 120 * MIN));
    const a1 = await pigeon(page, lot1, "Albastrul Test");
    await pigeon(page, lot1, "Sura Test");
    expect((await post(page.request, `/api/admin/sale-lots/${lot1}/start`)).body.ok).toBe(true);

    // al doilea lot rămâne în ciornă
    const lot2 = await lot(page, s.saleId, new Date(Date.now() + 3 * 24 * 60 * MIN), new Date(Date.now() + 4 * 24 * 60 * MIN));
    await pigeon(page, lot2, "Ascunsul Test");

    await page.goto(`/ro/sales/${s.slug}`);
    await expect(page.getByTestId("sale-page-title")).toHaveText(s.title);
    await expect(page.getByTestId("sale-breeder")).toContainText(s.breeder);
    await expect(page.getByTestId("sale-lot")).toHaveCount(1);
    await expect(page.getByTestId("sale-lot-status")).toHaveText("Se licitează");
    await expect(page.getByText("Ascunsul Test")).toHaveCount(0);

    // eticheta pe card
    const labels = page.getByTestId("card-lot-label");
    await expect(labels.first()).toHaveText(/Lotul 1\.01/i);
    await expect(labels.nth(1)).toHaveText(/Lotul 1\.02/i);

    // lista
    await page.getByTestId("view-list").click();
    await expect(page.getByTestId("sale-list-row").first()).toBeVisible();
    await expect(page.getByTestId("sale-list-row").first()).toContainText("1.01");
    await expect(page.getByTestId("card-lot-label").first()).toBeHidden();

    // pagina porumbelului: calea înapoi și crescătorul, nu contul adminului
    await page.goto(`/ro/auctions/${a1}`);
    await expect(page.getByTestId("lot-breadcrumb")).toContainText(s.title);
    await expect(page.getByTestId("lot-label")).toHaveText("Lotul 1.01");
    await expect(page.getByTestId("breeder-box")).toContainText(s.breeder);
    await page.getByTestId("breeder-sale-link").click();
    await expect(page).toHaveURL(new RegExp(`/ro/sales/${s.slug}$`));
  });

  test("lista de licitații arată câte un card pe lot, cu datele lui, în fila potrivită", async ({
    page,
  }) => {
    test.setTimeout(90_000);
    await login(page, "admin@nbp.test", "admin1234");
    const s = await sale(page);
    const l = await lot(page, s.saleId, new Date(Date.now() + 60 * MIN), new Date(Date.now() + 180 * MIN));
    await pigeon(page, l, "Programatul Test");
    expect((await post(page.request, `/api/admin/sale-lots/${l}/start`)).body).toMatchObject({
      ok: true,
      status: "SCHEDULED",
    });

    // al doilea lot al aceluiași crescător, cu alte zile — ca în exemplul clientului
    const l2 = await lot(page, s.saleId, new Date(Date.now() + 2 * 24 * 60 * MIN), new Date(Date.now() + 3 * 24 * 60 * MIN));
    await pigeon(page, l2, "Al doilea lot Test");
    expect((await post(page.request, `/api/admin/sale-lots/${l2}/start`)).body.ok).toBe(true);

    await page.goto("/ro/auctions?status=SCHEDULED");
    const cards = page.getByTestId("lot-card").filter({ hasText: s.breeder });
    await expect(cards).toHaveCount(2);
    await expect(cards.filter({ hasText: "Lotul 1" })).toContainText("un porumbel");
    await expect(cards.filter({ hasText: "Lotul 2" })).toBeVisible();
    // fiecare card are datele lotului lui
    const d1 = await cards.filter({ hasText: "Lotul 1" }).getByTestId("lot-card-dates").textContent();
    const d2 = await cards.filter({ hasText: "Lotul 2" }).getByTestId("lot-card-dates").textContent();
    expect(d1).not.toBe(d2);

    await cards.filter({ hasText: "Lotul 2" }).click();
    await expect(page).toHaveURL(new RegExp(`/ro/sales/${s.slug}#lot-2$`));

    await page.goto("/ro/auctions?status=LIVE");
    await expect(page.getByTestId("lot-card").filter({ hasText: s.breeder })).toHaveCount(0);

    // o licitație doar cu loturi în ciornă nu are pagină publică
    const ciorna = await sale(page);
    await lot(page, ciorna.saleId, new Date(Date.now() + 60 * MIN), new Date(Date.now() + 120 * MIN));
    const res = await page.goto(`/ro/sales/${ciorna.slug}`);
    expect(res?.status()).toBe(404);
  });

  test("cu 30 de minute înainte, cine a licitat primește un e-mail cu porumbeii lui", async ({
    page,
    browser,
  }) => {
    test.setTimeout(150_000);
    await login(page, "admin@nbp.test", "admin1234");
    const s = await sale(page);
    // Pornește departe de final: dacă ar porni direct în fereastra de 30 de
    // minute, avizul ar pleca înainte să apuce cineva să liciteze.
    const l = await lot(page, s.saleId, new Date(Date.now() - MIN), new Date(Date.now() + 120 * MIN));
    const a1 = await pigeon(page, l, "Primul Aviz");
    await pigeon(page, l, "Al doilea Aviz");

    expect((await post(page.request, `/api/admin/sale-lots/${l}/start`)).body.ok).toBe(true);

    const ctx = await browser.newContext({ locale: "ro-RO" });
    const buyer = await ctx.newPage();
    await login(buyer, "buyer1@nbp.test", "buyer1234");
    const bid = await post(buyer.request, `/api/auctions/${a1}/bid`, { maxCents: 18_000 });
    expect(bid.body.ok, JSON.stringify(bid.body)).toBe(true);
    await ctx.close();

    // abia acum lotul intră în fereastra avizului
    runOnTestDb("tests/e2e/fixtures/lot-ends-soon.ts", [l, "20"]);

    let mesaj: { subject: string; body: string } | undefined;
    await expect(async () => {
      mesaj = emails("buyer1@nbp.test").find(
        (e) => e.subject.startsWith("Porumbeii pe care ai licitat") && e.body.includes(s.title)
      );
      expect(mesaj).toBeTruthy();
    }).toPass({ timeout: 90_000, intervals: [5_000] });

    expect(mesaj!.body).toContain("Lotul 1.01 Primul Aviz");
    expect(mesaj!.body).toContain("ești pe primul loc");
    // doar porumbeii lui, nu tot lotul
    expect(mesaj!.body).not.toContain("Al doilea Aviz");

    // o singură dată pe lot
    await page.waitForTimeout(20_000);
    const toate = emails("buyer1@nbp.test").filter((e) => e.body.includes(s.title));
    expect(toate).toHaveLength(1);
  });

  test("linkul de dezabonare fără semnătură validă nu oprește nimic", async ({ page }) => {
    await page.goto("/ro/ending-notices/unsubscribe?u=oricine&t=gresit");
    await page.getByTestId("ending-unsub-button").click();
    await expect(page.getByTestId("ending-unsub-bad")).toBeVisible();
  });
});
