import { createReadStream } from "fs";
import { stat } from "fs/promises";
import path from "path";
import { NextResponse } from "next/server";
import type { ReadableStream as NodeWebReadableStream } from "stream/web";
import { Readable } from "stream";

/**
 * Serveste fisierele urcate (poze, clipuri si pedigree-uri PDF).
 *
 * Numele e validat strict — fara path traversal. Pentru video raspundem la
 * cereri partiale (HTTP Range): fara ele playerul nu poate derula, iar un clip
 * de zeci de MB ar fi citit integral in memorie la fiecare cerere.
 */

const UPLOADS_DIR = path.join(process.cwd(), "uploads");

const TYPES: Record<string, string> = {
  ".jpg": "image/jpeg",
  ".png": "image/png",
  ".webp": "image/webp",
  ".mp4": "video/mp4",
  ".webm": "video/webm",
  ".pdf": "application/pdf",
};

const NAME_RE = /^[a-z0-9-]+\.(jpg|png|webp|mp4|webm|pdf)$/i;

export async function GET(req: Request, ctx: { params: Promise<{ name: string }> }) {
  const { name } = await ctx.params;
  if (!NAME_RE.test(name)) return new NextResponse(null, { status: 404 });

  const full = path.join(UPLOADS_DIR, name);
  const type = TYPES[path.extname(name).toLowerCase()] ?? "application/octet-stream";

  let size: number;
  try {
    const info = await stat(full);
    if (!info.isFile()) return new NextResponse(null, { status: 404 });
    size = info.size;
  } catch {
    return new NextResponse(null, { status: 404 });
  }

  const baseHeaders: Record<string, string> = {
    "Content-Type": type,
    "Accept-Ranges": "bytes",
    "Cache-Control": "public, max-age=31536000, immutable",
  };

  // Headerele de izolare (nosniff, sandbox) vin din next.config.ts, pentru tot
  // ce se serveste din /api/files. Aici doar spunem browserului sa deschida
  // PDF-ul in pagina, nu sa-l descarce.
  if (type === "application/pdf") {
    baseHeaders["Content-Disposition"] = `inline; filename="${name}"`;
  }

  const range = req.headers.get("range");
  if (range) {
    const m = /^bytes=(\d*)-(\d*)$/.exec(range.trim());
    if (!m) {
      return new NextResponse(null, {
        status: 416,
        headers: { "Content-Range": `bytes */${size}` },
      });
    }
    // "bytes=-500" = ultimii 500 octeti; "bytes=100-" = de la 100 pana la final
    const hasStart = m[1] !== "";
    const start = hasStart ? Number(m[1]) : Math.max(0, size - Number(m[2] || 0));
    const end = hasStart ? (m[2] !== "" ? Math.min(Number(m[2]), size - 1) : size - 1) : size - 1;

    if (Number.isNaN(start) || Number.isNaN(end) || start > end || start >= size) {
      return new NextResponse(null, {
        status: 416,
        headers: { "Content-Range": `bytes */${size}` },
      });
    }

    const stream = Readable.toWeb(
      createReadStream(full, { start, end })
    ) as NodeWebReadableStream<Uint8Array>;

    return new NextResponse(stream as unknown as BodyInit, {
      status: 206,
      headers: {
        ...baseHeaders,
        "Content-Range": `bytes ${start}-${end}/${size}`,
        "Content-Length": String(end - start + 1),
      },
    });
  }

  const stream = Readable.toWeb(createReadStream(full)) as NodeWebReadableStream<Uint8Array>;
  return new NextResponse(stream as unknown as BodyInit, {
    status: 200,
    headers: { ...baseHeaders, "Content-Length": String(size) },
  });
}
