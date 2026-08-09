import { Page, expect } from "@playwright/test";
import { execSync } from "child_process";
import path from "path";
import { TEST_DATABASE_URL } from "../../playwright.config";

export async function login(page: Page, email: string, password: string) {
  await page.goto("/ro/login");
  await page.getByTestId("login-email").fill(email);
  await page.getByTestId("login-password").fill(password);
  await page.getByTestId("login-submit").click();
  await expect(page.getByTestId("user-menu")).toBeVisible();
}

export async function apiLogin(page: Page, email: string, password: string) {
  await page.goto("/ro");
  const res = await page.request.post("/api/auth/login", {
    data: { email, password },
  });
  const body = await res.json();
  if (!body.ok) throw new Error(`login failed for ${email}`);
}

/** Ruleaza un script tsx pe baza de date de test. */
export function runOnTestDb(script: string, args: string[] = []) {
  const root = path.resolve(__dirname, "../..");
  try {
    execSync(`npx tsx ${script} ${args.map((a) => `"${a}"`).join(" ")}`, {
      cwd: root,
      env: { ...process.env, DATABASE_URL: TEST_DATABASE_URL },
      stdio: "pipe",
    });
  } catch (e) {
    const err = e as { stdout?: Buffer; stderr?: Buffer; message: string };
    throw new Error(
      `runOnTestDb(${script}) a esuat:\n${err.stderr?.toString() ?? ""}\n${err.stdout?.toString() ?? ""}\n${err.message}`
    );
  }
}

export function queryTestDb(inlineScript: string): string {
  const root = path.resolve(__dirname, "../..");
  return execSync(`npx tsx -e "${inlineScript.replace(/"/g, '\\"')}"`, {
    cwd: root,
    env: { ...process.env, DATABASE_URL: "file:./test.db" },
  }).toString();
}
