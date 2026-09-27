import { test, expect, type Page, type APIRequestContext } from "@playwright/test";
import { login } from "./helpers";

/**
 * Cine conduce licitația se bate cu propriul plafon, nu cu prețul afișat.
 *
 * Clientul, pe clip: câmpul arăta 325, iar LICITEAZĂ răspundea „Minimul este
 * 1.750 lei" și sărea singur acolo — fiindcă suma propusă era cea pentru un
 * contracandidat, nu pentru el. Testul ține minte regula: suma pe care ți-o
 * propune pagina trebuie să fie primită de fiecare dată.
 */

const MIN = 60_000;
const uid = () => `${Date.now()}${Math.floor(Math.random() * 1000)}`;

async function post(req: APIRequestContext, url: string, data?: unknown) {
  const res = await req.post(url, data === undefined ? {} : { data });
  return { status: res.status(), body: await res.json() };
}

/** Un porumbel pornit într-un lot, numai al acestui test. */
async function porumbelLive(admin: Page) {
  const id = uid();
  const b = await post(admin.request, "/api/admin/breeders", { name: `Crescător Plafon ${id}` });
  const sale = await post(admin.request, "/api/admin/sales", {
    breederId: b.body.id,
    slug: `plafon-${id}`,
    titleRo: `Licitația plafon ${id}`,
    titleEn: `Ceiling auction ${id}`,
    commissionPercent: 10,
  });
  expect(sale.body.ok, JSON.stringify(sale.body)).toBe(true);
  const lot = await post(admin.request, `/api/admin/sales/${sale.body.id}/lots`, {
    startsAt: new Date(Date.now() - MIN).toISOString(),
    endsAt: new Date(Date.now() + 120 * MIN).toISOString(),
  });
  const ring = `RO 2025 ${id.slice(-6)}`;
  const add = await post(admin.request, `/api/admin/sale-lots/${lot.body.id}/pigeons`, {
    ringNumber: ring,
    sex: "M",
    name: `Plafon ${id}`,
    startPriceCents: 15_000,
  });
  expect(add.body.ok, JSON.stringify(add.body)).toBe(true);
  await post(admin.request, `/api/lots/${add.body.auctionId}`, {
    ringNumber: ring,
    sex: "M",
    name: `Plafon ${id}`,
    startPriceCents: 15_000,
    media: [{ url: "/pigeons/voiajor-grizzle.jpg", type: "IMAGE" }],
  });
  expect((await post(admin.request, `/api/admin/sale-lots/${lot.body.id}/start`)).body.ok).toBe(true);
  return add.body.auctionId as string;
}

/** Suma din câmp, în bani. */
async function dinCamp(page: Page) {
  return Math.round(Number(await page.getByTestId("bid-input").inputValue()) * 100);
}

test.describe("Plafonul propriu", () => {
  test("suma propusă e primită de fiecare dată, și când tu conduci", async ({ page, browser }) => {
    test.setTimeout(180_000);
    await login(page, "admin@nbp.test", "admin1234");
    const auctionId = await porumbelLive(page);

    const ctx = await browser.newContext({ locale: "ro-RO" });
    const buyer = await ctx.newPage();
    await login(buyer, "buyer1@nbp.test", "buyer1234");
    await buyer.goto(`/ro/auctions/${auctionId}`);

    // 1) prima ofertă, cu plafon mult peste preț: preia conducerea
    await expect(buyer.getByTestId("bid-input")).toBeVisible();
    await expect(async () => {
      await buyer.getByTestId("bid-input").fill("500");
      await expect(buyer.getByTestId("bid-input")).toHaveValue("500", { timeout: 1_000 });
    }).toPass({ timeout: 20_000 });
    await buyer.getByTestId("bid-submit").click();
    await expect(buyer.getByTestId("leading-badge")).toBeVisible();

    // 2) plafonul lui se vede, iar eticheta spune că minimul e pentru ridicarea lui
    await expect(buyer.getByTestId("your-ceiling")).toContainText("500");
    await expect(buyer.getByTestId("bid-use-minimum")).toContainText("ridici plafonul");

    // 3) suma propusă e peste plafonul lui, nu „prețul + un pas"
    const propus = await dinCamp(buyer);
    expect(propus, "suma propusă trebuie să treacă de plafonul propriu").toBeGreaterThan(50_000);

    // 4) și e primită: exact asta nu mergea (răspundea „Ofertă prea mică")
    await buyer.getByTestId("bid-submit").click();
    await expect(buyer.getByTestId("bid-message")).toContainText("lider");
    await expect(buyer.getByTestId("your-ceiling")).toContainText(String(propus / 100));

    // 5) a doua oară la fel: suma propusă urcă din nou peste plafonul nou
    const alDoilea = await dinCamp(buyer);
    expect(alDoilea).toBeGreaterThan(propus);
    await buyer.getByTestId("bid-submit").click();
    await expect(buyer.getByTestId("bid-message")).toContainText("lider");

    // 6) o sumă sub plafonul propriu primește mesajul potrivit, nu „ofertă prea mică"
    await buyer.getByTestId("bid-input").fill("300");
    await buyer.getByTestId("bid-submit").click();
    await expect(buyer.getByTestId("bid-message")).toContainText("Conduci deja licitația");

    // 7) mesajul vechi nu rămâne pe ecran când omul schimbă suma
    await buyer.getByTestId("bid-input").fill("9999");
    await expect(buyer.getByTestId("bid-message")).toHaveCount(0);

    await ctx.close();
  });
});
