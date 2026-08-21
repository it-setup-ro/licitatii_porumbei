import { test, expect } from "@playwright/test";
import { login } from "./helpers";

/** Ecran de telefon — problema raportata: meniurile nu apareau deloc pe mobil. */
test.use({ viewport: { width: 390, height: 844 } });

test.describe("Meniu pe telefon", () => {
  test("adminul are toate meniurile in panoul hamburger", async ({ page }) => {
    await page.goto("/ro/login");
    await page.getByTestId("login-email").fill("admin@nbp.test");
    await page.getByTestId("login-password").fill("admin1234");
    await page.getByTestId("login-submit").click();
    // clopotelul apare doar cand esti logat — semnal ca sesiunea s-a stabilit
    await expect(page.getByTestId("notif-bell")).toBeVisible();

    // pe mobil linkurile din bara desktop sunt ascunse
    await expect(page.getByTestId("nav-admin")).toBeHidden();

    // deschide hamburgerul -> toate optiunile, inclusiv Administrare si Vinde
    await page.getByTestId("mobile-menu-button").click();
    const menu = page.getByTestId("mobile-menu");
    await expect(menu).toBeVisible();
    await expect(menu.getByTestId("m-auctions")).toBeVisible();
    await expect(menu.getByTestId("m-info-rules")).toBeVisible();
    await expect(menu.getByTestId("m-sell")).toBeVisible();
    await expect(menu.getByTestId("m-admin")).toBeVisible();
    await expect(menu.getByTestId("m-account")).toBeVisible();
    await expect(menu.getByTestId("m-logout")).toBeVisible();

    // navigarea din panou functioneaza si panoul se inchide singur
    await menu.getByTestId("m-admin").click();
    await expect(page).toHaveURL(/\/ro\/admin$/);
    await expect(page.getByTestId("mobile-menu")).toHaveCount(0);
  });

  test("vizitatorul nelogat vede Autentificare/Cont nou in panou, fara optiuni de admin", async ({
    page,
  }) => {
    await page.goto("/ro");
    await page.getByTestId("mobile-menu-button").click();
    const menu = page.getByTestId("mobile-menu");
    await expect(menu.getByTestId("m-login")).toBeVisible();
    await expect(menu.getByTestId("m-register")).toBeVisible();
    await expect(menu.getByTestId("m-admin")).toHaveCount(0);
    await expect(menu.getByTestId("m-sell")).toHaveCount(0);
  });

  test("cumparatorul nu vede Administrare si nici Vinde un porumbel", async ({ page }) => {
    await page.goto("/ro/login");
    await page.getByTestId("login-email").fill("buyer1@nbp.test");
    await page.getByTestId("login-password").fill("buyer1234");
    await page.getByTestId("login-submit").click();
    await expect(page.getByTestId("notif-bell")).toBeVisible();

    await page.getByTestId("mobile-menu-button").click();
    const menu = page.getByTestId("mobile-menu");
    await expect(menu.getByTestId("m-auctions")).toBeVisible();
    await expect(menu.getByTestId("m-products")).toBeVisible();
    await expect(menu.getByTestId("m-admin")).toHaveCount(0);
    await expect(menu.getByTestId("m-sell")).toHaveCount(0);
  });
});

test.describe("Clopotelul de notificari", () => {
  test("duce la pagina de notificari si afiseaza numarul de necitite", async ({ page }) => {
    await page.goto("/ro/login");
    await page.getByTestId("login-email").fill("buyer1@nbp.test");
    await page.getByTestId("login-password").fill("buyer1234");
    await page.getByTestId("login-submit").click();

    const bell = page.getByTestId("notif-bell");
    await expect(bell).toBeVisible();
    await bell.click();
    await expect(page).toHaveURL(/\/ro\/account\/notifications$/);
  });

  test("vizitatorul nelogat nu vede clopotelul", async ({ page }) => {
    await page.goto("/ro");
    await expect(page.getByTestId("notif-bell")).toHaveCount(0);
  });
});
