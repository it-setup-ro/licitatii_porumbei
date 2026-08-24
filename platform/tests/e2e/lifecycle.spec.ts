import { test, expect } from "@playwright/test";
import { login, runOnTestDb } from "./helpers";

/**
 * Ciclul de viata complet al unui lot: listare vanzator -> moderare admin ->
 * licitare -> inchidere -> animatia de castig -> plata mock -> recenzie.
 */
test.describe("Ciclul de viata al unei licitatii", () => {
  test("de la listare la recenzie", async ({ browser }) => {
    test.setTimeout(120_000);

    // 1) Vanzatorul listeaza un porumbel nou
    const ctxSeller = await browser.newContext({ locale: "ro-RO" });
    const seller = await ctxSeller.newPage();
    await login(seller, "seller@nbp.test", "seller1234");
    await seller.goto("/ro/sell");
    await seller.getByTestId("sf-ring").fill("RO 2025 777001");
    await seller.getByTestId("sf-year").fill("2025");
    await seller.getByTestId("sf-name").fill("Săgeata E2E");
    await seller.getByTestId("sf-tagline").fill("Lot de test — ciclu complet");
    // restul campurilor stau sub „Alte detalii"
    await seller.locator('[data-testid="sf-more"] > summary').click();
    await seller.getByTestId("sf-strain").fill("Janssen");
    await seller.getByTestId("sf-add-result").click();
    await seller.getByTestId("sf-race-0").fill("Test Race");
    await seller.getByTestId("sf-place-0").fill("2");
    await seller.getByTestId("sf-start-price").fill("120");
    await seller.getByTestId("sell-submit").click();
    await expect(seller.getByTestId("sell-success")).toBeVisible();

    // Lotul apare la "Loturile mele" ca in asteptare
    await seller.goto("/ro/account/lots");
    await expect(
      seller.getByTestId("my-lot-row").filter({ hasText: "Săgeata E2E" })
    ).toContainText("⏳");

    // 2) Adminul aproba lotul cu start imediat
    const ctxAdmin = await browser.newContext({ locale: "ro-RO" });
    const admin = await ctxAdmin.newPage();
    await login(admin, "admin@nbp.test", "admin1234");
    await admin.goto("/ro/admin/lots");
    const row = admin.getByTestId("pending-lot-row").filter({ hasText: "Săgeata E2E" });
    await expect(row).toBeVisible();
    await row.getByTestId("mod-approve").click();
    await expect(admin.getByTestId("pending-lot-row").filter({ hasText: "Săgeata E2E" })).toHaveCount(0);

    // Vanzatorul primeste notificare de aprobare
    await seller.goto("/ro/account/notifications");
    await expect(seller.getByTestId("notif-lot_approved").first()).toContainText("aprobat");

    // 3) Cumparatorul liciteaza pe lotul nou (acum LIVE)
    const ctxBuyer = await browser.newContext({ locale: "ro-RO" });
    const buyer = await ctxBuyer.newPage();
    await login(buyer, "buyer1@nbp.test", "buyer1234");
    await buyer.goto("/ro/auctions");
    await buyer.getByTestId("auction-card").filter({ hasText: "Săgeata E2E" }).click();
    await buyer.waitForURL(/\/auctions\/[a-z0-9]+$/);
    const auctionId = buyer.url().split("/").pop()!;
    await buyer.getByTestId("bid-input").fill("200");
    await buyer.getByTestId("bid-submit").click();
    await expect(buyer.getByTestId("leading-badge")).toBeVisible();

    // 4) Anti-sniping: mutam finalul la 60s si licitam din nou -> prelungire
    runOnTestDb("scripts/set-auction-end.ts", [auctionId, "60"]);
    await buyer.getByTestId("bid-input").fill("300");
    await buyer.getByTestId("bid-submit").click();
    await expect(buyer.getByTestId("extended-note")).toBeVisible();

    // 5) Inchidere: mutam finalul in trecut si declansam sweep-ul
    runOnTestDb("scripts/set-auction-end.ts", [auctionId, "-2"]);
    await buyer.request.post("/api/sweep");

    // Animatia de castig (stolul de porumbei) apare live, prin SSE
    await expect(buyer.getByTestId("win-celebration")).toBeVisible({ timeout: 20_000 });
    await expect(buyer.getByTestId("win-celebration")).toContainText("Felicitări");

    // 6) Plata mock din pagina comenzii
    await buyer.goto("/ro/account/purchases");
    const orderRow = buyer.getByTestId("purchase-row").filter({ hasText: "Săgeata E2E" });
    await expect(orderRow).toContainText("Așteaptă plata");
    await orderRow.click();
    // pretul final: prima oferta a stabilit pretul de pornire (120), iar
    // ridicarea propriului plafon nu misca pretul vizibil
    await expect(buyer.getByTestId("order-amount")).toContainText("120");
    await buyer.getByTestId("pay-button").click();
    await expect(buyer.getByTestId("order-status")).toContainText("Plătită");

    // 7) Recenzie dupa tranzactie
    await buyer.getByTestId("star-5").click();
    await buyer.getByTestId("review-comment").fill("Flux e2e impecabil, vânzător serios.");
    await buyer.getByTestId("review-submit").click();
    await expect(buyer.getByTestId("order-review")).toContainText("5/5");

    // Recenzia apare pe profilul public al vanzatorului
    await buyer.goto("/ro/auctions");
    await buyer.getByTestId("tab-closed").click();
    await buyer.getByTestId("auction-card").filter({ hasText: "Săgeata E2E" }).click();
    await buyer.getByTestId("seller-link").click();
    await expect(buyer.getByTestId("seller-reviews")).toContainText("Flux e2e impecabil");

    // 8) Vanzatorul vede vanzarea si comisionul; marcheaza expedierea
    await seller.goto("/ro/account/sales");
    const saleRow = seller.getByTestId("sale-row").filter({ hasText: "Săgeata E2E" });
    await expect(saleRow).toContainText("Comision");
    await saleRow.getByTestId("order-action-ship").click();
    await expect(saleRow).toContainText("Expediată");

    await ctxSeller.close();
    await ctxAdmin.close();
    await ctxBuyer.close();
  });
});
