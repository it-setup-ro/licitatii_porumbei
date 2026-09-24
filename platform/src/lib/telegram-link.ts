/**
 * Legarea unui destinatar de Telegram, fără ca cineva să umble pe server.
 *
 * Adminul cere un link de invitație din Administrare → Anunțuri, omul îl apasă
 * pe telefon și trimite „Start". Telegram ne dă mesajul lui, noi îi recunoaștem
 * codul și reținem chat-ul. Pentru un grup e la fel: botul se adaugă în grup și
 * se scrie acolo codul.
 *
 * Cât timp site-ul e pe http fără domeniu, Telegram nu ne poate anunța singur
 * (webhook-ul cere HTTPS), deci întrebăm noi din sweeper, o dată la 15 secunde.
 */

import { prisma } from "./db";
import { telegramConfigured, telegramSend, telegramUpdates } from "./telegram";

const CHEIE_OFFSET = "telegramUpdateOffset";
/** invitația se stinge singură: un link vechi nu mai leagă pe nimeni */
const VALABIL_MINUTE = 60;

async function citesteOffset(): Promise<number> {
  const rand = await prisma.platformSetting.findUnique({ where: { key: CHEIE_OFFSET } });
  if (!rand) return 0;
  const n = Number(JSON.parse(rand.value));
  return Number.isFinite(n) ? n : 0;
}

async function scrieOffset(valoare: number): Promise<void> {
  await prisma.platformSetting.upsert({
    where: { key: CHEIE_OFFSET },
    update: { value: JSON.stringify(valoare) },
    create: { key: CHEIE_OFFSET, value: JSON.stringify(valoare) },
  });
}

/** Numele sub care apare cine a scris: la grup titlul, la om prenumele. */
function numeChat(chat: { title?: string; first_name?: string; username?: string }): string {
  return chat.title ?? chat.first_name ?? chat.username ?? "chat";
}

/**
 * Citește mesajele noi către bot și leagă destinatarii care au trimis un cod.
 * Nu aruncă: o pană la Telegram nu are voie să oprească sweeperul.
 */
export async function pollTelegramLinks(): Promise<{ legate: number }> {
  if (!telegramConfigured()) return { legate: 0 };
  let legate = 0;
  try {
    const offset = await citesteOffset();
    const updates = await telegramUpdates(offset);
    if (updates.length === 0) return { legate: 0 };

    for (const u of updates) {
      const mesaj = u.message;
      if (!mesaj?.text) continue;
      const chatId = String(mesaj.chat.id);
      const text = mesaj.text.trim();

      if (/^\/stop\b/i.test(text)) {
        await prisma.alertRecipient.updateMany({ where: { chatId }, data: { active: false } });
        await telegramSend(chatId, "Gata, nu mai trimit anunțuri aici. Scrie din nou codul primit ca să le pornești la loc.");
        continue;
      }

      // „/start COD" (linkul t.me) sau doar codul scris în grup
      const cod = (text.match(/^\/start\s+([A-Z0-9]{4,16})$/i) ?? text.match(/^([A-Z0-9]{8})$/i))?.[1];
      if (!cod) {
        if (/^\/start\b/i.test(text)) {
          await telegramSend(
            chatId,
            "Salut! Ca să primești anunțurile de pe site, cere-i administratorului linkul de invitație (Administrare → Anunțuri)."
          );
        }
        continue;
      }

      const limita = new Date(Date.now() - VALABIL_MINUTE * 60_000);
      const destinatar = await prisma.alertRecipient.findFirst({
        where: { code: cod.toUpperCase(), chatId: null, codeAt: { gte: limita } },
      });
      if (!destinatar) {
        await telegramSend(chatId, "Codul nu mai e bun (a fost folosit sau a expirat). Cere-i administratorului altul.");
        continue;
      }

      await prisma.alertRecipient.update({
        where: { id: destinatar.id },
        data: {
          chatId,
          linkedAt: new Date(),
          active: true,
          label: destinatar.label || numeChat(mesaj.chat),
        },
      });
      legate++;
      await telegramSend(
        chatId,
        `Gata! De acum primești aici anunțurile de pe ${destinatar.label || "site"}. Scrie /stop dacă vrei să se oprească.`
      );
    }

    await scrieOffset(Math.max(...updates.map((u) => u.update_id)) + 1);
  } catch (e) {
    // o cădere trecătoare de rețea nu merită o urmă întreagă de eroare în jurnal
    const mesaj = e instanceof Error ? e.message : String(e);
    console.error("[telegram] nu am putut citi mesajele: " + mesaj);
  }
  return { legate };
}
