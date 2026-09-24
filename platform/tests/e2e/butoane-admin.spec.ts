import { test, expect } from "@playwright/test";
import { login, asteaptaFormularViu } from "./helpers";
import { execSync } from "child_process";
import path from "path";
import { TEST_DATABASE_URL } from "../../playwright.config";

/** Ce i-a ajuns unei adrese, din jurnalul de e-mailuri. */
function emails(address: string): { subject: string; body: string }[] {
  const root = path.resolve(__dirname, "../..");
  const out = execSync(`npx tsx tests/e2e/fixtures/email-log.ts ${address}`, {
    cwd: root,
    env: { ...process.env, DATABASE_URL: TEST_DATABASE_URL },
  }).toString();
  const line = out.split(/\r?\n/).filter((l) => l.trim().startsWith("[")).pop()!;
  return JSON.parse(line);
}

/**
 * Butoanele din administrare, apăsate pe rând, cu verificarea urmării lor.
 *
 * Daniel: „la admin elemente de administrare… să testăm funcțional toate
 * butoanele și corectitudinea funcționării lor". Ce e deja acoperit în alte
 * fișiere (setări, moderare, linkuri, agenți, concursuri, articole, loturi,
 * plăți, deconturi) nu se repetă aici; aici sunt bucățile rămase descoperite:
 * mesajele de contact, cererile de licitație, comenzile din magazin, paginile
 * de conținut și jurnalul.
 */

const uid = () => `${Date.now()}${Math.floor(Math.random() * 1000)}`;

test.describe("Mesaje din formularul de contact", () => {
  test("un mesaj se marchează rezolvat, se redeschide și se șterge", async ({ page }) => {
    test.setTimeout(150_000);
    const id = uid().slice(-6);
    const subiect = `Mesaj de probă ${id}`;

    // îl trimitem ca un vizitator oarecare
    const trimis = await page.request.post("/api/contact", {
      data: {
        name: `Vizitator ${id}`,
        email: `vizitator-${id}@e2e.test`,
        subject: subiect,
        message: "Bună ziua, aș vrea să știu cum pot licita. Mulțumesc frumos!",
      },
    });
    expect(trimis.status()).toBe(200);

    await login(page, "admin@nbp.test", "admin1234");
    await page.goto("/ro/admin/messages");
    const rand = page.getByTestId("message-row").filter({ hasText: subiect });
    await expect(rand).toBeVisible();

    // „Rezolvat" → butonul devine „Redeschide"
    const actiuni = rand.getByTestId("message-row-actions-toggle");
    await expect(actiuni).toHaveText("Rezolvat");
    await actiuni.click();
    await expect(rand.getByTestId("message-row-actions-toggle")).toHaveText("Redeschide");

    // și înapoi
    await rand.getByTestId("message-row-actions-toggle").click();
    await expect(rand.getByTestId("message-row-actions-toggle")).toHaveText("Rezolvat");

    // ștergere, cu confirmare
    page.once("dialog", (d) => d.accept());
    await rand.getByTestId("message-row-actions-delete").click();
    await expect(page.getByTestId("message-row").filter({ hasText: subiect })).toHaveCount(0);
  });
});

test.describe("Cereri „Vreau să organizez o licitație”", () => {
  test("cererea se marchează rezolvată și se șterge", async ({ page }) => {
    test.setTimeout(150_000);
    const id = uid().slice(-6);
    const nume = `Solicitant ${id}`;

    const trimis = await page.request.post("/api/auction-requests", {
      data: {
        name: nume,
        phone: "0723 111 222",
        email: `solicitant-${id}@e2e.test`,
        place: "Arad, România",
        locale: "ro",
      },
    });
    expect(trimis.status()).toBe(200);

    await login(page, "admin@nbp.test", "admin1234");
    await page.goto("/ro/admin/auction-requests");
    const rand = page.getByTestId("auction-request-row").filter({ hasText: nume });
    await expect(rand).toBeVisible();

    await rand.getByTestId("request-handle").click();
    await expect(rand.getByTestId("request-unhandle")).toBeVisible();

    page.once("dialog", (d) => d.accept());
    await rand.getByTestId("request-row-delete").click();
    await expect(page.getByTestId("auction-request-row").filter({ hasText: nume })).toHaveCount(0);
  });
});

test.describe("Comenzi din magazin", () => {
  test("drumul complet: plătită → expediată → livrată", async ({ page, browser }) => {
    test.setTimeout(180_000);
    const id = uid().slice(-5);

    // un cumpărător face o comandă
    const ctx = await browser.newContext({ locale: "ro-RO" });
    const client = await ctx.newPage();
    await login(client, "buyer2@nbp.test", "buyer1234");
    await client.goto("/ro/products");
    await client.getByTestId("product-card").first().click();
    await client.waitForURL(/\/products\/[^/]+$/);
    const adaugat = client.waitForResponse((r) => r.url().includes("/api/cart") && r.request().method() === "POST");
    await client.getByTestId("add-to-cart").click();
    expect((await adaugat).status()).toBe(200);
    await client.goto("/ro/cart");
    await client.getByTestId("ship-name").fill(`John Test ${id}`);
    await client.getByTestId("ship-phone").fill("0744 555 666");
    await client.getByTestId("ship-address").fill(`Str. Magazinului ${id}, Arad`);
    await client.getByTestId("place-order").click();
    await expect(async () => {
      await client.goto("/ro/account/shop-orders");
      await expect(client.getByTestId("shop-order-row").first()).toBeVisible({ timeout: 2_000 });
    }).toPass({ timeout: 30_000 });

    // adminul o plimbă prin toate stările
    await login(page, "admin@nbp.test", "admin1234");
    await page.goto("/ro/admin/shop-orders");
    await asteaptaFormularViu(page, "shop-order-actions");
    const rand = page.getByTestId("shop-order-row").filter({ hasText: `John Test ${id}` });
    await expect(rand).toBeVisible();

    // fiecare marcare mută comanda în fila următoare, deci o urmărim acolo
    const PASI = [
      { buton: "Plătită", fila: "PAID" },
      { buton: "Expediată", fila: "SHIPPED" },
      { buton: "Livrată", fila: "DELIVERED" },
    ];
    for (const pas of PASI) {
      await asteaptaFormularViu(page, "shop-order-actions");
      // asteptamRaspunsul: o navigare imediat dupa apasare taie cererea din zbor
      const salvat = page.waitForResponse(
        (r) => r.url().includes("/api/admin/shop-orders") && r.request().method() === "POST"
      );
      await page
        .getByTestId("shop-order-row")
        .filter({ hasText: `John Test ${id}` })
        .getByRole("button", { name: pas.buton })
        .click();
      expect((await salvat).status(), `marcarea „${pas.buton}" a esuat`).toBe(200);
      await expect(async () => {
        await page.goto(`/ro/admin/shop-orders?status=${pas.fila}`);
        await expect(
          page.getByTestId("shop-order-row").filter({ hasText: `John Test ${id}` })
        ).toBeVisible({ timeout: 2_000 });
      }).toPass({ timeout: 25_000 });
    }

    // cumpărătorul vede aceeași stare
    await client.goto("/ro/account/shop-orders");
    await expect(client.getByTestId("shop-order-row").first()).toContainText("Livrată");
    await ctx.close();
  });

  test("o comandă anulată pune produsele înapoi în stoc", async ({ page, browser }) => {
    test.setTimeout(240_000);
    const id = uid().slice(-5);

    const ctx = await browser.newContext({ locale: "ro-RO" });
    const client = await ctx.newPage();
    await login(client, "buyer2@nbp.test", "buyer1234");
    await client.goto("/ro/products");
    await client.getByTestId("product-card").first().click();
    await client.waitForURL(/\/products\/[^/]+$/);
    const adresaProdus = client.url();
    const stocInainte = Number(
      (await client.getByTestId("product-stock").first().innerText()).replace(/\D/g, "")
    );

    const adaugat = client.waitForResponse((r) => r.url().includes("/api/cart") && r.request().method() === "POST");
    await client.getByTestId("add-to-cart").click();
    expect((await adaugat).status()).toBe(200);
    await client.goto("/ro/cart");
    await client.getByTestId("ship-name").fill(`Anulat Test ${id}`);
    await client.getByTestId("ship-phone").fill("0744 555 666");
    await client.getByTestId("ship-address").fill(`Str. Anulării ${id}, Arad`);
    await client.getByTestId("place-order").click();
    await expect(async () => {
      await client.goto("/ro/account/shop-orders");
      await expect(client.getByTestId("shop-order-row").first()).toBeVisible({ timeout: 2_000 });
    }).toPass({ timeout: 30_000 });

    // stocul a scăzut (cu cel puțin una — alte teste pot cumpăra în paralel)
    await client.goto(adresaProdus);
    const stocDupaComanda = Number(
      (await client.getByTestId("product-stock").first().innerText()).replace(/\D/g, "")
    );
    expect(stocDupaComanda, "stocul nu a scăzut după comandă").toBeLessThan(stocInainte);

    // adminul anulează → stocul se întoarce
    await login(page, "admin@nbp.test", "admin1234");
    await page.goto("/ro/admin/shop-orders");
    await asteaptaFormularViu(page, "shop-order-actions");
    const rand = page.getByTestId("shop-order-row").filter({ hasText: `Anulat Test ${id}` });
    await expect(rand).toBeVisible();
    await asteaptaFormularViu(page, "shop-order-actions");
    // anularea cere confirmare: fara raspuns, browserul o refuza singur
    page.once("dialog", (d) => d.accept());
    const anulat = page.waitForResponse(
      (r) => r.url().includes("/api/admin/shop-orders") && r.request().method() === "POST"
    );
    await rand.getByRole("button", { name: "Anulează" }).click();
    expect((await anulat).status(), "anularea a esuat").toBe(200);

    await expect(async () => {
      await client.goto(adresaProdus);
      const acum = Number(
        (await client.getByTestId("product-stock").first().innerText()).replace(/\D/g, "")
      );
      // exact bucata anulată se întoarce; restul mișcărilor sunt ale altor teste
      expect(acum, "stocul nu s-a întors după anulare").toBeGreaterThan(stocDupaComanda);
    }).toPass({ timeout: 30_000 });

    await ctx.close();
  });
});

test.describe("Pagini de conținut și jurnal", () => {
  test("o pagină de conținut se salvează și se vede pe site", async ({ page }) => {
    test.setTimeout(150_000);
    const id = uid().slice(-5);
    const semn = `Actualizat ${id}`;

    await login(page, "admin@nbp.test", "admin1234");
    await page.goto("/ro/admin/content?slug=alte-info");

    const textarea = page.getByLabel("Conținut (RO)");
    await expect(textarea).toBeVisible();
    const vechi = await textarea.inputValue();
    await textarea.fill(`${vechi}\n\n${semn}`);
    await page.getByTestId("editor-save").click();
    await expect(page.getByTestId("editor-saved")).toBeVisible();

    // se vede public
    await page.goto("/ro/info/alte-info");
    await expect(page.locator("main")).toContainText(semn);

    // punem textul la loc, baza de test e comună
    await page.goto("/ro/admin/content?slug=alte-info");
    await page.getByLabel("Conținut (RO)").fill(vechi);
    await page.getByTestId("editor-save").click();
    await expect(page.getByTestId("editor-saved")).toBeVisible();
  });

  test("jurnalul păstrează urma a ce a făcut adminul", async ({ page }) => {
    test.setTimeout(150_000);
    const id = uid().slice(-6);
    await login(page, "admin@nbp.test", "admin1234");

    // o faptă cu urmă, pe date numai ale noastre: o întrebare de Ajutor
    const creata = await page.request.post("/api/admin/faq", {
      data: {
        category: "OTHER",
        questionRo: `Întrebare de jurnal ${id}?`,
        questionEn: `Audit question ${id}?`,
        answerRo: "Răspuns scurt pentru verificarea jurnalului.",
        answerEn: "Short answer for the audit check.",
      },
    });
    const { id: faqId } = await creata.json();

    await page.goto("/ro/admin/audit");
    await expect(page.getByTestId("audit-table")).toBeVisible();
    await expect(page.getByTestId("audit-table")).toContainText("FAQ_CREATED");

    // curățenie: baza de test e comună
    const stearsa = await page.request.delete(`/api/admin/faq/${faqId}`);
    expect((await stearsa.json()).ok).toBe(true);
  });
});

test.describe("Setări care se văd pe site", () => {
  /**
   * Transportul din magazin era scris în cod, în două locuri. Acum e o setare:
   * adminul o schimbă, clientul vede altă sumă la coș.
   */
  test("transportul din magazin se schimbă din Setări", async ({ page, browser }) => {
    test.setTimeout(180_000);
    await login(page, "admin@nbp.test", "admin1234");

    const pune = async (cents: number) => {
      const res = await page.request.post("/api/admin/settings", {
        data: { updates: { shopShippingCents: cents } },
      });
      expect((await res.json()).ok, `nu s-a salvat transportul ${cents}`).toBe(true);
    };

    const ctx = await browser.newContext({ locale: "ro-RO" });
    const client = await ctx.newPage();
    await login(client, "buyer1@nbp.test", "buyer1234");
    await client.goto("/ro/products");
    await client.getByTestId("product-card").first().click();
    await client.waitForURL(/\/products\/[^/]+$/);
    const adaugat = client.waitForResponse((r) => r.url().includes("/api/cart") && r.request().method() === "POST");
    await client.getByTestId("add-to-cart").click();
    expect((await adaugat).status()).toBe(200);

    try {
      await pune(3_000);
      await expect(async () => {
        await client.goto("/ro/cart");
        await expect(client.locator("main")).toContainText("30", { timeout: 2_000 });
      }).toPass({ timeout: 20_000 });

      await pune(1_000);
      await expect(async () => {
        await client.goto("/ro/cart");
        await expect(client.locator("main")).toContainText("10", { timeout: 2_000 });
      }).toPass({ timeout: 20_000 });
    } finally {
      // baza de test e comună: punem valoarea la loc
      await pune(2_500);
      await client.getByTestId("cart-remove").first().click().catch(() => {});
      await ctx.close();
    }
  });
});

test.describe("Newsletter", () => {
  /**
   * Lipsea cu totul: abonații se vedeau, dar nu se putea trimite nimic.
   * Mesajul pleacă în reprize, din sweeper, și are link de dezabonare.
   */
  test("se scrie din administrare și ajunge la abonat, cu dezabonare", async ({ page }) => {
    test.setTimeout(240_000);
    const id = uid().slice(-6);
    const abonat = `abonat-${id}@e2e.test`;
    const subiect = `Licitație nouă ${id}`;

    // un om se abonează de pe site
    const inscris = await page.request.post("/api/newsletter", {
      data: { email: abonat, locale: "ro", consent: true },
    });
    expect(inscris.status(), await inscris.text()).toBe(200);

    await login(page, "admin@nbp.test", "admin1234");
    await page.goto("/ro/admin/newsletter");
    await expect(page.getByTestId("newsletter-composer")).toBeVisible();

    // scriem și trimitem
    const pornit = await page.request.post("/api/admin/newsletter/campaigns", {
      data: {
        subjectRo: subiect,
        subjectEn: `New auction ${id}`,
        bodyRo: "Sâmbătă pornim o licitație nouă. Te așteptăm pe site!",
        bodyEn: "On Saturday we open a new auction. See you on the site!",
      },
    });
    const raspuns = await pornit.json();
    expect(raspuns.ok, JSON.stringify(raspuns)).toBe(true);
    expect(raspuns.total).toBeGreaterThan(0);

    // sweeperul îl duce la capăt: mesajul ajunge la abonat
    await expect(async () => {
      const primite = emails(abonat);
      expect(
        primite.some((e) => e.subject === subiect),
        `nu a ajuns; ce a primit: ${primite.map((e) => e.subject).join(" | ")}`
      ).toBe(true);
    }).toPass({ timeout: 120_000, intervals: [5_000] });

    const mesaj = emails(abonat).find((e) => e.subject === subiect)!;
    expect(mesaj.body).toContain("Te așteptăm");
    expect(mesaj.body, "lipsește linkul de dezabonare").toContain("/newsletter/unsubscribe?token=");

    // progresul se vede în administrare
    await expect(async () => {
      await page.goto("/ro/admin/newsletter");
      await expect(page.getByTestId("campaign-row").filter({ hasText: subiect })).toContainText(
        /trimis|se trimite/,
        { timeout: 2_000 }
      );
    }).toPass({ timeout: 30_000 });
  });

  test("nu se pornesc două trimiteri deodată", async ({ page }) => {
    test.setTimeout(150_000);
    const id = uid().slice(-6);
    await login(page, "admin@nbp.test", "admin1234");
    const date = {
      subjectRo: `Prima ${id}`,
      subjectEn: `First ${id}`,
      bodyRo: "Un mesaj de probă pentru abonații platformei noastre.",
      bodyEn: "A test message for the subscribers of our platform.",
    };
    const una = await page.request.post("/api/admin/newsletter/campaigns", { data: date });
    const aDoua = await page.request.post("/api/admin/newsletter/campaigns", {
      data: { ...date, subjectRo: `A doua ${id}` },
    });
    // prima poate porni (sau poate exista deja una în curs), dar două odată nu
    const stari = [una.status(), aDoua.status()];
    expect(stari.filter((s) => s === 200).length, `stări: ${stari}`).toBeLessThanOrEqual(1);
    expect(stari).toContain(409);
  });
});
