import { test, expect } from "@playwright/test";
import { login } from "./helpers";

/**
 * Uneltele cerute după verificarea site-ului: comenzile din magazin, jurnalul
 * de e-mailuri cu retrimitere, ștergerile din administrare și paginarea.
 */

test.describe("Unelte de administrare", () => {
  test("paginile noi se deschid și au ce trebuie", async ({ page }) => {
    await login(page, "admin@nbp.test", "admin1234");

    await page.goto("/ro/admin/shop-orders");
    await expect(page.locator("h1")).toContainText("Comenzi magazin");
    await expect(page.getByTestId("shop-tab-pending_payment")).toBeVisible();
    await expect(page.getByTestId("shop-search")).toBeVisible();

    await page.goto("/ro/admin/emails");
    await expect(page.locator("h1")).toContainText("E-mailuri");
    await expect(page.getByTestId("emails-tab-failed")).toBeVisible();
    await expect(page.getByTestId("emails-search")).toBeVisible();

    await page.goto("/ro/admin/fixed-price");
    await expect(page.locator("h1")).toContainText("Preț fix");

    await page.goto("/ro/admin/audit");
    await expect(page.locator("h1")).toBeVisible();
  });

  test("un e-mail din jurnal se poate trimite din nou", async ({ page }) => {
    await login(page, "admin@nbp.test", "admin1234");
    await page.goto("/ro/admin/emails");

    const randuri = page.getByTestId("email-row");
    if ((await randuri.count()) === 0) {
      await expect(page.getByTestId("emails-empty")).toBeVisible();
      return;
    }
    await randuri.first().locator("summary").click();
    await randuri.first().getByTestId("email-resend").click();
    // fără SMTP pornit în teste, răspunsul spune că n-a plecat — dar butonul lucrează
    await expect(randuri.first().getByTestId("email-resend-result")).toBeVisible();
  });

  test("un link din meniu se poate șterge definitiv", async ({ page }) => {
    await login(page, "admin@nbp.test", "admin1234");

    const creat = await page.request.post("/api/admin/links", {
      data: {
        group: "CONTESTS",
        labelRo: "Link de test pentru ștergere",
        labelEn: "Test link",
        url: "https://example.com/de-sters",
        sortIdx: 95,
        active: false,
      },
    });
    expect(creat.ok()).toBe(true);
    const { id } = await creat.json();

    const sters = await page.request.delete(`/api/admin/links/${id}`);
    expect(sters.ok()).toBe(true);

    // a doua oară nu mai există
    const dinNou = await page.request.delete(`/api/admin/links/${id}`);
    expect(dinNou.status()).toBe(404);
  });

  test("un cumpărător se poate bloca și debloca", async ({ page }) => {
    await login(page, "admin@nbp.test", "admin1234");
    await page.goto("/ro/admin/users");

    // căutăm un cumpărător din baza de test
    await page.getByTestId("users-search").fill("buyer");
    await page.getByTestId("users-search").press("Enter");

    const rand = page.getByTestId("user-row").first();
    if ((await page.getByTestId("user-row").count()) === 0) return;

    const actiuni = rand.getByTestId("user-row-actions-toggle");
    if ((await actiuni.count()) === 0) return; // e administrator: nu se blochează

    const eticheta = (await actiuni.innerText()).trim();
    await actiuni.click();
    await expect(rand.getByTestId("user-row-actions-toggle")).not.toHaveText(eticheta);

    // înapoi cum era, ca să nu stricăm celelalte teste
    await rand.getByTestId("user-row-actions-toggle").click();
    await expect(rand.getByTestId("user-row-actions-toggle")).toHaveText(eticheta);
  });

  /**
   * Daniel: „unde se setează datele de SMTP… fă locul evident în administrare,
   * că uităm de situație”. În teste nu e configurat niciun serviciu, deci
   * trebuie să se vadă limpede asta, împreună cu pașii.
   */
  test("starea trimiterii de e-mailuri se vede sus, cu formularul de conectare", async ({ page }) => {
    await login(page, "admin@nbp.test", "admin1234");
    await page.goto("/ro/admin/emails");
    const caseta = page.getByTestId("email-setup");
    await expect(caseta).toBeVisible();
    await expect(caseta.getByTestId("email-setup-missing")).toBeVisible();
    await expect(caseta.getByTestId("email-config-form")).toBeVisible();
    await expect(caseta).toContainText("Gmail");
    // fără configurare nu are rost butonul de probă
    await expect(page.locator('[data-testid="email-test-send"]')).toHaveCount(0);

    // iar proba cerută prin API spune limpede de ce nu merge
    const res = await page.request.post("/api/admin/email-test", {
      data: { to: "cineva@e2e.test" },
    });
    expect(res.status()).toBe(409);
    expect((await res.json()).error).toBe("SMTP_NECONFIGURAT");
  });

  /**
   * Daniel: „tot nu văd unde se scriu datele de Google ca să trimită acum
   * mailuri”. Se scriu din administrare; parola se păstrează criptată și nu
   * se mai întoarce niciodată în pagină.
   */
  test("datele serviciului de e-mail se scriu din administrare", async ({ page }) => {
    test.setTimeout(120_000);
    await login(page, "admin@nbp.test", "admin1234");
    // pornim de la zero, ca testul să nu depindă de ce a rămas de la alții
    await page.request.delete("/api/admin/email-config");

    await page.goto("/ro/admin/emails");
    await expect(page.getByTestId("email-setup-missing")).toBeVisible();

    // formularul e deschis de la sine cât timp nu e nimic configurat
    const formular = page.getByTestId("email-config-form");
    await expect(formular).toBeVisible();
    await expect(formular).toContainText("Parole pentru aplicații");

    // Gmail e prima variantă și completează singură serverul
    await page.getByTestId("smtp-preset-GMAIL").click();
    await expect(page.getByTestId("smtp-host")).toHaveValue("smtp.gmail.com");

    // scriem datele prin API: un server care refuză imediat, ca proba să fie rapidă
    const salvat = await page.request.post("/api/admin/email-config", {
      data: {
        provider: "OTHER",
        host: "127.0.0.1",
        port: 1,
        user: "licitatii@exemplu.ro",
        pass: "parola-de-test",
        fromEmail: "licitatii@exemplu.ro",
        fromName: "No.1 & Best Pigeons",
      },
    });
    expect((await salvat.json()).ok).toBe(true);

    // acum starea spune că e configurat, și de unde
    await page.reload();
    await expect(page.getByTestId("email-setup-ok")).toContainText("scrise aici");
    await expect(page.getByTestId("email-setup-ok")).toContainText("licitatii@exemplu.ro");

    // parola nu se întoarce niciodată în pagină
    const html = await page.content();
    expect(html).not.toContain("parola-de-test");

    // proba spune limpede că serverul de e-mail nu răspunde
    const proba = await page.request.post("/api/admin/email-test", {
      data: { to: "cineva@e2e.test" },
    });
    expect(proba.status()).toBe(502);

    // ștergem, ca baza de test să rămână curată pentru celelalte teste
    const sters = await page.request.delete("/api/admin/email-config");
    expect((await sters.json()).ok).toBe(true);
    await page.reload();
    await expect(page.getByTestId("email-setup-missing")).toBeVisible();
  });
});
