import { Page, expect } from "@playwright/test";
import { execSync } from "child_process";
import path from "path";
import { TEST_DATABASE_URL } from "../../playwright.config";

/** Prenumele afisat in header pentru fiecare cont din seed. */
const EXPECTED_FIRST_NAME: Record<string, string> = {
  "admin@nbp.test": "Daniel",
  "seller@nbp.test": "Ion",
  "pending-seller@nbp.test": "Vasile",
  "buyer1@nbp.test": "Mihai",
  "buyer2@nbp.test": "John",
};

/**
 * Autentificare prin interfata. Daca exista deja o sesiune, o inchide intai —
 * altfel meniul de utilizator al contului VECHI ramane vizibil si testul crede
 * ca s-a logat, cand de fapt a ramas pe contul anterior.
 */
export async function login(page: Page, email: string, password: string) {
  await page.goto("/ro");
  await page.request.post("/api/auth/logout");
  await page.goto("/ro/login");
  await page.getByTestId("login-email").fill(email);
  await page.getByTestId("login-password").fill(password);
  await page.getByTestId("login-submit").click();

  const menu = page.getByTestId("user-menu").or(page.getByTestId("notif-bell"));
  await expect(menu.first()).toBeVisible();

  // confirma ca sesiunea e chiar a contului cerut
  const expectedName = EXPECTED_FIRST_NAME[email];
  if (expectedName) {
    await expect(page.getByTestId("user-menu")).toContainText(expectedName);
  }
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

/**
 * Ruleaza un script pe baza de test si intoarce ultima linie de la stdout.
 * (npx poate adauga linii de avertisment inaintea valorii utile.)
 */
export function readFromTestDb(script: string): string {
  const root = path.resolve(__dirname, "../..");
  const out = execSync(`npx tsx ${script}`, {
    cwd: root,
    env: { ...process.env, DATABASE_URL: TEST_DATABASE_URL },
  }).toString();
  const lines = out.split(/\r?\n/).filter((l) => l.trim().length > 0);
  return lines[lines.length - 1].trim();
}
