import { test, expect } from "@playwright/test";
import { login } from "./helpers";

/**
 * Cardurile cerute de client pe prima pagină: „Vreau să organizez o licitație"
 * (cererea ajunge în Administrare) și „Urmărește-ne". Plus datele din subsol:
 * adresa și programul, luate din Setări.
 */

test.describe("Vreau să organizez o licitație", () => {
  test("cererea se trimite de pe prima pagină și ajunge în Administrare", async ({ page }) => {
    const nume = `Crescător Test ${Date.now()}`;

    await page.goto("/ro");
    const card = page.getByTestId("organize-card");
    await expect(card).toBeVisible();
    await expect(card).toContainText("Vreau să organizez o licitație");

    // câmpurile controlate pot pierde textul înainte de hidratare
    await expect(async () => {
      await card.getByTestId("organize-name").fill(nume);
      await expect(card.getByTestId("organize-name")).toHaveValue(nume);
    }).toPass();
    await card.getByTestId("organize-phone").fill("0740 111 222");
    await card.getByTestId("organize-email").fill(`cerere${Date.now()}@nbp.test`);
    await card.getByTestId("organize-place").fill("România, Arad");
    await card.getByTestId("organize-submit").click();
    await expect(page.getByTestId("organize-done")).toBeVisible();

    // adminul o vede și o poate bifa
    await login(page, "admin@nbp.test", "admin1234");
    await page.goto("/ro/admin/auction-requests");
    const rand = page.getByTestId("auction-request-row").filter({ hasText: nume });
    await expect(rand).toBeVisible();
    await expect(rand).toContainText("0740 111 222");
    await expect(rand).toContainText("România, Arad");

    await rand.getByTestId("request-handle").click();
    await expect(rand.getByTestId("request-unhandle")).toBeVisible();
  });

  test("cererea cu date lipsă nu trece", async ({ page }) => {
    await page.goto("/ro");
    const card = page.getByTestId("organize-card");
    await card.getByTestId("organize-name").fill("X");
    await card.getByTestId("organize-phone").fill("1");
    await card.getByTestId("organize-email").fill("nu-e-email@test.ro");
    await card.getByTestId("organize-place").fill("A");
    await card.getByTestId("organize-submit").click();
    // rămâne pe formular, fără confirmare
    await expect(page.getByTestId("organize-done")).toHaveCount(0);
    await expect(card.getByTestId("organize-submit")).toBeVisible();
  });
});

test.describe("Urmărește-ne și datele din subsol", () => {
  test("rețelele și programul vin din Setări, nu din cod", async ({ page }) => {
    await login(page, "admin@nbp.test", "admin1234");
    const seteaza = (updates: Record<string, string>) =>
      page.request.post("/api/admin/settings", { data: { updates } });

    // fără nimic completat: cardul spune „în curând", subsolul nu inventează date
    expect(
      (await seteaza({ facebookUrl: "", contactAddress: "", contactSchedule: "" })).ok()
    ).toBe(true);
    await page.goto("/ro");
    await expect(page.getByTestId("follow-card")).toBeVisible();
    await expect(page.getByTestId("follow-soon")).toBeVisible();
    await expect(page.getByTestId("footer-schedule")).toHaveCount(0);

    try {
      expect(
        (
          await seteaza({
            facebookUrl: "https://facebook.com/nbptest",
            contactAddress: "Str. Porumbeilor nr. 10, Arad",
            contactSchedule: "Luni–Vineri 9:00–17:00",
          })
        ).ok()
      ).toBe(true);
      await page.goto("/ro");
      await expect(page.getByTestId("follow-link").first()).toHaveAttribute(
        "href",
        "https://facebook.com/nbptest"
      );
      await expect(page.getByTestId("footer-address")).toContainText("Str. Porumbeilor nr. 10");
      await expect(page.getByTestId("footer-schedule")).toContainText("9:00–17:00");
    } finally {
      expect(
        (await seteaza({ facebookUrl: "", contactAddress: "", contactSchedule: "" })).ok()
      ).toBe(true);
    }
  });
});
