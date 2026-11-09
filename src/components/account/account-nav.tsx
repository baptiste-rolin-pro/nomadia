"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";

const LINKS = [
  { href: "/compte", label: "Mes voyages" },
  { href: "/compte/reservations", label: "Réservations" },
  { href: "/compte/favoris", label: "Favoris" },
  { href: "/compte/profil", label: "Profil et voyageurs" },
  { href: "/compte/preferences", label: "Préférences" },
  { href: "/compte/donnees", label: "Données personnelles" },
];

export function AccountNav() {
  const pathname = usePathname();
  return (
    <nav aria-label="Espace personnel">
      <ul className="flex gap-1 overflow-x-auto lg:flex-col">
        {LINKS.map((l) => {
          const active = pathname === l.href;
          return (
            <li key={l.href} className="shrink-0">
              <Link href={l.href} aria-current={active ? "page" : undefined} className={`block rounded-[var(--radius-md)] px-3 py-2.5 text-sm font-semibold ${active ? "bg-forest text-white" : "hover:bg-ivory-deep"}`}>
                {l.label}
              </Link>
            </li>
          );
        })}
      </ul>
    </nav>
  );
}
