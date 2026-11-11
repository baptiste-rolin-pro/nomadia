import { expect, test } from "./fixtures";
import { dismissCookies } from "./helpers";

/**
 * Écran d'accueil « avion » (src/lib/intro-loader.ts) : première page de la session d'onglet seulement,
 * au-dessus d'une page déjà rendue, fermé au chargement (durée minimale, plafond), par Échap ou un clic ;
 * jamais en mouvement réduit, sans JavaScript (navigation.spec.ts) ni avec un stockage bloqué.
 * Ces tests désactivent le marquage « déjà vu » des autres parcours (tests/e2e/fixtures.ts).
 */
test.use({ introSeen: false });

const DIALOG = "Bienvenue sur la démo de Nomadia";
const HERO_TITLE = /Votre prochaine histoire s'écrit ailleurs/;

test.describe("navigateur vierge", () => {
  test.use({ storageState: { cookies: [], origins: [] } });

  test("première visite : écran au-dessus de la page rendue, puis fenêtre de démonstration, puis bannière cookies ; une seule fois par session", async ({ page }) => {
    await page.goto("/");
    const loader = page.getByTestId("intro-loader");
    await expect(loader).toBeVisible();
    await expect(page.locator("html")).toHaveClass(/\bintro\b/);
    await expect(loader.locator(".flight-path__plane")).toHaveCSS("animation-name", "flight-loop");
    // La page est déjà rendue dessous et reste dans l'arbre d'accessibilité (l'écran est décoratif).
    await expect(page.getByRole("heading", { level: 1, name: HERO_TITLE })).toBeAttached();
    await expect(page.getByRole("region", { name: "Rechercher" })).toBeAttached();
    // Rien ne s'ouvre par-dessus l'écran.
    await expect(page.getByRole("dialog", { name: DIALOG })).toHaveCount(0);
    await expect(page.getByRole("region", { name: "Gestion des cookies" })).toHaveCount(0);

    // Fin automatique : après la durée minimale (1,5 s depuis la navigation), avant le plafond (2,5 s + fondu).
    await expect(loader).toBeHidden({ timeout: 5_000 });
    const endedAt = await page.evaluate(() => performance.now());
    expect(endedAt).toBeGreaterThan(1_500);
    expect(endedAt).toBeLessThan(3_600);
    await expect(page.locator("html")).not.toHaveClass(/\bintro\b/);

    // Ordre : la fenêtre de démonstration, puis seulement ensuite la bannière cookies.
    const dialog = page.getByRole("dialog", { name: DIALOG });
    await expect(dialog).toBeVisible();
    await expect(page.getByRole("region", { name: "Gestion des cookies" })).toHaveCount(0);
    await dialog.getByRole("button", { name: "Explorer la démo" }).click();
    await expect(page.getByRole("region", { name: "Gestion des cookies" })).toBeVisible();

    // L'image LCP reste l'affiche du hero, même sous l'écran d'accueil.
    const lcp = await page.evaluate(
      () =>
        new Promise<string>((resolve) => {
          new PerformanceObserver((list) => {
            const last = list.getEntries().at(-1) as (PerformanceEntry & { url?: string; element?: Element }) | undefined;
            resolve(last?.url || last?.element?.tagName || "");
          }).observe({ type: "largest-contentful-paint", buffered: true });
        }),
    );
    expect(lcp).toContain("cote-aerienne-poster");

    // Même session (même onglet) : ni au rechargement, ni sur une autre page.
    await dismissCookies(page);
    for (const path of ["/", "/vols"]) {
      await page.goto(path);
      await expect(page.locator("html")).not.toHaveClass(/\bintro\b/);
      await expect(page.getByTestId("intro-loader")).toBeHidden();
    }
  });

  test("mouvement réduit : aucun écran, la fenêtre de démonstration s'ouvre directement", async ({ browser }) => {
    const context = await browser.newContext({ reducedMotion: "reduce", storageState: { cookies: [], origins: [] } });
    const page = await context.newPage();
    await page.goto("/");
    await expect(page.locator("html")).not.toHaveClass(/\bintro\b/);
    await expect(page.getByTestId("intro-loader")).toBeHidden();
    await expect(page.getByRole("dialog", { name: DIALOG })).toBeVisible();
    expect(await page.evaluate(() => sessionStorage.getItem("nomadia:intro"))).toBeNull();
    await context.close();
  });
});

test("Échap ou un clic ferment l'écran tout de suite, sans activer la page dessous", async ({ context }) => {
  for (const how of ["Escape", "click"] as const) {
    // Nouvel onglet = nouvelle session d'onglet : l'écran s'affiche à nouveau.
    const page = await context.newPage();
    await page.goto("/", { waitUntil: "domcontentloaded" });
    const loader = page.getByTestId("intro-loader");
    await expect(loader).toBeVisible();
    if (how === "Escape") await page.keyboard.press("Escape");
    else await loader.click();
    await expect(loader, how).toBeHidden({ timeout: 1_500 });
    expect(await page.evaluate(() => performance.now()), how).toBeLessThan(1_500 + 420);
    expect(new URL(page.url()).pathname, how).toBe("/");
    await expect(page.getByRole("heading", { level: 1, name: HERO_TITLE })).toBeVisible();
    await page.close();
  }
});

test("stockage de session bloqué : aucun écran, aucune erreur", async ({ page }) => {
  const errors: string[] = [];
  page.on("pageerror", (e) => errors.push(e.message));
  await page.addInitScript(() => {
    Object.defineProperty(window, "sessionStorage", {
      configurable: true,
      get() {
        throw new DOMException("Stockage bloqué", "SecurityError");
      },
    });
  });
  await page.goto("/");
  await expect(page.locator("html")).not.toHaveClass(/\bintro\b/);
  await expect(page.getByTestId("intro-loader")).toBeHidden();
  await expect(page.getByRole("heading", { level: 1, name: HERO_TITLE })).toBeVisible();
  expect(errors).toEqual([]);
});
