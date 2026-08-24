import type { NextConfig } from "next";
import createNextIntlPlugin from "next-intl/plugin";

const withNextIntl = createNextIntlPlugin("./src/i18n/request.ts");

/**
 * Headere de securitate aplicate tuturor rutelor.
 * - frame-ancestors/X-Frame-Options: blocheaza clickjacking (site-ul nu poate fi
 *   pus in iframe pe alt domeniu ca sa pacaleasca userul sa liciteze/plateasca).
 * - CSP: plasa de siguranta daca apare vreodata un XSS; 'unsafe-inline' pe stiluri
 *   e necesar pentru Tailwind/Next, scripturile raman restranse la origine proprie.
 * - nosniff: browserul nu mai "ghiceste" tipul unui fisier urcat.
 */
const isDev = process.env.NODE_ENV === "development";

const securityHeaders = [
  { key: "X-Frame-Options", value: "DENY" },
  { key: "X-Content-Type-Options", value: "nosniff" },
  { key: "Referrer-Policy", value: "strict-origin-when-cross-origin" },
  { key: "Permissions-Policy", value: "camera=(), microphone=(), geolocation=()" },
  {
    key: "Content-Security-Policy",
    value: [
      "default-src 'self'",
      // 'unsafe-eval' doar in dev: React il foloseste pentru unelte de depanare.
      // In productie ramane interzis.
      `script-src 'self' 'unsafe-inline'${isDev ? " 'unsafe-eval'" : ""}`,
      "style-src 'self' 'unsafe-inline'",
      "img-src 'self' data: blob:",
      "font-src 'self' data:",
      "connect-src 'self'",
      "media-src 'self'",
      "object-src 'none'",
      "base-uri 'self'",
      "form-action 'self'",
      "frame-ancestors 'none'",
    ].join("; "),
  },
];

const nextConfig: NextConfig = {
  // director de build separat pentru serverul e2e, ca sa poata rula in paralel cu dev-ul
  distDir: process.env.NEXT_DIST_DIR || ".next",
  async headers() {
    return [
      { source: "/:path*", headers: securityHeaders },
      // Fisierele urcate (poze, clipuri, pedigree PDF) sunt continut trimis de
      // utilizatori, deci le servim cu drepturi zero: „default-src 'none'"
      // inseamna ca fisierul nu poate cere nimic altceva de nicaieri.
      //
      // Nu folosim directiva „sandbox": Chrome nu poate afisa un PDF sandboxat
      // cu vizualizatorul propriu si il descarca in loc sa-l deschida — adica
      // exact invers fata de ce trebuie sa faca un pedigree.
      //
      // X-Frame-Options ramane SAMEORIGIN (nu DENY) ca pedigree-ul sa poata fi
      // incadrat in pagina lotului, dar pe niciun alt site.
      {
        source: "/api/files/:path*",
        headers: [
          { key: "X-Content-Type-Options", value: "nosniff" },
          { key: "X-Frame-Options", value: "SAMEORIGIN" },
          {
            key: "Content-Security-Policy",
            value: "default-src 'none'; frame-ancestors 'self'",
          },
        ],
      },
    ];
  },
};

export default withNextIntl(nextConfig);
