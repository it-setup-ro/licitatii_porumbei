import { test, expect, type Page, type APIRequestContext } from "@playwright/test";
import { login, registrationData } from "./helpers";

/**
 * Cererile clientului din 14–15 septembrie:
 * - prețul cu echivalentul în cealaltă monedă, după curs (BNR sau manual), iar
 *   în formular căsuțele de lei și de euro se completează una din cealaltă;
 * - anul nu se mai cere și nu se mai afișează; sexul are semnul lui;
 * - porumbelul bolnav / mort după licitație: câștigătorul e anunțat;
 * - bifa de informare de la înregistrare abonează la noutăți.
 */

const MIN = 60_000;
const uid = () => `${Date.now()}${Math.floor(Math.random() * 1000)}`;

async function post(req: APIRequestContext, url: string, data?: unknown) {
  const res = await req.post(url, data === undefined ? {} : { data });
  return { status: res.status(), body: await res.json() };
}

async function setSettings(req: APIRequestContext, updates: Record<string, unknown>) {
  const r = await post(req, "/api/admin/settings", { updates });
  expect(r.body.ok, JSON.stringify(r.body)).toBe(true);
}

/** Un lot pornit, cu un porumbel cu poză. Seria nu are an scris separat. */
async function livePigeon(page: Page, sex: "M" | "F" | "U" = "M") {
  const id = uid();
  const breeder = await post(page.request, "/api/admin/breeders", { name: `Crescător Curs ${id}` });
  const sale = await post(page.request, "/api/admin/sales", {
    breederId: breeder.body.id,
    slug: `curs-${id}`,
    titleRo: `Licitația curs ${id}`,
    titleEn: `Rate auction ${id}`,
    commissionPercent: 10,
  });
  const lot = await post(page.request, `/api/admin/sales/${sale.body.id}/lots`, {
    startsAt: new Date(Date.now() - MIN).toISOString(),
    endsAt: new Date(Date.now() + 120 * MIN).toISOString(),
  });
  const ring = `RO 2024 ${id.slice(-6)}`;
  const add = await post(page.request, `/api/admin/sale-lots/${lot.body.id}/pigeons`, {
    ringNumber: ring,
    sex,
    name: `Fără An ${id.slice(-5)}`,
    startPriceCents: 20_000,
  });
  expect(add.body.ok, JSON.stringify(add.body)).toBe(true);
  const fisa = await post(page.request, `/api/lots/${add.body.auctionId}`, {
    ringNumber: ring,
    sex,
    name: `Fără An ${id.slice(-5)}`,
    startPriceCents: 20_000,
    media: [{ url: "/pigeons/voiajor-grizzle.jpg", type: "IMAGE" }],
  });
  expect(fisa.body.ok, JSON.stringify(fisa.body)).toBe(true);
  expect((await post(page.request, `/api/admin/sale-lots/${lot.body.id}/start`)).body.ok).toBe(true);
  return { auctionId: add.body.auctionId as string, ring };
}

test.describe("Lei și euro", () => {
  test("cursul manual: echivalentul apare lângă preț, iar căsuțele se completează una din alta", async ({
    page,
  }) => {
    test.setTimeout(90_000);
    await login(page, "admin@nbp.test", "admin1234");
    await setSettings(page.request, { currencyEquivalentEnabled: true });
    try {
      const r = await post(page.request, "/api/admin/fx", { action: "MANUAL", rate: 5 });
      expect(r.body).toMatchObject({ ok: true, mode: "MANUAL", manualRate: 5 });

      await page.goto("/ro/admin/settings");
      await expect(page.getByTestId("fx-current")).toContainText("5,0000");
      await expect(page.getByTestId("fx-mode")).toHaveText("scris de administrator");

      // formularul: moneda platformei în testele e EUR, cealaltă căsuță e în lei
      await page.goto("/ro/sell");
      const base = page.getByTestId("sf-start-price");
      const other = page.getByTestId("sf-start-price-other");
      await expect(async () => {
        await base.fill("100");
        await expect(other).toHaveValue("500", { timeout: 1_000 });
      }).toPass({ timeout: 15_000 });
      await other.fill("1000");
      await expect(base).toHaveValue("200");
      // cursul folosit stă sub căsuțe, cu legătura spre Setări pentru admin
      await expect(page.getByTestId("sf-start-price-rate")).toContainText("1 € = 5,0000 lei");
      await expect(page.getByTestId("sf-start-price-rate")).toContainText("administrator");
      await page.getByTestId("sf-start-price-rate-change").click();
      await expect(page).toHaveURL(/\/ro\/admin\/settings#curs$/);
      await expect(page.getByTestId("fx-card")).toBeVisible();

      // lângă preț, pe pagina porumbelului și pe card
      const { auctionId } = await livePigeon(page);
      await page.goto(`/ro/auctions/${auctionId}`);
      await expect(page.getByTestId("price-equiv").first()).toHaveText("≈ 1.000 lei");

      // un curs greșit primește explicație
      const gresit = await post(page.request, "/api/admin/fx", { action: "MANUAL", rate: 0 });
      expect(gresit.status).toBe(422);
    } finally {
      await setSettings(page.request, { currencyEquivalentEnabled: false, fxMode: "BNR" });
    }
  });
});

test.describe("Anul și sexul", () => {
  test("anul nu se mai cere și nu se mai afișează; sexul are semnul lui", async ({ page }) => {
    test.setTimeout(90_000);
    await login(page, "admin@nbp.test", "admin1234");
    const { auctionId, ring } = await livePigeon(page, "F");

    await page.goto(`/ro/auctions/${auctionId}`);
    await expect(page.getByTestId("lot-ring")).toContainText(ring);
    await expect(page.getByTestId("lot-sex")).toHaveText("♀ Femelă");
    await expect(page.locator('[data-testid="lot-year"]')).toHaveCount(0);

    await page.goto("/ro/sell");
    await expect(page.getByTestId("sell-form")).toBeVisible();
    await expect(page.locator('[data-testid="sf-year"]')).toHaveCount(0);
    await expect(page.getByTestId("sf-sex").locator("option")).toHaveText([
      "♂ Mascul",
      "♀ Femelă",
      "Pui / nedeterminat",
    ]);
  });
});

test.describe("Porumbel indisponibil după licitație", () => {
  test("adminul îl marchează, câștigătorul e anunțat, comanda se anulează", async ({
    page,
    browser,
  }) => {
    test.setTimeout(240_000);
    await login(page, "admin@nbp.test", "admin1234");
    const { auctionId } = await livePigeon(page);

    const ctx = await browser.newContext({ locale: "ro-RO" });
    const buyer = await ctx.newPage();
    await login(buyer, "buyer2@nbp.test", "buyer1234");
    const bid = await post(buyer.request, `/api/auctions/${auctionId}/bid`, { maxCents: 25_000 });
    expect(bid.body.ok, JSON.stringify(bid.body)).toBe(true);

    // înainte de închidere nu se poate
    const devreme = await post(page.request, `/api/admin/auctions/${auctionId}/unavailable`, {});
    expect(devreme.body.error).toBe("NOT_CLOSED");

    expect((await post(page.request, `/api/admin/lots/${auctionId}/shorten`)).body.ok).toBe(true);
    await expect(async () => {
      await page.goto(`/ro/auctions/${auctionId}`);
      await expect(page.getByTestId("winner-note")).toBeVisible({ timeout: 2_000 });
    }).toPass({ timeout: 180_000, intervals: [5_000] });

    page.once("dialog", (d) => d.accept("S-a îmbolnăvit"));
    await page.getByTestId("pigeon-unavailable-button").click();
    await expect(page.getByTestId("pigeon-unavailable")).toBeVisible();
    await expect(page.getByTestId("pigeon-unavailable-button")).toHaveCount(0);

    await buyer.goto("/ro/account/notifications");
    await expect(buyer.getByText("nu mai este disponibil după licitație").first()).toBeVisible();
    await ctx.close();

    const iar = await post(page.request, `/api/admin/auctions/${auctionId}/unavailable`, {});
    expect(iar.body.error).toBe("ALREADY_UNAVAILABLE");
  });
});

test.describe("Acordul de informare la înregistrare", () => {
  test("bifat, contul nou apare la abonații la noutăți", async ({ page, browser }) => {
    const id = uid();
    const email = `info-${id}@e2e.test`;
    await page.goto("/ro");
    const r = await page.request.post("/api/auth/register", {
      data: registrationData({
        email,
        password: "parola12345",
        name: "Cont Informare",
        nickname: `Info ${id.slice(-5)}`,
        notifyAuctionEnding: true,
      }),
    });
    const body = await r.json();
    expect(body.ok, JSON.stringify(body)).toBe(true);

    const ctx = await browser.newContext({ locale: "ro-RO" });
    const admin = await ctx.newPage();
    await login(admin, "admin@nbp.test", "admin1234");
    await admin.goto("/ro/admin/newsletter");
    await expect(admin.getByText(email)).toBeVisible();
    await ctx.close();
  });
});
