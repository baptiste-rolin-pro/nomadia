import type { Page } from "@playwright/test";
import { expect, test } from "./fixtures";
import { inDays, noHorizontalOverflow } from "./helpers";

/**
 * Résultats en forme de billet : partie informations + talon de prix (séparation pointillée, encoches).
 * Vols, hébergements et voitures en français et en anglais ; arabe à 375 px (talon empilé, sans débordement).
 */

async function refuseCookies(page: Page, label: string) {
  const button = page.getByRole("button", { name: label });
  if (await button.isVisible().catch(() => false)) await button.click();
}

const flights = `o=city:PAR&d=city:LIS&type=ar&dep=${inDays(42)}&ret=${inDays(46)}&adt=2`;
const hotels = `dest=city:ROM&arr=${inDays(60)}&dep=${inDays(64)}`;
const cars = `pu=airport:LIS&pud=${inDays(50)}&put=10:00&dod=${inDays(54)}&dot=10:00&age=30`;

const CASES = [
  {
    lang: "fr",
    prefix: "",
    refuse: "Tout refuser",
    carSection: "Résultats de location",
    carModel: { similar: "ou similaire", note: "catégorie garantie, modèle non garanti" },
    pages: [
      { path: `/vols?${flights}`, section: "Résultats de vols", name: /^Vol [A-Z]{3} vers LIS, .*€/, cta: /Voir le détail/, stub: /Total pour 2 voyageurs/ },
      { path: `/hotels?${hotels}`, section: "Résultats d'hébergements", name: /, à partir de .*€/, cta: /Voir les chambres/, stub: /\/ nuit \/ chambre/ },
      { path: `/voitures?${cars}`, section: "Résultats de location", name: /^.+, .+, .*€/, cta: /Voir le détail/, stub: /≈ .* \/ jour/ },
    ],
  },
  {
    lang: "en",
    prefix: "/en",
    refuse: "Refuse all",
    carSection: "Rental results",
    carModel: { similar: "or similar", note: "category guaranteed, model not guaranteed" },
    pages: [
      { path: `/vols?${flights}`, section: "Flight results", name: /LIS/, cta: /See details/, stub: /€/ },
      { path: `/hotels?${hotels}`, section: "Accommodation results", name: /, from .*€/, cta: /See rooms/, stub: /€/ },
      { path: `/voitures?${cars}`, section: "Rental results", name: /€/, cta: /See details/, stub: /≈ .* \/ day/ },
    ],
  },
] as const;

for (const c of CASES) {
  test(`billets : vols, hébergements et voitures (${c.lang})`, async ({ page }) => {
    for (const p of c.pages) {
      await page.goto(`${c.prefix}${p.path}`);
      await refuseCookies(page, c.refuse);
      const ticket = page.locator(`section[aria-label="${p.section}"] article`).first();
      await expect(ticket).toBeVisible();
      await expect(ticket).toHaveAccessibleName(p.name);
      const stub = ticket.locator(".ticket__stub");
      await expect(stub).toContainText(p.stub);
      // Une seule action principale dans le talon, la carte n'est pas un lien.
      await expect(stub.getByRole("link", { name: p.cta })).toHaveCount(1);
      await expect(ticket.locator(":scope > a")).toHaveCount(0);
      // Séparation pointillée côté talon (≥ 640 px : bord de début de ligne).
      const border = await stub.evaluate((el) => getComputedStyle(el).borderInlineStartStyle);
      expect(border).toBe("dashed");
    }
    // Ligne du modèle des voitures : « ou similaire » une seule fois (le modèle traduit le contient déjà),
    // mention « catégorie garantie, modèle non garanti » conservée.
    await page.goto(`${c.prefix}/voitures?${cars}`);
    const modelLine = page
      .locator(`section[aria-label="${c.carSection}"] article`)
      .first()
      .locator("p", { hasText: c.carModel.note });
    await expect(modelLine).toHaveCount(1);
    const text = (await modelLine.innerText()).trim();
    expect(text.split(c.carModel.similar).length - 1, text).toBe(1);
  });
}

test("billets : /ar/vols à 375 px, talon sous les informations, sans débordement", async ({ page }) => {
  await page.setViewportSize({ width: 375, height: 812 });
  await page.goto(`/ar/vols?${flights}`);
  await refuseCookies(page, "رفض الكل");
  const ticket = page.locator("section[aria-label='نتائج الرحلات'] article").first();
  await expect(ticket).toBeVisible();
  await noHorizontalOverflow(page);
  const info = await ticket.locator(".ticket__info").boundingBox();
  const stub = await ticket.locator(".ticket__stub").boundingBox();
  expect(stub!.y).toBeGreaterThanOrEqual(info!.y + info!.height - 1);
  expect(Math.abs(stub!.width - info!.width)).toBeLessThanOrEqual(1);
  expect(await ticket.locator(".ticket__stub").evaluate((el) => getComputedStyle(el).borderTopStyle)).toBe("dashed");
});

test("billets : le bouton du talon mène toujours à l'offre", async ({ page }) => {
  await page.goto(`/vols?${flights}`);
  await refuseCookies(page, "Tout refuser");
  await page.locator("section[aria-label='Résultats de vols'] article").first().locator(".ticket__stub").getByRole("link", { name: /Voir le détail/ }).click();
  await expect(page).toHaveURL(/\/vols\/offre\/[^?]+\?retour=/);
  await expect(page.getByRole("heading", { name: "Tarif, bagages et conditions" })).toBeVisible();

  await page.goto(`/voitures?${cars}`);
  await page.locator("section[aria-label='Résultats de location'] article").first().locator(".ticket__stub").getByRole("link", { name: /Voir le détail/ }).click();
  await expect(page).toHaveURL(/\/voitures\/offre\/[^?]+\?retour=/);

  await page.goto(`/hotels?${hotels}`);
  await page.locator("section[aria-label=\"Résultats d'hébergements\"] article").first().locator(".ticket__stub").getByRole("link", { name: /Voir les chambres/ }).click();
  await expect(page).toHaveURL(/\/hotels\/[^/?]+\?/);
  await expect(page.getByRole("heading", { name: "Chambres et tarifs" })).toBeVisible();
});
