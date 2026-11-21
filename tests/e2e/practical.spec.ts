import type { Page } from "@playwright/test";
import { expect, test } from "./fixtures";
import { noHorizontalOverflow } from "./helpers";

/**
 * Section « Y aller / Sur place » des fiches destination (src/components/content/practical-section.tsx) : rendue
 * côté serveur, mention de relevé daté, marques liées seulement si l'annuaire a une fiche, recherches préremplies,
 * versions française, anglaise et arabe (375 px, sans débordement horizontal).
 */

async function refuseCookies(page: Page, label: string) {
  const button = page.getByRole("button", { name: label });
  if (await button.isVisible().catch(() => false)) await button.click();
}

test("/destinations/lisbonne : aéroport, liaison, compagnies, location, mention et recherches", async ({ page }) => {
  await page.goto("/destinations/lisbonne");
  const section = page.getByTestId("practical-section");
  await expect(section.getByRole("heading", { level: 2, name: "Y aller / Sur place" })).toBeVisible();
  await expect(section).toContainText("Aéroport d'accès");
  await expect(section).toContainText("Aéroport Humberto Delgado");
  await expect(section).toContainText("Vol sans escale relevé depuis Paris.");
  // Compagnie présente dans l'annuaire : lien ; loueur sans fiche : texte simple.
  await expect(section.getByRole("link", { name: "TAP Air Portugal" })).toHaveAttribute("href", "/compagnies-aeriennes/tap-air-portugal");
  await expect(section.getByRole("link", { name: "Ryanair" })).toHaveAttribute("href", "/compagnies-aeriennes/ryanair");
  await expect(section.getByRole("link", { name: "Alamo" })).toHaveAttribute("href", "/loueurs/alamo");
  await expect(section).toContainText("Klass Wagen");
  await expect(section.getByRole("link", { name: "Klass Wagen" })).toHaveCount(0);
  await expect(section).toContainText("Modèles types (ou similaires)");
  await expect(section).toContainText("Dacia Sandero");
  await expect(section).toContainText("Informations relevées le 21 novembre 2026, à titre indicatif.");
  await expect(section).toContainText("Aucun partenariat avec les marques citées.");
  // Aucune URL de la source publiée.
  expect(await section.locator("a[href*='kayak']").count()).toBe(0);
  await expect(section.getByRole("link", { name: "Rechercher un vol depuis Paris" })).toHaveAttribute("href", /^\/vols\?o=city%3APAR&d=city%3ALIS&/);
  await expect(section.getByRole("link", { name: "Rechercher une voiture de location" })).toHaveAttribute("href", /^\/voitures\?pu=airport%3ALIS&/);
  // Le lien de la fiche annuaire aboutit.
  await section.getByRole("link", { name: "Ryanair" }).click();
  await expect(page).toHaveURL(/\/compagnies-aeriennes\/ryanair$/);
  await expect(page.getByRole("heading", { level: 1 })).toHaveText("Ryanair");
});

test("/en/destinations/lisbonne : section en anglais, liens préfixés", async ({ page }) => {
  await page.goto("/en/destinations/lisbonne");
  const section = page.getByTestId("practical-section");
  await expect(section.getByRole("heading", { level: 2, name: "Getting there / On site" })).toBeVisible();
  await expect(section).toContainText("Access airport");
  await expect(section).toContainText("Information observed on 21 November 2026, for guidance only.");
  await expect(section).toContainText("No partnership with the brands mentioned.");
  await expect(section.getByRole("link", { name: "TAP Air Portugal" })).toHaveAttribute("href", "/en/compagnies-aeriennes/tap-air-portugal");
  await expect(section.getByRole("link", { name: "Search flights from Paris" })).toHaveAttribute("href", /^\/en\/vols\?/);
});

test("Bali et Lofoten : correspondance relevée et dernier tronçon", async ({ page }) => {
  await page.goto("/destinations/bali");
  const bali = page.getByTestId("practical-section");
  await expect(bali).toContainText("Correspondance : Aéroport de Singapour-Changi (SIN)");
  await expect(bali.getByRole("link", { name: "Singapore Airlines" })).toHaveAttribute("href", "/compagnies-aeriennes/singapore-airlines");
  await page.goto("/destinations/lofoten");
  const lofoten = page.getByTestId("practical-section");
  await expect(lofoten).toContainText("À rejoindre d'abord : Aéroport de Bodø (BOO)");
  await expect(lofoten).toContainText("Relevé limité aux SUV");
  await expect(lofoten.getByRole("link", { name: "Widerøe" })).toHaveAttribute("href", "/compagnies-aeriennes/wideroe");
});

test.describe("arabe, mobile 375 px", () => {
  test.use({ viewport: { width: 375, height: 812 } });

  test("/ar/destinations/lisbonne : section en arabe, de droite à gauche, sans débordement horizontal", async ({ page }) => {
    await page.goto("/ar/destinations/lisbonne");
    await refuseCookies(page, "رفض الكل");
    await expect(page.locator("html")).toHaveAttribute("dir", "rtl");
    const section = page.getByTestId("practical-section");
    await section.scrollIntoViewIfNeeded();
    await expect(section.getByRole("heading", { level: 2, name: "الوصول / في الوجهة" })).toBeVisible();
    await expect(section).toContainText("LIS");
    await expect(section.getByRole("link", { name: "TAP Air Portugal" })).toHaveAttribute("href", "/ar/compagnies-aeriennes/tap-air-portugal");
    await noHorizontalOverflow(page);
    for (const slug of ["bali", "le-cap", "lofoten"]) {
      await page.goto(`/ar/destinations/${slug}`);
      await expect(page.getByTestId("practical-section")).toBeAttached();
      await noHorizontalOverflow(page);
    }
  });
});
