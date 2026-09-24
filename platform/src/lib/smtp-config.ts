import { prisma } from "./db";
import { getSettings } from "./settings";
import { openSecret, sealSecret } from "./secret-box";

/**
 * Datele serviciului de e-mail, scrise din administrare.
 *
 * Daniel: „tot nu văd unde se scriu datele de Google ca să trimită acum
 * mailuri". Până acum se puteau pune doar pe server, în fișierul de
 * configurare; acum se scriu din site, iar parola se păstrează criptată
 * (`lib/secret-box.ts`). Ce e scris pe server rămâne valabil și are întâietate
 * — altfel o setare greșită din site ar opri e-mailurile fără să-și dea nimeni
 * seama de unde.
 */

const CHEIE = "smtpConfig";

export const SMTP_PRESETS = {
  GMAIL: { eticheta: "Gmail", host: "smtp.gmail.com", port: 587 },
  BREVO: { eticheta: "Brevo", host: "smtp-relay.brevo.com", port: 587 },
  OTHER: { eticheta: "Alt server", host: "", port: 587 },
} as const;

export type SmtpProvider = keyof typeof SMTP_PRESETS;

export type SmtpConfigPublic = {
  provider: SmtpProvider;
  host: string;
  port: number;
  user: string;
  fromEmail: string;
  fromName: string;
  /** când a fost scrisă ultima oară, ca să se vadă că nu e uitată din 2024 */
  updatedAt: string;
};

type Stocat = SmtpConfigPublic & { passEnc: string };

function curata(x: unknown): Stocat | null {
  if (!x || typeof x !== "object") return null;
  const o = x as Record<string, unknown>;
  if (typeof o.host !== "string" || typeof o.user !== "string" || typeof o.passEnc !== "string") return null;
  const provider = (typeof o.provider === "string" && o.provider in SMTP_PRESETS ? o.provider : "OTHER") as SmtpProvider;
  return {
    provider,
    host: o.host,
    port: typeof o.port === "number" ? o.port : 587,
    user: o.user,
    passEnc: o.passEnc,
    fromEmail: typeof o.fromEmail === "string" ? o.fromEmail : o.user,
    fromName: typeof o.fromName === "string" ? o.fromName : "",
    updatedAt: typeof o.updatedAt === "string" ? o.updatedAt : new Date().toISOString(),
  };
}

async function citeste(): Promise<Stocat | null> {
  const rand = await prisma.platformSetting.findUnique({ where: { key: CHEIE } });
  if (!rand) return null;
  try {
    return curata(JSON.parse(rand.value));
  } catch {
    return null;
  }
}

/** Ce se arată în administrare: tot, în afară de parolă. */
export async function smtpConfigPublic(): Promise<SmtpConfigPublic | null> {
  const c = await citeste();
  if (!c) return null;
  const { passEnc: _passEnc, ...restul } = c;
  void _passEnc;
  return restul;
}

/** Datele cu care se trimite efectiv. Serverul are întâietate. */
export async function smtpSettings(): Promise<{
  url: string;
  from: string;
  source: "server" | "site";
  host: string;
  user: string;
} | null> {
  const { siteName: numeSite } = await getSettings();
  const dinServer = process.env.SMTP_URL?.trim();
  if (dinServer) {
    try {
      const u = new URL(dinServer);
      return {
        url: dinServer,
        from: process.env.SMTP_FROM?.trim() || `${numeSite} <no-reply@localhost>`,
        source: "server",
        host: u.hostname,
        user: u.username ? decodeURIComponent(u.username) : "",
      };
    } catch {
      // adresă stricată în fișierul de configurare: încercăm ce e scris din site
    }
  }

  const c = await citeste();
  if (!c) return null;
  const parola = openSecret(c.passEnc);
  if (parola === null) return null;
  const url = `smtp://${encodeURIComponent(c.user)}:${encodeURIComponent(parola)}@${c.host}:${c.port}`;
  return {
    url,
    from: `${c.fromName || numeSite} <${c.fromEmail}>`,
    source: "site",
    host: c.host,
    user: c.user,
  };
}

/** Scrie datele venite din formular. Parola se criptează aici, o singură dată. */
export async function saveSmtpConfig(d: {
  provider: SmtpProvider;
  host: string;
  port: number;
  user: string;
  /** gol = păstrăm parola de dinainte (formularul nu o arată niciodată) */
  pass?: string;
  fromEmail: string;
  fromName: string;
}): Promise<{ ok: true } | { ok: false; error: string }> {
  const vechi = await citeste();
  const passEnc = d.pass ? sealSecret(d.pass) : vechi?.passEnc;
  if (!passEnc) return { ok: false, error: "FARA_PAROLA" };

  const valoare: Stocat = {
    provider: d.provider,
    host: d.host,
    port: d.port,
    user: d.user,
    passEnc,
    fromEmail: d.fromEmail,
    fromName: d.fromName,
    updatedAt: new Date().toISOString(),
  };
  await prisma.platformSetting.upsert({
    where: { key: CHEIE },
    update: { value: JSON.stringify(valoare) },
    create: { key: CHEIE, value: JSON.stringify(valoare) },
  });
  return { ok: true };
}

export async function deleteSmtpConfig(): Promise<void> {
  await prisma.platformSetting.deleteMany({ where: { key: CHEIE } });
}
