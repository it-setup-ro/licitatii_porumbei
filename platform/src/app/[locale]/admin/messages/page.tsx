import { getLocale, setRequestLocale } from "next-intl/server";
import { prisma } from "@/lib/db";

export const dynamic = "force-dynamic";

export default async function AdminMessagesPage({
  params,
}: {
  params: Promise<{ locale: string }>;
}) {
  const { locale } = await params;
  setRequestLocale(locale);
  const currentLocale = await getLocale();

  const messages = await prisma.contactMessage.findMany({
    orderBy: { createdAt: "desc" },
    take: 100,
  });

  return (
    <div>
      <h1 className="font-display mb-6 text-3xl font-bold">Mesaje din formularul de contact</h1>

      {messages.length === 0 ? (
        <p className="text-ink/50" data-testid="no-messages">
          Niciun mesaj primit.
        </p>
      ) : (
        <div className="space-y-4" data-testid="messages-list">
          {messages.map((m) => (
            <div
              key={m.id}
              className="rounded-2xl border border-ink/10 bg-white p-5"
              data-testid="message-row"
            >
              <div className="flex flex-wrap items-center justify-between gap-2">
                <p className="font-display font-bold">{m.subject}</p>
                <span className="text-xs text-ink/50">
                  {new Intl.DateTimeFormat(currentLocale === "ro" ? "ro-RO" : "en-GB", {
                    dateStyle: "medium",
                    timeStyle: "short",
                  }).format(m.createdAt)}
                </span>
              </div>
              <p className="mt-1 text-sm text-ink/60">
                {m.name} ·{" "}
                <a href={`mailto:${m.email}`} className="text-wing-blue hover:underline">
                  {m.email}
                </a>
              </p>
              <p className="mt-3 whitespace-pre-wrap text-sm text-ink/80">{m.message}</p>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
