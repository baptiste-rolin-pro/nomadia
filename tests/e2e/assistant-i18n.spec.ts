import type { Page } from "@playwright/test";
import { expect, test } from "./fixtures";
import { inDays } from "./helpers";

/**
 * Assistant en anglais et en arabe sur le serveur :3101 (ni clé ni modèle simulé) : l'analyse locale comprend la
 * demande dans la langue de la page, répond dans cette langue et ouvre la page préfixée. Dates écrites à partir
 * d'aujourd'hui (Europe/Paris) : le test reste valable toute l'année.
 */

function dayMonth(iso: string, intl: string): { day: string; month: string } {
  const date = new Date(`${iso}T12:00:00Z`);
  const parts = new Intl.DateTimeFormat(intl, { day: "numeric", month: "long", timeZone: "UTC" }).formatToParts(date);
  return { day: parts.find((p) => p.type === "day")!.value, month: parts.find((p) => p.type === "month")!.value };
}

async function openAssistant(page: Page, path: string, labels: { refuse: string; tab: string; field: string }) {
  await page.goto(path);
  await page.getByRole("button", { name: labels.refuse }).click();
  await page.getByRole("tab", { name: labels.tab }).click();
  const field = page.getByLabel(labels.field);
  await expect(field).toBeVisible();
  return field;
}

test("anglais : demande comprise sans clé, réponse en anglais, /en/hotels ouvert avec les paramètres exacts", async ({ page }) => {
  const arr = inDays(50);
  const { day, month } = dayMonth(arr, "en-GB");
  const field = await openAssistant(page, "/en", { refuse: "Refuse all", tab: "Assistant", field: "Describe your trip" });
  await field.fill(`Hotel in Lisbon for 3 nights from ${month} ${day}, 2 adults`);
  await page.getByRole("button", { name: "Ask the assistant" }).click();
  const result = page.getByTestId("assistant-resultat");
  await expect(result.getByRole("heading", { name: "Here is what I understood" })).toBeVisible();
  await expect(result).toContainText("Accommodation in Lisbon");
  await expect(result).toContainText("3 nights");
  await expect(page).toHaveURL(`/en/hotels?dest=city%3ALIS&arr=${arr}&dep=${inDays(53)}&ch=2`, { timeout: 15_000 });
  await expect(page.locator("html")).toHaveAttribute("lang", "en");
});

test("arabe (droite à gauche, chiffres arabes orientaux) : demande comprise sans clé, réponse en arabe, /ar/hotels ouvert", async ({ page }) => {
  const arr = inDays(50);
  const { day, month } = dayMonth(arr, "ar-u-nu-arab");
  const field = await openAssistant(page, "/ar", { refuse: "رفض الكل", tab: "المساعد", field: "صف رحلتك" });
  await expect(page.locator("html")).toHaveAttribute("dir", "rtl");
  await field.fill(`فندق في لشبونة ٣ ليالٍ ابتداءً من ${day} ${month}، شخصان بالغان`);
  await page.getByRole("button", { name: "اسأل المساعد" }).click();
  const result = page.getByTestId("assistant-resultat");
  await expect(result.getByRole("heading", { name: "هذا ما فهمته" })).toBeVisible();
  await expect(result).toContainText("الإقامة في لشبونة");
  await expect(result).toContainText("٣ ليالٍ");
  await expect(page).toHaveURL(`/ar/hotels?dest=city%3ALIS&arr=${arr}&dep=${inDays(53)}&ch=2`, { timeout: 15_000 });
});

test("API : la langue demandée règle la réponse (anglais compris, arabe non compris → aide en arabe)", async ({ request, baseURL }) => {
  const headers = { origin: baseURL! };
  const en = await request.post("/api/assistant", { data: { text: "Tell me about Bali", locale: "en" }, headers });
  expect(await en.json()).toMatchObject({ status: "ok", engine: "local", result: { type: "actions", actions: [{ href: "/en/destinations/bali", title: "Discover Bali" }] } });
  const ar = await request.post("/api/assistant", { data: { text: "اكتب لي قصيدة", locale: "ar" }, headers });
  expect(await ar.json()).toMatchObject({ status: "ok", engine: "local", result: { type: "help", message: expect.stringContaining("لم أفهم طلبك") } });
});
