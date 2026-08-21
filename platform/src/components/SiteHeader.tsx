"use client";

import { useEffect, useRef, useState } from "react";
import { useTranslations } from "next-intl";
import { Link, usePathname, useRouter } from "@/i18n/navigation";
import LogoMark from "./LogoMark";

type HeaderUser = {
  id: string;
  name: string;
  role: string;
  sellerStatus: string | null;
} | null;

type NavItem = { href: string; labelKey: string; testid: string; children?: NavItem[] };

export default function SiteHeader({
  siteName,
  user,
  unreadCount,
  cartCount,
}: {
  siteName: string;
  user: HeaderUser;
  unreadCount: number;
  cartCount: number;
}) {
  const t = useTranslations("nav");
  const router = useRouter();
  const pathname = usePathname();
  const [menuOpen, setMenuOpen] = useState(false);
  const [mobileOpen, setMobileOpen] = useState(false);
  const [infoOpen, setInfoOpen] = useState(false);
  const infoRef = useRef<HTMLLIElement>(null);

  // închide meniurile la schimbarea paginii
  useEffect(() => {
    setMobileOpen(false);
    setMenuOpen(false);
    setInfoOpen(false);
  }, [pathname]);

  // închide submeniul la clic în afara lui
  useEffect(() => {
    if (!infoOpen) return;
    const onClick = (e: MouseEvent) => {
      if (infoRef.current && !infoRef.current.contains(e.target as Node)) setInfoOpen(false);
    };
    document.addEventListener("mousedown", onClick);
    return () => document.removeEventListener("mousedown", onClick);
  }, [infoOpen]);

  useEffect(() => {
    document.body.style.overflow = mobileOpen ? "hidden" : "";
    return () => {
      document.body.style.overflow = "";
    };
  }, [mobileOpen]);

  const logout = async () => {
    await fetch("/api/auth/logout", { method: "POST" });
    window.location.assign("/");
  };

  const canSell = user && (user.role === "ADMIN" || user.sellerStatus === "APPROVED");

  const items: NavItem[] = [
    { href: "/", labelKey: "home", testid: "nav-home" },
    { href: "/articles", labelKey: "articles", testid: "nav-articles" },
    { href: "/contests", labelKey: "contests", testid: "nav-contests" },
    {
      href: "/info/regulament",
      labelKey: "info",
      testid: "nav-info",
      children: [
        { href: "/info/regulament", labelKey: "infoRules", testid: "nav-info-rules" },
        { href: "/info/info-licitatii", labelKey: "infoAuctions", testid: "nav-info-auctions" },
        { href: "/info/alte-info", labelKey: "infoOther", testid: "nav-info-other" },
      ],
    },
    { href: "/auctions", labelKey: "auctions", testid: "nav-auctions" },
    { href: "/fixed-price", labelKey: "fixedPrice", testid: "nav-fixed" },
    { href: "/products", labelKey: "products", testid: "nav-products" },
    { href: "/shipping-agents", labelKey: "shippingAgents", testid: "nav-shipping" },
    { href: "/about", labelKey: "about", testid: "nav-about" },
    { href: "/contact", labelKey: "contact", testid: "nav-contact" },
  ];

  return (
    <header className="sticky top-0 z-40 border-b border-ink/10 bg-ivory/95 backdrop-blur">
      <div className="mx-auto flex max-w-6xl items-center gap-3 px-4 py-2.5">
        <Link href="/" className="flex items-center gap-2" data-testid="logo-home">
          <LogoMark size={38} />
          <span className="font-display text-base font-bold leading-tight tracking-tight sm:text-lg">
            {siteName}
          </span>
        </Link>

        <div className="ml-auto flex items-center gap-1.5 sm:gap-2">
          {/* Coș */}
          <Link
            href="/cart"
            data-testid="cart-link"
            aria-label={t("cart")}
            title={t("cart")}
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
              <circle cx="9" cy="20" r="1.5" />
              <circle cx="18" cy="20" r="1.5" />
              <path d="M2 3h2.5l2.4 12.4a2 2 0 0 0 2 1.6h8.3a2 2 0 0 0 2-1.6L21 7H5.6" />
            </svg>
            {cartCount > 0 && (
              <span
                className="absolute -right-0.5 -top-0.5 flex h-5 min-w-5 items-center justify-center rounded-full bg-wing-orange px-1 text-xs font-bold text-white"
                data-testid="cart-badge"
              >
                {cartCount > 9 ? "9+" : cartCount}
              </span>
            )}
          </Link>

          {/* Clopoțel notificări */}
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

          {/* Cont — desktop */}
          {user ? (
            <div className="relative hidden lg:block">
              <button
                onClick={() => setMenuOpen((v) => !v)}
                className="flex items-center gap-2 rounded-full border border-ink/15 px-3 py-1.5 text-sm font-medium transition-colors hover:border-ink/40"
                data-testid="user-menu"
              >
                <span>{user.name.split(" ")[0]}</span>
              </button>
              {menuOpen && (
                <div
                  className="absolute right-0 z-50 mt-2 w-52 rounded-xl border border-ink/10 bg-white p-2 shadow-xl"
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
                    href="/account/purchases"
                    label={t("myPurchases")}
                    testid="menu-purchases"
                  />
                  {canSell && <MenuLink href="/sell" label={t("sell")} testid="menu-sell" />}
                  {user.role === "ADMIN" && (
                    <MenuLink href="/admin" label={t("admin")} testid="menu-admin" />
                  )}
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
            <div className="hidden items-center gap-2 text-sm font-medium lg:flex">
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

          <button
            onClick={() => setMobileOpen((v) => !v)}
            data-testid="mobile-menu-button"
            aria-label={t("menu")}
            aria-expanded={mobileOpen}
            className="rounded-lg p-2 text-ink transition-colors hover:bg-ink/5 lg:hidden"
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

      {/* Navigația principală — desktop */}
      <nav className="hidden border-t border-ink/10 lg:block" data-testid="main-nav">
        <ul className="mx-auto flex max-w-6xl items-center gap-1 px-4 text-sm font-medium">
          {items.map((item) =>
            item.children ? (
              <li key={item.testid} className="relative" ref={infoRef}>
                <button
                  onClick={() => setInfoOpen((v) => !v)}
                  data-testid={item.testid}
                  aria-expanded={infoOpen}
                  className="flex items-center gap-1 px-3 py-2.5 transition-colors hover:text-wing-orange"
                >
                  {t(item.labelKey)}
                  <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3" aria-hidden="true">
                    <path d="m6 9 6 6 6-6" />
                  </svg>
                </button>
                {infoOpen && (
                  <ul
                    className="absolute left-0 z-50 mt-0 w-64 rounded-xl border border-ink/10 bg-white p-2 shadow-xl"
                    data-testid="info-submenu"
                  >
                    {item.children.map((child) => (
                      <li key={child.testid}>
                        <Link
                          href={child.href}
                          data-testid={child.testid}
                          className="block rounded-lg px-3 py-2 hover:bg-ink/5"
                        >
                          {t(child.labelKey)}
                        </Link>
                      </li>
                    ))}
                  </ul>
                )}
              </li>
            ) : (
              <li key={item.testid}>
                <Link
                  href={item.href}
                  data-testid={item.testid}
                  className="block px-3 py-2.5 transition-colors hover:text-wing-orange"
                >
                  {t(item.labelKey)}
                </Link>
              </li>
            )
          )}
          {canSell && (
            <li className="ml-auto">
              <Link
                href="/sell"
                data-testid="nav-sell"
                className="block px-3 py-2.5 font-semibold text-wing-orange transition-colors hover:text-wing-red"
              >
                + {t("sell")}
              </Link>
            </li>
          )}
          {user?.role === "ADMIN" && (
            <li className={canSell ? "" : "ml-auto"}>
              <Link
                href="/admin"
                data-testid="nav-admin"
                className="block px-3 py-2.5 text-wing-blue transition-colors hover:text-wing-orange"
              >
                {t("admin")}
              </Link>
            </li>
          )}
        </ul>
      </nav>

      {/* Panoul mobil */}
      {mobileOpen && (
        <>
          <div
            className="fixed inset-0 top-[57px] z-30 bg-ink/20 lg:hidden"
            onClick={() => setMobileOpen(false)}
            aria-hidden="true"
          />
          <nav
            className="absolute inset-x-0 z-40 max-h-[calc(100vh-57px)] overflow-y-auto border-b border-ink/10 bg-ivory p-4 shadow-xl lg:hidden"
            data-testid="mobile-menu"
          >
            <div className="space-y-1">
              {items.map((item) => (
                <div key={item.testid}>
                  <MobileLink
                    href={item.href}
                    label={t(item.labelKey)}
                    testid={`m-${item.testid.replace("nav-", "")}`}
                  />
                  {item.children && (
                    <div className="ml-4 border-l border-ink/10 pl-2">
                      {item.children.map((child) => (
                        <MobileLink
                          key={child.testid}
                          href={child.href}
                          label={t(child.labelKey)}
                          testid={`m-${child.testid.replace("nav-", "")}`}
                          small
                        />
                      ))}
                    </div>
                  )}
                </div>
              ))}
              {canSell && (
                <MobileLink href="/sell" label={`+ ${t("sell")}`} testid="m-sell" accent />
              )}
              {user?.role === "ADMIN" && (
                <MobileLink href="/admin" label={t("admin")} testid="m-admin" accent />
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
                  href="/account/purchases"
                  label={t("myPurchases")}
                  testid="m-purchases"
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
  small = false,
}: {
  href: string;
  label: string;
  testid: string;
  accent?: boolean;
  small?: boolean;
}) {
  return (
    <Link
      href={href}
      data-testid={testid}
      className={`block rounded-lg px-3 hover:bg-ink/5 ${
        small ? "py-2 text-sm text-ink/70" : "py-2.5 font-medium"
      } ${accent ? "text-wing-blue" : ""}`}
    >
      {label}
    </Link>
  );
}
