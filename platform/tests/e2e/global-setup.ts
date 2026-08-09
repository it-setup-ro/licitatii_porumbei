import { execSync } from "child_process";
import path from "path";
import { TEST_DATABASE_URL } from "../../playwright.config";

export default function globalSetup() {
  const root = path.resolve(__dirname, "../..");
  const env = { ...process.env, DATABASE_URL: TEST_DATABASE_URL };
  // aplica schema pe baza de test (nedistructiv; creeaza nbp_test daca lipseste)
  execSync("npx prisma migrate deploy", { cwd: root, env, stdio: "inherit" });
  // seed-ul goleste si repopuleaza toate tabelele — resetul efectiv al datelor de test
  execSync("npx tsx prisma/seed.ts", { cwd: root, env, stdio: "inherit" });
}
