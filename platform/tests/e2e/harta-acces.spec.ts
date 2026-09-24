import { test, expect, type Page } from "@playwright/test";
import { execSync } from "child_process";
import path from "path";
import { login } from "./helpers";
import { TEST_DATABASE_URL } from "../../playwright.config";

/**
 * Harta de acces: fiecare pagină a site-ului, pentru fiecare fel de om.
 *
 * Daniel: „fă un set de teste complet pentru toate elementele (și ca admin, și
 * ca anonim, și ca client cu cont)". Aici e scheletul: se deschide fiecare
 * pagină și se verifică cine are voie unde. O pagină care crapă, sau una de
 * administrare care se deschide la cine nu trebuie, se vede imediat.
 *
 * Verificările amănunțite pe butoane stau în celelalte fișiere; aici se prinde
 * ce e rupt de tot.
 */

function idsDinBaza(): Record<string, string | null> {
  const root = path.resolve(__dirname, "../..");
  const out = execSync("npx tsx tests/e2e/fixtures/ids.ts", {
    cwd: root,
    env: { ...process.env, DATABASE_URL: TEST_DATABASE_URL },
  }).toString();
  const linie = out.split(/\r?\n/).filter((l) => l.trim().startsWith("{")).pop()!;
  return JSON.parse(linie);
}

const ids = idsDinBaza();

/** Paginile deschise oricui. */
const PUBLICE = [
  "/ro",
  "/ro/auctions",
  "/ro/fixed-price",
  "/ro/sellers",
  "/ro/articles",
  "/ro/contests",
  "/ro/products",
  "/ro/cart",
  "/ro/help",
  "/ro/how-it-works",
  "/ro/about",
  "/ro/contact",
  "/ro/shipping-agents",
  "/ro/login",
  "/ro/register",
  "/ro/forgot-password",
  "/ro/articles/propose",
  ...(ids.auctionId ? [`/ro/auctions/${ids.auctionId}`] : []),
  ...(ids.articleSlug ? [`/ro/articles/${ids.articleSlug}`] : []),
  ...(ids.productSlug ? [`/ro/products/${ids.productSlug}`] : []),
  ...(ids.saleSlug ? [`/ro/sales/${ids.saleSlug}`] : []),
  ...(ids.contestSlug ? [`/ro/contests/${ids.contestSlug}`] : []),
  ...(ids.breederId ? [`/ro/sellers/${ids.breederId}`] : []),
  ...(ids.infoSlug ? [`/ro/info/${ids.infoSlug}`] : []),
];

/** Paginile contului: cer autentificare. */
const ALE_CONTULUI = [
  "/ro/account",
  "/ro/account/bids",
  "/ro/account/watchlist",
  "/ro/account/purchases",
  "/ro/account/notifications",
  "/ro/account/shop-orders",
  "/ro/account/lots",
  "/ro/account/sales",
];

/** Toate paginile de administrare. */
const ALE_ADMINULUI = [
  "/ro/admin",
  "/ro/admin/accounts",
  "/ro/admin/admins",
  "/ro/admin/agents",
  "/ro/admin/alerts",
  "/ro/admin/articles",
  "/ro/admin/auction-requests",
  "/ro/admin/audit",
  "/ro/admin/breeders",
  "/ro/admin/content",
  "/ro/admin/contests",
  "/ro/admin/emails",
  "/ro/admin/faq",
  "/ro/admin/fixed-price",
  "/ro/admin/links",
  "/ro/admin/lots",
  "/ro/admin/messages",
  "/ro/admin/newsletter",
  "/ro/admin/orders",
  "/ro/admin/products",
  "/ro/admin/reviews",
  "/ro/admin/sales",
  "/ro/admin/sellers",
  "/ro/admin/settings",
  "/ro/admin/settlements",
  "/ro/admin/shop-orders",
  "/ro/admin/transactions",
  "/ro/admin/users",
  ...(ids.saleId ? [`/ro/admin/sales/${ids.saleId}`] : []),
];

/** Deschide pagina și spune ce s-a întâmplat, fără să pice testul. */
async function deschide(page: Page, cale: string) {
  const raspuns = await page.goto(cale, { waitUntil: "domcontentloaded" });
  return { status: raspuns?.status() ?? 0, url: page.url() };
}

/** O pagină care s-a rupt: eroarea Next se vede în corpul paginii. */
async function areEroare(page: Page) {
  const text = (await page.locator("body").innerText().catch(() => "")).slice(0, 4000);
  return /Application error|Internal Server Error|Unhandled Runtime Error|500/i.test(text);
}

test.describe("Harta de acces — vizitator nelogat", () => {
  test("toate paginile publice se deschid", async ({ page }) => {
    test.setTimeout(240_000);
    const rupte: string[] = [];
    for (const cale of PUBLICE) {
      const { status } = await deschide(page, cale);
      if (status !== 200 || (await areEroare(page))) rupte.push(`${cale} → ${status}`);
    }
    expect(rupte, `pagini publice care nu se deschid: ${rupte.join(", ")}`).toEqual([]);
  });

  test("paginile contului îl trimit la autentificare", async ({ page }) => {
    test.setTimeout(180_000);
    const gresite: string[] = [];
    for (const cale of ALE_CONTULUI) {
      await deschide(page, cale);
      if (!/\/login/.test(page.url())) gresite.push(`${cale} → ${page.url()}`);
    }
    expect(gresite, `pagini de cont deschise fără autentificare: ${gresite.join(", ")}`).toEqual([]);
  });

  test("nicio pagină de administrare nu se deschide", async ({ page }) => {
    test.setTimeout(240_000);
    const scapate: string[] = [];
    for (const cale of ALE_ADMINULUI) {
      await deschide(page, cale);
      // trebuie să ajungă la autentificare, nu în panou
      if (/\/admin/.test(page.url()) && !/\/login/.test(page.url())) scapate.push(cale);
    }
    expect(scapate, `administrare deschisă unui vizitator: ${scapate.join(", ")}`).toEqual([]);
  });
});

test.describe("Harta de acces — cumpărător cu cont", () => {
  test("își vede paginile de cont", async ({ page }) => {
    test.setTimeout(240_000);
    await login(page, "buyer1@nbp.test", "buyer1234");
    const rupte: string[] = [];
    for (const cale of ALE_CONTULUI) {
      const { status } = await deschide(page, cale);
      if (status !== 200 || (await areEroare(page))) rupte.push(`${cale} → ${status}`);
      if (/\/login/.test(page.url())) rupte.push(`${cale} → l-a trimis la autentificare`);
    }
    expect(rupte, `pagini de cont care nu merg: ${rupte.join(", ")}`).toEqual([]);
  });

  test("nu intră în administrare", async ({ page }) => {
    test.setTimeout(240_000);
    await login(page, "buyer1@nbp.test", "buyer1234");
    const scapate: string[] = [];
    for (const cale of ALE_ADMINULUI) {
      await deschide(page, cale);
      const text = await page.locator("body").innerText().catch(() => "");
      const inPanou = /\/admin/.test(page.url()) && !/\/login/.test(page.url());
      // „în panou" se vede după navigația de administrare, nu doar după adresă
      if (inPanou && /Panou|Setări|Moderare/.test(text)) scapate.push(cale);
    }
    expect(scapate, `administrare deschisă unui cumpărător: ${scapate.join(", ")}`).toEqual([]);
  });
});

test.describe("Harta de acces — administrator", () => {
  test("toate paginile de administrare se deschid", async ({ page }) => {
    test.setTimeout(300_000);
    await login(page, "admin@nbp.test", "admin1234");
    const rupte: string[] = [];
    for (const cale of ALE_ADMINULUI) {
      const { status } = await deschide(page, cale);
      if (status !== 200 || (await areEroare(page))) rupte.push(`${cale} → ${status}`);
    }
    expect(rupte, `pagini de administrare rupte: ${rupte.join(", ")}`).toEqual([]);
  });

  test("fiecare pagină de administrare are un titlu, nu doar un ecran gol", async ({ page }) => {
    test.setTimeout(300_000);
    await login(page, "admin@nbp.test", "admin1234");
    const fara: string[] = [];
    for (const cale of ALE_ADMINULUI) {
      await deschide(page, cale);
      const titlu = await page.locator("h1").first().innerText().catch(() => "");
      if (titlu.trim().length < 3) fara.push(cale);
    }
    expect(fara, `pagini fără titlu: ${fara.join(", ")}`).toEqual([]);
  });
});
