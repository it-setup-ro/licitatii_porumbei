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

/** Datele unui cont nou valid (persoană fizică), cu ce se schimbă în `over`. */
export function registrationData(over: Record<string, unknown> = {}) {
  const id = `${Date.now()}${Math.floor(Math.random() * 1000)}`;
  return {
    accountType: "PERSON",
    firstName: "Test",
    lastName: "Cont",
    nickname: `Test ${id.slice(-7)}`,
    email: `cont-${id}@e2e.test`,
    password: "parola12345",
    phone: "0723 000 111",
    addressCountry: "România",
    addressCounty: "Arad",
    addressCity: "Arad",
    addressStreet: "Str. Porumbeilor 7",
    acceptTerms: true,
    ...over,
  };
}

/** Completează formularul de cont nou (persoană fizică), fără să-l trimită. */
export async function fillRegisterForm(
  page: Page,
  d: { firstName: string; lastName: string; email: string; password: string; nickname?: string }
) {
  // câmpurile sunt controlate de React: ce se scrie înainte de hidratare se pierde
  await expect(async () => {
    await page.getByTestId("reg-last-name").fill(d.lastName);
    await expect(page.getByTestId("reg-last-name")).toHaveValue(d.lastName, { timeout: 1_000 });
  }).toPass({ timeout: 15_000 });
  await page.getByTestId("reg-first-name").fill(d.firstName);
  await page.getByTestId("reg-nickname").fill(d.nickname ?? `U${Date.now() % 1e7}`);
  await page.getByTestId("reg-email").fill(d.email);
  await page.getByTestId("reg-phone").fill("0723 000 111");
  await page.getByTestId("reg-password").fill(d.password);
  await page.getByTestId("reg-county").selectOption("Arad");
  await page.getByTestId("reg-city").fill("Arad");
  await page.getByTestId("reg-street").fill("Str. Porumbeilor 7");
  await page.getByTestId("reg-terms").check();
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

/**
 * Așteaptă până când React a preluat câmpul dat (hidratarea s-a terminat).
 *
 * Ce scrie Playwright înainte de hidratare pare că rămâne, dar dispare când
 * React preia formularul: câmpurile ajung goale, formularul devine nevalid și
 * browserul oprește trimiterea fără niciun mesaj vizibil. React pune pe element
 * o cheie „__reactFiber$…” abia la hidratare — aia e dovada.
 */
export async function asteaptaFormularViu(page: Page, testid: string) {
  await page.waitForFunction(
    (id) => {
      const el = document.querySelector(`[data-testid="${id}"]`);
      return !!el && Object.keys(el).some((k) => k.startsWith("__reactFiber$"));
    },
    testid,
    { timeout: 30_000 }
  );
}
