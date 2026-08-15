import { NextResponse } from "next/server";
import { AuthError } from "./auth";

export function jsonOk(data: Record<string, unknown> = {}) {
  return NextResponse.json({ ok: true, ...data });
}

export function jsonError(error: string, status = 400, extra: Record<string, unknown> = {}) {
  return NextResponse.json({ ok: false, error, ...extra }, { status });
}

/** 429 cu Retry-After, folosit de rutele cu rate limiting. */
export function jsonTooManyRequests(retryAfterSeconds: number) {
  return NextResponse.json(
    { ok: false, error: "RATE_LIMITED", retryAfterSeconds },
    { status: 429, headers: { "Retry-After": String(retryAfterSeconds) } }
  );
}

export function handleApiError(e: unknown) {
  if (e instanceof AuthError) {
    return jsonError(e.code, e.code === "UNAUTHENTICATED" ? 401 : 403);
  }
  console.error(e);
  return jsonError("INTERNAL", 500);
}
