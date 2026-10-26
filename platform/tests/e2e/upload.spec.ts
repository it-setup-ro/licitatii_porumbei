import { test, expect } from "@playwright/test";
import path from "path";
import { login, deschidePorumbel } from "./helpers";

const FIXTURE = path.join(__dirname, "fixtures", "test-pigeon.png");

test.describe("Upload poze de pe calculator (formular listare)", () => {
  test("vanzatorul urca o poza, vede preview-ul si o poate sterge", async ({ page }) => {
    await login(page, "seller@nbp.test", "seller1234");
    await page.goto("/ro/sell");

    // butonul de browse exista; input-ul de fisiere primeste fixture-ul
    const picker = page.getByTestId("sf-photos-picker");
    await expect(picker.getByTestId("media-choose-files")).toBeVisible();
    await picker.getByTestId("media-input-files").setInputFiles(FIXTURE);

    // apare preview-ul cu URL servit de /api/files/
    const preview = picker.getByTestId("media-previews").locator("img");
    await expect(preview).toHaveCount(1);
    const src = await preview.getAttribute("src");
    expect(src).toMatch(/^\/api\/files\/[a-z0-9-]+\.png$/);

    // fisierul chiar se serveste (200 + content-type corect)
    const res = await page.request.get(src!);
    expect(res.status()).toBe(200);
    expect(res.headers()["content-type"]).toBe("image/png");

    // stergerea din preview functioneaza
    await picker.getByTestId("media-remove").click();
    await expect(picker.getByTestId("media-previews")).toHaveCount(0);
  });

  test("mai multe poze alese deodată urcă toate; una greșită nu le oprește pe celelalte", async ({ page }) => {
    await login(page, "seller@nbp.test", "seller1234");
    await page.goto("/ro/sell");

    const picker = page.getByTestId("sf-photos-picker");
    await expect(picker.getByTestId("media-multi-hint")).toContainText("mai multe deodată");
    // Playwright nu amestecă fișiere de pe disc cu conținut din memorie: toate din memorie
    const png = (await import("fs")).readFileSync(FIXTURE);
    await picker.getByTestId("media-input-files").setInputFiles([
      { name: "poza-1.png", mimeType: "image/png", buffer: png },
      { name: "nu-e-poza.txt", mimeType: "text/plain", buffer: Buffer.from("text, nu imagine") },
      { name: "poza-2.png", mimeType: "image/png", buffer: png },
    ]);

    // cele două poze bune apar, iar mesajul spune exact care fișier n-a mers
    await expect(picker.getByTestId("media-previews").locator("img")).toHaveCount(2);
    await expect(picker.getByTestId("media-error")).toContainText("Nu s-au putut urca 1 din 3");
    await expect(picker.getByTestId("media-error")).toContainText("nu-e-poza.txt");
  });

  test("poza urcata ajunge pe lotul publicat", async ({ page }) => {
    test.setTimeout(120_000);
    await login(page, "seller@nbp.test", "seller1234");
    await page.goto("/ro/sell");

    await page.getByTestId("sf-ring").fill("RO 2025 888002");
    await page.getByTestId("sf-name").fill("Aripă de Foc");
    const photos = page.getByTestId("sf-photos-picker");
    await photos.getByTestId("media-input-files").setInputFiles(FIXTURE);
    await expect(photos.getByTestId("media-previews").locator("img")).toHaveCount(1);
    await page.getByTestId("sf-start-price").fill("110");
    await page.getByTestId("sell-submit").click();
    await expect(page.getByTestId("sell-success")).toBeVisible();

    // adminul aproba lotul cu start imediat
    const adminCtx = await page.context().browser()!.newContext({ locale: "ro-RO" });
    const admin = await adminCtx.newPage();
    await login(admin, "admin@nbp.test", "admin1234");
    await admin.goto("/ro/admin/lots");
    const row = admin.getByTestId("pending-lot-row").filter({ hasText: "Aripă de Foc" });
    await row.getByTestId("mod-approve").click();
    await expect(admin.getByTestId("pending-lot-row").filter({ hasText: "Aripă de Foc" })).toHaveCount(0);
    await adminCtx.close();

    // poza urcata apare pe pagina publica a lotului
    await deschidePorumbel(page, "Aripă de Foc");
    await page.waitForURL(/\/auctions\/[a-z0-9]+$/);
    const mainImg = page.locator("main img").first();
    await expect(mainImg).toHaveAttribute("src", /^\/api\/files\/[a-z0-9-]+\.png$/);
  });

  test("fisierele non-imagine sunt respinse de server", async ({ page }) => {
    await login(page, "seller@nbp.test", "seller1234");
    // trimitem un "PNG" fals (text cu extensie .png) direct la API
    const res = await page.request.post("/api/upload", {
      multipart: {
        files: {
          name: "fake.png",
          mimeType: "image/png",
          buffer: Buffer.from("nu sunt o poza reala"),
        },
      },
    });
    const body = await res.json();
    expect(body.ok).toBe(false);
    expect(body.error).toBe("INVALID_TYPE");
  });

  test("o poza mare se micsoreaza singura la incarcare", async ({ page }) => {
    /*
      Clientul a urcat un fundal de 2,3 MB si pagina se incarca greu pe telefon.
      Acum platforma micsoreaza singura, pe server: latura lunga la 2560 px, iar
      o fotografie fara transparenta se tine in JPEG, nu in PNG.
    */
    const sharp = (await import("sharp")).default;
    const mare = await sharp({
      create: { width: 3000, height: 1800, channels: 3, background: { r: 180, g: 120, b: 60 } },
    })
      .png()
      .toBuffer();
    expect((await sharp(mare).metadata()).width).toBe(3000);

    await login(page, "admin@nbp.test", "admin1234");
    const res = await page.request.post("/api/upload", {
      multipart: { files: { name: "fundal.png", mimeType: "image/png", buffer: mare } },
    });
    const body = await res.json();
    expect(body.ok, JSON.stringify(body)).toBe(true);

    // PNG-ul unei fotografii devine JPEG, iar poza intra in 2560 px
    const url = body.files[0].url as string;
    expect(url).toMatch(/\.jpg$/);

    const servit = await page.request.get(url);
    expect(servit.status()).toBe(200);
    expect(servit.headers()["content-type"]).toBe("image/jpeg");
    const meta = await sharp(await servit.body()).metadata();
    expect(meta.width).toBe(2560);
  });

  test("cumparatorii nu pot urca fisiere (doar vanzatorii aprobati)", async ({ page }) => {
    await login(page, "buyer1@nbp.test", "buyer1234");
    const res = await page.request.post("/api/upload", {
      multipart: {
        files: { name: "x.png", mimeType: "image/png", buffer: Buffer.from([0x89, 0x50]) },
      },
    });
    expect(res.status()).toBe(403);
  });
});
