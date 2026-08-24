import { test, expect } from "@playwright/test";
import path from "path";
import { login } from "./helpers";

/**
 * Campurile cerute pe un lot, in formatul pipa.be:
 *   serie / an / sex · nume · descriere (rand scurt + text) · pedigree ·
 *   foto · video · reprodus de · oferit de · pret de pornire
 *
 * Restul informatiilor stau sub butonul „Toate detaliile".
 */

const PHOTO = path.join(__dirname, "fixtures", "test-pigeon.png");
const CLIP = path.join(__dirname, "fixtures", "test-clip.mp4");
const PEDIGREE = path.join(__dirname, "fixtures", "test-pedigree.pdf");

test.describe("Formularul de listare", () => {
  test("are cele noua rubrici cerute, in ordine", async ({ page }) => {
    await login(page, "seller@nbp.test", "seller1234");
    await page.goto("/ro/sell");

    for (const id of [
      "sf-ring",
      "sf-year",
      "sf-sex",
      "sf-name",
      "sf-tagline",
      "sf-desc-ro",
      "sf-pedigree-picker",
      "sf-photos-picker",
      "sf-videos-picker",
      "sf-bred-by",
      "sf-offered-by",
      "sf-start-price",
    ]) {
      await expect(page.getByTestId(id), `lipsește ${id}`).toBeVisible();
    }

    // ordinea pe verticala, nu doar prezenta
    const y = async (id: string) => (await page.getByTestId(id).boundingBox())!.y;
    expect(await y("sf-ring")).toBeLessThan(await y("sf-name"));
    expect(await y("sf-name")).toBeLessThan(await y("sf-tagline"));
    expect(await y("sf-desc-ro")).toBeLessThan(await y("sf-pedigree-picker"));
    expect(await y("sf-pedigree-picker")).toBeLessThan(await y("sf-photos-picker"));
    expect(await y("sf-photos-picker")).toBeLessThan(await y("sf-videos-picker"));
    expect(await y("sf-videos-picker")).toBeLessThan(await y("sf-bred-by"));
    expect(await y("sf-bred-by")).toBeLessThan(await y("sf-start-price"));
  });

  test("„Oferit de” vine precompletat cu numele crescatorului", async ({ page }) => {
    await login(page, "seller@nbp.test", "seller1234");
    await page.goto("/ro/sell");
    await expect(page.getByTestId("sf-offered-by")).toHaveValue(/Câmpeanu/);
  });

  test("culoarea, linia si palmaresul stau pliate sub „Alte detalii”", async ({ page }) => {
    await login(page, "seller@nbp.test", "seller1234");
    await page.goto("/ro/sell");
    await expect(page.getByTestId("sf-color")).toBeHidden();
    await page.locator('[data-testid="sf-more"] > summary').click();
    await expect(page.getByTestId("sf-color")).toBeVisible();
    await expect(page.getByTestId("sf-strain")).toBeVisible();
    await expect(page.getByTestId("sf-add-result")).toBeVisible();
  });
});

test.describe("Pedigree incarcat ca PDF", () => {
  test("PDF-ul urca, se serveste izolat si apare pe lot", async ({ page }) => {
    test.setTimeout(120_000);
    await login(page, "seller@nbp.test", "seller1234");
    await page.goto("/ro/sell");

    const ped = page.getByTestId("sf-pedigree-picker");
    await ped.getByTestId("media-input-files").setInputFiles(PEDIGREE);
    const link = ped.getByTestId("media-doc-preview");
    await expect(link).toBeVisible();
    const url = (await link.getAttribute("href"))!;
    expect(url).toMatch(/^\/api\/files\/[a-z0-9-]+\.pdf$/);

    // servit ca PDF, cu drepturi zero si fara reinterpretare de tip
    const res = await page.request.get(url);
    expect(res.status()).toBe(200);
    expect(res.headers()["content-type"]).toBe("application/pdf");
    expect(res.headers()["content-security-policy"]).toBe(
      "default-src 'none'; frame-ancestors 'self'"
    );
    expect(res.headers()["x-content-type-options"]).toBe("nosniff");
    // incadrabil in pagina noastra, dar pe niciun alt site
    expect(res.headers()["x-frame-options"]).toBe("SAMEORIGIN");
    // se deschide in pagina, nu se descarca
    expect(res.headers()["content-disposition"]).toContain("inline");

    // lotul complet: poza, clip si pedigree
    await page.getByTestId("sf-ring").fill("RO 2025 909090");
    await page.getByTestId("sf-year").fill("2025");
    await page.getByTestId("sf-name").fill("Pedigree PDF Test");
    await page.getByTestId("sf-tagline").fill("Lot de test cu pedigree PDF");
    await page.getByTestId("sf-bred-by").fill("Hetzel Martin");
    await page.getByTestId("sf-offered-by").fill("Asociația de Test");
    await page.getByTestId("sf-photos-picker").getByTestId("media-input-files").setInputFiles(PHOTO);
    await expect(
      page.getByTestId("sf-photos-picker").getByTestId("media-previews").locator("img")
    ).toHaveCount(1);
    await page.getByTestId("sf-videos-picker").getByTestId("media-input-files").setInputFiles(CLIP);
    await expect(
      page.getByTestId("sf-videos-picker").getByTestId("media-previews").locator("video")
    ).toHaveCount(1);
    await page.getByTestId("sf-start-price").fill("150");
    await page.getByTestId("sell-submit").click();
    await expect(page.getByTestId("sell-success")).toBeVisible();

    // adminul aproba, apoi verificam pagina publica
    const adminCtx = await page.context().browser()!.newContext({ locale: "ro-RO" });
    const admin = await adminCtx.newPage();
    await login(admin, "admin@nbp.test", "admin1234");
    await admin.goto("/ro/admin/lots");
    await admin
      .getByTestId("pending-lot-row")
      .filter({ hasText: "Pedigree PDF Test" })
      .getByTestId("mod-approve")
      .click();
    await expect(
      admin.getByTestId("pending-lot-row").filter({ hasText: "Pedigree PDF Test" })
    ).toHaveCount(0);
    await adminCtx.close();

    await page.goto("/ro/auctions");
    await page.getByTestId("auction-card").filter({ hasText: "Pedigree PDF Test" }).click();
    await page.waitForURL(/\/auctions\/[a-z0-9]+$/);

    await expect(page.getByTestId("lot-title")).toHaveText("Pedigree PDF Test");
    await expect(page.getByTestId("lot-tagline")).toContainText("pedigree PDF");
    await expect(page.getByTestId("fact-bred-by")).toContainText("Hetzel Martin");
    await expect(page.getByTestId("fact-offered-by")).toContainText("Asociația de Test");
    await expect(page.getByTestId("pedigree-open")).toHaveAttribute("href", /\.pdf$/);
    // galeria are si poza, si clipul
    await expect(page.getByTestId("lot-thumb")).toHaveCount(2);
  });

  test("un fisier fals cu extensie .pdf e respins", async ({ page }) => {
    await login(page, "seller@nbp.test", "seller1234");
    const res = await page.request.post("/api/upload", {
      multipart: {
        files: {
          name: "fals.pdf",
          mimeType: "application/pdf",
          buffer: Buffer.from("nu sunt un PDF"),
        },
      },
    });
    expect((await res.json()).error).toBe("INVALID_TYPE");
  });

  test("un pedigree gazduit in alta parte nu e acceptat", async ({ page }) => {
    await login(page, "seller@nbp.test", "seller1234");
    const res = await page.request.post("/api/sell", {
      data: {
        ringNumber: "RO 2025 909091",
        birthYear: 2025,
        sex: "M",
        name: "Pedigree extern",
        startPriceCents: 15_000,
        pedigreeUrl: "https://evil.example.com/pedigree.pdf",
      },
    });
    expect(res.status()).toBe(422);
  });
});

test.describe("Pagina lotului", () => {
  test("ofertele: se vad ultimele trei, restul la buton", async ({ page }) => {
    await page.goto("/ro/auctions");
    await page.getByTestId("auction-card").filter({ hasText: "Fulger Albastru" }).click();
    await page.waitForURL(/\/auctions\/[a-z0-9]+$/);

    await expect(page.getByTestId("bid-row")).toHaveCount(3);
    const toggle = page.getByTestId("bid-history-toggle");
    await expect(toggle).toContainText("Vezi toate ofertele");

    // cate oferte are lotul depinde de testele rulate inainte — luam numarul din eticheta
    const total = Number((await toggle.innerText()).match(/\((\d+)\)/)![1]);
    expect(total).toBeGreaterThan(3);
    await toggle.click();
    await expect(page.getByTestId("bid-row")).toHaveCount(total);
    await toggle.click();
    await expect(page.getByTestId("bid-row")).toHaveCount(3);
  });

  test("pe telefon, pretul apare imediat sub galerie", async ({ page }) => {
    await page.setViewportSize({ width: 375, height: 812 });
    await page.goto("/ro/auctions");
    await page.getByTestId("auction-card").filter({ hasText: "Fulger Albastru" }).click();
    await page.waitForURL(/\/auctions\/[a-z0-9]+$/);

    const galerie = (await page.getByTestId("lot-gallery").boundingBox())!;
    const pret = (await page.getByTestId("current-price").boundingBox())!;
    const descriere = (await page.getByTestId("lot-description").boundingBox())!;
    expect(pret.y).toBeGreaterThan(galerie.y);
    expect(pret.y).toBeLessThan(descriere.y);

    // fara derulare laterala
    const overflow = await page.evaluate(
      () => document.documentElement.scrollWidth - window.innerWidth
    );
    expect(overflow).toBeLessThanOrEqual(0);
  });

  test("numele si rubrica apar si pe cardul din listare", async ({ page }) => {
    await page.goto("/ro/auctions");
    const card = page.getByTestId("auction-card").filter({ hasText: "Fulger Albastru" });
    await expect(card).toContainText("Fulger Albastru");
    await expect(card).toContainText("Arad");
  });
});
