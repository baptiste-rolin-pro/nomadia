"use client";

import { usePathname } from "next/navigation";
import { useEffect } from "react";

/**
 * Révélation discrète des blocs éditoriaux à l'entrée dans l'écran (une seule fois).
 * Sans IntersectionObserver, avec mouvement réduit ou si le script arrive après le repli CSS (2,5 s),
 * tout est révélé immédiatement : aucun bloc déjà affiché ne disparaît.
 */
export function RevealObserver() {
  const pathname = usePathname();
  useEffect(() => {
    const root = document.documentElement;
    const nodes = Array.from(document.querySelectorAll<HTMLElement>(".reveal:not(.is-visible)"));
    const late = !root.classList.contains("reveal-ready") && performance.now() > 2300;
    if (late || !("IntersectionObserver" in window) || window.matchMedia("(prefers-reduced-motion: reduce)").matches) {
      nodes.forEach((n) => n.classList.add("is-visible"));
      return;
    }
    // Le script a pris la main : le repli CSS n'est plus nécessaire, les blocs se révèlent au défilement.
    root.classList.add("reveal-ready");
    const io = new IntersectionObserver(
      (entries) => {
        for (const e of entries) {
          if (e.isIntersecting) {
            e.target.classList.add("is-visible");
            io.unobserve(e.target);
          }
        }
      },
      { rootMargin: "0px 0px -8% 0px", threshold: 0.08 },
    );
    nodes.forEach((n) => io.observe(n));
    return () => io.disconnect();
  }, [pathname]);
  return null;
}
