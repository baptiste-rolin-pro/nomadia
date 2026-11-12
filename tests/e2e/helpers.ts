import { expect, type Page } from "@playwright/test";

export const DEMO_USER = { email: "voyageur@nomadia.test", password: "voyage-demo-2026" };
export const DEMO_ADMIN = { email: "admin@nomadia.test", password: "admin-demo-2026" };

/** Date civile relative à aujourd'hui (fuseau Europe/Paris), format AAAA-MM-JJ. */
export function inDays(n: number): string {
  const parts = new Intl.DateTimeFormat("en-CA", { timeZone: "Europe/Paris", year: "numeric", month: "2-digit", day: "2-digit" }).format(new Date());
  const d = new Date(`${parts}T12:00:00Z`);
  d.setUTCDate(d.getUTCDate() + n);
  return d.toISOString().slice(0, 10);
}

const MONTHS = ["janvier", "février", "mars", "avril", "mai", "juin", "juillet", "août", "septembre", "octobre", "novembre", "décembre"];

/** Date civile en toutes lettres, sans année (« 11 janvier »), comme un visiteur l'écrirait. */
export function frenchDay(iso: string): string {
  const [, m, d] = iso.split("-").map(Number);
  return `${d} ${MONTHS[m! - 1]}`;
}

export async function dismissCookies(page: Page) {
  const refuse = page.getByRole("button", { name: "Tout refuser" });
  if (await refuse.isVisible().catch(() => false)) await refuse.click();
}

export async function login(page: Page, who = DEMO_USER) {
  await page.goto("/connexion");
  await dismissCookies(page);
  await page.getByLabel("Adresse email").fill(who.email);
  await page.getByLabel("Mot de passe").fill(who.password);
  await page.getByRole("button", { name: "Se connecter" }).click();
  await expect(page).toHaveURL(/\/compte/);
}

export async function noHorizontalOverflow(page: Page) {
  const overflow = await page.evaluate(() => document.documentElement.scrollWidth - document.documentElement.clientWidth);
  expect(overflow, "débordement horizontal").toBeLessThanOrEqual(0);
}
