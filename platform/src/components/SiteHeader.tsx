"use client";

import { useState } from "react";
import { useTranslations } from "next-intl";
import { Link, useRouter } from "@/i18n/navigation";
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
  const [menuOpen, setMenuOpen] = useState(false);

  const logout = async () => {
    await fetch("/api/auth/logout", { method: "POST" });
    router.refresh();
    router.push("/");
  };

  return (
    <header className="sticky top-0 z-40 border-b border-ink/10 bg-ivory/95 backdrop-blur">
      <div className="mx-auto flex max-w-6xl items-center gap-4 px-4 py-3">
        <Link href="/" className="flex items-center gap-2" data-testid="logo-home">
          <LogoMark size={38} />
          <span className="font-display text-lg font-bold leading-tight tracking-tight">
            {siteName}
          </span>
        </Link>

        <nav className="ml-6 hidden items-center gap-5 text-sm font-medium md:flex">
          <Link href="/auctions" className="hover:text-wing-orange transition-colors">
            {t("auctions")}
          </Link>
          <Link href="/how-it-works" className="hover:text-wing-orange transition-colors">
            {t("howItWorks")}
          </Link>
          {user && (user.role === "ADMIN" || user.sellerStatus === "APPROVED") && (
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

        <div className="ml-auto flex items-center gap-3">
          <LanguageSwitcher />
          {user ? (
            <div className="relative">
              <button
                onClick={() => setMenuOpen((v) => !v)}
                className="flex items-center gap-2 rounded-full border border-ink/15 px-3 py-1.5 text-sm font-medium hover:border-ink/40 transition-colors"
                data-testid="user-menu"
              >
                <span>{user.name.split(" ")[0]}</span>
                {unreadCount > 0 && (
                  <span
                    className="flex h-5 min-w-5 items-center justify-center rounded-full bg-wing-red px-1 text-xs font-bold text-white"
                    data-testid="unread-badge"
                  >
                    {unreadCount}
                  </span>
                )}
              </button>
              {menuOpen && (
                <div
                  className="absolute right-0 mt-2 w-52 rounded-xl border border-ink/10 bg-white p-2 shadow-xl"
                  onClick={() => setMenuOpen(false)}
                >
                  <MenuLink href="/account" label={t("account")} testid="menu-account" />
                  <MenuLink href="/account/bids" label={t("myBids")} testid="menu-bids" />
                  <MenuLink href="/account/watchlist" label={t("watchlist")} testid="menu-watchlist" />
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
            <div className="flex items-center gap-2 text-sm font-medium">
              <Link
                href="/login"
                className="rounded-full px-3 py-1.5 hover:bg-ink/5 transition-colors"
                data-testid="nav-login"
              >
                {t("login")}
              </Link>
              <Link
                href="/register"
                className="rounded-full bg-ink px-4 py-1.5 text-ivory hover:bg-ink/85 transition-colors"
                data-testid="nav-register"
              >
                {t("register")}
              </Link>
            </div>
          )}
        </div>
      </div>
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
