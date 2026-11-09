/**
 * Tests d'intégration du tunnel (base PGlite temporaire, fournisseur et paiement de démonstration) :
 * idempotence, double soumission, événements reçus deux fois, prix modifié, devis expiré,
 * paiement refusé, paiement réussi + réservation échouée, délai dépassé + réconciliation, accès,
 * un seul paiement actif par réservation (clés différentes simultanées), devis expiré au paiement.
 */
import { afterAll, beforeAll, describe, expect, it } from "vitest";
import { mkdtempSync, rmSync } from "node:fs";
import { tmpdir } from "node:os";
import path from "node:path";

const dataDir = mkdtempSync(path.join(tmpdir(), "nomadia-test-"));
process.env.PGLITE_DATA_DIR = dataDir;
process.env.DEMO_WEBHOOK_SECRET = "unit-test-webhook-secret-123456";
process.env.FLIGHTS_PROVIDER_MODE = "demo";
process.env.HOTELS_PROVIDER_MODE = "demo";
process.env.CARS_PROVIDER_MODE = "demo";
process.env.NOMADIA_SITE_URL = "http://localhost:3000";

type Service = typeof import("@/lib/booking/service");
let svc: Service;
let database: Awaited<ReturnType<typeof import("@/lib/db")["db"]>>;
let schema: typeof import("@/lib/db/schema");
let flightRef: string;
let hotelRef: string;
const alice = { user: { id: "u_alice", name: "Alice", email: "alice@example.test", emailVerified: true, role: "user" }, anonHash: null };
const bob = { user: { id: "u_bob", name: "Bob", email: "bob@example.test", emailVerified: true, role: "user" }, anonHash: null };

function advance(ms: number) {
  const base = process.env.NOMADIA_FIXED_NOW ? Date.parse(process.env.NOMADIA_FIXED_NOW) : Date.now();
  process.env.NOMADIA_FIXED_NOW = new Date(base + ms).toISOString();
}

beforeAll(async () => {
  const { db } = await import("@/lib/db");
  schema = await import("@/lib/db/schema");
  database = await db();
  await database.insert(schema.user).values([
    { id: "u_alice", name: "Alice", email: "alice@example.test", emailVerified: true },
    { id: "u_bob", name: "Bob", email: "bob@example.test", emailVerified: true },
  ]);
  svc = await import("@/lib/booking/service");
  const { generateFlightOffers } = await import("@/lib/providers/demo/flights");
  const { buildRateOffer } = await import("@/lib/providers/demo/hotels");
  const { today } = await import("@/lib/clock");
  const { addDays } = await import("@/lib/dates");
  const dep = addDays(today(), 40);
  const ret = addDays(today(), 44);
  const offers = generateFlightOffers({ originAirports: ["CDG"], destinationAirports: ["LIS"], departDate: dep, returnDate: ret, adults: 1, childrenAges: [], infants: 0, cabin: "economy", generatedAtSec: Math.floor(Date.now() / 1000) });
  flightRef = offers.find((o) => o.fare.code === "FLEX" && !o.separateTickets)!.id;
  hotelRef = buildRateOffer({ h: "lis-tejo-azul", r: "classic", p: "flex", ci: dep, co: ret, rooms: [{ adults: 1, childrenAges: [] }], t: Math.floor(Date.now() / 1000) }).id;
}, 120_000);

afterAll(async () => {
  const { closeDatabase } = await import("@/lib/db/client");
  await closeDatabase();
  rmSync(dataDir, { recursive: true, force: true });
});

async function bookToReview(ref = flightRef, viewer = alice) {
  const { bookingId } = await svc.startBooking({ offerRef: ref, tripItemId: null }, viewer);
  const view = (await svc.getBookingView(bookingId, viewer, null))!;
  const travelers = view.bookable.travelers.kind === "guests" ? [{ type: "guest" as const, firstName: "Alice", lastName: "Durand", birthDate: null }] : [{ type: "adult" as const, firstName: "Alice", lastName: "Durand", birthDate: "1990-04-02" }];
  expect((await svc.saveTravelers(bookingId, viewer, null, { travelers, contactEmail: "alice@example.test", saveToAccount: false })).issues).toEqual([]);
  await svc.saveOptions(bookingId, viewer, null, []);
  return bookingId;
}

async function bookingRow(id: string) {
  const { eq } = await import("drizzle-orm");
  return (await database.select().from(schema.bookings).where(eq(schema.bookings.id, id)))[0]!;
}

describe("tunnel de réservation (démonstration)", () => {
  it("parcours nominal : paiement, confirmation, émission différée, email unique ; double clic sans double paiement", async () => {
    const id = await bookToReview();
    expect((await svc.submitReview(id, alice, null, { termsAccepted: true, scenario: "nominal" })).state).toBe("payment");
    const key = svc.newPaymentAttemptKey(id);
    const [a, b] = await Promise.all([svc.payBooking(id, alice, null, key), svc.payBooking(id, alice, null, key)]);
    expect([a.paymentStatus, b.paymentStatus]).toContain("succeeded");
    // Rechargement de la page : nouvelle clé, mais aucun second paiement.
    await svc.payBooking(id, alice, null, svc.newPaymentAttemptKey(id));
    const { eq } = await import("drizzle-orm");
    expect(await database.select().from(schema.payments).where(eq(schema.payments.bookingId, id))).toHaveLength(1);
    let row = await bookingRow(id);
    expect(row.paymentStatus).toBe("paid");
    expect(row.providerStatus).toBe("confirmed");
    expect(row.documentStatus).toBe("available");
    expect(await database.select().from(schema.demoProviderRecords).where(eq(schema.demoProviderRecords.idempotencyKey, `book:${id}`))).toHaveLength(1);
    advance(6000);
    await svc.refreshStatus(id, alice, null);
    row = await bookingRow(id);
    expect(row.providerStatus).toBe("ticketed");
    const mails = await database.select().from(schema.emailOutbox).where(eq(schema.emailOutbox.dedupeKey, `booking-confirmed:${id}`));
    expect(mails).toHaveLength(1);
  });

  it("un événement de paiement reçu deux fois n'a qu'un effet ; une signature invalide est refusée", async () => {
    const { handlePspEvent } = await import("@/lib/payments/webhook");
    const { signPayload } = await import("@/lib/payments/signature");
    const { eq } = await import("drizzle-orm");
    const payment = (await database.select().from(schema.payments).limit(1))[0]!;
    const body = JSON.stringify({ id: "evt_replay_1", type: "payment.succeeded", created: 1, data: { paymentId: payment.pspPaymentId, bookingId: payment.bookingId, amount: payment.amount, currency: payment.currency } });
    const ts = Math.floor(Date.parse(process.env.NOMADIA_FIXED_NOW ?? new Date().toISOString()) / 1000);
    const header = signPayload(process.env.DEMO_WEBHOOK_SECRET!, body, ts);
    const first = await handlePspEvent(body, header);
    const second = await handlePspEvent(body, header);
    expect(first.outcome).toBe("ignored_stale"); // paiement déjà réussi : aucun retour en arrière
    expect(second.outcome).toBe("duplicate");
    expect(await database.select().from(schema.receivedEvents).where(eq(schema.receivedEvents.eventId, "evt_replay_1"))).toHaveLength(1);
    expect((await handlePspEvent(body, "t=1,v1=deadbeef")).outcome).toBe("invalid_signature");
  });

  it("prix modifié : nouveau devis et acceptation explicite avant paiement", async () => {
    const id = await bookToReview();
    const res = await svc.submitReview(id, alice, null, { termsAccepted: true, scenario: "prix-modifie" });
    expect(res.state).toBe("price_changed");
    if (res.state === "price_changed") expect(res.newTotal).toBeGreaterThan(res.previousTotal);
    // Sans acceptation, la validation reste bloquée.
    expect((await svc.submitReview(id, alice, null, { termsAccepted: true, scenario: "prix-modifie" })).state).toBe("price_changed");
    await svc.acceptPriceChange(id, alice, null);
    expect((await svc.submitReview(id, alice, null, { termsAccepted: true, scenario: "prix-modifie" })).state).toBe("payment");
    const row = await bookingRow(id);
    expect(row.totalAmount).toBe(res.state === "price_changed" ? res.newTotal : -1);
  });

  it("devis expiré : actualisation en conservant les voyageurs", async () => {
    const id = await bookToReview();
    expect((await svc.submitReview(id, alice, null, { termsAccepted: true, scenario: "devis-expire" })).state).toBe("expired");
    const refreshed = await svc.refreshQuote(id, alice, null);
    expect(refreshed.state).toBe("refreshed");
    const row = await bookingRow(id);
    expect((row.travelers as { lastName: string }[])[0]!.lastName).toBe("Durand");
    expect((await svc.submitReview(id, alice, null, { termsAccepted: true, scenario: null })).state).toBe("payment");
  });

  it("paiement refusé : aucune réservation transmise, nouvelle tentative possible", async () => {
    const id = await bookToReview();
    await svc.submitReview(id, alice, null, { termsAccepted: true, scenario: "paiement-refuse" });
    expect((await svc.payBooking(id, alice, null, svc.newPaymentAttemptKey(id))).paymentStatus).toBe("declined");
    let row = await bookingRow(id);
    expect(row.providerStatus).toBe("not_started");
    await svc.payBooking(id, alice, null, svc.newPaymentAttemptKey(id));
    row = await bookingRow(id);
    expect(row.paymentStatus).toBe("paid");
    expect(row.providerStatus).toBe("confirmed");
  });

  it("paiement réussi mais réservation refusée : incident, remboursement demandé puis confirmé", async () => {
    const id = await bookToReview();
    await svc.submitReview(id, alice, null, { termsAccepted: true, scenario: "reservation-echouee" });
    await svc.payBooking(id, alice, null, svc.newPaymentAttemptKey(id));
    let row = await bookingRow(id);
    expect(row.providerStatus).toBe("failed");
    expect(row.paymentStatus).toBe("refund_requested");
    const { eq } = await import("drizzle-orm");
    expect((await database.select().from(schema.incidents).where(eq(schema.incidents.bookingId, id)))[0]?.kind).toBe("paid_booking_failed");
    advance(6000);
    await svc.refreshStatus(id, alice, null);
    row = await bookingRow(id);
    expect(row.paymentStatus).toBe("refunded");
  });

  it("délai dépassé : statut inconnu puis réconciliation, sans seconde réservation", async () => {
    const id = await bookToReview();
    await svc.submitReview(id, alice, null, { termsAccepted: true, scenario: "resultat-incertain" });
    await svc.payBooking(id, alice, null, svc.newPaymentAttemptKey(id));
    let row = await bookingRow(id);
    expect(row.providerStatus).toBe("unknown");
    advance(4000);
    await svc.refreshStatus(id, alice, null);
    row = await bookingRow(id);
    expect(["confirmed", "ticketed"]).toContain(row.providerStatus);
    const { eq } = await import("drizzle-orm");
    expect(await database.select().from(schema.demoProviderRecords).where(eq(schema.demoProviderRecords.idempotencyKey, `book:${id}`))).toHaveLength(1);
  });

  it("hôtel remboursable : paiement, puis annulation avec frais explicitement acceptés", async () => {
    const id = await bookToReview(hotelRef);
    expect((await svc.submitReview(id, alice, null, { termsAccepted: true, scenario: "annulation-frais" })).state).toBe("payment");
    await svc.payBooking(id, alice, null, svc.newPaymentAttemptKey(id));
    const preview = (await svc.cancellationPreview(id, alice, null))!;
    expect(preview.fee.amount).toBeGreaterThan(0);
    await expect(svc.cancelBooking(id, alice, null, { acceptedFee: preview.fee.amount - 1 })).rejects.toThrow();
    await svc.cancelBooking(id, alice, null, { acceptedFee: preview.fee.amount });
    const row = await bookingRow(id);
    expect(row.providerStatus).toBe("cancelled");
    expect(row.cancellationFee).toBe(preview.fee.amount);
    expect(row.paymentStatus).toBe("refund_requested");
  });

  it("une réservation n'est pas accessible à un autre utilisateur ni par son seul identifiant", async () => {
    const id = await bookToReview();
    expect(await svc.getBookingView(id, bob, null)).toBeNull();
    expect(await svc.getBookingView(id, { user: null, anonHash: null }, null)).toBeNull();
    await expect(svc.saveOptions(id, bob, null, [])).rejects.toThrow();
  });

  it("réservation invitée : lien opaque requis, rattachement par possession du lien", async () => {
    const guestViewer = { user: null, anonHash: null };
    const { bookingId, guestToken } = await svc.startBooking({ offerRef: flightRef, tripItemId: null }, guestViewer);
    expect(guestToken).toBeTruthy();
    expect(await svc.getBookingView(bookingId, guestViewer, null)).toBeNull();
    expect(await svc.getBookingView(bookingId, guestViewer, "jeton-incorrect-jeton-incorrect")).toBeNull();
    expect(await svc.getBookingView(bookingId, guestViewer, guestToken)).not.toBeNull();
    expect(await svc.claimGuestBooking(bookingId, bob, "jeton-incorrect-jeton-incorrect")).toBe(false);
    expect(await svc.claimGuestBooking(bookingId, bob, guestToken)).toBe(true);
    expect(await svc.getBookingView(bookingId, bob, null)).not.toBeNull();
  });
});

function errorChain(err: unknown): string {
  const parts: string[] = [];
  for (let e: unknown = err; e instanceof Error; e = e.cause) parts.push(e.message);
  return parts.join(" | ");
}

describe("paiement : unicité par réservation et échéance du devis", () => {
  it("paiements simultanés avec des clés différentes (plusieurs onglets) : un seul paiement pour la réservation", async () => {
    const id = await bookToReview();
    expect((await svc.submitReview(id, alice, null, { termsAccepted: true, scenario: null })).state).toBe("payment");
    const keys = [svc.newPaymentAttemptKey(id), svc.newPaymentAttemptKey(id), svc.newPaymentAttemptKey(id)];
    const results = await Promise.all(keys.map((k) => svc.payBooking(id, alice, null, k)));
    expect(results.map((r) => r.paymentStatus)).toContain("succeeded");
    const { eq } = await import("drizzle-orm");
    expect(await database.select().from(schema.payments).where(eq(schema.payments.bookingId, id))).toHaveLength(1);
    const row = await bookingRow(id);
    expect(row.paymentStatus).toBe("paid");
    expect(row.providerStatus).toBe("confirmed");
    expect(await database.select().from(schema.demoProviderRecords).where(eq(schema.demoProviderRecords.idempotencyKey, `book:${id}`))).toHaveLength(1);
    // Nouvelle soumission de chaque clé (rechargement, double clic) : toujours aucun second paiement.
    for (const k of keys) await svc.payBooking(id, alice, null, k);
    expect(await database.select().from(schema.payments).where(eq(schema.payments.bookingId, id))).toHaveLength(1);
  });

  it("clé déjà enregistrée sans paiement : la prise de l'étape est annulée (transaction), le dossier n'est pas bloqué", async () => {
    const id = await bookToReview();
    await svc.submitReview(id, alice, null, { termsAccepted: true, scenario: "paiement-refuse" });
    expect((await svc.payBooking(id, alice, null, svc.newPaymentAttemptKey(id))).paymentStatus).toBe("declined");
    // Tentative interrompue avant la création du paiement (clé enregistrée, aucun paiement).
    const burned = svc.newPaymentAttemptKey(id);
    await database.insert(schema.bookingAttempts).values({ id: `att_burned_${id}`, bookingId: id, kind: "payment", idempotencyKey: burned, status: "started" });
    expect((await svc.payBooking(id, alice, null, burned)).paymentStatus).toBe("declined");
    expect((await bookingRow(id)).paymentStatus).toBe("declined");
    const { eq } = await import("drizzle-orm");
    expect(await database.select().from(schema.payments).where(eq(schema.payments.bookingId, id))).toHaveLength(1);
    // Une nouvelle clé reste utilisable.
    expect((await svc.payBooking(id, alice, null, svc.newPaymentAttemptKey(id))).paymentStatus).toBe("succeeded");
    expect((await bookingRow(id)).paymentStatus).toBe("paid");
  });

  it("contrainte en base : un seul paiement actif par réservation ; un paiement refusé n'empêche pas une nouvelle tentative", async () => {
    const id = await bookToReview();
    const base = { bookingId: id, psp: "demo", amount: 1000, currency: "EUR" };
    await database.insert(schema.payments).values({ ...base, id: `pay_idx_1_${id}`, pspPaymentId: `dpi_idx_1_${id}`, idempotencyKey: `pay:${id}:idx1`, status: "declined" });
    await database.insert(schema.payments).values({ ...base, id: `pay_idx_2_${id}`, pspPaymentId: `dpi_idx_2_${id}`, idempotencyKey: `pay:${id}:idx2`, status: "processing" });
    for (const status of ["processing", "requires_action", "succeeded", "refund_requested", "refunded"]) {
      const err = await database
        .insert(schema.payments)
        .values({ ...base, id: `pay_idx_3_${status}_${id}`, pspPaymentId: `dpi_idx_3_${status}_${id}`, idempotencyKey: `pay:${id}:idx3:${status}`, status })
        .then(
          () => null,
          (e: unknown) => e,
        );
      expect(errorChain(err)).toMatch(/payments_active_booking/);
    }
    // Un second refus reste possible (historique des tentatives refusées conservé).
    await database.insert(schema.payments).values({ ...base, id: `pay_idx_4_${id}`, pspPaymentId: `dpi_idx_4_${id}`, idempotencyKey: `pay:${id}:idx4`, status: "declined" });
    const { eq } = await import("drizzle-orm");
    expect(await database.select().from(schema.payments).where(eq(schema.payments.bookingId, id))).toHaveLength(3);
  });

  it("devis expiré au moment du paiement : aucun encaissement, actualisation puis paiement", async () => {
    const id = await bookToReview();
    expect((await svc.submitReview(id, alice, null, { termsAccepted: true, scenario: null })).state).toBe("payment");
    advance((svc.QUOTE_TTL_MINUTES + 1) * 60_000);
    const key = svc.newPaymentAttemptKey(id);
    const res = await svc.payBooking(id, alice, null, key);
    expect(res.quoteExpired).toBe(true);
    const { eq } = await import("drizzle-orm");
    expect(await database.select().from(schema.payments).where(eq(schema.payments.bookingId, id))).toHaveLength(0);
    let row = await bookingRow(id);
    expect(row.step).toBe("review");
    expect(row.paymentStatus).toBe("requires_payment");
    expect(row.providerStatus).toBe("not_started");
    expect((await database.select().from(schema.quotes).where(eq(schema.quotes.id, row.quoteId)))[0]!.status).toBe("expired");
    // Double clic avec la même clé : toujours rien d'encaissé.
    expect((await svc.payBooking(id, alice, null, key)).paymentStatus).toBe("requires_payment");
    expect(await database.select().from(schema.payments).where(eq(schema.payments.bookingId, id))).toHaveLength(0);
    // Même parcours que le devis expiré à la validation : actualisation en conservant les voyageurs.
    expect((await svc.refreshQuote(id, alice, null)).state).toBe("refreshed");
    expect((await svc.submitReview(id, alice, null, { termsAccepted: true, scenario: null })).state).toBe("payment");
    expect((await svc.payBooking(id, alice, null, svc.newPaymentAttemptKey(id))).paymentStatus).toBe("succeeded");
    expect(await database.select().from(schema.payments).where(eq(schema.payments.bookingId, id))).toHaveLength(1);
    row = await bookingRow(id);
    expect(row.paymentStatus).toBe("paid");
    expect((row.travelers as { lastName: string }[])[0]!.lastName).toBe("Durand");
  });

  it("paiement refusé puis devis expiré : la nouvelle tentative est refusée avant tout encaissement", async () => {
    const id = await bookToReview();
    await svc.submitReview(id, alice, null, { termsAccepted: true, scenario: "paiement-refuse" });
    expect((await svc.payBooking(id, alice, null, svc.newPaymentAttemptKey(id))).paymentStatus).toBe("declined");
    advance((svc.QUOTE_TTL_MINUTES + 1) * 60_000);
    const res = await svc.payBooking(id, alice, null, svc.newPaymentAttemptKey(id));
    expect(res.quoteExpired).toBe(true);
    const { eq } = await import("drizzle-orm");
    const rows = await database.select().from(schema.payments).where(eq(schema.payments.bookingId, id));
    expect(rows.map((p) => p.status)).toEqual(["declined"]);
    const row = await bookingRow(id);
    expect(row.step).toBe("review");
    expect(row.providerStatus).toBe("not_started");
  });
});
