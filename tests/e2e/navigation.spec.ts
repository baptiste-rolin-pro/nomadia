import { expect, test } from "./fixtures";
import { dismissCookies, noHorizontalOverflow } from "./helpers";

const PAGES = ["/", "/destinations", "/destinations/lisbonne", "/destinations/lofoten", "/guides", "/guides/lire-un-prix-de-voyage", "/compagnies-aeriennes", "/compagnies-aeriennes/air-france", "/loueurs", "/loueurs/sixt", "/vols", "/hotels", "/voitures", "/voyage/nouveau", "/aide", "/contact", "/mentions-legales", "/conditions", "/confidentialite", "/cookies", "/credits", "/connexion", "/inscription", "/mot-de-passe-oublie", "/sitemap.xml", "/robots.txt"];

test("les pages principales répondent 200 avec un H1 unique", async ({ page, request }) => {
  for (const path of PAGES) {
    const res = await request.get(path);
    expect(res.status(), path).toBe(200);
  }
  for (const path of PAGES.filter((p) => !p.endsWith(".xml") && !p.endsWith(".txt"))) {
    await page.goto(path);
    await expect(page.locator("h1"), path).toHaveCount(1);
  }
});

test("les liens internes de l'accueil et du pied de page aboutissent", async ({ page, request }) => {
  await page.goto("/");
  const hrefs = await page.$$eval("a[href^='/']", (as) => [...new Set(as.map((a) => a.getAttribute("href")!.split("#")[0]!))]);
  expect(hrefs.length).toBeGreaterThan(20);
  for (const href of hrefs) {
    const res = await request.get(href, { maxRedirects: 0 });
    expect([200, 307, 308], href).toContain(res.status());
  }
});

test("une page inexistante renvoie une 404 explicite", async ({ page }) => {
  const res = await page.goto("/destinations/atlantide");
  expect(res?.status()).toBe(404);
  await expect(page.getByRole("heading", { name: /introuvable/ })).toBeVisible();
});

for (const width of [375, 768, 1440]) {
  test(`aucun débordement horizontal à ${width}px`, async ({ page }) => {
    await page.setViewportSize({ width, height: 900 });
    for (const path of ["/", "/destinations/reykjavik", `/hotels?dest=city:LIS&arr=2099-01-01&dep=2099-01-03&ch=2`, "/voyage/nouveau", "/credits"]) {
      await page.goto(path);
      await dismissCookies(page);
      await noHorizontalOverflow(page);
    }
  });
}

test("navigation mobile accessible au clavier (menu en dialogue)", async ({ page }) => {
  await page.setViewportSize({ width: 375, height: 800 });
  await page.goto("/");
  await dismissCookies(page);
  await page.getByRole("button", { name: "Ouvrir le menu" }).click();
  const dialog = page.getByRole("dialog", { name: "Menu" });
  await expect(dialog).toBeVisible();
  await page.keyboard.press("Escape");
  await expect(dialog).toBeHidden();
  await expect(page.getByRole("button", { name: "Ouvrir le menu" })).toBeFocused();
});

test("onglets du moteur de recherche navigables aux flèches", async ({ page }) => {
  await page.goto("/");
  await dismissCookies(page);
  const first = page.getByRole("tab", { name: "Mon voyage" });
  await first.focus();
  await page.keyboard.press("ArrowRight");
  await expect(page.getByRole("tab", { name: "Vols" })).toBeFocused();
  await expect(page.getByRole("tab", { name: "Vols" })).toHaveAttribute("aria-selected", "true");
  await expect(page.getByRole("form", { name: "Recherche de vols" })).toBeVisible();
});

test("animations réduites : le contenu reste visible", async ({ browser }) => {
  const context = await browser.newContext({ reducedMotion: "reduce" });
  const page = await context.newPage();
  await page.goto("/");
  const opacities = await page.$$eval(".reveal", (els) => els.map((e) => getComputedStyle(e).opacity));
  expect(opacities.length).toBeGreaterThan(0);
  expect(opacities.every((o) => o === "1")).toBe(true);
  await context.close();
});

test("images indisponibles : le texte et la navigation restent utilisables", async ({ page }) => {
  await page.route(/\/_next\/image|\.jpg$/, (route) => route.abort());
  await page.goto("/destinations/kyoto");
  await expect(page.getByRole("heading", { level: 1, name: "Kyoto" })).toBeVisible();
  await expect(page.getByRole("link", { name: /Vols depuis Paris/ })).toBeVisible();
});

test("sans JavaScript, les sections éditoriales sont lisibles", async ({ browser }) => {
  const context = await browser.newContext({ javaScriptEnabled: false });
  const page = await context.newPage();
  await page.goto("/");
  await expect(page.getByRole("heading", { name: /Douze départs/ })).toBeVisible();
  // Ni écran d'accueil « avion » ni vidéo : l'affiche et le titre du hero sont là, le moteur aussi.
  await expect(page.getByTestId("intro-loader")).toBeHidden();
  await expect(page.getByRole("heading", { level: 1, name: /Votre prochaine histoire/ })).toBeVisible();
  await expect(page.getByTestId("hero-video")).not.toHaveAttribute("src");
  await expect(page.getByTestId("hero-motion-toggle")).toBeHidden();
  await context.close();
});

test("démonstration non indexée", async ({ request }) => {
  const robots = await (await request.get("/robots.txt")).text();
  expect(robots).toMatch(/Disallow: \//);
});
