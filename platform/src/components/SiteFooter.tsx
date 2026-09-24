import { useTranslations } from "next-intl";
import { Link } from "@/i18n/navigation";
import LogoMark from "./LogoMark";
import NewsletterForm from "./NewsletterForm";
import { IconFacebook, IconInstagram, IconYouTube } from "./SocialIcons";

/**
 * Subsolul, după macheta clientului: patru coloane — cine suntem, contact,
 * linkuri utile, informații — și o bandă de jos cu deviza.
 *
 * Datele de contact și rețelele vin din Setări, nu din cod. Cât timp sunt
 * goale, rândurile lipsesc de tot: mai bine un subsol scurt decât un telefon
 * inventat pe care sună cineva.
 */

export type FooterContact = {
  email: string;
  phone: string;
  city: string;
  /** Clientul a cerut să se vadă în subsol și adresa, și programul. */
  address: string;
  schedule: string;
  facebook: string;
  youtube: string;
  instagram: string;
};

export default function SiteFooter({
  siteName,
  contact,
}: {
  siteName: string;
  contact: FooterContact;
}) {
  const t = useTranslations("footer");
  const n = useTranslations("nav");

  const social = [
    { href: contact.facebook, label: "Facebook", icon: <IconFacebook /> },
    { href: contact.youtube, label: "YouTube", icon: <IconYouTube /> },
    { href: contact.instagram, label: "Instagram", icon: <IconInstagram /> },
  ].filter((s) => s.href);

  return (
    <footer className="mt-16 bg-ink text-ivory" data-testid="site-footer">
      <div className="wing-gradient h-1 w-full" />

      <div className="mx-auto grid max-w-6xl gap-10 px-4 py-12 sm:grid-cols-2 lg:grid-cols-4">
        {/* ── Cine suntem ── */}
        <div>
          <div className="flex items-center gap-2">
            <LogoMark size={32} alt={siteName} />
            <span className="font-display text-lg font-bold">{siteName}</span>
          </div>
          <p className="mt-3 text-sm leading-relaxed text-ivory/70">{t("about")}</p>
          {social.length > 0 && (
            <div className="mt-4 flex gap-2" data-testid="footer-social">
              {social.map((s) => (
                <a
                  key={s.label}
                  href={s.href}
                  target="_blank"
                  rel="noopener noreferrer"
                  aria-label={s.label}
                  title={s.label}
                  className="rounded-full bg-white/10 p-2.5 text-ivory transition-colors hover:bg-wing-blue"
                >
                  {s.icon}
                </a>
              ))}
            </div>
          )}
        </div>

        {/* ── Contact ── */}
        <div data-testid="footer-contact">
          <h2 className="font-display text-sm font-bold uppercase tracking-wider text-wing-yellow">
            {t("contact")}
          </h2>
          <ul className="mt-4 space-y-2.5 text-sm text-ivory/70">
            {contact.email && (
              <li>
                <a href={`mailto:${contact.email}`} className="hover:text-ivory">
                  ✉ {contact.email}
                </a>
              </li>
            )}
            {contact.phone && (
              <li>
                <a href={`tel:${contact.phone.replace(/\s/g, "")}`} className="hover:text-ivory">
                  ☎ {contact.phone}
                </a>
              </li>
            )}
            {/* adresa completă o înlocuiește pe localitatea simplă */}
            {(contact.address || contact.city) && (
              <li data-testid="footer-address">⌂ {contact.address || contact.city}</li>
            )}
            {contact.schedule && (
              <li data-testid="footer-schedule">🕘 {contact.schedule}</li>
            )}
            <li>
              <Link href="/contact" data-testid="footer-contact-page" className="hover:text-ivory">
                {t("contactForm")} →
              </Link>
            </li>
          </ul>
        </div>

        {/* ── Linkuri utile ── */}
        <FooterColumn
          title={t("useful")}
          testid="footer-useful"
          links={[
            { href: "/auctions", label: n("auctions") },
            { href: "/fixed-price", label: n("fixedPrice") },
            { href: "/products", label: n("products") },
            { href: "/sellers", label: t("breeders") },
            { href: "/contests", label: n("ourContests") },
            { href: "/articles", label: n("articles") },
          ]}
        />

        {/* ── Informații ── */}
        <FooterColumn
          title={n("info")}
          testid="footer-info"
          links={[
            { href: "/help", label: t("help") },
            { href: "/how-it-works", label: t("howItWorks") },
            { href: "/info/regulament", label: n("infoRules") },
            { href: "/info/termeni-si-conditii", label: t("terms") },
            { href: "/info/politica-de-confidentialitate", label: t("privacy") },
            { href: "/info/info-licitatii", label: n("infoAuctions") },
            { href: "/info/alte-info", label: n("infoOther") },
            { href: "/shipping-agents", label: n("shippingAgents") },
            { href: "/about", label: n("about") },
          ]}
        />
      </div>

      {/* ── Noutati pe e-mail ── */}
      <div className="border-t border-white/10">
        <div className="mx-auto max-w-6xl px-4 py-8">
          <NewsletterForm />
        </div>
      </div>

      {/* ── Banda de jos ── */}
      <div className="border-t border-white/10">
        <div className="mx-auto flex max-w-6xl flex-col items-center gap-3 px-4 py-5 text-sm sm:flex-row sm:justify-between">
          <p className="font-script text-lg text-wing-yellow" data-testid="footer-motto">
            {t("motto")}
          </p>
          <p className="text-ivory/50">
            © {new Date().getFullYear()} {siteName}. {t("rights")}
          </p>
        </div>
      </div>
    </footer>
  );
}

function FooterColumn({
  title,
  testid,
  links,
}: {
  title: string;
  testid: string;
  links: { href: string; label: string }[];
}) {
  return (
    <div data-testid={testid}>
      <h2 className="font-display text-sm font-bold uppercase tracking-wider text-wing-yellow">
        {title}
      </h2>
      <ul className="mt-4 space-y-2.5 text-sm text-ivory/70">
        {links.map((l) => (
          <li key={l.href}>
            <Link href={l.href} className="hover:text-ivory">
              {l.label}
            </Link>
          </li>
        ))}
      </ul>
    </div>
  );
}

