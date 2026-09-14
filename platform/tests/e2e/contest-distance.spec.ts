import { test, expect } from "@playwright/test";
import { login } from "./helpers";

/**
 * Distanța concursului: un număr sau un interval.
 * Cererea clientului: „vreau să pot scrie nu 200, ci și 170-240 km, deoarece
 * nu toți crescătorii au aceeași distanță".
 */

const zi = 86_400_000;

function concurs(slug: string, extra: Record<string, unknown>) {
  return {
    slug,
    titleRo: "Concurs cu interval",
    titleEn: "Contest with a range",
    startsAt: new Date(Date.now() - zi).toISOString(),
    endsAt: new Date(Date.now() + 3 * zi).toISOString(),
    status: "ACTIVE",
    published: true,
    ...extra,
  };
}

test.describe("Distanța concursului", () => {
  test("un interval apare pe bandă și se regăsește în formular", async ({ page }) => {
    await login(page, "admin@nbp.test", "admin1234");
    const date = concurs(`interval-${Date.now()}`, {
      featured: true,
      destination: "Dabas",
      distance: "170-240",
      countryCode: "HU",
    });
    const res = await page.request.post("/api/admin/contests", { data: date });
    const { ok, id } = await res.json();
    expect(ok).toBe(true);

    try {
      await page.goto("/ro");
      const banda = page.getByTestId("contest-banner");
      await expect(banda).toContainText("170–240 KM");
      await expect(banda).toContainText("Ungaria");

      // la editare, câmpul arată ce s-a scris
      await page.goto(`/ro/admin/contests?id=${id}`);
      await expect(page.getByTestId("field-distance")).toHaveValue("170-240");
    } finally {
      // banda de pe prima pagină rămâne a celorlalte teste
      await page.request.post("/api/admin/contests", {
        data: { ...date, id, featured: false, published: false },
      });
    }
  });

  test("un număr simplu merge ca înainte", async ({ page }) => {
    await login(page, "admin@nbp.test", "admin1234");
    const res = await page.request.post("/api/admin/contests", {
      data: concurs(`numar-${Date.now()}`, { distance: "200", published: false }),
    });
    const { ok, id } = await res.json();
    expect(ok).toBe(true);
    await page.goto(`/ro/admin/contests?id=${id}`);
    await expect(page.getByTestId("field-distance")).toHaveValue("200");
  });

  test("un text care nu e distanță e refuzat și spune cum se scrie", async ({ page }) => {
    await login(page, "admin@nbp.test", "admin1234");
    const res = await page.request.post("/api/admin/contests", {
      data: concurs(`gresit-${Date.now()}`, { distance: "cam 200", published: false }),
    });
    expect(res.status()).toBe(422);
    expect((await res.json()).fields.distance).toContain("170-240");
  });
});
