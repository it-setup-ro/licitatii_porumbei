import { test, expect, type Page } from "@playwright/test";
import { login } from "./helpers";

/**
 * Zona de licitație, refăcută după brief-ul clientului: „licitație live",
 * preț mare, câți ofertanți, cronometru, stepper, buton pe toată lățimea,
 * preț de rezervă, nickname în istoric, bară fixă pe telefon.
 */

async function lotCuOferte(page: Page, sufix: string, rezerva?: number) {
  const nume = `UI ${sufix}`;
  await login(page, "seller@nbp.test", "seller1234");
  await page.goto("/ro/sell");
  await page.getByTestId("sf-ring").fill(`RO 2025 ${sufix}`);
  await page.getByTestId("sf-name").fill(nume);
  await page.getByTestId("sf-start-price").fill("120");
  if (rezerva !== undefined) await page.getByTestId("sf-reserve-price").fill(String(rezerva));
  await page.getByTestId("sell-submit").click();
  await expect(page.getByTestId("sell-success")).toBeVisible();

  const ctx = await page.context().browser()!.newContext({ locale: "ro-RO" });
  const admin = await ctx.newPage();
  await login(admin, "admin@nbp.test", "admin1234");
  await admin.goto("/ro/admin/lots");
  const row = admin.getByTestId("pending-lot-row").filter({ hasText: nume });
  await expect(row).toBeVisible();
  await row.getByTestId("mod-approve").click();
  await expect(admin.getByTestId("pending-lot-row").filter({ hasText: nume })).toHaveCount(0);
  await ctx.close();

  await page.goto("/ro/auctions");
  await page.getByTestId("auction-card").filter({ hasText: nume }).click();
  await page.waitForURL(/\/auctions\/[a-z0-9]+$/);
  return { nume, id: page.url().split("/").pop()! };
}

test.describe("Zona de licitație", () => {
  test("arată live, preț, ofertanți, cronometru și buton mare", async ({ page }) => {
    test.setTimeout(120_000);
    const { id } = await lotCuOferte(page, "930001");

    await login(page, "buyer1@nbp.test", "buyer1234");
    await page.goto(`/ro/auctions/${id}`);

    await expect(page.getByTestId("live-badge")).toContainText("Licitație live");
    await expect(page.getByTestId("current-price")).toBeVisible();
    await expect(page.getByTestId("bidder-count")).toContainText("ofertant");
    await expect(page.getByTestId("bid-count")).toBeVisible();
    await expect(page.getByTestId("countdown").first()).toBeVisible();
    await expect(page.getByTestId("bid-minus")).toBeVisible();
    await expect(page.getByTestId("bid-plus")).toBeVisible();
    await expect(page.getByTestId("bid-submit")).toContainText(/licitează/i);

    // butonul principal e lat cat panoul, nu un buton mic langa camp
    const panou = (await page.getByTestId("bid-panel").boundingBox())!;
    const buton = (await page.getByTestId("bid-submit").boundingBox())!;
    expect(buton.width).toBeGreaterThan(panou.width * 0.7);
  });

  test("numărul de ofertanți crește cu oameni, nu cu oferte", async ({ page, browser }) => {
    test.setTimeout(150_000);
    const { id } = await lotCuOferte(page, "930002");

    const doiOameni = async () => {
      // trei oferte reale, de la doi oameni. (Ridicarea propriului plafon nu
      // adauga o oferta noua — pretul vizibil nu se misca — deci alternam.)
      for (const [email, suma] of [
        ["buyer1@nbp.test", 12_000],
        ["buyer2@nbp.test", 20_000],
        ["buyer1@nbp.test", 30_000],
      ] as const) {
        const ctx = await browser.newContext({ locale: "ro-RO" });
        const p = await ctx.newPage();
        await login(p, email, "buyer1234");
        const r = await p.request.post(`/api/auctions/${id}/bid`, { data: { maxCents: suma } });
        expect((await r.json()).ok, `${email} ${suma}`).toBe(true);
        await ctx.close();
      }
    };
    await doiOameni();

    await page.goto(`/ro/auctions/${id}`);
    const oferte = await page.getByTestId("bid-count").innerText();
    const oameni = await page.getByTestId("bidder-count").innerText();
    const nr = (s: string) => Number(s.replace(/\D/g, "")) || 0;

    // trei oferte de la doi oameni: numarul de oameni trebuie sa fie mai mic
    expect(nr(oferte), `oferte: ${oferte}`).toBe(3);
    expect(nr(oameni), `ofertanti: ${oameni}`).toBe(2);
  });

  test("istoricul arată nickname-ul, nu numele real", async ({ page, browser }) => {
    test.setTimeout(150_000);
    const { id } = await lotCuOferte(page, "930003");

    const ctx = await browser.newContext({ locale: "ro-RO" });
    const buyer = await ctx.newPage();
    await login(buyer, "buyer1@nbp.test", "buyer1234");
    const r = await buyer.request.post(`/api/auctions/${id}/bid`, { data: { maxCents: 12_000 } });
    expect((await r.json()).ok).toBe(true);
    await ctx.close();

    await page.goto(`/ro/auctions/${id}`);
    const istoric = page.getByTestId("bid-history");
    await expect(istoric).toContainText("MihaiP");
    await expect(istoric, "numele real nu are ce cauta aici").not.toContainText("Popescu");
  });
});

test.describe("Prețul de rezervă", () => {
  test("neatins, apoi atins — fără să se vadă vreodată suma", async ({ page, browser }) => {
    test.setTimeout(150_000);
    const { id } = await lotCuOferte(page, "930004", 400);

    await login(page, "buyer1@nbp.test", "buyer1234");
    await page.goto(`/ro/auctions/${id}`);
    await expect(page.getByTestId("reserve-state")).toContainText("nu a fost atins");
    // suma nu apare nicaieri in pagina
    await expect(page.locator("body")).not.toContainText("400 €");

    const ctx = await browser.newContext({ locale: "ro-RO" });
    const buyer = await ctx.newPage();
    await login(buyer, "buyer2@nbp.test", "buyer1234");
    const r = await buyer.request.post(`/api/auctions/${id}/bid`, { data: { maxCents: 45_000 } });
    expect((await r.json()).ok).toBe(true);
    await ctx.close();

    await page.reload();
    await expect(page.getByTestId("reserve-state")).toContainText("atins");
    await expect(page.getByTestId("reserve-state")).not.toContainText("nu a fost");
  });

  test("un lot fără rezervă nu arată niciun semn", async ({ page }) => {
    test.setTimeout(120_000);
    const { id } = await lotCuOferte(page, "930005");
    await page.goto(`/ro/auctions/${id}`);
    await expect(page.getByTestId("reserve-state")).toHaveCount(0);
  });
});

test.describe("Restul paginii", () => {
  test("semnele de încredere stau lângă buton", async ({ page }) => {
    await page.goto("/ro/auctions");
    await page.getByTestId("auction-card").first().click();
    await page.waitForURL(/\/auctions\/[a-z0-9]+$/);
    const trust = page.getByTestId("trust-badges");
    await expect(trust).toBeVisible();
    await expect(trust).toContainText("Plată securizată");
    await expect(trust).toContainText("Transport specializat");
  });

  test("pe telefon apare bara fixă cu prețul, după ce derulezi", async ({ page }) => {
    await page.setViewportSize({ width: 375, height: 812 });
    await login(page, "buyer1@nbp.test", "buyer1234");
    await page.goto("/ro/auctions");
    await page.getByTestId("auction-card").first().click();
    await page.waitForURL(/\/auctions\/[a-z0-9]+$/);

    // sus, langa panou, nu are rost
    await expect(page.getByTestId("sticky-bid-bar")).toHaveCount(0);

    await page.mouse.wheel(0, 2500);
    await expect(page.getByTestId("sticky-bid-bar")).toBeVisible();
    await expect(page.getByTestId("sticky-price")).toContainText("€");

    // apasarea te duce inapoi la panou
    await page.getByTestId("sticky-bid-button").click();
    await expect(page.getByTestId("bid-input")).toBeFocused();
  });
});
