import { execSync } from "child_process";
import path from "path";
import fs from "fs";

export default function globalSetup() {
  const root = path.resolve(__dirname, "../..");
  const testDb = path.join(root, "prisma", "test.db");
  if (fs.existsSync(testDb)) fs.rmSync(testDb);

  const env = { ...process.env, DATABASE_URL: "file:./test.db" };
  execSync("npx prisma migrate deploy", { cwd: root, env, stdio: "inherit" });
  execSync("npx tsx prisma/seed.ts", { cwd: root, env, stdio: "inherit" });
}
