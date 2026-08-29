"use client";

import { useEffect, useRef, useState } from "react";
import { useLocale, useTranslations } from "next-intl";
import { Link } from "@/i18n/navigation";
import LogoMark from "./LogoMark";
import AccountMenu from "./AccountMenu";

/**
 * Antetul si navigatia.
 *
 * Intrarile cu mai mult continut — Articole, Concursuri, Informatii — stau
 * stranse si se desfac la clic, si pe calculator (dropdown), si pe telefon
 * (acordeon in panoul hamburger). Inainte, pe telefon toate cele sase linkuri
 * de concursuri si cele trei pagini de informatii erau desfasurate din start,
 * iar meniul avea peste douazeci de randuri.
 */

type HeaderUser = {
  id: string;
  name: string;
  role: string;
  sellerStatus: string | null;
} | null;

/** O intrare din submeniu, cu eticheta deja tradusa. */
type SubItem = { href: string; label: string; testid: string };

type NavItem = {
  href: string;
  label: string;
  testid: string;
  /** prezenta lor face intrarea sa se comporte ca dropdown */
  children?: SubItem[];
  submenuTestid?: string;
  /** latime dropdown pe calculator */
  wide?: boolean;
};

/** Linkuri catre site-uri externe (submeniul Concursuri), venite din DB. */
export type ExternalNavLink = {
  id: string;
  labelRo: string;
  labelEn: string;
  url: string | null;
};

/** Ultimele articole publicate, pentru submeniul Articole. */
export type ArticleNavLink = {
  id: string;
  slug: string;
  titleRo: string;
  titleEn: string;
};

export default function SiteHeader({
  siteName,
  user,
  unreadCount,
  cartCount,
  contestLinks,
  latestArticles,
}: {
  siteName: string;
  user: HeaderUser;
  unreadCount: number;
  cartCount: number;
  contestLinks: ExternalNavLink[];
  latestArticles: ArticleNavLink[];
}) {
  const t = useTranslations("nav");
  const locale = useLocale();
  const [mobileOpen, setMobileOpen] = useState(false);
  const [openMenu, setOpenMenu] = useState<string | null>(null);
  const [openGroup, setOpenGroup] = useState<string | null>(null);
  const navRef = useRef<HTMLUListElement>(null);

  // închide submeniul deschis la clic în afara navigației
  useEffect(() => {
    if (!openMenu) return;
    const onClick = (e: MouseEvent) => {
      if (navRef.current && !navRef.current.contains(e.target as Node)) setOpenMenu(null);
    };
    document.addEventListener("mousedown", onClick);
    return () => document.removeEventListener("mousedown", onClick);
  }, [openMenu]);

  useEffect(() => {
    document.body.style.overflow = mobileOpen ? "hidden" : "";
    return () => {
      document.body.style.overflow = "";
    };
  }, [mobileOpen]);

  const canSell = user && (user.role === "ADMIN" || user.sellerStatus === "APPROVED");

  const articleChildren: SubItem[] = [
    ...latestArticles.map((a) => ({
      href: `/articles/${a.slug}`,
      label: locale === "en" ? a.titleEn : a.titleRo,
      testid: "nav-article",
    })),
    { href: "/articles", label: t("allArticles"), testid: "nav-articles-all" },
  ];

  const items: NavItem[] = [
    { href: "/", label: t("home"), testid: "nav-home" },
    {
      href: "/articles",
      label: t("articles"),
      testid: "nav-articles",
      children: articleChildren,
      submenuTestid: "articles-submenu",
      wide: true,
    },
    {
      href: "/contests",
      label: t("contests"),
      testid: "nav-contests",
      // continutul e randat separat (sunt linkuri externe, nu interne)
      children: [],
      submenuTestid: "contests-submenu",
      wide: true,
    },
    {
      href: "/info/regulament",
      label: t("info"),
      testid: "nav-info",
      children: [
        { href: "/info/regulament", label: t("infoRules"), testid: "nav-info-rules" },
        { href: "/info/info-licitatii", label: t("infoAuctions"), testid: "nav-info-auctions" },
        { href: "/info/alte-info", label: t("infoOther"), testid: "nav-info-other" },
      ],
      submenuTestid: "info-submenu",
    },
    { href: "/auctions", label: t("auctions"), testid: "nav-auctions" },
    { href: "/fixed-price", label: t("fixedPrice"), testid: "nav-fixed" },
    { href: "/products", label: t("products"), testid: "nav-products" },
    { href: "/shipping-agents", label: t("shippingAgents"), testid: "nav-shipping" },
    { href: "/about", label: t("about"), testid: "nav-about" },
    { href: "/contact", label: t("contact"), testid: "nav-contact" },
  ];

  const isContests = (item: NavItem) => item.testid === "nav-contests";

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

          {/* Caseta de cont (telefon) — autentificare SI iesire in acelasi loc */}
          <div className="lg:hidden">
            <AccountMenu user={user} unreadCount={unreadCount} variant="icon" />
          </div>

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

          {/* Caseta de cont (desktop) */}
          <div className="hidden lg:block">
            <AccountMenu user={user} unreadCount={unreadCount} variant="full" />
          </div>

          <button
            onClick={() => {
              // panoul se redeschide mereu cu grupurile stranse
              setOpenGroup(null);
              setMobileOpen((v) => !v);
            }}
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
        <ul
          ref={navRef}
          className="mx-auto flex max-w-6xl items-center gap-1 px-4 text-sm font-medium"
        >
          {items.map((item) =>
            item.children ? (
              <li className="relative" key={item.testid}>
                <button
                  onClick={() => setOpenMenu((v) => (v === item.testid ? null : item.testid))}
                  data-testid={item.testid}
                  aria-expanded={openMenu === item.testid}
                  className="flex items-center gap-1 px-3 py-2.5 transition-colors hover:text-wing-orange"
                >
                  {item.label}
                  <Chevron open={openMenu === item.testid} />
                </button>
                {openMenu === item.testid && (
                  <ul
                    className={`absolute left-0 z-50 rounded-xl border border-ink/10 bg-white p-2 shadow-xl ${
                      item.wide ? "w-72" : "w-64"
                    }`}
                    data-testid={item.submenuTestid}
                    onClick={() => setOpenMenu(null)}
                  >
                    {isContests(item)
                      ? contestLinks.map((link) => (
                          <li key={link.id}>
                            <ExternalItem link={link} locale={locale} soonLabel={t("comingSoon")} />
                          </li>
                        ))
                      : item.children.map((child, i) => (
                          <li key={`${child.testid}-${i}`}>
                            <Link
                              href={child.href}
                              data-testid={child.testid}
                              className={
                                child.testid === "nav-articles-all"
                                  ? "mt-1 block truncate rounded-lg border-t border-ink/10 px-3 py-2 pt-3 font-semibold text-wing-blue hover:bg-ink/5"
                                  : "block truncate rounded-lg px-3 py-2 hover:bg-ink/5"
                              }
                            >
                              {child.label}
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
                  {item.label}
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
            onClick={() => setMobileOpen(false)}
          >
            <div className="space-y-1">
              {items.map((item) =>
                item.children ? (
                  <div key={item.testid} data-testid={`m-${item.testid.replace("nav-", "")}-group`}>
                    <button
                      onClick={(e) => {
                        // altfel clicul urca la <nav> si inchide tot panoul
                        e.stopPropagation();
                        setOpenGroup((v) => (v === item.testid ? null : item.testid));
                      }}
                      data-testid={`m-${item.testid.replace("nav-", "")}-toggle`}
                      aria-expanded={openGroup === item.testid}
                      className="flex w-full items-center justify-between rounded-lg px-3 py-2.5 text-left font-medium hover:bg-ink/5"
                    >
                      {item.label}
                      <Chevron open={openGroup === item.testid} />
                    </button>
                    {openGroup === item.testid && (
                      <div className="ml-4 border-l border-ink/10 pl-2">
                        {isContests(item)
                          ? contestLinks.map((link) => (
                              <ExternalItem
                                key={link.id}
                                link={link}
                                locale={locale}
                                soonLabel={t("comingSoon")}
                                mobile
                              />
                            ))
                          : item.children.map((child, i) => (
                              <MobileLink
                                key={`${child.testid}-${i}`}
                                href={child.href}
                                label={child.label}
                                testid={`m-${child.testid.replace("nav-", "")}`}
                                small
                              />
                            ))}
                      </div>
                    )}
                  </div>
                ) : (
                  <MobileLink
                    key={item.testid}
                    href={item.href}
                    label={item.label}
                    testid={`m-${item.testid.replace("nav-", "")}`}
                  />
                )
              )}
              {canSell && (
                <MobileLink href="/sell" label={`+ ${t("sell")}`} testid="m-sell" accent />
              )}
              {user?.role === "ADMIN" && (
                <MobileLink href="/admin" label={t("admin")} testid="m-admin" accent />
              )}
            </div>
          </nav>
        </>
      )}
    </header>
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
        small ? "py-2.5 text-sm text-ink/70" : "py-2.5 font-medium"
      } ${accent ? "text-wing-blue" : ""}`}
    >
      {label}
    </Link>
  );
}

function Chevron({ open = false }: { open?: boolean }) {
  return (
    <svg
      width="12"
      height="12"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="3"
      aria-hidden="true"
      className={`shrink-0 transition-transform ${open ? "rotate-180" : ""}`}
    >
      <path d="m6 9 6 6 6-6" />
    </svg>
  );
}

/**
 * Intrare catre un site extern.
 * `rel="noopener noreferrer"` e obligatoriu la target="_blank": fara `noopener`,
 * pagina externa poate manipula fereastra noastra prin `window.opener`.
 * Fara URL, intrarea e afisata inactiv, cu eticheta „in curand".
 */
function ExternalItem({
  link,
  locale,
  soonLabel,
  mobile = false,
}: {
  link: ExternalNavLink;
  locale: string;
  soonLabel: string;
  mobile?: boolean;
}) {
  const label = locale === "en" ? link.labelEn : link.labelRo;
  const base = mobile
    ? "flex items-center justify-between gap-2 rounded-lg px-3 py-2.5 text-sm"
    : "flex items-center justify-between gap-2 rounded-lg px-3 py-2";

  if (!link.url) {
    return (
      <span
        className={`${base} cursor-default text-ink/40`}
        data-testid="contest-link-soon"
        title={soonLabel}
      >
        {label}
        <span className="ml-2 rounded bg-ink/5 px-1.5 py-0.5 text-xs">{soonLabel}</span>
      </span>
    );
  }

  return (
    <a
      href={link.url}
      target="_blank"
      rel="noopener noreferrer"
      data-testid="contest-link"
      className={`${base} hover:bg-ink/5 hover:text-wing-orange`}
    >
      {label}
      <svg
        width="12"
        height="12"
        viewBox="0 0 24 24"
        fill="none"
        stroke="currentColor"
        strokeWidth="2"
        strokeLinecap="round"
        strokeLinejoin="round"
        aria-hidden="true"
        className="shrink-0 opacity-50"
      >
        <path d="M18 13v6a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h6" />
        <path d="M15 3h6v6" />
        <path d="M10 14 21 3" />
      </svg>
    </a>
  );
}
