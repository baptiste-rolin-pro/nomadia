import type { Page } from "@playwright/test";
import { expect, test } from "./fixtures";
import { dismissCookies, inDays, login } from "./helpers";

/**
 * Offres simulées avec de vraies marques :
 * - une seule mention discrète au-dessus des résultats (vols, hébergements, voitures), en français et en anglais ;
 * - billets : nom réel de la compagnie ou du loueur, aucune étiquette « fictif » / « démo » ;
 * - documents émis (confirmation, récapitulatif imprimable, version imprimable du voyage) : mention
 *   « DÉMONSTRATION – document sans valeur, aucune réservation réelle ».
 */

const NOTE = {
  fr: "Offres simulées : horaires, prix et disponibilités sont fictifs. Aucun lien avec les compagnies, loueurs et marques cités.",
  en: "Simulated offers: schedules, prices and availability are fictitious. No connection with the airlines, rental companies and brands mentioned.",
};
const MARKER = {
  fr: "DÉMONSTRATION – document sans valeur, aucune réservation réelle",
  en: "DEMONSTRATION – document with no value, no real booking",
};
// Compagnies possibles sur Paris → Lisbonne (vols directs relevés, correspondances via Madrid, partage de code AF/KL).
const PARIS_LISBON_AIRLINES = /Air France|Ryanair|TAP Air Portugal|KLM|Iberia|easyJet/;
const LISBON_RENTERS = /Budget|Centauro/;
// Étiquettes par offre retirées (les mentions globales « démonstration », « montants fictifs » restent ailleurs).
const TAGS = /[Cc]ompagnie fictive|[Éé]tablissement fictif|[Oo]ffre fictive|\(fictive\)|[Ff]ictitious (airline|property|offer)|\(fictitious\)|Démo(?!nstration)|\bDemo\b(?! tools)/;

const flights = `o=city:PAR&d=city:LIS&type=ar&dep=${inDays(42)}&ret=${inDays(46)}&adt=2`;
const hotels = `dest=city:ROM&arr=${inDays(60)}&dep=${inDays(64)}`;
const cars = `pu=airport:LIS&pud=${inDays(50)}&put=10:00&dod=${inDays(54)}&dot=10:00&age=30`;

const CASES = [
  { lang: "fr" as const, prefix: "", refuse: "Tout refuser", sections: { vols: "Résultats de vols", hotels: "Résultats d'hébergements", voitures: "Résultats de location" } },
  { lang: "en" as const, prefix: "/en", refuse: "Refuse all", sections: { vols: "Flight results", hotels: "Accommodation results", voitures: "Rental results" } },
];

async function refuseCookies(page: Page, label: string) {
  const button = page.getByRole("button", { name: label });
  if (await button.isVisible().catch(() => false)) await button.click();
}

for (const c of CASES) {
  test(`mention unique des offres simulées et vraies marques sur les billets (${c.lang})`, async ({ page }) => {
    for (const [path, query] of [["vols", flights], ["hotels", hotels], ["voitures", cars]] as const) {
      await page.goto(`${c.prefix}/${path}?${query}`);
      await refuseCookies(page, c.refuse);
      const results = page.locator(`section[aria-label="${c.sections[path]}"]`);
      const ticket = results.locator("article").first();
      await expect(ticket).toBeVisible();
      // Exactement une mention, visible, au-dessus de la liste.
      const note = page.getByTestId("simulated-offers-note");
      await expect(note).toHaveCount(1);
      await expect(note).toBeVisible();
      await expect(note).toHaveText(NOTE[c.lang]);
      const noteBox = (await note.boundingBox())!;
      const ticketBox = (await ticket.boundingBox())!;
      expect(noteBox.y).toBeLessThan(ticketBox.y);
      // Aucune étiquette « fictif » / « démo » sur les billets ni dans les filtres.
      await expect(results).not.toContainText(TAGS);
      await expect(page.locator("aside").filter({ has: page.locator("input[type=checkbox]") }).first()).not.toContainText(TAGS);
      if (path === "vols") await expect(ticket.getByTestId("ticket-airlines")).toHaveText(PARIS_LISBON_AIRLINES);
      if (path === "voitures") await expect(ticket).toContainText(LISBON_RENTERS);
    }
  });
}

test("annuaire : compagnies et loueurs cités dans les offres simulées, sans partenariat", async ({ page }) => {
  await page.goto("/compagnies-aeriennes");
  await dismissCookies(page);
  const airlines = page.locator("section#demo-carriers, section[aria-labelledby='demo-carriers']");
  await expect(airlines).toContainText("Air France (AF)");
  await expect(airlines).toContainText("aucun partenariat");
  await expect(airlines).not.toContainText(TAGS);
  await page.goto("/loueurs");
  const renters = page.locator("section[aria-labelledby='demo-suppliers']");
  await expect(renters).toContainText("Hertz");
  await expect(renters).not.toContainText(TAGS);
});

test("documents émis : mention « DÉMONSTRATION » sur la confirmation et le récapitulatif imprimable (fr, en)", async ({ page }) => {
  await login(page);
  await page.goto(`/vols?o=airport:CDG&d=airport:LIS&type=ar&dep=${inDays(44)}&ret=${inDays(48)}&adt=1`);
  await dismissCookies(page);
  const ticket = page.locator("section[aria-label='Résultats de vols'] article").first();
  await expect(ticket.getByTestId("ticket-airlines")).toHaveText(PARIS_LISBON_AIRLINES);
  await ticket.getByRole("link", { name: /Voir le détail/ }).click();
  await expect(page.getByTestId("simulated-offers-note")).toHaveText(NOTE.fr);
  await expect(page.locator("main")).not.toContainText(TAGS);
  await page.getByRole("button", { name: "Réserver cette offre" }).click();
  await expect(page).toHaveURL(/\/reservation\/bkg_/);
  await page.getByRole("textbox", { name: "Prénom" }).fill("Camille");
  await page.getByRole("textbox", { name: "Nom", exact: true }).fill("Durand");
  await page.getByRole("textbox", { name: "Date de naissance" }).fill("1991-05-04");
  await page.getByRole("button", { name: "Continuer vers les options" }).click();
  await page.getByRole("button", { name: "Continuer vers la vérification" }).click();
  await page.getByRole("checkbox", { name: /J'ai lu les conditions/ }).check();
  await page.getByRole("button", { name: "Valider et vérifier le prix" }).click();
  await page.getByTestId("pay-button").click();
  await expect(page.getByText(/Billets émis/).first()).toBeVisible({ timeout: 30_000 });
  // Confirmation : jamais présentée comme un billet valable.
  await expect(page.getByTestId("demo-document-marker")).toHaveText(MARKER.fr);
  const bookingPath = new URL(page.url()).pathname;

  await page.getByRole("link", { name: /Récapitulatif \(démonstration\)/ }).click();
  await expect(page).toHaveURL(/\/reservation\/bkg_[^/]+\/document$/);
  await expect(page.getByTestId("demo-document-marker")).toHaveText(MARKER.fr);
  await expect(page.getByTestId("demo-document-marker")).toBeVisible();
  // Filigrane conservé.
  await expect(page.locator("p[aria-hidden]").filter({ hasText: "Démonstration" })).toHaveCount(1);
  await page.emulateMedia({ media: "print" });
  await expect(page.getByTestId("demo-document-marker")).toBeVisible();
  await page.emulateMedia({ media: "screen" });

  await page.goto(`/en${bookingPath}/document`);
  await expect(page.getByTestId("demo-document-marker")).toHaveText(MARKER.en);
});

test("version imprimable du voyage : mention « DÉMONSTRATION » et filigrane", async ({ page }) => {
  await login(page);
  await page.getByRole("link", { name: /Islande : arrivée tardive/ }).click();
  await page.getByRole("link", { name: "Version imprimable" }).click();
  await expect(page).toHaveURL(/\/voyage\/trp_[^/]+\/imprimer$/);
  await expect(page.getByTestId("demo-document-marker")).toHaveText(MARKER.fr);
  await expect(page.locator("p[aria-hidden]").filter({ hasText: "Démonstration" })).toHaveCount(1);
});
