import { test, expect } from "@playwright/test";

/**
 * Meniurile cu mai mult continut — Articole, Concursuri, Informatii — stau
 * stranse si se desfac la clic, si pe calculator, si pe telefon.
 */

test.describe("Meniuri strânse pe calculator", () => {
  test("Articole se desface si arata ultimele articole plus lista completa", async ({ page }) => {
    await page.goto("/ro");
    const nav = page.getByTestId("main-nav");

    // strâns: submeniul nu exista in pagina pana la clic
    await expect(page.getByTestId("articles-submenu")).toHaveCount(0);

    await nav.getByTestId("nav-articles").click();
    const sub = page.getByTestId("articles-submenu");
    await expect(sub).toBeVisible();

    // ultimele articole publicate (cel mult 5) + intrarea „Toate articolele".
    // Numarul exact depinde de ce au publicat testele dinainte — verificam
    // doar ca sunt intre 1 si 5.
    const count = await sub.getByTestId("nav-article").count();
    expect(count).toBeGreaterThan(0);
    expect(count).toBeLessThanOrEqual(5);
    await expect(sub.getByTestId("nav-articles-all")).toBeVisible();

    // un titlu real, nu o eticheta generica
    await expect(sub.getByTestId("nav-article").first()).not.toHaveText("");
  });

  test("un articol din submeniu duce direct la articol", async ({ page }) => {
    await page.goto("/ro");
    await page.getByTestId("nav-articles").click();
    await page.getByTestId("nav-article").first().click();
    await expect(page).toHaveURL(/\/ro\/articles\/[a-z0-9-]+$/);
    await expect(page.locator("h1")).toBeVisible();
  });

  test("„Toate articolele” duce la listare", async ({ page }) => {
    await page.goto("/ro");
    await page.getByTestId("nav-articles").click();
    await page.getByTestId("nav-articles-all").click();
    await expect(page).toHaveURL(/\/ro\/articles$/);
  });

  test("un singur meniu deschis la un moment dat", async ({ page }) => {
    await page.goto("/ro");
    await page.getByTestId("nav-articles").click();
    await expect(page.getByTestId("articles-submenu")).toBeVisible();

    await page.getByTestId("nav-info").click();
    await expect(page.getByTestId("info-submenu")).toBeVisible();
    await expect(page.getByTestId("articles-submenu")).toHaveCount(0);

    // clic in afara navigatiei inchide tot
    await page.locator("main").click({ position: { x: 5, y: 5 } });
    await expect(page.getByTestId("info-submenu")).toHaveCount(0);
  });

  test("Concursuri ramane dropdown cu linkuri externe", async ({ page }) => {
    await page.goto("/ro");
    await page.getByTestId("nav-contests").click();
    const sub = page.getByTestId("contests-submenu");
    await expect(sub.getByTestId("contest-link")).toHaveCount(5);
    await expect(sub.getByTestId("contest-link-soon")).toHaveCount(1);
  });
});

test.describe("Meniuri strânse pe telefon", () => {
  test.use({ viewport: { width: 375, height: 812 } });

  test("panoul porneste strâns: doar capetele de grup, fara subintrari", async ({ page }) => {
    await page.goto("/ro");
    await page.getByTestId("mobile-menu-button").click();
    const menu = page.getByTestId("mobile-menu");

    // capetele de grup se vad
    await expect(menu.getByTestId("m-articles-toggle")).toBeVisible();
    await expect(menu.getByTestId("m-contests-toggle")).toBeVisible();
    await expect(menu.getByTestId("m-info-toggle")).toBeVisible();

    // continutul lor, nu
    await expect(menu.getByTestId("m-article")).toHaveCount(0);
    await expect(menu.getByTestId("contest-link")).toHaveCount(0);
    await expect(menu.getByTestId("m-info-rules")).toHaveCount(0);

    // linkurile simple raman la vedere
    await expect(menu.getByTestId("m-auctions")).toBeVisible();
    await expect(menu.getByTestId("m-products")).toBeVisible();
  });

  test("un grup se desface la clic, iar panoul ramane deschis", async ({ page }) => {
    await page.goto("/ro");
    await page.getByTestId("mobile-menu-button").click();
    const menu = page.getByTestId("mobile-menu");

    await menu.getByTestId("m-articles-toggle").click();
    await expect(menu).toBeVisible(); // nu s-a inchis tot panoul
    const count = await menu.getByTestId("m-article").count();
    expect(count).toBeGreaterThan(0);
    expect(count).toBeLessThanOrEqual(5);
    await expect(menu.getByTestId("m-articles-all")).toBeVisible();

    // se strânge la loc
    await menu.getByTestId("m-articles-toggle").click();
    await expect(menu.getByTestId("m-article")).toHaveCount(0);
  });

  test("deschiderea unui grup îl închide pe celălalt", async ({ page }) => {
    await page.goto("/ro");
    await page.getByTestId("mobile-menu-button").click();
    const menu = page.getByTestId("mobile-menu");

    await menu.getByTestId("m-contests-toggle").click();
    await expect(menu.getByTestId("contest-link")).toHaveCount(5);

    await menu.getByTestId("m-info-toggle").click();
    await expect(menu.getByTestId("m-info-rules")).toBeVisible();
    await expect(menu.getByTestId("contest-link")).toHaveCount(0);
  });

  test("panoul se redeschide strâns dupa ce a fost inchis", async ({ page }) => {
    await page.goto("/ro");
    await page.getByTestId("mobile-menu-button").click();
    await page.getByTestId("m-info-toggle").click();
    await expect(page.getByTestId("m-info-rules")).toBeVisible();

    await page.getByTestId("mobile-menu-button").click();
    await expect(page.getByTestId("mobile-menu")).toHaveCount(0);
    await page.getByTestId("mobile-menu-button").click();
    await expect(page.getByTestId("m-info-rules")).toHaveCount(0);
  });

  test("un articol din panou duce la articol si inchide panoul", async ({ page }) => {
    await page.goto("/ro");
    await page.getByTestId("mobile-menu-button").click();
    await page.getByTestId("m-articles-toggle").click();
    await page.getByTestId("m-article").first().click();
    await expect(page).toHaveURL(/\/ro\/articles\/[a-z0-9-]+$/);
    await expect(page.getByTestId("mobile-menu")).toHaveCount(0);
  });
});
