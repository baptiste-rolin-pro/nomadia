import { defineConfig, devices } from "@playwright/test";

/**
 * Tests de parcours. Prérequis : `npm run build` puis `npm run test:e2e:install` (navigateur Chromium).
 * Le serveur de test utilise une base PGlite dédiée (.data/pglite-e2e), recréée à chaque lancement.
 */
const PORT = 3100;
const env = {
  PGLITE_DATA_DIR: ".data/pglite-e2e",
  NOMADIA_SITE_URL: `http://localhost:${PORT}`,
  NOMADIA_SITE_ENV: "demo",
  NOMADIA_DEV_MAILBOX: "true",
  DEMO_WEBHOOK_SECRET: "e2e-webhook-secret-0123456789",
  BETTER_AUTH_SECRET: "e2e-secret-not-for-production-0123456789abcdef",
  DEMO_USER_PASSWORD: "voyage-demo-2026",
  DEMO_ADMIN_PASSWORD: "admin-demo-2026",
  // Plusieurs connexions successives depuis la même adresse : limitation de débit désactivée pour les tests uniquement.
  NOMADIA_AUTH_RATE_LIMIT: "off",
};

export default defineConfig({
  testDir: "tests/e2e",
  timeout: 60_000,
  expect: { timeout: 10_000 },
  fullyParallel: false,
  workers: 1,
  retries: 0,
  reporter: [["list"], ["html", { open: "never" }]],
  use: {
    baseURL: `http://localhost:${PORT}`,
    locale: "fr-FR",
    timezoneId: "Europe/Paris",
    trace: "retain-on-failure",
    screenshot: "only-on-failure",
  },
  projects: [{ name: "chromium", use: { ...devices["Desktop Chrome"] } }],
  webServer: {
    command: `npm run e2e:prepare && npx next start -p ${PORT}`,
    url: `http://localhost:${PORT}/`,
    timeout: 180_000,
    reuseExistingServer: false,
    env,
    stdout: "pipe",
    stderr: "pipe",
  },
});
