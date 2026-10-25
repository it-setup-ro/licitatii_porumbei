import { test, expect, type Page, type APIRequestContext } from "@playwright/test";
import { login, registrationData } from "./helpers";

/**
 * Limita de licitare a conturilor noi, ridicată de administrator.
 *
 * Daniel: „cei noi au limita de 5000 lei. Cum poate să o ridice adminul?" Până
 * acum doar global, din Setări, pentru toți deodată. Acum are și un câmp pe
 * fiecare cont (Administrare → Utilizatori), iar 0 înseamnă „fără limită".
 *
 * Fiecare test își face lotul lui: pe un lot comun, o ofertă mare ar strica
 * prețul pe care îl verifică alte teste.
 */

const MIN = 60_000;
const PAROLA = "TestParola2026!";
const uid = () => `${Date.now()}${Math.floor(Math.random() * 1000)}`;

async function post(req: APIRequestContext, url: string, data?: unknown) {
  const res = await req.post(url, data === undefined ? {} : { data });
  return { status: res.status(), body: await res.json() };
}

/** Un lot pornit, cu un porumbel ieftin: ne interesează doar plafonul ofertei. */
async function lotPornit(admin: Page) {
  const id = uid();
  const breeder = await post(admin.request, "/api/admin/breeders", {
    name: `Limită Test ${id}`,
    city: "Arad",
    country: "România",
  });
  const sale = await post(admin.request, "/api/admin/sales", {
    breederId: breeder.body.id,
    slug: `limita-${id}`,
    titleRo: `Limita ${id}`,
    titleEn: `Limit ${id}`,
    commissionPercent: 10,
  });
  const lot = await post(admin.request, `/api/admin/sales/${sale.body.id}/lots`, {
    startsAt: new Date(Date.now() - MIN).toISOString(),
    endsAt: new Date(Date.now() + 120 * MIN).toISOString(),
  });
  const ring = `RO 2025 ${id.slice(-6)}`;
  const add = await post(admin.request, `/api/admin/sale-lots/${lot.body.id}/pigeons`, {
    ringNumber: ring,
    birthYear: 2025,
    sex: "M",
    name: `Plafon ${id}`,
    startPriceCents: 10_000,
  });
  await post(admin.request, `/api/lots/${add.body.auctionId}`, {
    ringNumber: ring,
    birthYear: 2025,
    sex: "M",
    name: `Plafon ${id}`,
    startPriceCents: 10_000,
    media: [{ url: "/pigeons/voiajor-grizzle.jpg", type: "IMAGE" }],
  });
  expect((await post(admin.request, `/api/admin/sale-lots/${lot.body.id}/start`)).body.ok).toBe(true);
  return add.body.auctionId as string;
}

/** Cont proaspăt, fără nicio comandă: lui i se aplică limita. */
async function contNou(page: Page) {
  const email = `limita-${uid()}@e2e.test`;
  const res = await page.request.post("/api/auth/register", {
    data: registrationData({
      email,
      password: PAROLA,
      name: "Test Limită",
      nickname: `TL${uid().slice(-7)}`,
    }),
  });
  const body = await res.json();
  expect(body.ok, JSON.stringify(body)).toBe(true);
  await page.request.post("/api/auth/logout");
  return { email, userId: body.userId as string };
}

test.describe("Limita de licitare a conturilor noi", () => {
  test("adminul o ridică pentru un singur cont, din Utilizatori", async ({ page, browser }) => {
    test.setTimeout(150_000);
    const ctxA = await browser.newContext({ locale: "ro-RO" });
    const admin = await ctxA.newPage();
    await login(admin, "admin@nbp.test", "admin1234");
    const auctionId = await lotPornit(admin);

    const { email, userId } = await contNou(page);
    await login(page, email, PAROLA);

    // 20.000 de lei trec peste limita generală a conturilor noi
    const refuzata = await post(page.request, `/api/auctions/${auctionId}/bid`, {
      maxCents: 2_000_000,
    });
    expect(refuzata.body.error).toBe("BID_LIMIT_EXCEEDED");
    expect(typeof refuzata.body.limitCents).toBe("number");

    // adminul îi pune contului limita lui, mai mare
    const pus = await post(admin.request, `/api/admin/users/${userId}/bid-limit`, {
      limitCents: 3_000_000,
    });
    expect(pus.body.ok, JSON.stringify(pus.body)).toBe(true);

    const acceptata = await post(page.request, `/api/auctions/${auctionId}/bid`, {
      maxCents: 2_000_000,
    });
    expect(acceptata.body.ok, JSON.stringify(acceptata.body)).toBe(true);

    // câmpul arată în Administrare ce s-a salvat
    await admin.goto(`/ro/admin/users?q=${encodeURIComponent(email)}`);
    const rand = admin.getByTestId("user-row").filter({ hasText: email });
    await expect(rand.getByTestId("bid-limit-input")).toHaveValue("30000");

    await ctxA.close();
  });

  test("limita 0 înseamnă fără limită, nu „nimeni nu poate licita”", async ({ page, browser }) => {
    test.setTimeout(150_000);
    const ctxA = await browser.newContext({ locale: "ro-RO" });
    const admin = await ctxA.newPage();
    await login(admin, "admin@nbp.test", "admin1234");
    const auctionId = await lotPornit(admin);

    const { email, userId } = await contNou(page);
    expect(
      (await post(admin.request, `/api/admin/users/${userId}/bid-limit`, { limitCents: 0 })).body.ok
    ).toBe(true);

    // 20.000 de lei, mult peste limita generală a conturilor noi
    await login(page, email, PAROLA);
    const r = await post(page.request, `/api/auctions/${auctionId}/bid`, { maxCents: 2_000_000 });
    expect(r.body.ok, JSON.stringify(r.body)).toBe(true);

    await ctxA.close();
  });
});
