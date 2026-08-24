import { test, expect } from "@playwright/test";
import { login } from "./helpers";

/**
 * Fisa detaliata a porumbelului (ca pe pipa) si unealta de test din admin
 * care inchide o licitatie peste un minut.
 */

test.describe("Fisa detaliata a porumbelului", () => {
  test("se completeaza la listare si apare sub „Toate detaliile”", async ({ page }) => {
    test.setTimeout(120_000);
    await login(page, "seller@nbp.test", "seller1234");
    await page.goto("/ro/sell");

    await page.getByTestId("sf-ring").fill("RO 2025 707070");
    await page.getByTestId("sf-year").fill("2025");
    await page.getByTestId("sf-name").fill("Fisa Completa");
    await page.getByTestId("sf-start-price").fill("140");

    // fisa sta pliata de doua ori: „Alte detalii" -> „Fisa detaliata"
    await page.locator('[data-testid="sf-more"] > summary').click();
    await expect(page.getByTestId("traits-editor")).toBeHidden();
    await page.locator('[data-testid="sf-traits"] > summary').click();
    await expect(page.getByTestId("traits-editor")).toBeVisible();

    await page.getByTestId("trait-eyeColor").selectOption("orange");
    await page.getByTestId("trait-muscles").selectOption("supple");
    await page.getByTestId("trait-plumage").selectOption("thick");
    // specializarea are bife: un porumbel poate fi si de demifond, si de fond
    await page.getByTestId("trait-disciplines-middle").check();
    await page.getByTestId("trait-disciplines-long").check();

    await page.getByTestId("sell-submit").click();
    await expect(page.getByTestId("sell-success")).toBeVisible();

    const adminCtx = await page.context().browser()!.newContext({ locale: "ro-RO" });
    const admin = await adminCtx.newPage();
    await login(admin, "admin@nbp.test", "admin1234");
    await admin.goto("/ro/admin/lots");
    await admin
      .getByTestId("pending-lot-row")
      .filter({ hasText: "Fisa Completa" })
      .getByTestId("mod-approve")
      .click();
    await expect(
      admin.getByTestId("pending-lot-row").filter({ hasText: "Fisa Completa" })
    ).toHaveCount(0);
    await adminCtx.close();

    await page.goto("/ro/auctions");
    await page.getByTestId("auction-card").filter({ hasText: "Fisa Completa" }).click();
    await page.waitForURL(/\/auctions\/[a-z0-9]+$/);

    // fisa nu incarca pagina principala — e sub buton
    await expect(page.getByTestId("lot-traits")).toBeHidden();
    await page.locator('[data-testid="lot-more"] summary').click();

    await expect(page.getByTestId("trait-row-eyeColor")).toContainText("Portocaliu");
    await expect(page.getByTestId("trait-row-muscles")).toContainText("Suplă");
    await expect(page.getByTestId("trait-row-plumage")).toContainText("Bogat");
    await expect(page.getByTestId("trait-row-disciplines")).toContainText("Demifond, Fond");
    // randurile necompletate nu apar deloc
    await expect(page.getByTestId("trait-row-back")).toHaveCount(0);
  });

  test("fisa se traduce in engleza", async ({ page }) => {
    await page.goto("/en/auctions");
    await page.getByTestId("auction-card").filter({ hasText: "Fulger Albastru" }).click();
    await page.waitForURL(/\/auctions\/[a-z0-9]+$/);
    await page.locator('[data-testid="lot-more"] summary').click();
    await expect(page.getByTestId("trait-row-eyeColor")).toContainText("Orange");
    await expect(page.getByTestId("trait-row-ventbonePosition")).toContainText("Very closed");
  });

  test("valorile inventate sunt aruncate, nu salvate", async ({ page }) => {
    await login(page, "seller@nbp.test", "seller1234");
    const res = await page.request.post("/api/sell", {
      data: {
        ringNumber: "RO 2025 707071",
        birthYear: 2025,
        sex: "M",
        name: "Caracteristici inventate",
        startPriceCents: 15_000,
        traits: {
          eyeColor: "<script>alert(1)</script>",
          camp_inexistent: "orice",
          muscles: "supple",
        },
      },
    });
    expect(res.status()).toBe(200);

    // doar valoarea valida a ramas
    const admin = await page.context().browser()!.newContext({ locale: "ro-RO" });
    const ap = await admin.newPage();
    await login(ap, "admin@nbp.test", "admin1234");
    await ap.goto("/ro/admin/lots");
    const pending = ap.getByTestId("pending-lot-row").filter({ hasText: "Caracteristici inventate" });
    await expect(pending).toBeVisible();
    await pending.getByTestId("mod-approve").click();
    await expect(pending).toHaveCount(0);
    await ap.goto("/ro/auctions");
    await ap.getByTestId("auction-card").filter({ hasText: "Caracteristici inventate" }).click();
    await ap.waitForURL(/\/auctions\/[a-z0-9]+$/);
    await ap.locator('[data-testid="lot-more"] summary').click();
    await expect(ap.getByTestId("trait-row-muscles")).toBeVisible();
    await expect(ap.getByTestId("trait-row-eyeColor")).toHaveCount(0);
    await expect(ap.locator("body")).not.toContainText("camp_inexistent");
    await admin.close();
  });
});

test.describe("Unealta de test: inchide licitatia in 1 minut", () => {
  test("adminul scurteaza o licitatie si ora noua apare in pagina", async ({ page }) => {
    await login(page, "admin@nbp.test", "admin1234");
    await page.goto("/ro/admin/lots");

    const row = page.getByTestId("running-lot-row").filter({ hasText: "Fulger Albastru" });
    await expect(row).toBeVisible();
    await row.getByTestId("lot-shorten").click();
    await expect(row.getByTestId("lot-shorten-done")).toBeVisible();

    // pe pagina lotului, cronometrul arata sub doua minute
    await page.goto("/ro/auctions");
    await page.getByTestId("auction-card").filter({ hasText: "Fulger Albastru" }).click();
    await page.waitForURL(/\/auctions\/[a-z0-9]+$/);
    const countdown = await page.getByTestId("countdown").first().innerText();
    expect(countdown).not.toMatch(/\dz/); // fara zile
    expect(countdown).toMatch(/^0?[01]m|^\d{1,2}s/);
  });

  test("doar adminul poate scurta", async ({ page }) => {
    await login(page, "buyer1@nbp.test", "buyer1234");
    const t = await page.request.get("/ro/auctions");
    const html = await t.text();
    const id = html.match(/\/ro\/auctions\/([a-z0-9]{20,})/)![1];
    const res = await page.request.post(`/api/admin/lots/${id}/shorten`, { data: {} });
    expect(res.status()).toBe(403);
  });

  test("cu unealta oprita din setari, butonul dispare si ruta refuza", async ({ page }) => {
    await login(page, "admin@nbp.test", "admin1234");

    // oprim comutatorul
    let res = await page.request.post("/api/admin/settings", {
      data: { updates: { testShortenEnabled: false } },
    });
    expect((await res.json()).ok).toBe(true);

    await page.goto("/ro/admin/lots");
    await expect(page.getByTestId("test-tools")).toHaveCount(0);

    const html = await (await page.request.get("/ro/auctions")).text();
    const id = html.match(/\/ro\/auctions\/([a-z0-9]{20,})/)![1];
    res = await page.request.post(`/api/admin/lots/${id}/shorten`, { data: {} });
    expect(res.status()).toBe(403);
    expect((await res.json()).error).toBe("TEST_TOOLS_DISABLED");

    // il punem la loc pentru testele urmatoare
    await page.request.post("/api/admin/settings", {
      data: { updates: { testShortenEnabled: true } },
    });
    await page.goto("/ro/admin/lots");
    await expect(page.getByTestId("test-tools")).toBeVisible();
  });
});
