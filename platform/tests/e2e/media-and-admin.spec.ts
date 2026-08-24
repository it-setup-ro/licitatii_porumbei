import { test, expect } from "@playwright/test";
import path from "path";
import { login } from "./helpers";

const PHOTO = path.join(__dirname, "fixtures", "test-pigeon.png");

/**
 * Selectorul de fisiere e acelasi peste tot (articole, listare porumbel,
 * produse) si scurtatura de administrare e mereu la indemana.
 */

test.describe("Camera si alegerea fisierelor — pe telefon", () => {
  test.use({ viewport: { width: 375, height: 812 } });

  test("butoanele de camera apar pe telefon si deschid camera reala", async ({ page }) => {
    await login(page, "admin@nbp.test", "admin1234");
    await page.goto("/ro/admin/articles?new=1");

    const photo = page.getByTestId("media-take-photo");
    const video = page.getByTestId("media-record-video");
    await expect(photo).toBeVisible();
    await expect(video).toBeVisible();

    // `capture` e ce face telefonul sa deschida camera, nu galeria
    await expect(page.getByTestId("media-input-photo")).toHaveAttribute("capture", "environment");
    await expect(page.getByTestId("media-input-photo")).toHaveAttribute("accept", "image/*");
    await expect(page.getByTestId("media-input-video")).toHaveAttribute("capture", "environment");
    await expect(page.getByTestId("media-input-video")).toHaveAttribute("accept", "video/*");
  });

  test("acelasi selector la listarea unui porumbel", async ({ page }) => {
    await login(page, "seller@nbp.test", "seller1234");
    await page.goto("/ro/sell");
    await expect(page.getByTestId("media-take-photo")).toBeVisible();
    // la porumbei nu se accepta clipuri, deci butonul de filmare lipseste
    await expect(page.getByTestId("media-record-video")).toHaveCount(0);
    await expect(page.getByTestId("media-choose-files")).toBeVisible();
  });

  test("acelasi selector la produsele din magazin", async ({ page }) => {
    await login(page, "admin@nbp.test", "admin1234");
    await page.goto("/ro/admin/products?new=1");
    await expect(page.getByTestId("media-take-photo")).toBeVisible();
    await expect(page.getByTestId("media-choose-files")).toBeVisible();
  });

  test("poza facuta pe loc ajunge in produs, fara sa scrii vreo cale", async ({ page }) => {
    await login(page, "admin@nbp.test", "admin1234");
    await page.goto("/ro/admin/products?new=1");

    const slug = `produs-camera-${Date.now()}`;
    await page.getByTestId("field-slug").fill(slug);
    await page.getByTestId("field-nameRo").fill("Produs cu poză");
    await page.getByTestId("field-nameEn").fill("Product with photo");
    await page.getByTestId("field-priceCents").fill("25");
    await page.getByTestId("field-stock").fill("3");
    await page.getByTestId("media-input-photo").setInputFiles(PHOTO);
    await expect(page.getByTestId("media-previews").locator("img")).toHaveCount(1);
    await page.getByTestId("editor-save").click();
    await expect(page.getByTestId("editor-saved")).toBeVisible();

    await page.goto(`/ro/products/${slug}`);
    await expect(page.locator("main img").first()).toHaveAttribute(
      "src",
      /^\/api\/files\/[a-z0-9-]+\.png$/
    );
  });
});

test.describe("Camera pe calculator", () => {
  test.use({ viewport: { width: 1280, height: 800 } });

  test("butoanele de camera sunt ascunse pe calculator", async ({ page }) => {
    await login(page, "admin@nbp.test", "admin1234");
    await page.goto("/ro/admin/articles?new=1");
    // pe desktop `capture` e ignorat: butoanele ar deschide tot selectorul de
    // fisiere, deci ar fi doua butoane care fac acelasi lucru
    await expect(page.getByTestId("media-take-photo")).toBeHidden();
    await expect(page.getByTestId("media-record-video")).toBeHidden();
    await expect(page.getByTestId("media-choose-files")).toBeVisible();
  });
});

test.describe("Scurtatura de administrare", () => {
  test("adminul are butonul in bara de sus, pe orice pagina", async ({ page }) => {
    await login(page, "admin@nbp.test", "admin1234");
    for (const path of ["/ro", "/ro/auctions", "/ro/products", "/ro/articles"]) {
      await page.goto(path);
      await expect(page.getByTestId("top-admin"), `lipseste pe ${path}`).toBeVisible();
    }
    await page.getByTestId("top-admin").click();
    await expect(page).toHaveURL(/\/ro\/admin$/);
  });

  test("butonul e vizibil si pe telefon", async ({ page }) => {
    await page.setViewportSize({ width: 375, height: 812 });
    await login(page, "admin@nbp.test", "admin1234");
    await page.goto("/ro");
    await expect(page.getByTestId("top-admin")).toBeVisible();
  });

  test("vizitatorii si cumparatorii nu vad butonul", async ({ page }) => {
    await page.goto("/ro");
    await expect(page.getByTestId("top-admin")).toHaveCount(0);

    await login(page, "buyer1@nbp.test", "buyer1234");
    await page.goto("/ro");
    await expect(page.getByTestId("top-admin")).toHaveCount(0);
  });
});
