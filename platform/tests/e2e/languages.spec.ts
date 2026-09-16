import { test, expect } from "@playwright/test";
import de from "../../messages/de.json";
import ar from "../../messages/ar.json";
import ja from "../../messages/ja.json";

/** Cele 13 limbi: lista din antet, textele traduse, pagina în oglindă pentru arabă. */
test.describe("Limbile site-ului", () => {
  test("lista are toate cele 13 limbi, cu numele scris în limba lor", async ({ page }) => {
    await page.goto("/ro");
    const options = page.getByTestId("lang-select").locator("option");
    await expect(options).toHaveCount(13);
    for (const name of ["English", "中文", "日本語", "Nederlands", "Français", "Deutsch", "Español", "Polski", "العربية", "Română", "Kiswahili"]) {
      await expect(page.getByTestId("lang-select")).toContainText(name);
    }
  });

  test("germana: prima pagină tradusă, conținutul adminului în engleză", async ({ page }) => {
    await page.goto("/de");
    await expect(page.locator("html")).toHaveAttribute("lang", "de");
    await expect(page.locator("html")).toHaveAttribute("dir", "ltr");
    await expect(page.locator("h1")).toContainText(de.home.heroTitle);
    // numele porumbelului rămâne, rubrica e în germană
    await page.goto("/de/auctions?q=445566");
    await expect(page.getByTestId("auction-card").filter({ hasText: "Fulger Albastru" })).toBeVisible();
  });

  test("araba: pagina întreagă de la dreapta la stânga", async ({ page }) => {
    await page.goto("/ar");
    await expect(page.locator("html")).toHaveAttribute("dir", "rtl");
    await expect(page.locator("h1")).toContainText(ar.home.heroTitle);
    const direction = await page.locator("body").evaluate((el) => getComputedStyle(el).direction);
    expect(direction).toBe("rtl");
    // pagina porumbelului se deschide și în arabă
    await page.goto("/ar/auctions?q=445566");
    await page.getByTestId("auction-card").filter({ hasText: "Fulger Albastru" }).click();
    await expect(page.getByTestId("lot-title")).toContainText("Fulger Albastru");
    await expect(page.getByTestId("login-to-bid")).toBeVisible();
  });

  test("schimbarea limbii din listă păstrează pagina", async ({ page }) => {
    await page.goto("/ro/how-it-works");
    await page.getByTestId("lang-select").selectOption("ja");
    await expect(page).toHaveURL(/\/ja\/how-it-works$/);
    await expect(page.locator("html")).toHaveAttribute("lang", "ja");
    await expect(page.locator("h1")).toContainText(ja.how.title);
  });
});
