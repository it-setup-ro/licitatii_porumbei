import { defineConfig } from "@playwright/test";

/**
 * E2E pe o baza de date separata (nbp_test in PostgreSQL), server dedicat pe :3100.
 * workers: 1 — testele impart aceeasi baza de date si ruleaza secvential.
 */
export const TEST_DATABASE_URL =
  "postgresql://postgres:dukygeorge@localhost:5432/nbp_test?schema=public";
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
      AUTH_SECRET: "e2e-secret",
      NEXT_DIST_DIR: ".next-e2e",
    },
    stdout: "pipe",
    stderr: "pipe",
  },
});
