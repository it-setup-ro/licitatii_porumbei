import { test, expect } from "@playwright/test";
import { login, fillRegisterForm } from "./helpers";

test.describe("Autentificare si conturi", () => {
  test("inregistrare cumparator nou + logout + login", async ({ page }) => {
    await page.goto("/ro/register");
    await fillRegisterForm(page, { firstName: "Test", lastName: "Cumpărător", email: "test-buyer@e2e.test", password: "parola12345" });
    await page.getByTestId("reg-submit").click();
    await expect(page.getByTestId("user-menu")).toBeVisible();
    await expect(page.getByTestId("user-menu")).toContainText("Test");

    await page.getByTestId("user-menu").click();
    await page.getByTestId("menu-logout").click();
    await expect(page.getByTestId("nav-login")).toBeVisible();

    await login(page, "test-buyer@e2e.test", "parola12345");
  });

  test("email duplicat e respins cu mesaj clar", async ({ page }) => {
    await page.goto("/ro/register");
    await fillRegisterForm(page, { firstName: "Duplicat", lastName: "Test", email: "buyer1@nbp.test", password: "parola12345" });
    await page.getByTestId("reg-submit").click();
    await expect(page.getByTestId("reg-error")).toContainText("Există deja un cont");
  });

  test("parola gresita e respinsa", async ({ page }) => {
    await page.goto("/ro/login");
    await page.getByTestId("login-email").fill("buyer1@nbp.test");
    await page.getByTestId("login-password").fill("gresita123");
    await page.getByTestId("login-submit").click();
    await expect(page.getByTestId("login-error")).toContainText("E-mail sau parolă greșite");
  });

  test("cerere de cont vanzator -> statut in asteptare", async ({ page }) => {
    await page.goto("/ro/register");
    await fillRegisterForm(page, { firstName: "Viitor", lastName: "Vânzător", email: "wannabe-seller@e2e.test", password: "parola12345" });
    await page.getByTestId("reg-submit").click();
    await expect(page.getByTestId("user-menu")).toBeVisible();

    await page.goto("/ro/account");
    await page.getByTestId("sr-company").fill("Crescătoria E2E");
    await page.getByTestId("sr-iban").fill("RO99TEST1234567890123456");
    await page.getByTestId("sr-submit").click();
    await expect(page.getByTestId("seller-pending")).toBeVisible();
  });

  test("paginile de cont cer autentificare", async ({ page }) => {
    await page.goto("/ro/account");
    await expect(page).toHaveURL(/\/ro\/login/);
  });

  test("adminul nelogat nu poate accesa panoul", async ({ page }) => {
    await page.goto("/ro/admin");
    await expect(page).toHaveURL(/\/ro$/);
  });

  /**
   * Daniel, pe serverul viu: „îmi zice de câmpuri roșii și nu roșește niciun
   * câmp”. Parola era scrisă în câmp, dar pusă fără ca React să afle (așa
   * completează gestionarele de parole), deci formularul o credea goală.
   */
  test("parola pusă de gestionarul de parole e luată în seamă", async ({ page }) => {
    test.setTimeout(120_000);
    const id = Date.now();
    await page.goto("/ro/register");
    await fillRegisterForm(page, {
      firstName: "Gestionar",
      lastName: "Parole",
      email: `gestionar-${id}@e2e.test`,
      password: "nuconteaza",
    });

    // scriem parola direct în câmp, fără evenimentele pe care le ascultă React
    await page.evaluate(() => {
      const camp = document.querySelector('[data-testid="reg-password"]') as HTMLInputElement;
      const setter = Object.getOwnPropertyDescriptor(HTMLInputElement.prototype, "value")!.set!;
      setter.call(camp, "parolaDinSeif1");
    });

    await page.getByTestId("reg-submit").click();
    await expect(page.getByTestId("user-menu").or(page.getByTestId("notif-bell")).first()).toBeVisible({
      timeout: 20_000,
    });
  });

  test("parola prea scurtă înroșește chiar câmpul de parolă", async ({ page }) => {
    test.setTimeout(120_000);
    const id = Date.now();
    await page.goto("/ro/register");
    await fillRegisterForm(page, {
      firstName: "Scurtă",
      lastName: "Parolă",
      email: `scurta-${id}@e2e.test`,
      password: "scurta",
    });
    await page.getByTestId("reg-submit").click();
    await expect(page.getByTestId("reg-password-error")).toBeVisible();
  });
});
