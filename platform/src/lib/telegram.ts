/**
 * Legătura cu Telegram: un bot al platformei care trimite anunțuri
 * administratorului (și clientului, dacă vrea) — cont nou de aprobat, mesaj
 * prin formularul de contact, comandă nouă.
 *
 * Token-ul stă în `.env` pe server (`TELEGRAM_BOT_TOKEN`), nu în cod: depozitul
 * e public. Fără token, totul de aici e inert — site-ul merge mai departe, doar
 * că anunțurile pleacă numai pe e-mail.
 */

const API = "https://api.telegram.org";

export type TelegramUpdate = {
  update_id: number;
  message?: {
    text?: string;
    chat: { id: number; type: string; title?: string; first_name?: string; username?: string };
    from?: { first_name?: string; username?: string };
  };
};

export function telegramToken(): string | null {
  return process.env.TELEGRAM_BOT_TOKEN?.trim() || null;
}

export function telegramConfigured(): boolean {
  return telegramToken() !== null;
}

/** O cădere de rețea (conexiune resetată) merită o a doua încercare; un refuz
 *  al Telegramului (token greșit, chat inexistent) nu — ăla se întoarce la om. */
function maiIncearca(e: unknown): boolean {
  return e instanceof TypeError || (e instanceof Error && e.name === "TimeoutError");
}

async function cheama<T>(metoda: string, payload: Record<string, unknown> = {}): Promise<T> {
  const token = telegramToken();
  if (!token) throw new Error("Telegram nu e configurat (lipsește TELEGRAM_BOT_TOKEN).");

  const odata = async (): Promise<T> => {
    const res = await fetch(`${API}/bot${token}/${metoda}`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(payload),
      // fără termen, o cerere agățată ar bloca sweeperul la fiecare rundă
      signal: AbortSignal.timeout(20_000),
    });
    const body = (await res.json()) as { ok: boolean; result?: T; description?: string };
    if (!body.ok) throw new Error(body.description ?? `Telegram a răspuns ${res.status}`);
    return body.result as T;
  };

  try {
    return await odata();
  } catch (e) {
    if (!maiIncearca(e)) throw e;
    await new Promise((r) => setTimeout(r, 1_000));
    return odata();
  }
}

/** Numele botului, pentru linkul de invitație (t.me/NumeBot?start=COD). */
export async function telegramBotName(): Promise<string> {
  const me = await cheama<{ username: string }>("getMe");
  return me.username;
}

/** Un mesaj către un om sau un grup. Text simplu: fără formatare, fără surprize. */
export async function telegramSend(chatId: string, text: string): Promise<void> {
  await cheama("sendMessage", {
    chat_id: chatId,
    text,
    disable_web_page_preview: true,
  });
}

/**
 * Mesajele noi către bot. Cât timp site-ul e pe http fără domeniu, Telegram nu
 * ne poate anunța el (webhook-ul cere HTTPS), așa că întrebăm noi periodic.
 */
export async function telegramUpdates(offset: number): Promise<TelegramUpdate[]> {
  return cheama<TelegramUpdate[]>("getUpdates", {
    offset,
    timeout: 0,
    allowed_updates: ["message"],
  });
}
