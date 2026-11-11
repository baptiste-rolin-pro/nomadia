import { expect, test } from "./fixtures";
import { DEMO_ADMIN, DEMO_USER, dismissCookies, inDays, login } from "./helpers";

/**
 * Serveur « demo-publique » : configuration du déploiement Vercel (NOMADIA_PUBLIC_SIGNUP=false, pas de boîte
 * mail de test). Aucune donnée personnelle n'est demandée : comptes de démonstration partagés, inscription et
 * réinitialisation fermées côté serveur, avertissements visibles, adresses fictives imposées.
 */

test("connexion : avertissement, identifiants de démonstration affichés et utilisables en un clic", async ({ page }) => {
  await page.goto("/connexion");
  await dismissCookies(page);
  // Plus de bandeau sur toutes les pages (remplacé par la fenêtre « À propos de la démo ») ; l'avertissement du formulaire reste.
  await expect(page.getByRole("note")).toHaveCount(0);
  await expect(page.getByText("Site de démonstration : comptes partagés")).toBeVisible();
  await expect(page.getByText(/n'indiquez aucune donnée personnelle réelle/)).toBeVisible();
  const accounts = page.getByTestId("demo-account");
  await expect(accounts).toHaveCount(2);
  await expect(accounts.first()).toContainText(DEMO_USER.email);
  await expect(accounts.first()).toContainText(DEMO_USER.password);
  await expect(accounts.nth(1)).toContainText(DEMO_ADMIN.email);
  await expect(page.getByRole("link", { name: "Créer un compte" })).toHaveCount(0);
  await expect(page.getByRole("link", { name: "Mot de passe oublié ?" })).toHaveCount(0);
  await page.getByRole("button", { name: "Utiliser le compte voyageur" }).click();
  await expect(page.getByLabel("Adresse email")).toHaveValue(DEMO_USER.email);
  await page.getByRole("button", { name: "Se connecter" }).click();
  await expect(page).toHaveURL(/\/compte/);
});

test("inscription et réinitialisation : explication à la place des formulaires", async ({ page }) => {
  for (const path of ["/inscription", "/mot-de-passe-oublie", "/reinitialiser-mot-de-passe?token=abc"]) {
    await page.goto(path);
    await dismissCookies(page);
    await expect(page.getByTestId("demo-closed"), path).toBeVisible();
    await expect(page.locator("main input[type=email], main input[type=password]"), path).toHaveCount(0);
  }
});

test("API d'authentification : inscription, réinitialisation et changement de mot de passe refusés côté serveur", async ({ request, baseURL }) => {
  const headers = { origin: baseURL! };
  const email = `vraie-personne-${Date.now()}@gmail.com`;
  const signUp = await request.post("/api/auth/sign-up/email", { data: { name: "Vraie Personne", email, password: "phrase-de-passe-e2e" }, headers });
  expect(signUp.status()).toBe(404);
  expect((await request.post("/api/auth/request-password-reset", { data: { email: DEMO_USER.email, redirectTo: "/reinitialiser-mot-de-passe" }, headers })).status()).toBe(404);
  expect((await request.get("/api/auth/reset-password/jeton-invente?callbackURL=%2F", { headers, maxRedirects: 0 })).status()).toBe(403);
  // Le compte n'a pas été créé.
  expect((await request.post("/api/auth/sign-in/email", { data: { email, password: "phrase-de-passe-e2e" }, headers })).status()).toBe(401);
  // Compte partagé : mot de passe non modifiable, même connecté.
  const signIn = await request.post("/api/auth/sign-in/email", { data: { email: DEMO_USER.email, password: DEMO_USER.password }, headers });
  expect(signIn.status()).toBe(200);
  expect((await request.post("/api/auth/change-password", { data: { currentPassword: DEMO_USER.password, newPassword: "autre-phrase-e2e-01" }, headers })).status()).toBe(404);
  expect((await request.post("/api/auth/update-user", { data: { name: "Vrai Nom" }, headers })).status()).toBe(404);
});

test("profil et contact : compte partagé non modifiable, formulaire de contact fermé", async ({ page }) => {
  await login(page);
  await page.goto("/compte/profil");
  await expect(page.getByText("Compte de démonstration partagé")).toBeVisible();
  await expect(page.getByLabel("Nom affiché")).toHaveCount(0);
  await expect(page.getByRole("button", { name: "Ajouter le voyageur" })).toHaveCount(0);
  await page.goto("/contact");
  await expect(page.getByText("Formulaire de contact désactivé")).toBeVisible();
  await expect(page.getByRole("button", { name: "Envoyer" })).toHaveCount(0);
});

test("réservation de démonstration : avertissement, email réel refusé, adresse fictive acceptée, billets émis", async ({ page }) => {
  await login(page);
  await page.goto(`/vols?o=airport:CDG&d=airport:LIS&type=ar&dep=${inDays(42)}&ret=${inDays(46)}&adt=1`);
  await dismissCookies(page);
  await page.locator("section[aria-label='Résultats de vols'] article").first().getByRole("link", { name: /Voir le détail/ }).click();
  await page.getByRole("button", { name: "Réserver cette offre" }).click();
  await expect(page).toHaveURL(/\/reservation\/bkg_/);
  await expect(page.getByText("Démonstration : n'entrez aucune donnée personnelle réelle")).toBeVisible();
  await expect(page.getByRole("checkbox", { name: /J'accepte que ces voyageurs/ })).toHaveCount(0);
  await page.getByRole("textbox", { name: "Prénom" }).fill("Camille");
  await page.getByRole("textbox", { name: "Nom", exact: true }).fill("Durand");
  await page.getByRole("textbox", { name: "Date de naissance" }).fill("1991-05-04");
  await page.getByLabel("Email de contact pour la confirmation").fill("camille.durand@gmail.com");
  await page.getByRole("button", { name: "Continuer vers les options" }).click();
  await expect(page.getByText(/utilisez une adresse fictive/)).toBeVisible();
  await page.getByLabel("Email de contact pour la confirmation").fill("camille@exemple.test");
  await page.getByRole("button", { name: "Continuer vers les options" }).click();
  await page.getByRole("button", { name: "Continuer vers la vérification" }).click();
  await page.getByRole("checkbox", { name: /J'ai lu les conditions/ }).check();
  await page.getByRole("button", { name: "Valider et vérifier le prix" }).click();
  await page.getByTestId("pay-button").click();
  await expect(page.getByRole("heading", { name: "Suivi de la réservation" })).toBeVisible();
  // Progression par rafraîchissements de la page (aucun processus de fond), comme sur Vercel.
  await expect(page.getByText(/Billets émis/).first()).toBeVisible({ timeout: 30_000 });
});
