import { expect, markIntroSeen, test } from "./fixtures";
import { dismissCookies, inDays } from "./helpers";

/** Suggestions préremplies (vols, hôtels, voitures, voyage) et chargement « avion » (mouvement réduit compris). */

const VERTICALS = [
  { path: "/vols", results: "Résultats de vols" },
  { path: "/hotels", results: "Résultats d'hébergements" },
  { path: "/voitures", results: "Résultats de location" },
];

for (const { path, results } of VERTICALS) {
  test(`${path} : une suggestion, ouverte au clavier, mène à des résultats`, async ({ page }) => {
    await page.goto(path);
    await dismissCookies(page);
    const links = page.getByTestId("suggestions").getByRole("link");
    expect(await links.count()).toBeGreaterThanOrEqual(6);
    for (const href of await links.evaluateAll((as) => as.map((a) => a.getAttribute("href")))) expect(href).toMatch(new RegExp(`^${path}\\?.+`));
    await links.first().focus();
    await page.keyboard.press("Enter");
    await expect(page).toHaveURL(new RegExp(`${path}\\?`));
    await expect(page.locator(`section[aria-label="${results}"] article`).first()).toBeVisible();
  });
}

test("organiser mon voyage : une idée préremplit le formulaire, puis le voyage est créé", async ({ page }) => {
  await page.goto("/voyage/nouveau");
  await dismissCookies(page);
  await page.getByTestId("suggestions").getByRole("link", { name: /Long week-end à Lisbonne/ }).click();
  await expect(page).toHaveURL(/idee=voyage-lisbonne-week-end/);
  await expect(page.getByRole("status").filter({ hasText: "Idée appliquée : Long week-end à Lisbonne" })).toBeVisible();
  const url = new URL(page.url());
  await expect(page.getByRole("combobox", { name: "Destination" })).toHaveValue("lisbonne");
  await expect(page.getByLabel("Début du voyage")).toHaveValue(url.searchParams.get("debut")!);
  await expect(page.getByLabel("Fin du voyage")).toHaveValue(url.searchParams.get("fin")!);
  await expect(page.getByLabel("Adultes")).toHaveValue("2");
  await page.getByRole("button", { name: "Créer mon voyage" }).click();
  await expect(page).toHaveURL(/\/voyage\/trp_/);
  await expect(page.getByRole("heading", { level: 1, name: "Voyage à Lisbonne" })).toBeVisible();
});

test("accueil : « Fin du voyage » aligné avec les autres champs à 375, 768 et 1440 px", async ({ page }) => {
  for (const width of [375, 768, 1440]) {
    await page.setViewportSize({ width, height: 900 });
    await page.goto("/");
    await dismissCookies(page);
    // Mesures dans la même image (le moteur peut encore terminer son entrée animée).
    const rects = await page.getByRole("form", { name: "Créer un voyage" }).evaluate((form) => {
      const r = (id: string) => form.querySelector(`#${id}`)!.getBoundingClientRect();
      return { start: r("trip-start"), end: r("trip-end"), adults: r("trip-adults") };
    });
    // Même rangée que « Fin du voyage » : « Début » à 1440 px (4 colonnes), « Adultes » à 768 px (2 colonnes).
    if (width >= 1024) expect(Math.abs(rects.end.top - rects.start.top), `${width}px`).toBeLessThanOrEqual(1);
    if (width >= 768) expect(Math.abs(rects.end.top - rects.adults.top), `${width}px`).toBeLessThanOrEqual(1);
    // Partout : le champ « Fin » a la même hauteur que « Début » (aucun décalage interne).
    expect(Math.abs(rects.end.height - rects.start.height), `${width}px`).toBeLessThanOrEqual(1);
  }
});

test("chargement des résultats : avion animé, immobile en mouvement réduit, jamais bloquant", async ({ browser }) => {
  for (const reducedMotion of ["no-preference", "reduce"] as const) {
    const context = await browser.newContext({ reducedMotion });
    await markIntroSeen(context);
    const page = await context.newPage();
    let release: () => void = () => {};
    const gate = new Promise<void>((resolve) => (release = resolve));
    await page.route("**/api/search/flights**", async (route) => {
      await gate;
      await route.continue();
    });
    await page.goto(`/vols?o=city:PAR&d=city:LIS&type=ar&dep=${inDays(40)}&ret=${inDays(44)}&adt=2`);
    const loader = page.getByTestId("plane-loader").first();
    await expect(loader).toBeVisible();
    await expect(loader).toContainText("Recherche des vols");
    const animation = await loader.locator(".flight-path__plane").evaluate((el) => getComputedStyle(el).animationName);
    expect(animation, reducedMotion).toBe(reducedMotion === "reduce" ? "none" : "flight-loop");
    release();
    await expect(page.locator("section[aria-label='Résultats de vols'] article").first()).toBeVisible();
    await expect(page.getByTestId("plane-loader")).toHaveCount(0);
    await context.close();
  }
});
