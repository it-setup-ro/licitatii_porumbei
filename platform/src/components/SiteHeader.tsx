"use client";

import { useEffect, useState } from "react";
import { useTranslations } from "next-intl";
import { Link, usePathname, useRouter } from "@/i18n/navigation";
import LogoMark from "./LogoMark";
import LanguageSwitcher from "./LanguageSwitcher";

type HeaderUser = {
  id: string;
  name: string;
  role: string;
  sellerStatus: string | null;
} | null;

export default function SiteHeader({
  siteName,
  user,
  unreadCount,
}: {
  siteName: string;
  user: HeaderUser;
  unreadCount: number;
}) {
  const t = useTranslations("nav");
  const router = useRouter();
  const pathname = usePathname();
  const [menuOpen, setMenuOpen] = useState(false);
  const [mobileOpen, setMobileOpen] = useState(false);

  // inchide meniurile la schimbarea paginii
  useEffect(() => {
    setMobileOpen(false);
    setMenuOpen(false);
  }, [pathname]);

  // blocheaza scroll-ul in spatele panoului mobil
  useEffect(() => {
    document.body.style.overflow = mobileOpen ? "hidden" : "";
    return () => {
      document.body.style.overflow = "";
    };
  }, [mobileOpen]);

  const logout = async () => {
    await fetch("/api/auth/logout", { method: "POST" });
    // reload complet: evita cache-ul de ruta al Next, care ar pastra header-ul vechi
    window.location.assign("/");
  };

  const canSell = user && (user.role === "ADMIN" || user.sellerStatus === "APPROVED");

  return (
    <header className="sticky top-0 z-40 border-b border-ink/10 bg-ivory/95 backdrop-blur">
      <div className="mx-auto flex max-w-6xl items-center gap-3 px-4 py-3">
        <Link href="/" className="flex items-center gap-2" data-testid="logo-home">
          <LogoMark size={38} />
          <span className="font-display text-base font-bold leading-tight tracking-tight sm:text-lg">
            {siteName}
          </span>
        </Link>

        {/* Navigatie desktop */}
        <nav className="ml-6 hidden items-center gap-5 text-sm font-medium md:flex">
          <Link href="/auctions" className="hover:text-wing-orange transition-colors">
            {t("auctions")}
          </Link>
          <Link href="/how-it-works" className="hover:text-wing-orange transition-colors">
            {t("howItWorks")}
          </Link>
          {canSell && (
            <Link href="/sell" className="hover:text-wing-orange transition-colors">
              {t("sell")}
            </Link>
          )}
          {user?.role === "ADMIN" && (
            <Link
              href="/admin"
              className="text-wing-blue hover:text-wing-orange transition-colors"
              data-testid="nav-admin"
            >
              {t("admin")}
            </Link>
          )}
        </nav>

        <div className="ml-auto flex items-center gap-2 sm:gap-3">
          <LanguageSwitcher />

          {/* Clopotel de notificari — vizibil doar cand esti logat */}
          {user && (
            <Link
              href="/account/notifications"
              data-testid="notif-bell"
              aria-label={
                unreadCount > 0 ? `${t("notifications")} (${unreadCount})` : t("notifications")
              }
              title={t("notifications")}
              className="relative rounded-full p-2 text-ink/70 transition-colors hover:bg-ink/5 hover:text-ink"
            >
              <svg
                width="20"
                height="20"
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                strokeWidth="1.8"
                strokeLinecap="round"
                strokeLinejoin="round"
                aria-hidden="true"
              >
                <path d="M18 8A6 6 0 0 0 6 8c0 7-3 9-3 9h18s-3-2-3-9" />
                <path d="M13.73 21a2 2 0 0 1-3.46 0" />
              </svg>
              {unreadCount > 0 && (
                <span
                  className="absolute -right-0.5 -top-0.5 flex h-5 min-w-5 items-center justify-center rounded-full bg-wing-red px-1 text-xs font-bold text-white"
                  data-testid="unread-badge"
                >
                  {unreadCount > 9 ? "9+" : unreadCount}
                </span>
              )}
            </Link>
          )}

          {/* Meniul de cont — doar pe desktop; pe mobil intra in panoul hamburger */}
          {user ? (
            <div className="relative hidden md:block">
              <button
                onClick={() => setMenuOpen((v) => !v)}
                className="flex items-center gap-2 rounded-full border border-ink/15 px-3 py-1.5 text-sm font-medium transition-colors hover:border-ink/40"
                data-testid="user-menu"
              >
                <span>{user.name.split(" ")[0]}</span>
              </button>
              {menuOpen && (
                <div
                  className="absolute right-0 mt-2 w-52 rounded-xl border border-ink/10 bg-white p-2 shadow-xl"
                  onClick={() => setMenuOpen(false)}
                >
                  <MenuLink href="/account" label={t("account")} testid="menu-account" />
                  <MenuLink href="/account/bids" label={t("myBids")} testid="menu-bids" />
                  <MenuLink
                    href="/account/watchlist"
                    label={t("watchlist")}
                    testid="menu-watchlist"
                  />
                  <MenuLink
                    href="/account/notifications"
                    label={t("notifications")}
                    testid="menu-notifications"
                  />
                  <button
                    onClick={logout}
                    data-testid="menu-logout"
                    className="w-full rounded-lg px-3 py-2 text-left text-sm text-wing-red hover:bg-ink/5"
                  >
                    {t("logout")}
                  </button>
                </div>
              )}
            </div>
          ) : (
            <div className="hidden items-center gap-2 text-sm font-medium md:flex">
              <Link
                href="/login"
                className="rounded-full px-3 py-1.5 transition-colors hover:bg-ink/5"
                data-testid="nav-login"
              >
                {t("login")}
              </Link>
              <Link
                href="/register"
                className="rounded-full bg-ink px-4 py-1.5 text-ivory transition-colors hover:bg-ink/85"
                data-testid="nav-register"
              >
                {t("register")}
              </Link>
            </div>
          )}

          {/* Buton hamburger — doar pe mobil */}
          <button
            onClick={() => setMobileOpen((v) => !v)}
            data-testid="mobile-menu-button"
            aria-label={t("menu")}
            aria-expanded={mobileOpen}
            className="rounded-lg p-2 text-ink transition-colors hover:bg-ink/5 md:hidden"
          >
            <svg
              width="24"
              height="24"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth="2"
              strokeLinecap="round"
              aria-hidden="true"
            >
              {mobileOpen ? (
                <>
                  <path d="M18 6 6 18" />
                  <path d="m6 6 12 12" />
                </>
              ) : (
                <>
                  <path d="M3 12h18" />
                  <path d="M3 6h18" />
                  <path d="M3 18h18" />
                </>
              )}
            </svg>
          </button>
        </div>
      </div>

      {/* Panoul mobil */}
      {mobileOpen && (
        <>
          <div
            className="fixed inset-0 top-[61px] z-30 bg-ink/20 md:hidden"
            onClick={() => setMobileOpen(false)}
            aria-hidden="true"
          />
          <nav
            className="absolute inset-x-0 z-40 max-h-[calc(100vh-61px)] overflow-y-auto border-b border-ink/10 bg-ivory p-4 shadow-xl md:hidden"
            data-testid="mobile-menu"
          >
            <div className="space-y-1">
              <MobileLink href="/auctions" label={t("auctions")} testid="m-auctions" />
              <MobileLink href="/how-it-works" label={t("howItWorks")} testid="m-how" />
              {canSell && <MobileLink href="/sell" label={t("sell")} testid="m-sell" />}
              {user?.role === "ADMIN" && (
                <MobileLink
                  href="/admin"
                  label={t("admin")}
                  testid="m-admin"
                  accent
                />
              )}
            </div>

            <div className="my-3 h-px bg-ink/10" />

            {user ? (
              <div className="space-y-1">
                <p className="px-3 pb-1 text-xs font-bold uppercase tracking-wide text-ink/40">
                  {user.name}
                </p>
                <MobileLink href="/account" label={t("account")} testid="m-account" />
                <MobileLink href="/account/bids" label={t("myBids")} testid="m-bids" />
                <MobileLink
                  href="/account/watchlist"
                  label={t("watchlist")}
                  testid="m-watchlist"
                />
                <MobileLink
                  href="/account/notifications"
                  label={
                    unreadCount > 0 ? `${t("notifications")} (${unreadCount})` : t("notifications")
                  }
                  testid="m-notifications"
                />
                <button
                  onClick={logout}
                  data-testid="m-logout"
                  className="w-full rounded-lg px-3 py-2.5 text-left font-medium text-wing-red hover:bg-ink/5"
                >
                  {t("logout")}
                </button>
              </div>
            ) : (
              <div className="space-y-2">
                <Link
                  href="/login"
                  data-testid="m-login"
                  className="block rounded-xl border border-ink/20 px-4 py-2.5 text-center font-semibold"
                >
                  {t("login")}
                </Link>
                <Link
                  href="/register"
                  data-testid="m-register"
                  className="block rounded-xl bg-ink px-4 py-2.5 text-center font-semibold text-ivory"
                >
                  {t("register")}
                </Link>
              </div>
            )}
          </nav>
        </>
      )}
    </header>
  );
}

function MenuLink({ href, label, testid }: { href: string; label: string; testid: string }) {
  return (
    <Link
      href={href}
      data-testid={testid}
      className="block rounded-lg px-3 py-2 text-sm hover:bg-ink/5"
    >
      {label}
    </Link>
  );
}

function MobileLink({
  href,
  label,
  testid,
  accent = false,
}: {
  href: string;
  label: string;
  testid: string;
  accent?: boolean;
}) {
  return (
    <Link
      href={href}
      data-testid={testid}
      className={`block rounded-lg px-3 py-2.5 font-medium hover:bg-ink/5 ${
        accent ? "text-wing-blue" : ""
      }`}
    >
      {label}
    </Link>
  );
}
