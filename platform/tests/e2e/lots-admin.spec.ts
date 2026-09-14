import { test, expect, type Page, type APIRequestContext } from "@playwright/test";
import { execSync } from "child_process";
import path from "path";
import { login } from "./helpers";
import { TEST_DATABASE_URL } from "../../playwright.config";

/**
 * Licitațiile pe crescători și loturi — cerințele clientului din septembrie:
 * doar administratorul pune porumbei, „Start lot" pornește tot lotul deodată,
 * după pornire nimic nu se mai schimbă, prelungirea 10 / 10 înghețată la start,
 * comisionul stabilit pe fiecare licitație.
 */

const MIN = 60_000;
const uid = () => `${Date.now()}${Math.floor(Math.random() * 1000)}`;

/** „2026-09-20T20:00", în ora locală — ca un câmp datetime-local. */
function local(d: Date) {
  const p = (n: number) => String(n).padStart(2, "0");
  return `${d.getFullYear()}-${p(d.getMonth() + 1)}-${p(d.getDate())}T${p(d.getHours())}:${p(d.getMinutes())}`;
}

async function post(req: APIRequestContext, url: string, data?: unknown) {
  const res = await req.post(url, data === undefined ? {} : { data });
  return { status: res.status(), body: await res.json() };
}

/** Crescător + licitație + lot, direct prin API — pregătirea, nu subiectul testului. */
async function saleWithLot(
  page: Page,
  opts: { startsAt: Date; endsAt: Date; commissionPercent?: number }
) {
  const id = uid();
  const breeder = await post(page.request, "/api/admin/breeders", { name: `Crescător ${id}` });
  expect(breeder.body.ok, JSON.stringify(breeder.body)).toBe(true);
  const sale = await post(page.request, "/api/admin/sales", {
    breederId: breeder.body.id,
    slug: `licitatie-${id}`,
    titleRo: `Licitația ${id}`,
    titleEn: `Auction ${id}`,
    commissionPercent: opts.commissionPercent ?? 15,
  });
  expect(sale.body.ok, JSON.stringify(sale.body)).toBe(true);
  const lot = await post(page.request, `/api/admin/sales/${sale.body.id}/lots`, {
    startsAt: opts.startsAt.toISOString(),
    endsAt: opts.endsAt.toISOString(),
  });
  expect(lot.body.ok, JSON.stringify(lot.body)).toBe(true);
  return { saleId: sale.body.id as string, slug: `licitatie-${id}`, lotId: lot.body.id as string };
}

/** Un porumbel în lot; cu `photo`, și cu fișa completată cu o poză. */
async function pigeon(page: Page, lotId: string, n: number, photo = true) {
  const ring = `RO 2025 ${uid().slice(-6)}`;
  const add = await post(page.request, `/api/admin/sale-lots/${lotId}/pigeons`, {
    ringNumber: ring,
    birthYear: 2025,
    sex: "M",
    name: `Porumbel ${n}`,
    startPriceCents: 15_000,
  });
  expect(add.body.ok, JSON.stringify(add.body)).toBe(true);
  if (photo) {
    const fisa = await post(page.request, `/api/lots/${add.body.auctionId}`, {
      ringNumber: ring,
      birthYear: 2025,
      sex: "M",
      name: `Porumbel ${n}`,
      startPriceCents: 15_000,
      media: [{ url: "/pigeons/voiajor-grizzle.jpg", type: "IMAGE" }],
    });
    expect(fisa.body.ok, JSON.stringify(fisa.body)).toBe(true);
  }
  return { auctionId: add.body.auctionId as string, ring };
}

async function setSettings(req: APIRequestContext, updates: Record<string, unknown>) {
  const r = await post(req, "/api/admin/settings", { updates });
  expect(r.body.ok, JSON.stringify(r.body)).toBe(true);
}

function lotState(auctionId: string) {
  const root = path.resolve(__dirname, "../..");
  const out = execSync(`npx tsx tests/e2e/fixtures/lot-close-state.ts ${auctionId}`, {
    cwd: root,
    env: { ...process.env, DATABASE_URL: TEST_DATABASE_URL },
  }).toString();
  const line = out.split(/\r?\n/).filter((l) => l.trim().startsWith("{")).pop()!;
  return JSON.parse(line) as { status: string; amount: number | null; commission: number | null };
}

test.describe("Licitații pe loturi — din administrare", () => {
  test("crescător → licitație → Lotul 1 → porumbel, din interfață; fără poză nu pornește", async ({
    page,
  }) => {
    test.setTimeout(120_000);
    await login(page, "admin@nbp.test", "admin1234");
    const id = uid();
    const nume = `Burca Test ${id}`;

    await page.goto("/ro/admin/breeders?new=1");
    await page.getByTestId("field-name").fill(nume);
    await page.getByTestId("editor-save").click();
    await expect(page.getByTestId("editor-saved")).toBeVisible();

    await page.goto("/ro/admin/sales?new=1");
    await page.getByTestId("field-breederId").selectOption({ label: nume });
    await page.getByTestId("field-commissionPercent").fill("23");
    await page.getByTestId("field-slug").fill(`Burca Ionuț ${id}`);
    await expect(page.getByTestId("field-slug")).toHaveValue(`burca-ionut-${id}`);
    await page.getByTestId("field-titleRo").fill(`Licitația crescătorului ${nume}`);
    await page.getByTestId("field-titleEn").fill(`Breeder auction ${nume}`);
    await page.getByTestId("editor-save").click();
    await expect(page.getByTestId("editor-saved")).toBeVisible();

    await page.goto("/ro/admin/sales");
    await page.getByTestId("sale-row").filter({ hasText: nume }).getByTestId("sale-open").click();
    await expect(page.getByTestId("sale-title")).toContainText(nume);

    const start = new Date(Date.now() + 60 * MIN);
    // Câmpurile sunt controlate de React: ce se scrie înainte de hidratare se
    // pierde. Se scrie din nou până când valoarea rămâne.
    await expect(async () => {
      await page.getByTestId("add-lot-start").fill(local(start));
      await page.getByTestId("add-lot-end").fill(local(new Date(start.getTime() + 120 * MIN)));
      await expect(page.getByTestId("add-lot-start")).toHaveValue(local(start), { timeout: 1_000 });
    }).toPass({ timeout: 15_000 });
    await page.getByTestId("add-lot-submit").click();

    const lot = page.getByTestId("lot-panel");
    await expect(lot).toContainText("Lotul 1");
    await expect(lot.getByTestId("lot-status")).toHaveText("ciornă");

    await lot.getByTestId("lot-add-ring").fill(`RO 2025 ${id.slice(-6)}`);
    await lot.getByTestId("lot-add-year").fill("2025");
    await lot.getByTestId("lot-add-sex").selectOption("F");
    await lot.getByTestId("lot-add-name").fill("Cuca lui Niță");
    await lot.getByTestId("lot-add-price").fill("150");
    await lot.getByTestId("lot-add-submit").click();
    await expect(lot.getByTestId("lot-add-done")).toContainText("1.01");
    await expect(lot.getByTestId("lot-pigeon-label")).toHaveText("1.01");
    await expect(lot.getByTestId("lot-pigeon-nophoto")).toBeVisible();

    page.once("dialog", (d) => d.accept());
    await lot.getByTestId("lot-start").click();
    await expect(lot.getByTestId("lot-problems")).toContainText("1.01");
    await expect(lot.getByTestId("lot-problems")).toContainText("fotografia");
    await expect(lot.getByTestId("lot-status")).toHaveText("ciornă");
  });

  test("„Start lot” pornește toți porumbeii deodată", async ({ page }) => {
    test.setTimeout(120_000);
    await login(page, "admin@nbp.test", "admin1234");
    const { lotId } = await saleWithLot(page, {
      startsAt: new Date(Date.now() - MIN),
      endsAt: new Date(Date.now() + 120 * MIN),
    });
    const porumbei = [];
    for (let i = 1; i <= 4; i++) porumbei.push(await pigeon(page, lotId, i));

    const r = await post(page.request, `/api/admin/sale-lots/${lotId}/start`);
    expect(r.body).toMatchObject({ ok: true, status: "LIVE" });

    for (const p of porumbei) {
      await page.goto(`/ro/auctions/${p.auctionId}`);
      await expect(page.getByTestId("live-badge"), p.auctionId).toBeVisible();
    }

    // a doua apăsare nu-l mai pornește o dată
    const again = await post(page.request, `/api/admin/sale-lots/${lotId}/start`);
    expect(again.status).toBe(422);
    expect(JSON.stringify(again.body.problems)).toContain("NOT_DRAFT");
  });

  test("un lot programat pornește singur la ora de început; înainte nu se licitează", async ({
    page,
    browser,
  }) => {
    test.setTimeout(150_000);
    await login(page, "admin@nbp.test", "admin1234");
    const { lotId } = await saleWithLot(page, {
      startsAt: new Date(Date.now() + 25_000),
      endsAt: new Date(Date.now() + 120 * MIN),
    });
    const p = await pigeon(page, lotId, 1);
    const r = await post(page.request, `/api/admin/sale-lots/${lotId}/start`);
    expect(r.body).toMatchObject({ ok: true, status: "SCHEDULED" });

    const ctx = await browser.newContext({ locale: "ro-RO" });
    const buyer = await ctx.newPage();
    await login(buyer, "buyer1@nbp.test", "buyer1234");
    const devreme = await post(buyer.request, `/api/auctions/${p.auctionId}/bid`, { maxCents: 16_000 });
    expect(devreme.body.error).toBe("NOT_LIVE");

    await expect(async () => {
      await buyer.goto(`/ro/auctions/${p.auctionId}`);
      await expect(buyer.getByTestId("live-badge")).toBeVisible({ timeout: 2_000 });
    }).toPass({ timeout: 90_000 });
    await ctx.close();
  });

  test("un lot incomplet nu pornește și spune exact ce lipsește", async ({ page }) => {
    await login(page, "admin@nbp.test", "admin1234");
    const { lotId } = await saleWithLot(page, {
      startsAt: new Date(Date.now() - MIN),
      endsAt: new Date(Date.now() + 60 * MIN),
    });
    await pigeon(page, lotId, 1);
    await pigeon(page, lotId, 2, false);

    const r = await post(page.request, `/api/admin/sale-lots/${lotId}/start`);
    expect(r.status).toBe(422);
    expect(r.body.problems).toEqual([
      { code: "INCOMPLETE", pigeons: [{ position: 2, missing: ["photo"] }] },
    ]);
  });

  test("„o dată începută, rămâne începută”: orele, prețul și porumbeii nu se mai schimbă", async ({
    page,
  }) => {
    test.setTimeout(120_000);
    await login(page, "admin@nbp.test", "admin1234");
    const inceput = new Date(Date.now() - MIN);
    const sfarsit = new Date(Date.now() + 120 * MIN);
    const { lotId } = await saleWithLot(page, { startsAt: inceput, endsAt: sfarsit });
    const p = await pigeon(page, lotId, 1);
    expect((await post(page.request, `/api/admin/sale-lots/${lotId}/start`)).body.ok).toBe(true);

    const ore = await post(page.request, `/api/admin/sale-lots/${lotId}`, {
      startsAt: inceput.toISOString(),
      endsAt: new Date(sfarsit.getTime() + 60 * MIN).toISOString(),
    });
    expect(ore.status).toBe(409);

    const baza = {
      ringNumber: p.ring,
      birthYear: 2025,
      sex: "M",
      name: "Porumbel 1",
      media: [{ url: "/pigeons/voiajor-grizzle.jpg", type: "IMAGE" }],
    };
    const pret = await post(page.request, `/api/lots/${p.auctionId}`, { ...baza, startPriceCents: 9_999_00 });
    expect(pret.status).toBe(409);
    expect(pret.body.fields.startPriceCents).toContain("a pornit");

    // o greșeală de scriere în nume se poate corecta
    const nume = await post(page.request, `/api/lots/${p.auctionId}`, {
      ...baza,
      name: "Porumbelul 1",
      startPriceCents: 15_000,
    });
    expect(nume.body.ok).toBe(true);

    expect((await post(page.request, `/api/admin/sale-lots/${lotId}/pigeons`, {
      ringNumber: "RO 2025 999999", birthYear: 2025, sex: "F", name: "Întârziat", startPriceCents: 15_000,
    })).status).toBe(409);

    const scos = await page.request.delete(`/api/admin/sale-pigeons/${p.auctionId}`);
    expect(scos.status()).toBe(409);
  });

  test("prelungirea folosește regulile înghețate la pornirea lotului", async ({ page, browser }) => {
    test.setTimeout(120_000);
    await login(page, "admin@nbp.test", "admin1234");

    const sfarsit = new Date(Date.now() + 5 * MIN);
    const { lotId } = await saleWithLot(page, {
      startsAt: new Date(Date.now() - MIN),
      endsAt: sfarsit,
    });
    const p = await pigeon(page, lotId, 1);

    // lotul pornește cu regula clientului: 10 minute / 10 minute
    await setSettings(page.request, { snipeWindowMinutes: 10, extensionMinutes: 10, maxExtensions: 0 });
    try {
      expect((await post(page.request, `/api/admin/sale-lots/${lotId}/start`)).body.ok).toBe(true);
    } finally {
      // Setările revin imediat la 2 / 2: dacă motorul le-ar citi pe cele de acum,
      // o ofertă cu 5 minute rămase nu ar mai prelungi nimic
      await setSettings(page.request, { snipeWindowMinutes: 2, extensionMinutes: 2, maxExtensions: 50 });
    }

    const ctx = await browser.newContext({ locale: "ro-RO" });
    const buyer = await ctx.newPage();
    await login(buyer, "buyer1@nbp.test", "buyer1234");
    const bid = await post(buyer.request, `/api/auctions/${p.auctionId}/bid`, { maxCents: 20_000 });
    await ctx.close();

    expect(bid.body.ok, JSON.stringify(bid.body)).toBe(true);
    expect(bid.body.extended).toBe(true);
    const prelungit = new Date(bid.body.endsAt).getTime() - sfarsit.getTime();
    expect(Math.round(prelungit / MIN)).toBe(10);
  });

  test("comisionul licitației crescătorului se aplică la închidere", async ({ page, browser }) => {
    test.setTimeout(240_000);
    await login(page, "admin@nbp.test", "admin1234");
    const { lotId } = await saleWithLot(page, {
      startsAt: new Date(Date.now() - MIN),
      endsAt: new Date(Date.now() + 120 * MIN),
      commissionPercent: 23,
    });
    const p = await pigeon(page, lotId, 1);
    expect((await post(page.request, `/api/admin/sale-lots/${lotId}/start`)).body.ok).toBe(true);

    const ctx = await browser.newContext({ locale: "ro-RO" });
    const buyer = await ctx.newPage();
    await login(buyer, "buyer2@nbp.test", "buyer1234");
    const bid = await post(buyer.request, `/api/auctions/${p.auctionId}/bid`, { maxCents: 20_000 });
    expect(bid.body.ok, JSON.stringify(bid.body)).toBe(true);
    await ctx.close();

    // unealta de test: se închide peste un minut
    expect((await post(page.request, `/api/admin/lots/${p.auctionId}/shorten`)).body.ok).toBe(true);

    await expect(async () => {
      expect(lotState(p.auctionId).status).toBe("CLOSED");
    }).toPass({ timeout: 150_000, intervals: [5_000] });

    const stare = lotState(p.auctionId);
    expect(stare.amount).toBe(15_000);
    expect(stare.commission).toBe(Math.round(15_000 * 0.23));
  });
});

test.describe("Licitații pe loturi — cine are voie", () => {
  test("un cumpărător nu poate crea licitații sau adăuga porumbei", async ({ page }) => {
    await login(page, "buyer1@nbp.test", "buyer1234");
    const sale = await page.request.post("/api/admin/sales", {
      data: { breederId: "x", slug: "nu", titleRo: "Nu are voie", titleEn: "Not allowed", commissionPercent: 10 },
    });
    expect(sale.status()).toBeGreaterThanOrEqual(401);
    const add = await page.request.post("/api/admin/sale-lots/x/pigeons", {
      data: { ringNumber: "RO 1", birthYear: 2025, sex: "M", name: "Intrus", startPriceCents: 15_000 },
    });
    expect(add.status()).toBeGreaterThanOrEqual(401);
  });

  test("un crescător cu cont nu poate modifica porumbeii din loturi", async ({ page, browser }) => {
    await login(page, "admin@nbp.test", "admin1234");
    const { lotId } = await saleWithLot(page, {
      startsAt: new Date(Date.now() + 60 * MIN),
      endsAt: new Date(Date.now() + 180 * MIN),
    });
    const p = await pigeon(page, lotId, 1);

    const ctx = await browser.newContext({ locale: "ro-RO" });
    const seller = await ctx.newPage();
    await login(seller, "seller@nbp.test", "seller1234");
    const r = await seller.request.post(`/api/lots/${p.auctionId}`, {
      data: { ringNumber: p.ring, birthYear: 2025, sex: "M", name: "Schimbat", startPriceCents: 15_000 },
    });
    expect(r.status()).toBe(403);
    await ctx.close();
  });
});
