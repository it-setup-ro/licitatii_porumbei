import { test, expect } from "@playwright/test";
import { login } from "./helpers";

/**
 * Transport și agenți: o listă de carduri, nu un singur bloc de text.
 * Cererea clientului: „am nevoie de mai multe spații pentru introdus agenți".
 */

test.describe("Transport și agenți — pagina publică", () => {
  test("sub prezentare, câte un card pe transportator și pe agent, în grupuri", async ({
    page,
  }) => {
    await page.goto("/ro/shipping-agents");
    await expect(page.getByTestId("content-title")).toContainText("Transport");

    const transport = page.getByTestId("agents-transport");
    await expect(
      transport.getByTestId("agent-card").filter({ hasText: "Transport Demo Porumbei" })
    ).toBeVisible();

    const agenti = page.getByTestId("agents-agent");
    await expect(agenti.getByTestId("agent-card").filter({ hasText: "Agent Demo Arad" })).toBeVisible();
    await expect(agenti).toContainText("Arad, Timiș, Bihor");
  });

  test("un agent ascuns nu apare", async ({ page }) => {
    await page.goto("/ro/shipping-agents");
    await expect(page.getByTestId("agent-card").filter({ hasText: "Agent ascuns" })).toHaveCount(0);
  });

  test("butoanele de contact au numărul în forma bună", async ({ page }) => {
    await page.goto("/ro/shipping-agents");
    const transport = page.getByTestId("agent-card").filter({ hasText: "Transport Demo Porumbei" });
    // scris „0723 000 111" -> WhatsApp vrea 40723000111
    await expect(transport.getByTestId("agent-whatsapp")).toHaveAttribute(
      "href",
      "https://wa.me/40723000111"
    );
    const agent = page.getByTestId("agent-card").filter({ hasText: "Agent Demo Arad" });
    await expect(agent.getByTestId("agent-phone")).toHaveAttribute("href", "tel:+40744000222");
  });

  test("în engleză, fără prezentare în engleză, apare cea în română", async ({ page }) => {
    await page.goto("/en/shipping-agents");
    const agent = page.getByTestId("agent-card").filter({ hasText: "Agent Demo Arad" });
    await expect(agent).toContainText("Punct de colectare");
  });
});

test.describe("Transport și agenți — administrare", () => {
  test("se adaugă din formular și apare pe site", async ({ page }) => {
    await login(page, "admin@nbp.test", "admin1234");
    await page.goto("/ro/admin/agents?new=1");
    const nume = `Transport Formular ${Date.now()}`;
    await page.getByTestId("field-name").fill(nume);
    await page.getByTestId("field-zone").fill("România ↔ Ungaria");
    await page.getByTestId("field-whatsapp").fill("0745 123 456");
    await page.getByTestId("editor-save").click();
    await expect(page.getByTestId("editor-saved")).toBeVisible();

    await page.goto("/ro/shipping-agents");
    const card = page.getByTestId("agent-card").filter({ hasText: nume });
    await expect(card).toContainText("România ↔ Ungaria");
    await expect(card.getByTestId("agent-whatsapp")).toHaveAttribute(
      "href",
      "https://wa.me/40745123456"
    );
  });

  test("nu există o limită: se adaugă oricâți", async ({ page }) => {
    await login(page, "admin@nbp.test", "admin1234");
    await page.goto("/ro/shipping-agents");
    const inainte = await page.getByTestId("agent-card").count();

    const lot = Date.now();
    for (let i = 1; i <= 5; i++) {
      const res = await page.request.post("/api/admin/agents", {
        data: {
          kind: "AGENT",
          name: `Agent Serie ${lot}-${i}`,
          zone: `Județul ${i}`,
          sortIdx: 100 + i,
          active: true,
        },
      });
      expect((await res.json()).ok).toBe(true);
    }

    await page.goto("/ro/shipping-agents");
    await expect(page.getByTestId("agent-card")).toHaveCount(inainte + 5);
  });

  test("o adresă de site periculoasă e refuzată, cu explicație", async ({ page }) => {
    await login(page, "admin@nbp.test", "admin1234");
    const res = await page.request.post("/api/admin/agents", {
      data: {
        kind: "TRANSPORT",
        name: "Site rău",
        website: "javascript:alert(1)",
        sortIdx: 1,
        active: true,
      },
    });
    expect(res.status()).toBe(422);
    expect((await res.json()).fields.website).toContain("https://");
  });

  test("un vizitator nu poate adăuga", async ({ page }) => {
    await page.goto("/ro");
    const res = await page.request.post("/api/admin/agents", {
      data: { kind: "AGENT", name: "Intrus", sortIdx: 1, active: true },
    });
    expect(res.status()).toBeGreaterThanOrEqual(400);
  });
});
