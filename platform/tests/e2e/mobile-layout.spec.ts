import { test, expect } from "@playwright/test";
import { login } from "./helpers";

/**
 * Regresie de layout pe telefon: nicio pagina nu trebuie sa se poata glisa
 * lateral. Depasirea pe orizontala e semnul clasic ca un element (tabel, rand
 * flex) nu incape — s-a intamplat la /admin/lots, unde randul de moderare
 * depasea ecranul cu 73px.
 */
test.use({ viewport: { width: 375, height: 812 } });

async function overflowPx(page: import("@playwright/test").Page) {
  return page.evaluate(() => {
    const vw = document.documentElement.clientWidth;
    return Math.max(0, document.documentElement.scrollWidth - vw);
  });
}

const PUBLIC = [
  "/ro",
  "/ro/auctions",
  "/ro/fixed-price",
  "/ro/products",
  "/ro/cart",
  "/ro/articles",
  "/ro/contests",
  "/ro/info/regulament",
  "/ro/contact",
  "/ro/register",
];

test("paginile publice nu se glisează lateral pe telefon", async ({ page }) => {
  for (const path of PUBLIC) {
    await page.goto(path);
    expect(await overflowPx(page), `depășire pe ${path}`).toBe(0);
  }
});

test("paginile de administrare nu se glisează lateral pe telefon", async ({ page }) => {
  await login(page, "admin@nbp.test", "admin1234");
  for (const path of [
    "/ro/admin",
    "/ro/admin/lots",
    "/ro/admin/products",
    "/ro/admin/articles",
    "/ro/admin/links",
    "/ro/admin/settings",
    "/ro/admin/audit",
  ]) {
    await page.goto(path);
    expect(await overflowPx(page), `depășire pe ${path}`).toBe(0);
  }
});

test("submeniul Concursuri e accesibil din panoul mobil", async ({ page }) => {
  await page.goto("/ro");
  await page.getByTestId("mobile-menu-button").click();
  const group = page.getByTestId("m-contests-group");
  await expect(group).toBeVisible();
  await expect(group.getByTestId("contest-link")).toHaveCount(5);
  await expect(group.getByTestId("contest-link-soon")).toHaveCount(1);
});
