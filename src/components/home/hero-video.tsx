"use client";

import { useEffect, useRef, useSyncExternalStore } from "react";
import { Pause, Play } from "lucide-react";
import { HERO_VIDEO_DESKTOP_QUERY, canPlayHeroVideo, coverWidth, pickHeroVideoSource, type HeroVideoSource } from "@/lib/hero-video";

/**
 * Vidéo d'ambiance du hero et bouton pause / lecture (décor animé : vidéo + animations CSS du bandeau).
 * - Aucune source dans le HTML : rien n'est téléchargé avant l'événement `load`, ni jamais sur mobile, en
 *   mouvement réduit, avec l'économiseur de données ou une connexion lente (l'affiche reste visible).
 * - Muette, en boucle, `playsInline`, sans contrôles natifs ; elle apparaît en fondu à la première image lue.
 * - En pause hors de l'écran (IntersectionObserver), onglet masqué, ou à la demande (bouton) ; le bouton met
 *   aussi en pause les animations CSS du bandeau (attributs `data-paused` / `data-offscreen` du hero).
 */

// État « mis en pause par la personne », partagé entre la vidéo et le bouton (mémoire de la page).
let pausedByUser = false;
const listeners = new Set<() => void>();
const subscribePaused = (listener: () => void) => {
  listeners.add(listener);
  return () => listeners.delete(listener);
};
const getPaused = () => pausedByUser;
function setPaused(value: boolean) {
  pausedByUser = value;
  for (const l of listeners) l();
}

type NetworkInformation = { saveData?: boolean; effectiveType?: string };

export function HeroVideo({ sources }: { sources: readonly HeroVideoSource[] }) {
  const ref = useRef<HTMLVideoElement>(null);

  useEffect(() => {
    const video = ref.current;
    const hero = video?.closest<HTMLElement>("[data-hero]");
    if (!video || !hero) return;
    const desktop = window.matchMedia(HERO_VIDEO_DESKTOP_QUERY);
    const reduced = window.matchMedia("(prefers-reduced-motion: reduce)");
    const connection = (navigator as Navigator & { connection?: NetworkInformation }).connection;
    let attached = false;
    let onScreen = true;
    let idle = 0;

    const allowed = () =>
      canPlayHeroVideo({ desktop: desktop.matches, reducedMotion: reduced.matches, saveData: Boolean(connection?.saveData), effectiveType: connection?.effectiveType });

    const sync = () => {
      hero.toggleAttribute("data-paused", pausedByUser);
      hero.toggleAttribute("data-offscreen", !onScreen);
      const ok = allowed();
      if (!ok) hero.removeAttribute("data-video");
      if (attached && ok && onScreen && !pausedByUser && document.visibilityState === "visible") {
        video.play().catch(() => {
          // Lecture refusée (politique du navigateur) : l'affiche reste, aucune erreur visible.
        });
      } else if (!video.paused) {
        video.pause();
      }
    };

    const attach = () => {
      if (attached || !allowed()) return;
      const box = video.getBoundingClientRect();
      const source = pickHeroVideoSource(sources, coverWidth(box.width, box.height) * window.devicePixelRatio, (type) => video.canPlayType(type));
      if (!source) return;
      attached = true;
      video.muted = true;
      video.src = source.src;
      video.load();
      sync();
    };
    const schedule = () => {
      if (typeof window.requestIdleCallback === "function") idle = window.requestIdleCallback(attach, { timeout: 1500 });
      else idle = window.setTimeout(attach, 300);
    };
    // Jamais dans le chemin critique : la source n'est posée qu'après le chargement complet de la page.
    if (document.readyState === "complete") schedule();
    else window.addEventListener("load", schedule, { once: true });

    const onPlaying = () => {
      if (allowed()) hero.setAttribute("data-video", "playing");
    };
    const onError = () => hero.removeAttribute("data-video");
    video.addEventListener("playing", onPlaying);
    video.addEventListener("error", onError);

    const observer = new IntersectionObserver((entries) => {
      onScreen = entries.some((e) => e.isIntersecting);
      sync();
    });
    observer.observe(hero);

    const onConditions = () => {
      attach();
      sync();
    };
    document.addEventListener("visibilitychange", sync);
    desktop.addEventListener("change", onConditions);
    reduced.addEventListener("change", onConditions);
    const unsubscribe = subscribePaused(sync);
    sync();

    return () => {
      window.removeEventListener("load", schedule);
      if (typeof window.cancelIdleCallback === "function") window.cancelIdleCallback(idle);
      window.clearTimeout(idle);
      video.removeEventListener("playing", onPlaying);
      video.removeEventListener("error", onError);
      observer.disconnect();
      document.removeEventListener("visibilitychange", sync);
      desktop.removeEventListener("change", onConditions);
      reduced.removeEventListener("change", onConditions);
      unsubscribe();
    };
  }, [sources]);

  return (
    <video
      ref={ref}
      className="hero-video"
      data-testid="hero-video"
      muted
      loop
      playsInline
      preload="none"
      disablePictureInPicture
      disableRemotePlayback
      aria-hidden
      tabIndex={-1}
    />
  );
}

/**
 * Bouton pause / lecture du décor animé (vidéo, survol de l'avion, défilement des destinations, zoom lent).
 * Libellé visible « Pause » / « Lecture », complété pour les lecteurs d'écran. Masqué sans JavaScript et en
 * mouvement réduit (rien ne bouge alors).
 */
export function HeroMotionToggle() {
  const paused = useSyncExternalStore(subscribePaused, getPaused, () => false);
  return (
    <button
      type="button"
      onClick={() => setPaused(!paused)}
      data-testid="hero-motion-toggle"
      className="hero-toggle min-h-11 items-center gap-2 rounded-full border border-white/45 bg-ink/35 px-4 text-sm font-semibold text-white backdrop-blur-sm transition-colors hover:bg-ink/55"
    >
      {paused ? <Play aria-hidden className="size-4" fill="currentColor" /> : <Pause aria-hidden className="size-4" fill="currentColor" />}
      <span>{paused ? "Lecture" : "Pause"}</span>
      <span className="sr-only"> de l&apos;animation du bandeau</span>
    </button>
  );
}
