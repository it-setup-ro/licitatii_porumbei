"use client";

import { useEffect, useRef, useState } from "react";
import { useTranslations } from "next-intl";
import { Link, useRouter } from "@/i18n/navigation";

/**
 * Caseta de cont — un singur loc pentru tot ce tine de utilizator.
 *
 * Neautentificat: Autentificare / Cont nou.
 * Autentificat:   Contul meu, Ofertele mele, Favorite, Cumparaturi,
 *                 Notificari, (Vinde / Administrare), Iesire.
 *
 * Aceeasi lista pe telefon si pe desktop — se schimba doar butonul care o
 * deschide. Inainte, autentificarea era intr-un loc si iesirea in altul.
 */

export type AccountUser = {
  name: string;
  role: string;
  sellerStatus: string | null;
} | null;

export default function AccountMenu({
  user,
  unreadCount,
  variant,
}: {
  user: AccountUser;
  unreadCount: number;
  /** "icon" = buton rotund (telefon); "full" = nume sau butoane text (desktop) */
  variant: "icon" | "full";
}) {
  const t = useTranslations("nav");
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const boxRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!open) return;
    const onClick = (e: MouseEvent) => {
      if (boxRef.current && !boxRef.current.contains(e.target as Node)) setOpen(false);
    };
    const onEsc = (e: KeyboardEvent) => e.key === "Escape" && setOpen(false);
    document.addEventListener("mousedown", onClick);
    document.addEventListener("keydown", onEsc);
    return () => {
      document.removeEventListener("mousedown", onClick);
      document.removeEventListener("keydown", onEsc);
    };
  }, [open]);

  const logout = async () => {
    await fetch("/api/auth/logout", { method: "POST" });
    setOpen(false);
    router.push("/");
    // reimprospatam componentele de server ca antetul sa reflecte delogarea
    router.refresh();
  };

  const canSell = user && (user.role === "ADMIN" || user.sellerStatus === "APPROVED");

  // Pe desktop, vizitatorul nelogat vede direct cele doua butoane — e mai clar
  // decat sa ascunda autentificarea sub un meniu.
  if (!user && variant === "full") {
    return (
      <div className="flex items-center gap-2 text-sm font-medium">
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
    );
  }

  const triggerTestId =
    variant === "icon" ? (user ? "mobile-account-icon" : "mobile-login-icon") : "user-menu";

  return (
    <div className="relative" ref={boxRef}>
      <button
        onClick={() => setOpen((v) => !v)}
        data-testid={triggerTestId}
        aria-expanded={open}
        aria-haspopup="menu"
        aria-label={user ? t("account") : t("login")}
        title={user ? t("account") : t("login")}
        className={
          variant === "icon"
            ? "rounded-full p-2 text-ink/70 transition-colors hover:bg-ink/5 hover:text-ink"
            : "flex items-center gap-2 rounded-full border border-ink/15 px-3 py-1.5 text-sm font-medium transition-colors hover:border-ink/40"
        }
      >
        {variant === "icon" ? (
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
            <path d="M19 21v-2a4 4 0 0 0-4-4H9a4 4 0 0 0-4 4v2" />
            <circle cx="12" cy="7" r="4" />
          </svg>
        ) : (
          <span>{user!.name.split(" ")[0]}</span>
        )}
      </button>

      {open && (
        <div
          role="menu"
          data-testid="account-menu"
          onClick={() => setOpen(false)}
          className="absolute right-0 z-50 mt-2 w-60 rounded-xl border border-ink/10 bg-white p-2 shadow-xl"
        >
          {user ? (
            <>
              <p className="px-3 pb-2 pt-1 text-xs font-bold uppercase tracking-wide text-ink/40">
                {user.name}
              </p>
              <Item href="/account" label={t("account")} testid="menu-account" />
              <Item href="/account/bids" label={t("myBids")} testid="menu-bids" />
              <Item href="/account/watchlist" label={t("watchlist")} testid="menu-watchlist" />
              <Item href="/account/purchases" label={t("myPurchases")} testid="menu-purchases" />
              <Item
                href="/account/notifications"
                label={
                  unreadCount > 0 ? `${t("notifications")} (${unreadCount})` : t("notifications")
                }
                testid="menu-notifications"
              />
              {canSell && <Item href="/sell" label={t("sell")} testid="menu-sell" />}
              {user.role === "ADMIN" && (
                <Item href="/admin" label={t("admin")} testid="menu-admin" accent />
              )}

              <div className="my-1 h-px bg-ink/10" />
              <button
                onClick={logout}
                data-testid="menu-logout"
                role="menuitem"
                className="w-full rounded-lg px-3 py-2.5 text-left font-medium text-wing-red hover:bg-wing-red/10"
              >
                {t("logout")}
              </button>
            </>
          ) : (
            <>
              <Link
                href="/login"
                data-testid="menu-login"
                role="menuitem"
                className="block rounded-lg bg-ink px-4 py-3 text-center font-semibold text-ivory"
              >
                {t("login")}
              </Link>
              <Link
                href="/register"
                data-testid="menu-register"
                role="menuitem"
                className="mt-2 block rounded-lg border border-ink/20 px-4 py-3 text-center font-semibold"
              >
                {t("register")}
              </Link>
            </>
          )}
        </div>
      )}
    </div>
  );
}

function Item({
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
      role="menuitem"
      className={`block rounded-lg px-3 py-2.5 text-sm hover:bg-ink/5 ${
        accent ? "font-semibold text-wing-blue" : ""
      }`}
    >
      {label}
    </Link>
  );
}
