import { randomBytes } from "crypto";
import { createWriteStream } from "fs";
import { mkdir, unlink, writeFile } from "fs/promises";
import path from "path";
import { pipeline } from "stream/promises";
import { Readable } from "stream";
import { requireApprovedSeller, requireAdmin, AuthError } from "@/lib/auth";
import { rateLimit } from "@/lib/rate-limit";
import { jsonOk, jsonError, jsonTooManyRequests, handleApiError } from "@/lib/api";

/**
 * Upload de poze, clipuri si documente PDF (loturi + articole).
 * Fisierele se salveaza pe disc in uploads/ si se servesc prin /api/files/[name].
 *
 * Doua cai de intrare:
 *  - multipart/form-data — pentru poze si PDF-uri (cateva MB, se pot tine in memorie)
 *  - corpul brut al cererii, un singur fisier — pentru CLIPURI. Un clip de cinci
 *    minute are sute de MB; citit intreg in memorie, ar putea da jos serverul,
 *    pe care mai ruleaza si alte aplicatii. Asa se scrie pe disc pe masura ce vine.
 *
 * Validari: se verifica semnatura reala a fisierului (magic bytes), nu tipul
 * declarat de browser — un fisier text redenumit .png nu trece. SVG-ul e
 * exclus deliberat (poate contine script => XSS).
 */

const UPLOADS_DIR = path.join(process.cwd(), "uploads");
const MAX_IMAGE_BYTES = 5 * 1024 * 1024; // 5 MB
const MAX_VIDEO_BYTES = 300 * 1024 * 1024; // 300 MB — cinci minute filmate cu telefonul
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

/**
 * Scrie corpul cererii direct pe disc, verificand pe parcurs.
 *
 * Primul bloc de octeti spune ce fisier e (semnatura reala, nu ce declara
 * browserul). Daca depaseste plafonul, oprim si stergem ce s-a scris — nu
 * asteptam sa ajunga tot pe disc ca sa constatam ca era prea mare.
 */
type StreamResult =
  | { ok: true; file: { url: string; type: "IMAGE" | "VIDEO" | "DOC" } }
  | { ok: false; error: string; maxBytes?: number; isVideo?: boolean; isDoc?: boolean };

async function streamToDisk(body: ReadableStream<Uint8Array>): Promise<StreamResult> {
  const reader = body.getReader();
  const first = await reader.read();
  if (first.done || !first.value) return { ok: false, error: "NO_FILES" };

  const head = Buffer.from(first.value.subarray(0, 32));
  const realType = sniff(head);
  if (!realType || !(realType in EXT)) return { ok: false, error: "INVALID_TYPE" };

  const isVideo = VIDEO_TYPES.has(realType);
  const isDoc = DOC_TYPES.has(realType);
  const limit = isVideo ? MAX_VIDEO_BYTES : isDoc ? MAX_DOC_BYTES : MAX_IMAGE_BYTES;

  await mkdir(UPLOADS_DIR, { recursive: true });
  const name = `${Date.now()}-${randomBytes(8).toString("hex")}${EXT[realType]}`;
  const full = path.join(UPLOADS_DIR, name);

  let written = 0;
  let tooLarge = false;

  const chunks = (async function* () {
    let chunk: Uint8Array | undefined = first.value;
    while (chunk) {
      written += chunk.byteLength;
      if (written > limit) {
        tooLarge = true;
        await reader.cancel();
        return;
      }
      yield chunk;
      const next = await reader.read();
      if (next.done) return;
      chunk = next.value;
    }
  })();

  try {
    await pipeline(Readable.from(chunks), createWriteStream(full));
  } catch {
    await unlink(full).catch(() => {});
    return { ok: false, error: "UPLOAD_FAILED" };
  }

  if (tooLarge) {
    await unlink(full).catch(() => {});
    return { ok: false, error: "FILE_TOO_LARGE", isVideo, isDoc, maxBytes: limit };
  }

  return {
    ok: true,
    file: {
      url: `/api/files/${name}`,
      type: (isVideo ? "VIDEO" : isDoc ? "DOC" : "IMAGE") as "IMAGE" | "VIDEO" | "DOC",
    },
  };
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

    // Un singur fisier trimis ca atare (clipuri): se scrie pe disc pe masura ce vine.
    if (!(req.headers.get("content-type") ?? "").startsWith("multipart/form-data")) {
      if (!req.body) return jsonError("NO_FILES", 400);
      const out = await streamToDisk(req.body);
      if (!out.ok) {
        return jsonError(out.error, 400, {
          maxBytes: out.maxBytes,
          isVideo: out.isVideo,
          isDoc: out.isDoc,
        });
      }
      return jsonOk({ files: [out.file], urls: [out.file.url] });
    }

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
