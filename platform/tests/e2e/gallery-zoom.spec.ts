import { test, expect } from "@playwright/test";
import fs from "fs";
import path from "path";
import { login } from "./helpers";

/**
 * Antetul lotului (serie · an · sex), mărirea pozelor la clic și încărcarea
 * clipurilor de până la cinci minute.
 */

const CLIP = path.join(__dirname, "fixtures", "test-clip.mp4");

async function deschideLot(page: import("@playwright/test").Page, nume = "Fulger Albastru") {
  await page.goto("/ro/auctions");
  await page.getByTestId("auction-card").filter({ hasText: nume }).click();
  await page.waitForURL(/\/auctions\/[a-z0-9]+$/);
}

test.describe("Antetul lotului", () => {
  test("arată seria, anul și sexul, pe un rând", async ({ page }) => {
    await deschideLot(page);
    const antet = page.getByTestId("lot-ring");
    await expect(antet).toContainText("RO 2023 445566");
    await expect(page.getByTestId("lot-year")).toHaveText("2023");
    await expect(page.getByTestId("lot-sex")).toHaveText("Mascul");

    // sunt deasupra numelui, nu pierdute mai jos în pagină
    const y = async (id: string) => (await page.getByTestId(id).boundingBox())!.y;
    expect(await y("lot-ring")).toBeLessThan(await y("lot-title"));
  });

  test("se traduc în engleză", async ({ page }) => {
    await page.goto("/en/auctions");
    await page.getByTestId("auction-card").filter({ hasText: "Fulger Albastru" }).click();
    await page.waitForURL(/\/auctions\/[a-z0-9]+$/);
    await expect(page.getByTestId("lot-sex")).toHaveText("Cock");
  });

  test("nu se mai repetă în fișa de dedesubt", async ({ page }) => {
    await deschideLot(page);
    await expect(page.getByTestId("fact-year")).toHaveCount(0);
    await expect(page.getByTestId("fact-sex")).toHaveCount(0);
  });
});

test.describe("Mărirea pozelor", () => {
  test("un clic pe poză o deschide pe tot ecranul", async ({ page }) => {
    await deschideLot(page);
    await expect(page.getByTestId("lightbox")).toHaveCount(0);

    await page.getByTestId("lot-image-zoom").click();
    await expect(page.getByTestId("lightbox")).toBeVisible();
    await expect(page.getByTestId("lightbox-image")).toBeVisible();

    // imaginea marita e chiar cea din pagina
    const src = await page.getByTestId("lightbox-image").getAttribute("src");
    expect(src).toBe(await page.getByTestId("lot-image").getAttribute("src"));
  });

  test("se închide cu Escape și cu butonul", async ({ page }) => {
    await deschideLot(page);
    await page.getByTestId("lot-image-zoom").click();
    await page.keyboard.press("Escape");
    await expect(page.getByTestId("lightbox")).toHaveCount(0);

    await page.getByTestId("lot-image-zoom").click();
    await page.getByTestId("lightbox-close").click();
    await expect(page.getByTestId("lightbox")).toHaveCount(0);
  });

  test("încă un clic mărește și mai mult", async ({ page }) => {
    await deschideLot(page);
    await page.getByTestId("lot-image-zoom").click();
    const img = page.getByTestId("lightbox-image");
    const inainte = (await img.boundingBox())!.width;
    await img.click();
    await expect(async () => {
      expect((await img.boundingBox())!.width).toBeGreaterThan(inainte);
    }).toPass({ timeout: 4000 });
  });

  test("pedigree-ul se mărește la fel — acolo scrisul e mărunt", async ({ page }) => {
    await deschideLot(page);
    await page.getByTestId("pedigree-open").click();
    await expect(page.getByTestId("lightbox")).toBeVisible();
    await expect(page.getByTestId("lightbox-image")).toHaveAttribute("src", /pedigree/);
  });

  test("pe telefon, fereastra de mărire nu iese din ecran", async ({ page }) => {
    await page.setViewportSize({ width: 375, height: 812 });
    await deschideLot(page);
    await page.getByTestId("lot-image-zoom").click();
    await expect(page.getByTestId("lightbox")).toBeVisible();

    const overflow = await page.evaluate(
      () => document.documentElement.scrollWidth - window.innerWidth
    );
    expect(overflow).toBeLessThanOrEqual(0);

    // butonul de inchidere e destul de mare cat sa fie nimerit cu degetul
    const close = (await page.getByTestId("lightbox-close").boundingBox())!;
    expect(Math.min(close.width, close.height)).toBeGreaterThanOrEqual(40);
  });
});

test.describe("Clipuri de până la cinci minute", () => {
  test("formularul anunță limita de 5 minute", async ({ page }) => {
    await login(page, "seller@nbp.test", "seller1234");
    await page.goto("/ro/sell");
    await expect(page.getByTestId("sf-videos-picker")).toContainText("5 minute");
  });

  test("clipul se încarcă trimis ca atare, scris direct pe disc", async ({ page }) => {
    await login(page, "seller@nbp.test", "seller1234");
    const res = await page.request.post("/api/upload", {
      headers: { "Content-Type": "video/mp4" },
      data: fs.readFileSync(CLIP),
    });
    const out = await res.json();
    expect(out.ok).toBe(true);
    expect(out.files[0].type).toBe("VIDEO");
    expect(out.files[0].url).toMatch(/^\/api\/files\/[a-z0-9-]+\.mp4$/);

    // fisierul chiar se serveste
    const served = await page.request.get(out.files[0].url);
    expect(served.status()).toBe(200);
    expect(served.headers()["content-type"]).toBe("video/mp4");
  });

  test("un fișier care nu e video e respins și pe calea nouă", async ({ page }) => {
    await login(page, "seller@nbp.test", "seller1234");
    const res = await page.request.post("/api/upload", {
      headers: { "Content-Type": "video/mp4" },
      data: Buffer.from("nu sunt un clip"),
    });
    expect((await res.json()).error).toBe("INVALID_TYPE");
  });

  test("cumpărătorii nu pot încărca nici pe calea nouă", async ({ page }) => {
    await login(page, "buyer1@nbp.test", "buyer1234");
    const res = await page.request.post("/api/upload", {
      headers: { "Content-Type": "video/mp4" },
      data: fs.readFileSync(CLIP),
    });
    expect(res.status()).toBe(403);
  });
});
