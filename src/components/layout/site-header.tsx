"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useEffect, useRef, useState } from "react";
import { Menu, UserRound, X } from "lucide-react";
import { mainNav, siteConfig } from "@/lib/config/site";
import { authClient } from "@/lib/auth/client";

/**
 * En-tête : superposé au hero sur l'accueil (transparent), fond lisible dès le défilement.
 * Hauteur fixe => aucun saut de mise en page. Menu mobile en <dialog> natif (focus piégé, Échap).
 */
export function SiteHeader() {
  const pathname = usePathname();
  const { data: session } = authClient.useSession();
  const user = session?.user ? { name: session.user.name } : null;
  const overlay = pathname === "/";
  const [scrolled, setScrolled] = useState(false);
  const dialogRef = useRef<HTMLDialogElement>(null);
  const openerRef = useRef<HTMLButtonElement>(null);

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
      <div className="container-page flex h-full items-center justify-between gap-4">
        <Link href="/" className={`font-serif text-2xl font-semibold tracking-tight ${transparent ? "text-white" : "text-forest"}`} aria-label={`${siteConfig.name} — accueil`}>
          {siteConfig.name}
        </Link>
        <nav aria-label="Navigation principale" className="hidden lg:block">
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
          <Link
            href={user ? "/compte" : "/connexion"}
            className={`hidden items-center gap-2 rounded-full border px-4 py-2 text-sm font-semibold sm:inline-flex ${transparent ? "border-white/60 text-white hover:bg-white/15" : "border-forest text-forest hover:bg-forest-soft"}`}
          >
            <UserRound aria-hidden className="size-4" />
            {user ? "Mon compte" : "Se connecter"}
          </Link>
          <button
            ref={openerRef}
            type="button"
            className={`inline-flex size-11 items-center justify-center rounded-full lg:hidden ${linkTone}`}
            aria-label="Ouvrir le menu"
            aria-haspopup="dialog"
            onClick={() => dialogRef.current?.showModal()}
          >
            <Menu aria-hidden className="size-6" />
          </button>
        </div>
      </div>
      <dialog
        ref={dialogRef}
        aria-label="Menu"
        className="m-0 ml-auto h-dvh max-h-none w-[min(22rem,100vw)] max-w-none bg-ivory p-0 text-ink"
        onClose={() => openerRef.current?.focus()}
        onClick={(e) => {
          if (e.target === dialogRef.current) dialogRef.current?.close();
        }}
      >
        <div className="flex h-full flex-col p-6">
          <div className="mb-8 flex items-center justify-between">
            <span className="font-serif text-2xl text-forest">{siteConfig.name}</span>
            <button type="button" className="inline-flex size-11 items-center justify-center rounded-full hover:bg-ivory-deep" aria-label="Fermer le menu" onClick={() => dialogRef.current?.close()}>
              <X aria-hidden className="size-6" />
            </button>
          </div>
          <nav aria-label="Navigation mobile">
            <ul className="space-y-1">
              {[{ href: "/", label: "Accueil" }, ...mainNav, { href: "/guides", label: "Guides" }, { href: "/aide", label: "Aide" }].map((item) => (
                <li key={item.href}>
                  <Link href={item.href} aria-current={pathname === item.href ? "page" : undefined} className="block rounded-[var(--radius-md)] px-3 py-3 text-lg font-medium hover:bg-ivory-deep">
                    {item.label}
                  </Link>
                </li>
              ))}
            </ul>
          </nav>
          <div className="mt-auto border-t border-line pt-6">
            <Link href={user ? "/compte" : "/connexion"} className="flex items-center gap-2 rounded-[var(--radius-md)] bg-forest px-4 py-3 font-semibold text-white">
              <UserRound aria-hidden className="size-5" />
              {user ? `Mon compte (${user.name})` : "Se connecter ou créer un compte"}
            </Link>
          </div>
        </div>
      </dialog>
    </header>
  );
}
