import { test, expect } from "@playwright/test";
import { login } from "./helpers";

/**
 * Razboi de oferte intre doi utilizatori reali, in doua sesiuni de browser,
 * pe licitatia "Fulger Albastru" (lider seed: buyer1 cu plafon 500 EUR).
 */
test.describe("Licitare live: proxy-bidding intre doi utilizatori", () => {
  test("scenariul complet de outbid + actualizare live prin SSE", async ({ browser }) => {
    test.setTimeout(180_000); // prima compilare a paginilor in dev e lenta
    const ctxA = await browser.newContext({ locale: "ro-RO" });
    const ctxB = await browser.newContext({ locale: "ro-RO" });
    const pageA = await ctxA.newPage(); // buyer1 — liderul curent
    const pageB = await ctxB.newPage(); // buyer2 — challenger (cont nou, limita 1000)

    await login(pageA, "buyer1@nbp.test", "buyer1234");
    await login(pageB, "buyer2@nbp.test", "buyer1234");

    // Ambii deschid acelasi lot
    await pageA.goto("/ro/auctions");
    await pageA.getByTestId("auction-card").filter({ hasText: "Fulger Albastru" }).click();
    await pageA.waitForURL(/\/auctions\/[a-z0-9]+$/);
    const url = pageA.url();
    await pageB.goto(url);

    // buyer1 e lider (seed: max 500, pret vizibil 320)
    await expect(pageA.getByTestId("leading-badge")).toBeVisible();
    await expect(pageA.getByTestId("current-price")).toContainText("320");

    // 1) Limita de cont nou: buyer2 incearca 2000 EUR
    await pageB.getByTestId("bid-input").fill("2000");
    await pageB.getByTestId("bid-submit").click();
    await expect(pageB.getByTestId("bid-message")).toContainText("Limita de licitare");

    // 2) Oferta sub minim e respinsa cu minimul afisat
    await pageB.getByTestId("bid-input").fill("321");
    await pageB.getByTestId("bid-submit").click();
    await expect(pageB.getByTestId("bid-message")).toContainText("Ofertă prea mică");

    // 3) Plafon 400 < plafonul liderului (500): outbid instant, pretul urca la 410
    await pageB.getByTestId("bid-input").fill("400");
    await pageB.getByTestId("bid-submit").click();
    await expect(pageB.getByTestId("bid-message")).toContainText("depășită instant");
    await expect(pageB.getByTestId("current-price")).toContainText("410");

    // SSE: pagina lui buyer1 se actualizeaza FARA reload
    await expect(pageA.getByTestId("current-price")).toContainText("410");
    await expect(pageA.getByTestId("leading-badge")).toBeVisible();

    // 4) Plafon 600 > 500: buyer2 preia conducerea la 525 (500 + pas 25)
    await pageB.getByTestId("bid-input").fill("600");
    await pageB.getByTestId("bid-submit").click();
    await expect(pageB.getByTestId("bid-message")).toContainText("lider cu 525");
    await expect(pageB.getByTestId("leading-badge")).toBeVisible();

    // SSE la buyer1: pret 525 + pierde conducerea
    await expect(pageA.getByTestId("current-price")).toContainText("525");
    await expect(pageA.getByTestId("leading-badge")).not.toBeVisible();

    // 5) Vanzatorul nu poate licita la propriul lot
    const ctxS = await browser.newContext({ locale: "ro-RO" });
    const pageS = await ctxS.newPage();
    await login(pageS, "seller@nbp.test", "seller1234");
    const bidRes = await pageS.request.post(`/api/auctions/${url.split("/").pop()}/bid`, {
      data: { maxCents: 100_000 },
    });
    const bidBody = await bidRes.json();
    expect(bidBody.error).toBe("OWN_AUCTION");

    // 6) Notificarea de outbid a ajuns la buyer1
    await pageA.goto("/ro/account/notifications");
    await expect(pageA.getByTestId("notif-outbid").first()).toContainText("depășită");

    await ctxA.close();
    await ctxB.close();
    await ctxS.close();
  });

  test("watchlist: adaugare si stergere din favorite", async ({ page }) => {
    await login(page, "buyer1@nbp.test", "buyer1234");
    await page.goto("/ro/auctions");
    await page.getByTestId("auction-card").filter({ hasText: "Regina Nordului" }).click();
    await page.getByTestId("watch-button").click();
    await expect(page.getByTestId("watch-button")).toContainText("Scoate");

    await page.goto("/ro/account/watchlist");
    await expect(page.getByTestId("watchlist-grid")).toContainText("Regina Nordului");

    await page.goBack();
    await page.getByTestId("watch-button").click();
    await expect(page.getByTestId("watch-button")).toContainText("Adaugă");
  });
});
