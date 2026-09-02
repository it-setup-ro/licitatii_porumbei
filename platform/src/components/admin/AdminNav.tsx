"use client";

import { useEffect, useRef, useState } from "react";
import { Link, usePathname } from "@/i18n/navigation";

/**
 * Navigația din administrare.
 *
 * Înainte erau douăsprezece butoane-pastilă puse pe un rând care se rupea:
 * pe telefon ieșeau cinci rânduri inegale, 200 de pixeli mâncați înainte de
 * orice conținut, și niciun semn unde te afli.
 *
 * Acum aceleași douăsprezece destinații sunt grupate pe trei categorii, cu
 * numărul de lucruri care așteaptă lângă cele de moderat:
 *   - pe calculator: coloană fixă în stânga, cu secțiunea curentă evidențiată
 *   - pe telefon:    un singur rând — „unde ești" + butonul „Secțiuni", care
 *                    deschide aceeași listă, cu rânduri mari de atins
 */

export type AdminCounts = {
  sellers: number;
  lots: number;
  reviews: number;
  messages: number;
};

type Item = {
  href: string;
  label: string;
  icon: React.ReactNode;
  /** cheia din AdminCounts, dacă intrarea arată un număr */
  count?: keyof AdminCounts;
};

type Group = { label: string; items: Item[] };

function groups(): Group[] {
  return [
    {
      label: "Moderare",
      items: [
        { href: "/admin/sellers", label: "Vânzători", icon: <IconUser />, count: "sellers" },
        { href: "/admin/lots", label: "Loturi", icon: <IconLot />, count: "lots" },
        { href: "/admin/reviews", label: "Recenzii", icon: <IconStar />, count: "reviews" },
      ],
    },
    {
      label: "Conținut",
      items: [
        { href: "/admin/articles", label: "Articole", icon: <IconArticle /> },
        { href: "/admin/products", label: "Produse", icon: <IconBox /> },
        { href: "/admin/contests", label: "Concursuri", icon: <IconTrophy /> },
        { href: "/admin/content", label: "Pagini", icon: <IconPage /> },
        { href: "/admin/links", label: "Linkuri", icon: <IconLink /> },
      ],
    },
    {
      label: "Platformă",
      items: [
        { href: "/admin/settings", label: "Setări", icon: <IconGear /> },
        { href: "/admin/messages", label: "Mesaje", icon: <IconMail />, count: "messages" },
        { href: "/admin/audit", label: "Jurnal", icon: <IconList /> },
      ],
    },
  ];
}

const HOME: Item = { href: "/admin", label: "Panou", icon: <IconHome /> };

export default function AdminNav({ counts }: { counts: AdminCounts }) {
  const pathname = usePathname();
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

  const all = [HOME, ...groups().flatMap((g) => g.items)];
  const current = all.find((i) => i.href === pathname) ?? HOME;

  return (
    <>
      {/* ── Telefon: un singur rând, plus panoul cu secțiuni ── */}
      <div className="relative mb-6 lg:hidden" ref={boxRef}>
        <div className="flex items-center gap-2 rounded-2xl border border-ink/10 bg-white p-1.5">
          {current.href !== HOME.href && (
            <Link
              href="/admin"
              aria-label="Înapoi la panou"
              data-testid="admin-back"
              className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl text-ink/60 hover:bg-ink/5 hover:text-ink"
            >
              <IconBack />
            </Link>
          )}
          <p
            className="min-w-0 flex-1 truncate px-2 font-display text-base font-bold"
            data-testid="admin-current"
          >
            {current.label}
          </p>
          <button
            onClick={() => setOpen((v) => !v)}
            aria-expanded={open}
            aria-haspopup="menu"
            data-testid="admin-sections"
            className="flex h-11 shrink-0 items-center gap-2 rounded-xl bg-ink px-4 text-sm font-bold text-ivory"
          >
            Secțiuni
            <Chevron open={open} />
          </button>
        </div>

        {open && (
          <div
            role="menu"
            data-testid="admin-sections-panel"
            onClick={() => setOpen(false)}
            className="absolute inset-x-0 z-50 mt-2 overflow-hidden rounded-2xl border border-ink/10 bg-white p-2 shadow-xl"
          >
            <Row item={HOME} counts={counts} active={pathname === HOME.href} />
            {groups().map((g) => (
              <div key={g.label} className="mt-1">
                <p className="px-3 pb-1 pt-2 text-xs font-bold uppercase tracking-wide text-ink/40">
                  {g.label}
                </p>
                {g.items.map((it) => (
                  <Row key={it.href} item={it} counts={counts} active={pathname === it.href} />
                ))}
              </div>
            ))}
          </div>
        )}
      </div>

      {/* ── Calculator: coloană fixă ── */}
      <nav className="hidden lg:block" data-testid="admin-nav">
        <div className="sticky top-24 space-y-5">
          <Row item={HOME} counts={counts} active={pathname === HOME.href} desktop />
          {groups().map((g) => (
            <div key={g.label}>
              <p className="px-3 pb-1.5 text-xs font-bold uppercase tracking-wide text-ink/40">
                {g.label}
              </p>
              <div className="space-y-0.5">
                {g.items.map((it) => (
                  <Row
                    key={it.href}
                    item={it}
                    counts={counts}
                    active={pathname === it.href}
                    desktop
                  />
                ))}
              </div>
            </div>
          ))}
        </div>
      </nav>
    </>
  );
}

function Row({
  item,
  counts,
  active,
  desktop = false,
}: {
  item: Item;
  counts: AdminCounts;
  active: boolean;
  desktop?: boolean;
}) {
  const n = item.count ? counts[item.count] : 0;
  return (
    <Link
      href={item.href}
      role="menuitem"
      aria-current={active ? "page" : undefined}
      data-testid={`admin-link-${item.href.split("/").pop()}`}
      className={`flex items-center gap-3 rounded-xl px-3 transition-colors ${
        desktop ? "py-2.5 text-sm" : "py-3 text-[15px]"
      } ${active ? "bg-ink font-semibold text-ivory" : "font-medium hover:bg-ink/5"}`}
    >
      <span className={active ? "text-ivory/80" : "text-ink/40"}>{item.icon}</span>
      <span className="min-w-0 flex-1 truncate">{item.label}</span>
      {n > 0 && (
        <span
          data-testid="admin-badge"
          className={`flex h-6 min-w-6 items-center justify-center rounded-full px-1.5 text-xs font-bold ${
            active ? "bg-ivory text-ink" : "bg-wing-red text-white"
          }`}
        >
          {n > 99 ? "99+" : n}
        </span>
      )}
    </Link>
  );
}

function Chevron({ open }: { open: boolean }) {
  return (
    <svg
      width="12"
      height="12"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="3"
      aria-hidden="true"
      className={`transition-transform ${open ? "rotate-180" : ""}`}
    >
      <path d="m6 9 6 6 6-6" />
    </svg>
  );
}

/* ── pictograme: 18px, aceeași grosime de linie ca în restul site-ului ── */

const ico = {
  width: 18,
  height: 18,
  viewBox: "0 0 24 24",
  fill: "none",
  stroke: "currentColor",
  strokeWidth: 1.8,
  strokeLinecap: "round" as const,
  strokeLinejoin: "round" as const,
  "aria-hidden": true,
};

function IconHome() {
  return (
    <svg {...ico}>
      <path d="M3 10.5 12 3l9 7.5" />
      <path d="M5 9.5V21h14V9.5" />
    </svg>
  );
}
function IconUser() {
  return (
    <svg {...ico}>
      <path d="M19 21v-2a4 4 0 0 0-4-4H9a4 4 0 0 0-4 4v2" />
      <circle cx="12" cy="7" r="4" />
    </svg>
  );
}
function IconLot() {
  return (
    <svg {...ico}>
      <path d="m14 3 7 7-3 3-7-7z" />
      <path d="M11.5 5.5 5 12l7 7 6.5-6.5" />
      <path d="M3 21h8" />
    </svg>
  );
}
function IconStar() {
  return (
    <svg {...ico}>
      <path d="m12 3 2.7 5.6 6.3.9-4.5 4.4 1 6.1-5.5-2.9-5.5 2.9 1-6.1L3 9.5l6.3-.9z" />
    </svg>
  );
}
function IconArticle() {
  return (
    <svg {...ico}>
      <path d="M4 4h13a2 2 0 0 1 2 2v14H6a2 2 0 0 1-2-2z" />
      <path d="M8 8h7M8 12h7M8 16h4" />
    </svg>
  );
}
function IconBox() {
  return (
    <svg {...ico}>
      <path d="M21 8 12 3 3 8v8l9 5 9-5z" />
      <path d="m3 8 9 5 9-5M12 13v8" />
    </svg>
  );
}
function IconTrophy() {
  return (
    <svg {...ico}>
      <path d="M7 4h10v5a5 5 0 0 1-10 0z" />
      <path d="M7 6H4v2a3 3 0 0 0 3 3M17 6h3v2a3 3 0 0 1-3 3" />
      <path d="M12 14v4M9 21h6" />
    </svg>
  );
}
function IconPage() {
  return (
    <svg {...ico}>
      <path d="M14 3H7a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h10a2 2 0 0 0 2-2V8z" />
      <path d="M14 3v5h5" />
    </svg>
  );
}
function IconLink() {
  return (
    <svg {...ico}>
      <path d="M10 13a5 5 0 0 0 7.5.5l2-2A5 5 0 0 0 12.5 4.5l-1 1" />
      <path d="M14 11a5 5 0 0 0-7.5-.5l-2 2A5 5 0 0 0 11.5 19.5l1-1" />
    </svg>
  );
}
function IconGear() {
  return (
    <svg {...ico}>
      <circle cx="12" cy="12" r="3" />
      <path d="M19.4 15a1.7 1.7 0 0 0 .3 1.9l.1.1a2 2 0 1 1-2.8 2.8l-.1-.1a1.7 1.7 0 0 0-2.9 1.2 2 2 0 0 1-4 0 1.7 1.7 0 0 0-2.9-1.2l-.1.1a2 2 0 1 1-2.8-2.8l.1-.1A1.7 1.7 0 0 0 3 15a2 2 0 0 1 0-4 1.7 1.7 0 0 0 1.2-2.9l-.1-.1a2 2 0 1 1 2.8-2.8l.1.1A1.7 1.7 0 0 0 10 4.1a2 2 0 0 1 4 0 1.7 1.7 0 0 0 2.9 1.2l.1-.1a2 2 0 1 1 2.8 2.8l-.1.1A1.7 1.7 0 0 0 21 11a2 2 0 0 1 0 4z" />
    </svg>
  );
}
function IconMail() {
  return (
    <svg {...ico}>
      <rect x="3" y="5" width="18" height="14" rx="2" />
      <path d="m3 7 9 6 9-6" />
    </svg>
  );
}
function IconList() {
  return (
    <svg {...ico}>
      <path d="M8 6h13M8 12h13M8 18h13M3 6h.01M3 12h.01M3 18h.01" />
    </svg>
  );
}
function IconBack() {
  return (
    <svg {...ico} strokeWidth={2.2}>
      <path d="m15 18-6-6 6-6" />
    </svg>
  );
}
