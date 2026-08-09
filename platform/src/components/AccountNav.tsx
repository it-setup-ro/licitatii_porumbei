import { getTranslations } from "next-intl/server";
import { Link } from "@/i18n/navigation";

export default async function AccountNav({ active }: { active: string }) {
  const t = await getTranslations("account");
  const items = [
    { key: "profile", href: "/account", label: t("profile") },
    { key: "bids", href: "/account/bids", label: t("myBids") },
    { key: "watchlist", href: "/account/watchlist", label: t("watchlist") },
    { key: "purchases", href: "/account/purchases", label: t("purchases") },
    { key: "sales", href: "/account/sales", label: t("sales") },
    { key: "lots", href: "/account/lots", label: t("myLots") },
    { key: "notifications", href: "/account/notifications", label: t("notifications") },
  ];
  return (
    <nav className="flex flex-wrap gap-2">
      {items.map((item) => (
        <Link
          key={item.key}
          href={item.href}
          className={`rounded-full px-4 py-1.5 text-sm font-semibold ${
            active === item.key
              ? "bg-ink text-ivory"
              : "border border-ink/15 bg-white hover:border-ink/40"
          }`}
        >
          {item.label}
        </Link>
      ))}
    </nav>
  );
}
