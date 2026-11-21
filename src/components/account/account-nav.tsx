"use client";

import { Link } from "@/i18n/link";
import { usePathname } from "next/navigation";
import { pagePath } from "@/i18n/config";
import { useI18n } from "@/i18n/client";

const LINKS = [
  { href: "/compte", key: "trips" },
  { href: "/compte/reservations", key: "bookings" },
  { href: "/compte/favoris", key: "favorites" },
  { href: "/compte/profil", key: "profile" },
  { href: "/compte/preferences", key: "preferences" },
  { href: "/compte/donnees", key: "data" },
] as const;

export function AccountNav() {
  const pathname = pagePath(usePathname());
  const t = useI18n().m.account.nav;
  return (
    <nav aria-label={t.label}>
      <ul className="flex gap-1 overflow-x-auto lg:flex-col">
        {LINKS.map((l) => {
          const active = pathname === l.href;
          return (
            <li key={l.href} className="shrink-0">
              <Link href={l.href} aria-current={active ? "page" : undefined} className={`block rounded-[var(--radius-md)] px-3 py-2.5 text-sm font-semibold ${active ? "bg-forest text-white" : "hover:bg-ivory-deep"}`}>
                {t[l.key]}
              </Link>
            </li>
          );
        })}
      </ul>
    </nav>
  );
}
