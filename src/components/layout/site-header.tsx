"use client";

import dynamic from "next/dynamic";
import { usePathname } from "next/navigation";
import { useEffect, useRef, useState } from "react";
import { Menu, UserRound, X } from "lucide-react";
import { siteConfig } from "@/lib/config/site";
import { pagePath } from "@/i18n/config";
import { useI18n } from "@/i18n/client";
import { Link } from "@/i18n/link";
import { LanguageSwitcher } from "@/components/layout/language-switcher";

// Session lue après l'hydratation (client d'authentification hors du JavaScript initial).
const SessionBridge = dynamic(() => import("@/components/layout/session-bridge"), { ssr: false });
// Suggestion de langue : rien au rendu serveur, chargée après l'hydratation (hors JavaScript initial).
const LanguageSuggestion = dynamic(() => import("@/components/layout/language-suggestion"), { ssr: false });

/**
 * En-tête : superposé au hero sur l'accueil (transparent), fond lisible dès le défilement.
 * Hauteur fixe => aucun saut de mise en page. Menu mobile en <dialog> natif (focus piégé, Échap).
 * Sélecteur de langue : bouton + liste (grand écran) et liste dans le menu mobile.
 */
export function SiteHeader() {
  const { m, f } = useI18n();
  const t = m.common.nav;
  const pathname = pagePath(usePathname());
  const [user, setUser] = useState<{ name: string } | null>(null);
  const overlay = pathname === "/";
  const [scrolled, setScrolled] = useState(false);
  const dialogRef = useRef<HTMLDialogElement>(null);
  const openerRef = useRef<HTMLButtonElement>(null);
  const mainNav = [
    { href: "/destinations", label: t.destinations },
    { href: "/voyage/nouveau", label: t.planTrip },
    { href: "/vols", label: t.flights },
    { href: "/hotels", label: t.hotels },
    { href: "/voitures", label: t.cars },
  ];

  useEffect(() => {
    if (!overlay) return;
    const onScroll = () => setScrolled(window.scrollY > 24);
    onScroll();
    window.addEventListener("scroll", onScroll, { passive: true });
    return () => window.removeEventListener("scroll", onScroll);
  }, [overlay]);

  useEffect(() => {
    dialogRef.current?.close();
  }, [pathname]);

  const transparent = overlay && !scrolled;
  const linkTone = transparent ? "text-white hover:bg-white/15" : "text-ink hover:bg-ivory-deep";

  return (
    <header
      className={`no-print sticky top-0 z-[var(--z-header)] h-[var(--header-height)] transition-[background-color,box-shadow,color] duration-300 ${
        transparent ? "bg-transparent" : "bg-ivory/95 shadow-[0_1px_0_var(--color-line)] backdrop-blur-sm"
      }`}
    >
      <SessionBridge onChange={setUser} />
      <div className="container-page flex h-full items-center justify-between gap-4">
        <Link href="/" className={`font-serif text-2xl font-semibold tracking-tight ${transparent ? "text-white" : "text-forest"}`} aria-label={f.t(t.homeLabel, { name: siteConfig.name })}>
          {siteConfig.name}
        </Link>
        <nav aria-label={t.main} className="hidden lg:block">
          <ul className="flex items-center gap-1">
            {mainNav.map((item) => {
              const active = pathname === item.href || pathname.startsWith(`${item.href}/`);
              return (
                <li key={item.href}>
                  <Link href={item.href} aria-current={active ? "page" : undefined} className={`rounded-full px-3.5 py-2 text-[0.93rem] font-medium transition-colors ${linkTone} ${active ? "underline decoration-2 underline-offset-[6px]" : ""}`}>
                    {item.label}
                  </Link>
                </li>
              );
            })}
          </ul>
        </nav>
        <div className="flex items-center gap-2">
          <LanguageSuggestion tone={transparent ? "light" : "dark"} />
          <LanguageSwitcher tone={transparent ? "light" : "dark"} className="hidden sm:block" />
          <Link
            href={user ? "/compte" : "/connexion"}
            className={`hidden items-center gap-2 rounded-full border px-4 py-2 text-sm font-semibold sm:inline-flex ${transparent ? "border-white/60 text-white hover:bg-white/15" : "border-forest text-forest hover:bg-forest-soft"}`}
          >
            <UserRound aria-hidden className="size-4" />
            {user ? t.account : t.signIn}
          </Link>
          <button
            ref={openerRef}
            type="button"
            className={`inline-flex size-11 items-center justify-center rounded-full lg:hidden ${linkTone}`}
            aria-label={t.openMenu}
            aria-haspopup="dialog"
            onClick={() => dialogRef.current?.showModal()}
          >
            <Menu aria-hidden className="size-6" />
          </button>
        </div>
      </div>
      <dialog
        ref={dialogRef}
        aria-label={t.menu}
        className="m-0 ms-auto h-dvh max-h-none w-[min(22rem,100vw)] max-w-none bg-ivory p-0 text-ink"
        onClose={() => openerRef.current?.focus()}
        onClick={(e) => {
          if (e.target === dialogRef.current) dialogRef.current?.close();
        }}
      >
        <div className="flex h-full flex-col overflow-y-auto p-6">
          <div className="mb-8 flex items-center justify-between">
            <span className="font-serif text-2xl text-forest">{siteConfig.name}</span>
            <button type="button" className="inline-flex size-11 items-center justify-center rounded-full hover:bg-ivory-deep" aria-label={t.closeMenu} onClick={() => dialogRef.current?.close()}>
              <X aria-hidden className="size-6" />
            </button>
          </div>
          <nav aria-label={t.mobile}>
            <ul className="space-y-1">
              {[{ href: "/", label: t.home }, ...mainNav, { href: "/guides", label: t.guides }, { href: "/aide", label: t.help }].map((item) => (
                <li key={item.href}>
                  <Link href={item.href} aria-current={pathname === item.href ? "page" : undefined} className="block rounded-[var(--radius-md)] px-3 py-3 text-lg font-medium hover:bg-ivory-deep">
                    {item.label}
                  </Link>
                </li>
              ))}
            </ul>
          </nav>
          <div className="mt-6 border-t border-line pt-4">
            <p className="mb-2 text-sm font-semibold text-ink-soft">{m.common.language.label}</p>
            <LanguageSwitcher variant="list" />
          </div>
          <div className="mt-auto border-t border-line pt-6">
            <Link href={user ? "/compte" : "/connexion"} className="flex items-center gap-2 rounded-[var(--radius-md)] bg-forest px-4 py-3 font-semibold text-white">
              <UserRound aria-hidden className="size-5" />
              {user ? f.t(t.accountNamed, { name: user.name }) : t.signInOrUp}
            </Link>
          </div>
        </div>
      </dialog>
    </header>
  );
}
