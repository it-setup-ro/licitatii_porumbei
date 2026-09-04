import { test, expect, type Page } from "@playwright/test";
import { login } from "./helpers";

/**
 * Parola: arătat/ascuns la autentificare, resetare prin link și schimbare din
 * cont.
 *
 * Testele NU ating conturile demo — își fac de fiecare dată un cont propriu,
 * altfel schimbarea parolei ar strica autentificarea celorlalte teste.
 */

const PAROLA = "TestParola2026!";
const PAROLA_NOUA = "AltaParola2026#";

/** Cont proaspăt, cu adresă unică. Înregistrarea autentifică automat. */
async function contNou(page: Page) {
  const email = `pass-${Date.now()}-${Math.floor(Math.random() * 1e6)}@e2e.test`;
  const res = await page.request.post("/api/auth/register", {
    data: { email, password: PAROLA, name: "Test Parola" },
  });
  expect(res.status()).toBe(200);
  await page.request.post("/api/auth/logout");
  return email;
}

/** Citește ultimul link de resetare trimis către o adresă. */
async function linkDinEmail(page: Page, email: string) {
  const admin = await page.context().browser()!.newContext({ locale: "ro-RO" });
  const ap = await admin.newPage();
  await login(ap, "admin@nbp.test", "admin1234");
  await ap.goto("/ro/admin/emails");
  const row = ap.getByTestId("email-row").filter({ hasText: email }).first();
  await expect(row).toBeVisible();
  await row.locator("summary").click();
  const body = await row.getByTestId("email-body").innerText();
  await admin.close();
  const m = body.match(/https?:\/\/\S+\/reset-password\?token=[a-f0-9]+/);
  expect(m, "linkul de resetare lipsește din e-mail").not.toBeNull();
  return m![0];
}

/** Linkul e generat cu adresa serverului real; îl aducem pe cea de test. */
function local(link: string) {
  return link.replace(/^https?:\/\/[^/]+/, "");
}

test.describe("Parola se poate vedea la autentificare", () => {
  test("butonul comută între ascuns și vizibil", async ({ page }) => {
    await page.goto("/ro/login");
    const camp = page.getByTestId("login-password");
    const buton = page.getByTestId("login-password-toggle");

    await camp.fill("secretul-meu");
    await expect(camp).toHaveAttribute("type", "password");

    await buton.click();
    await expect(camp).toHaveAttribute("type", "text");
    await expect(camp).toHaveValue("secretul-meu"); // textul nu se pierde

    await buton.click();
    await expect(camp).toHaveAttribute("type", "password");
  });

  test("parola se reascunde când pleci din câmp", async ({ page }) => {
    await page.goto("/ro/login");
    await page.getByTestId("login-password").fill("secretul-meu");
    await page.getByTestId("login-password-toggle").click();
    await expect(page.getByTestId("login-password")).toHaveAttribute("type", "text");

    await page.getByTestId("login-email").click();
    await expect(page.getByTestId("login-password")).toHaveAttribute("type", "password");
  });

  test("există și la înregistrare și la resetare", async ({ page }) => {
    await page.goto("/ro/register");
    await expect(page.getByTestId("reg-password-toggle")).toBeVisible();

    await page.goto("/ro/reset-password?token=" + "a".repeat(64));
    await expect(page.getByTestId("reset-password-toggle")).toBeVisible();
    await expect(page.getByTestId("reset-confirm-toggle")).toBeVisible();
  });
});

test.describe("Resetarea parolei prin e-mail", () => {
  test("flux complet: cerere → link → parolă nouă → autentificare", async ({ page }) => {
    test.setTimeout(120_000);
    const email = await contNou(page);

    // 1) cererea de la login
    await page.goto("/ro/login");
    await page.getByTestId("forgot-link").click();
    await expect(page).toHaveURL(/\/ro\/forgot-password$/);
    await page.getByTestId("forgot-email").fill(email);
    await page.getByTestId("forgot-submit").click();
    await expect(page.getByTestId("forgot-sent")).toBeVisible();

    // 2) linkul din e-mail
    const link = await linkDinEmail(page, email);
    await page.goto(local(link));

    // 3) parola nouă
    await page.getByTestId("reset-password").fill(PAROLA_NOUA);
    await page.getByTestId("reset-confirm").fill(PAROLA_NOUA);
    await page.getByTestId("reset-submit").click();
    await expect(page.getByTestId("reset-done")).toBeVisible();

    // 4) parola veche nu mai merge, cea nouă da
    const vechi = await page.request.post("/api/auth/login", {
      data: { email, password: PAROLA },
    });
    expect((await vechi.json()).ok).toBe(false);

    const nou = await page.request.post("/api/auth/login", {
      data: { email, password: PAROLA_NOUA },
    });
    expect((await nou.json()).ok).toBe(true);

    // 5) acelasi link nu mai poate fi folosit a doua oara
    const token = link.split("token=")[1];
    const dinNou = await page.request.post("/api/auth/reset", {
      data: { token, password: "IncaOParola2026$" },
    });
    expect(dinNou.status()).toBe(400);
    expect((await dinNou.json()).error).toBe("INVALID_TOKEN");
  });

  test("formularul nu spune dacă adresa există sau nu", async ({ page }) => {
    await page.goto("/ro/forgot-password");
    await page.getByTestId("forgot-email").fill(`nimeni-${Date.now()}@e2e.test`);
    await page.getByTestId("forgot-submit").click();
    // acelasi mesaj ca pentru o adresa reala
    await expect(page.getByTestId("forgot-sent")).toBeVisible();
  });

  test("un token inventat e respins", async ({ page }) => {
    const res = await page.request.post("/api/auth/reset", {
      data: { token: "b".repeat(64), password: "OriceParola2026!" },
    });
    expect(res.status()).toBe(400);
    expect((await res.json()).error).toBe("INVALID_TOKEN");
  });

  test("o parolă slabă nu trece nici prin resetare", async ({ page }) => {
    const email = await contNou(page);
    await page.request.post("/api/auth/forgot", { data: { email } });
    const token = (await linkDinEmail(page, email)).split("token=")[1];

    const res = await page.request.post("/api/auth/reset", {
      data: { token, password: "12345678" },
    });
    expect(res.status()).toBe(422);
    expect((await res.json()).error).toBe("WEAK_PASSWORD");

    // tokenul e inca valid — nu l-am consumat pe o incercare esuata
    const bun = await page.request.post("/api/auth/reset", {
      data: { token, password: PAROLA_NOUA },
    });
    expect((await bun.json()).ok).toBe(true);
  });
});

test.describe("Linkul de resetare generat din admin", () => {
  test("adminul generează un link care chiar funcționează", async ({ page }) => {
    test.setTimeout(120_000);
    const email = await contNou(page);

    await login(page, "admin@nbp.test", "admin1234");
    await page.goto(`/ro/admin/users?q=${encodeURIComponent(email)}`);
    const row = page.getByTestId("user-row").filter({ hasText: email });
    await expect(row).toBeVisible();
    await row.getByTestId("reset-link-generate").click();

    const link = await row.getByTestId("reset-link-value").inputValue();
    expect(link).toMatch(/\/reset-password\?token=[a-f0-9]{64}$/);

    // generarea ramane in jurnalul de audit
    await page.goto("/ro/admin/audit");
    await expect(page.getByTestId("audit-table")).toContainText("PASSWORD_RESET_LINK_ISSUED");

    // linkul functioneaza
    await page.request.post("/api/auth/logout");
    await page.goto(local(link));
    await page.getByTestId("reset-password").fill(PAROLA_NOUA);
    await page.getByTestId("reset-confirm").fill(PAROLA_NOUA);
    await page.getByTestId("reset-submit").click();
    await expect(page.getByTestId("reset-done")).toBeVisible();

    const nou = await page.request.post("/api/auth/login", {
      data: { email, password: PAROLA_NOUA },
    });
    expect((await nou.json()).ok).toBe(true);
  });

  test("un cumpărător nu poate genera linkuri pentru alții", async ({ page }) => {
    await login(page, "buyer1@nbp.test", "buyer1234");
    const res = await page.request.post("/api/admin/users/oricare/reset-link", { data: {} });
    expect(res.status()).toBe(403);
  });
});

test.describe("Schimbarea parolei din cont", () => {
  test("cere parola veche și o schimbă pe cea nouă", async ({ page }) => {
    test.setTimeout(120_000);
    const email = await contNou(page);
    await page.goto("/ro/login");
    await page.getByTestId("login-email").fill(email);
    await page.getByTestId("login-password").fill(PAROLA);
    await page.getByTestId("login-submit").click();
    await expect(page.getByTestId("user-menu").or(page.getByTestId("notif-bell")).first()).toBeVisible();

    await page.goto("/ro/account");
    await page.getByTestId("change-password-open").click();

    // parola veche gresita
    await page.getByTestId("cp-current").fill("gresita-de-tot");
    await page.getByTestId("cp-new").fill(PAROLA_NOUA);
    await page.getByTestId("cp-confirm").fill(PAROLA_NOUA);
    await page.getByTestId("cp-submit").click();
    await expect(page.getByTestId("cp-error")).toBeVisible();

    // cele doua campuri nu se potrivesc
    await page.getByTestId("cp-current").fill(PAROLA);
    await page.getByTestId("cp-confirm").fill("altceva-total");
    await page.getByTestId("cp-submit").click();
    await expect(page.getByTestId("cp-error")).toContainText("nu sunt la fel");

    // corect
    await page.getByTestId("cp-confirm").fill(PAROLA_NOUA);
    await page.getByTestId("cp-submit").click();
    await expect(page.getByTestId("change-password-done")).toBeVisible();

    const nou = await page.request.post("/api/auth/login", {
      data: { email, password: PAROLA_NOUA },
    });
    expect((await nou.json()).ok).toBe(true);
  });

  test("cine nu e autentificat nu poate schimba parola nimănui", async ({ page }) => {
    await page.goto("/ro");
    await page.request.post("/api/auth/logout");
    const res = await page.request.post("/api/account/password", {
      data: { currentPassword: "orice", newPassword: "AltaParola2026#" },
    });
    expect(res.status()).toBe(401);
  });
});
