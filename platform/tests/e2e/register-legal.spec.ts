import { test, expect, type APIRequestContext } from "@playwright/test";
import { fillRegisterForm, login, registrationData } from "./helpers";

/**
 * Contul nou după exemplele clientului (voiajor.net, columbofil.net): persoană
 * fizică / juridică, obligatoriu doar ce e obligatoriu, acordul pentru termeni,
 * bifa „Nu sunt robot", autentificarea cu numele de utilizator și textele legale
 * cu datele firmei din Setări.
 */

const uid = () => `${Date.now()}${Math.floor(Math.random() * 1000)}`;

async function setSettings(req: APIRequestContext, updates: Record<string, unknown>) {
  const res = await req.post("/api/admin/settings", { data: { updates } });
  const body = await res.json();
  expect(body.ok, JSON.stringify(body)).toBe(true);
}

test.describe("Contul nou", () => {
  test("persoana juridică: steluța doar pe ce e obligatoriu, CUI verificat, datele firmei la aprobare", async ({
    page,
    browser,
  }) => {
    test.setTimeout(90_000);
    const id = uid();
    await page.goto("/ro/register");
    await fillRegisterForm(page, {
      firstName: "Ionuț",
      lastName: `Firmă ${id.slice(-5)}`,
      email: `firma-${id}@e2e.test`,
      password: "parola12345",
      nickname: `Firma ${id.slice(-6)}`,
    });
    await expect(page.getByTestId("reg-captcha")).toBeVisible();

    await page.getByTestId("reg-type-company").click();
    const firma = page.getByTestId("reg-company");
    await expect(firma).toBeVisible();
    // obligatoriu: denumire, CUI, Reg. Com., sediu — cu steluță; banca și IBAN-ul fără
    for (const tid of ["reg-company-name", "reg-company-cui", "reg-company-regcom", "reg-company-address"]) {
      await expect(page.locator(`label:has([data-testid="${tid}"])`)).toContainText("*");
    }
    for (const tid of ["reg-company-bank", "reg-company-iban", "reg-postal"]) {
      await expect(page.locator(`label:has([data-testid="${tid}"])`)).not.toContainText("*");
    }

    await page.getByTestId("reg-company-name").fill(`Crescătoria Test ${id.slice(-5)} SRL`);
    await page.getByTestId("reg-company-cui").fill("44997979");
    await page.getByTestId("reg-company-regcom").fill("J02/1756/2021");
    await page.getByTestId("reg-company-address").fill("Arad, Str. Sediului 3");
    await page.getByTestId("reg-submit").click();
    await expect(page.getByTestId("reg-company-cui-error")).toContainText("nu este valid");

    // cu aprobarea pornită, contul intră la „De aprobat", unde adminul vede datele firmei
    const ctx = await browser.newContext({ locale: "ro-RO" });
    const admin = await ctx.newPage();
    await login(admin, "admin@nbp.test", "admin1234");
    await setSettings(admin.request, { accountApprovalRequired: true });
    try {
      await page.getByTestId("reg-company-cui").fill("RO44997978");
      await page.getByTestId("reg-submit").click();
      await expect(page.getByTestId("reg-pending")).toBeVisible();

      await admin.goto("/ro/admin/accounts");
      const row = admin.getByTestId("account-row").filter({ hasText: `firma-${id}@e2e.test` });
      await expect(row.getByTestId("account-company")).toContainText("RO44997978");
      await expect(row.getByTestId("account-company")).toContainText("J02/1756/2021");
    } finally {
      await setSettings(admin.request, { accountApprovalRequired: false });
      await ctx.close();
    }
  });

  test("fără acordul pentru termeni nu se face contul", async ({ page }) => {
    const id = uid();
    await page.goto("/ro/register");
    await fillRegisterForm(page, {
      firstName: "Fără",
      lastName: "Acord",
      email: `fara-acord-${id}@e2e.test`,
      password: "parola12345",
    });
    await page.getByTestId("reg-terms").uncheck();
    await page.getByTestId("reg-submit").click();
    await expect(page.getByTestId("reg-terms-error")).toContainText("Termenii și condițiile");
  });

  test("autentificarea merge și cu numele de utilizator", async ({ page }) => {
    const id = uid();
    const nickname = `Utilizator ${id.slice(-6)}`;
    await page.goto("/ro");
    const r = await page.request.post("/api/auth/register", {
      data: registrationData({ email: `user-${id}@e2e.test`, nickname, firstName: "Mihai" }),
    });
    expect((await r.json()).ok).toBe(true);
    await page.request.post("/api/auth/logout");

    await page.goto("/ro/login");
    await page.getByTestId("login-email").fill(nickname.toUpperCase());
    await page.getByTestId("login-password").fill("parola12345");
    await page.getByTestId("login-submit").click();
    await expect(page.getByTestId("user-menu")).toContainText("Mihai");
  });

  test("provocarea „Nu sunt robot” vine de pe serverul nostru", async ({ page }) => {
    const res = await page.request.get("/api/captcha");
    expect(res.status()).toBe(200);
    const body = await res.json();
    expect(body.parameters.algorithm).toBe("PBKDF2/SHA-256");
    expect(body.signature).toBeTruthy();
  });
});

test.describe("Termeni și confidențialitate", () => {
  test("paginile legale au datele firmei din Setări și legături în subsol", async ({ page }) => {
    await login(page, "admin@nbp.test", "admin1234");
    await setSettings(page.request, {
      companyName: "Demeco Test SRL",
      companyCui: "RO44997978",
      companyRegCom: "J02/1756/2021",
      companyAddress: "Arad, Str. Sediului 3",
      contactEmail: "contact@e2e.test",
    });

    await page.goto("/ro/info/termeni-si-conditii");
    await expect(page.getByTestId("content-title")).toHaveText("Termeni și condiții");
    await expect(page.getByTestId("content-updated")).toContainText("Ultima actualizare");
    const body = page.getByTestId("content-body");
    await expect(body).toContainText("Demeco Test SRL");
    await expect(body).toContainText("RO44997978");
    await expect(body).toContainText("Ofertele sunt ferme");
    await expect(body).not.toContainText("{{");

    await page.goto("/ro/info/politica-de-confidentialitate");
    await expect(page.getByTestId("content-body")).toContainText("ANSPDCP");
    await expect(page.getByTestId("content-body")).toContainText("nbp_session");

    await page.goto("/ro");
    await page.locator('footer a[href="/ro/info/termeni-si-conditii"]').click();
    await expect(page).toHaveURL(/\/ro\/info\/termeni-si-conditii$/);
  });
});
