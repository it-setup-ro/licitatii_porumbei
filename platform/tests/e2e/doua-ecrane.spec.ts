import { test, expect, devices, type Page, type APIRequestContext } from "@playwright/test";
import { login } from "./helpers";

/**
 * Verificare „cu ochii": un telefon real (iPhone 13) și un calculator, două
 * conturi diferite, pe același porumbel. La fiecare ofertă se salvează câte o
 * poză de pe ambele ecrane, ca să se vadă că prețul și istoricul se actualizează
 * fără reîncărcare. Nu e test de regresie — e dovada cerută de Daniel.
 */

const POZE = "test-results/doua-ecrane";
const MIN = 60_000;
const uid = () => `${Date.now()}${Math.floor(Math.random() * 1000)}`;

async function post(req: APIRequestContext, url: string, data?: unknown) {
  const res = await req.post(url, data === undefined ? {} : { data });
  return { status: res.status(), body: await res.json() };
}

test("telefon și calculator, două conturi, pe același porumbel", async ({ browser }) => {
  test.setTimeout(240_000);

  // ── licitația pe care se face proba ──
  const ctxAdmin = await browser.newContext({ locale: "ro-RO" });
  const admin = await ctxAdmin.newPage();
  await login(admin, "admin@nbp.test", "admin1234");
  const id = uid();
  const breeder = await post(admin.request, "/api/admin/breeders", { name: `Crescător Probă ${id.slice(-5)}` });
  const sale = await post(admin.request, "/api/admin/sales", {
    breederId: breeder.body.id,
    slug: `proba-${id}`,
    titleRo: `Proba pe două ecrane ${id.slice(-5)}`,
    titleEn: `Two screens ${id.slice(-5)}`,
    commissionPercent: 10,
  });
  const lot = await post(admin.request, `/api/admin/sales/${sale.body.id}/lots`, {
    startsAt: new Date(Date.now() - MIN).toISOString(),
    endsAt: new Date(Date.now() + 120 * MIN).toISOString(),
  });
  const ring = `RO 2025 ${id.slice(-6)}`;
  const add = await post(admin.request, `/api/admin/sale-lots/${lot.body.id}/pigeons`, {
    ringNumber: ring,
    sex: "M",
    name: "FULGER",
    startPriceCents: 50_000,
  });
  await post(admin.request, `/api/lots/${add.body.auctionId}`, {
    ringNumber: ring,
    sex: "M",
    name: "FULGER",
    startPriceCents: 50_000,
    media: [{ url: "/pigeons/voiajor-vanat-bara.jpg", type: "IMAGE" }],
  });
  await post(admin.request, `/api/admin/sale-lots/${lot.body.id}/start`);
  const auctionId = add.body.auctionId as string;
  const url = `/ro/auctions/${auctionId}`;

  // ── ecranele: telefon (buyer1) și calculator (buyer2) ──
  const ctxTelefon = await browser.newContext({ ...devices["iPhone 13"], locale: "ro-RO" });
  const ctxCalc = await browser.newContext({ locale: "ro-RO", viewport: { width: 1440, height: 900 } });
  const telefon = await ctxTelefon.newPage();
  const calculator = await ctxCalc.newPage();

  await login(telefon, "buyer1@nbp.test", "buyer1234");
  await login(calculator, "buyer2@nbp.test", "buyer1234");
  await telefon.goto(url);
  await calculator.goto(url);
  await expect(telefon.getByTestId("bid-panel")).toBeVisible();
  await expect(calculator.getByTestId("bid-panel")).toBeVisible();

  const istoric = (p: Page) => p.getByTestId("bid-row");
  const poze = async (eticheta: string) => {
    // dovada e in zona de licitare: pretul, insignele si istoricul
    for (const pg of [telefon, calculator]) {
      await pg.getByTestId("bid-history-box").scrollIntoViewIfNeeded();
      await pg.waitForTimeout(300);
    }
    await telefon.screenshot({ path: `${POZE}/${eticheta}-telefon.png` });
    await calculator.screenshot({ path: `${POZE}/${eticheta}-calculator.png` });
  };
  await poze("0-inainte");

  /** Prețul de pe un ecran, în bani. */
  const pret = async (pg: Page) =>
    Math.round(
      Number(
        (await pg.getByTestId("current-price").innerText())
          .replace(/[^\d,.]/g, "")
          .replace(/\.(?=\d{3})/g, "")
          .replace(",", ".")
      ) * 100
    );

  // 1) telefonul licitează cu plafon 500 — calculatorul trebuie să afle singur
  await post(telefon.request, `/api/auctions/${auctionId}/bid`, { maxCents: 50_000 });
  await expect(istoric(calculator)).toHaveCount(1, { timeout: 20_000 });
  const pas1 = await pret(calculator);
  expect(await pret(telefon)).toBe(pas1);
  await poze("1-telefonul-a-licitat-plafon-500");

  // 2) calculatorul pune plafon 550 — prețul urcă o treaptă peste 500, nu la 550
  await post(calculator.request, `/api/auctions/${auctionId}/bid`, { maxCents: 55_000 });
  await expect(istoric(telefon)).toHaveCount(2, { timeout: 20_000 });
  await expect(async () => {
    expect(await pret(telefon), "telefonul nu a primit prețul nou").toBeGreaterThan(pas1);
  }).toPass({ timeout: 20_000 });
  const pas2 = await pret(telefon);
  expect(await pret(calculator)).toBe(pas2);
  await expect(telefon.getByTestId("outbid-badge")).toBeVisible();
  await expect(calculator.getByTestId("leading-badge")).toBeVisible();
  await poze("2-calculatorul-a-pus-plafon-550");

  // 3) telefonul pune plafon 600 — conducerea revine la el, fără reîncărcare
  await post(telefon.request, `/api/auctions/${auctionId}/bid`, { maxCents: 60_000 });
  await expect(istoric(calculator)).toHaveCount(3, { timeout: 20_000 });
  await expect(async () => {
    expect(await pret(calculator), "calculatorul nu a primit prețul nou").toBeGreaterThan(pas2);
  }).toPass({ timeout: 20_000 });
  const pas3 = await pret(calculator);
  expect(await pret(telefon)).toBe(pas3);
  await expect(calculator.getByTestId("outbid-badge")).toBeVisible();
  await expect(telefon.getByTestId("leading-badge")).toBeVisible();
  await poze("3-telefonul-a-pus-plafon-600");

  // amândouă ecranele arată același istoric, în aceeași ordine
  const textTelefon = (await istoric(telefon).allInnerTexts()).map((t) => t.replace(/\s+/g, " ").trim());
  const textCalc = (await istoric(calculator).allInnerTexts()).map((t) => t.replace(/\s+/g, " ").trim());
  expect(textTelefon, "istoricul diferă între ecrane").toEqual(textCalc);

  console.log(`PREȚURI: ${pas1 / 100} -> ${pas2 / 100} -> ${pas3 / 100}`);
  console.log("ISTORIC (identic pe ambele ecrane):\n" + textTelefon.join("\n"));
  await ctxTelefon.close();
  await ctxCalc.close();
  await ctxAdmin.close();
});
