import { test as base, expect, type BrowserContext } from "@playwright/test";

/**
 * Écran d'accueil « avion » (src/lib/intro-loader.ts) : affiché une fois par session d'onglet, mémorisé dans
 * sessionStorage, que `storageState` ne sait pas préremplir. Chaque contexte de test le marque donc comme déjà
 * vu par un script d'initialisation (avant tout script de la page) : les parcours ne l'attendent jamais.
 * `test.use({ introSeen: false })` le rétablit (tests/e2e/intro-hero.spec.ts). Les contextes créés à la main
 * (`browser.newContext`) appellent `markIntroSeen(context)` si besoin.
 */
export const INTRO_STORAGE = { key: "nomadia:intro", value: "vu-v1" } as const;

export async function markIntroSeen(context: BrowserContext) {
  await context.addInitScript(({ key, value }) => {
    try {
      window.sessionStorage.setItem(key, value);
    } catch {
      // Stockage bloqué par le test lui-même : l'écran ne s'affiche pas non plus dans ce cas.
    }
  }, INTRO_STORAGE);
}

export const test = base.extend<{ introSeen: boolean }>({
  introSeen: [true, { option: true }],
  // Second argument nommé `provide` (et non `use`) : la règle des hooks React ne s'applique pas ici.
  context: async ({ context, introSeen }, provide) => {
    if (introSeen) await markIntroSeen(context);
    await provide(context);
  },
});

export { expect };
