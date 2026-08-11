import { readFile } from "fs/promises";
import path from "path";
import { NextResponse } from "next/server";

/** Serveste pozele urcate de vanzatori. Nume strict validat — fara path traversal. */

const UPLOADS_DIR = path.join(process.cwd(), "uploads");
const TYPES: Record<string, string> = {
  ".jpg": "image/jpeg",
  ".png": "image/png",
  ".webp": "image/webp",
};

export async function GET(_req: Request, ctx: { params: Promise<{ name: string }> }) {
  const { name } = await ctx.params;
  if (!/^[a-z0-9-]+\.(jpg|png|webp)$/i.test(name)) {
    return new NextResponse(null, { status: 404 });
  }
  try {
    const buf = await readFile(path.join(UPLOADS_DIR, name));
    const type = TYPES[path.extname(name).toLowerCase()] ?? "application/octet-stream";
    return new NextResponse(new Uint8Array(buf), {
      headers: {
        "Content-Type": type,
        "Cache-Control": "public, max-age=31536000, immutable",
      },
    });
  } catch {
    return new NextResponse(null, { status: 404 });
  }
}
