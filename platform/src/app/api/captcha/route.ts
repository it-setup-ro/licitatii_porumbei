import { captchaChallenge } from "@/lib/captcha";
import { clientIp, rateLimit } from "@/lib/rate-limit";
import { jsonTooManyRequests, handleApiError } from "@/lib/api";

export const dynamic = "force-dynamic";

/** Provocarea pentru bifa „Nu sunt robot" de la înregistrare. */
export async function GET(req: Request) {
  try {
    const check = rateLimit(`captcha:${clientIp(req)}`, 60, 60 * 60_000);
    if (!check.allowed) return jsonTooManyRequests(check.retryAfterSeconds);
    return await captchaChallenge(req);
  } catch (e) {
    return handleApiError(e);
  }
}
