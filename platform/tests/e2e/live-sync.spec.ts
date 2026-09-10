import { test, expect, type Page } from "@playwright/test";
import { login } from "./helpers";

/**
 * Sincronizarea între două ecrane deschise pe același lot.
 *
 * Bug-ul reparat: pe fluxul live pleca prețul nou, dar nu și suma minimă
 * următoare. Al doilea ecran arăta prețul corect și continua să propună suma
 * veche — iar cine o trimitea primea „ofertă prea mică", fără să înțeleagă de ce.
 *
 * Fiecare test își face lotul lui. Pe un lot din datele demo, rezultatul ar
 * depinde de cine a licitat înaintea noastră în restul suitei.
 */

const PAROLA_NOUA = "TestParola2026!";

/** Cont proaspăt — nu conduce nimic, deci vede minimul „de rând". */
async function contNou(page: Page) {
  const email = `live-${Date.now()}-${Math.floor(Math.random() * 1e6)}@e2e.test`;
  const res = await page.request.post("/api/auth/register", {
    data: { email, password: PAROLA_NOUA, name: "Test Live" },
  });
  expect(res.status()).toBe(200);
  await page.request.post("/api/auth/logout");
  return email;
}

/** Listează un lot, îl aprobă și îl întoarce activ. */
async function lotActiv(page: Page, sufix: string) {
  const nume = `Live ${sufix}`;
  await login(page, "seller@nbp.test", "seller1234");
  await page.goto("/ro/sell");
  await page.getByTestId("sf-ring").fill(`RO 2025 ${sufix}`);
  await page.getByTestId("sf-year").fill("2025");
  await page.getByTestId("sf-name").fill(nume);
  await page.getByTestId("sf-start-price").fill("120");
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

/** Deschide lotul ca un anumit utilizator. */
async function deschide(page: Page, id: string, email: string, parola: string) {
  await login(page, email, parola);
  await page.goto(`/ro/auctions/${id}`);
  await expect(page.getByTestId("bid-panel")).toBeVisible();
}

/** Suma din rândul „Oferta minimă: …", în cenți. */
async function minimAfisat(page: Page) {
  const text = await page.getByTestId("bid-use-minimum").innerText();
  const n = text
    .replace(/[^\d,.]/g, "")
    .replace(/\.(?=\d{3})/g, "")
    .replace(",", ".");
  return Math.round(Number(n) * 100);
}

test.describe("Două ecrane pe același lot", () => {
  test("când unul licitează, celălalt primește și prețul, și noua sumă minimă", async ({
    browser,
  }) => {
    test.setTimeout(150_000);

    const ctxS = await browser.newContext({ locale: "ro-RO" });
    const setup = await ctxS.newPage();
    const { id } = await lotActiv(setup, "912001");

    // O primă ofertă, ca lotul să aibă deja un lider: prima ofertă din viața
    // unui lot rămâne la prețul de pornire, deci prețul vizibil nu s-ar mișca.
    const ctxC = await browser.newContext({ locale: "ro-RO" });
    const primul = await ctxC.newPage();
    await deschide(primul, id, "buyer2@nbp.test", "buyer1234");
    const start = await primul.request.post(`/api/auctions/${id}/bid`, {
      data: { maxCents: 12_000 },
    });
    expect((await start.json()).ok).toBe(true);
    await ctxC.close();

    const ctxA = await browser.newContext({ locale: "ro-RO" });
    const ctxB = await browser.newContext({ locale: "ro-RO" });
    const telefon = await ctxA.newPage();
    const calculator = await ctxB.newPage();

    await calculator.goto("/ro");
    const observator = await contNou(calculator);

    await deschide(telefon, id, "buyer1@nbp.test", "buyer1234");
    await deschide(calculator, id, observator, PAROLA_NOUA);

    const pretInainte = await calculator.getByTestId("current-price").innerText();
    const minimInainte = await minimAfisat(calculator);

    // „telefonul" licitează exact suma pe care o propune platforma
    const res = await telefon.request.post(`/api/auctions/${id}/bid`, {
      data: { maxCents: minimInainte },
    });
    const plasata = await res.json();
    expect(plasata.ok, `oferta respinsă: ${JSON.stringify(plasata)}`).toBe(true);

    // „calculatorul" se actualizează singur, fără reîncărcare
    await expect(calculator.getByTestId("current-price")).not.toHaveText(pretInainte, {
      timeout: 15_000,
    });

    await expect(async () => {
      expect(await minimAfisat(calculator), "suma minimă a rămas cea veche").toBeGreaterThan(
        minimInainte
      );
    }).toPass({ timeout: 10_000 });

    // iar suma propusă chiar e acceptată de server
    const minimDupa = await minimAfisat(calculator);
    const aDoua = await calculator.request.post(`/api/auctions/${id}/bid`, {
      data: { maxCents: minimDupa },
    });
    const out = await aDoua.json();
    expect(out.ok, `serverul a refuzat suma propusă: ${JSON.stringify(out)}`).toBe(true);

    await ctxA.close();
    await ctxB.close();
    await ctxS.close();
  });

  test("apăsarea sumei minime o pune în câmp", async ({ page, browser }) => {
    test.setTimeout(120_000);
    const ctxS = await browser.newContext({ locale: "ro-RO" });
    const setup = await ctxS.newPage();
    const { id } = await lotActiv(setup, "912002");
    await ctxS.close();

    await deschide(page, id, "buyer1@nbp.test", "buyer1234");
    await expect(page.getByTestId("bid-input")).toHaveValue("");
    await page.getByTestId("bid-use-minimum").click();

    const valoare = Number(await page.getByTestId("bid-input").inputValue());
    expect(valoare).toBeGreaterThan(0);
    expect(Math.round(valoare * 100)).toBe(await minimAfisat(page));
  });

  test("răspunsul propriei oferte aduce noua sumă minimă", async ({ page, browser }) => {
    test.setTimeout(120_000);
    const ctxS = await browser.newContext({ locale: "ro-RO" });
    const setup = await ctxS.newPage();
    const { id } = await lotActiv(setup, "912003");
    await ctxS.close();

    await deschide(page, id, "buyer1@nbp.test", "buyer1234");
    const minim = await minimAfisat(page);

    const res = await page.request.post(`/api/auctions/${id}/bid`, { data: { maxCents: minim } });
    const out = await res.json();
    expect(out.ok, `oferta respinsă: ${JSON.stringify(out)}`).toBe(true);
    expect(typeof out.minNextCents).toBe("number");
    expect(out.minNextCents).toBeGreaterThan(out.priceCents);
  });

  test("cine conduce vede minimul PROPRIU, peste plafonul lui", async ({ page, browser }) => {
    test.setTimeout(120_000);
    const ctxS = await browser.newContext({ locale: "ro-RO" });
    const setup = await ctxS.newPage();
    const { id } = await lotActiv(setup, "912004");
    await ctxS.close();

    // buyer1 preia conducerea cu un plafon mult peste prețul vizibil
    await deschide(page, id, "buyer1@nbp.test", "buyer1234");
    const primaOferta = await page.request.post(`/api/auctions/${id}/bid`, {
      data: { maxCents: 40_000 },
    });
    expect((await primaOferta.json()).ok).toBe(true);

    await page.reload();
    await expect(page.getByTestId("leading-badge")).toBeVisible();

    // Suma arătată liderului trebuie să fie chiar cea acceptată de server: ca
    // să-și ridice plafonul, trebuie să treacă peste PROPRIUL plafon (400 EUR),
    // nu peste prețul vizibil (120 EUR).
    const afisat = await minimAfisat(page);
    expect(afisat).toBeGreaterThan(40_000);

    const res = await page.request.post(`/api/auctions/${id}/bid`, { data: { maxCents: afisat } });
    const out = await res.json();
    expect(out.ok, `serverul a refuzat suma arătată liderului: ${JSON.stringify(out)}`).toBe(true);
  });
});
