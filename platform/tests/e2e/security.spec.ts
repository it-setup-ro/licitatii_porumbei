import { test, expect } from "@playwright/test";
import { login, readFromTestDb } from "./helpers";

/**
 * Teste de regresie pentru problemele gasite la auditul de securitate.
 * Fiecare test reproduce atacul concret si verifica faptul ca nu mai trece.
 */

test.describe("Securitate — abuzuri blocate", () => {
  test("oferta uriasa e respinsa (overflow Int / comenzi fictive)", async ({ page }) => {
    await login(page, "buyer1@nbp.test", "buyer1234");
    const auctions = await page.request.get("/ro/auctions");
    expect(auctions.ok()).toBe(true);

    await page.goto("/ro/auctions");
    await page.getByTestId("auction-card").filter({ hasText: "Fulger Albastru" }).click();
    await page.waitForURL(/\/auctions\/[a-z0-9]+$/);
    const id = page.url().split("/").pop()!;

    // 20 de miliarde de centi — inainte crea o comanda de 200 mil. EUR sau da 500
    const res = await page.request.post(`/api/auctions/${id}/bid`, {
      data: { maxCents: 2_000_000_000 },
    });
    expect(res.status()).toBe(422);

    // peste limita coloanei Int din Postgres
    const res2 = await page.request.post(`/api/auctions/${id}/bid`, {
      data: { maxCents: 3_000_000_000 },
    });
    expect(res2.status()).toBe(422);
  });

  test("raportarea nu mai ascunde instant recenzia (cenzurare blocata)", async ({ page }) => {
    const reviewId = readFromTestDb("scripts/print-seed-review-id.ts");

    // recenzia din seed e vizibila public
    await page.goto("/ro/auctions");
    await page.getByTestId("auction-card").filter({ hasText: "Fulger Albastru" }).click();
    await page.getByTestId("seller-link").click();
    await page.waitForURL(/\/sellers\/[a-z0-9]+$/);
    const sellerUrl = page.url();
    await expect(page.getByTestId("seller-reviews")).toContainText("Porumbel superb");

    // atacul: vanzatorul incearca sa-si ascunda propria recenzie -> respins
    await login(page, "seller@nbp.test", "seller1234");
    const asSeller = await page.request.post(`/api/reviews/${reviewId}/report`, {
      data: { reason: "nu-mi place" },
    });
    expect(asSeller.status()).toBe(403);

    // un tert o poate raporta (coada de moderare), dar ea RAMANE vizibila public
    await login(page, "buyer2@nbp.test", "buyer1234");
    const asOther = await page.request.post(`/api/reviews/${reviewId}/report`, {
      data: { reason: "limbaj nepotrivit" },
    });
    expect(
      asOther.ok(),
      `raport buyer2 -> ${asOther.status()}: ${await asOther.text()} (reviewId=${reviewId})`
    ).toBe(true);

    await page.goto(sellerUrl);
    await expect(page.getByTestId("seller-reviews")).toContainText("Porumbel superb");
  });

  test("setarile invalide sunt respinse (comision negativ, durata 0, increments stricat)", async ({
    page,
  }) => {
    await login(page, "admin@nbp.test", "admin1234");

    const bad = [
      { commissionPercent: -50 },
      { commissionPercent: 10_000 },
      { defaultDurationDays: 0 },
      { minStartPriceCents: -1 },
      { platformCurrency: "XYZ" },
      { increments: {} }, // forma gresita: inainte bloca licitarea pe tot site-ul
      { increments: [] },
    ];
    for (const updates of bad) {
      const res = await page.request.post("/api/admin/settings", { data: { updates } });
      expect(res.status(), `payload respins: ${JSON.stringify(updates)}`).toBe(400);
    }

    // licitarea inca functioneaza dupa incercarile de sabotaj
    await page.goto("/ro/auctions");
    await page.getByTestId("auction-card").filter({ hasText: "Fulger Albastru" }).click();
    await expect(page.getByTestId("current-price")).toBeVisible();
  });

  test("linkurile externe de poze sunt respinse la listare", async ({ page }) => {
    await login(page, "seller@nbp.test", "seller1234");
    const res = await page.request.post("/api/sell", {
      data: {
        ringNumber: "RO 2025 999111",
        birthYear: 2025,
        sex: "M",
        titleRo: "Test URL extern respins",
        titleEn: "External URL rejected test",
        startPriceCents: 15_000,
        // pixel de urmarire gazduit extern
        mediaUrls: ["https://evil.example.com/tracker.gif"],
      },
    });
    expect(res.status()).toBe(422);
  });

  test("headerele de securitate sunt trimise (anti-clickjacking, CSP)", async ({ page }) => {
    const res = await page.request.get("/ro");
    const h = res.headers();
    expect(h["x-frame-options"]).toBe("DENY");
    expect(h["x-content-type-options"]).toBe("nosniff");
    expect(h["content-security-policy"]).toContain("frame-ancestors 'none'");
    expect(h["referrer-policy"]).toBe("strict-origin-when-cross-origin");
  });

  test("parolele slabe sunt respinse la inregistrare", async ({ page }) => {
    for (const password of ["scurta12", "password", "12345678"]) {
      const res = await page.request.post("/api/auth/register", {
        data: { email: `weak-${Date.now()}@e2e.test`, password, name: "Test Slab" },
      });
      expect(res.status(), `parola respinsa: ${password}`).toBe(422);
    }
  });

  test("bruteforce la login e limitat dupa cateva incercari", async ({ page }) => {
    // email inexistent, unic: limita pe email se declanseaza prima si nu blocheaza
    // conturile reale folosite de celelalte teste
    const email = `bruteforce-${Date.now()}@e2e.test`;
    let sawRateLimit = false;
    for (let i = 0; i < 8; i++) {
      const res = await page.request.post("/api/auth/login", {
        data: { email, password: `gresita-${i}` },
      });
      if (res.status() === 429) {
        sawRateLimit = true;
        break;
      }
    }
    expect(sawRateLimit).toBe(true);
  });

  test("fluxul live nu expune id-urile utilizatorilor", async ({ page }) => {
    await page.goto("/ro/auctions");
    await page.getByTestId("auction-card").filter({ hasText: "Fulger Albastru" }).click();
    await page.waitForURL(/\/auctions\/[a-z0-9]+$/);
    const id = page.url().split("/").pop()!;

    // un observator nelogat plaseaza o oferta din alt cont si asculta stream-ul
    const events: string[] = [];
    const streamPromise = page.evaluate((auctionId) => {
      return new Promise<string[]>((resolve) => {
        const collected: string[] = [];
        const es = new EventSource(`/api/auctions/${auctionId}/stream`);
        es.onmessage = (e) => {
          collected.push(e.data);
          es.close();
          resolve(collected);
        };
        setTimeout(() => {
          es.close();
          resolve(collected);
        }, 8000);
      });
    }, id);

    const ctx = await page.context().browser()!.newContext({ locale: "ro-RO" });
    const bidder = await ctx.newPage();
    await login(bidder, "buyer1@nbp.test", "buyer1234");
    await bidder.request.post(`/api/auctions/${id}/bid`, { data: { maxCents: 120_000 } });
    await ctx.close();

    events.push(...(await streamPromise));
    expect(events.length).toBeGreaterThan(0);
    for (const raw of events) {
      expect(raw).not.toContain("leadingBidderId");
      expect(raw).not.toContain("winnerId");
      expect(raw).toContain("youAreLeading");
    }
  });
});
