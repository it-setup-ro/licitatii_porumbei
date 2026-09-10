import { test, expect } from "@playwright/test";
import { login } from "./helpers";

/**
 * Antetul si subsolul, dupa macheta clientului: deviza, casuta de cautare,
 * subsolul cu patru coloane. Cautarea trebuie sa duca undeva real — de aceea
 * se verifica si rezultatul, nu doar ca exista campul.
 */

test.describe("Antetul", () => {
  test("deviza sta in bara de sus, pe calculator", async ({ page }) => {
    await page.goto("/ro");
    await expect(page.getByTestId("top-tagline")).toContainText("O comunitate");
  });

  test("cautarea din antet duce in licitatii, cu termenul pastrat", async ({ page }) => {
    await page.goto("/ro");
    await page.getByTestId("header-search").fill("Fulger");
    await page.getByTestId("header-search").press("Enter");
    await page.waitForURL(/\/auctions\?q=Fulger/);
    await expect(page.getByTestId("auction-card").first()).toContainText("Fulger");
  });

  test("pe telefon cautarea sta in meniu, nu in antet", async ({ page }) => {
    await page.setViewportSize({ width: 375, height: 812 });
    await page.goto("/ro");
    await expect(page.getByTestId("header-search")).toBeHidden();
    await page.getByTestId("mobile-menu-button").click();
    await page.getByTestId("m-search").fill("Fulger");
    await page.getByTestId("m-search").press("Enter");
    await page.waitForURL(/\/auctions\?q=Fulger/);
  });
});

test.describe("Subsolul", () => {
  test("are coloanele si deviza", async ({ page }) => {
    await page.goto("/ro");
    const subsol = page.getByTestId("site-footer");
    await expect(subsol.getByTestId("footer-useful")).toContainText("Licitații");
    await expect(subsol.getByTestId("footer-info")).toContainText("Regulament");
    await expect(subsol.getByTestId("footer-motto")).toContainText("Campioni");
  });

  test("linkurile din subsol chiar deschid paginile", async ({ page }) => {
    await page.goto("/ro");
    await page.getByTestId("footer-info").getByText("Regulament").click();
    await page.waitForURL(/\/info\/regulament$/);
    await expect(page.locator("h1").first()).toBeVisible();
  });

  test("datele de contact vin din Setari, nu din cod", async ({ page }) => {
    await login(page, "admin@nbp.test", "admin1234");
    const seteaza = (email: string, telefon: string) =>
      page.request.post("/api/admin/settings", {
        data: { updates: { contactEmail: email, contactPhone: telefon } },
      });

    try {
      expect((await seteaza("contact@nbp.test", "0740 000 000")).ok()).toBe(true);
      await page.goto("/ro");
      const contact = page.getByTestId("footer-contact");
      await expect(contact.locator('a[href="mailto:contact@nbp.test"]')).toBeVisible();
      await expect(contact.locator('a[href="tel:0740000000"]')).toBeVisible();
    } finally {
      // le stergem la loc: fara ele, subsolul nu are ce afisa — si asta e ideea
      expect((await seteaza("", "")).ok()).toBe(true);
    }

    await page.goto("/ro");
    const contact = page.getByTestId("footer-contact");
    await expect(contact.locator('a[href^="mailto:"]')).toHaveCount(0);
    await expect(contact.getByTestId("footer-contact-page")).toBeVisible();
  });
});
