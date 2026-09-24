/**
 * Starea trimiterii de e-mailuri, în cuvinte, fără parole.
 *
 * Până acum, singurul loc unde se vedea dacă platforma poate trimite e-mailuri
 * era fișierul `.env` de pe server — adică nicăieri, pentru cine nu intră pe
 * server. Daniel: „unde se setează, să fie evident în administrare, că uităm de
 * situație".
 *
 * Parola NU iese de aici niciodată: din adresa de conectare se scot doar
 * serverul, portul și numele de utilizator.
 */

export type SmtpStatus = {
  configurat: boolean;
  /** de unde vin datele: din fișierul de pe server sau scrise în administrare */
  sursa: "server" | "site" | null;
  /** smtp-relay.brevo.com, smtp.gmail.com… */
  host: string | null;
  port: number | null;
  user: string | null;
  /** furnizorul recunoscut după server, ca să putem spune limita lui */
  furnizor: "Brevo" | "Gmail" | "Amazon SES" | "Mailgun" | "altul" | null;
  /** de pe ce adresă pleacă mesajele (SMTP_FROM) */
  expeditor: string | null;
  /** ce trebuie știut despre câte mesaje poate trimite */
  limita: string | null;
};

function furnizorDupaHost(host: string): SmtpStatus["furnizor"] {
  const h = host.toLowerCase();
  if (h.includes("brevo") || h.includes("sendinblue")) return "Brevo";
  if (h.includes("gmail") || h.includes("google")) return "Gmail";
  if (h.includes("amazonaws")) return "Amazon SES";
  if (h.includes("mailgun")) return "Mailgun";
  return "altul";
}

const LIMITE: Record<string, string | null> = {
  Brevo: "Planul gratuit Brevo: 300 de e-mailuri pe zi. Peste atât, mesajele se opresc până a doua zi.",
  Gmail:
    "Gmail e bun pentru probe, nu pentru trimiteri în masă: în jur de 500 de mesaje pe zi, iar trimiterile multe pot duce la blocarea contului.",
  "Amazon SES": "Amazon SES: limita e cea din contul tău (se vede în consola AWS).",
  Mailgun: "Mailgun: limita e cea din planul tău.",
  altul: null,
};

export function smtpStatus(): SmtpStatus {
  const url = process.env.SMTP_URL?.trim();
  const expeditor = process.env.SMTP_FROM?.trim() || null;
  if (!url) {
    return { configurat: false, sursa: null, host: null, port: null, user: null, furnizor: null, expeditor, limita: null };
  }
  try {
    const u = new URL(url);
    const host = u.hostname;
    const furnizor = furnizorDupaHost(host);
    return {
      configurat: true,
      sursa: "server",
      host,
      port: u.port ? Number(u.port) : null,
      user: u.username ? decodeURIComponent(u.username) : null,
      furnizor,
      expeditor,
      limita: (furnizor ? LIMITE[furnizor] : null) ?? null,
    };
  } catch {
    // adresă scrisă greșit în .env: mai bine spunem asta decât să tăcem
    return { configurat: false, sursa: null, host: null, port: null, user: null, furnizor: null, expeditor, limita: null };
  }
}

/**
 * Aceeași stare, dar ținând cont și de datele scrise din administrare.
 * (Varianta de mai sus rămâne pentru locurile care nu pot aștepta baza de date.)
 */
export async function smtpStatusFull(): Promise<SmtpStatus> {
  const { smtpSettings } = await import("./smtp-config");
  const dinServer = smtpStatus();
  if (dinServer.configurat) return dinServer;

  const setari = await smtpSettings();
  if (!setari) return dinServer;

  const furnizor = furnizorDupaHost(setari.host);
  const port = Number(new URL(setari.url).port) || null;
  return {
    configurat: true,
    sursa: "site",
    host: setari.host,
    port,
    user: setari.user,
    furnizor,
    expeditor: setari.from,
    limita: (furnizor ? LIMITE[furnizor] : null) ?? null,
  };
}
