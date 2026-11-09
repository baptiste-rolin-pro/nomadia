import { expect, test } from "@playwright/test";
import { dismissCookies, inDays } from "./helpers";

test("vols : recherche, filtre, détail puis retour avec critères conservés", async ({ page }) => {
  const dep = inDays(40);
  const ret = inDays(44);
  await page.goto(`/vols?o=city:PAR&d=city:LIS&type=ar&dep=${dep}&ret=${ret}&adt=2`);
  await dismissCookies(page);
  await expect(page.getByRole("status").filter({ hasText: /offres?/ }).first()).toContainText(/\d+ offres/);
  await page.getByLabel("Vols directs uniquement").click();
  await expect(page.getByLabel("Vols directs uniquement")).toBeChecked();
  await expect(page).toHaveURL(/escales=0/);
  await expect(page.getByText("Direct").first()).toBeVisible();
  const cards = page.locator("section[aria-label='Résultats de vols'] article");
  await expect(cards.first()).toBeVisible();
  await expect(page.locator("section[aria-label='Résultats de vols'] article", { hasText: /escale/ })).toHaveCount(0);
  await cards.first().getByRole("link", { name: /Voir le détail/ }).click();
  await expect(page.getByRole("heading", { name: "Tarif, bagages et conditions" })).toBeVisible();
  await expect(page.getByText(/Opéré par/).first()).toBeVisible();
  await page.goBack();
  await expect(page).toHaveURL(/escales=0/);
  await expect(page.getByLabel("Vols directs uniquement")).toBeChecked();
  await expect(page.getByLabel("Aller", { exact: true })).toHaveValue(dep);
});

test("vols : validation des dates côté client et côté serveur", async ({ page, request }) => {
  await page.goto("/vols");
  await dismissCookies(page);
  await page.getByRole("combobox", { name: "Destination" }).fill("Lisbonne");
  await page.getByRole("option", { name: /Lisbonne, Portugal/ }).first().click();
  await page.getByLabel("Aller", { exact: true }).fill(inDays(20));
  await page.getByLabel("Retour", { exact: true }).fill(inDays(10));
  await page.getByRole("button", { name: "Rechercher des vols" }).click();
  await expect(page.getByText("Le retour ne peut pas précéder l'aller.")).toBeVisible();
  const res = await request.get(`/api/search/flights?o=city:PAR&d=city:LIS&type=as&dep=2020-01-01&adt=1`);
  expect(res.status()).toBe(400);
});

test("vols : états « aucune offre » et « fournisseur indisponible » sans offres de remplacement", async ({ page }) => {
  const base = `/vols?o=city:PAR&d=city:LIS&type=as&dep=${inDays(30)}&adt=1`;
  await page.goto(`${base}&scenario=aucune-offre`);
  await dismissCookies(page);
  await expect(page.getByText("Aucune offre pour ces critères")).toBeVisible();
  await page.goto(`${base}&scenario=indisponible`);
  await expect(page.getByRole("alert").filter({ hasText: "Fournisseur indisponible" })).toBeVisible();
  await expect(page.locator("section[aria-label='Résultats de vols'] article")).toHaveCount(0);
});

test("hôtels : prix total, par nuit, sur place, puis chambre et tarif précis", async ({ page }) => {
  await page.goto(`/hotels?dest=city:ROM&arr=${inDays(60)}&dep=${inDays(64)}&ch=2-7`);
  await dismissCookies(page);
  const card = page.locator("section[aria-label=\"Résultats d'hébergements\"] article").first();
  await expect(card).toContainText("Établissement fictif");
  await expect(card).toContainText("/ nuit / chambre");
  await page.getByRole("button", { name: "Afficher le plan" }).click();
  await expect(page.getByRole("img", { name: /Plan schématique/ })).toBeVisible();
  await card.getByRole("link", { name: /Voir les chambres/ }).click();
  await expect(page.getByRole("heading", { name: "Chambres et tarifs" })).toBeVisible();
  await expect(page.getByText(/Annulation gratuite jusqu'au .* \(heure locale, Europe\/Rome\)/).first()).toBeVisible();
  await expect(page.getByRole("button", { name: "Choisir ce tarif" }).first()).toBeVisible();
});

test("voitures : agence fermée à l'arrivée tardive, correction proposée sans être appliquée", async ({ page }) => {
  const d = inDays(75);
  await page.goto(`/voitures?pu=airport:KEF&pud=${d}&put=23:55&dod=${inDays(80)}&dot=10:00&age=30`);
  await dismissCookies(page);
  await expect(page.getByText(/agences fermées à l'heure choisie/)).toBeVisible();
  const card = page.locator("section[aria-label='Résultats de location'] article").first();
  await expect(card).toContainText("Non réservable en l'état");
  await expect(card).toContainText("modèle non garanti");
  await expect(page).toHaveURL(/put=23%3A55|put=23:55/);
  await card.getByRole("link", { name: /Corriger l'horaire/ }).click();
  await expect(page).toHaveURL(/put=0[67]%3A00|put=0[67]:00/);
});
