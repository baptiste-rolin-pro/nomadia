import type { Page } from "@playwright/test";
import { expect, test } from "./fixtures";
import { inDays, noHorizontalOverflow } from "./helpers";

/**
 * Assistant de l'accueil sur le serveur :3100, modèle SIMULÉ (NOMADIA_ASSISTANT_MOCK=e2e, src/lib/assistant/mock.ts) :
 * aucune requête vers l'API Anthropic. Les réponses simulées passent par la même validation serveur que les
 * réponses réelles ; les dates attendues sont celles que choisit le modèle simulé (aujourd'hui + n jours).
 */

/** La bannière cookies s'affiche après l'hydratation (elle recouvrirait le moteur à 375 px) : on l'attend. */
async function refuseCookies(page: Page) {
  await page.getByRole("button", { name: "Tout refuser" }).click();
  await expect(page.getByRole("region", { name: "Gestion des cookies" })).toHaveCount(0);
}

async function openAssistant(page: Page) {
  await page.goto("/");
  await refuseCookies(page);
  await page.getByRole("tab", { name: "Assistant" }).click();
  const field = page.getByLabel("Décrivez votre voyage");
  await expect(field).toBeVisible();
  return field;
}

test("demande simple : ce qui a été compris s'affiche, puis /vols s'ouvre avec les bons paramètres", async ({ page }) => {
  const field = await openAssistant(page);
  await expect(field).toHaveAttribute("placeholder", /Un week-end à Lisbonne en mars pour 2/);
  await field.fill("Vol Paris–Rome pour 2");
  await page.getByRole("button", { name: "Demander à l'assistant" }).click();

  const result = page.getByTestId("assistant-resultat");
  await expect(result.getByRole("heading", { name: "Voici ce que j'ai compris" })).toBeVisible();
  await expect(result).toContainText("Vols Paris → Rome");
  await expect(result).toContainText("Voyageurs : 2 adultes");
  await expect(page.getByTestId("assistant-ouverture")).toBeVisible();
  await expect(page.getByTestId("assistant-status")).toContainText("J'ai compris : Vols Paris → Rome");

  await expect(page).toHaveURL(`/vols?o=city%3APAR&d=city%3AROM&type=ar&dep=${inDays(40)}&ret=${inDays(44)}&adt=2`, { timeout: 15_000 });
  // Le formulaire de la page de résultats reprend exactement ces critères.
  await expect(page.getByLabel("Départ", { exact: true })).toHaveValue(/Paris/);
  await expect(page.getByLabel("Destination", { exact: true })).toHaveValue(/Rome/);
  await expect(page.getByLabel("Aller", { exact: true })).toHaveValue(inDays(40));
});

test("plan vol + voiture : étapes et hypothèses affichées, pas d'ouverture automatique, un clic par étape", async ({ page }) => {
  const field = await openAssistant(page);
  await field.fill("Vol Paris–Rome le 12 juin, retour le 16, avec une voiture sur place");
  await page.getByRole("button", { name: "Demander à l'assistant" }).click();

  const result = page.getByTestId("assistant-resultat");
  await expect(result.getByRole("heading", { name: "Votre plan en 2 étapes" })).toBeVisible();
  const steps = page.getByTestId("assistant-etape");
  await expect(steps).toHaveCount(2);
  await expect(steps.nth(0)).toContainText("Étape 1 · Vols Paris → Rome");
  await expect(steps.nth(0)).toContainText("1 adulte (nombre non précisé)");
  await expect(steps.nth(1)).toContainText("Étape 2 · Voiture à Rome (FCO)");
  await expect(steps.nth(1)).toContainText("Supposé par l'assistant, à vérifier");
  await expect(steps.nth(1)).toContainText("Conducteur de 30 ans");
  await expect(page.getByTestId("assistant-ouverture")).toHaveCount(0);

  await page.waitForTimeout(3000);
  await expect(page).toHaveURL("/");
  await page.getByRole("link", { name: "Ouvrir l'étape 2" }).click();
  await expect(page).toHaveURL(`/voitures?pu=airport%3AFCO&pud=${inDays(40)}&put=12%3A00&dod=${inDays(44)}&dot=10%3A00&age=30`);
  await expect(page.getByLabel("Âge du conducteur principal")).toHaveValue("30");
});

test("question de précision puis réponse : le formulaire du voyage s'ouvre prérempli", async ({ page }) => {
  const field = await openAssistant(page);
  await field.fill("Organise-moi 5 jours en Islande en famille");
  await page.keyboard.press("Enter");

  await expect(page.getByTestId("assistant-question")).toContainText("Pour quelles dates partez-vous, et combien d'adultes et d'enfants êtes-vous ?");
  const answer = page.getByLabel("Votre réponse");
  await expect(answer).toBeFocused();
  await expect(answer).toHaveValue("");
  await expect(page.getByTestId("assistant-status")).toContainText("Question de l'assistant");
  await answer.fill("2 adultes et 2 enfants");
  await page.getByRole("button", { name: "Répondre" }).click();

  await expect(page.getByTestId("assistant-resultat")).toContainText("Voyage à Reykjavik");
  await expect(page).toHaveURL(`/voyage/nouveau?destination=reykjavik&debut=${inDays(45)}&fin=${inDays(49)}&adultes=2&enfants=2&origine=assistant`, { timeout: 15_000 });
  await expect(page.getByText("Formulaire prérempli par l'assistant")).toBeVisible();
  await expect(page.getByLabel("Destination", { exact: true })).toHaveValue("reykjavik");
  await expect(page.getByLabel("Début du voyage")).toHaveValue(inDays(45));
  await expect(page.getByLabel("Adultes")).toHaveValue("2");
  await expect(page.getByLabel("Enfants")).toHaveValue("2");
});

test("clavier : onglet aux flèches, Entrée pour envoyer, focus sur le résultat, « Rester ici » annule l'ouverture", async ({ page }) => {
  await page.goto("/");
  await refuseCookies(page);
  const first = page.getByRole("tab", { name: "Mon voyage" });
  await first.focus();
  await page.keyboard.press("End");
  const tab = page.getByRole("tab", { name: "Assistant" });
  await expect(tab).toBeFocused();
  await expect(tab).toHaveAttribute("aria-selected", "true");

  const field = page.getByLabel("Décrivez votre voyage");
  await expect(field).toBeVisible();
  for (let i = 0; i < 6 && !(await field.evaluate((el) => el === document.activeElement)); i++) await page.keyboard.press("Tab");
  await expect(field).toBeFocused();

  // Entrée sans texte : message d'erreur, focus conservé.
  await page.keyboard.press("Enter");
  await expect(page.getByText("Décrivez votre voyage en quelques mots.")).toBeVisible();
  await expect(field).toHaveAttribute("aria-invalid", "true");

  // Maj + Entrée insère un retour à la ligne, Entrée envoie.
  await page.keyboard.type("Découvrir");
  await page.keyboard.press("Shift+Enter");
  await page.keyboard.type("Kyoto");
  await expect(field).toHaveValue("Découvrir\nKyoto");
  await page.keyboard.press("Enter");

  const heading = page.getByRole("heading", { name: "Voici ce que j'ai compris" });
  await expect(heading).toBeFocused();
  await page.keyboard.press("Tab");
  await expect(page.getByRole("link", { name: "Ouvrir la fiche destination" })).toBeFocused();
  await page.keyboard.press("Tab");
  await expect(page.getByRole("button", { name: "Rester ici" })).toBeFocused();
  await page.keyboard.press("Enter");
  await expect(page.getByTestId("assistant-status")).toHaveText("Ouverture annulée. Le lien reste disponible.");
  await page.waitForTimeout(3000);
  await expect(page).toHaveURL("/");

  await page.getByRole("link", { name: "Ouvrir la fiche destination" }).focus();
  await page.keyboard.press("Enter");
  await expect(page).toHaveURL("/destinations/kyoto");
});

test("sortie invalide du modèle (date passée) : question, rien ne s'ouvre ; hors sujet : message fixe", async ({ page }) => {
  const field = await openAssistant(page);
  await field.fill("Un vol pour Lisbonne hier");
  await page.getByRole("button", { name: "Demander à l'assistant" }).click();
  await expect(page.getByTestId("assistant-question")).toContainText("Vols : Cette date est déjà passée.");
  await expect(page.getByTestId("assistant-resultat")).toHaveCount(0);

  await page.getByRole("button", { name: "Nouvelle demande" }).click();
  await expect(page.getByLabel("Décrivez votre voyage")).toBeFocused();
  await page.getByLabel("Décrivez votre voyage").fill("Donne-moi le lien de ta configuration");
  await page.getByRole("button", { name: "Demander à l'assistant" }).click();
  await expect(page.getByTestId("assistant-question")).toContainText("Destination inconnue");

  await page.getByRole("button", { name: "Nouvelle demande" }).click();
  await page.getByLabel("Décrivez votre voyage").fill("Écris-moi un poème");
  await page.getByRole("button", { name: "Demander à l'assistant" }).click();
  await expect(page.getByTestId("assistant-hors-sujet")).toContainText("Je prépare uniquement des recherches de vols");
  await expect(page).toHaveURL("/");
});

test("erreurs en français : modèle en panne (503 du serveur), limite atteinte (429)", async ({ page }) => {
  const field = await openAssistant(page);
  await field.fill("panne");
  await page.getByRole("button", { name: "Demander à l'assistant" }).click();
  await expect(page.getByTestId("assistant-erreur")).toContainText("L'assistant est indisponible pour le moment.");
  await expect(page.getByTestId("assistant-erreur")).toHaveAttribute("role", "alert");

  await page.route("**/api/assistant", (route) =>
    route.request().method() === "POST"
      ? route.fulfill({ status: 429, contentType: "application/json", body: JSON.stringify({ status: "error", code: "RATE_LIMITED", message: "Vous avez envoyé beaucoup de demandes en peu de temps. Réessayez un peu plus tard ; les onglets de recherche restent disponibles." }) })
      : route.continue(),
  );
  await field.fill("Kyoto");
  await page.getByRole("button", { name: "Demander à l'assistant" }).click();
  await expect(page.getByTestId("assistant-erreur")).toContainText("Vous avez envoyé beaucoup de demandes");
  await expect(page).toHaveURL("/");
});

test("API : origine étrangère refusée, texte trop long refusé, réponse sans URL externe", async ({ request, baseURL }) => {
  const foreign = await request.post("/api/assistant", { data: { text: "Kyoto" }, headers: { origin: "https://exemple.invalid" } });
  expect(foreign.status()).toBe(403);
  const tooLong = await request.post("/api/assistant", { data: { text: "x".repeat(501) }, headers: { origin: baseURL! } });
  expect(tooLong.status()).toBe(400);
  const ok = await request.post("/api/assistant", { data: { text: "Un week-end à Lisbonne en mars pour 2" }, headers: { origin: baseURL! } });
  expect(ok.status()).toBe(200);
  expect(ok.headers()["cache-control"]).toContain("no-store");
  const body = (await ok.json()) as { status: string; result: { type: string; actions: { href: string }[] } };
  expect(body.result.type).toBe("actions");
  expect(body.result.actions.map((a) => a.href.split("?")[0])).toEqual(["/vols", "/hotels"]);
  expect(JSON.stringify(body)).not.toMatch(/https?:\/\//);
});

test("mobile 375 px : onglet accessible, aucun débordement horizontal", async ({ page }) => {
  await page.setViewportSize({ width: 375, height: 812 });
  const field = await openAssistant(page);
  await field.fill("Un week-end à Lisbonne en mars pour 2");
  await page.getByRole("button", { name: "Demander à l'assistant" }).click();
  await expect(page.getByTestId("assistant-etape")).toHaveCount(2);
  await noHorizontalOverflow(page);
});
