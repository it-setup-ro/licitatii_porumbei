import { test, expect } from "@playwright/test";
import { login } from "./helpers";

/**
 * Cerințele clientului: istoricul tranzacțiilor în administrare, plus
 * ascunderea unui porumbel de pe site (mai ales cei la preț fix).
 */

test.describe("Istoric tranzacții", () => {
  test("se deschide, are totaluri și se poate descărca în Excel", async ({ page }) => {
    await login(page, "admin@nbp.test", "admin1234");
    await page.goto("/ro/admin/transactions");

    await expect(page.locator("h1")).toContainText("Istoric tranzacții");
    await expect(page.getByTestId("tx-totals")).toBeVisible();
    await expect(page.getByTestId("tx-totals")).toContainText("Comision platformă");

    // filtrele nu strică pagina nici când nu găsesc nimic
    await page.getByTestId("tx-q").fill("porumbel-care-nu-exista-xyz");
    await page.getByTestId("tx-filter").click();
    await expect(page.getByTestId("tx-empty")).toBeVisible();

    // exportul răspunde cu un fișier Excel
    const res = await page.request.get("/api/admin/transactions/export");
    expect(res.ok()).toBe(true);
    expect(res.headers()["content-type"]).toContain("spreadsheet");
  });
});

test.describe("Ascunderea unui porumbel", () => {
  test("un porumbel la preț fix se ascunde de pe site și se aduce înapoi", async ({ page }) => {
    await login(page, "admin@nbp.test", "admin1234");
    await page.goto("/ro/admin/fixed-price");
    await expect(page.locator("h1")).toContainText("Preț fix");

    const rand = page.getByTestId("fixed-row").first();
    if ((await page.getByTestId("fixed-row").count()) === 0) {
      // baza de test nu are porumbei la preț fix: nu e nimic de verificat
      await expect(page.getByTestId("no-fixed")).toBeVisible();
      return;
    }

    // numele porumbelului, ca să-l caut pe site
    const nume = (await rand.locator("a").first().innerText()).trim();

    await rand.getByTestId("auction-hide").click();
    await expect(rand.getByTestId("auction-hidden-note")).toBeVisible();

    // nu mai apare în lista publică de preț fix
    await page.goto("/ro/fixed-price");
    await expect(page.getByTestId("fixed-card").filter({ hasText: nume })).toHaveCount(0);

    // înapoi pe site
    await page.goto("/ro/admin/fixed-price");
    const acelasi = page.getByTestId("fixed-row").filter({ hasText: nume }).first();
    await acelasi.getByTestId("auction-show").click();
    await expect(acelasi.getByTestId("auction-hidden-note")).toHaveCount(0);

    await page.goto("/ro/fixed-price");
    await expect(page.getByTestId("fixed-card").filter({ hasText: nume }).first()).toBeVisible();
  });
});

test.describe("Cereri fără corp", () => {
  test("o cerere goală primește un răspuns curat, nu eroare de server", async ({ page }) => {
    await login(page, "admin@nbp.test", "admin1234");
    // Prins pe serverul viu: ascunderea unei licitații trimisă fără corp JSON
    // răspundea „INTERNAL" 500, ca și cum s-ar fi stricat ceva.
    const gol = await page.request.post("/api/admin/auctions/oricare/hide");
    expect(gol.status()).toBe(400);
    expect((await gol.json()).error).toBe("INVALID_JSON");

    // cu corp bun, dar pe o licitație inexistentă, răspunsul e cel așteptat
    const inexistent = await page.request.post("/api/admin/auctions/oricare/hide", {
      data: { hidden: true },
    });
    expect(inexistent.status()).toBe(404);
  });
});
