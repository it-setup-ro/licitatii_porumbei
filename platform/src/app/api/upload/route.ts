import { randomBytes } from "crypto";
import { mkdir, writeFile } from "fs/promises";
import path from "path";
import { requireApprovedSeller, requireAdmin, AuthError } from "@/lib/auth";
import { rateLimit } from "@/lib/rate-limit";
import { jsonOk, jsonError, jsonTooManyRequests, handleApiError } from "@/lib/api";

/**
 * Upload de poze, clipuri si documente PDF (loturi + articole).
 * Fisierele se salveaza pe disc in uploads/ si se servesc prin /api/files/[name].
 *
 * Validari: se verifica semnatura reala a fisierului (magic bytes), nu tipul
 * declarat de browser — un fisier text redenumit .png nu trece. SVG-ul e
 * exclus deliberat (poate contine script => XSS).
 */

const UPLOADS_DIR = path.join(process.cwd(), "uploads");
const MAX_IMAGE_BYTES = 5 * 1024 * 1024; // 5 MB
const MAX_VIDEO_BYTES = 60 * 1024 * 1024; // 60 MB — un clip scurt de telefon
const MAX_DOC_BYTES = 10 * 1024 * 1024; // 10 MB — un pedigree scanat
const MAX_FILES = 10;

const EXT: Record<string, string> = {
  "image/jpeg": ".jpg",
  "image/png": ".png",
  "image/webp": ".webp",
  "video/mp4": ".mp4",
  "video/webm": ".webm",
  "video/quicktime": ".mp4", // clipurile de pe iPhone (.mov) folosesc tot containerul ISO-BMFF
  "application/pdf": ".pdf", // pedigree scanat
};

const VIDEO_TYPES = new Set(["video/mp4", "video/webm", "video/quicktime"]);
const DOC_TYPES = new Set(["application/pdf"]);

/** Recunoaste tipul dupa continut, nu dupa numele fisierului. */
function sniff(buf: Buffer): string | null {
  if (buf.length > 3 && buf[0] === 0xff && buf[1] === 0xd8 && buf[2] === 0xff) return "image/jpeg";
  if (buf.length > 8 && buf[0] === 0x89 && buf[1] === 0x50 && buf[2] === 0x4e && buf[3] === 0x47)
    return "image/png";
  if (
    buf.length > 12 &&
    buf.toString("ascii", 0, 4) === "RIFF" &&
    buf.toString("ascii", 8, 12) === "WEBP"
  )
    return "image/webp";
  // WebM/Matroska incepe cu antetul EBML
  if (buf.length > 4 && buf[0] === 0x1a && buf[1] === 0x45 && buf[2] === 0xdf && buf[3] === 0xa3)
    return "video/webm";
  if (buf.length > 4 && buf.toString("ascii", 0, 5) === "%PDF-") return "application/pdf";
  // MP4 / MOV: caseta "ftyp" la offset 4
  if (buf.length > 12 && buf.toString("ascii", 4, 8) === "ftyp") {
    const brand = buf.toString("ascii", 8, 12);
    return brand.startsWith("qt") ? "video/quicktime" : "video/mp4";
  }
  return null;
}

export async function POST(req: Request) {
  try {
    // Loturile le urca vanzatorii aprobati; articolele le scrie adminul.
    // Acceptam oricare dintre cele doua roluri.
    let uploaderId: string;
    try {
      const seller = await requireApprovedSeller();
      uploaderId = seller.id;
    } catch (e) {
      if (!(e instanceof AuthError)) throw e;
      const admin = await requireAdmin();
      uploaderId = admin.id;
    }

    const check = rateLimit(`upload:${uploaderId}`, 60, 60 * 60_000);
    if (!check.allowed) return jsonTooManyRequests(check.retryAfterSeconds);

    const form = await req.formData();
    const files = form.getAll("files").filter((f): f is File => f instanceof File);
    if (files.length === 0) return jsonError("NO_FILES", 400);
    if (files.length > MAX_FILES) return jsonError("TOO_MANY_FILES", 400, { max: MAX_FILES });

    await mkdir(UPLOADS_DIR, { recursive: true });

    const uploaded: { url: string; type: "IMAGE" | "VIDEO" | "DOC" }[] = [];
    for (const file of files) {
      const buf = Buffer.from(await file.arrayBuffer());
      const realType = sniff(buf);
      if (!realType || !(realType in EXT)) return jsonError("INVALID_TYPE", 400);

      const isVideo = VIDEO_TYPES.has(realType);
      const isDoc = DOC_TYPES.has(realType);
      const limit = isVideo ? MAX_VIDEO_BYTES : isDoc ? MAX_DOC_BYTES : MAX_IMAGE_BYTES;
      if (file.size > limit) {
        return jsonError("FILE_TOO_LARGE", 400, { maxBytes: limit, isVideo, isDoc });
      }

      const name = `${Date.now()}-${randomBytes(8).toString("hex")}${EXT[realType]}`;
      await writeFile(path.join(UPLOADS_DIR, name), buf);
      uploaded.push({
        url: `/api/files/${name}`,
        type: isVideo ? "VIDEO" : isDoc ? "DOC" : "IMAGE",
      });
    }

    return jsonOk({ files: uploaded, urls: uploaded.map((u) => u.url) });
  } catch (e) {
    return handleApiError(e);
  }
}
