import { getTranslations } from "next-intl/server";
import { Link } from "@/i18n/navigation";
import LanguageSwitcher from "./LanguageSwitcher";
import PlatformClock from "./PlatformClock";

/**
 * Bara subțire de deasupra header-ului: limbă, autentificare, ora oficială a
 * platformei și scurtătura către informații (model preluat din practica
 * platformelor de licitații — ceasul comun evită disputele la închidere).
 */
export default async function TopBar({
  isLoggedIn,
  isAdmin,
}: {
  isLoggedIn: boolean;
  isAdmin: boolean;
}) {
  const t = await getTranslations("nav");

  return (
    <div className="border-b border-ink/10 bg-ink text-ivory" data-testid="top-bar">
      <div className="mx-auto flex max-w-6xl items-center gap-3 px-4 py-1.5 text-xs">
        <div className="flex items-center gap-3">
          <LanguageSwitcher variant="dark" />
          {!isLoggedIn && (
            <Link
              href="/login"
              className="hidden text-ivory/70 transition-colors hover:text-ivory sm:inline"
              data-testid="top-login"
            >
              {t("login")} / {t("register")}
            </Link>
          )}
        </div>

        <div className="mx-auto font-medium text-ivory/90">
          <PlatformClock serverNowIso={new Date().toISOString()} />
        </div>

        {/* Scurtatura de administrare — cea mai rapida cale spre panou,
            prezenta pe orice pagina, si pe telefon si pe calculator. */}
        {isAdmin && (
          <Link
            href="/admin"
            data-testid="top-admin"
            className="flex items-center gap-1.5 rounded-full bg-wing-orange px-3 py-1 font-bold text-white transition-colors hover:bg-wing-red"
          >
            <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
              <path d="M3 3v18h18" />
              <path d="m7 14 4-4 3 3 5-6" />
            </svg>
            {t("admin")}
          </Link>
        )}

        <Link
          href="/shipping-agents"
          className="hidden items-center gap-1 text-ivory/70 transition-colors hover:text-ivory md:flex"
          data-testid="top-info"
        >
          {t("moreInfo")}: {t("shippingAgents")}
        </Link>
      </div>
    </div>
  );
}
