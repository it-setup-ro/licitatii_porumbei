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

test.describe("Crescătorii", () => {
  test("pagina de crescători arată cardurile cu poză și localitate", async ({ page }) => {
    await page.goto("/ro/sellers");
    await expect(page.getByTestId("sellers-title")).toContainText("Crescători");
    const card = page.getByTestId("seller-card").filter({ hasText: "Columbodromul Câmpeanu" });
    await expect(card).toBeVisible();
    await expect(card.getByTestId("seller-card-city")).toContainText("Arad");
    // poza vine de la un lot al lui, nu de la o crescatorie inventata
    await expect(card.locator("img")).toBeVisible();

    await card.click();
    await page.waitForURL(/\/sellers\/[a-z0-9]+$/);
    await expect(page.getByTestId("seller-name")).toContainText("Columbodromul Câmpeanu");
    await expect(page.getByTestId("seller-city")).toContainText("Arad");
  });

  test("linkul „Crescători” din subsol chiar duce acolo", async ({ page }) => {
    await page.goto("/ro");
    await page.getByTestId("footer-useful").getByText("Crescători").click();
    await page.waitForURL(/\/sellers$/);
    await expect(page.getByTestId("sellers-title")).toBeVisible();
  });

  test("cardul de pe prima pagină are poză, localitate și numărul de loturi", async ({ page }) => {
    await page.goto("/ro");
    const card = page.getByTestId("breeder-card").first();
    await expect(card).toBeVisible();
    await expect(card.getByTestId("breeder-photo")).toBeVisible();
    await expect(card).toContainText("la licitație");
  });

  test("crescătorul își poate corecta datele, dar nu IBAN-ul", async ({ page }) => {
    await login(page, "seller@nbp.test", "seller1234");
    await page.goto("/ro/account");
    await page.getByTestId("sp-open").click();
    await page.getByTestId("sp-city").fill("Arad");
    await expect(page.getByTestId("sp-form")).not.toContainText("IBAN");
    await page.getByTestId("sp-save").click();
    await expect(page.getByTestId("sp-done")).toBeVisible();

    // se si vede unde trebuie
    await page.goto("/ro/sellers");
    await expect(
      page.getByTestId("seller-card").filter({ hasText: "Columbodromul Câmpeanu" })
    ).toContainText("Arad");
  });

  test("un cumpărător nu poate schimba datele altui crescător", async ({ page }) => {
    await login(page, "buyer1@nbp.test", "buyer1234");
    const res = await page.request.post("/api/account/seller-profile", {
      data: { sellerCompany: "Preluare ostilă", sellerCity: "X", sellerBio: "" },
    });
    expect(res.status()).toBe(403);
  });
});
