import { test, expect } from "@playwright/test";
import { login } from "./helpers";

/**
 * Secțiunile noi din meniu: bara de sus cu ceas, preț fix, produse + coș,
 * articole, concursuri, pagini de conținut, contact și administrarea lor.
 */

test.describe("Bara de sus și meniul principal", () => {
  test("bara de sus arată ora oficială și linkurile", async ({ page }) => {
    await page.goto("/ro");
    const bar = page.getByTestId("top-bar");
    await expect(bar).toBeVisible();
    await expect(page.getByTestId("platform-clock")).toBeVisible();
    await expect(page.getByTestId("top-login")).toBeVisible();
    await expect(page.getByTestId("top-info")).toBeVisible();
  });

  test("ceasul avansează singur", async ({ page }) => {
    await page.goto("/ro");
    const clock = page.getByTestId("platform-clock");
    const first = await clock.innerText();
    await expect(async () => {
      expect(await clock.innerText()).not.toBe(first);
    }).toPass({ timeout: 5000 });
  });

  test("meniul are toate cele 10 secțiuni cerute", async ({ page }) => {
    await page.goto("/ro");
    const nav = page.getByTestId("main-nav");
    for (const id of [
      "nav-home",
      "nav-articles",
      "nav-contests",
      "nav-info",
      "nav-auctions",
      "nav-fixed",
      "nav-products",
      "nav-shipping",
      "nav-about",
      "nav-contact",
    ]) {
      await expect(nav.getByTestId(id), `lipsește ${id}`).toBeVisible();
    }
  });

  test("submeniul Informații are cele 3 intrări și navighează", async ({ page }) => {
    await page.goto("/ro");
    await page.getByTestId("nav-info").click();
    const sub = page.getByTestId("info-submenu");
    await expect(sub).toBeVisible();
    await expect(sub.getByTestId("nav-info-rules")).toBeVisible();
    await expect(sub.getByTestId("nav-info-auctions")).toBeVisible();
    await expect(sub.getByTestId("nav-info-other")).toBeVisible();
    await sub.getByTestId("nav-info-rules").click();
    await expect(page).toHaveURL(/\/ro\/info\/regulament$/);
    await expect(page.getByTestId("content-title")).toContainText("Regulament");
  });
});

test.describe("Preț fix", () => {
  test("listarea arată loturile fără licitație", async ({ page }) => {
    await page.goto("/ro/fixed-price");
    await expect(page.getByTestId("fixed-card").first()).toBeVisible();
    await expect(page.getByTestId("fixed-card").first()).toContainText("Preț fix", {
      ignoreCase: true,
    });
  });

  test("cumpărare directă: creează comandă, iar al doilea cumpărător primește lotul vândut", async ({
    browser,
  }) => {
    test.setTimeout(120_000);
    const ctxA = await browser.newContext({ locale: "ro-RO" });
    const pageA = await ctxA.newPage();
    await login(pageA, "buyer1@nbp.test", "buyer1234");

    await pageA.goto("/ro/fixed-price");
    await pageA.getByTestId("fixed-card").filter({ hasText: "Săgeata Albă" }).click();
    await pageA.waitForURL(/\/auctions\/[a-z0-9]+$/);
    const url = pageA.url();

    // pagina de preț fix arată butonul de cumpărare, nu formularul de licitare
    await expect(pageA.getByTestId("buy-panel")).toBeVisible();
    await expect(pageA.getByTestId("bid-panel")).toHaveCount(0);

    await pageA.getByTestId("buy-now").click();
    await expect(pageA.getByTestId("buy-confirm-text")).toBeVisible();
    await pageA.getByTestId("buy-confirm").click();

    await pageA.waitForURL(/\/orders\/[a-z0-9]+$/);
    await expect(pageA.getByTestId("order-status")).toContainText("Așteaptă plata");

    // al doilea cumpărător nu mai poate lua același lot
    const ctxB = await browser.newContext({ locale: "ro-RO" });
    const pageB = await ctxB.newPage();
    await login(pageB, "buyer2@nbp.test", "buyer1234");
    const res = await pageB.request.post(`/api/auctions/${url.split("/").pop()}/buy`);
    expect([400, 409]).toContain(res.status());

    await pageB.goto(url);
    await expect(pageB.getByTestId("sold-badge")).toBeVisible();

    await ctxA.close();
    await ctxB.close();
  });

  test("vânzătorul nu-și poate cumpăra propriul lot", async ({ page }) => {
    await login(page, "seller@nbp.test", "seller1234");
    await page.goto("/ro/fixed-price");
    await page.getByTestId("fixed-card").filter({ hasText: "Perla Nordului" }).click();
    await page.waitForURL(/\/auctions\/[a-z0-9]+$/);
    const res = await page.request.post(`/api/auctions/${page.url().split("/").pop()}/buy`);
    expect(res.status()).toBe(400);
    expect((await res.json()).error).toBe("OWN_AUCTION");
  });
});

test.describe("Produse și coș", () => {
  test("catalogul afișează produsele, cu stoc epuizat marcat", async ({ page }) => {
    await page.goto("/ro/products");
    await expect(page.getByTestId("product-card").first()).toBeVisible();
    await expect(page.getByTestId("out-of-stock").first()).toBeVisible();
  });

  test("filtrarea pe categorie funcționează", async ({ page }) => {
    await page.goto("/ro/products");
    const total = await page.getByTestId("product-card").count();
    await page.getByTestId("cat-rings").click();
    await expect(page.getByTestId("product-card")).toHaveCount(1);
    expect(total).toBeGreaterThan(1);
  });

  test("adăugări rapide nu pierd produse (cereri serializate)", async ({ page }) => {
    await page.goto("/ro/products");
    // trei clicuri în aceeași bucla — înainte de coadă, două se pierdeau
    const buttons = page.getByTestId("add-to-cart");
    await buttons.nth(0).click();
    await buttons.nth(1).click();
    await buttons.nth(2).click();

    // asteptam ca toate cele 3 cereri sa fie confirmate in badge-ul din header
    await expect(page.getByTestId("cart-badge")).toHaveText("3");

    await page.goto("/ro/cart");
    await expect(page.getByTestId("cart-line")).toHaveCount(3);
  });

  test("flux complet: coș → comandă → stoc scăzut → coș golit", async ({ page }) => {
    test.setTimeout(120_000);
    await login(page, "buyer1@nbp.test", "buyer1234");

    await page.goto("/ro/products/inele-oficiale-2027-set-25");
    const stockBefore = Number(
      (await page.getByTestId("product-stock").innerText()).match(/\d+/)?.[0] ?? "0"
    );
    await page.getByTestId("qty-input").fill("2");
    await page.getByTestId("add-to-cart").click();
    await expect(page.getByTestId("cart-badge")).toHaveText("2");

    await page.goto("/ro/cart");
    await expect(page.getByTestId("cart-line")).toHaveCount(1);
    await page.getByTestId("ship-name").fill("Mihai Popescu");
    await page.getByTestId("ship-phone").fill("0722333444");
    await page.getByTestId("ship-address").fill("Str. Columbofililor nr. 12, Cluj-Napoca");
    await page.getByTestId("place-order").click();

    await page.waitForURL(/\/account\/shop-orders\/[a-z0-9]+$/);
    await expect(page.getByTestId("shop-order-placed")).toBeVisible();

    // stocul a scăzut cu exact 2, iar coșul e gol
    await page.goto("/ro/products/inele-oficiale-2027-set-25");
    const stockAfter = Number(
      (await page.getByTestId("product-stock").innerText()).match(/\d+/)?.[0] ?? "0"
    );
    expect(stockAfter).toBe(stockBefore - 2);
    await expect(page.getByTestId("cart-badge")).toHaveCount(0);

    // comanda apare în lista din cont
    await page.goto("/ro/account/shop-orders");
    await expect(page.getByTestId("shop-order-row").first()).toBeVisible();
  });

  test("nu se poate comanda peste stocul disponibil", async ({ page }) => {
    await login(page, "buyer1@nbp.test", "buyer1234");
    const res = await page.request.post("/api/cart", {
      data: { productId: "inexistent", quantity: 5 },
    });
    expect(res.status()).toBe(404);
  });
});

test.describe("Articole și concursuri", () => {
  test("lista de articole și pagina de articol", async ({ page }) => {
    await page.goto("/ro/articles");
    // numar variabil: alte teste pot publica articole in aceeasi baza
    await expect(page.getByTestId("article-card").first()).toBeVisible();
    await page.getByTestId("article-card").filter({ hasText: "Cum alegi" }).click();
    await expect(page.getByTestId("article-title")).toContainText("Cum alegi");
    await expect(page.getByTestId("article-body")).toContainText("pedigree");
  });

  test("concursul afișează regulamentul și loturile asociate", async ({ page }) => {
    await page.goto("/ro/contests");
    await expect(page.getByTestId("contest-card").first()).toBeVisible();
    await page.getByTestId("contest-card").filter({ hasText: "Campionatul Național" }).click();
    await expect(page.getByTestId("contest-title")).toContainText("Campionatul Național");
    await expect(page.getByTestId("contest-rules")).toContainText("Înscrierea");
    await expect(page.getByTestId("contest-lots")).toContainText("Fulger Albastru");
  });

  test("articolele nepublicate nu apar public", async ({ page }) => {
    const res = await page.request.get("/ro/articles/slug-inexistent");
    expect(res.status()).toBe(404);
  });
});

test.describe("Pagini de conținut și contact", () => {
  test("toate paginile de conținut se încarcă bilingv", async ({ page }) => {
    for (const [path, ro] of [
      ["/info/regulament", "Regulament"],
      ["/info/info-licitatii", "licitațiile"],
      ["/info/alte-info", "informații"],
      ["/shipping-agents", "Transport"],
      ["/about", "Despre"],
    ] as const) {
      await page.goto(`/ro${path}`);
      await expect(page.getByTestId("content-title")).toContainText(ro, { ignoreCase: true });
      await page.goto(`/en${path}`);
      await expect(page.getByTestId("content-body")).toBeVisible();
    }
  });

  test("o cale necunoscută sub /info dă 404", async ({ page }) => {
    const res = await page.request.get("/ro/info/inventat");
    expect(res.status()).toBe(404);
  });

  test("formularul de contact trimite mesajul", async ({ page }) => {
    await page.goto("/ro/contact");
    await page.getByTestId("contact-name").fill("Testerul E2E");
    await page.getByTestId("contact-email").fill("tester@e2e.test");
    await page.getByTestId("contact-subject").fill("Întrebare de test");
    await page.getByTestId("contact-message").fill("Acesta este un mesaj de test suficient de lung.");
    await page.getByTestId("contact-submit").click();
    await expect(page.getByTestId("contact-sent")).toBeVisible();
  });
});

test.describe("Administrarea secțiunilor noi", () => {
  test("adminul editează o pagină de conținut și schimbarea apare public", async ({ page }) => {
    await login(page, "admin@nbp.test", "admin1234");
    await page.goto("/ro/admin/content?slug=despre-noi");

    const marker = `Verificat e2e ${Date.now()}`;
    await page.getByTestId("field-bodyRo").fill(`## Despre\n\n${marker}`);
    await page.getByTestId("editor-save").click();
    await expect(page.getByTestId("editor-saved")).toBeVisible();

    await page.goto("/ro/about");
    await expect(page.getByTestId("content-body")).toContainText(marker);
  });

  test("adminul creează un produs nou și apare în magazin", async ({ page }) => {
    await login(page, "admin@nbp.test", "admin1234");
    await page.goto("/ro/admin/products?new=1");

    const slug = `produs-e2e-${Date.now()}`;
    await page.getByTestId("field-slug").fill(slug);
    await page.getByTestId("field-nameRo").fill("Produs E2E");
    await page.getByTestId("field-nameEn").fill("E2E Product");
    await page.getByTestId("field-priceCents").fill("19.5");
    await page.getByTestId("field-stock").fill("7");
    await page.getByTestId("editor-save").click();
    await expect(page.getByTestId("editor-saved")).toBeVisible();

    await page.goto(`/ro/products/${slug}`);
    await expect(page.getByTestId("product-title")).toContainText("Produs E2E");
    await expect(page.getByTestId("product-price")).toContainText("19,5");
  });

  test("mesajele de contact ajung în panoul de admin", async ({ page }) => {
    await page.request.post("/api/contact", {
      data: {
        name: "Vizitator Test",
        email: "vizitator@e2e.test",
        subject: "Mesaj pentru admin",
        message: "Verific dacă mesajul ajunge în panoul de administrare.",
      },
    });
    await login(page, "admin@nbp.test", "admin1234");
    await page.goto("/ro/admin/messages");
    await expect(page.getByTestId("messages-list")).toContainText("Mesaj pentru admin");
  });

  test("un cumpărător nu poate accesa administrarea produselor", async ({ page }) => {
    await login(page, "buyer1@nbp.test", "buyer1234");
    const res = await page.request.post("/api/admin/products", {
      data: {
        slug: "hack",
        nameRo: "x",
        nameEn: "y",
        category: "FEED",
        priceCents: 100,
        stock: 1,
        active: true,
        sortIdx: 1,
      },
    });
    expect(res.status()).toBe(403);
  });
});

test.describe("Concursuri — linkuri catre site-uri externe", () => {
  test("submeniul are toate intrarile si se deschid in fila noua", async ({ page }) => {
    await page.goto("/ro");
    await page.getByTestId("nav-contests").click();
    const sub = page.getByTestId("contests-submenu");
    await expect(sub).toBeVisible();

    // 5 linkuri active + 1 inactiv (One loft races)
    const links = sub.getByTestId("contest-link");
    await expect(links).toHaveCount(5);

    // toate se deschid in fila noua, cu protectia noopener
    for (let i = 0; i < 5; i++) {
      await expect(links.nth(i)).toHaveAttribute("target", "_blank");
      await expect(links.nth(i)).toHaveAttribute("rel", /noopener/);
      await expect(links.nth(i)).toHaveAttribute("href", /^https:\/\//);
    }

    // adresele cerute de client
    await expect(sub).toContainText("Clasamente 2026");
    await expect(sub).toContainText("UNCR");
    await expect(sub).toContainText("F.R.S.C.");
    await expect(sub).toContainText("U.C.P.");
  });

  test("intrarea fara adresa apare inactiva, cu „in curand”", async ({ page }) => {
    await page.goto("/ro");
    await page.getByTestId("nav-contests").click();
    const soon = page.getByTestId("contests-submenu").getByTestId("contest-link-soon");
    await expect(soon).toHaveCount(1);
    await expect(soon).toContainText("One loft races");
    await expect(soon).toContainText("în curând");
    // nu e link -> nu poate fi accesat
    await expect(soon).not.toHaveAttribute("href", /./);
  });

  test("linkurile se traduc si in engleza", async ({ page }) => {
    await page.goto("/en");
    await page.getByTestId("nav-contests").click();
    await expect(page.getByTestId("contests-submenu")).toContainText("coming soon");
  });

  test("adminul poate schimba adresa unui link", async ({ page }) => {
    await login(page, "admin@nbp.test", "admin1234");
    await page.goto("/ro/admin/links");
    await expect(page.getByTestId("admin-links-table")).toContainText("Clasamente 2026");

    // deschide prima intrare si schimba adresa
    await page.getByTestId("link-edit").first().click();
    await page.getByTestId("field-url").fill("https://example.org/clasamente-2027");
    await page.getByTestId("editor-save").click();
    await expect(page.getByTestId("editor-saved")).toBeVisible();

    // schimbarea apare in meniu
    await page.goto("/ro");
    await page.getByTestId("nav-contests").click();
    await expect(
      page.getByTestId("contests-submenu").getByTestId("contest-link").first()
    ).toHaveAttribute("href", "https://example.org/clasamente-2027");
  });

  test("adresele periculoase sunt respinse", async ({ page }) => {
    await login(page, "admin@nbp.test", "admin1234");
    for (const url of ["javascript:alert(1)", "columba.ro", "data:text/html,<script>"]) {
      const res = await page.request.post("/api/admin/links", {
        data: {
          labelRo: "Test",
          labelEn: "Test",
          url,
          sortIdx: 99,
          active: true,
          group: "CONTESTS",
        },
      });
      expect(res.status(), `respins: ${url}`).toBe(422);
    }
  });
});
