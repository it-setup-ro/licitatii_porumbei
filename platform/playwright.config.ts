import { defineConfig } from "@playwright/test";
import fs from "fs";
import path from "path";

/** Playwright nu incarca singur .env — citim manual doar cheile de care avem nevoie. */
function envFromFile(file: string, key: string): string | undefined {
  const full = path.join(__dirname, file);
  if (!fs.existsSync(full)) return undefined;
  for (const line of fs.readFileSync(full, "utf8").split("\n")) {
    const m = line.match(/^\s*([A-Z_]+)\s*=\s*"?([^"\n\r]*)"?\s*$/);
    if (m && m[1] === key) return m[2];
  }
  return undefined;
}

/**
 * E2E pe o baza de date separata (nbp_test in PostgreSQL), server dedicat pe :3100.
 * workers: 1 — testele impart aceeasi baza de date si ruleaza secvential.
 */
/**
 * Conexiunea la baza de test NU se scrie in cod — repo-ul e public.
 * Se ia din TEST_DATABASE_URL (vezi .env.test.example); daca lipseste,
 * se refoloseste DATABASE_URL din .env cu numele bazei schimbat in nbp_test.
 */
function resolveTestDatabaseUrl(): string {
  const explicit =
    process.env.TEST_DATABASE_URL ??
    envFromFile(".env.test", "TEST_DATABASE_URL") ??
    envFromFile(".env", "TEST_DATABASE_URL");
  if (explicit) return explicit;
  const devUrl = process.env.DATABASE_URL ?? envFromFile(".env", "DATABASE_URL");
  if (devUrl) {
    try {
      const u = new URL(devUrl);
      u.pathname = "/nbp_test";
      return u.toString();
    } catch {
      // URL invalid — cadem pe eroarea de mai jos
    }
  }
  throw new Error(
    "Lipseste TEST_DATABASE_URL (sau DATABASE_URL). Vezi .env.test.example."
  );
}

export const TEST_DATABASE_URL = resolveTestDatabaseUrl();
export default defineConfig({
  testDir: "./tests/e2e",
  globalSetup: "./tests/e2e/global-setup.ts",
  workers: 1,
  timeout: 90_000,
  expect: { timeout: 10_000 },
  retries: 0,
  use: {
    baseURL: "http://localhost:3100",
    locale: "ro-RO",
  },
  webServer: {
    command: "npx next dev -p 3100",
    port: 3100,
    reuseExistingServer: false,
    timeout: 120_000,
    env: {
      DATABASE_URL: TEST_DATABASE_URL,
      // secret de test, lung cat cere validarea din auth.ts (nu e folosit in productie)
      AUTH_SECRET: "e2e-only-secret-not-used-in-production-0123456789",
      NEXT_DIST_DIR: ".next-e2e",
      // suita creeaza multe conturi; limita reala (5/ora) ramane activa in productie
      RATE_LIMIT_REGISTER_PER_HOUR: "200",
    },
    stdout: "pipe",
    stderr: "pipe",
  },
});
