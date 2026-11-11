/**
 * Règles de lecture de la vidéo du hero (fonctions pures, testées dans tests/unit/hero-video.test.ts).
 * La vidéo n'est qu'un décor : l'affiche (image LCP) suffit partout ; la vidéo ne s'ajoute que sur ordinateur,
 * sans préférence de mouvement réduit ni économiseur de données, sur une connexion rapide, après le chargement.
 */
export interface HeroVideoSource {
  src: string;
  type: string;
  height: 720 | 1080;
}

export interface PlaybackEnvironment {
  /** Grand écran avec pointeur précis (souris, pavé tactile). */
  desktop: boolean;
  reducedMotion: boolean;
  /** `navigator.connection.saveData`. */
  saveData: boolean;
  /** `navigator.connection.effectiveType` (« slow-2g », « 2g », « 3g », « 4g ») si disponible. */
  effectiveType?: string;
}

/** Requête média de l'ordinateur : au moins 1024 px de large et pointeur principal précis. */
export const HERO_VIDEO_DESKTOP_QUERY = "(min-width: 1024px) and (pointer: fine)";

export function canPlayHeroVideo(env: PlaybackEnvironment): boolean {
  if (!env.desktop || env.reducedMotion || env.saveData) return false;
  // Connexion lente annoncée : l'affiche suffit (plusieurs secondes de téléchargement pour un décor).
  return !(env.effectiveType && ["slow-2g", "2g", "3g"].includes(env.effectiveType));
}

/**
 * Choisit le fichier : 1080p si la vidéo s'affiche sur plus de 1500 pixels physiques de large (sinon le 720p
 * serait agrandi de plus de 15 %), 720p sinon ; à résolution égale, le premier format lisible par le navigateur.
 * Repli sur l'autre résolution si aucun format de la résolution visée n'est lisible.
 */
export function pickHeroVideoSource(
  sources: readonly HeroVideoSource[],
  displayPixelWidth: number,
  canPlayType: (type: string) => string,
): HeroVideoSource | null {
  const preferred = displayPixelWidth > 1500 ? 1080 : 720;
  const ordered = [...sources.filter((s) => s.height === preferred), ...sources.filter((s) => s.height !== preferred)];
  return ordered.find((s) => canPlayType(s.type) !== "") ?? null;
}

/** Largeur affichée d'une vidéo 16:9 en `object-fit: cover` dans une boîte donnée. */
export function coverWidth(boxWidth: number, boxHeight: number, ratio = 16 / 9): number {
  return Math.max(boxWidth, boxHeight * ratio);
}
