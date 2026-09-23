import { test, expect } from "@playwright/test";
import { execSync } from "child_process";
import path from "path";
import { login } from "./helpers";
import { TEST_DATABASE_URL } from "../../playwright.config";

/**
 * Anunțurile pentru administrator: ce cere atenția nu mai așteaptă nevăzut.
 *
 * Daniel: „când cineva face cerere de cont se trimite mail?” — nu se trimitea.
 * Aici se verifică lanțul întreg: adaugi un destinatar, se întâmplă ceva pe
 * site, anunțul pleacă.
 */

const uid = () => `${Date.now()}${Math.floor(Math.random() * 1000)}`;

function emails(address: string): { subject: string; body: string }[] {
  const root = path.resolve(__dirname, "../..");
  const out = execSync(`npx tsx tests/e2e/fixtures/email-log.ts ${address}`, {
    cwd: root,
    env: { ...process.env, DATABASE_URL: TEST_DATABASE_URL },
  }).toString();
  const line = out.split(/\r?\n/).filter((l) => l.trim().startsWith("[")).pop()!;
  return JSON.parse(line);
}

test.describe("Anunțuri pentru administrator", () => {
  test("un destinatar pe e-mail primește ce cere atenția adminului", async ({ page }) => {
    test.setTimeout(150_000);
    const id = uid();
    const adresa = `anunturi-${id}@e2e.test`;

    await login(page, "admin@nbp.test", "admin1234");
    await page.goto("/ro/admin/alerts");
    await expect(page.getByTestId("alerts-panel")).toBeVisible();

    // adaugă adresa
    await page.getByTestId("alerts-email-label").fill(`Test ${id.slice(-5)}`);
    await page.getByTestId("alerts-email-address").fill(adresa);
    await page.getByTestId("alerts-email-add").click();
    const rand = page.getByTestId("alerts-row").filter({ hasText: adresa });
    await expect(rand).toBeVisible();

    // „Trimite test" spune pe loc dacă legătura merge
    await rand.getByTestId("alerts-test").click();
    await expect(page.getByTestId("alerts-message")).toBeVisible();
    await expect(async () => {
      expect(emails(adresa).some((e) => e.subject.includes("Test anunțuri"))).toBe(true);
    }).toPass({ timeout: 20_000 });

    // cineva scrie prin formularul de contact: anunțul pleacă singur
    // (pe contul nou nu se poate verifica aici — în teste aprobarea e oprită,
    // deci înscrierea nu lasă nicio cerere în așteptare)
    const subiect = `Intrebare test ${id.slice(-5)}`;
    const res = await page.request.post("/api/contact", {
      data: {
        name: "Vizitator Test",
        email: `vizitator-${id}@e2e.test`,
        subject: subiect,
        message: "Buna ziua, as vrea sa stiu cum pot licita pe site-ul dumneavoastra.",
      },
    });
    expect(res.status(), await res.text()).toBe(200);

    await expect(async () => {
      const primite = emails(adresa);
      expect(
        primite.some((e) => e.subject.includes(subiect)),
        `nu a venit anunțul; ce a ajuns: ${primite.map((e) => e.subject).join(" | ")}`
      ).toBe(true);
    }).toPass({ timeout: 30_000 });

    const anunt = emails(adresa).find((e) => e.subject.includes(subiect))!;
    expect(anunt.body).toContain("Vizitator Test");
    expect(anunt.body).toContain("/ro/admin/messages");

    // bifele: scoatem evenimentul și rândul rămâne, dar fără el
    await page.reload();
    const randDupa = page.getByTestId("alerts-row").filter({ hasText: adresa });
    // asteptam salvarea: o reincarcare prea rapida ar taia cererea in drum
    const salvarea = page.waitForResponse(
      (r) => r.url().includes("/api/admin/alerts/") && r.request().method() === "PATCH"
    );
    await randDupa.getByTestId("alerts-event-CONTACT_MESSAGE").click();
    expect((await salvarea).status()).toBe(200);

    await page.reload();
    await expect(
      page.getByTestId("alerts-row").filter({ hasText: adresa }).getByTestId("alerts-event-CONTACT_MESSAGE")
    ).not.toBeChecked();

    // curățenie: baza de test e comună, nu lăsăm destinatari în urmă
    page.once("dialog", (d) => d.accept());
    await page.getByTestId("alerts-row").filter({ hasText: adresa }).getByTestId("alerts-delete").click();
    await expect(page.getByTestId("alerts-row").filter({ hasText: adresa })).toHaveCount(0);
  });

  test("fără bot configurat, pagina arată pașii, nu o eroare", async ({ page }) => {
    await login(page, "admin@nbp.test", "admin1234");
    await page.goto("/ro/admin/alerts");
    const cutie = page.getByTestId("alerts-telegram-box");
    await expect(cutie).toBeVisible();
    // în teste nu există token, deci trebuie să se vadă instrucțiunile
    await expect(cutie).toContainText("BotFather");
    await expect(page.getByTestId("alerts-telegram-add")).toBeDisabled();
  });
});
