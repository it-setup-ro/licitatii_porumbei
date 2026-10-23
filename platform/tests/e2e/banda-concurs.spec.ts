import { test, expect } from "@playwright/test";
import { login } from "./helpers";

/**
 * Banda de concurs de pe prima pagină ține cât ține concursul.
 *
 * Daniel: „după concurs nu ar mai trebui să fie pe bandă. Eventual să se
 * depublice singur. Că dacă sunt multe concursuri devine dificil să mergi la
 * fiecare să-l oprești. Și totuși concursul trebuie să fie anunțat din timp, să
 * știe lumea să se înscrie."
 *
 * Deci: înainte de start se vede (e un anunț), după final nu — iar starea se
 * pune singură, din sweeper.
 */

const ZI = 86_400_000;

function concurs(slug: string, extra: Record<string, unknown>) {
  return {
    slug,
    titleRo: `Concurs ${slug}`,
    titleEn: `Contest ${slug}`,
    published: true,
    ...extra,
  };
}

test.describe("Banda de concurs, în afara perioadei", () => {
  test("un concurs încheiat nu mai apare, chiar lăsat pe „în desfășurare”", async ({ page }) => {
    test.setTimeout(120_000);
    await login(page, "admin@nbp.test", "admin1234");

    const slug = `trecut-${Date.now()}`;
    const destinatie = `Trecut${Date.now() % 100000}`;
    const res = await page.request.post("/api/admin/contests", {
      data: concurs(slug, {
        startsAt: new Date(Date.now() - 10 * ZI).toISOString(),
        endsAt: new Date(Date.now() - ZI).toISOString(),
        // exact cazul care ținea banda la vedere pentru totdeauna
        status: "ACTIVE",
        featured: true,
        destination: destinatie,
      }),
    });
    const { ok, id } = await res.json();
    expect(ok, JSON.stringify(await res.json().catch(() => ({})))).toBe(true);

    await page.goto("/ro");
    await expect(page.getByTestId("contest-banner")).not.toContainText(destinatie);

    // ...iar sweeperul îi pune starea pe „Încheiat", fără să umble nimeni
    await expect(async () => {
      await page.goto(`/ro/admin/contests?id=${id}`);
      await expect(page.getByTestId("field-status")).toHaveValue("FINISHED");
    }).toPass({ timeout: 60_000, intervals: [5_000] });
  });

  test("un concurs care urmează se anunță dinainte pe bandă", async ({ page }) => {
    test.setTimeout(90_000);
    await login(page, "admin@nbp.test", "admin1234");

    const slug = `viitor-${Date.now()}`;
    const destinatie = `Viitor${Date.now() % 100000}`;
    const res = await page.request.post("/api/admin/contests", {
      data: concurs(slug, {
        startsAt: new Date(Date.now() + 5 * ZI).toISOString(),
        endsAt: new Date(Date.now() + 20 * ZI).toISOString(),
        status: "UPCOMING",
        featured: true,
        destination: destinatie,
      }),
    });
    expect((await res.json()).ok).toBe(true);

    await page.goto("/ro");
    await expect(page.getByTestId("contest-banner")).toContainText(destinatie);
  });
});
