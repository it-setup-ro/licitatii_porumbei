import { test, expect, type Page, type APIRequestContext } from "@playwright/test";
import { login, registrationData } from "./helpers";

/**
 * Teste intensive cerute de Daniel după ce a licitat 500 → 550 → 600 și ultima
 * creștere nu se vedea în istoric: licitare de la mai mulți oameni pe același
 * porumbel și vânzarea dusă până la capăt, cu verificarea sumelor în toate
 * punctele (preț, lider, număr de oferte, comision, istoric de tranzacții).
 *
 * Regula de aur a testelor de aici: ecranele deschise nu se reîncarcă niciodată.
 * Tot ce apare pe ele trebuie să vină pe fluxul live — altfel bug-ul lui Daniel
 * ar trece nevăzut, exact cum a trecut până acum.
 */

const PAROLA_NOUA = "TestParola2026!";
const MIN = 60_000;
const uid = () => `${Date.now()}${Math.floor(Math.random() * 1000)}`;

async function post(req: APIRequestContext, url: string, data?: unknown) {
  const res = await req.post(url, data === undefined ? {} : { data });
  return { status: res.status(), body: await res.json() };
}

/** Sumele se citesc din pagină și se compară în bani, nu ca text. */
function cents(text: string) {
  const n = text
    .replace(/[^\d,.]/g, "")
    .replace(/\.(?=\d{3})/g, "")
    .replace(",", ".");
  return Math.round(Number(n) * 100);
}

/** O licitație de crescător pornită, cu porumbeii dați. */
async function lotPornit(
  admin: Page,
  pigeons: { name: string; startPriceCents: number }[],
  commissionPercent = 10
) {
  const id = uid();
  const breeder = await post(admin.request, "/api/admin/breeders", {
    name: `Crescător Intens ${id.slice(-5)}`,
  });
  const sale = await post(admin.request, "/api/admin/sales", {
    breederId: breeder.body.id,
    slug: `intens-${id}`,
    titleRo: `Licitația intensivă ${id.slice(-5)}`,
    titleEn: `Intensive auction ${id.slice(-5)}`,
    commissionPercent,
  });
  expect(sale.body.ok, JSON.stringify(sale.body)).toBe(true);
  const lot = await post(admin.request, `/api/admin/sales/${sale.body.id}/lots`, {
    startsAt: new Date(Date.now() - MIN).toISOString(),
    endsAt: new Date(Date.now() + 120 * MIN).toISOString(),
  });
  const auctionIds: string[] = [];
  for (const [i, p] of pigeons.entries()) {
    const ring = `RO 2025 ${id.slice(-5)}${i}`;
    const add = await post(admin.request, `/api/admin/sale-lots/${lot.body.id}/pigeons`, {
      ringNumber: ring,
      sex: "M",
      name: p.name,
      startPriceCents: p.startPriceCents,
    });
    expect(add.body.ok, JSON.stringify(add.body)).toBe(true);
    await post(admin.request, `/api/lots/${add.body.auctionId}`, {
      ringNumber: ring,
      sex: "M",
      name: p.name,
      startPriceCents: p.startPriceCents,
      media: [{ url: "/pigeons/voiajor-grizzle.jpg", type: "IMAGE" }],
    });
    auctionIds.push(add.body.auctionId);
  }
  expect((await post(admin.request, `/api/admin/sale-lots/${lot.body.id}/start`)).body.ok).toBe(true);
  return { saleId: sale.body.id as string, auctionIds, ring0: `RO 2025 ${id.slice(-5)}0` };
}

/** Cont proaspăt, ca al unui om care intră prima dată pe site. */
async function contNou(page: Page, eticheta: string) {
  const email = `intens-${eticheta}-${uid()}@e2e.test`;
  const res = await page.request.post("/api/auth/register", {
    data: registrationData({
      email,
      password: PAROLA_NOUA,
      name: `Intens ${eticheta}`,
      nickname: `IN${eticheta}${uid().slice(-6)}`,
    }),
  });
  expect(res.status(), await res.text()).toBe(200);
  await page.request.post("/api/auth/logout");
  return email;
}

async function deschide(page: Page, id: string, email: string, parola: string) {
  await login(page, email, parola);
  await page.goto(`/ro/auctions/${id}`);
  await expect(page.getByTestId("bid-panel")).toBeVisible();
}

/** Suma dintr-un rând de istoric: celula ei, nu tot rândul (acolo sunt și cifre din dată). */
async function sumaRandului(page: Page, i = 0) {
  return cents(await page.getByTestId("bid-row").nth(i).locator("td").nth(1).innerText());
}

/** Rândurile vizibile din istoricul ofertelor, ca text normalizat. */
async function randuri(page: Page) {
  const rows = page.getByTestId("bid-row");
  const n = await rows.count();
  const out: string[] = [];
  for (let i = 0; i < n; i++) {
    out.push((await rows.nth(i).innerText()).replace(/\s+/g, " ").trim());
  }
  return out;
}

/**
 * Invariantul care lipsea: istoricul de pe un ecran care nu s-a reîncărcat
 * trebuie să arate exact ce arată pagina deschisă acum, de la zero. Așa se
 * prinde și un rând lipsă, și unul pus în ordinea greșită.
 */
async function caPeServer(live: Page[], proaspat: Page, url: string, pasul: string) {
  await expect(async () => {
    await proaspat.goto(url);
    const asteptat = await randuri(proaspat);
    expect(asteptat.length, `${pasul}: pagina randată de server nu are nicio ofertă`).toBeGreaterThan(0);
    for (const [i, p] of live.entries()) {
      expect(
        await randuri(p),
        `${pasul}: istoricul live de pe ecranul ${i + 1} diferă de cel randat de server`
      ).toEqual(asteptat);
    }
  }).toPass({ timeout: 30_000, intervals: [1_000, 2_000, 3_000] });
}

test.describe("Licitare intensivă și vânzare completă", () => {
  test("istoricul ofertelor urcă la fiecare ofertă, pe toate ecranele deschise", async ({
    browser,
  }) => {
    test.setTimeout(240_000);

    const ctxAdmin = await browser.newContext({ locale: "ro-RO" });
    const admin = await ctxAdmin.newPage();
    await login(admin, "admin@nbp.test", "admin1234");
    const { auctionIds } = await lotPornit(admin, [
      { name: `Istoric ${uid().slice(-5)}`, startPriceCents: 50_000 },
    ]);
    const id = auctionIds[0];
    const url = `/ro/auctions/${id}`;

    const ctxA = await browser.newContext({ locale: "ro-RO" });
    const ctxB = await browser.newContext({ locale: "ro-RO" });
    const telefon = await ctxA.newPage(); // buyer1
    const calculator = await ctxB.newPage(); // buyer2
    await deschide(telefon, id, "buyer1@nbp.test", "buyer1234");
    await deschide(calculator, id, "buyer2@nbp.test", "buyer1234");

    // Amândoi văd istoricul gol: nimeni n-a licitat încă.
    await expect(telefon.getByTestId("bid-history-empty")).toBeVisible();
    await expect(calculator.getByTestId("bid-history-empty")).toBeVisible();

    // Exact pașii lui Daniel: 500 → 550 → 600, alternând între două ecrane.
    const pasi: { de: Page; maxCents: number; lider: "telefon" | "calculator" }[] = [
      { de: telefon, maxCents: 50_000, lider: "telefon" },
      { de: calculator, maxCents: 55_000, lider: "calculator" },
      { de: telefon, maxCents: 60_000, lider: "telefon" },
    ];

    let randuriInainte = 0;
    for (const [i, pas] of pasi.entries()) {
      const r = await post(pas.de.request, `/api/auctions/${id}/bid`, { maxCents: pas.maxCents });
      expect(r.body.ok, `oferta ${i + 1} respinsă: ${JSON.stringify(r.body)}`).toBe(true);

      // Rândul nou apare singur, pe amândouă ecranele — fără reîncărcare.
      await expect(async () => {
        expect(
          await telefon.getByTestId("bid-row").count(),
          `după oferta ${i + 1} istoricul nu a crescut pe ecranul care a licitat`
        ).toBeGreaterThan(randuriInainte);
        expect(
          await calculator.getByTestId("bid-row").count(),
          `după oferta ${i + 1} istoricul nu a crescut pe celălalt ecran`
        ).toBeGreaterThan(randuriInainte);
      }).toPass({ timeout: 20_000, intervals: [500, 1_000, 2_000] });
      randuriInainte = await telefon.getByTestId("bid-row").count();

      // …și arată exact ce arată pagina proaspăt deschisă.
      await caPeServer([telefon, calculator], admin, url, `oferta ${i + 1}`);

      const lider = pas.lider === "telefon" ? telefon : calculator;
      await expect(lider.getByTestId("leading-badge")).toBeVisible();
    }

    // Primul rând e prețul curent: omul se uită acolo, nu doar în panou.
    const pret = await telefon.getByTestId("current-price").innerText();
    expect(await sumaRandului(telefon), "primul rând nu e prețul curent").toBe(cents(pret));

    // O singură stea de lider, pe rândul potrivit — nu neapărat pe cel mai nou.
    await expect(telefon.getByTestId("bid-row").filter({ hasText: "★" })).toHaveCount(1);

    // Cine conduce și își ridică doar plafonul nu adaugă rând în istoric: public
    // nu s-a schimbat nimic (același lider, același preț). Se schimbă doar cât
    // e dispus să dea, iar asta o vede numai el.
    const inainteDeRidicare = await randuri(telefon);
    const pretInainte = cents(await telefon.getByTestId("current-price").innerText());
    const ridicare = await post(telefon.request, `/api/auctions/${id}/bid`, { maxCents: 80_000 });
    expect(ridicare.body.ok, JSON.stringify(ridicare.body)).toBe(true);
    await calculator.waitForTimeout(3_000);
    expect(await randuri(telefon), "ridicarea propriului plafon nu trebuie să apară în istoric").toEqual(
      inainteDeRidicare
    );
    expect(cents(await calculator.getByTestId("current-price").innerText())).toBe(pretInainte);

    // Dar plafonul nou chiar e ținut minte: ca să treacă peste el, trebuie mai mult.
    const preaMic = await post(calculator.request, `/api/auctions/${id}/bid`, { maxCents: 75_000 });
    expect(preaMic.body.ok, "plafonul ridicat nu a fost luat în seamă").toBe(true);
    await expect(telefon.getByTestId("leading-badge")).toBeVisible();

    await ctxA.close();
    await ctxB.close();
    await ctxAdmin.close();
  });

  test("trei licitatori pe același porumbel: prețul, liderul și numărul de oferte sunt la fel pe toate ecranele", async ({
    browser,
  }) => {
    test.setTimeout(240_000);

    const ctxAdmin = await browser.newContext({ locale: "ro-RO" });
    const admin = await ctxAdmin.newPage();
    await login(admin, "admin@nbp.test", "admin1234");
    const { auctionIds } = await lotPornit(admin, [
      { name: `Trei ${uid().slice(-5)}`, startPriceCents: 15_000 },
    ]);
    const id = auctionIds[0];

    const ctx1 = await browser.newContext({ locale: "ro-RO" });
    const ctx2 = await browser.newContext({ locale: "ro-RO" });
    const ctx3 = await browser.newContext({ locale: "ro-RO" });
    const p1 = await ctx1.newPage();
    const p2 = await ctx2.newPage();
    const p3 = await ctx3.newPage();

    await p3.goto("/ro");
    const alTreilea = await contNou(p3, "c3");

    await deschide(p1, id, "buyer1@nbp.test", "buyer1234");
    await deschide(p2, id, "buyer2@nbp.test", "buyer1234");
    await deschide(p3, id, alTreilea, PAROLA_NOUA);

    const toate = [p1, p2, p3];

    /** Toate ecranele trebuie să arate aceeași licitație, fără reîncărcare. */
    async function laFel(pasul: string, liderul: Page, minim: number, maxim: number) {
      await expect(async () => {
        const preturi: number[] = [];
        for (const p of toate) preturi.push(cents(await p.getByTestId("current-price").innerText()));
        expect(new Set(preturi).size, `${pasul}: ecranele arată prețuri diferite (${preturi})`).toBe(1);

        // Prețul stă între plafonul celui depășit și al liderului: cu licitare
        // prin plafon, nimeni nu plătește mai mult decât a spus.
        expect(
          preturi[0],
          `${pasul}: prețul ${preturi[0]} nu e între ${minim} și ${maxim}`
        ).toBeGreaterThanOrEqual(minim);
        expect(preturi[0]).toBeLessThanOrEqual(maxim);

        const oferte: string[] = [];
        const ofertanti: string[] = [];
        for (const p of toate) {
          oferte.push((await p.getByTestId("bid-count").innerText()).replace(/\D/g, ""));
          ofertanti.push((await p.getByTestId("bidder-count").innerText()).replace(/\D/g, ""));
        }
        expect(new Set(oferte).size, `${pasul}: numărul de oferte diferă (${oferte})`).toBe(1);
        expect(new Set(ofertanti).size, `${pasul}: numărul de ofertanți diferă (${ofertanti})`).toBe(1);

        // Un singur lider, și e cine trebuie.
        await expect(liderul.getByTestId("leading-badge")).toBeVisible({ timeout: 2_000 });
        for (const p of toate) {
          if (p === liderul) continue;
          await expect(p.locator('[data-testid="leading-badge"]')).toHaveCount(0);
        }
      }).toPass({ timeout: 30_000, intervals: [1_000, 2_000, 3_000] });
    }

    // 1) Primul intră cu plafon 200 €: prețul rămâne la pornire (150 €).
    expect((await post(p1.request, `/api/auctions/${id}/bid`, { maxCents: 20_000 })).body.ok).toBe(true);
    await laFel("pasul 1", p1, 15_000, 20_000);

    // 2) Al doilea cu plafon 180 €, sub plafonul primului: e depășit instant,
    //    prețul urcă lângă 180 €, dar conduce tot primul.
    expect((await post(p2.request, `/api/auctions/${id}/bid`, { maxCents: 18_000 })).body.ok).toBe(true);
    await laFel("pasul 2", p1, 18_000, 20_000);
    // Aici nu cerem insigna „ai fost depășit": al doilea n-a condus nicio clipă,
    // iar asta o află din răspunsul la propria ofertă („depășită instant").
    // Insigna e pentru cine a condus și a pierdut conducerea — pașii 3 și 4.

    // 3) Al treilea, cont nou, cu 600 €: preia conducerea.
    expect((await post(p3.request, `/api/auctions/${id}/bid`, { maxCents: 60_000 })).body.ok).toBe(true);
    await laFel("pasul 3", p3, 20_000, 60_000);
    await expect(p1.getByTestId("outbid-badge")).toBeVisible();

    // 4) Primul se întoarce cu 800 €: conducerea revine la el.
    expect((await post(p1.request, `/api/auctions/${id}/bid`, { maxCents: 80_000 })).body.ok).toBe(true);
    await laFel("pasul 4", p1, 60_000, 80_000);
    await expect(p3.getByTestId("outbid-badge")).toBeVisible();

    // Trei oameni, trei ofertanți numărați — și istoricul identic pe toate trei.
    await expect(p1.getByTestId("bidder-count")).toContainText("3");
    await caPeServer(toate, admin, `/ro/auctions/${id}`, "final");

    await ctx1.close();
    await ctx2.close();
    await ctx3.close();
    await ctxAdmin.close();
  });

  test("vânzarea dusă până la capăt: suma, comisionul și rândul din Istoric tranzacții", async ({
    browser,
  }) => {
    test.setTimeout(330_000);

    const ctxAdmin = await browser.newContext({ locale: "ro-RO" });
    const admin = await ctxAdmin.newPage();
    await login(admin, "admin@nbp.test", "admin1234");
    const nume = `Vândut ${uid().slice(-5)}`;
    const { saleId, auctionIds, ring0 } = await lotPornit(admin, [
      { name: nume, startPriceCents: 15_000 },
    ]);
    const id = auctionIds[0];

    // Doi licitatori, ca prețul final să nu fie cel de pornire.
    const ctx1 = await browser.newContext({ locale: "ro-RO" });
    const ctx2 = await browser.newContext({ locale: "ro-RO" });
    const pierde = await ctx1.newPage();
    const castiga = await ctx2.newPage();
    await deschide(pierde, id, "buyer1@nbp.test", "buyer1234");
    await deschide(castiga, id, "buyer2@nbp.test", "buyer1234");

    expect((await post(pierde.request, `/api/auctions/${id}/bid`, { maxCents: 18_000 })).body.ok).toBe(true);
    expect((await post(castiga.request, `/api/auctions/${id}/bid`, { maxCents: 25_000 })).body.ok).toBe(true);
    await expect(castiga.getByTestId("leading-badge")).toBeVisible();

    // Prețul cu care se închide: tot ce urmează trebuie să arate suma asta.
    const pretFinal = cents(await castiga.getByTestId("current-price").innerText());
    expect(pretFinal).toBeGreaterThanOrEqual(18_000);
    expect(pretFinal).toBeLessThanOrEqual(25_000);

    expect((await post(admin.request, `/api/admin/lots/${id}/shorten`)).body.ok).toBe(true);

    // Sweeperul închide licitația și face comanda câștigătorului.
    await expect(async () => {
      await castiga.goto("/ro/account/purchases");
      await expect(castiga.getByTestId("purchase-row").filter({ hasText: nume })).toBeVisible({
        timeout: 2_000,
      });
    }).toPass({ timeout: 200_000, intervals: [5_000] });

    await castiga.getByTestId("purchase-row").filter({ hasText: nume }).click();
    await castiga.waitForURL(/\/orders\/[a-z0-9]+$/);
    const comanda = castiga.url().split("/").pop()!;
    expect(cents(await castiga.getByTestId("order-amount").innerText())).toBe(pretFinal);
    await expect(castiga.getByTestId("payment-instructions")).toBeVisible();

    // Cel care a pierdut nu are comandă pentru porumbelul ăsta.
    await pierde.goto("/ro/account/purchases");
    await expect(pierde.getByTestId("purchase-row").filter({ hasText: nume })).toHaveCount(0);

    // Adminul marchează plata prin transfer și predarea.
    const plata = await post(admin.request, `/api/admin/orders/${comanda}`, {
      action: "PAID",
      method: "TRANSFER",
    });
    expect(plata.body.ok, JSON.stringify(plata.body)).toBe(true);
    const predare = await post(admin.request, `/api/admin/orders/${comanda}`, {
      action: "DELIVERED",
      carrier: "Curier Intens",
    });
    expect(predare.body.ok, JSON.stringify(predare.body)).toBe(true);

    // Istoric tranzacții: o singură tranzacție, cu sumele întregi.
    const comision = Math.round(pretFinal * 0.1);
    await admin.goto(`/ro/admin/transactions?saleId=${saleId}`);
    // Valorile stau în celulele lor, în ordinea: număr, vândut, comision, rest.
    // (Etichetele sunt scrise cu majuscule din CSS, deci nu se caută după text.)
    const valori = admin.getByTestId("tx-totals").locator("dd");
    await expect(valori).toHaveCount(4);
    expect((await valori.nth(0).innerText()).trim(), "numărul de tranzacții").toBe("1");
    expect(cents(await valori.nth(1).innerText()), "total vândut greșit").toBe(pretFinal);
    expect(cents(await valori.nth(2).innerText()), "comision greșit").toBe(comision);
    expect(cents(await valori.nth(3).innerText()), "restul crescătorului greșit").toBe(
      pretFinal - comision
    );

    const rand = admin.getByTestId("tx-row").filter({ hasText: nume });
    await expect(rand).toHaveCount(1);
    await expect(rand).toContainText(ring0);
    await expect(rand).toContainText("buyer2@nbp.test");
    await expect(rand).toContainText("Transfer");
    // in administrare eticheta e despre porumbel („predat”); pe pagina
    // cumpărătorului e despre comandă („Predată”) — amandouă corecte
    await expect(rand).toContainText("Predat");
    const textRand = (await rand.innerText()).replace(/\s+/g, " ");
    expect(textRand, `rândul nu conține suma ${pretFinal}`).toContain(String(Math.round(pretFinal / 100)));
    expect(textRand, `rândul nu conține comisionul ${comision}`).toContain(
      String(Math.round(comision / 100))
    );

    // Decontul crescătorului pornește din aceeași sumă: 100% − 10%.
    await admin.goto(`/ro/admin/sales/${saleId}`);
    const dec = admin.getByTestId("settlement");
    expect(cents(await dec.getByTestId("settlement-total").innerText())).toBe(pretFinal);
    expect(cents(await dec.getByTestId("settlement-commission").innerText())).toBe(comision);
    expect(cents(await dec.getByTestId("settlement-payout").innerText())).toBe(pretFinal - comision);

    // Exportul în Excel se descarcă și nu e gol.
    const xlsx = await admin.request.get(`/api/admin/transactions/export?saleId=${saleId}`);
    expect(xlsx.status()).toBe(200);
    expect(xlsx.headers()["content-type"]).toContain("spreadsheetml");
    const bytes = await xlsx.body();
    expect(bytes.subarray(0, 2).toString()).toBe("PK");
    expect(bytes.length).toBeGreaterThan(3_000);

    // Porumbelul vândut rămâne vizibil ca istoric (așa a cerut clientul).
    await admin.goto(`/ro/auctions/${id}`);
    await expect(admin.getByTestId("bid-history")).toBeVisible();

    await ctx1.close();
    await ctx2.close();
    await ctxAdmin.close();
  });
});
