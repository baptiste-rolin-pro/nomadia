import type { Locator, Page } from "@playwright/test";
import { expect, test } from "./fixtures";
import { dismissCookies, inDays, noHorizontalOverflow } from "./helpers";

/**
 * Logos des marques (domaine public, Wikimedia Commons) ou monogramme Nomadia :
 * - billets de vol et de voiture : une marque par compagnie / loueur, alt (logo) ou nom (monogramme) exact, image chargée ;
 * - annuaires : logo ou monogramme, mention « aucun partenariat » conservée ;
 * - /credits : section « Logos » (fichier Commons, licence, mention sur les marques), marques en monogramme listées ;
 * - /ar/vols à 375 px : aucun débordement horizontal.
 */
const flights = `o=city:PAR&d=city:LIS&type=ar&dep=${inDays(42)}&ret=${inDays(46)}&adt=2`;
const cars = `pu=airport:LIS&pud=${inDays(50)}&put=10:00&dod=${inDays(54)}&dot=10:00&age=30`;
const NOTICE = "Les marques et logos appartiennent à leurs titulaires ; leur présence n'implique aucun partenariat.";

/** Nom porté par chaque marque affichée : alt du logo, ou titre du monogramme. Vérifie aussi que chaque logo est chargé. */
async function markNames(container: Locator): Promise<string[]> {
  const marks = container.locator("[data-brand-mark]");
  const names: string[] = [];
  for (let i = 0; i < (await marks.count()); i++) {
    const mark = marks.nth(i);
    if ((await mark.getAttribute("data-brand-mark")) === "logo") {
      const img = mark.locator("img");
      await expect(img).toHaveAttribute("src", /^\/logos\/brands\/[a-z0-9-]+\.(svg|png)$/);
      // Chargement différé (loading="lazy") : l'image est amenée à l'écran avant de vérifier qu'elle s'affiche.
      await img.scrollIntoViewIfNeeded();
      await expect.poll(() => img.evaluate((el: HTMLImageElement) => el.complete && el.naturalWidth > 0)).toBe(true);
      names.push((await img.getAttribute("alt")) ?? "");
    } else {
      names.push((await mark.getAttribute("title")) ?? "");
    }
  }
  return names;
}

/** Texte propre de l'élément (nœuds texte directs), sans celui du monogramme placé à côté. */
async function ownText(el: Locator): Promise<string> {
  return el.evaluate((node) => [...node.childNodes].filter((n) => n.nodeType === Node.TEXT_NODE).map((n) => n.textContent).join("").trim());
}

async function firstTicket(page: Page, section: string) {
  const ticket = page.locator(`section[aria-label="${section}"] article`).first();
  await expect(ticket).toBeVisible();
  return ticket;
}

test("billet de vol : une marque par compagnie, alt ou nom identique au nom affiché", async ({ page }) => {
  await page.goto(`/vols?${flights}`);
  await dismissCookies(page);
  const tickets = page.locator("section[aria-label='Résultats de vols'] article");
  await expect(tickets.first()).toBeVisible();
  let logos = 0;
  for (let i = 0; i < Math.min(await tickets.count(), 6); i++) {
    const ticket = tickets.nth(i);
    const names = (await ticket.getByTestId("ticket-airlines").innerText()).split(" · ");
    expect(await markNames(ticket.getByTestId("ticket-brand-marks"))).toEqual(names);
    logos += await ticket.locator("[data-brand-mark='logo']").count();
  }
  // Paris → Lisbonne : Air France, TAP, KLM, Iberia, easyJet, Ryanair ont un logo du domaine public.
  expect(logos).toBeGreaterThan(0);
  // Aucune mention retirée : la ligne « Offres simulées » reste unique.
  await expect(page.getByTestId("simulated-offers-note")).toHaveCount(1);
});

test("billet de voiture et fiche d'offre : logo du loueur (Budget) ou monogramme (Centauro)", async ({ page }) => {
  await page.goto(`/voitures?${cars}`);
  await dismissCookies(page);
  const ticket = await firstTicket(page, "Résultats de location");
  const renter = ticket.getByTestId("ticket-renter");
  expect(await markNames(renter)).toEqual([await ownText(renter)]);
  const results = page.locator("section[aria-label='Résultats de location']");
  const budget = results.locator("[data-testid='ticket-renter']").filter({ hasText: "Budget" }).first();
  await expect(budget.locator("img")).toHaveAttribute("alt", "Budget");
  const centauro = results.locator("[data-testid='ticket-renter']").filter({ hasText: "Centauro" }).first();
  await expect(centauro.locator("[data-brand-mark='monogram']")).toHaveText("CE");
  await ticket.getByRole("link", { name: /Voir le détail/ }).click();
  const offerRenter = page.getByTestId("offer-renter");
  await expect(offerRenter).toBeVisible();
  expect(await markNames(offerRenter)).toEqual([await ownText(offerRenter)]);
});

test("annuaires : logo ou monogramme, mention « aucun partenariat » conservée", async ({ page }) => {
  await page.goto("/compagnies-aeriennes");
  await dismissCookies(page);
  await expect(page.getByText(/ne signifie pas qu'elle est partenaire de Nomadia/)).toContainText("n'impliquent aucun partenariat");
  const airFrance = page.getByRole("link", { name: /^Air France/ }).first();
  await expect(airFrance.locator("img")).toHaveAttribute("alt", "Air France");
  const flysafair = page.getByRole("link", { name: /^FlySafair/ }).first();
  await expect(flysafair.locator("[data-brand-mark='monogram']")).toHaveText("FA");
  await page.goto("/compagnies-aeriennes/klm");
  expect(await markNames(page.locator("main"))).toEqual(["KLM"]);
  await page.goto("/loueurs/sixt");
  expect(await markNames(page.locator("main"))).toEqual(["Sixt"]);
});

test("crédits : section Logos (fichier Commons, licence, marques), monogrammes listés (fr, en)", async ({ page }) => {
  await page.goto("/credits");
  await dismissCookies(page);
  const list = page.getByTestId("credits-logos");
  await expect(list.locator("li")).toHaveCount(32);
  const af = list.locator("li").filter({ hasText: "Air France" });
  await expect(af).toContainText("Domaine public (PD-textlogo)");
  await expect(af.getByRole("link")).toHaveAttribute("href", /^https:\/\/commons\.wikimedia\.org\/wiki\/File:Air_France_Logo\.svg$/);
  expect(await markNames(list)).toHaveLength(32);
  await expect(page.getByTestId("logos-trademark-notice")).toHaveText(NOTICE);
  await expect(page.getByTestId("logos-monograms")).toContainText("Toyota Rent a Car");
  await page.goto("/en/credits");
  await expect(page.getByTestId("logos-trademark-notice")).toHaveText("Trademarks and logos belong to their owners; their presence implies no partnership.");
  await expect(page.getByTestId("credits-logos").locator("li")).toHaveCount(32);
});

test("/ar/vols à 375 px : billets avec marques, aucun débordement horizontal", async ({ page }) => {
  await page.setViewportSize({ width: 375, height: 812 });
  await page.goto(`/ar/vols?${flights}`);
  const ticket = page.locator("article.ticket").first();
  await expect(ticket).toBeVisible();
  await expect(ticket.locator("[data-brand-mark]").first()).toBeVisible();
  await expect(page.locator("html")).toHaveAttribute("dir", "rtl");
  await noHorizontalOverflow(page);
  await page.goto("/ar/compagnies-aeriennes");
  await noHorizontalOverflow(page);
});
