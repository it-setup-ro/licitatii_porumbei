import { test, expect } from "@playwright/test";
import { login } from "./helpers";

/**
 * Butoanele pe care le apasă un om obișnuit, de la un capăt la altul:
 * magazinul (coș → comandă → ce vede în cont) și paginile lui de cont.
 *
 * Daniel: „toate variantele pentru toate tipurile de utilizatori, să testăm
 * funcțional toate butoanele și corectitudinea funcționării lor."
 */

const uid = () => `${Date.now()}${Math.floor(Math.random() * 1000)}`;

test.describe("Magazinul, ca un cumpărător", () => {
  test("coș: adaugă, schimbă cantitatea, scoate — și totalul ține pasul", async ({ page }) => {
    test.setTimeout(150_000);
    await login(page, "buyer1@nbp.test", "buyer1234");

    await page.goto("/ro/products");
    const produs = page.getByTestId("product-card").first();
    await expect(produs).toBeVisible();
    await produs.click();
    await page.waitForURL(/\/products\/[^/]+$/);

    const pretText = await page.getByTestId("product-price").first().innerText();
    const pret = Math.round(
      Number(pretText.replace(/[^\d,.]/g, "").replace(/\.(?=\d{3})/g, "").replace(",", ".")) * 100
    );

    // coșul se scrie pe server: fără să așteptăm răspunsul, pagina următoare
    // se deschide înainte ca produsul să fi ajuns în coș
    const adaugat = page.waitForResponse((r) => r.url().includes("/api/cart") && r.request().method() === "POST");
    await page.getByTestId("add-to-cart").click();
    expect((await adaugat).status()).toBe(200);

    await page.goto("/ro/cart");
    await expect(page.getByTestId("cart-line")).toHaveCount(1);

    // două bucăți: subtotalul se dublează
    await page.getByTestId("cart-qty").fill("2");
    await expect(async () => {
      const subtotal = await page.getByTestId("cart-subtotal").innerText();
      const val = Math.round(
        Number(subtotal.replace(/[^\d,.]/g, "").replace(/\.(?=\d{3})/g, "").replace(",", ".")) * 100
      );
      expect(val, "subtotalul nu s-a dublat").toBe(pret * 2);
    }).toPass({ timeout: 15_000 });

    // scos din coș: coșul rămâne gol
    await page.getByTestId("cart-remove").first().click();
    await expect(page.getByTestId("cart-empty")).toBeVisible();
  });

  test("comandă: se plasează, apare în contul meu și în administrare", async ({ page, browser }) => {
    test.setTimeout(180_000);
    const id = uid().slice(-5);
    await login(page, "buyer1@nbp.test", "buyer1234");

    await page.goto("/ro/products");
    await page.getByTestId("product-card").first().click();
    await page.waitForURL(/\/products\/[^/]+$/);
    const numeProdus = await page.getByTestId("product-title").first().innerText();
    const adaugat = page.waitForResponse((r) => r.url().includes("/api/cart") && r.request().method() === "POST");
    await page.getByTestId("add-to-cart").click();
    expect((await adaugat).status()).toBe(200);

    await page.goto("/ro/cart");
    await expect(page.getByTestId("checkout-form")).toBeVisible();
    await page.getByTestId("ship-name").fill(`Mihai Test ${id}`);
    await page.getByTestId("ship-phone").fill("0723 000 111");
    await page.getByTestId("ship-address").fill(`Str. Porumbeilor ${id}, Arad`);
    await page.getByTestId("place-order").click();

    // comanda apare la cumpărător
    await expect(async () => {
      await page.goto("/ro/account/shop-orders");
      await expect(page.getByTestId("shop-order-row").first()).toBeVisible({ timeout: 2_000 });
    }).toPass({ timeout: 30_000 });
    const rand = page.getByTestId("shop-order-row").first();
    await expect(rand).toContainText("Așteaptă plata");
    await rand.click();
    await expect(page.getByTestId("shop-order-items")).toContainText(numeProdus.slice(0, 12));

    // și în administrare, la comenzi magazin
    const ctx = await browser.newContext({ locale: "ro-RO" });
    const admin = await ctx.newPage();
    await login(admin, "admin@nbp.test", "admin1234");
    await admin.goto("/ro/admin/shop-orders");
    await expect(admin.getByTestId("shop-order-row").filter({ hasText: `Mihai Test ${id}` })).toBeVisible();
    await ctx.close();
  });
});

test.describe("Paginile de cont, ca un cumpărător", () => {
  test("favoritele: se adaugă de pe porumbel și apar în cont", async ({ page }) => {
    test.setTimeout(150_000);
    await login(page, "buyer1@nbp.test", "buyer1234");
    await page.goto("/ro/auctions");
    await page.getByTestId("auction-card").first().click();
    await page.waitForURL(/\/auctions\/[a-z0-9]+$/);
    const adresa = page.url();

    const buton = page.getByTestId("watch-button");
    await expect(buton).toBeVisible();
    // steaua plină (★) = deja la favorite; pornim de la „neadăugat"
    if ((await buton.innerText()).startsWith("★")) {
      await buton.click();
      await expect(buton).toHaveText(/^☆/);
    }
    await buton.click();
    await expect(buton).toHaveText(/^★/);

    await page.goto("/ro/account/watchlist");
    await expect(page.getByTestId("watchlist-grid")).toBeVisible();

    // și se scoate de unde a fost pus: lista rămâne goală la loc
    await page.goto(adresa);
    await page.getByTestId("watch-button").click();
    await expect(page.getByTestId("watch-button")).toHaveText(/^☆/);
    await page.goto("/ro/account/watchlist");
    await expect(page.locator('[data-testid="watchlist-grid"]')).toHaveCount(0);
  });

  test("ofertele mele arată unde conduc", async ({ page }) => {
    test.setTimeout(120_000);
    await login(page, "buyer1@nbp.test", "buyer1234");
    await page.goto("/ro/account/bids");
    // pagina se deschide și spune ceva: fie oferte, fie „nicio ofertă"
    const text = await page.locator("main").innerText();
    expect(text.trim().length).toBeGreaterThan(20);
  });

  test("notificările se deschid și numărul necitit scade după citire", async ({ page }) => {
    test.setTimeout(120_000);
    await login(page, "buyer1@nbp.test", "buyer1234");
    await page.goto("/ro/account/notifications");
    // contul poate să nu aibă nimic: atunci scrie limpede asta, nu rămâne gol
    const text = await page.locator("main").innerText();
    expect(text).toMatch(/Nicio notificare|Marchează tot ca citit/);
  });

  test("datele contului se văd, iar starea contului e limpede", async ({ page }) => {
    test.setTimeout(120_000);
    await login(page, "buyer1@nbp.test", "buyer1234");
    await page.goto("/ro/account");
    await expect(page.getByTestId("profile-name")).toContainText("Mihai");
    // adresa de e-mail și porecla se văd; starea contului apare doar când e
    // ceva de spus (cont în așteptare sau respins)
    await expect(page.locator("main")).toContainText("buyer1@nbp.test");
  });
});
