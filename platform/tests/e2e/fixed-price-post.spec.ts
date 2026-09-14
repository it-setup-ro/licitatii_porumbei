import { test, expect, type APIRequestContext } from "@playwright/test";
import { login } from "./helpers";

/**
 * Clientul, „Punctul 9": se păstrează prețul fix. Adminul adaugă un porumbel
 * (poze, pedigree, descriere, oferit de / reprodus de, culoare), scrie prețul
 * într-o căsuță și apasă „Salvează și postează".
 */

const uid = () => `${Date.now()}${Math.floor(Math.random() * 1000)}`;

async function setSettings(req: APIRequestContext, updates: Record<string, unknown>) {
  const res = await req.post("/api/admin/settings", { data: { updates } });
  const body = await res.json();
  expect(body.ok, JSON.stringify(body)).toBe(true);
}

test.describe("Preț fix — postat de administrator", () => {
  test("adminul vede „+ Vinde” și când crescătorii nu pot lista", async ({ page }) => {
    await login(page, "admin@nbp.test", "admin1234");
    await setSettings(page.request, { breederSelfServiceEnabled: false });
    try {
      await page.goto("/ro");
      await expect(page.getByTestId("nav-sell")).toBeVisible();
      await page.getByTestId("nav-sell").click();
      await expect(page.getByTestId("sell-form")).toBeVisible();
    } finally {
      await setSettings(page.request, { breederSelfServiceEnabled: true });
    }
  });

  test("salvează și postează: apare imediat la Preț fix, nu la Licitații, și se poate cumpăra", async ({
    page,
    browser,
  }) => {
    test.setTimeout(120_000);
    await login(page, "admin@nbp.test", "admin1234");
    const id = uid();
    const ring = `RO 2025 ${id.slice(-6)}`;
    const name = `Prețul Fix ${id.slice(-5)}`;

    await page.goto("/ro/sell");
    // câmpurile sunt controlate de React: ce se scrie înainte de hidratare se pierde
    await expect(async () => {
      await page.getByTestId("sf-ring").fill(ring);
      await expect(page.getByTestId("sf-ring")).toHaveValue(ring, { timeout: 1_000 });
    }).toPass({ timeout: 15_000 });
    await page.getByTestId("sf-year").fill("2025");
    await page.getByTestId("sf-name").fill(name);
    await page.getByTestId("sf-bred-by").fill("Burca Ionuț");

    await page.getByTestId("sf-mode-fixed").click();
    await expect(page.getByTestId("sf-reserve-price")).toHaveCount(0);
    await expect(page.getByTestId("sf-duration")).toContainText("până se vinde");
    await page.getByTestId("sf-start-price").fill("320");
    await expect(page.getByTestId("sell-submit")).toHaveText("Salvează și postează");
    await page.getByTestId("sell-submit").click();

    await expect(page.getByTestId("sell-success")).toContainText("postat");
    const href = await page.getByTestId("sell-view-link").getAttribute("href");
    const auctionId = href!.split("/").pop()!;

    // la Preț fix, cu prețul scris
    await page.goto("/ro/fixed-price");
    const card = page.getByTestId("fixed-card").filter({ hasText: name });
    await expect(card).toBeVisible();
    await expect(card).toContainText("320");

    // nu e o licitație: nu apare în lista de licitații
    await page.goto(`/ro/auctions?q=${encodeURIComponent(ring)}`);
    await expect(page.getByTestId("auction-card")).toHaveCount(0);

    // primul cumpărător îl ia
    const ctx = await browser.newContext({ locale: "ro-RO" });
    const buyer = await ctx.newPage();
    await login(buyer, "buyer2@nbp.test", "buyer1234");
    const res = await buyer.request.post(`/api/auctions/${auctionId}/buy`);
    const body = await res.json();
    expect(body.ok, JSON.stringify(body)).toBe(true);
    await ctx.close();

    await page.goto("/ro/fixed-price");
    await expect(page.getByTestId("fixed-card").filter({ hasText: name })).toContainText("Vândut");
  });
});
