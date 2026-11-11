import { useSyncExternalStore } from "react";
import { INTRO_CLASS, INTRO_END_EVENT } from "@/lib/intro-loader";

/**
 * Côté navigateur : vrai quand l'écran d'accueil « avion » n'est pas (ou plus) affiché.
 * La fenêtre de démonstration puis la bannière cookies attendent ce signal (jamais par-dessus l'écran).
 * Faux au rendu serveur et pendant l'hydratation : ces éléments n'existent qu'ensuite, la page n'en dépend pas.
 */
function subscribe(listener: () => void): () => void {
  window.addEventListener(INTRO_END_EVENT, listener);
  return () => window.removeEventListener(INTRO_END_EVENT, listener);
}

function introDone(): boolean {
  return !document.documentElement.classList.contains(INTRO_CLASS);
}

export function useIntroDone(): boolean {
  return useSyncExternalStore(subscribe, introDone, () => false);
}
