import { getTranslations } from "next-intl/server";
import { Link } from "@/i18n/navigation";

/** Cele patru pagini ale crescătorului. Aceeași bară pe toate. */
export default async function BreederNav({ active }: { active: string }) {
  const t = await getTranslations("breeder");
  const items = [
    { key: "auctions", href: "/breeder", label: t("myAuctions") },
    { key: "sales", href: "/breeder/sales", label: t("mySales") },
    { key: "settlement", href: "/breeder/settlement", label: t("mySettlement") },
    { key: "profile", href: "/breeder/profile", label: t("myProfile") },
  ];
  return (
    <nav className="flex flex-wrap gap-2" data-testid="breeder-nav">
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
