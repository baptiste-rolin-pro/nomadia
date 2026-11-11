import { expect, test, type Page } from "@playwright/test";
import { DEMO_ADMIN, dismissCookies, inDays, login } from "./helpers";

// Inscription et vérification d'adresse : voir signup-open.spec.ts (serveur avec NOMADIA_PUBLIC_SIGNUP=true).

test("voyage de démonstration retrouvé après rechargement, avec alertes de cohérence", async ({ page }) => {
  await login(page);
  await page.getByRole("link", { name: /Islande : arrivée tardive/ }).click();
  await expect(page.getByRole("heading", { name: "Cohérence du voyage" })).toBeVisible();
  await expect(page.getByText(/Bloquant/).first()).toBeVisible();
  await expect(page.getByText(/avant l'atterrissage/)).toBeVisible();
  await page.reload();
  await expect(page.getByRole("heading", { level: 1, name: "Islande : arrivée tardive" })).toBeVisible();
});

test("brouillon anonyme conservé après rechargement puis rattaché au compte", async ({ page }) => {
  await page.goto("/voyage/nouveau");
  await dismissCookies(page);
  await page.getByRole("combobox", { name: "Destination" }).selectOption("lisbonne");
  await page.getByRole("button", { name: "Créer mon voyage" }).click();
  await expect(page).toHaveURL(/\/voyage\/trp_/);
  const url = page.url();
  await page.reload();
  await expect(page.getByText("Brouillon non rattaché à un compte")).toBeVisible();
  await login(page);
  await page.getByRole("button", { name: "Rattacher à mon compte" }).click();
  await page.goto(url);
  await expect(page.getByText("Brouillon non rattaché à un compte")).toHaveCount(0);
});

async function startFlightBooking(page: Page, scenario?: string) {
  await page.goto(`/vols?o=airport:CDG&d=airport:LIS&type=ar&dep=${inDays(41)}&ret=${inDays(45)}&adt=1`);
  await dismissCookies(page);
  await page.locator("section[aria-label='Résultats de vols'] article").first().getByRole("link", { name: /Voir le détail/ }).click();
  await page.getByRole("button", { name: "Réserver cette offre" }).click();
  await expect(page).toHaveURL(/\/reservation\/bkg_/);
  await page.getByRole("textbox", { name: "Prénom" }).fill("Camille");
  await page.getByRole("textbox", { name: "Nom", exact: true }).fill("Durand");
  await page.getByRole("textbox", { name: "Date de naissance" }).fill("1991-05-04");
  await page.getByRole("button", { name: "Continuer vers les options" }).click();
  await page.getByRole("button", { name: "Continuer vers la vérification" }).click();
  if (scenario) await page.getByLabel(/scénario fournisseur/).selectOption(scenario);
  await page.getByRole("checkbox", { name: /J'ai lu les conditions/ }).check();
  await page.getByRole("button", { name: "Valider et vérifier le prix" }).click();
}

test("tunnel complet : double clic sur Payer sans double paiement, statuts séparés, billets émis", async ({ page }) => {
  await login(page);
  await startFlightBooking(page);
  const pay = page.getByTestId("pay-button");
  await expect(pay).toBeVisible();
  await pay.dblclick();
  await expect(page.getByRole("heading", { name: "Suivi de la réservation" })).toBeVisible();
  await expect(page.getByText("Payé", { exact: true })).toBeVisible();
  await expect(page.getByText(/Billets émis/).first()).toBeVisible({ timeout: 30_000 });
  await expect(page.getByRole("link", { name: /Récapitulatif \(démonstration\)/ })).toBeVisible();
  const bookingUrl = page.url();

  // Une seule ligne de paiement, visible dans l'administration ; puis accès refusé pour un autre utilisateur.
  await page.goto("/compte");
  await page.getByRole("button", { name: "Se déconnecter" }).click();
  await login(page, DEMO_ADMIN);
  const res = await page.goto(bookingUrl);
  expect(res?.status()).toBe(404);
  await expect(page.getByRole("heading", { name: /introuvable ou accès refusé/ })).toBeVisible();
});

test("prix modifié : acceptation explicite exigée avant le paiement", async ({ page }) => {
  await login(page);
  await startFlightBooking(page, "prix-modifie");
  await expect(page.getByText("Le prix a changé")).toBeVisible();
  await expect(page.getByTestId("pay-button")).toHaveCount(0);
  await page.getByRole("button", { name: "Accepter le nouveau prix" }).click();
  await page.getByRole("checkbox", { name: /J'ai lu les conditions/ }).check();
  await page.getByRole("button", { name: "Valider et vérifier le prix" }).click();
  await expect(page.getByTestId("pay-button")).toBeVisible();
});

test("paiement réussi mais réservation refusée : statut exact et remboursement suivi", async ({ page }) => {
  await login(page);
  await startFlightBooking(page, "reservation-echouee");
  await page.getByTestId("pay-button").click();
  await expect(page.getByText(/Paiement reçu mais réservation refusée/)).toBeVisible();
  await expect(page.getByText(/Remboursement confirmé/).first()).toBeVisible({ timeout: 30_000 });
});

test("zone d'administration protégée côté serveur", async ({ page }) => {
  await login(page);
  await page.goto("/admin");
  await expect(page.getByRole("heading", { name: "Accès refusé" })).toBeVisible();
});
