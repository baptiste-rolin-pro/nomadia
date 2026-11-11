/**
 * Tâches en exécution serverless (Vercel) : aucune exécution après la réponse, donc
 * - le tunnel progresse à la consultation (runDueJobs d'un dossier) ;
 * - une tâche abandonnée (« running » au-delà du bail) redevient exécutable, une seule fois par instance ;
 * - un traitement fournisseur interrompu après la prise du dossier passe en « inconnu » puis est réconcilié,
 *   sans seconde réservation ;
 * - /api/jobs/run n'accepte que CRON_SECRET (Vercel Cron, GET) ou NOMADIA_JOB_RUNNER_TOKEN.
 * Ainsi que l'email de contact fictif imposé sur le site de démonstration public.
 */
import { afterAll, beforeAll, describe, expect, it } from "vitest";
import { mkdtempSync, rmSync } from "node:fs";
import { tmpdir } from "node:os";
import path from "node:path";

const dataDir = mkdtempSync(path.join(tmpdir(), "nomadia-jobs-"));
process.env.PGLITE_DATA_DIR = dataDir;
process.env.DEMO_WEBHOOK_SECRET = "unit-test-webhook-secret-123456";
process.env.FLIGHTS_PROVIDER_MODE = "demo";
process.env.HOTELS_PROVIDER_MODE = "demo";
process.env.CARS_PROVIDER_MODE = "demo";
process.env.NOMADIA_SITE_URL = "http://localhost:3000";
process.env.CRON_SECRET = "cron-secret-for-unit-tests-0123";
process.env.NOMADIA_JOB_RUNNER_TOKEN = "runner-token-for-unit-tests-0123";
delete process.env.NOMADIA_PUBLIC_SIGNUP; // site de démonstration public (défaut)

type Service = typeof import("@/lib/booking/service");
let svc: Service;
let jobsMod: typeof import("@/lib/jobs");
let database: Awaited<ReturnType<typeof import("@/lib/db")["db"]>>;
let schema: typeof import("@/lib/db/schema");
let flightRef: string;
const alice = { user: { id: "u_alice", name: "Alice", email: "alice@example.test", emailVerified: true, role: "user" }, anonHash: null };
const adult = [{ type: "adult" as const, firstName: "Camille", lastName: "Durand", birthDate: "1991-05-04" }];

function advance(ms: number) {
  const base = process.env.NOMADIA_FIXED_NOW ? Date.parse(process.env.NOMADIA_FIXED_NOW) : Date.now();
  process.env.NOMADIA_FIXED_NOW = new Date(base + ms).toISOString();
}

beforeAll(async () => {
  const { db } = await import("@/lib/db");
  schema = await import("@/lib/db/schema");
  database = await db();
  await database.insert(schema.user).values([{ id: "u_alice", name: "Alice", email: "alice@example.test", emailVerified: true }]);
  svc = await import("@/lib/booking/service");
  jobsMod = await import("@/lib/jobs");
  const { generateFlightOffers } = await import("@/lib/providers/demo/flights");
  const { today } = await import("@/lib/clock");
  const { addDays } = await import("@/lib/dates");
  const offers = generateFlightOffers({ originAirports: ["CDG"], destinationAirports: ["LIS"], departDate: addDays(today(), 40), returnDate: addDays(today(), 44), adults: 1, childrenAges: [], infants: 0, cabin: "economy", generatedAtSec: Math.floor(Date.now() / 1000) });
  flightRef = offers.find((o) => o.fare.code === "FLEX" && !o.separateTickets)!.id;
}, 120_000);

afterAll(async () => {
  const { closeDatabase } = await import("@/lib/db/client");
  await closeDatabase();
  rmSync(dataDir, { recursive: true, force: true });
});

async function eqFn() {
  return (await import("drizzle-orm")).eq;
}

async function paidFlight(): Promise<string> {
  const { bookingId } = await svc.startBooking({ offerRef: flightRef, tripItemId: null }, alice);
  expect((await svc.saveTravelers(bookingId, alice, null, { travelers: adult, contactEmail: "alice@example.test", saveToAccount: false })).issues).toEqual([]);
  await svc.saveOptions(bookingId, alice, null, []);
  expect((await svc.submitReview(bookingId, alice, null, { termsAccepted: true, scenario: null })).state).toBe("payment");
  await svc.payBooking(bookingId, alice, null, svc.newPaymentAttemptKey(bookingId));
  return bookingId;
}

describe("site de démonstration public : données saisies dans le tunnel", () => {
  it("email de contact réel refusé ; adresse fictive acceptée ; aucun voyageur enregistré dans le compte partagé", async () => {
    const { bookingId } = await svc.startBooking({ offerRef: flightRef, tripItemId: null }, alice);
    const refused = await svc.saveTravelers(bookingId, alice, null, { travelers: adult, contactEmail: "camille.durand@gmail.com", saveToAccount: true });
    expect(refused.issues.map((i) => i.message).join(" ")).toMatch(/adresse fictive/);
    const eq = await eqFn();
    expect((await database.select().from(schema.bookings).where(eq(schema.bookings.id, bookingId)))[0]!.contactEmail).toBe("alice@example.test");
    expect((await svc.saveTravelers(bookingId, alice, null, { travelers: adult, contactEmail: "camille@exemple.test", saveToAccount: true })).issues).toEqual([]);
    expect(await database.select().from(schema.savedTravelers)).toEqual([]);
  });
});

describe("tâches sans serveur permanent", () => {
  it("tunnel complet par consultations successives (aucun processus de fond) jusqu'à l'émission", async () => {
    const id = await paidFlight();
    const eq = await eqFn();
    let row = (await database.select().from(schema.bookings).where(eq(schema.bookings.id, id)))[0]!;
    expect(row.paymentStatus).toBe("paid");
    expect(row.providerStatus).toBe("confirmed");
    advance(6000);
    await svc.refreshStatus(id, alice, null); // équivalent de l'actualisation automatique de la page
    row = (await database.select().from(schema.bookings).where(eq(schema.bookings.id, id)))[0]!;
    expect(row.providerStatus).toBe("ticketed");
  });

  it("tâche « running » abandonnée : reprise après expiration du bail, jamais avant", async () => {
    const id = await paidFlight();
    const eq = await eqFn();
    const { nowMs } = await import("@/lib/clock");
    await database.delete(schema.jobs).where(eq(schema.jobs.uniqueKey, `reconcile:${id}`));
    const job = { type: "reconcile_booking", payload: { bookingId: id }, runAfter: new Date(nowMs() - 60_000), attempts: 1 };
    // Bail encore valide : la tâche n'est pas reprise.
    await database.insert(schema.jobs).values({ ...job, id: `job_fresh_${id}`, uniqueKey: `reconcile:${id}`, status: "running", updatedAt: new Date(nowMs() - 60_000) });
    expect(await jobsMod.runDueJobs({ bookingId: id })).toBe(0);
    // Bail expiré : reprise, une seule fois même avec deux exécutions simultanées.
    await database.update(schema.jobs).set({ updatedAt: new Date(nowMs() - jobsMod.RUNNING_LEASE_MS - 1000) }).where(eq(schema.jobs.id, `job_fresh_${id}`));
    const [a, b] = await Promise.all([jobsMod.runDueJobs({ bookingId: id }), jobsMod.runDueJobs({ bookingId: id })]);
    expect(a + b).toBe(1);
    const after = (await database.select().from(schema.jobs).where(eq(schema.jobs.id, `job_fresh_${id}`)))[0]!;
    expect(after.attempts).toBe(2);
    expect(after.status).not.toBe("running");
  });

  it("tâche abandonnée trop souvent : échec définitif, pas de nouvelle exécution", async () => {
    const id = await paidFlight();
    const eq = await eqFn();
    const { nowMs } = await import("@/lib/clock");
    await database.delete(schema.jobs).where(eq(schema.jobs.uniqueKey, `reconcile:${id}`));
    // Quatre expirations de bail déjà constatées : la cinquième rend la tâche définitivement en échec.
    await database.insert(schema.jobs).values({ id: `job_dead_${id}`, type: "reconcile_booking", uniqueKey: `reconcile:${id}`, payload: { bookingId: id }, status: "running", runAfter: new Date(nowMs() - 60_000), attempts: 5, leaseExpirations: jobsMod.MAX_LEASE_EXPIRATIONS - 1, updatedAt: new Date(nowMs() - jobsMod.RUNNING_LEASE_MS - 1000) });
    expect(await jobsMod.runDueJobs({ bookingId: id })).toBe(0);
    expect((await database.select().from(schema.jobs).where(eq(schema.jobs.id, `job_dead_${id}`)))[0]!.status).toBe("failed");
  });

  it("tâche relancée normalement de nombreuses fois puis abandonnée : reprise après le bail, pas d'échec immédiat", async () => {
    const id = await paidFlight();
    const eq = await eqFn();
    const { nowMs } = await import("@/lib/clock");
    await database.delete(schema.jobs).where(eq(schema.jobs.uniqueKey, `reconcile:${id}`));
    const jobId = `job_retried_${id}`;
    // Relances normales (retryInMs / rescheduleJob) : `attempts` augmente, le compteur de bail non.
    await database.insert(schema.jobs).values({ id: jobId, type: "reconcile_booking", uniqueKey: `reconcile:${id}`, payload: { bookingId: id }, status: "pending", runAfter: new Date(nowMs() - 60_000), attempts: 3, updatedAt: new Date(nowMs() - 60_000) });
    for (let i = 0; i < 4; i++) {
      await jobsMod.rescheduleJob(`reconcile:${id}`, 0);
      await database.update(schema.jobs).set({ runAfter: new Date(nowMs() - 1000) }).where(eq(schema.jobs.id, jobId));
      await jobsMod.runDueJobs({ bookingId: id });
    }
    let row = (await database.select().from(schema.jobs).where(eq(schema.jobs.id, jobId)))[0]!;
    expect(row.attempts).toBeGreaterThanOrEqual(7);
    expect(row.leaseExpirations).toBe(0);
    // Exécution abandonnée (fonction arrêtée) : reprise après expiration du bail, sans échec définitif.
    await database.update(schema.jobs).set({ status: "running", updatedAt: new Date(nowMs() - jobsMod.RUNNING_LEASE_MS - 1000) }).where(eq(schema.jobs.id, jobId));
    expect(await jobsMod.runDueJobs({ bookingId: id })).toBe(1);
    row = (await database.select().from(schema.jobs).where(eq(schema.jobs.id, jobId)))[0]!;
    expect(row.status).not.toBe("failed");
    expect(row.status).not.toBe("running");
    expect(row.leaseExpirations).toBe(1);
    expect(row.lastError).toBeNull();
  });

  it("traitement fournisseur interrompu après la prise du dossier : statut inconnu, réconciliation, aucune seconde réservation", async () => {
    const id = await paidFlight();
    const eq = await eqFn();
    const { nowMs } = await import("@/lib/clock");
    // Simule une fonction arrêtée entre la prise du dossier (« pending ») et la fin du traitement.
    const stale = new Date(nowMs() - jobsMod.RUNNING_LEASE_MS - 1000);
    await database.update(schema.bookings).set({ providerStatus: "pending", step: "processing", updatedAt: stale }).where(eq(schema.bookings.id, id));
    await database.delete(schema.jobs).where(eq(schema.jobs.uniqueKey, `reconcile:${id}`));
    await database.update(schema.jobs).set({ status: "running", updatedAt: stale }).where(eq(schema.jobs.uniqueKey, `provider_book:${id}`));
    expect(await jobsMod.runDueJobs({ bookingId: id })).toBe(1);
    let row = (await database.select().from(schema.bookings).where(eq(schema.bookings.id, id)))[0]!;
    expect(row.providerStatus).toBe("unknown");
    const incidents = await database.select().from(schema.incidents).where(eq(schema.incidents.bookingId, id));
    expect(incidents.some((i) => i.kind === "provider_outcome_unknown" && i.status === "open")).toBe(true);
    advance(4000);
    await svc.refreshStatus(id, alice, null);
    row = (await database.select().from(schema.bookings).where(eq(schema.bookings.id, id)))[0]!;
    expect(["confirmed", "ticketed"]).toContain(row.providerStatus);
    expect(await database.select().from(schema.demoProviderRecords).where(eq(schema.demoProviderRecords.idempotencyKey, `book:${id}`))).toHaveLength(1);
  });
});

describe("/api/jobs/run (Vercel Cron et ordonnanceur externe)", () => {
  it("401 sans jeton ou avec un mauvais jeton ; GET avec CRON_SECRET et POST avec NOMADIA_JOB_RUNNER_TOKEN acceptés", async () => {
    const { GET, POST } = await import("@/app/api/jobs/run/route");
    const req = (method: string, auth?: string) => new Request("http://localhost:3000/api/jobs/run", { method, headers: auth ? { authorization: auth } : {} });
    expect((await GET(req("GET"))).status).toBe(401);
    expect((await GET(req("GET", "Bearer mauvais-jeton-mauvais-jeton"))).status).toBe(401);
    expect((await POST(req("POST", `Bearer ${process.env.CRON_SECRET}x`))).status).toBe(401);
    const cron = await GET(req("GET", `Bearer ${process.env.CRON_SECRET}`));
    expect(cron.status).toBe(200);
    expect(await cron.json()).toHaveProperty("processed");
    expect((await POST(req("POST", `Bearer ${process.env.NOMADIA_JOB_RUNNER_TOKEN}`))).status).toBe(200);
  });
});
