import { describe, it, expect, beforeAll } from "vitest";
import { solveChallenge } from "altcha-lib";
import { deriveKey } from "altcha-lib/algorithms/pbkdf2";

/**
 * Bifa „Nu sunt robot": serverul acceptă doar o provocare rezolvată de el
 * emisă, o singură dată, și refuză o dovadă măsluită.
 */

let captcha: typeof import("../../src/lib/captcha");

beforeAll(async () => {
  process.env.AUTH_SECRET = "secret-de-test-suficient-de-lung-pentru-captcha-0123456789";
  delete process.env.CAPTCHA_DISABLED;
  captcha = await import("../../src/lib/captcha");
});

async function solvedPayload() {
  const res = await captcha.captchaChallenge(new Request("http://localhost/api/captcha"));
  const challenge = await res.json();
  const solution = await solveChallenge({ challenge, deriveKey });
  expect(solution).not.toBeNull();
  return Buffer.from(JSON.stringify({ challenge, solution })).toString("base64");
}

describe("verificarea „Nu sunt robot”", () => {
  it("acceptă o provocare rezolvată, o singură dată", async () => {
    const payload = await solvedPayload();
    expect(await captcha.verifyCaptcha(payload)).toBe(true);
    expect(await captcha.verifyCaptcha(payload)).toBe(false);
  }, 60_000);

  it("refuză lipsa dovezii și o dovadă măsluită", async () => {
    expect(await captcha.verifyCaptcha(undefined)).toBe(false);
    expect(await captcha.verifyCaptcha("")).toBe(false);
    const payload = await solvedPayload();
    const decoded = JSON.parse(Buffer.from(payload, "base64").toString());
    decoded.challenge.parameters.cost = 1;
    const forged = Buffer.from(JSON.stringify(decoded)).toString("base64");
    expect(await captcha.verifyCaptcha(forged)).toBe(false);
  }, 60_000);
});
