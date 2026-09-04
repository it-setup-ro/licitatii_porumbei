import { test, expect, type Page } from "@playwright/test";
import { login } from "./helpers";

/**
 * Modificarea unui lot de către crescător.
 *
 * Regula testată: cine a licitat a licitat pe ce a văzut. Până la prima ofertă
 * se poate schimba orice; după, doar adăugiri.
 */

/** Listează un lot nou și întoarce numele lui (unic, ca să nu se încurce). */
async function listeazaLot(page: Page, sufix: string) {
  const nume = `Edit ${sufix}`;
  await page.goto("/ro/sell");
  await page.getByTestId("sf-ring").fill(`RO 2025 ${sufix}`);
  await page.getByTestId("sf-year").fill("2025");
  await page.getByTestId("sf-name").fill(nume);
  await page.getByTestId("sf-tagline").fill("Rând scurt inițial");
  await page.getByTestId("sf-desc-ro").fill("Descriere inițială.");
  await page.getByTestId("sf-start-price").fill("120");
  await page.getByTestId("sell-submit").click();
  await expect(page.getByTestId("sell-success")).toBeVisible();
  return nume;
}

async function aproba(page: Page, nume: string) {
  const ctx = await page.context().browser()!.newContext({ locale: "ro-RO" });
  const admin = await ctx.newPage();
  await login(admin, "admin@nbp.test", "admin1234");
  await admin.goto("/ro/admin/lots");
  const row = admin.getByTestId("pending-lot-row").filter({ hasText: nume });
  await expect(row).toBeVisible();
  await row.getByTestId("mod-approve").click();
  await expect(admin.getByTestId("pending-lot-row").filter({ hasText: nume })).toHaveCount(0);
  await ctx.close();
}

/** Deschide „Editează" pentru lotul cu numele dat, din Loturile mele. */
async function deschideEditarea(page: Page, nume: string) {
  await page.goto("/ro/account/lots");
  const row = page.getByTestId("my-lot-row").filter({ hasText: nume });
  await expect(row).toBeVisible();
  await row.getByTestId("my-lot-edit").click();
  await expect(page).toHaveURL(/\/account\/lots\/[a-z0-9]+\/edit$/);
}

test.describe("Lot fără oferte — se poate schimba tot", () => {
  test("crescătorul corectează datele și se văd pe pagina publică", async ({ page }) => {
    test.setTimeout(120_000);
    await login(page, "seller@nbp.test", "seller1234");
    const nume = await listeazaLot(page, "811001");

    await deschideEditarea(page, nume);
    await expect(page.getByTestId("edit-scope-hint")).toBeVisible();
    await expect(page.getByTestId("edit-ring")).toHaveValue("RO 2025 811001");

    await page.getByTestId("edit-name").fill(`${nume} corectat`);
    await page.getByTestId("edit-tagline").fill("Rând scurt corectat");
    await page.getByTestId("edit-desc").fill("Descriere corectată.");
    await page.getByTestId("edit-bred-by").fill("Crescătoria de Test");
    await page.getByTestId("edit-submit").click();
    await expect(page.getByTestId("edit-saved")).toBeVisible();

    await aproba(page, `${nume} corectat`);

    await page.goto("/ro/auctions");
    await page.getByTestId("auction-card").filter({ hasText: `${nume} corectat` }).click();
    await page.waitForURL(/\/auctions\/[a-z0-9]+$/);
    await expect(page.getByTestId("lot-title")).toHaveText(`${nume} corectat`);
    await expect(page.getByTestId("lot-tagline")).toContainText("corectat");
    await expect(page.getByTestId("fact-bred-by")).toContainText("Crescătoria de Test");
  });

  test("schimbarea seriei pe un lot aprobat îl trimite înapoi la aprobare", async ({ page }) => {
    test.setTimeout(120_000);
    await login(page, "seller@nbp.test", "seller1234");
    const nume = await listeazaLot(page, "811002");
    await aproba(page, nume);

    // lotul e acum LIVE, fara oferte
    await deschideEditarea(page, nume);
    await page.getByTestId("edit-ring").fill("RO 2025 811999");
    await page.getByTestId("edit-submit").click();
    await expect(page.getByTestId("edit-saved")).toContainText("aprobare");

    // a iesit din public si asteapta din nou moderarea
    await page.goto("/ro/account/lots");
    const row = page.getByTestId("my-lot-row").filter({ hasText: nume });
    await expect(row.getByTestId("lot-status")).toContainText("⏳");
  });

  test("o corectură de text NU oprește licitația", async ({ page }) => {
    test.setTimeout(120_000);
    await login(page, "seller@nbp.test", "seller1234");
    const nume = await listeazaLot(page, "811003");
    await aproba(page, nume);

    await deschideEditarea(page, nume);
    await page.getByTestId("edit-desc").fill("Doar o virgulă în plus.");
    await page.getByTestId("edit-submit").click();
    await expect(page.getByTestId("edit-saved")).toBeVisible();
    await expect(page.getByTestId("edit-saved")).not.toContainText("aprobare");

    await page.goto("/ro/account/lots");
    const row = page.getByTestId("my-lot-row").filter({ hasText: nume });
    await expect(row.getByTestId("lot-status")).not.toContainText("⏳");
  });
});

test.describe("Lot cu oferte — doar adăugiri", () => {
  test("formularul se restrânge, iar seria și prețul dispar", async ({ page, browser }) => {
    test.setTimeout(120_000);
    await login(page, "seller@nbp.test", "seller1234");
    const nume = await listeazaLot(page, "811004");
    await aproba(page, nume);

    // cineva liciteaza — prin API, ca sa fim siguri ca oferta chiar a intrat
    const ctx = await browser.newContext({ locale: "ro-RO" });
    const buyer = await ctx.newPage();
    await login(buyer, "buyer1@nbp.test", "buyer1234");
    await buyer.goto("/ro/auctions");
    await buyer.getByTestId("auction-card").filter({ hasText: nume }).click();
    await buyer.waitForURL(/\/auctions\/[a-z0-9]+$/);
    const url = buyer.url();
    const bid = await buyer.request.post(`/api/auctions/${url.split("/").pop()}/bid`, {
      data: { maxCents: 20_000 },
    });
    expect((await bid.json()).ok, "oferta nu a intrat").toBe(true);
    await ctx.close();

    await deschideEditarea(page, nume);
    await expect(page.getByTestId("edit-scope-hint")).toContainText("oferte");

    // campurile care conteaza nu mai exista in formular
    await expect(page.getByTestId("edit-ring")).toHaveCount(0);
    await expect(page.getByTestId("edit-start-price")).toHaveCount(0);
    await expect(page.getByTestId("edit-sex")).toHaveCount(0);
    // adaugirile, da
    await expect(page.getByTestId("add-media-picker")).toBeVisible();
    await expect(page.getByTestId("edit-note")).toBeVisible();

    // completarea se adauga la descriere, nu o inlocuieste
    await page.getByTestId("edit-note").fill("A mai câștigat o cursă între timp.");
    await page.getByTestId("edit-submit").click();
    await expect(page.getByTestId("edit-saved")).toBeVisible();

    await page.goto(url);
    const desc = page.getByTestId("lot-description");
    await expect(desc).toContainText("Descriere inițială.");
    await expect(desc).toContainText("Completare");
    await expect(desc).toContainText("A mai câștigat o cursă");
  });

  test("serverul refuză schimbarea prețului chiar dacă cererea ocolește formularul", async ({
    page,
    browser,
  }) => {
    test.setTimeout(120_000);
    await login(page, "seller@nbp.test", "seller1234");
    const nume = await listeazaLot(page, "811005");
    await aproba(page, nume);

    const ctx = await browser.newContext({ locale: "ro-RO" });
    const buyer = await ctx.newPage();
    await login(buyer, "buyer2@nbp.test", "buyer1234");
    await buyer.goto("/ro/auctions");
    await buyer.getByTestId("auction-card").filter({ hasText: nume }).click();
    await buyer.waitForURL(/\/auctions\/[a-z0-9]+$/);
    const id = buyer.url().split("/").pop()!;
    const bid = await buyer.request.post(`/api/auctions/${id}/bid`, {
      data: { maxCents: 20_000 },
    });
    expect((await bid.json()).ok, "oferta nu a intrat").toBe(true);
    await ctx.close();

    // trimitem direct catre API forma „completa", care ar schimba pretul
    const res = await page.request.post(`/api/lots/${id}`, {
      data: {
        ringNumber: "RO 2025 000000",
        birthYear: 2020,
        sex: "F",
        name: "Furat",
        startPriceCents: 1_000_00,
        media: [],
        results: [],
      },
    });
    // schema de „adaugiri" nu recunoaste campurile astea
    expect(res.status()).toBe(422);

    // lotul a ramas neatins
    await page.goto(`/ro/auctions/${id}`);
    await expect(page.getByTestId("lot-title")).toHaveText(nume);
    await expect(page.getByTestId("fact-ring")).toContainText("RO 2025 811005");
  });
});

test.describe("Cine are voie", () => {
  test("un alt vânzător nu poate modifica lotul altcuiva", async ({ page }) => {
    const html = await (await page.request.get("/ro/auctions")).text();
    const id = html.match(/\/ro\/auctions\/([a-z0-9]{20,})/)![1];

    await login(page, "buyer1@nbp.test", "buyer1234");
    const res = await page.request.post(`/api/lots/${id}`, { data: { note: "hopa" } });
    expect(res.status()).toBe(403);
  });

  test("adminul poate corecta orice lot, din moderare", async ({ page }) => {
    test.setTimeout(120_000);
    await login(page, "admin@nbp.test", "admin1234");
    await page.goto("/ro/admin/lots");

    const row = page.getByTestId("pending-lot-row").first();
    if ((await row.count()) === 0) test.skip();
    await row.getByTestId("admin-lot-edit").click();
    await expect(page).toHaveURL(/\/account\/lots\/[a-z0-9]+\/edit$/);
    await expect(page.getByTestId("edit-scope-hint")).toContainText("administrator");
    await expect(page.getByTestId("edit-ring")).toBeVisible();
  });

  test("un lot închis nu se mai poate modifica", async ({ page }) => {
    await login(page, "seller@nbp.test", "seller1234");
    await page.goto("/ro/account/lots");

    // in datele demo, vanzatorul are un lot deja inchis
    const inchis = page.getByTestId("my-lot-row").filter({ hasText: "Închisă" }).first();
    await expect(inchis).toBeVisible();

    // nu are buton de editare
    await expect(inchis.getByTestId("my-lot-edit")).toHaveCount(0);

    // si nici pe cale ocolita
    const href = await inchis.locator("a").first().getAttribute("href");
    const id = href!.split("/").pop()!;
    const res = await page.request.post(`/api/lots/${id}`, { data: { note: "prea tarziu" } });
    expect(res.status()).toBe(400);
    expect((await res.json()).error).toBe("LOT_LOCKED");
  });
});
