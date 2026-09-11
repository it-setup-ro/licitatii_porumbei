import { test, expect } from "@playwright/test";
import { login } from "./helpers";

/**
 * Antetul si subsolul, dupa macheta clientului: deviza, casuta de cautare,
 * subsolul cu patru coloane. Cautarea trebuie sa duca undeva real — de aceea
 * se verifica si rezultatul, nu doar ca exista campul.
 */

test.describe("Antetul", () => {
  test("deviza sta in bara de sus, pe calculator", async ({ page }) => {
    await page.goto("/ro");
    await expect(page.getByTestId("top-tagline")).toContainText("O comunitate");
  });

  test("cautarea din antet duce in licitatii, cu termenul pastrat", async ({ page }) => {
    await page.goto("/ro");
    await page.getByTestId("header-search").fill("Fulger");
    await page.getByTestId("header-search").press("Enter");
    await page.waitForURL(/\/auctions\?q=Fulger/);
    await expect(page.getByTestId("auction-card").first()).toContainText("Fulger");
  });

  test("pe telefon cautarea sta in meniu, nu in antet", async ({ page }) => {
    await page.setViewportSize({ width: 375, height: 812 });
    await page.goto("/ro");
    await expect(page.getByTestId("header-search")).toBeHidden();
    await page.getByTestId("mobile-menu-button").click();
    await page.getByTestId("m-search").fill("Fulger");
    await page.getByTestId("m-search").press("Enter");
    await page.waitForURL(/\/auctions\?q=Fulger/);
  });
});

test.describe("Subsolul", () => {
  test("are coloanele si deviza", async ({ page }) => {
    await page.goto("/ro");
    const subsol = page.getByTestId("site-footer");
    await expect(subsol.getByTestId("footer-useful")).toContainText("Licitații");
    await expect(subsol.getByTestId("footer-info")).toContainText("Regulament");
    await expect(subsol.getByTestId("footer-motto")).toContainText("Campioni");
  });

  test("linkurile din subsol chiar deschid paginile", async ({ page }) => {
    await page.goto("/ro");
    await page.getByTestId("footer-info").getByText("Regulament").click();
    await page.waitForURL(/\/info\/regulament$/);
    await expect(page.locator("h1").first()).toBeVisible();
  });

  test("datele de contact vin din Setari, nu din cod", async ({ page }) => {
    await login(page, "admin@nbp.test", "admin1234");
    const seteaza = (email: string, telefon: string) =>
      page.request.post("/api/admin/settings", {
        data: { updates: { contactEmail: email, contactPhone: telefon } },
      });

    try {
      expect((await seteaza("contact@nbp.test", "0740 000 000")).ok()).toBe(true);
      await page.goto("/ro");
      const contact = page.getByTestId("footer-contact");
      await expect(contact.locator('a[href="mailto:contact@nbp.test"]')).toBeVisible();
      await expect(contact.locator('a[href="tel:0740000000"]')).toBeVisible();
    } finally {
      // le stergem la loc: fara ele, subsolul nu are ce afisa — si asta e ideea
      expect((await seteaza("", "")).ok()).toBe(true);
    }

    await page.goto("/ro");
    const contact = page.getByTestId("footer-contact");
    await expect(contact.locator('a[href^="mailto:"]')).toHaveCount(0);
    await expect(contact.getByTestId("footer-contact-page")).toBeVisible();
  });
});

test.describe("Crescătorii", () => {
  test("pagina de crescători arată cardurile cu poză și localitate", async ({ page }) => {
    await page.goto("/ro/sellers");
    await expect(page.getByTestId("sellers-title")).toContainText("Crescători");
    const card = page.getByTestId("seller-card").filter({ hasText: "Columbodromul Câmpeanu" });
    await expect(card).toBeVisible();
    await expect(card.getByTestId("seller-card-city")).toContainText("Arad");
    // poza vine de la un lot al lui, nu de la o crescatorie inventata
    await expect(card.locator("img")).toBeVisible();

    await card.click();
    await page.waitForURL(/\/sellers\/[a-z0-9]+$/);
    await expect(page.getByTestId("seller-name")).toContainText("Columbodromul Câmpeanu");
    await expect(page.getByTestId("seller-city")).toContainText("Arad");
  });

  test("linkul „Crescători” din subsol chiar duce acolo", async ({ page }) => {
    await page.goto("/ro");
    await page.getByTestId("footer-useful").getByText("Crescători").click();
    await page.waitForURL(/\/sellers$/);
    await expect(page.getByTestId("sellers-title")).toBeVisible();
  });

  test("cardul de pe prima pagină are poză, localitate și numărul de loturi", async ({ page }) => {
    await page.goto("/ro");
    const card = page.getByTestId("breeder-card").first();
    await expect(card).toBeVisible();
    await expect(card.getByTestId("breeder-photo")).toBeVisible();
    await expect(card).toContainText("la licitație");
  });

  test("crescătorul își poate corecta datele, dar nu IBAN-ul", async ({ page }) => {
    await login(page, "seller@nbp.test", "seller1234");
    await page.goto("/ro/account");
    await page.getByTestId("sp-open").click();
    await page.getByTestId("sp-city").fill("Arad");
    await expect(page.getByTestId("sp-form")).not.toContainText("IBAN");
    await page.getByTestId("sp-save").click();
    await expect(page.getByTestId("sp-done")).toBeVisible();

    // se si vede unde trebuie
    await page.goto("/ro/sellers");
    await expect(
      page.getByTestId("seller-card").filter({ hasText: "Columbodromul Câmpeanu" })
    ).toContainText("Arad");
  });

  test("un cumpărător nu poate schimba datele altui crescător", async ({ page }) => {
    await login(page, "buyer1@nbp.test", "buyer1234");
    const res = await page.request.post("/api/account/seller-profile", {
      data: { sellerCompany: "Preluare ostilă", sellerCity: "X", sellerBio: "" },
    });
    expect(res.status()).toBe(403);
  });
});

test.describe("Noutăți pe e-mail", () => {
  const adresa = () => `abonat-${Date.now()}@example.com`;

  test("nu se poate abona fără bifă, se poate cu ea", async ({ page }) => {
    await page.goto("/ro");
    const email = adresa();
    await page.getByTestId("newsletter-email").fill(email);

    // fara acord, butonul nu e apasabil — consimtamantul nu se presupune
    await expect(page.getByTestId("newsletter-submit")).toBeDisabled();
    await page.getByTestId("newsletter-consent").check();
    await expect(page.getByTestId("newsletter-submit")).toBeEnabled();
    await page.getByTestId("newsletter-submit").click();
    await expect(page.getByTestId("newsletter-done")).toBeVisible();

    // adresa ajunge in administrare, cu acordul ei
    await login(page, "admin@nbp.test", "admin1234");
    await page.goto("/ro/admin/newsletter");
    await expect(page.getByTestId("subscribers-table")).toContainText(email);
    await expect(page.getByTestId("newsletter-counts")).toContainText("activi");
  });

  test("serverul refuză o abonare fără acord, oricât de bine ar arăta cererea", async ({
    page,
  }) => {
    await page.goto("/ro");
    const res = await page.request.post("/api/newsletter", {
      data: { email: adresa(), consent: false, locale: "ro" },
    });
    expect(res.status()).toBe(422);
  });

  test("exportul CSV e doar pentru admin", async ({ page }) => {
    await page.goto("/ro");
    const anonim = await page.request.get("/api/admin/newsletter/export");
    expect(anonim.status(), "un vizitator nu descarcă lista").toBeGreaterThanOrEqual(400);

    await login(page, "admin@nbp.test", "admin1234");
    const res = await page.request.get("/api/admin/newsletter/export");
    expect(res.status()).toBe(200);
    expect(res.headers()["content-type"]).toContain("text/csv");
    expect(await res.text()).toContain("text_acord");
  });

  test("un link de dezabonare stricat spune asta, nu da eroare", async ({ page }) => {
    await page.goto("/ro/newsletter/unsubscribe?token=inventat-de-cineva");
    await page.getByTestId("unsub-button").click();
    await expect(page.getByTestId("unsub-bad")).toBeVisible();
  });
});

test.describe("Meniul, după machetă", () => {
  test("„Comunitate” adună paginile despre oameni", async ({ page }) => {
    await page.goto("/ro");
    await page.getByTestId("nav-community").click();
    const sub = page.getByTestId("community-submenu");
    await expect(sub.getByTestId("nav-community-articles")).toBeVisible();
    await expect(sub.getByTestId("nav-community-about")).toBeVisible();
    await sub.getByTestId("nav-community-breeders").click();
    await page.waitForURL(/\/sellers$/);
    await expect(page.getByTestId("sellers-title")).toBeVisible();
  });

  test("„Curse & Rezultate” e vechiul meniu de concursuri, cu linkurile lui", async ({ page }) => {
    await page.goto("/ro");
    const intrare = page.getByTestId("nav-contests");
    await expect(intrare).toContainText("Curse");
    await intrare.click();
    await expect(page.getByTestId("contests-submenu")).toBeVisible();
  });
});

test.describe("Banda de concurs", () => {
  test("arată destinația, distanța, îmbarcarea și lansarea", async ({ page }) => {
    await page.goto("/ro");
    const banda = page.getByTestId("contest-banner");
    await expect(banda.getByTestId("contest-destination")).toContainText("Nordhausen");
    await expect(banda).toContainText("1.000 KM");
    // codul tarii devine nume — pe Windows emoji-ul de steag nu are desen
    await expect(banda).toContainText("Germania");
    await expect(banda).toContainText("Îmbarcare");
    await expect(banda).toContainText("Lansare");
    await expect(banda.getByTestId("contest-cta")).toBeVisible();

    // banda intra in pagina, nu taie butonul
    const rand = banda.locator("div.flex").first();
    const { scroll, client } = await rand.evaluate((el) => ({
      scroll: el.scrollWidth,
      client: el.clientWidth,
    }));
    expect(scroll, "banda iese din cadru").toBeLessThanOrEqual(client + 1);
  });

  test("butonul duce la pagina concursului", async ({ page }) => {
    await page.goto("/ro");
    await page.getByTestId("contest-cta").click();
    await page.waitForURL(/\/contests\/[a-z0-9-]+$/);
    await expect(page.getByTestId("contest-title")).toBeVisible();
  });

  test("în engleză, rubricile se traduc", async ({ page }) => {
    await page.goto("/en");
    const banda = page.getByTestId("contest-banner");
    await expect(banda).toContainText("Release");
    await expect(banda).toContainText("Germany");
  });
});

test.describe("Concurs nou, din administrare", () => {
  test("formularul arată ce e obligatoriu și explică unde se vede", async ({ page }) => {
    await login(page, "admin@nbp.test", "admin1234");
    await page.goto("/ro/admin/contests?new=1");

    await expect(page.getByTestId("editor-help")).toContainText("Unde se vede");
    await expect(page.getByTestId("editor-required-note")).toContainText("obligatorii");

    // campurile cerute de server sunt si marcate in pagina
    for (const key of ["slug", "titleRo", "titleEn", "startsAt", "endsAt"]) {
      await expect(page.getByTestId(`field-${key}`), `lipsește * la ${key}`).toHaveAttribute(
        "required",
        ""
      );
    }
    // coperta se alege cu selectorul de fisiere, nu se scrie o adresa de mana
    await expect(page.getByTestId("record-editor")).toContainText("Poze JPG/PNG/WebP");
  });

  test("un concurs cu copertă o arată în listă și în pagina lui", async ({ page }) => {
    await login(page, "admin@nbp.test", "admin1234");
    const slug = `test-e2e-${Date.now()}`;
    const zi = 86_400_000;
    const res = await page.request.post("/api/admin/contests", {
      data: {
        slug,
        titleRo: "Concurs cu copertă",
        titleEn: "Contest with cover",
        startsAt: new Date(Date.now() + 30 * zi).toISOString(),
        endsAt: new Date(Date.now() + 60 * zi).toISOString(),
        status: "UPCOMING",
        published: true,
        coverUrl: "/pigeons/hero-client.jpg",
      },
    });
    expect((await res.json()).ok).toBe(true);

    await page.goto("/ro/contests");
    const card = page.getByTestId("contest-card").filter({ hasText: "Concurs cu copertă" });
    await expect(card.getByTestId("contest-card-cover")).toBeVisible();

    await card.click();
    await page.waitForURL(new RegExp(`/contests/${slug}$`));
    await expect(page.getByTestId("contest-cover")).toBeVisible();
  });

  test("o adresă de poză din afara site-ului e refuzată", async ({ page }) => {
    await login(page, "admin@nbp.test", "admin1234");
    const res = await page.request.post("/api/admin/contests", {
      data: {
        slug: `test-extern-${Date.now()}`,
        titleRo: "Copertă externă",
        titleEn: "External cover",
        startsAt: new Date().toISOString(),
        endsAt: new Date(Date.now() + 86_400_000).toISOString(),
        status: "UPCOMING",
        published: false,
        coverUrl: "https://example.com/poza.jpg",
      },
    });
    expect(res.status()).toBe(422);
  });
});

test.describe("Drumul până la concursuri", () => {
  test("din meniu: Curse & Rezultate → Concursurile noastre", async ({ page }) => {
    await page.goto("/ro");
    await page.getByTestId("nav-contests").click();
    await page.getByTestId("nav-our-contests").click();
    await page.waitForURL(/\/contests$/);
    await expect(page.getByTestId("contest-card").first()).toBeVisible();
  });

  test("și din subsol", async ({ page }) => {
    await page.goto("/ro");
    await page.getByTestId("footer-useful").getByText("Concursurile noastre").click();
    await page.waitForURL(/\/contests$/);
  });
});

test.describe("Când ceva e greșit în formular", () => {
  test("serverul spune care câmp și de ce, nu doar „datele nu sunt valide”", async ({ page }) => {
    await login(page, "admin@nbp.test", "admin1234");
    const res = await page.request.post("/api/admin/contests", {
      data: {
        slug: "Concursul-Daniel-2026", // majuscule: exact greșeala tipică
        titleRo: "Concursul Daniel",
        titleEn: "Daniel contest",
        startsAt: new Date().toISOString(),
        endsAt: new Date(Date.now() + 86_400_000).toISOString(),
        status: "ACTIVE",
        published: false,
      },
    });
    expect(res.status()).toBe(422);
    const body = await res.json();
    expect(body.fields.slug, "explicația trebuie să fie la obiect").toContain("litere mici");
  });

  test("slug-ul se curăță singur în timp ce scrii", async ({ page }) => {
    await login(page, "admin@nbp.test", "admin1234");
    await page.goto("/ro/admin/contests?new=1");
    await page.getByTestId("field-slug").fill("Concursul Daniel 2026");
    await expect(page.getByTestId("field-slug")).toHaveValue("concursul-daniel-2026");
    // și diacriticele
    await page.getByTestId("field-slug").fill("Cupa de Primăvară");
    await expect(page.getByTestId("field-slug")).toHaveValue("cupa-de-primavara");
  });

  test("greșeala apare sub câmpul vinovat, cu chenar roșu", async ({ page }) => {
    await login(page, "admin@nbp.test", "admin1234");
    await page.goto("/ro/admin/contests?new=1");

    await page.getByTestId("field-slug").fill(`test-date-${Date.now()}`);
    await page.getByTestId("field-titleRo").fill("Cu datele pe dos");
    await page.getByTestId("field-titleEn").fill("Dates reversed");
    // sfarsitul inaintea inceputului
    await page.getByTestId("field-startsAt").fill("2026-10-11T16:53");
    await page.getByTestId("field-endsAt").fill("2026-09-11T16:53");
    await page.getByTestId("editor-save").click();

    await expect(page.getByTestId("field-error-endsAt")).toContainText("după cea de început");
    await expect(page.getByTestId("editor-error")).toContainText("Se încheie la");

    // se repara si eroarea dispare
    await page.getByTestId("field-endsAt").fill("2026-12-11T16:53");
    await expect(page.getByTestId("field-error-endsAt")).toHaveCount(0);
  });
});

test.describe("Care concurs ajunge pe prima pagină", () => {
  const zi = 86_400_000;

  async function creeaza(
    page: import("@playwright/test").Page,
    date: Record<string, unknown>
  ) {
    const res = await page.request.post("/api/admin/contests", { data: date });
    expect((await res.json()).ok, JSON.stringify(date)).toBe(true);
  }

  test("cel ales din administrare bate regula automată", async ({ page }) => {
    await login(page, "admin@nbp.test", "admin1234");
    const acum = Date.now();
    const alesSlug = `ales-${acum}`;

    // unul in desfasurare, care ar castiga automat
    await creeaza(page, {
      slug: `curge-${acum}`,
      titleRo: "Concurs în desfășurare",
      titleEn: "Running contest",
      startsAt: new Date(acum - 2 * zi).toISOString(),
      endsAt: new Date(acum + 5 * zi).toISOString(),
      status: "ACTIVE",
      published: true,
      destination: "Aiud",
    });
    // si unul viitor, ales anume pentru banda
    await creeaza(page, {
      slug: alesSlug,
      titleRo: "Concursul ales",
      titleEn: "Chosen contest",
      startsAt: new Date(acum + 20 * zi).toISOString(),
      endsAt: new Date(acum + 40 * zi).toISOString(),
      status: "UPCOMING",
      published: true,
      featured: true,
      destination: "Ostenda",
    });

    await page.goto("/ro");
    await expect(page.getByTestId("contest-destination")).toHaveText("Ostenda");

    // in administrare se vede care e pe prima pagina, fara sa deschizi site-ul
    await page.goto("/ro/admin/contests");
    const rand = page.locator("tr").filter({ hasText: "Concursul ales" });
    await expect(rand.getByTestId("contest-on-home")).toBeVisible();
  });

  test("alegerea e una singură: noul ales îl stinge pe cel vechi", async ({ page }) => {
    await login(page, "admin@nbp.test", "admin1234");
    const acum = Date.now();
    await creeaza(page, {
      slug: `primul-ales-${acum}`,
      titleRo: "Primul ales",
      titleEn: "First chosen",
      startsAt: new Date(acum + 2 * zi).toISOString(),
      endsAt: new Date(acum + 9 * zi).toISOString(),
      status: "UPCOMING",
      published: true,
      featured: true,
      destination: "Praga",
    });
    await creeaza(page, {
      slug: `al-doilea-ales-${acum}`,
      titleRo: "Al doilea ales",
      titleEn: "Second chosen",
      startsAt: new Date(acum + 3 * zi).toISOString(),
      endsAt: new Date(acum + 10 * zi).toISOString(),
      status: "UPCOMING",
      published: true,
      featured: true,
      destination: "Viena",
    });

    await page.goto("/ro/admin/contests");
    await expect(page.getByTestId("contest-on-home")).toHaveCount(1);
    await expect(
      page.locator("tr").filter({ hasText: "Al doilea ales" }).getByTestId("contest-on-home")
    ).toBeVisible();
  });

  test("o ciornă nu ajunge nicăieri", async ({ page }) => {
    await login(page, "admin@nbp.test", "admin1234");
    const slug = `ciorna-${Date.now()}`;
    await creeaza(page, {
      slug,
      titleRo: "Ciornă de concurs",
      titleEn: "Draft contest",
      startsAt: new Date().toISOString(),
      endsAt: new Date(Date.now() + 5 * zi).toISOString(),
      status: "ACTIVE",
      published: false,
      featured: true,
      destination: "Ascunsul",
    });

    await page.goto("/ro/contests");
    await expect(page.getByTestId("contest-card").filter({ hasText: "Ciornă" })).toHaveCount(0);
    await page.goto("/ro");
    await expect(page.getByTestId("contest-banner")).not.toContainText("Ascunsul");
  });
});
