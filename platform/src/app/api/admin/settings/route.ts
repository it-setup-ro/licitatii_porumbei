import { z } from "zod";
import { requireAdmin } from "@/lib/auth";
import { DEFAULT_SETTINGS, setSetting, type PlatformSettings } from "@/lib/settings";
import { jsonOk, jsonError, handleApiError } from "@/lib/api";

const schema = z.object({
  updates: z.record(z.string(), z.unknown()),
});

export async function POST(req: Request) {
  try {
    const admin = await requireAdmin();
    const body = schema.safeParse(await req.json());
    if (!body.success) return jsonError("VALIDATION", 422);

    const validKeys = new Set(Object.keys(DEFAULT_SETTINGS));
    const applied: string[] = [];
    for (const [key, value] of Object.entries(body.data.updates)) {
      if (!validKeys.has(key)) continue;
      const defaultValue = DEFAULT_SETTINGS[key as keyof PlatformSettings];
      // validare de tip fata de default
      if (typeof defaultValue === "number" && typeof value !== "number") continue;
      if (typeof defaultValue === "boolean" && typeof value !== "boolean") continue;
      if (typeof defaultValue === "string" && typeof value !== "string") continue;
      await setSetting(key as keyof PlatformSettings, value, admin.id);
      applied.push(key);
    }
    return jsonOk({ applied });
  } catch (e) {
    return handleApiError(e);
  }
}
