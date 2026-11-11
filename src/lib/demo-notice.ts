import { useSyncExternalStore } from "react";

/**
 * Fenêtre « À propos de la démonstration » : affichée à la première visite, puis seulement à la demande.
 * Le choix est mémorisé par navigateur (localStorage). Si le stockage est indisponible (navigation privée
 * stricte, stockage bloqué), la fermeture reste mémorisée en mémoire jusqu'au prochain chargement complet.
 */
export const DEMO_NOTICE_STORAGE_KEY = "nomadia:demo-notice";
export const DEMO_NOTICE_STORAGE_VALUE = "vu-v1";

export type StorageLike = Pick<Storage, "getItem" | "setItem">;

/** Vrai / faux selon la valeur mémorisée ; `null` si le stockage ne peut pas être lu. */
export function readDemoNoticeDismissed(getStorage: () => StorageLike | null): boolean | null {
  try {
    const storage = getStorage();
    if (!storage) return null;
    return storage.getItem(DEMO_NOTICE_STORAGE_KEY) === DEMO_NOTICE_STORAGE_VALUE;
  } catch {
    return null;
  }
}

/** Mémorise la fermeture ; renvoie faux si le stockage refuse l'écriture (aucune exception propagée). */
export function writeDemoNoticeDismissed(getStorage: () => StorageLike | null): boolean {
  try {
    const storage = getStorage();
    if (!storage) return false;
    storage.setItem(DEMO_NOTICE_STORAGE_KEY, DEMO_NOTICE_STORAGE_VALUE);
    return true;
  } catch {
    return false;
  }
}

function browserStorage(): StorageLike | null {
  return typeof window === "undefined" ? null : window.localStorage;
}

// --- État partagé côté navigateur (fenêtre, bannière cookies, bouton « À propos de la démo ») ---------------------------

let dismissed: boolean | null = null;
let forcedOpen = false;
let opener: HTMLElement | null = null;
const listeners = new Set<() => void>();

function emit() {
  for (const l of listeners) l();
}

function isDismissed(): boolean {
  if (dismissed === null) dismissed = readDemoNoticeDismissed(browserStorage) ?? false;
  return dismissed;
}

export function isDemoNoticeOpen(): boolean {
  return forcedOpen || !isDismissed();
}

export function subscribeDemoNotice(listener: () => void): () => void {
  listeners.add(listener);
  return () => listeners.delete(listener);
}

/** Rouvre la fenêtre ; l'élément d'origine reçoit à nouveau le focus à la fermeture. */
export function openDemoNotice(from?: HTMLElement | null) {
  opener = from ?? null;
  forcedOpen = true;
  emit();
}

/** Ferme la fenêtre et mémorise le choix (stockage du navigateur, sinon mémoire). */
export function dismissDemoNotice() {
  dismissed = true;
  forcedOpen = false;
  opener = null;
  writeDemoNoticeDismissed(browserStorage);
  emit();
}

/** Élément à refocaliser à la fermeture : le bouton « À propos de la démo » qui a rouvert la fenêtre, s'il y en a un. */
export function demoNoticeOpener(): HTMLElement | null {
  return opener;
}

/**
 * Fenêtre ouverte (première visite ou réouverture). Toujours fausse au rendu serveur : la fenêtre n'existe
 * qu'après l'hydratation, et le contenu de la page n'en dépend jamais.
 */
export function useDemoNoticeOpen(enabled: boolean): boolean {
  const open = useSyncExternalStore(subscribeDemoNotice, isDemoNoticeOpen, () => false);
  return enabled && open;
}
