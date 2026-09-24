import { test, expect, type APIRequestContext } from "@playwright/test";
import { login } from "./helpers";

/**
 * Cine are voie să cheme ce.
 *
 * Paginile de administrare sunt închise (vezi harta de acces), dar ce contează
 * cu adevărat sunt rutele din spate: o pagină ascunsă nu ajută la nimic dacă
 * cererea poate fi trimisă direct. Aici se încearcă TOATE rutele de
 * administrare, o dată nelogat și o dată ca un cumpărător obișnuit.
 *
 * Așteptăm 401 (nu ești autentificat) sau 403 (nu ai voie). Orice altceva —
 * inclusiv o eroare de validare — înseamnă că cererea a trecut de pază.
 */

/** Toate rutele de administrare, cu metodele lor. Id-ul poate fi inventat:
 *  paza trebuie să oprească cererea înainte să caute în baza de date. */
const RUTE: { cale: string; metoda: "GET" | "POST" | "PATCH" | "DELETE" }[] = [
  { cale: "/api/admin/accounts/x", metoda: "POST" },
  { cale: "/api/admin/admins", metoda: "POST" },
  { cale: "/api/admin/admins/x", metoda: "DELETE" },
  { cale: "/api/admin/agents", metoda: "POST" },
  { cale: "/api/admin/agents/x", metoda: "DELETE" },
  { cale: "/api/admin/alerts", metoda: "POST" },
  { cale: "/api/admin/alerts/x", metoda: "PATCH" },
  { cale: "/api/admin/alerts/x", metoda: "DELETE" },
  { cale: "/api/admin/alerts/x/test", metoda: "POST" },
  { cale: "/api/admin/articles", metoda: "POST" },
  { cale: "/api/admin/articles/x", metoda: "DELETE" },
  { cale: "/api/admin/articles/x/review", metoda: "POST" },
  { cale: "/api/admin/auction-requests/x", metoda: "POST" },
  { cale: "/api/admin/auction-requests/x", metoda: "DELETE" },
  { cale: "/api/admin/auctions/x", metoda: "DELETE" },
  { cale: "/api/admin/auctions/x/hide", metoda: "POST" },
  { cale: "/api/admin/auctions/x/unavailable", metoda: "POST" },
  { cale: "/api/admin/auctions/x/withdraw", metoda: "POST" },
  { cale: "/api/admin/breeders", metoda: "POST" },
  { cale: "/api/admin/breeders/x/hide", metoda: "POST" },
  { cale: "/api/admin/content", metoda: "POST" },
  { cale: "/api/admin/contests", metoda: "POST" },
  { cale: "/api/admin/contests/x", metoda: "DELETE" },
  { cale: "/api/admin/email-config", metoda: "POST" },
  { cale: "/api/admin/email-config", metoda: "DELETE" },
  { cale: "/api/admin/email-test", metoda: "POST" },
  { cale: "/api/admin/emails/x/resend", metoda: "POST" },
  { cale: "/api/admin/faq", metoda: "POST" },
  { cale: "/api/admin/faq/x", metoda: "DELETE" },
  { cale: "/api/admin/fx", metoda: "POST" },
  { cale: "/api/admin/links", metoda: "POST" },
  { cale: "/api/admin/links/x", metoda: "DELETE" },
  { cale: "/api/admin/lots/x", metoda: "POST" },
  { cale: "/api/admin/lots/x/shorten", metoda: "POST" },
  { cale: "/api/admin/messages/x", metoda: "POST" },
  { cale: "/api/admin/messages/x", metoda: "DELETE" },
  { cale: "/api/admin/newsletter/x", metoda: "DELETE" },
  { cale: "/api/admin/newsletter/export", metoda: "GET" },
  { cale: "/api/admin/orders/x", metoda: "POST" },
  { cale: "/api/admin/products", metoda: "POST" },
  { cale: "/api/admin/products/x", metoda: "DELETE" },
  { cale: "/api/admin/reviews/x", metoda: "POST" },
  { cale: "/api/admin/sale-lots/x", metoda: "POST" },
  { cale: "/api/admin/sale-lots/x", metoda: "DELETE" },
  { cale: "/api/admin/sale-lots/x/order", metoda: "POST" },
  { cale: "/api/admin/sale-lots/x/pigeons", metoda: "POST" },
  { cale: "/api/admin/sale-lots/x/start", metoda: "POST" },
  { cale: "/api/admin/sale-lots/x/unschedule", metoda: "POST" },
  { cale: "/api/admin/sale-pigeons/x", metoda: "DELETE" },
  { cale: "/api/admin/sales", metoda: "POST" },
  { cale: "/api/admin/sales/x", metoda: "DELETE" },
  { cale: "/api/admin/sales/x/archive", metoda: "POST" },
  { cale: "/api/admin/sales/x/lots", metoda: "POST" },
  { cale: "/api/admin/sellers/x", metoda: "POST" },
  { cale: "/api/admin/settings", metoda: "POST" },
  { cale: "/api/admin/settlements", metoda: "POST" },
  { cale: "/api/admin/settlements/export", metoda: "GET" },
  { cale: "/api/admin/shop-orders/x", metoda: "POST" },
  { cale: "/api/admin/transactions/export", metoda: "GET" },
  { cale: "/api/admin/users/x/reset-link", metoda: "POST" },
  { cale: "/api/admin/users/x/suspend", metoda: "POST" },
];

async function cheama(req: APIRequestContext, cale: string, metoda: string) {
  const optiuni = { data: {} };
  if (metoda === "GET") return req.get(cale);
  if (metoda === "DELETE") return req.delete(cale, optiuni);
  if (metoda === "PATCH") return req.patch(cale, optiuni);
  return req.post(cale, optiuni);
}

async function incearcaToate(req: APIRequestContext) {
  const scapate: string[] = [];
  for (const r of RUTE) {
    const res = await cheama(req, r.cale, r.metoda);
    if (res.status() !== 401 && res.status() !== 403) {
      scapate.push(`${r.metoda} ${r.cale} → ${res.status()}`);
    }
  }
  return scapate;
}

test.describe("Cine are voie la rutele de administrare", () => {
  test("un vizitator nelogat e oprit peste tot", async ({ page }) => {
    test.setTimeout(240_000);
    await page.goto("/ro");
    await page.request.post("/api/auth/logout");
    const scapate = await incearcaToate(page.request);
    expect(scapate, `rute deschise unui vizitator: ${scapate.join(" | ")}`).toEqual([]);
  });

  test("un cumpărător cu cont e oprit peste tot", async ({ page }) => {
    test.setTimeout(240_000);
    await login(page, "buyer1@nbp.test", "buyer1234");
    const scapate = await incearcaToate(page.request);
    expect(scapate, `rute deschise unui cumpărător: ${scapate.join(" | ")}`).toEqual([]);
  });

  test("un crescător aprobat nu e administrator", async ({ page }) => {
    test.setTimeout(240_000);
    await login(page, "seller@nbp.test", "seller1234");
    const scapate = await incearcaToate(page.request);
    expect(scapate, `rute deschise unui crescător: ${scapate.join(" | ")}`).toEqual([]);
  });
});

test.describe("Rutele care cer doar un cont", () => {
  const ALE_CONTULUI: { cale: string; metoda: "POST" | "DELETE" }[] = [
    { cale: "/api/auctions/x/bid", metoda: "POST" },
    { cale: "/api/auctions/x/buy", metoda: "POST" },
    { cale: "/api/auctions/x/watch", metoda: "POST" },
    { cale: "/api/shop-orders", metoda: "POST" },
    { cale: "/api/reviews", metoda: "POST" },
    { cale: "/api/sell", metoda: "POST" },
    { cale: "/api/articles/propose", metoda: "POST" },
    { cale: "/api/upload", metoda: "POST" },
  ];

  test("un vizitator nelogat nu licitează, nu cumpără, nu scrie", async ({ page }) => {
    test.setTimeout(120_000);
    await page.goto("/ro");
    await page.request.post("/api/auth/logout");
    const scapate: string[] = [];
    for (const r of ALE_CONTULUI) {
      const res = await cheama(page.request, r.cale, r.metoda);
      if (res.status() !== 401 && res.status() !== 403) {
        scapate.push(`${r.metoda} ${r.cale} → ${res.status()}`);
      }
    }
    expect(scapate, `rute deschise fără cont: ${scapate.join(" | ")}`).toEqual([]);
  });

  test("un cumpărător nu poate lista porumbei și nici propune articole", async ({ page }) => {
    test.setTimeout(120_000);
    await login(page, "buyer1@nbp.test", "buyer1234");
    for (const cale of ["/api/sell", "/api/articles/propose", "/api/upload"]) {
      const res = await page.request.post(cale, { data: {} });
      expect(res.status(), `${cale} ar trebui refuzat unui cumpărător`).toBe(403);
    }
  });
});
