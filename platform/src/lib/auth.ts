import { cookies } from "next/headers";
import { SignJWT, jwtVerify } from "jose";
import bcrypt from "bcryptjs";
import { prisma } from "./db";

const COOKIE = "nbp_session";

/**
 * Secretul de semnare a sesiunilor. FARA fallback: un secret ghicibil ar permite
 * oricui sa-si semneze singur un token de admin. In dev acceptam un secret local
 * doar daca e setat explicit; in productie lipsa lui opreste aplicatia.
 */
const secret = () => {
  const value = process.env.AUTH_SECRET;
  if (!value || value.length < 32) {
    throw new Error(
      "AUTH_SECRET lipseste sau e prea scurt (minim 32 de caractere). " +
        "Genereaza unul cu: openssl rand -base64 48"
    );
  }
  return new TextEncoder().encode(value);
};

export type Session = { uid: string; role: string };

export async function hashPassword(plain: string) {
  return bcrypt.hash(plain, 10);
}

export async function verifyPassword(plain: string, hash: string) {
  return bcrypt.compare(plain, hash);
}

export async function createSessionCookie(uid: string, role: string) {
  const token = await new SignJWT({ uid, role })
    .setProtectedHeader({ alg: "HS256" })
    .setIssuedAt()
    .setExpirationTime("7d")
    .sign(secret());
  const store = await cookies();
  store.set(COOKIE, token, {
    httpOnly: true,
    sameSite: "lax",
    // Secure implicit doar cand chiar rulam pe HTTPS (nu doar NODE_ENV=production) —
    // altfel browserul refuza sa trimita cookie-ul pe un deploy HTTP-only (IP:port fara domeniu/SSL).
    // Seteaza COOKIE_SECURE=true in .env dupa ce site-ul are domeniu + certificat.
    secure: process.env.COOKIE_SECURE === "true",
    path: "/",
    maxAge: 60 * 60 * 24 * 7,
  });
}

export async function destroySession() {
  const store = await cookies();
  store.delete(COOKIE);
}

export async function getSession(): Promise<Session | null> {
  const store = await cookies();
  const token = store.get(COOKIE)?.value;
  if (!token) return null;
  try {
    const { payload } = await jwtVerify(token, secret());
    if (typeof payload.uid !== "string") return null;
    return { uid: payload.uid, role: String(payload.role ?? "BUYER") };
  } catch {
    return null;
  }
}

export async function getCurrentUser() {
  const session = await getSession();
  if (!session) return null;
  return prisma.user.findUnique({ where: { id: session.uid } });
}

export async function requireUser() {
  const user = await getCurrentUser();
  if (!user || user.suspendedAt) throw new AuthError("UNAUTHENTICATED");
  return user;
}

export async function requireAdmin() {
  const user = await requireUser();
  if (user.role !== "ADMIN") throw new AuthError("FORBIDDEN");
  return user;
}

export async function requireApprovedSeller() {
  const user = await requireUser();
  if (user.role === "ADMIN") return user;
  if (user.role !== "SELLER" || user.sellerStatus !== "APPROVED")
    throw new AuthError("FORBIDDEN");
  return user;
}

export class AuthError extends Error {
  constructor(public code: "UNAUTHENTICATED" | "FORBIDDEN") {
    super(code);
  }
}
