import { expect, test } from "./fixtures";
import { dismissCookies } from "./helpers";

/**
 * Fenêtre « À propos de la démo » (remplace le bandeau) : première visite, accessibilité (focus piégé, Échap,
 * retour du focus), mémorisation par navigateur, réouverture, ordre avec la bannière cookies, stockage bloqué.
 * Navigateur vierge : la configuration marque sinon la fenêtre comme déjà vue.
 */
test.use({ storageState: { cookies: [], origins: [] } });

const NAME = "Bienvenue sur la démo de Nomadia";

test("première visite : fenêtre accessible, puis bannière cookies, choix mémorisé", async ({ page }) => {
  await page.goto("/");
  const dialog = page.getByRole("dialog", { name: NAME });
  await expect(dialog).toBeVisible();
  await expect(page.getByRole("note")).toHaveCount(0);
  for (const text of ["Aucune réservation ni aucun paiement réel", "Prix et prestataires fictifs", "Comptes de démonstration partagés", "Aucune donnée personnelle réelle"]) {
    await expect(dialog).toContainText(text);
  }
  // Jamais en même temps que la bannière cookies.
  await expect(page.getByRole("region", { name: "Gestion des cookies" })).toHaveCount(0);

  // Focus initial sur l'action principale ; Tab et Maj+Tab restent dans la fenêtre.
  const primary = dialog.getByRole("button", { name: "Explorer la démo" });
  await expect(primary).toBeFocused();
  await page.keyboard.press("Tab");
  await expect(dialog.getByRole("button", { name: "Fermer" })).toBeFocused();
  await page.keyboard.press("Shift+Tab");
  await expect(primary).toBeFocused();

  // Échap ferme ; la bannière cookies prend le relais.
  await page.keyboard.press("Escape");
  await expect(dialog).toBeHidden();
  await expect(page.getByRole("region", { name: "Gestion des cookies" })).toBeVisible();

  // Rechargement et autre page : la bannière cookies (choix non fait) s'affiche, pas la fenêtre.
  for (const path of ["/", "/vols"]) {
    await page.goto(path);
    await expect(page.getByRole("region", { name: "Gestion des cookies" })).toBeVisible();
    await expect(page.getByRole("dialog", { name: NAME })).toHaveCount(0);
  }
});

test("bouton « Démo » de l'en-tête et du pied de page : réouverture, fermeture, retour du focus", async ({ page }) => {
  await page.goto("/hotels");
  const dialog = page.getByRole("dialog", { name: NAME });
  await dialog.getByRole("button", { name: "Explorer la démo" }).click();
  await expect(dialog).toBeHidden();
  await dismissCookies(page);

  const header = page.getByRole("button", { name: /^Démo/ });
  await header.click();
  await expect(dialog).toBeVisible();
  await dialog.getByRole("button", { name: "Fermer" }).click();
  await expect(dialog).toBeHidden();
  await expect(header).toBeFocused();

  const footer = page.getByRole("button", { name: "À propos de la démo" });
  await footer.click();
  await expect(dialog).toBeVisible();
  await page.keyboard.press("Escape");
  await expect(dialog).toBeHidden();
  await expect(footer).toBeFocused();

  // Le lien vers les comptes de démonstration ferme la fenêtre et mène à la connexion.
  await header.click();
  await dialog.getByRole("link", { name: "Voir les comptes de démo" }).click();
  await expect(page).toHaveURL(/\/connexion/);
  await expect(page.getByRole("dialog", { name: NAME })).toHaveCount(0);
  await expect(page.getByTestId("demo-account").first()).toBeVisible();
});

test("stockage du navigateur bloqué : la fenêtre se ferme quand même, sans erreur", async ({ page }) => {
  const errors: string[] = [];
  page.on("pageerror", (e) => errors.push(e.message));
  await page.addInitScript(() => {
    Object.defineProperty(window, "localStorage", {
      configurable: true,
      get() {
        throw new DOMException("Stockage bloqué", "SecurityError");
      },
    });
  });
  await page.goto("/");
  const dialog = page.getByRole("dialog", { name: NAME });
  await expect(dialog).toBeVisible();
  await dialog.getByRole("button", { name: "Explorer la démo" }).click();
  await expect(dialog).toBeHidden();
  await dismissCookies(page);
  // Navigation côté client : la fermeture reste mémorisée pour la session de la page.
  await page.getByRole("navigation", { name: "Navigation principale" }).getByRole("link", { name: "Vols" }).click();
  await expect(page).toHaveURL(/\/vols$/);
  await expect(page.getByRole("heading", { level: 1, name: "Vols" })).toBeVisible();
  await expect(page.getByRole("dialog", { name: NAME })).toHaveCount(0);
  expect(errors).toEqual([]);
});
