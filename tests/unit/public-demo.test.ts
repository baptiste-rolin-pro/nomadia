/**
 * Site de démonstration public (Vercel + Neon) sans collecte de données personnelles :
 * - configuration : NOMADIA_PUBLIC_SIGNUP fermé par défaut, garde-fous Vercel, URL publique par défaut ;
 * - fermeture CÔTÉ SERVEUR de l'inscription, de la réinitialisation par email et des modifications du compte
 *   partagé (routes HTTP Better Auth et appels serveur auth.api), réouverture avec NOMADIA_PUBLIC_SIGNUP=true ;
 * - sessions sans adresse IP ni user-agent ; formulaire de contact refusé ; adresses fictives ;
 * - chaîne de connexion PostgreSQL (TLS imposé, sslmode=disable / no-verify refusés à distance, aucune valeur journalisée).
 */
import { afterAll, afterEach, beforeAll, beforeEach, describe, expect, it, vi } from "vitest";
import { mkdtempSync, rmSync } from "node:fs";
import { tmpdir } from "node:os";
import path from "node:path";

const KEYS = [
  "NOMADIA_SITE_URL",
  "NOMADIA_SITE_ENV",
  "NOMADIA_PUBLIC_SIGNUP",
  "BETTER_AUTH_SECRET",
  "DEMO_WEBHOOK_SECRET",
  "DATABASE_URL",
  "NOMADIA_DEV_MAILBOX",
  "NOMADIA_AUTH_RATE_LIMIT",
  "DEMO_USER_PASSWORD",
  "VERCEL",
  "VERCEL_ENV",
  "VERCEL_URL",
  "VERCEL_BRANCH_URL",
  "VERCEL_PROJECT_PRODUCTION_URL",
] as const;
type Key = (typeof KEYS)[number];

const AUTH_SECRET = "unit-test-auth-secret-0123456789abcdefghij";
const dataDir = mkdtempSync(path.join(tmpdir(), "nomadia-demo-"));
process.env.PGLITE_DATA_DIR = dataDir;

let saved: Partial<Record<Key, string | undefined>> = {};

function resetAuth() {
  delete (globalThis as { __nomadiaAuth?: unknown }).__nomadiaAuth;
}

beforeEach(() => {
  saved = Object.fromEntries(KEYS.map((k) => [k, process.env[k]]));
  for (const k of KEYS) delete process.env[k];
  vi.resetModules();
  resetAuth();
});

afterEach(() => {
  for (const k of KEYS) {
    const v = saved[k];
    if (v === undefined) delete process.env[k];
    else process.env[k] = v;
  }
  vi.resetModules();
  resetAuth();
});

afterAll(async () => {
  const { closeDatabase } = await import("@/lib/db/client");
  await closeDatabase();
  rmSync(dataDir, { recursive: true, force: true });
});

describe("configuration du site de démonstration", () => {
  it("inscription publique fermée par défaut ; ouverte seulement avec NOMADIA_PUBLIC_SIGNUP=true", async () => {
    let { env } = await import("@/lib/env");
    expect(env().NOMADIA_PUBLIC_SIGNUP).toBe(false);
    vi.resetModules();
    process.env.NOMADIA_PUBLIC_SIGNUP = "true";
    ({ env } = await import("@/lib/env"));
    expect(env().NOMADIA_PUBLIC_SIGNUP).toBe(true);
  });

  it("Vercel : BETTER_AUTH_SECRET et DATABASE_URL obligatoires, même pour un aperçu", async () => {
    Object.assign(process.env, { VERCEL: "1", VERCEL_ENV: "preview", VERCEL_URL: "nomadia-abc.vercel.app", DATABASE_URL: "postgresql://u:p@ep-x-pooler.eu-central-1.aws.neon.tech/db?sslmode=require" });
    let { env } = await import("@/lib/env");
    expect(() => env()).toThrow(/BETTER_AUTH_SECRET est obligatoire/);
    vi.resetModules();
    process.env.BETTER_AUTH_SECRET = AUTH_SECRET;
    delete process.env.DATABASE_URL;
    ({ env } = await import("@/lib/env"));
    expect(() => env()).toThrow(/DATABASE_URL .* obligatoire sur Vercel/);
  });

  it("Vercel production : boîte mail de test et limitation de débit désactivée interdites", async () => {
    Object.assign(process.env, { VERCEL: "1", VERCEL_ENV: "production", VERCEL_PROJECT_PRODUCTION_URL: "nomadia.vercel.app", BETTER_AUTH_SECRET: AUTH_SECRET, DATABASE_URL: "postgresql://u:p@db.example.com/db" });
    let { env } = await import("@/lib/env");
    expect(env().NOMADIA_SITE_URL).toBe("https://nomadia.vercel.app");
    vi.resetModules();
    process.env.NOMADIA_DEV_MAILBOX = "true";
    ({ env } = await import("@/lib/env"));
    expect(() => env()).toThrow(/NOMADIA_DEV_MAILBOX/);
    vi.resetModules();
    delete process.env.NOMADIA_DEV_MAILBOX;
    process.env.NOMADIA_AUTH_RATE_LIMIT = "off";
    ({ env } = await import("@/lib/env"));
    expect(() => env()).toThrow(/NOMADIA_AUTH_RATE_LIMIT=off/);
  });

  it("URL publique : NOMADIA_SITE_URL prioritaire ; à défaut URL de branche Vercel pour un aperçu", async () => {
    Object.assign(process.env, { VERCEL: "1", VERCEL_ENV: "preview", VERCEL_URL: "nomadia-abc123.vercel.app", VERCEL_BRANCH_URL: "nomadia-git-feat.vercel.app", BETTER_AUTH_SECRET: AUTH_SECRET, DATABASE_URL: "postgresql://u:p@db.example.com/db" });
    let mod = await import("@/lib/env");
    expect(mod.siteUrl()).toBe("https://nomadia-git-feat.vercel.app");
    expect(mod.secureCookies()).toBe(true);
    vi.resetModules();
    process.env.NOMADIA_SITE_URL = "https://demo.nomadia.example/";
    mod = await import("@/lib/env");
    expect(mod.siteUrl()).toBe("https://demo.nomadia.example");
  });

  it("adresses fictives : seuls les domaines réservés (RFC 2606 / 6761) sont acceptés", async () => {
    const { isFictitiousEmail } = await import("@/lib/demo-site");
    for (const ok of ["voyageur@nomadia.test", "a@exemple.test", "x@example.com", "x@mail.example.org", "x@foo.example", "x@bar.invalid", "x@localhost"]) expect(isFictitiousEmail(ok), ok).toBe(true);
    for (const ko of ["camille@gmail.com", "x@example.com.evil.fr", "x@notexample.com", "x@test.fr", "pas-une-adresse", "@example.com"]) expect(isFictitiousEmail(ko), ko).toBe(false);
  });
});

describe("connexion PostgreSQL (Neon, serverless)", () => {
  it("TLS imposé et vérifié pour un hôte distant ; hôte local inchangé ; identifiants conservés", async () => {
    const { postgresConnectionString, pgPoolConfig, isPooledNeonUrl } = await import("@/lib/db/client");
    const neon = "postgresql://neondb_owner:p%40ss%2Fw0rd@ep-cool-1234-pooler.eu-central-1.aws.neon.tech/neondb?sslmode=require&channel_binding=require";
    const out = new URL(postgresConnectionString(neon));
    expect(out.searchParams.get("sslmode")).toBe("verify-full");
    expect(out.searchParams.get("channel_binding")).toBe("require");
    expect(out.password).toBe("p%40ss%2Fw0rd");
    expect(out.username).toBe("neondb_owner");
    expect(new URL(postgresConnectionString("postgres://u:p@db.example.com:5432/x")).searchParams.get("sslmode")).toBe("verify-full");
    // TLS désactivé (disable) ou certificat non vérifié (no-verify) : refusé pour un hôte distant, sans divulguer l'URL.
    for (const mode of ["disable", "no-verify"]) {
      const remote = `postgres://u:s3cret@db.example.com/x?sslmode=${mode}`;
      expect(() => postgresConnectionString(remote), mode).toThrow(new RegExp(`sslmode=${mode} refusé`));
      expect(() => postgresConnectionString(remote)).not.toThrow(/s3cret/);
      expect(() => pgPoolConfig(remote, {}), mode).toThrow(/sslmode/);
      // Hôte local : inchangé.
      for (const host of ["localhost", "127.0.0.1", "[::1]"]) {
        const local = `postgres://u:p@${host}:5432/x?sslmode=${mode}`;
        expect(postgresConnectionString(local)).toBe(local);
      }
    }
    expect(new URL(postgresConnectionString("postgres://u:p@db.example.com/x?sslmode=verify-full")).searchParams.get("sslmode")).toBe("verify-full");
    expect(postgresConnectionString("postgres://u:p@localhost:5432/x")).toBe("postgres://u:p@localhost:5432/x");
    expect(isPooledNeonUrl(neon)).toBe(true);
    expect(isPooledNeonUrl("postgresql://u:p@ep-cool-1234.eu-central-1.aws.neon.tech/neondb")).toBe(false);
    const serverless = pgPoolConfig(neon, { VERCEL: "1" });
    expect(serverless.max).toBe(5);
    expect(serverless.idleTimeoutMillis).toBeLessThanOrEqual(10_000);
    expect(serverless.connectionTimeoutMillis).toBeGreaterThan(0);
  });
});

async function authFor(vars: Partial<Record<Key, string>>) {
  Object.assign(process.env, { NOMADIA_SITE_URL: "http://localhost:3000", BETTER_AUTH_SECRET: AUTH_SECRET, ...vars });
  const { getAuth } = await import("@/lib/auth/auth");
  const { db } = await import("@/lib/db");
  const schema = await import("@/lib/db/schema");
  const auth = await getAuth();
  const database = await db();
  const call = (p: string, init: { method?: string; body?: unknown; headers?: Record<string, string> } = {}) =>
    auth.handler(
      new Request(`http://localhost:3000/api/auth${p}`, {
        method: init.method ?? "POST",
        headers: { "content-type": "application/json", origin: "http://localhost:3000", ...init.headers },
        body: init.method === "GET" ? undefined : JSON.stringify(init.body ?? {}),
      }),
    );
  return { auth, database, schema, call };
}

describe("authentification : comptes de démonstration partagés (NOMADIA_PUBLIC_SIGNUP=false)", () => {
  beforeAll(async () => {
    // Compte de démonstration avec mot de passe haché (comme le seed).
    process.env.NOMADIA_SITE_URL = "http://localhost:3000";
    const { db } = await import("@/lib/db");
    const schema = await import("@/lib/db/schema");
    const { hashPassword } = await import("better-auth/crypto");
    const database = await db();
    const now = new Date();
    await database.insert(schema.user).values({ id: "usr_demo_voyageur", name: "Camille (démo)", email: "voyageur@nomadia.test", emailVerified: true, createdAt: now, updatedAt: now });
    await database.insert(schema.account).values({ id: "acc_demo", accountId: "usr_demo_voyageur", providerId: "credential", userId: "usr_demo_voyageur", password: await hashPassword("voyage-demo-2026"), createdAt: now, updatedAt: now });
  }, 120_000);

  it("inscription refusée en HTTP (404) et par appel serveur, sans aucune écriture", async () => {
    const { auth, database, schema, call } = await authFor({});
    const before = (await database.select().from(schema.user)).length;
    const res = await call("/sign-up/email", { body: { name: "Réel", email: "vraie.personne@gmail.com", password: "phrase-de-passe-reelle" } });
    expect(res.status).toBe(404);
    await expect(auth.api.signUpEmail({ body: { name: "Réel", email: "vraie.personne@gmail.com", password: "phrase-de-passe-reelle" } })).rejects.toMatchObject({ status: "FORBIDDEN" });
    expect((await database.select().from(schema.user)).length).toBe(before);
    expect(await database.select().from(schema.emailOutbox)).toEqual([]);
  });

  it("réinitialisation par email refusée (demande, lien, nouveau mot de passe) : aucun email capturé", async () => {
    const { auth, database, schema, call } = await authFor({});
    expect((await call("/request-password-reset", { body: { email: "voyageur@nomadia.test", redirectTo: "/reinitialiser-mot-de-passe" } })).status).toBe(404);
    expect((await call("/reset-password", { body: { newPassword: "nouvelle-phrase-0001", token: "x" } })).status).toBe(404);
    expect((await call("/reset-password/abc?callbackURL=%2F", { method: "GET" })).status).toBe(403);
    await expect(auth.api.requestPasswordReset({ body: { email: "voyageur@nomadia.test" } })).rejects.toMatchObject({ status: "FORBIDDEN" });
    await expect(auth.api.sendVerificationEmail({ body: { email: "voyageur@nomadia.test" } })).rejects.toMatchObject({ status: "FORBIDDEN" });
    expect(await database.select().from(schema.emailOutbox)).toEqual([]);
  });

  it("connexion du compte de démonstration ; session sans IP ni user-agent ; compte partagé non modifiable", async () => {
    const { auth, database, schema, call } = await authFor({});
    const res = await call("/sign-in/email", { body: { email: "voyageur@nomadia.test", password: "voyage-demo-2026" }, headers: { "x-forwarded-for": "203.0.113.9", "user-agent": "Navigateur/1.0" } });
    expect(res.status).toBe(200);
    const sessions = await database.select().from(schema.session);
    expect(sessions.length).toBeGreaterThan(0);
    for (const s of sessions) {
      expect(s.ipAddress ?? "").toBe("");
      expect(s.userAgent ?? "").toBe("");
    }
    const cookie = res.headers.getSetCookie().map((c) => c.split(";")[0]).join("; ");
    const gets = new Set(["/list-sessions", "/list-accounts", "/account-info"]);
    for (const p of ["/change-password", "/change-email", "/update-user", "/delete-user", "/revoke-sessions", "/revoke-other-sessions", "/list-sessions", "/update-session", "/unlink-account", "/list-accounts", "/account-info"]) {
      const r = await call(p, { body: { currentPassword: "voyage-demo-2026", newPassword: "autre-phrase-0002", newEmail: "x@gmail.com", name: "Vrai Nom", accountId: "acc_demo" }, headers: { cookie }, method: gets.has(p) ? "GET" : "POST" });
      expect(r.status, p).toBe(404);
    }
    await expect(auth.api.listUserAccounts({ headers: new Headers({ cookie }) })).rejects.toMatchObject({ status: "FORBIDDEN" });
    await expect(auth.api.unlinkAccount({ body: { accountId: "acc_demo" }, headers: new Headers({ cookie }) })).rejects.toMatchObject({ status: "FORBIDDEN" });
    expect((await database.select().from(schema.account)).some((a) => a.userId === "usr_demo_voyageur" && a.providerId === "credential")).toBe(true);
    // La lecture de session (en-tête du site, pages du compte) reste ouverte.
    const current = await auth.api.getSession({ headers: new Headers({ cookie }) });
    expect(current?.user.email).toBe("voyageur@nomadia.test");
    expect((await call("/get-session", { method: "GET", headers: { cookie } })).status).toBe(200);
    await expect(auth.api.updateUser({ body: { name: "Vrai Nom" }, headers: new Headers({ cookie }) })).rejects.toMatchObject({ status: "FORBIDDEN" });
    await expect(auth.api.changePassword({ body: { currentPassword: "voyage-demo-2026", newPassword: "autre-phrase-0002" }, headers: new Headers({ cookie }) })).rejects.toMatchObject({ status: "FORBIDDEN" });
    const u = (await database.select().from(schema.user)).find((x) => x.id === "usr_demo_voyageur")!;
    expect(u.name).toBe("Camille (démo)");
    // Le mot de passe de test fonctionne toujours.
    expect((await call("/sign-in/email", { body: { email: "voyageur@nomadia.test", password: "voyage-demo-2026" } })).status).toBe(200);
  });

  it("formulaire de contact refusé côté serveur, rien n'est enregistré", async () => {
    Object.assign(process.env, { NOMADIA_SITE_URL: "http://localhost:3000" });
    const { sendContactAction } = await import("@/app/contact/actions");
    const form = new FormData();
    form.set("email", "vraie.personne@gmail.com");
    form.set("topic", "question");
    form.set("message", "Bonjour, ceci est un message réel.");
    const state = await sendContactAction({}, form);
    expect(state.ok).toBeUndefined();
    expect(state.errors?.email).toMatch(/désactivé/);
    const { db } = await import("@/lib/db");
    const schema = await import("@/lib/db/schema");
    expect(await (await db()).select().from(schema.contactMessages)).toEqual([]);
  });
});

describe("authentification : inscription publique ouverte (NOMADIA_PUBLIC_SIGNUP=true)", () => {
  it("inscription acceptée et email de vérification capturé (comportement complet conservé)", async () => {
    const { database, schema, call } = await authFor({ NOMADIA_PUBLIC_SIGNUP: "true" });
    const res = await call("/sign-up/email", { body: { name: "Testeur", email: "testeur@exemple.test", password: "phrase-de-passe-test", callbackURL: "/auth/verifie" } });
    expect(res.status).toBe(200);
    expect((await database.select().from(schema.user)).some((x) => x.email === "testeur@exemple.test")).toBe(true);
    await vi.waitFor(async () => {
      const mails = await database.select().from(schema.emailOutbox);
      expect(mails.some((m) => m.to === "testeur@exemple.test" && m.template === "verify_email")).toBe(true);
    });
    expect((await call("/request-password-reset", { body: { email: "testeur@exemple.test", redirectTo: "/reinitialiser-mot-de-passe" } })).status).toBe(200);
  });
});
