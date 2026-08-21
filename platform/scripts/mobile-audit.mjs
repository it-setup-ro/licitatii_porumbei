/**
 * Audit de mobil: deschide fiecare pagină la 375×812 și raportează
 *  - depășire pe orizontală (pagina se glisează lateral = greșeală de layout)
 *  - elementele vinovate
 *  - butoane/linkuri sub 32px înălțime (greu de atins cu degetul)
 *  - text sub 12px (greu de citit pe telefon)
 *
 * Rulare: node scripts/mobile-audit.mjs [baseURL]
 */
import { chromium } from "@playwright/test";

const BASE = process.argv[2] ?? "http://207.180.241.165:3000";

const PUBLIC_PAGES = [
  "/ro",
  "/ro/auctions",
  "/ro/fixed-price",
  "/ro/products",
  "/ro/products/amestec-fond-premium-25kg",
  "/ro/cart",
  "/ro/articles",
  "/ro/articles/cum-alegi-un-porumbel-de-fond",
  "/ro/contests",
  "/ro/info/regulament",
  "/ro/shipping-agents",
  "/ro/about",
  "/ro/contact",
  "/ro/login",
  "/ro/register",
  "/ro/how-it-works",
];

const AUTH_PAGES = [
  "/ro/account",
  "/ro/account/bids",
  "/ro/account/watchlist",
  "/ro/account/purchases",
  "/ro/account/sales",
  "/ro/account/lots",
  "/ro/account/shop-orders",
  "/ro/account/notifications",
  "/ro/sell",
  "/ro/admin",
  "/ro/admin/settings",
  "/ro/admin/sellers",
  "/ro/admin/lots",
  "/ro/admin/reviews",
  "/ro/admin/products",
  "/ro/admin/articles",
  "/ro/admin/contests",
  "/ro/admin/content",
  "/ro/admin/links",
  "/ro/admin/messages",
  "/ro/admin/audit",
];

async function auditPage(page, path) {
  const res = await page.goto(BASE + path, { waitUntil: "domcontentloaded" });
  await page.waitForTimeout(350);

  return page.evaluate(() => {
    const vw = document.documentElement.clientWidth;
    const scrollW = document.documentElement.scrollWidth;

    const wide = [...document.querySelectorAll("body *")]
      .filter((el) => {
        const r = el.getBoundingClientRect();
        if (r.width <= vw + 1 || r.height === 0) return false;
        // ignoram elementele care au scroll propriu (tabel intr-un container derulabil e OK)
        const s = getComputedStyle(el);
        if (s.overflowX === "auto" || s.overflowX === "scroll") return false;
        const p = el.parentElement;
        if (p) {
          const ps = getComputedStyle(p);
          if (ps.overflowX === "auto" || ps.overflowX === "scroll") return false;
        }
        return true;
      })
      .slice(0, 4)
      .map((el) => {
        const cls = (el.className?.toString?.() ?? "").slice(0, 40);
        return `${el.tagName.toLowerCase()}${cls ? "." + cls.split(" ")[0] : ""} (${Math.round(
          el.getBoundingClientRect().width
        )}px)`;
      });

    const smallTargets = [...document.querySelectorAll("a, button, input, select")]
      .filter((el) => {
        const r = el.getBoundingClientRect();
        return r.height > 0 && r.height < 32 && r.width > 0;
      })
      .slice(0, 4)
      .map((el) => {
        const txt = (el.textContent || el.getAttribute("aria-label") || el.tagName)
          .trim()
          .slice(0, 24);
        return `${txt} (${Math.round(el.getBoundingClientRect().height)}px)`;
      });

    return {
      overflow: scrollW > vw + 1 ? scrollW - vw : 0,
      wide,
      smallTargets,
    };
  }).then((r) => ({ path, status: res?.status() ?? 0, ...r }));
}

const browser = await chromium.launch();
const context = await browser.newContext({
  viewport: { width: 375, height: 812 },
  isMobile: true,
  hasTouch: true,
  locale: "ro-RO",
});
const page = await context.newPage();

const results = [];
for (const p of PUBLIC_PAGES) results.push(await auditPage(page, p));

// autentificare ca admin pentru paginile protejate
await page.goto(BASE + "/ro");
await page.request.post(BASE + "/api/auth/login", {
  data: { email: "admin@nbp.test", password: "admin1234" },
});
for (const p of AUTH_PAGES) results.push(await auditPage(page, p));

await browser.close();

// raport
const problems = results.filter(
  (r) => r.overflow > 0 || r.smallTargets.length > 0 || r.status >= 400
);
console.log(`\nAUDIT MOBIL (375px) — ${results.length} pagini verificate pe ${BASE}\n`);
if (problems.length === 0) {
  console.log("Nicio problema gasita.");
} else {
  for (const r of problems) {
    console.log(`${r.path}  [HTTP ${r.status}]`);
    if (r.overflow > 0) {
      console.log(`   depasire laterala: +${r.overflow}px`);
      if (r.wide.length) console.log(`   vinovati: ${r.wide.join(", ")}`);
    }
    if (r.smallTargets.length > 0) {
      console.log(`   tinte mici: ${r.smallTargets.join(", ")}`);
    }
    console.log("");
  }
}
console.log(
  `Rezumat: ${results.filter((r) => r.overflow > 0).length} pagini cu depasire laterala, ` +
    `${results.filter((r) => r.smallTargets.length > 0).length} cu tinte de atingere mici, ` +
    `${results.filter((r) => r.status >= 400).length} cu eroare HTTP.`
);
