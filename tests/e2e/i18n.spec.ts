import type { Page } from "@playwright/test";
import { expect, test } from "./fixtures";
import { inDays, noHorizontalOverflow } from "./helpers";

/**
 * Site multilingue (serveur :3100) : français sans préfixe, autres langues préfixées, sélecteur de langue qui
 * garde la page et ses paramètres, balises hreflang, arabe de droite à gauche sans débordement sur mobile.
 */

async function refuseCookies(page: Page, label: string) {
  const button = page.getByRole("button", { name: label });
  if (await button.isVisible().catch(() => false)) await button.click();
}

test("/en : accueil en anglais, lang et dir, hreflang et x-default, liens préfixés", async ({ page }) => {
  await page.goto("/en");
  await expect(page.locator("html")).toHaveAttribute("lang", "en");
  await expect(page.locator("html")).toHaveAttribute("dir", "ltr");
  await expect(page.getByRole("heading", { level: 1 })).toContainText("Your next story begins elsewhere.");
  await expect(page.getByRole("navigation").first().getByRole("link", { name: "Flights", exact: true })).toHaveAttribute("href", "/en/vols");
  const alternates = await page.locator("link[rel=alternate][hreflang]").evaluateAll((links) => links.map((l) => [l.getAttribute("hreflang"), new URL(l.getAttribute("href")!).pathname]));
  expect(alternates).toEqual(
    expect.arrayContaining([
      ["fr", "/"],
      ["en", "/en"],
      ["zh-Hans", "/zh"],
      ["ar", "/ar"],
      ["pt-BR", "/pt"],
      ["x-default", "/"],
    ]),
  );
  expect(alternates).toHaveLength(11);
  await expect(page.locator("link[rel=canonical]")).toHaveAttribute("href", /\/en$/);
});

test("anciennes adresses françaises inchangées ; /fr/… redirige vers l'adresse sans préfixe", async ({ page }) => {
  await page.goto("/destinations/lisbonne");
  await expect(page.locator("html")).toHaveAttribute("lang", "fr");
  await expect(page.getByRole("heading", { level: 1 })).toHaveText("Lisbonne");
  await page.goto("/fr/destinations/lisbonne");
  await expect(page).toHaveURL(/\/destinations\/lisbonne$/);
  await page.goto("/en/destinations/lisbonne");
  await expect(page.getByRole("heading", { level: 1 })).toHaveText("Lisbon");
});

test("sélecteur de langue : même page, mêmes paramètres, choix mémorisé (cookie), aucune redirection automatique", async ({ page, context }) => {
  const query = `dest=city%3ALIS&arr=${inDays(30)}&dep=${inDays(33)}&ch=2`;
  await page.goto(`/hotels?${query}`);
  await refuseCookies(page, "Tout refuser");
  await page.getByTestId("language-switcher").click();
  await page.getByRole("banner").getByRole("link", { name: "English" }).click();
  await expect(page).toHaveURL(`/en/hotels?${query}`);
  await expect(page.locator("html")).toHaveAttribute("lang", "en");
  await expect(page.getByRole("heading", { level: 1 })).toContainText("Hotels");
  expect((await context.cookies()).find((c) => c.name === "nomadia_lang")?.value).toBe("en");

  // Retour au français par le pied de page : adresse sans préfixe, paramètres conservés.
  await page.getByRole("contentinfo").getByRole("link", { name: "Français" }).click();
  await expect(page).toHaveURL(`/hotels?${query}`);
  await expect(page.locator("html")).toHaveAttribute("lang", "fr");
  // Le cookie ne redirige jamais : une adresse française reste en français même si une autre langue a été choisie.
  await context.addCookies([{ name: "nomadia_lang", value: "ru", url: page.url() }]);
  await page.goto("/");
  await expect(page).toHaveURL(/\/$/);
  await expect(page.locator("html")).toHaveAttribute("lang", "fr");
});

test.describe("arabe, mobile 375 px", () => {
  test.use({ viewport: { width: 375, height: 812 } });

  test("dir=rtl, accueil, recherche et assistant sans débordement horizontal", async ({ page }) => {
    await page.goto("/ar");
    await expect(page.locator("html")).toHaveAttribute("dir", "rtl");
    await expect(page.locator("html")).toHaveAttribute("lang", "ar");
    await refuseCookies(page, "رفض الكل");
    await noHorizontalOverflow(page);
    await page.getByRole("tab", { name: "المساعد" }).click();
    await expect(page.getByLabel("صف رحلتك")).toBeVisible();
    await noHorizontalOverflow(page);
    for (const path of [`/ar/hotels?dest=city%3AROM&arr=${inDays(40)}&dep=${inDays(43)}&ch=2`, "/ar/voyage/nouveau", "/ar/destinations/lisbonne", "/ar/connexion"]) {
      await page.goto(path);
      await expect(page.locator("html")).toHaveAttribute("dir", "rtl");
      await noHorizontalOverflow(page);
    }
  });

  test("tunnel de réservation en arabe : étapes en arabe, chiffres arabes orientaux, sans débordement", async ({ page }) => {
    await page.goto(`/ar/vols?o=airport:CDG&d=airport:LIS&type=ar&dep=${inDays(41)}&ret=${inDays(45)}&adt=1`);
    await refuseCookies(page, "رفض الكل");
    await noHorizontalOverflow(page);
    await page.locator("section[aria-label='نتائج الرحلات'] article").first().getByRole("link", { name: /عرض التفاصيل/ }).click();
    await noHorizontalOverflow(page);
    await page.getByRole("button", { name: "احجز هذا العرض" }).click();
    await expect(page).toHaveURL(/\/ar\/reservation\/bkg_/);
    await expect(page.locator("html")).toHaveAttribute("dir", "rtl");
    await noHorizontalOverflow(page);
    await page.getByRole("textbox", { name: "الاسم الأول" }).fill("Camille");
    await page.getByRole("textbox", { name: "اسم العائلة" }).fill("Durand");
    await page.getByRole("textbox", { name: "تاريخ الميلاد" }).fill("1991-05-04");
    // Sans compte : adresse de contact fictive obligatoire (démonstration publique).
    await page.getByRole("textbox", { name: "البريد الإلكتروني للتأكيد" }).fill("voyageur@exemple.test");
    await page.getByRole("button", { name: "المتابعة إلى الإضافات" }).click();
    await expect(page.getByRole("heading", { name: "إضافات مفيدة" })).toBeVisible();
    await noHorizontalOverflow(page);
    await expect(page.locator("main")).toContainText(/[٠-٩]/);
  });
});
