import { test, expect } from "@playwright/test";

/**
 * Meniul de sus, după cererea clientului: intrări simple, care duc direct la
 * pagină. Singurul meniu care se desface a rămas „Curse & Rezultate" — acolo
 * sunt linkuri către site-uri externe, care n-au unde altundeva să stea.
 */

test.describe("Meniul pe calculator", () => {
  test("Articole duce direct la lista de articole, fără submeniu", async ({ page }) => {
    await page.goto("/ro");
    const nav = page.getByTestId("main-nav");

    await expect(page.getByTestId("articles-submenu")).toHaveCount(0);
    await nav.getByTestId("nav-articles").click();
    await expect(page).toHaveURL(/\/ro\/articles$/);
    await expect(page.getByTestId("articles-submenu")).toHaveCount(0);
    // casetele mici, un articol pe rând
    await expect(page.getByTestId("article-card").first()).toBeVisible();
  });

  test("Crescători duce direct la pagina crescătorilor", async ({ page }) => {
    await page.goto("/ro");
    await page.getByTestId("nav-community").click();
    await page.waitForURL(/\/sellers$/);
    await expect(page.getByTestId("sellers-title")).toBeVisible();
    await expect(page.getByTestId("community-submenu")).toHaveCount(0);
  });

  test("Curse & Rezultate rămâne dropdown cu linkuri externe", async ({ page }) => {
    await page.goto("/ro");
    await page.getByTestId("nav-contests").click();
    const sub = page.getByTestId("contests-submenu");
    await expect(sub.getByTestId("contest-link")).toHaveCount(5);
    await expect(sub.getByTestId("contest-link-soon")).toHaveCount(1);

    // clic în afara navigației închide meniul
    await page.locator("main").click({ position: { x: 5, y: 5 } });
    await expect(page.getByTestId("contests-submenu")).toHaveCount(0);
  });
});

test.describe("Meniul pe telefon", () => {
  test.use({ viewport: { width: 375, height: 812 } });

  test("panoul are linkuri simple, iar Curse & Rezultate se desface", async ({ page }) => {
    await page.goto("/ro");
    await page.getByTestId("mobile-menu-button").click();
    const menu = page.getByTestId("mobile-menu");

    // linkuri simple, fără capete de grup
    await expect(menu.getByTestId("m-articles")).toBeVisible();
    await expect(menu.getByTestId("m-community")).toBeVisible();
    await expect(menu.getByTestId("m-auctions")).toBeVisible();
    await expect(menu.getByTestId("m-products")).toBeVisible();
    await expect(menu.getByTestId("m-articles-toggle")).toHaveCount(0);
    await expect(menu.getByTestId("m-info-toggle")).toHaveCount(0);

    // singurul grup rămas
    await expect(menu.getByTestId("m-contests-toggle")).toBeVisible();
    await expect(menu.getByTestId("contest-link")).toHaveCount(0);
    await menu.getByTestId("m-contests-toggle").click();
    await expect(menu).toBeVisible(); // nu s-a închis tot panoul
    await expect(menu.getByTestId("contest-link")).toHaveCount(5);
    await menu.getByTestId("m-contests-toggle").click();
    await expect(menu.getByTestId("contest-link")).toHaveCount(0);
  });

  test("Articole din panou duce la listă și închide panoul", async ({ page }) => {
    await page.goto("/ro");
    await page.getByTestId("mobile-menu-button").click();
    await page.getByTestId("m-articles").click();
    await expect(page).toHaveURL(/\/ro\/articles$/);
    await expect(page.getByTestId("mobile-menu")).toHaveCount(0);
  });

  test("panoul se redeschide strâns după ce a fost închis", async ({ page }) => {
    await page.goto("/ro");
    await page.getByTestId("mobile-menu-button").click();
    await page.getByTestId("m-contests-toggle").click();
    await expect(page.getByTestId("contest-link").first()).toBeVisible();

    await page.getByTestId("mobile-menu-button").click();
    await expect(page.getByTestId("mobile-menu")).toHaveCount(0);
    await page.getByTestId("mobile-menu-button").click();
    await expect(page.getByTestId("contest-link")).toHaveCount(0);
  });
});
