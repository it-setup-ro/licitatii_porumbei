import type { Metadata } from "next";
import { Playfair_Display, Inter } from "next/font/google";
import { NextIntlClientProvider, hasLocale } from "next-intl";
import { setRequestLocale } from "next-intl/server";
import { notFound } from "next/navigation";
import { routing } from "@/i18n/routing";
import { getSettings } from "@/lib/settings";
import { getCurrentUser } from "@/lib/auth";
import { prisma } from "@/lib/db";
import SiteHeader from "@/components/SiteHeader";
import TopBar from "@/components/TopBar";
import { cartItemCount } from "@/lib/cart";
import SiteFooter from "@/components/SiteFooter";
import "../globals.css";

const display = Playfair_Display({ variable: "--font-display", subsets: ["latin"] });
const body = Inter({ variable: "--font-body", subsets: ["latin"] });

export async function generateMetadata(): Promise<Metadata> {
  const settings = await getSettings();
  return {
    title: { default: settings.siteName, template: `%s · ${settings.siteName}` },
    description: "Licitații online de porumbei de rasă / Online pigeon auctions",
  };
}

/**
 * Antetul afiseaza date care se schimba de la o cerere la alta: utilizatorul
 * curent, numarul din cos, notificarile necitite si linkurile din meniu
 * (editabile din admin). Fara randare dinamica explicita, o modificare facuta
 * in admin putea sa nu apara pana la urmatorul build.
 */
export const dynamic = "force-dynamic";

export function generateStaticParams() {
  return routing.locales.map((locale) => ({ locale }));
}

export default async function LocaleLayout({
  children,
  params,
}: {
  children: React.ReactNode;
  params: Promise<{ locale: string }>;
}) {
  const { locale } = await params;
  if (!hasLocale(routing.locales, locale)) notFound();
  setRequestLocale(locale);

  const settings = await getSettings();
  const user = await getCurrentUser();
  const unreadCount = user
    ? await prisma.notification.count({ where: { userId: user.id, readAt: null } })
    : 0;
  const cartCount = await cartItemCount();
  const contestLinks = await prisma.externalLink.findMany({
    where: { group: "CONTESTS", active: true },
    orderBy: { sortIdx: "asc" },
    select: { id: true, labelRo: true, labelEn: true, url: true },
  });

  return (
    <html lang={locale} className={`${display.variable} ${body.variable} h-full antialiased`}>
      <body className="min-h-screen flex flex-col">
        <NextIntlClientProvider>
          <TopBar isLoggedIn={user !== null} isAdmin={user?.role === "ADMIN"} />
          <SiteHeader
            siteName={settings.siteName}
            user={
              user
                ? {
                    id: user.id,
                    name: user.name,
                    role: user.role,
                    sellerStatus: user.sellerStatus,
                  }
                : null
            }
            unreadCount={unreadCount}
            cartCount={cartCount}
            contestLinks={contestLinks}
          />
          <main className="flex-1">{children}</main>
          <SiteFooter siteName={settings.siteName} />
        </NextIntlClientProvider>
      </body>
    </html>
  );
}
