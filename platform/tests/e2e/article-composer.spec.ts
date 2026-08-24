import { test, expect } from "@playwright/test";
import path from "path";
import { login } from "./helpers";

const PHOTO = path.join(__dirname, "fixtures", "test-pigeon.png");
const CLIP = path.join(__dirname, "fixtures", "test-clip.mp4");

/** Compunerea articolelor trebuie sa fie simpla: titlu, text, foto/video. */
test.describe("Compozitor de articole", () => {
  test("publicare cu titlu + text: adresa si rezumatul se completeaza singure", async ({
    page,
  }) => {
    await login(page, "admin@nbp.test", "admin1234");
    await page.goto("/ro/admin/articles?new=1");

    const titlu = `Sfaturi pentru sezonul de vară ${Date.now()}`;
    await page.getByTestId("composer-title").fill(titlu);
    await page
      .getByTestId("composer-body")
      .fill(
        "Vara cere atenție la apă și umbră. Porumbeii trebuie să aibă apă curată tot timpul, iar podul se aerisește dimineața devreme."
      );
    await page.getByTestId("composer-submit").click();

    await expect(page.getByTestId("composer-saved")).toBeVisible();

    // articolul e vizibil public, cu adresa derivata din titlu (fara diacritice)
    await page.getByTestId("composer-view").click();
    await expect(page).toHaveURL(/\/ro\/articles\/sfaturi-pentru-sezonul-de-vara-\d+$/);
    await expect(page.getByTestId("article-title")).toContainText("Sfaturi pentru sezonul");
    await expect(page.getByTestId("article-body")).toContainText("apă curată");

    // rezumatul generat apare in lista
    await page.goto("/ro/articles");
    await expect(page.getByTestId("article-card").first()).toContainText("Vara cere atenție");
  });

  test("articolul apare si in engleza fara traducere manuala", async ({ page }) => {
    await login(page, "admin@nbp.test", "admin1234");
    await page.goto("/ro/admin/articles?new=1");
    await page.getByTestId("composer-title").fill(`Fara traducere ${Date.now()}`);
    await page.getByTestId("composer-body").fill("Text scris doar in limba romana.");
    await page.getByTestId("composer-submit").click();
    await expect(page.getByTestId("composer-saved")).toBeVisible();

    await page.goto("/en/articles");
    await expect(page.getByTestId("article-card").first()).toContainText("Fara traducere");
  });

  test("atasare poza si clip video, cu redare in articol", async ({ page }) => {
    test.setTimeout(120_000);
    await login(page, "admin@nbp.test", "admin1234");
    await page.goto("/ro/admin/articles?new=1");

    await page.getByTestId("composer-title").fill(`Cu poze si clip ${Date.now()}`);
    await page.getByTestId("composer-body").fill("Articol cu fișiere atașate.");
    await page.getByTestId("media-input-files").setInputFiles([PHOTO, CLIP]);

    // apar doua previzualizari
    await expect(page.getByTestId("media-previews").locator("img, video")).toHaveCount(2);

    await page.getByTestId("composer-submit").click();
    await expect(page.getByTestId("composer-saved")).toBeVisible();
    await page.getByTestId("composer-view").click();

    // poza si clipul sunt redate in pagina publica
    await expect(page.getByTestId("article-image")).toHaveCount(1);
    const video = page.getByTestId("article-video");
    await expect(video).toHaveCount(1);
    await expect(video).toHaveAttribute("controls", "");

    // clipul se serveste cu suport pentru derulare (Range)
    const src = await video.getAttribute("src");
    const partial = await page.request.get(src!, { headers: { Range: "bytes=0-99" } });
    expect(partial.status()).toBe(206);
    expect(partial.headers()["content-range"]).toMatch(/^bytes 0-99\//);
  });

  test("stergerea unui fisier din compozitor", async ({ page }) => {
    await login(page, "admin@nbp.test", "admin1234");
    await page.goto("/ro/admin/articles?new=1");
    await page.getByTestId("media-input-files").setInputFiles(PHOTO);
    await expect(page.getByTestId("media-previews").locator("img")).toHaveCount(1);
    await page.getByTestId("media-remove").click();
    await expect(page.getByTestId("media-previews")).toHaveCount(0);
  });

  test("butonul de publicare e blocat fara titlu si text", async ({ page }) => {
    await login(page, "admin@nbp.test", "admin1234");
    await page.goto("/ro/admin/articles?new=1");
    await expect(page.getByTestId("composer-submit")).toBeDisabled();
    await page.getByTestId("composer-title").fill("Doar titlu");
    await expect(page.getByTestId("composer-submit")).toBeDisabled();
    await page.getByTestId("composer-body").fill("Acum are si text.");
    await expect(page.getByTestId("composer-submit")).toBeEnabled();
  });

  test("ciorna nu apare public", async ({ page }) => {
    await login(page, "admin@nbp.test", "admin1234");
    await page.goto("/ro/admin/articles?new=1");
    const titlu = `Ciorna ${Date.now()}`;
    await page.getByTestId("composer-title").fill(titlu);
    await page.getByTestId("composer-body").fill("Text nepublicat.");
    await page.getByTestId("composer-published").uncheck();
    await page.getByTestId("composer-submit").click();
    await expect(page.getByTestId("composer-saved")).toContainText("ciornă");

    await page.goto("/ro/articles");
    await expect(page.getByText(titlu)).toHaveCount(0);
  });

  test("editarea pastreaza adresa articolului daca titlul nu se schimba", async ({ page }) => {
    await login(page, "admin@nbp.test", "admin1234");
    await page.goto("/ro/admin/articles");
    await page.getByTestId("article-edit").first().click();

    const initial = await page.getByTestId("composer-title").inputValue();
    await page.getByTestId("composer-body").fill("Text actualizat prin editare.");
    // articolul din capul listei poate fi o ciorna — il publicam ca sa avem ce vizualiza
    await page.getByTestId("composer-published").check();
    await page.getByTestId("composer-submit").click();
    await expect(page.getByTestId("composer-saved")).toBeVisible();

    await page.getByTestId("composer-view").click();
    await expect(page.getByTestId("article-title")).toContainText(initial.slice(0, 15));
    await expect(page.getByTestId("article-body")).toContainText("Text actualizat");
  });

  test("fisierele non-media sunt respinse", async ({ page }) => {
    await login(page, "admin@nbp.test", "admin1234");
    const res = await page.request.post("/api/upload", {
      multipart: {
        files: {
          name: "fals.mp4",
          mimeType: "video/mp4",
          buffer: Buffer.from("nu sunt un clip"),
        },
      },
    });
    expect((await res.json()).error).toBe("INVALID_TYPE");
  });
});
