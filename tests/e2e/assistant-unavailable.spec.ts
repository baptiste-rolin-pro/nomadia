import { expect, test } from "./fixtures";
import { dismissCookies } from "./helpers";

/**
 * Serveur :3101 : ni ANTHROPIC_API_KEY ni modèle simulé (playwright.config.ts). L'assistant s'affiche
 * « indisponible », l'API répond 503 sans appeler de modèle, et le reste du moteur de recherche fonctionne.
 */
test("sans clé : assistant « indisponible », API en 503, les autres onglets fonctionnent", async ({ page, request, baseURL }) => {
  const status = await request.get("/api/assistant");
  expect(await status.json()).toEqual({ available: false });
  const post = await request.post("/api/assistant", { data: { text: "Un week-end à Lisbonne" }, headers: { origin: baseURL! } });
  expect(post.status()).toBe(503);
  expect(await post.json()).toMatchObject({ status: "error", code: "UNAVAILABLE" });

  await page.goto("/");
  await dismissCookies(page);
  await page.getByRole("tab", { name: "Assistant" }).click();
  await expect(page.getByTestId("assistant-indisponible")).toContainText("L'assistant est indisponible pour le moment.");
  await expect(page.getByLabel("Décrivez votre voyage")).toHaveCount(0);

  await page.getByRole("tab", { name: "Vols" }).click();
  await expect(page.getByRole("form", { name: "Recherche de vols" })).toBeVisible();
});
