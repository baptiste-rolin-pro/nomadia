import type { Page } from "@playwright/test";
import { expect, test } from "./fixtures";
import { dismissCookies } from "./helpers";

/**
 * Hero vidéo de l'accueil : affiche partout, vidéo ajoutée après le chargement sur ordinateur seulement (jamais
 * sur mobile, en mouvement réduit ni avec l'économiseur de données), bouton pause / lecture, pause hors écran
 * et onglet masqué ; moteur de recherche remonté dans la première vue.
 */
const PAUSE = "Pause de l'animation du bandeau";
const PLAY = "Lecture de l'animation du bandeau";

const videoState = (page: Page) =>
  page.getByTestId("hero-video").evaluate((v: HTMLVideoElement) => ({ src: v.currentSrc, paused: v.paused, time: v.currentTime, muted: v.muted, loop: v.loop, playsInline: v.playsInline, controls: v.controls }));

/** Le hero a fini son entrée (le moteur monte de 12 px) : mesures stables. */
async function settled(page: Page) {
  await page.waitForFunction(() => document.getAnimations().every((a) => !(a.effect instanceof KeyframeEffect) || !(a.effect.target as Element | null)?.closest?.(".hero-panel") || a.playState === "finished"));
}

async function videoRequests(page: Page) {
  return page.evaluate(() => {
    const nav = performance.getEntriesByType("navigation")[0] as PerformanceNavigationTiming;
    return performance
      .getEntriesByType("resource")
      .filter((e) => e.name.includes("/videos/"))
      .map((e) => ({ name: e.name, afterLoad: e.startTime >= nav.loadEventEnd }));
  });
}

test.describe("ordinateur", () => {
  test.use({ viewport: { width: 1440, height: 900 } });

  test("vidéo posée après le chargement, muette et en boucle ; pause / lecture ; en pause hors écran et onglet masqué", async ({ page }) => {
    await page.goto("/");
    await dismissCookies(page);
    // Affiche rendue côté serveur (image LCP prioritaire), vidéo sans source dans le HTML.
    await expect(page.locator("img.hero-poster")).toHaveAttribute("fetchpriority", "high");
    await expect.poll(async () => (await videoState(page)).src).toMatch(/\/videos\/cote-aerienne-(1080|720)\.(webm|mp4)$/);
    await expect.poll(async () => (await videoState(page)).time).toBeGreaterThan(0.2);
    expect(await videoState(page)).toMatchObject({ paused: false, muted: true, loop: true, playsInline: true, controls: false });
    await expect(page.locator("[data-hero]")).toHaveAttribute("data-video", "playing");
    const requests = await videoRequests(page);
    expect(requests.length).toBeGreaterThan(0);
    expect(requests.every((r) => r.afterLoad), JSON.stringify(requests)).toBe(true);

    // Bouton pause : la vidéo et les animations du décor s'arrêtent ; lecture : tout reprend.
    await page.getByRole("button", { name: PAUSE }).click();
    await expect(page.getByRole("button", { name: PLAY })).toBeVisible();
    await expect.poll(async () => (await videoState(page)).paused).toBe(true);
    await expect(page.locator(".hero-kenburns")).toHaveCSS("animation-play-state", "paused");
    await expect(page.locator(".hero-route__plane")).toHaveCSS("animation-play-state", "paused");
    await page.getByRole("button", { name: PLAY }).click();
    await expect(page.getByRole("button", { name: PAUSE })).toBeVisible();
    await expect.poll(async () => (await videoState(page)).paused).toBe(false);
    await expect(page.locator(".hero-kenburns")).toHaveCSS("animation-play-state", "running");

    // Hors de l'écran : en pause, puis reprise au retour.
    await page.evaluate(() => window.scrollTo(0, document.body.scrollHeight));
    await expect.poll(async () => (await videoState(page)).paused).toBe(true);
    await expect(page.locator("[data-hero]")).toHaveAttribute("data-offscreen", "");
    await page.evaluate(() => window.scrollTo(0, 0));
    await expect.poll(async () => (await videoState(page)).paused).toBe(false);

    // Onglet masqué : en pause, puis reprise.
    const setVisibility = (state: "hidden" | "visible") =>
      page.evaluate((s) => {
        Object.defineProperty(document, "visibilityState", { configurable: true, get: () => s });
        document.dispatchEvent(new Event("visibilitychange"));
      }, state);
    await setVisibility("hidden");
    await expect.poll(async () => (await videoState(page)).paused).toBe(true);
    await setVisibility("visible");
    await expect.poll(async () => (await videoState(page)).paused).toBe(false);
  });

  test("économiseur de données : affiche seule, aucune vidéo téléchargée", async ({ page }) => {
    await page.addInitScript(() => Object.defineProperty(navigator, "connection", { configurable: true, value: { saveData: true, effectiveType: "4g" } }));
    await page.goto("/");
    await page.waitForTimeout(2_500);
    expect((await videoState(page)).src).toBe("");
    expect(await videoRequests(page)).toEqual([]);
    await expect(page.locator("img.hero-poster")).toBeVisible();
  });

  test("mouvement réduit : affiche immobile, ni vidéo ni bouton pause", async ({ browser }) => {
    const context = await browser.newContext({ viewport: { width: 1440, height: 900 }, reducedMotion: "reduce" });
    const page = await context.newPage();
    await page.goto("/");
    await page.waitForTimeout(2_500);
    expect((await videoState(page)).src).toBe("");
    expect(await videoRequests(page)).toEqual([]);
    await expect(page.getByTestId("hero-motion-toggle")).toBeHidden();
    await expect(page.locator(".hero-kenburns")).toHaveCSS("animation-name", "none");
    await expect(page.locator(".hero-route__plane")).toHaveCSS("animation-name", "none");
    await expect(page.getByRole("heading", { level: 1, name: /Votre prochaine histoire/ })).toBeVisible();
    await context.close();
  });
});

for (const device of [
  { name: "mobile", viewport: { width: 375, height: 812 } },
  { name: "tablette", viewport: { width: 768, height: 1024 } },
]) {
  test.describe(device.name, () => {
    test.use({ viewport: device.viewport, hasTouch: true, isMobile: true });

    test(`${device.name} : affiche seule (aucune vidéo téléchargée), décor animé avec bouton pause`, async ({ page }) => {
      await page.goto("/");
      await page.waitForTimeout(2_500);
      expect((await videoState(page)).src).toBe("");
      expect(await videoRequests(page)).toEqual([]);
      await expect(page.locator("img.hero-poster")).toBeVisible();
      await dismissCookies(page);
      await page.getByRole("button", { name: PAUSE }).click();
      await expect(page.locator(".hero-kenburns")).toHaveCSS("animation-play-state", "paused");
      await expect(page.getByRole("button", { name: PLAY })).toBeVisible();
    });
  });
}

// Moteur de recherche remonté : entièrement visible sans défiler à 1440 × 900 et 768 × 1024, commence dans la
// première vue à 375 × 812 ; le contenu du hero se termine au-dessus (aucun chevauchement).
for (const { width, height, full } of [
  { width: 1440, height: 900, full: true },
  { width: 768, height: 1024, full: true },
  { width: 375, height: 812, full: false },
]) {
  test(`moteur de recherche dans la première vue à ${width} × ${height}`, async ({ page }) => {
    await page.setViewportSize({ width, height });
    await page.goto("/");
    await dismissCookies(page);
    await settled(page);
    const panel = (await page.getByRole("region", { name: "Rechercher" }).boundingBox())!;
    if (full) expect(panel.y + panel.height, "bas du moteur").toBeLessThanOrEqual(height);
    else expect(panel.y + 140, "onglets et premier champ visibles").toBeLessThanOrEqual(height);
    const heroBottom = await page.locator("[data-hero] .hero-content").evaluate((el) => Math.max(...Array.from(el.children, (c) => c.getBoundingClientRect().bottom)));
    expect(heroBottom, "contenu du hero au-dessus du moteur").toBeLessThanOrEqual(panel.y);
    // Le trajet animé (≥ 1280 px) ne recouvre aucun texte du hero.
    const route = await page.locator(".hero-route").boundingBox();
    if (route && (await page.locator(".hero-route").isVisible())) {
      // Boîtes des lignes de texte elles-mêmes (pas des blocs pleine largeur qui les contiennent).
      const textRects = await page.locator("[data-hero] .hero-content").evaluate((el) => {
        const rects: { x: number; y: number; w: number; h: number }[] = [];
        const walker = document.createTreeWalker(el, NodeFilter.SHOW_TEXT);
        for (let node = walker.nextNode(); node; node = walker.nextNode()) {
          if (!node.textContent?.trim()) continue;
          const range = document.createRange();
          range.selectNodeContents(node);
          for (const r of Array.from(range.getClientRects())) if (r.width > 1 && r.height > 1) rects.push({ x: r.x, y: r.y, w: r.width, h: r.height });
        }
        return rects;
      });
      expect(textRects.length).toBeGreaterThan(3);
      for (const r of textRects) {
        const overlaps = r.x < route.x + route.width && r.x + r.w > route.x && r.y < route.y + route.height && r.y + r.h > route.y;
        expect(overlaps, JSON.stringify(r)).toBe(false);
      }
    }
  });
}
