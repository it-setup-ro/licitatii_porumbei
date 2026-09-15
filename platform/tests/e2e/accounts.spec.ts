import { test, expect, type Page, type APIRequestContext } from "@playwright/test";
import { login, registrationData, fillRegisterForm } from "./helpers";

/**
 * Conturile — cerințele clientului: înregistrare cu nume, telefon, adresă,
 * e-mail și poreclă liberă; „logarea o aprobă administratorul"; doi
 * administratori cu aceleași drepturi.
 *
 * În baza de test aprobarea e oprită (vezi fixtures/pin-test-settings.ts), ca
 * testele vechi să-și poată face conturi și licita. Testele de aici o pornesc
 * și o sting la loc.
 */

const uid = () => `${Date.now()}${Math.floor(Math.random() * 1000)}`;

async function setApproval(req: APIRequestContext, on: boolean) {
  const res = await req.post("/api/admin/settings", {
    data: { updates: { accountApprovalRequired: on } },
  });
  expect((await res.json()).ok).toBe(true);
}

/** Id-ul lotului seed „Fulger Albastru", activ. */
async function liveAuctionId(page: Page) {
  await page.goto("/ro/auctions?q=445566");
  const href = await page.getByTestId("auction-card").first().getAttribute("href");
  return href!.split("/").pop()!;
}

async function registerStrict(page: Page, id: string) {
  await page.goto("/ro/register");
  await expect(page.getByTestId("reg-address")).toBeVisible();
  await fillRegisterForm(page, {
    firstName: "Ionuț",
    lastName: `Test ${id}`,
    nickname: `Burca Ionuț ${id.slice(-5)}`,
    email: `cont-${id}@e2e.test`,
    password: "parola12345",
  });
  await expect(page.getByTestId("reg-country")).toHaveValue("România");
  // avizele sunt alegerea omului: bifa pornește nebifată
  await expect(page.getByTestId("reg-notify-ending")).not.toBeChecked();
  await page.getByTestId("reg-notify-ending").check();
  await page.getByTestId("reg-submit").click();
  await expect(page.getByTestId("reg-pending")).toBeVisible();
}

test.describe("Conturi care așteaptă aprobarea", () => {
  test.describe.configure({ mode: "serial" });

  test("înregistrarea cere telefon și adresă; contul vede licitațiile, dar nu licitează", async ({
    page,
    browser,
  }) => {
    test.setTimeout(120_000);
    const adminCtx = await browser.newContext({ locale: "ro-RO" });
    const admin = await adminCtx.newPage();
    await login(admin, "admin@nbp.test", "admin1234");
    await setApproval(admin.request, true);

    try {
      const id = uid();
      await registerStrict(page, id);

      const auctionId = await liveAuctionId(page);
      await page.goto(`/ro/auctions/${auctionId}`);
      await expect(page.getByTestId("account-status-banner")).toContainText("așteaptă aprobarea");
      await expect(page.getByTestId("account-pending-notice")).toBeVisible();
      await expect(page.getByTestId("bid-submit")).toHaveCount(0);

      // și serverul refuză, nu doar pagina
      const r = await page.request.post(`/api/auctions/${auctionId}/bid`, { data: { maxCents: 50_000 } });
      expect((await r.json()).error).toBe("ACCOUNT_PENDING");

      // administratorul îl aprobă
      await admin.goto("/ro/admin/accounts");
      const rand = admin.getByTestId("account-row").filter({ hasText: `cont-${id}@e2e.test` });
      await expect(rand).toContainText("Str. Porumbeilor 7");
      await expect(rand).toContainText("0723 000 111");
      await rand.getByTestId("account-approve").click();
      await expect(admin.getByTestId("account-row").filter({ hasText: `cont-${id}@e2e.test` })).toHaveCount(0);

      await page.goto(`/ro/auctions/${auctionId}`);
      await expect(page.getByTestId("account-status-banner")).toHaveCount(0);
      await expect(page.getByTestId("bid-submit")).toBeVisible();

      // și a primit notificarea
      await page.goto("/ro/account/notifications");
      await expect(page.getByTestId("notif-account_approved")).toBeVisible();
    } finally {
      await setApproval(admin.request, false);
      await adminCtx.close();
    }
  });

  test("un cont respins vede de ce nu poate licita", async ({ page, browser }) => {
    test.setTimeout(120_000);
    const adminCtx = await browser.newContext({ locale: "ro-RO" });
    const admin = await adminCtx.newPage();
    await login(admin, "admin@nbp.test", "admin1234");
    await setApproval(admin.request, true);

    try {
      const id = uid();
      await registerStrict(page, id);

      await admin.goto("/ro/admin/accounts");
      admin.once("dialog", (d) => d.accept("Date incomplete"));
      // respingerea trebuie să ajungă în bază înainte de a deschide fila „Respinse"
      const salvat = admin.waitForResponse((r) => r.url().includes("/api/admin/accounts/") && r.request().method() === "POST");
      await admin
        .getByTestId("account-row")
        .filter({ hasText: `cont-${id}@e2e.test` })
        .getByTestId("account-reject")
        .click();
      expect((await salvat).ok()).toBe(true);
      await admin.goto("/ro/admin/accounts?tab=REJECTED");
      await expect(admin.getByTestId("account-row").filter({ hasText: `cont-${id}@e2e.test` })).toContainText(
        "Date incomplete"
      );

      const auctionId = await liveAuctionId(page);
      await page.goto(`/ro/auctions/${auctionId}`);
      await expect(page.getByTestId("account-pending-notice")).toContainText("nu a fost aprobat");
    } finally {
      await setApproval(admin.request, false);
      await adminCtx.close();
    }
  });

  test("conturile existente rămân aprobate și licitează ca înainte", async ({ page, browser }) => {
    const adminCtx = await browser.newContext({ locale: "ro-RO" });
    const admin = await adminCtx.newPage();
    await login(admin, "admin@nbp.test", "admin1234");
    await setApproval(admin.request, true);

    try {
      await login(page, "buyer1@nbp.test", "buyer1234");
      await page.goto(`/ro/auctions/${await liveAuctionId(page)}`);
      await expect(page.getByTestId("account-status-banner")).toHaveCount(0);
      await expect(page.getByTestId("bid-submit")).toBeVisible();
    } finally {
      await setApproval(admin.request, false);
      await adminCtx.close();
    }
  });

  test("fără adresă, serverul spune ce lipsește", async ({ page, browser }) => {
    const adminCtx = await browser.newContext({ locale: "ro-RO" });
    const admin = await adminCtx.newPage();
    await login(admin, "admin@nbp.test", "admin1234");
    await setApproval(admin.request, true);

    try {
      await page.goto("/ro");
      const r = await page.request.post("/api/auth/register", {
        data: { email: `fara-adresa-${uid()}@e2e.test`, password: "parola12345", name: "Fără Adresă", nickname: `FA ${uid().slice(-5)}` },
      });
      expect(r.status()).toBe(422);
      const { fields } = await r.json();
      expect(fields.phone).toBeTruthy();
      expect(fields.addressStreet).toBeTruthy();
      expect(fields.addressCity).toBeTruthy();
    } finally {
      await setApproval(admin.request, false);
      await adminCtx.close();
    }
  });
});

test.describe("Porecla liberă", () => {
  test("merge cu spații și diacritice, și rămâne unică", async ({ page }) => {
    await page.goto("/ro");
    const nick = `Crescătoria Mureș ${uid().slice(-4)}`;
    const first = await page.request.post("/api/auth/register", {
      data: registrationData({ email: `nick-${uid()}@e2e.test`, password: "parola12345", name: "Nume Unu", nickname: nick }),
    });
    expect((await first.json()).ok).toBe(true);

    const second = await page.request.post("/api/auth/register", {
      data: registrationData({ email: `nick-${uid()}@e2e.test`, password: "parola12345", name: "Nume Doi", nickname: nick.toUpperCase() }),
    });
    expect(second.status()).toBe(409);
    expect((await second.json()).fields.nickname).toContain("deja folosit");
  });
});

test.describe("Administratori", () => {
  test("un administrator dă și retrage drepturile altui cont", async ({ page, browser }) => {
    test.setTimeout(120_000);
    await login(page, "admin@nbp.test", "admin1234");

    await page.goto("/ro/admin/admins");
    await page.getByTestId("admin-grant-email").fill("buyer2@nbp.test");
    await page.getByTestId("admin-grant-submit").click();
    await expect(page.getByTestId("admin-grant-done")).toBeVisible();

    const ctx = await browser.newContext({ locale: "ro-RO" });
    const doi = await ctx.newPage();
    try {
      await login(doi, "buyer2@nbp.test", "buyer1234");
      await doi.goto("/ro/admin/sales");
      await expect(doi.getByRole("heading", { name: "Licitații pe loturi" })).toBeVisible();
    } finally {
      await page.goto("/ro/admin/admins");
      page.once("dialog", (d) => d.accept());
      await page.getByTestId("admin-row").filter({ hasText: "buyer2@nbp.test" }).getByTestId("admin-revoke").click();
      await expect(page.getByTestId("admin-row").filter({ hasText: "buyer2@nbp.test" })).toHaveCount(0);
    }

    await doi.goto("/ro/admin/sales");
    await expect(doi).not.toHaveURL(/\/admin/);
    await ctx.close();
  });

  test("nimeni nu își poate retrage singur drepturile", async ({ page }) => {
    await page.goto("/ro");
    const loginRes = await page.request.post("/api/auth/login", {
      data: { email: "admin@nbp.test", password: "admin1234" },
    });
    const { userId } = await loginRes.json();

    await page.goto("/ro/admin/admins");
    // butonul nu apare pe propriul rând…
    await expect(
      page.getByTestId("admin-row").filter({ hasText: "admin@nbp.test" }).getByTestId("admin-revoke")
    ).toHaveCount(0);
    // …și nici serverul nu acceptă cererea trimisă direct
    const r = await page.request.delete(`/api/admin/admins/${userId}`);
    expect(r.status()).toBe(400);
    expect((await r.json()).error).toBe("CANNOT_REVOKE_SELF");
  });

  test("o adresă fără cont primește explicație, nu eroare", async ({ page }) => {
    await login(page, "admin@nbp.test", "admin1234");
    await page.goto("/ro/admin/admins");
    await page.getByTestId("admin-grant-email").fill(`nimeni-${uid()}@e2e.test`);
    await page.getByTestId("admin-grant-submit").click();
    await expect(page.getByTestId("admin-grant-error")).toContainText("Nu există niciun cont");
  });
});
