import { getTranslations } from "next-intl/server";
import { redirect, Link } from "@/i18n/navigation";
import { getCurrentUser } from "@/lib/auth";
import { getLocale } from "next-intl/server";

export const dynamic = "force-dynamic";

export default async function AdminLayout({ children }: { children: React.ReactNode }) {
  const locale = await getLocale();
  const user = await getCurrentUser();
  if (!user || user.role !== "ADMIN") redirect({ href: "/", locale });
  const t = await getTranslations("admin");

  const items = [
    { href: "/admin", label: t("title") },
    { href: "/admin/settings", label: t("settings") },
    { href: "/admin/sellers", label: t("sellers") },
    { href: "/admin/lots", label: t("lots") },
    { href: "/admin/reviews", label: t("reviewsMod") },
    { href: "/admin/audit", label: t("audit") },
  ];

  return (
    <div className="mx-auto max-w-6xl px-4 py-10">
      <nav className="mb-8 flex flex-wrap gap-2">
        {items.map((item) => (
          <Link
            key={item.href}
            href={item.href}
            className="rounded-full border border-ink/15 bg-white px-4 py-1.5 text-sm font-semibold hover:border-wing-blue hover:text-wing-blue"
          >
            {item.label}
          </Link>
        ))}
      </nav>
      {children}
    </div>
  );
}
