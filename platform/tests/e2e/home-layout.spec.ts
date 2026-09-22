import { test, expect } from "@playwright/test";
import { login } from "./helpers";

/**
 * Schimbările cerute de client: ordinea secțiunilor de pe prima pagină,
 * istoricul ofertelor lângă butonul de favorite și subcategoriile din meniul
 * „Curse & Rezultate" (ex. „OLR" cu concursurile lui).
 */

test.describe("Ordinea de pe prima pagină", () => {
  test("articolele sunt deasupra crescătorilor, iar concursul între ele", async ({ page }) => {
    await page.goto("/ro");

    const poz = async (testid: string) => {
      const el = page.getByTestId(testid);
      if ((await el.count()) === 0) return null;
      const box = await el.first().boundingBox();
      return box?.y ?? null;
    };

    const articole = await poz("home-articles");
    const crescatori = await poz("breeders-strip");
    const licitatii = await poz("section-live");
    expect(articole, "secțiunea de articole lipsește").not.toBeNull();
    expect(licitatii).not.toBeNull();

    // articolele urcă deasupra crescătorilor și a licitațiilor
    if (crescatori !== null) expect(articole!).toBeLessThan(crescatori);
    expect(articole!).toBeLessThan(licitatii!);

    // concursul, dacă e vreunul activ, stă între articole și licitații
    const carusel = await poz("contest-carousel");
    if (carusel !== null) {
      expect(carusel).toBeGreaterThan(articole!);
      expect(carusel).toBeLessThan(licitatii!);
      // banda duce la concursul afișat, iar lângă ea e linkul către toate
      await expect(page.getByTestId("contest-banner-link").first()).toHaveAttribute(
        "href",
        /\/ro\/contests\/[a-z0-9-]+$/
      );
      await expect(page.getByTestId("contests-all")).toBeVisible();
    }
  });
});

test.describe("Istoricul ofertelor", () => {
  test("stă în coloana din dreapta, lângă butonul de favorite", async ({ page }) => {
    await page.goto("/ro/auctions?q=445566");
    await page.getByTestId("auction-card").first().click();
    await expect(page.getByTestId("lot-title")).toBeVisible();

    const istoric = page.getByTestId("bid-history-box");
    await expect(istoric).toBeVisible();

    // dreapta: marginea lui începe după jumătatea paginii, unde e coloana de licitat
    const box = await istoric.boundingBox();
    const lat = page.viewportSize()!.width;
    expect(box!.x).toBeGreaterThan(lat / 2);
  });
});

test.describe("Subcategorii în meniul Curse & Rezultate", () => {
  test("grupul se desface la clic și arată linkurile lui", async ({ page }) => {
    await login(page, "admin@nbp.test", "admin1234");

    // un grup „OLR" cu două linkuri, ca la client
    const creeaza = (labelRo: string, url: string) =>
      page.request.post("/api/admin/links", {
        data: {
          group: "CONTESTS",
          category: "OLR",
          labelRo,
          labelEn: labelRo,
          url,
          sortIdx: 90,
          active: true,
        },
      });
    const unu = await creeaza("OLR Test Champions League", "https://example.com/olr-1");
    const doi = await creeaza("OLR Test Bucovina", "https://example.com/olr-2");
    expect(unu.ok()).toBe(true);
    expect(doi.ok()).toBe(true);

    await page.goto("/ro");
    await page.getByTestId("nav-contests").click();
    const grup = page.getByTestId("contest-group").filter({ hasText: "OLR" });
    await expect(grup).toBeVisible();

    // strâns la început: linkurile din grup nu se văd
    await expect(page.getByTestId("contest-group-items")).toHaveCount(0);
    await grup.click();
    const items = page.getByTestId("contest-group-items");
    await expect(items).toBeVisible();
    await expect(items.getByTestId("contest-link")).toHaveCount(2);
    await expect(items).toContainText("OLR Test Champions League");
    await expect(items).toContainText("OLR Test Bucovina");

    // se strânge la al doilea clic
    await grup.click();
    await expect(page.getByTestId("contest-group-items")).toHaveCount(0);

    // curățenie: le scoatem din meniu ca să nu încurce celelalte teste
    for (const id of [(await unu.json()).id, (await doi.json()).id]) {
      const r = await page.request.post("/api/admin/links", {
        data: {
          id,
          group: "CONTESTS",
          category: "OLR",
          labelRo: "OLR Test (scos)",
          labelEn: "OLR Test (removed)",
          url: "https://example.com/olr",
          sortIdx: 90,
          active: false,
        },
      });
      expect(r.ok()).toBe(true);
    }
  });
});
