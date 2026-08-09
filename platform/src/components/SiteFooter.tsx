import { useTranslations } from "next-intl";
import LogoMark from "./LogoMark";

export default function SiteFooter({ siteName }: { siteName: string }) {
  const t = useTranslations("footer");
  return (
    <footer className="mt-16 border-t border-ink/10 bg-ink text-ivory">
      <div className="mx-auto flex max-w-6xl flex-col items-center gap-4 px-4 py-10 text-sm md:flex-row md:justify-between">
        <div className="flex items-center gap-2">
          <LogoMark size={28} />
          <span className="font-display font-bold">{siteName}</span>
        </div>
        <div className="flex gap-6 text-ivory/70">
          <span className="hover:text-ivory cursor-pointer">{t("terms")}</span>
          <span className="hover:text-ivory cursor-pointer">{t("privacy")}</span>
          <span className="hover:text-ivory cursor-pointer">{t("contact")}</span>
        </div>
        <div className="text-ivory/50">
          © {new Date().getFullYear()} {siteName}. {t("rights")}
        </div>
      </div>
      <div className="wing-gradient h-1 w-full" />
    </footer>
  );
}
