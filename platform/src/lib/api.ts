import { NextResponse } from "next/server";
import type { ZodError, ZodIssue } from "zod";
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
  // Corp de cerere care nu e JSON valid — de obicei gol. E greșeala celui care
  // cheamă ruta, nu o defecțiune a serverului: înainte ieșea „INTERNAL" 500 și
  // părea că s-a stricat ceva (s-a întâmplat la ascunderea unei licitații).
  if (isJsonParseError(e)) {
    return jsonError("INVALID_JSON", 400);
  }
  console.error(e);
  return jsonError("INTERNAL", 500);
}

/** Eroarea pe care o dă `request.json()` când corpul lipsește sau e stricat. */
export function isJsonParseError(e: unknown): boolean {
  return e instanceof SyntaxError && /JSON/i.test(e.message);
}

/**
 * Raspuns de validare care spune CE camp e gresit si de ce.
 *
 * Inainte se intorcea doar „VALIDATION", iar in pagina scria „Datele nu sunt
 * valide" — omul ramanea sa ghiceasca dintre douazeci de campuri. Aici iese o
 * pereche camp -> explicatie, pe care formularul o pune sub campul vinovat.
 *
 * Textele sunt in romana pentru ca panoul de administrare e in romana.
 */
export function jsonValidationError(err: ZodError) {
  return jsonError("VALIDATION", 422, { fields: validationFields(err) });
}

/** Perechile camp -> explicatie dintr-o validare esuata. */
export function validationFields(err: ZodError): Record<string, string> {
  const fields: Record<string, string> = {};
  for (const issue of err.issues) {
    const key = issue.path.join(".");
    if (!key || fields[key]) continue; // prima problema de pe camp e destul
    fields[key] = explainIssue(issue);
  }
  return fields;
}

function explainIssue(issue: ZodIssue): string {
  // mesajul scris de noi in schema bate orice traducere generica
  const written = issue.message && !/^Invalid|^Too |^Required/i.test(issue.message);
  if (written) return issue.message;

  switch (issue.code) {
    case "invalid_type":
      return "Câmp obligatoriu.";
    case "too_small": {
      const min = "minimum" in issue ? Number(issue.minimum) : 0;
      return issue.origin === "string"
        ? `Prea scurt — minimum ${min} caractere.`
        : `Prea mic — minimum ${min}.`;
    }
    case "too_big": {
      const max = "maximum" in issue ? Number(issue.maximum) : 0;
      return issue.origin === "string"
        ? `Prea lung — maximum ${max} caractere.`
        : `Prea mare — maximum ${max}.`;
    }
    case "invalid_format":
      return "Formatul nu este bun.";
    case "invalid_value":
      return "Valoare nepermisă.";
    default:
      return "Valoarea nu este bună.";
  }
}
