import { test, expect } from "@playwright/test";
import { login } from "./helpers";

/**
 * Căutarea de porumbei.
 *
 * Cazul care a pornit totul: un lot numit „CUCA lui NIȚĂ ” nu era găsit de
 * nimeni care scria „cuca lui nita” — baza compară exact, iar „ț” nu e „t”.
 */

async function lotCuNume(page: import("@playwright/test").Page, nume: string, serie: string) {
  await login(page, "seller@nbp.test", "seller1234");
  await page.goto("/ro/sell");
  await page.getByTestId("sf-ring").fill(serie);
  await page.getByTestId("sf-name").fill(nume);
  await page.getByTestId("sf-start-price").fill("150");
  await page.getByTestId("sell-submit").click();
  await expect(page.getByTestId("sell-success")).toBeVisible();

  const ctx = await page.context().browser()!.newContext({ locale: "ro-RO" });
  const admin = await ctx.newPage();
  await login(admin, "admin@nbp.test", "admin1234");
  await admin.goto("/ro/admin/lots");
  const row = admin.getByTestId("pending-lot-row").filter({ hasText: nume });
  await row.getByTestId("mod-approve").click();
  await expect(admin.getByTestId("pending-lot-row").filter({ hasText: nume })).toHaveCount(0);
  await ctx.close();
}

test.describe("Căutare", () => {
  test("găsește porumbelul scris cu majuscule și diacritice", async ({ page }) => {
    test.setTimeout(120_000);
    const serie = `RO 2025 ${Date.now().toString().slice(-6)}`;
    await lotCuNume(page, "CUCA lui NIȚĂ", serie);

    // asa cum scrie un om grabit: litere mici, fara diacritice
    await page.goto("/ro/auctions?q=cuca%20lui%20nita");
    await expect(page.getByTestId("auction-card").filter({ hasText: "CUCA" })).toBeVisible();

    // si invers: scrie cu diacritice, lotul e salvat fara
    await page.goto("/ro/auctions?q=NIȚĂ");
    await expect(page.getByTestId("auction-card").filter({ hasText: "CUCA" })).toBeVisible();
  });

  test("caseta din antet duce la același rezultat", async ({ page }) => {
    test.setTimeout(120_000);
    const serie = `RO 2025 ${(Date.now() + 1).toString().slice(-6)}`;
    await lotCuNume(page, "ȘOIMUL Mic", serie);

    await page.goto("/ro");
    await page.getByTestId("header-search").fill("soimul");
    await page.getByTestId("header-search").press("Enter");
    await page.waitForURL(/\/auctions\?q=soimul/);
    await expect(page.getByTestId("auction-card").filter({ hasText: "ȘOIMUL" })).toBeVisible();
  });

  test("caută și după serie, linie sau crescătorul de origine", async ({ page }) => {
    // „Fulger Albastru", RO 2023 445566, linia Janssen — lot activ din datele de pornire
    await page.goto("/ro/auctions?q=445566");
    await expect(page.getByTestId("auction-card").filter({ hasText: "Fulger" })).toBeVisible();
    await page.goto("/ro/auctions?q=janssen");
    await expect(page.getByTestId("auction-card").first()).toBeVisible();
  });

  test("dacă porumbelul e în altă filă, o spune și duce acolo", async ({ page }) => {
    // „As de Fond" e lot închis: la licitații active nu are ce căuta
    await page.goto("/ro/auctions?q=as%20de%20fond");
    await expect(page.getByTestId("no-results")).toContainText("Niciun porumbel găsit");
    const link = page.getByTestId("search-other-tab").first();
    await expect(link).toContainText("Închis");
    await link.click();
    await expect(page.getByTestId("auction-card").filter({ hasText: "As de Fond" })).toBeVisible();
  });

  test("o căutare fără nicio potrivire nu inventează rezultate", async ({ page }) => {
    await page.goto("/ro/auctions?q=zzz-nu-exista-asa-ceva");
    await expect(page.getByTestId("no-results")).toContainText("Niciun porumbel găsit");
    await expect(page.getByTestId("auction-card")).toHaveCount(0);
    await expect(page.getByTestId("search-other-tab")).toHaveCount(0);
  });
});
