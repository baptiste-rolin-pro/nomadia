/**
 * Garde-fous du webhook du prestataire de paiement de démonstration :
 * secret obligatoire en production (comme BETTER_AUTH_SECRET), aucun secret de repli connu,
 * route HTTP fermée hors mode DEMO ou sans secret explicitement configuré.
 * Aucun de ces cas n'écrit en base : la signature et la charge utile sont refusées avant tout accès.
 */
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

const KEYS = [
  "NOMADIA_SITE_ENV",
  "BETTER_AUTH_SECRET",
  "DEMO_WEBHOOK_SECRET",
  "FLIGHTS_PROVIDER_MODE",
  "HOTELS_PROVIDER_MODE",
  "CARS_PROVIDER_MODE",
  "NOMADIA_FIXED_NOW",
  "NOMADIA_DEV_MAILBOX",
  "NOMADIA_AUTH_RATE_LIMIT",
] as const;
type Key = (typeof KEYS)[number];

const OLD_FIXED_FALLBACK = "dev-only-demo-webhook-secret";
const CONFIGURED = "configured-demo-webhook-secret-0123456789";
const PROD_AUTH_SECRET = "prod-auth-secret-for-tests-0123456789abcdef";

let saved: Partial<Record<Key, string | undefined>> = {};

beforeEach(() => {
  saved = Object.fromEntries(KEYS.map((k) => [k, process.env[k]]));
  for (const k of KEYS) delete process.env[k];
  vi.resetModules();
});

afterEach(() => {
  for (const k of KEYS) {
    const v = saved[k];
    if (v === undefined) delete process.env[k];
    else process.env[k] = v;
  }
  vi.resetModules();
});

async function load(vars: Partial<Record<Key, string>>) {
  Object.assign(process.env, vars);
  const { env } = await import("@/lib/env");
  const { POST } = await import("@/app/api/demo/webhooks/payment/route");
  const { signPayload, SIGNATURE_HEADER } = await import("@/lib/payments/signature");
  const send = (body: string, header: string | null) =>
    POST(new Request("http://localhost/api/demo/webhooks/payment", { method: "POST", body, headers: header ? { [SIGNATURE_HEADER]: header } : {} }));
  const sign = (secret: string, body: string) => signPayload(secret, body, Math.floor(Date.now() / 1000));
  return { env, send, sign };
}

/** Événement « paiement réussi » forgé : il ne doit jamais atteindre le traitement métier. */
const forged = JSON.stringify({ id: "evt_forged_1", type: "payment.succeeded", created: 1, data: { paymentId: "dpi_x", bookingId: "bkg_x", amount: 1, currency: "EUR" } });

describe("webhook de paiement de démonstration : configuration", () => {
  it("production sans DEMO_WEBHOOK_SECRET : configuration refusée, la route ne répond jamais avec un secret de repli", async () => {
    const { env, send, sign } = await load({ NOMADIA_SITE_ENV: "production", BETTER_AUTH_SECRET: PROD_AUTH_SECRET });
    expect(() => env()).toThrow(/DEMO_WEBHOOK_SECRET est obligatoire/);
    await expect(send(forged, sign(OLD_FIXED_FALLBACK, forged))).rejects.toThrow(/DEMO_WEBHOOK_SECRET/);
  });

  it("production avec DEMO_WEBHOOK_SECRET : le secret configuré est utilisé", async () => {
    const { env } = await load({ NOMADIA_SITE_ENV: "production", BETTER_AUTH_SECRET: PROD_AUTH_SECRET, DEMO_WEBHOOK_SECRET: CONFIGURED });
    expect(env().DEMO_WEBHOOK_SECRET).toBe(CONFIGURED);
    expect(env().demoWebhookSecretSource).toBe("configured");
  });

  it("hors production sans secret : secret aléatoire propre au processus et route HTTP fermée (404)", async () => {
    const { env, send, sign } = await load({ FLIGHTS_PROVIDER_MODE: "demo", HOTELS_PROVIDER_MODE: "demo", CARS_PROVIDER_MODE: "demo" });
    const secret = env().DEMO_WEBHOOK_SECRET;
    expect(secret).not.toBe(OLD_FIXED_FALLBACK);
    expect(secret.length).toBeGreaterThanOrEqual(32);
    expect(env().demoWebhookSecretSource).toBe("generated");
    expect((await send(forged, sign(OLD_FIXED_FALLBACK, forged))).status).toBe(404);
    // Même signé avec le secret de repli du processus, un appel HTTP n'est pas accepté.
    expect((await send(forged, sign(secret, forged))).status).toBe(404);
  });

  it("aucun service en mode DEMO : route fermée (404) même avec une signature valide", async () => {
    const { send, sign } = await load({ DEMO_WEBHOOK_SECRET: CONFIGURED, FLIGHTS_PROVIDER_MODE: "sandbox", HOTELS_PROVIDER_MODE: "sandbox", CARS_PROVIDER_MODE: "live" });
    expect((await send(forged, sign(CONFIGURED, forged))).status).toBe(404);
  });

  it("mode DEMO et secret configuré : la route vérifie la signature", async () => {
    const { send, sign } = await load({ DEMO_WEBHOOK_SECRET: CONFIGURED, FLIGHTS_PROVIDER_MODE: "demo" });
    const bad = await send(forged, sign(OLD_FIXED_FALLBACK, forged));
    expect(bad.status).toBe(400);
    expect(await bad.json()).toEqual({ outcome: "invalid_signature" });
    expect((await send(forged, null)).status).toBe(400);
    // Signature valide mais charge utile invalide : refusée avant tout accès à la base.
    const body = JSON.stringify({ hello: "world" });
    const invalid = await send(body, sign(CONFIGURED, body));
    expect(invalid.status).toBe(400);
    expect(await invalid.json()).toEqual({ outcome: "invalid_payload" });
  });
});
