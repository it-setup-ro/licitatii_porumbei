import { test, expect } from "@playwright/test";
import { login } from "./helpers";

/**
 * Navigația din administrare: coloană pe calculator, un singur rând plus
 * panoul „Secțiuni" pe telefon. Înainte erau douăsprezece pastile care se
 * rupeau pe cinci rânduri inegale.
 */

const SECTIUNI = [
  "admin-link-admin",
  "admin-link-sellers",
  "admin-link-lots",
  "admin-link-reviews",
  "admin-link-articles",
  "admin-link-products",
  "admin-link-contests",
  "admin-link-content",
  "admin-link-links",
  "admin-link-settings",
  "admin-link-messages",
  "admin-link-audit",
];

test.describe("Administrare — navigația pe calculator", () => {
  test("coloana are toate secțiunile, grupate", async ({ page }) => {
    await login(page, "admin@nbp.test", "admin1234");
    await page.goto("/ro/admin");

    const nav = page.getByTestId("admin-nav");
    await expect(nav).toBeVisible();
    for (const id of SECTIUNI) {
      await expect(nav.getByTestId(id), `lipsește ${id}`).toBeVisible();
    }
    await expect(nav).toContainText("Moderare");
    await expect(nav).toContainText("Conținut");
    await expect(nav).toContainText("Platformă");
  });

  test("secțiunea curentă e evidențiată și se schimbă la navigare", async ({ page }) => {
    await login(page, "admin@nbp.test", "admin1234");
    await page.goto("/ro/admin");
    await expect(page.getByTestId("admin-nav").getByTestId("admin-link-admin")).toHaveAttribute(
      "aria-current",
      "page"
    );

    await page.getByTestId("admin-nav").getByTestId("admin-link-lots").click();
    await expect(page).toHaveURL(/\/ro\/admin\/lots$/);
    await expect(page.getByTestId("admin-nav").getByTestId("admin-link-lots")).toHaveAttribute(
      "aria-current",
      "page"
    );
    await expect(page.getByTestId("admin-nav").getByTestId("admin-link-admin")).not.toHaveAttribute(
      "aria-current",
      "page"
    );
  });

  test("numărul de așteptări apare lângă secțiunea de moderat", async ({ page }) => {
    await login(page, "admin@nbp.test", "admin1234");
    await page.goto("/ro/admin");
    // in datele demo exista cel putin un vanzator in asteptare
    const badge = page
      .getByTestId("admin-nav")
      .getByTestId("admin-link-sellers")
      .getByTestId("admin-badge");
    await expect(badge).toBeVisible();
    await expect(badge).toHaveText(/^\d+$/);
  });
});

test.describe("Administrare — navigația pe telefon", () => {
  test.use({ viewport: { width: 375, height: 812 } });

  test("un singur rând, fără listă desfășurată și fără depășire laterală", async ({ page }) => {
    await login(page, "admin@nbp.test", "admin1234");
    await page.goto("/ro/admin/lots");

    // coloana de pe calculator e ascunsa
    await expect(page.getByTestId("admin-nav")).toBeHidden();

    // se vede doar bara cu sectiunea curenta
    await expect(page.getByTestId("admin-current")).toHaveText("Loturi");
    await expect(page.getByTestId("admin-sections")).toBeVisible();
    await expect(page.getByTestId("admin-sections-panel")).toHaveCount(0);

    const bara = (await page.getByTestId("admin-sections").boundingBox())!;
    expect(bara.height).toBeGreaterThanOrEqual(40); // se apasă comod

    const overflow = await page.evaluate(
      () => document.documentElement.scrollWidth - window.innerWidth
    );
    expect(overflow).toBeLessThanOrEqual(0);
  });

  test("panoul „Secțiuni” le arată pe toate, cu rânduri mari", async ({ page }) => {
    await login(page, "admin@nbp.test", "admin1234");
    await page.goto("/ro/admin/lots");
    await page.getByTestId("admin-sections").click();

    const panel = page.getByTestId("admin-sections-panel");
    await expect(panel).toBeVisible();
    for (const id of SECTIUNI) {
      await expect(panel.getByTestId(id), `lipsește ${id}`).toBeVisible();
    }

    // fiecare rând e cel puțin cât o țintă de atins confortabilă
    const inaltimi = await panel.locator("a").evaluateAll((els) =>
      els.map((e) => e.getBoundingClientRect().height)
    );
    expect(Math.min(...inaltimi)).toBeGreaterThanOrEqual(40);
  });

  test("alegerea unei secțiuni navighează și închide panoul", async ({ page }) => {
    await login(page, "admin@nbp.test", "admin1234");
    await page.goto("/ro/admin/lots");
    await page.getByTestId("admin-sections").click();
    await page.getByTestId("admin-sections-panel").getByTestId("admin-link-settings").click();

    await expect(page).toHaveURL(/\/ro\/admin\/settings$/);
    await expect(page.getByTestId("admin-sections-panel")).toHaveCount(0);
    await expect(page.getByTestId("admin-current")).toHaveText("Setări");
  });

  test("din orice secțiune se revine la panou cu o apăsare", async ({ page }) => {
    await login(page, "admin@nbp.test", "admin1234");
    await page.goto("/ro/admin/audit");
    await expect(page.getByTestId("admin-current")).toHaveText("Jurnal");
    await page.getByTestId("admin-back").click();
    await expect(page).toHaveURL(/\/ro\/admin$/);
    // pe panou nu mai are sens sageata de intoarcere
    await expect(page.getByTestId("admin-back")).toHaveCount(0);
  });
});
