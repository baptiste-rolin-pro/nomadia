import type { Page } from "@playwright/test";
import { expect, test } from "./fixtures";
import { frenchDay, inDays } from "./helpers";

/**
 * Serveur :3101 : ni ANTHROPIC_API_KEY ni modèle simulé (playwright.config.ts). L'assistant fonctionne quand même :
 * l'analyse locale (src/lib/assistant/parser) comprend la demande sur le serveur, sans aucun service extérieur.
 * Les dates sont écrites en toutes lettres à partir d'aujourd'hui (Europe/Paris) : le test reste valable toute l'année.
 */

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

async function ask(page: Page, text: string) {
  await page.getByLabel(/Décrivez votre voyage|Votre réponse/).fill(text);
  await page.keyboard.press("Enter");
}

test("API sans clé : disponible, sans repli, réponses de l'analyse locale (« local »), aide si non compris", async ({ request, baseURL }) => {
  expect(await (await request.get("/api/assistant")).json()).toEqual({ available: true, fallback: false });
  const headers = { origin: baseURL! };
  const flight = await request.post("/api/assistant", { data: { text: `Vol Paris–Rome du ${frenchDay(inDays(60))} au ${frenchDay(inDays(64))} pour 2` }, headers });
  expect(flight.status()).toBe(200);
  const body = (await flight.json()) as { status: string; engine: string; result: { type: string; actions: { href: string }[] } };
  expect(body).toMatchObject({ status: "ok", engine: "local", result: { type: "actions" } });
  expect(body.result.actions[0]!.href).toBe(`/vols?o=city%3APAR&d=city%3AROM&type=ar&dep=${inDays(60)}&ret=${inDays(64)}&adt=2`);
  const help = await request.post("/api/assistant", { data: { text: "Écris-moi un poème" }, headers });
  expect(await help.json()).toMatchObject({ status: "ok", engine: "local", result: { type: "help", examples: expect.arrayContaining([expect.any(String)]) } });
  // Réponse sans URL externe ni mention d'un service d'IA.
  expect(JSON.stringify(body)).not.toMatch(/https?:\/\/|Anthropic|Claude/);
});

test("vol : ce qui a été compris s'affiche sans mention d'IA, puis /vols s'ouvre avec les paramètres exacts", async ({ page }) => {
  const field = await openAssistant(page);
  await expect(page.getByTestId("assistant-intro")).toContainText("analysée par Nomadia, sans service extérieur");
  await expect(page.getByTestId("assistant-intro")).not.toContainText("Anthropic");
  await field.fill(`Vol Paris–Rome du ${frenchDay(inDays(60))} au ${frenchDay(inDays(64))} pour 2`);
  await page.getByRole("button", { name: "Demander à l'assistant" }).click();

  const result = page.getByTestId("assistant-resultat");
  await expect(result.getByRole("heading", { name: "Voici ce que j'ai compris" })).toBeVisible();
  await expect(result).toContainText("Vols Paris → Rome");
  await expect(result).toContainText("Voyageurs : 2 adultes");
  await expect(page.getByTestId("assistant-moteur")).toHaveCount(0);
  await expect(page).toHaveURL(`/vols?o=city%3APAR&d=city%3AROM&type=ar&dep=${inDays(60)}&ret=${inDays(64)}&adt=2`, { timeout: 15_000 });
  await expect(page.getByLabel("Aller", { exact: true })).toHaveValue(inDays(60));
});

test("hôtel : nuits et voyageurs compris, /hotels ouvert", async ({ page }) => {
  await openAssistant(page);
  await ask(page, `Hôtel à Lisbonne 3 nuits à partir du ${frenchDay(inDays(50))}, 2 adultes`);
  await expect(page.getByTestId("assistant-resultat")).toContainText("Hébergement à Lisbonne");
  await expect(page).toHaveURL(`/hotels?dest=city%3ALIS&arr=${inDays(50)}&dep=${inDays(53)}&ch=2`, { timeout: 15_000 });
});

test("voiture : âge du conducteur et heure de prise en charge compris, /voitures ouvert", async ({ page }) => {
  await openAssistant(page);
  await ask(page, `Louer une voiture à Reykjavik du ${frenchDay(inDays(40))} au ${frenchDay(inDays(44))}, j'ai 23 ans, prise à 10h`);
  const step = page.getByTestId("assistant-etape");
  await expect(step).toContainText("Conducteur : 23 ans");
  await expect(step).toContainText("Retour à 10 h 00 (heure non précisée)");
  await expect(page).toHaveURL(`/voitures?pu=city%3AREK&pud=${inDays(40)}&put=10%3A00&dod=${inDays(44)}&dot=10%3A00&age=23`, { timeout: 15_000 });
  await expect(page.getByLabel("Âge du conducteur principal")).toHaveValue("23");
});

test("plan vol + voiture : deux étapes, hypothèses signalées, une ouverture par étape", async ({ page }) => {
  await openAssistant(page);
  const dep = inDays(70);
  const ret = inDays(74);
  await ask(page, `Vol Paris–Rome le ${frenchDay(dep)}, retour le ${Number(ret.slice(8))}, avec une voiture sur place`);
  const steps = page.getByTestId("assistant-etape");
  await expect(page.getByRole("heading", { name: "Votre plan en 2 étapes" })).toBeVisible();
  await expect(steps.nth(0)).toContainText("Étape 1 · Vols Paris → Rome");
  await expect(steps.nth(0)).toContainText("1 adulte (nombre de voyageurs non précisé)");
  await expect(steps.nth(1)).toContainText("Étape 2 · Voiture à Rome (FCO)");
  await expect(steps.nth(1)).toContainText("Voiture prise à l'aéroport d'arrivée : Rome (FCO)");
  await expect(page.getByTestId("assistant-ouverture")).toHaveCount(0);
  await page.getByRole("link", { name: "Ouvrir l'étape 2" }).click();
  await expect(page).toHaveURL(`/voitures?pu=airport%3AFCO&pud=${dep}&put=12%3A00&dod=${ret}&dot=10%3A00&age=30`);
});

test("voyage organisé : une question à la fois, réponses réanalysées avec la demande, formulaire prérempli", async ({ page }) => {
  await openAssistant(page);
  const start = inDays(80);
  await ask(page, "Organise-moi 5 jours en Islande en famille");
  await expect(page.getByTestId("assistant-question")).toContainText("À partir de quelle date ?");
  await expect(page.getByLabel("Votre réponse")).toBeFocused();
  await ask(page, `à partir du ${frenchDay(start)}`);
  await expect(page.getByTestId("assistant-question")).toContainText("Combien d'adultes et d'enfants êtes-vous ?");
  await ask(page, "2 adultes et 2 enfants");
  await expect(page.getByTestId("assistant-resultat")).toContainText("Voyage à Reykjavik");
  const end = new Date(`${start}T12:00:00Z`);
  end.setUTCDate(end.getUTCDate() + 4);
  await expect(page).toHaveURL(`/voyage/nouveau?destination=reykjavik&debut=${start}&fin=${end.toISOString().slice(0, 10)}&adultes=2&enfants=2&origine=assistant`, { timeout: 15_000 });
  await expect(page.getByText("Formulaire prérempli par l'assistant")).toBeVisible();
  await expect(page.getByLabel("Adultes")).toHaveValue("2");
  await expect(page.getByLabel("Enfants")).toHaveValue("2");
});

test("non compris : exemples de formulations et accès aux onglets classiques", async ({ page }) => {
  await openAssistant(page);
  await ask(page, "Écris-moi un poème");
  const help = page.getByTestId("assistant-aide");
  await expect(help).toContainText("Je n'ai pas compris votre demande");
  await help.getByRole("button", { name: "Hôtel à Lisbonne 3 nuits à partir du 10 avril" }).click();
  await expect(page.getByLabel("Décrivez votre voyage")).toHaveValue("Hôtel à Lisbonne 3 nuits à partir du 10 avril");
  await expect(page.getByLabel("Décrivez votre voyage")).toBeFocused();
  await help.getByRole("button", { name: "Vols", exact: true }).click();
  await expect(page.getByRole("tab", { name: "Vols" })).toHaveAttribute("aria-selected", "true");
  await expect(page.getByRole("form", { name: "Recherche de vols" })).toBeVisible();
  await expect(page).toHaveURL("/");
});
