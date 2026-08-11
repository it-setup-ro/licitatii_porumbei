import { randomBytes } from "crypto";
import { mkdir, writeFile } from "fs/promises";
import path from "path";
import { requireApprovedSeller } from "@/lib/auth";
import { jsonOk, jsonError, handleApiError } from "@/lib/api";

/**
 * Upload de poze pentru loturi (doar vanzatori aprobati / admin).
 * Fisierele se salveaza pe disc in uploads/ si se servesc prin /api/files/[name].
 * Validari stricte: doar imagini raster (nu SVG — risc XSS), max 5MB, max 8 per cerere.
 */

const UPLOADS_DIR = path.join(process.cwd(), "uploads");
const MAX_SIZE = 5 * 1024 * 1024;
const MAX_FILES = 8;

const ALLOWED: Record<string, string> = {
  "image/jpeg": ".jpg",
  "image/png": ".png",
  "image/webp": ".webp",
};

/** Verifica semnatura reala a fisierului (magic bytes), nu doar tipul declarat. */
function sniffImage(buf: Buffer): string | null {
  if (buf.length > 3 && buf[0] === 0xff && buf[1] === 0xd8 && buf[2] === 0xff) return "image/jpeg";
  if (
    buf.length > 8 &&
    buf[0] === 0x89 && buf[1] === 0x50 && buf[2] === 0x4e && buf[3] === 0x47
  )
    return "image/png";
  if (
    buf.length > 12 &&
    buf.toString("ascii", 0, 4) === "RIFF" &&
    buf.toString("ascii", 8, 12) === "WEBP"
  )
    return "image/webp";
  return null;
}

export async function POST(req: Request) {
  try {
    await requireApprovedSeller();

    const form = await req.formData();
    const files = form.getAll("files").filter((f): f is File => f instanceof File);
    if (files.length === 0) return jsonError("NO_FILES", 400);
    if (files.length > MAX_FILES) return jsonError("TOO_MANY_FILES", 400, { max: MAX_FILES });

    await mkdir(UPLOADS_DIR, { recursive: true });

    const urls: string[] = [];
    for (const file of files) {
      if (file.size > MAX_SIZE) return jsonError("FILE_TOO_LARGE", 400, { maxBytes: MAX_SIZE });
      const buf = Buffer.from(await file.arrayBuffer());
      const realType = sniffImage(buf);
      if (!realType || !(realType in ALLOWED)) return jsonError("INVALID_TYPE", 400);

      const name = `${Date.now()}-${randomBytes(8).toString("hex")}${ALLOWED[realType]}`;
      await writeFile(path.join(UPLOADS_DIR, name), buf);
      urls.push(`/api/files/${name}`);
    }
    return jsonOk({ urls });
  } catch (e) {
    return handleApiError(e);
  }
}
