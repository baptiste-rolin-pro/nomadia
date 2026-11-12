import { defineConfig, devices } from "@playwright/test";

/**
 * Tests de parcours. Prérequis : `npm run build` puis `npm run test:e2e:install` (navigateur Chromium).
 * Deux serveurs `next start` sur le même build, chacun avec sa base PGlite dédiée recréée à chaque lancement :
 * - :3100 « site de démonstration public » (configuration Vercel : NOMADIA_PUBLIC_SIGNUP=false, pas de boîte
 *   mail de test) — tous les parcours sauf l'inscription ;
 * - :3101 « inscription publique ouverte » (NOMADIA_PUBLIC_SIGNUP=true + boîte mail de test) — inscription,
 *   vérification d'adresse, reconnexion.
 * DATABASE_URL est forcée à vide : une base PostgreSQL de `.env.local` n'est jamais utilisée par ces tests.
 * Assistant : ANTHROPIC_API_KEY forcée à vide (aucun appel réel). L'analyse locale répond sur les deux serveurs ;
 * :3100 a en plus un repli SIMULÉ (NOMADIA_ASSISTANT_MOCK=e2e, refusé sur Vercel et en production) pour les
 * demandes non comprises (tests/e2e/assistant.spec.ts) ; :3101 n'a ni clé ni simulation : l'assistant y fonctionne
 * de bout en bout sans aucun service extérieur (tests/e2e/assistant-local.spec.ts).
 */
const PORT = 3100;
const OPEN_PORT = 3101;
const common = {
  NOMADIA_SITE_ENV: "demo",
  DATABASE_URL: "",
  DATABASE_URL_UNPOOLED: "",
  DEMO_WEBHOOK_SECRET: "e2e-webhook-secret-0123456789",
  BETTER_AUTH_SECRET: "e2e-secret-not-for-production-0123456789abcdef",
  DEMO_USER_PASSWORD: "voyage-demo-2026",
  DEMO_ADMIN_PASSWORD: "admin-demo-2026",
  // Plusieurs connexions successives depuis la même adresse : limitation de débit désactivée pour les tests uniquement.
  NOMADIA_AUTH_RATE_LIMIT: "off",
  ANTHROPIC_API_KEY: "",
};
const OPEN_SERVER_SPECS = /(signup-open|assistant-local)\.spec\.ts/;

/**
 * Fenêtre « À propos de la démo » déjà fermée (clé de src/lib/demo-notice.ts) : les parcours ne la voient pas.
 * tests/e2e/demo-notice.spec.ts repart d'un navigateur vierge pour la tester.
 * L'écran d'accueil « avion » (sessionStorage, hors de portée de `storageState`) est marqué comme vu par
 * tests/e2e/fixtures.ts (option `introSeen`, vraie par défaut) : les specs importent `test` depuis ce fichier.
 */
const demoNoticeSeen = (origin: string) => ({
  cookies: [],
  origins: [{ origin, localStorage: [{ name: "nomadia:demo-notice", value: "vu-v1" }] }],
});

export default defineConfig({
  testDir: "tests/e2e",
  timeout: 60_000,
  expect: { timeout: 10_000 },
  fullyParallel: false,
  workers: 1,
  retries: 0,
  reporter: [["list"], ["html", { open: "never" }]],
  use: {
    locale: "fr-FR",
    timezoneId: "Europe/Paris",
    trace: "retain-on-failure",
    screenshot: "only-on-failure",
  },
  projects: [
    { name: "demo-publique", testIgnore: OPEN_SERVER_SPECS, use: { ...devices["Desktop Chrome"], baseURL: `http://localhost:${PORT}`, storageState: demoNoticeSeen(`http://localhost:${PORT}`) } },
    { name: "inscription-ouverte", testMatch: OPEN_SERVER_SPECS, use: { ...devices["Desktop Chrome"], baseURL: `http://localhost:${OPEN_PORT}`, storageState: demoNoticeSeen(`http://localhost:${OPEN_PORT}`) } },
  ],
  webServer: [
    {
      command: `npm run e2e:prepare && npx next start -p ${PORT}`,
      url: `http://localhost:${PORT}/`,
      timeout: 180_000,
      reuseExistingServer: false,
      env: {
        ...common,
        PGLITE_DATA_DIR: ".data/pglite-e2e",
        NOMADIA_SITE_URL: `http://localhost:${PORT}`,
        NOMADIA_PUBLIC_SIGNUP: "false",
        NOMADIA_DEV_MAILBOX: "false",
        NOMADIA_ASSISTANT_MOCK: "e2e",
        // Tous les parcours partagent une adresse : limites par visiteur relevées (les limites elles-mêmes sont testées par Vitest).
        NOMADIA_ASSISTANT_IP_HOURLY_LIMIT: "500",
        NOMADIA_ASSISTANT_LOCAL_HOURLY_LIMIT: "1000",
      },
      stdout: "pipe",
      stderr: "pipe",
    },
    {
      command: `npm run e2e:prepare && npx next start -p ${OPEN_PORT}`,
      url: `http://localhost:${OPEN_PORT}/`,
      timeout: 180_000,
      reuseExistingServer: false,
      env: { ...common, PGLITE_DATA_DIR: ".data/pglite-e2e-open", NOMADIA_SITE_URL: `http://localhost:${OPEN_PORT}`, NOMADIA_PUBLIC_SIGNUP: "true", NOMADIA_DEV_MAILBOX: "true", NOMADIA_ASSISTANT_MOCK: "off" },
      stdout: "pipe",
      stderr: "pipe",
    },
  ],
});
