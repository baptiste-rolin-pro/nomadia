import { expect, test } from "./fixtures";
import { dismissCookies, login } from "./helpers";

/** Serveur « inscription-ouverte » (NOMADIA_PUBLIC_SIGNUP=true, boîte mail de test) : parcours complet conservé. */
test("inscription, vérification d'adresse, déconnexion et reconnexion", async ({ page }) => {
  const email = `test-${Date.now()}@exemple.test`;
  await page.goto("/inscription");
  await dismissCookies(page);
  await page.getByLabel("Prénom ou nom").fill("Testeur E2E");
  await page.getByLabel("Adresse email").fill(email);
  await page.getByLabel("Mot de passe", { exact: true }).fill("phrase-de-passe-e2e");
  await page.getByLabel("Confirmer le mot de passe").fill("phrase-de-passe-e2e");
  await page.getByRole("button", { name: "Créer mon compte" }).click();
  await expect(page.getByText("Vérifiez votre adresse email")).toBeVisible();

  // Connexion refusée tant que l'adresse n'est pas vérifiée.
  await page.goto("/connexion");
  await expect(page.getByTestId("demo-account")).toHaveCount(0);
  await page.getByLabel("Adresse email").fill(email);
  await page.getByLabel("Mot de passe").fill("phrase-de-passe-e2e");
  await page.getByRole("button", { name: "Se connecter" }).click();
  await expect(page.getByText(/pas encore confirmée/)).toBeVisible();

  await page.goto("/dev/boite-mail");
  const mail = page.getByTestId("captured-email").filter({ hasText: email }).filter({ hasText: "confirmez votre adresse" }).last(); // le plus ancien : email d'inscription
  const href = await mail.getByRole("link").first().getAttribute("href");
  expect(href).toContain("verify-email");
  await page.goto(href!);
  await expect(page.getByRole("heading", { name: "Adresse confirmée" })).toBeVisible();
  await page.goto("/compte");
  await expect(page.getByRole("heading", { name: /Bonjour Testeur E2E/ })).toBeVisible();
  await page.getByRole("button", { name: "Se déconnecter" }).click();
  await expect(page).toHaveURL("/");
  await page.goto("/compte");
  await expect(page).toHaveURL(/\/connexion\?retour=/);
  await login(page, { email, password: "phrase-de-passe-e2e" });
});
