import { test, expect } from "@playwright/test";
import { login, runOnTestDb } from "./helpers";

test.describe("Panoul de administrare", () => {
  test("panoul arata ce e de facut si cifrele platformei", async ({ page }) => {
    await login(page, "admin@nbp.test", "admin1234");
    await page.goto("/ro/admin");

    // in datele demo exista un vanzator si un lot in asteptare
    await expect(page.getByTestId("stat-sellers")).toBeVisible();
    await expect(page.getByTestId("stat-lots")).toBeVisible();

    // cifrele platformei sunt mereu acolo
    await expect(page.getByTestId("stat-live")).toBeVisible();
    await expect(page.getByTestId("stat-orders")).toBeVisible();
    await expect(page.getByTestId("stat-members")).toBeVisible();
  });

  test("aprobare vanzator in asteptare", async ({ page }) => {
    await login(page, "admin@nbp.test", "admin1234");
    await page.goto("/ro/admin/sellers");
    const row = page.getByTestId("pending-seller-row").filter({ hasText: "Vasile Porumbaru" });
    await expect(row).toBeVisible();
    await row.getByTestId("mod-approve").click();
    await expect(
      page.getByTestId("pending-seller-row").filter({ hasText: "Vasile Porumbaru" })
    ).toHaveCount(0);

    // Vanzatorul aprobat poate accesa formularul de listare
    const res = await page.request.post("/api/auth/login", {
      data: { email: "pending-seller@nbp.test", password: "seller1234" },
    });
    expect((await res.json()).ok).toBe(true);
  });

  test("setarile se salveaza, au audit trail si se reflecta in UI", async ({ page }) => {
    await login(page, "admin@nbp.test", "admin1234");
    await page.goto("/ro/admin/settings");

    // Comisionul 12 -> 15
    await page.getByTestId("setting-commissionPercent").fill("15");
    await page.getByTestId("settings-save").click();
    await expect(page.getByTestId("settings-saved")).toBeVisible();

    // Se reflecta in formularul de listare al vanzatorului (context separat,
    // ca sa nu suprascriem sesiunea de admin din contextul curent)
    const sellerCtx = await page.context().browser()!.newContext({ locale: "ro-RO" });
    const sellerPage = await sellerCtx.newPage();
    await sellerPage.goto("/ro");
    await sellerPage.request.post("/api/auth/login", {
      data: { email: "seller@nbp.test", password: "seller1234" },
    });
    await sellerPage.goto("/ro/sell");
    // tipul de listare (cu procentul de comision) sta sub „Alte detalii"
    await sellerPage.locator('[data-testid="sf-more"] > summary').click();
    await expect(sellerPage.locator("text=comision 15%")).toBeVisible();
    await sellerCtx.close();

    // Audit trail
    await page.goto("/ro/admin/audit");
    await expect(page.getByTestId("audit-table")).toContainText("SETTING_CHANGED");

    // Revert la 12
    await page.goto("/ro/admin/settings");
    await page.getByTestId("setting-commissionPercent").fill("12");
    await page.getByTestId("settings-save").click();
    await expect(page.getByTestId("settings-saved")).toBeVisible();
  });

  test("moderare recenzie raportata: adminul o pastreaza", async ({ page }) => {
    // recenzia din seed e marcata ca raportata (echivalentul butonului "Raportează")
    runOnTestDb("scripts/report-seed-review.ts");

    await login(page, "admin@nbp.test", "admin1234");
    await page.goto("/ro/admin/reviews");
    const row = page.getByTestId("reported-review-row").filter({ hasText: "Porumbel superb" });
    await expect(row).toBeVisible();
    await expect(row).toContainText("Test de moderare e2e");

    // adminul decide ca recenzia e legitima -> "Păstrează"
    await row.getByTestId("mod-approve").click();
    await expect(
      page.getByTestId("reported-review-row").filter({ hasText: "Porumbel superb" })
    ).toHaveCount(0);
  });
});
