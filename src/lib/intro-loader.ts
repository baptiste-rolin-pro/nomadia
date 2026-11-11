/**
 * Écran d'accueil « avion » : affiché une seule fois par session d'onglet (sessionStorage), au premier
 * chargement complet d'une page. Tout est décidé par un script en ligne dans <head>, avant le premier rendu :
 * - sans JavaScript, le script ne s'exécute pas et l'écran n'existe jamais (CSS : masqué par défaut) ;
 * - mouvement réduit, onglet en arrière-plan, stockage illisible ou non inscriptible : aucun écran ;
 * - sinon `html.intro` l'affiche, puis il se ferme dès que la page est chargée (événement `load`), après une
 *   durée minimale (animation) et au plus tard après un plafond, ou dès un clic, une touche, la molette.
 * Le contenu de la page est rendu dessous, normalement (il reste dans le DOM et accessible) ; la fenêtre de
 * démonstration et la bannière cookies attendent la fin (`INTRO_END_EVENT`).
 * Ce module ne dépend pas de React : il est importé par la mise en page serveur.
 */
export const INTRO_STORAGE_KEY = "nomadia:intro";
export const INTRO_STORAGE_VALUE = "vu-v1";
export const INTRO_END_EVENT = "nomadia:intro-end";
/** Classe posée sur <html> tant que l'écran est affiché (`intro-out` pendant le fondu de sortie). */
export const INTRO_CLASS = "intro";

export interface IntroOptions {
  key: string;
  value: string;
  event: string;
  /** Durée minimale depuis le début de la navigation (ms), pour que l'avion ait le temps de voler. */
  min: number;
  /** Plafond depuis le début de la navigation (ms), même si la page n'a pas fini de charger. */
  max: number;
  /** Durée du fondu de sortie (ms), synchronisée avec globals.css. */
  fade: number;
}

export const INTRO_OPTIONS: IntroOptions = {
  key: INTRO_STORAGE_KEY,
  value: INTRO_STORAGE_VALUE,
  event: INTRO_END_EVENT,
  min: 1500,
  max: 2500,
  fade: 420,
};

/**
 * Corps du script en ligne. Autonome (aucune référence extérieure) : il est sérialisé avec `toString()`.
 * Exporté pour les tests unitaires, qui l'exécutent avec un document simulé.
 */
export function runIntroLoader(o: IntroOptions): void {
  const root = document.documentElement;
  try {
    const store = window.sessionStorage;
    if (store.getItem(o.key) === o.value) return;
    if (window.matchMedia("(prefers-reduced-motion: reduce)").matches) return;
    if (document.visibilityState === "hidden") return;
    // Mémorisé dès l'affichage : un rechargement pendant l'animation ne la rejoue pas.
    store.setItem(o.key, o.value);
  } catch {
    // Stockage indisponible : l'écran ne pourrait pas être mémorisé, il n'est donc jamais affiché.
    return;
  }
  root.classList.add("intro");
  let done = false;
  const skipEvents = ["pointerdown", "keydown", "wheel", "touchstart"];
  const finish = () => {
    if (done) return;
    done = true;
    for (const type of skipEvents) window.removeEventListener(type, finish, true);
    root.classList.add("intro-out");
    window.setTimeout(() => {
      root.classList.remove("intro", "intro-out");
      window.dispatchEvent(new Event(o.event));
    }, o.fade);
  };
  // Plafond posé en premier : quoi qu'il arrive ensuite, l'écran se ferme.
  window.setTimeout(finish, Math.max(0, o.max - performance.now()));
  const ready = () => window.setTimeout(finish, Math.max(0, o.min - performance.now()));
  if (document.readyState === "complete") ready();
  else window.addEventListener("load", ready, { once: true });
  for (const type of skipEvents) window.addEventListener(type, finish, { capture: true, passive: true });
}

/** Script en ligne pour <head> (exécuté avant le premier rendu, sans attendre React). */
export function introLoaderInlineScript(options: IntroOptions = INTRO_OPTIONS): string {
  return `(${runIntroLoader.toString()})(${JSON.stringify(options)})`;
}
