import { test, expect } from "@playwright/test";

test.describe("Pagini publice & i18n", () => {
  test("homepage RO afiseaza sectiunile din macheta", async ({ page }) => {
    await page.goto("/ro");
    await expect(page.getByTestId("hero")).toBeVisible();
    await expect(page.getByTestId("feature-strip")).toBeVisible();
    await expect(page.getByTestId("breeders-strip")).toBeVisible();
    // Secțiunea arată doar cele 6 licitații care se închid primele. Ce porumbei
    // sunt acolo depinde de ce au creat testele rulate înainte (baza e comună),
    // deci se verifică doar că secțiunea are carduri, nu un nume anume.
    await expect(page.getByTestId("section-live").getByTestId("auction-card").first()).toBeVisible();
    await expect(page.getByTestId("home-articles")).toBeVisible();
    await expect(page.getByTestId("home-stats")).toBeVisible();
  });

  test("comutatorul de limba schimba continutul in engleza si pastreaza pagina", async ({
    page,
  }) => {
    await page.goto("/ro");
    await expect(page.locator("h1")).toContainText("Pasiunea unește oameni");
    await page.getByTestId("lang-select").selectOption("en");
    await expect(page).toHaveURL(/\/en$/);
    await expect(page.locator("h1")).toContainText("Passion brings people together");
    await page.getByTestId("lang-select").selectOption("ro");
    await expect(page.locator("h1")).toContainText("Pasiunea unește oameni");

    // numele porumbelului ramane acelasi in ambele limbi; se traduce rubrica
    await page.goto("/en/auctions?q=445566");
    const card = page.getByTestId("auction-card").filter({ hasText: "Fulger Albastru" });
    await expect(card).toBeVisible();
    await expect(card).toContainText("Long Distance Arad");
  });

  test("lista de licitatii cu taburi si cautare", async ({ page }) => {
    await page.goto("/ro/auctions");
    await expect(page.getByTestId("auction-card").first()).toBeVisible();
    await page.getByTestId("tab-closed").click();
    await expect(
      page.getByTestId("auction-card").filter({ hasText: "As de Fond" })
    ).toBeVisible();
    await page.getByTestId("tab-live").click();
    await page.getByTestId("search-input").fill("445566");
    await page.getByTestId("search-input").press("Enter");
    await expect(page.getByTestId("auction-card")).toHaveCount(1);
    await expect(page.getByTestId("auction-card")).toContainText("Fulger Albastru");
  });

  test("pagina lotului afiseaza fisa, pedigree, palmares si vanzatorul", async ({ page }) => {
    await page.goto("/ro/auctions");
    await page.getByTestId("auction-card").filter({ hasText: "Fulger Albastru" }).click();
    await expect(page.getByTestId("lot-title")).toContainText("Fulger Albastru");
    await expect(page.getByTestId("lot-tagline")).toContainText("Arad");
    await expect(page.getByTestId("fact-ring")).toContainText("RO 2023 445566");
    // „Reprodus de" e crescatorul de origine — diferit de contul care vinde
    await expect(page.getByTestId("fact-bred-by")).toContainText("Janssen Bros.");
    // pedigree-ul scanat sta intr-o fila a galeriei; arborele si palmaresul, sub buton
    await page.getByTestId("gallery-tab-pedigree").click();
    await expect(page.getByTestId("pedigree-open")).toBeVisible();
    await page.locator('[data-testid="lot-more"] summary').click();
    await expect(page.getByTestId("pedigree")).toContainText("Blue Thunder");
    await expect(page.getByTestId("results-table")).toContainText("Satu Mare");
    await expect(page.getByTestId("seller-link")).toBeVisible();
    // vizitator nelogat: buton de login in loc de formular de oferta
    await expect(page.getByTestId("login-to-bid")).toBeVisible();
  });

  test("profilul crescatorului cu rating si recenzii", async ({ page }) => {
    await page.goto("/ro/auctions");
    await page.getByTestId("auction-card").filter({ hasText: "Fulger Albastru" }).click();
    await page.getByTestId("seller-link").click();
    await expect(page.getByTestId("seller-name")).toContainText("Columbodromul Câmpeanu");
    await expect(page.getByTestId("seller-reviews")).toContainText("Porumbel superb");
  });

  test("pagina cum functioneaza exista in ambele limbi", async ({ page }) => {
    await page.goto("/ro/how-it-works");
    await expect(page.locator("h1")).toContainText("Cum funcționează");
    await page.goto("/en/how-it-works");
    await expect(page.locator("h1")).toContainText("How it works");
  });
});
