import { test, expect } from "@playwright/test";
import { login } from "./helpers";

/**
 * Ajutorul site-ului și „Propune un articol".
 *
 * Daniel: „Helpul site-ului, el există?" — nu exista; și: articolele le scria
 * doar adminul, deși povestea o are crescătorul. Aici se verifică amândouă,
 * până la capăt: crescătorul trimite, adminul publică, articolul apare.
 */

const uid = () => `${Date.now()}${Math.floor(Math.random() * 1000)}`;

test.describe("Ajutor", () => {
  test("pagina arată întrebările grupate și unde se cere ajutor de la om", async ({ page }) => {
    await page.goto("/ro/help");
    await expect(page.getByRole("heading", { name: "Ajutor" })).toBeVisible();

    // întrebările de pornire vin din baza de date, pe grupe
    const grupe = page.getByTestId("help-group");
    expect(await grupe.count()).toBeGreaterThan(1);

    // răspunsul e ascuns până la clic, dar există în pagină (Ctrl+F îl găsește)
    const prima = page.getByTestId("help-item").first();
    await expect(prima).toBeVisible();
    await prima.getByRole("group").or(prima.locator("summary")).first().click();
    await expect(prima.locator("p")).toBeVisible();

    await expect(page.getByTestId("help-contact-link")).toBeVisible();
  });

  test("se ajunge la Ajutor din subsol, în orice limbă", async ({ page }) => {
    await page.goto("/en");
    const link = page.locator('footer a[href="/en/help"]');
    await expect(link).toHaveText("Help");
    await link.click();
    await page.waitForURL(/\/en\/help$/);
    await expect(page.getByRole("heading", { name: "Help" })).toBeVisible();
  });

  test("adminul scrie o întrebare nouă și ea apare pe site", async ({ page }) => {
    test.setTimeout(120_000);
    const id = uid().slice(-5);
    const intrebare = `Se poate plăti în rate ${id}?`;

    await login(page, "admin@nbp.test", "admin1234");
    await page.goto("/ro/admin/faq?new=1");
    await page.getByLabel("Grupa").selectOption("PAYMENT");
    await page.getByLabel("Întrebarea (RO)").fill(intrebare);
    await page.getByLabel("Întrebarea (EN)").fill(`Can I pay in instalments ${id}?`);
    await page.getByLabel("Răspunsul (RO)").fill("Nu, plata se face o singură dată, prin transfer sau cash.");
    await page.getByLabel("Răspunsul (EN)").fill("No, payment is made in one go, by transfer or in cash.");
    await page.getByRole("button", { name: /Salvează/i }).click();
    await expect(page.getByTestId("faq-row").filter({ hasText: intrebare })).toBeVisible();

    await page.goto("/ro/help");
    await expect(page.getByTestId("help-item").filter({ hasText: intrebare })).toBeVisible();

    // curățenie: baza de test e comună
    await page.goto("/ro/admin/faq");
    await page.getByTestId("faq-row").filter({ hasText: intrebare }).click();
    page.once("dialog", (d) => d.accept());
    await page.getByRole("button", { name: /Șterge/i }).click();
    await expect(page.getByTestId("faq-row").filter({ hasText: intrebare })).toHaveCount(0);
  });
});

test.describe("Propune un articol", () => {
  test("cumpărătorul nu poate trimite, crescătorul da — iar adminul publică", async ({
    page,
    browser,
  }) => {
    test.setTimeout(180_000);
    const id = uid().slice(-5);
    const titlu = `Povestea porumbeilor mei ${id}`;

    // cumpărătorul vede explicația, nu formularul
    await login(page, "buyer1@nbp.test", "buyer1234");
    await page.goto("/ro/articles/propose");
    await expect(page.getByTestId("propose-not-allowed")).toBeVisible();
    await expect(page.locator('[data-testid="propose-form"]')).toHaveCount(0);
    const refuzat = await page.request.post("/api/articles/propose", {
      data: { title: titlu, body: "x".repeat(200) },
    });
    expect(refuzat.status()).toBe(403);

    // crescătorul aprobat scrie și trimite
    const ctx = await browser.newContext({ locale: "ro-RO" });
    const crescator = await ctx.newPage();
    await login(crescator, "seller@nbp.test", "seller1234");
    await crescator.goto("/ro/articles/propose");
    await crescator.getByTestId("propose-title").fill(titlu);
    await crescator
      .getByTestId("propose-body")
      .fill(
        "Anul acesta am pregătit porumbeii altfel: antrenamente mai scurte, dar mai dese, și " +
          "mai multă atenție la apă. Rezultatul s-a văzut la zborurile lungi, unde au venit " +
          "odihniți. Scriu asta ca să folosească și altora care încep acum."
      );
    await crescator.getByTestId("propose-submit").click();
    await expect(crescator.getByTestId("propose-success")).toBeVisible();

    // nu apare pe site până nu o citește cineva
    await crescator.goto("/ro/articles");
    await expect(crescator.getByText(titlu)).toHaveCount(0);

    // adminul o vede la propuneri și o publică
    await page.goto("/ro");
    await login(page, "admin@nbp.test", "admin1234");
    await page.goto("/ro/admin/articles");
    const rand = page.getByTestId("admin-proposal-row").filter({ hasText: titlu });
    await expect(rand).toBeVisible();
    await rand.getByTestId("proposal-publish").click();
    await expect(page.getByTestId("admin-proposal-row").filter({ hasText: titlu })).toHaveCount(0);

    // acum se vede public, iar autorul o are în lista lui ca publicată
    await crescator.goto("/ro/articles");
    await expect(crescator.getByText(titlu).first()).toBeVisible();
    await crescator.goto("/ro/articles/propose");
    await expect(crescator.getByTestId("propose-mine")).toContainText("publicat");

    await ctx.close();
  });
});
