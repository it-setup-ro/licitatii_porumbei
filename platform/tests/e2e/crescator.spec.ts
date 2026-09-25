import { test, expect, type Page, type APIRequestContext } from "@playwright/test";
import { login, asteaptaFormularViu } from "./helpers";

/**
 * Contul de crescător: administratorul îl face din fișa crescătorului, omul își
 * pune parola din link, apoi își vede licitațiile, vânzările și decontul și își
 * scrie singur fișa. Nimic din administrare nu-i este deschis.
 */

const uid = () => `${Date.now()}${Math.floor(Math.random() * 1000)}`;
const PAROLA = "CrescatorTest2026!";

async function post(req: APIRequestContext, url: string, data?: unknown) {
  const res = await req.post(url, data === undefined ? {} : { data });
  return { status: res.status(), body: await res.json() };
}

/** Un crescător cu o licitație, un lot și un porumbel — ca la administrare. */
async function crescatorCuLicitatie(page: Page) {
  const id = uid();
  const nume = `Crescător Test ${id}`;
  const b = await post(page.request, "/api/admin/breeders", {
    name: nume,
    city: "Arad",
    country: "România",
  });
  expect(b.body.ok, JSON.stringify(b.body)).toBe(true);

  const s = await post(page.request, "/api/admin/sales", {
    breederId: b.body.id,
    slug: `cont-crescator-${id}`,
    titleRo: `Licitația ${nume}`,
    titleEn: `Auction ${nume}`,
    commissionPercent: 11,
  });
  expect(s.body.ok, JSON.stringify(s.body)).toBe(true);

  const acum = Date.now();
  const l = await post(page.request, `/api/admin/sales/${s.body.id}/lots`, {
    startsAt: new Date(acum + 60 * 60_000).toISOString(),
    endsAt: new Date(acum + 120 * 60_000).toISOString(),
  });
  expect(l.body.ok, JSON.stringify(l.body)).toBe(true);

  const p = await post(page.request, `/api/admin/sale-lots/${l.body.id}/pigeons`, {
    ringNumber: `RO 2025 ${id.slice(-6)}`,
    birthYear: 2025,
    sex: "M",
    name: `Porumbel ${id}`,
    startPriceCents: 20_000,
  });
  expect(p.body.ok, JSON.stringify(p.body)).toBe(true);

  return { breederId: b.body.id as string, nume, titlu: `Licitația ${nume}` };
}

/** Linkul de punere a parolei, din jurnalul de e-mailuri. */
async function linkDinEmail(page: Page, email: string) {
  await page.goto("/ro/admin/emails");
  const row = page.getByTestId("email-row").filter({ hasText: email }).first();
  await expect(row).toBeVisible();
  await row.locator("summary").click();
  const body = await row.getByTestId("email-body").innerText();
  const m = body.match(/https?:\/\/\S+\/reset-password\?token=[a-f0-9]+/);
  expect(m, "linkul lipsește din invitație").not.toBeNull();
  return m![0].replace(/^https?:\/\/[^/]+/, "");
}

test.describe("Contul de crescător", () => {
  test("invitație → parolă → cele patru pagini → fișa scrisă de el", async ({ browser }) => {
    test.setTimeout(180_000);
    const ctxA = await browser.newContext({ locale: "ro-RO" });
    const adminPage = await ctxA.newPage();
    await login(adminPage, "admin@nbp.test", "admin1234");

    const { breederId, nume, titlu } = await crescatorCuLicitatie(adminPage);
    const email = `crescator-${uid()}@e2e.test`;

    // 1) administratorul îi face cont din fișă
    await adminPage.goto("/ro/admin/breeders");
    const rand = adminPage.getByRole("row").filter({ hasText: nume });
    await rand.getByTestId("breeder-account-new").click();
    await rand.getByTestId("breeder-account-input").fill(email);
    const raspuns = adminPage.waitForResponse(
      (r) => r.url().includes(`/breeders/${breederId}/account`) && r.request().method() === "POST"
    );
    await rand.getByTestId("breeder-account-send").click();
    expect((await (await raspuns).json()).ok).toBe(true);
    await expect(adminPage.getByTestId("breeder-account-email").filter({ hasText: email })).toBeVisible();

    // 2) omul își pune parola din linkul primit
    const link = await linkDinEmail(adminPage, email);
    const ctxB = await browser.newContext({ locale: "ro-RO" });
    const page = await ctxB.newPage();
    await page.goto(link);
    await page.getByTestId("reset-password").fill(PAROLA);
    await page.getByTestId("reset-confirm").fill(PAROLA);
    await page.getByTestId("reset-submit").click();
    await expect(page.getByTestId("reset-done")).toBeVisible();

    // 3) intră și vede licitația lui
    await login(page, email, PAROLA);
    await page.goto("/ro/breeder");
    await expect(page.getByTestId("breeder-sales-list")).toContainText(titlu);
    await expect(page.getByTestId("breeder-sales-list")).toContainText("Comision: 11%");
    await expect(page.getByTestId("breeder-sales-list")).toContainText("Lotul 1");

    // linkul din caseta de cont, doar pentru el
    await expect(page.getByTestId("user-menu")).toBeVisible();
    await page.getByTestId("user-menu").click();
    await expect(page.getByTestId("menu-breeder")).toBeVisible();

    // 4) vânzările și decontul — încă goale, dar paginile lui
    await page.goto("/ro/breeder/sales");
    await expect(page.getByTestId("breeder-no-sales")).toBeVisible();
    await page.goto("/ro/breeder/settlement");
    await expect(page.getByTestId("breeder-no-settlement")).toBeVisible();

    // 5) fișa: alias nou și localitate nouă, scrise de el
    await page.goto("/ro/breeder/profile");
    await expect(page.getByTestId("breeder-name")).toContainText(nume);
    await asteaptaFormularViu(page, "breeder-profile-form");
    const alias = `Alias${uid().slice(-6)}`;
    await page.getByTestId("breeder-alias").fill(alias);
    await page.getByTestId("breeder-city").fill("Timișoara");
    await page.getByTestId("breeder-story-ro").fill("Cresc porumbei de douăzeci de ani.");
    const salvare = page.waitForResponse(
      (r) => r.url().includes("/api/breeder/profile") && r.request().method() === "POST"
    );
    await page.getByTestId("breeder-profile-save").click();
    expect((await (await salvare).json()).ok).toBe(true);
    await expect(page.getByTestId("breeder-profile-saved")).toBeVisible();

    await page.reload();
    await expect(page.getByTestId("breeder-alias")).toHaveValue(alias);
    await expect(page.getByTestId("breeder-city")).toHaveValue("Timișoara");

    // 6) nu are voie în administrare
    const scriere = await post(page.request, "/api/admin/breeders", { name: "Nu se poate" });
    expect(scriere.status).toBe(403);

    // 7) administratorul dezleagă contul: paginile nu mai sunt ale lui
    const dez = await adminPage.request.delete(`/api/admin/breeders/${breederId}/account`);
    expect((await dez.json()).ok).toBe(true);
    await page.goto("/ro/breeder");
    await expect(page).toHaveURL(/\/ro\/account$/);

    await ctxA.close();
    await ctxB.close();
  });

  test("un cumpărător fără fișă nu intră pe paginile crescătorului", async ({ page }) => {
    await login(page, "buyer1@nbp.test", "buyer1234");
    await page.goto("/ro/breeder");
    await expect(page).toHaveURL(/\/ro\/account$/);

    const res = await post(page.request, "/api/breeder/profile", { alias: "Oricine" });
    expect(res.status).toBe(403);
  });

  test("aliasul luat de altcineva e refuzat cu mesaj pe câmp", async ({ browser }) => {
    test.setTimeout(120_000);
    const ctx = await browser.newContext({ locale: "ro-RO" });
    const adminPage = await ctx.newPage();
    await login(adminPage, "admin@nbp.test", "admin1234");
    const { breederId } = await crescatorCuLicitatie(adminPage);
    const email = `alias-${uid()}@e2e.test`;
    const inv = await post(adminPage.request, `/api/admin/breeders/${breederId}/account`, { email });
    expect(inv.body.ok, JSON.stringify(inv.body)).toBe(true);

    const link = await linkDinEmail(adminPage, email);
    const page = await (await browser.newContext({ locale: "ro-RO" })).newPage();
    await page.goto(link);
    await page.getByTestId("reset-password").fill(PAROLA);
    await page.getByTestId("reset-confirm").fill(PAROLA);
    await page.getByTestId("reset-submit").click();
    await expect(page.getByTestId("reset-done")).toBeVisible();
    await login(page, email, PAROLA);

    // „MihaiP" e aliasul unui cont din baza de test
    const res = await post(page.request, "/api/breeder/profile", { alias: "MihaiP" });
    expect(res.status).toBe(422);
    expect(res.body.fields?.alias).toBeTruthy();

    await ctx.close();
  });
});
