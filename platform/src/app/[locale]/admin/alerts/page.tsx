import { setRequestLocale } from "next-intl/server";
import { prisma } from "@/lib/db";
import { requireAdmin } from "@/lib/auth";
import { ALERT_EVENTS, parseEvents, siteUrl } from "@/lib/alerts";
import { telegramBotName, telegramConfigured } from "@/lib/telegram";
import AlertsPanel from "@/components/admin/AlertsPanel";

/**
 * Anunțuri pentru administrator: cine află, pe ce cale, despre ce.
 *
 * Daniel: „când cineva face cerere de cont (sau alte acțiuni care necesită
 * atenția administratorului) se trimite mail? Se poate și pe Telegram?".
 * Aici se leagă totul, fără să umble cineva pe server.
 */
export default async function AdminAlertsPage({ params }: { params: Promise<{ locale: string }> }) {
  const { locale } = await params;
  setRequestLocale(locale);
  await requireAdmin();

  const recipients = await prisma.alertRecipient.findMany({ orderBy: { createdAt: "asc" } });

  let botName: string | null = null;
  let botError: string | null = null;
  if (telegramConfigured()) {
    try {
      botName = await telegramBotName();
    } catch (e) {
      botError = e instanceof Error ? e.message : "botul nu răspunde";
    }
  }

  return (
    <div>
      <h1 className="font-display text-3xl font-bold">Anunțuri</h1>
      <p className="mt-2 max-w-3xl text-ink/70">
        Ce se întâmplă pe site și cere atenția cuiva — cerere de cont, mesaj de contact, porumbel
        trimis spre aprobare, comandă nouă — ajunge pe e-mail și pe Telegram, la cine e trecut mai
        jos. Fiecare destinatar primește doar ce bifezi pentru el.
      </p>

      <AlertsPanel
        botName={botName}
        botConfigured={telegramConfigured()}
        botError={botError}
        siteUrl={siteUrl()}
        events={ALERT_EVENTS}
        recipients={recipients.map((r) => ({
          id: r.id,
          kind: r.kind as "EMAIL" | "TELEGRAM",
          label: r.label,
          email: r.email,
          chatId: r.chatId,
          code: r.code,
          linked: r.linkedAt !== null,
          active: r.active,
          events: parseEvents(r.events),
          lastSentAt: r.lastSentAt ? r.lastSentAt.toISOString() : null,
          lastError: r.lastError,
        }))}
      />
    </div>
  );
}
