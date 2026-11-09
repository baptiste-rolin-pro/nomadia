import "server-only";
/**
 * Tunnel de réservation : sélection → actualisation → voyageurs → options → vérification →
 * paiement (si applicable) → traitement fournisseur → confirmation vérifiée.
 * Toutes les vérifications d'accès et de montant sont faites côté serveur.
 */
import { TransactionRollbackError, and, desc, eq, inArray, is } from "drizzle-orm";
import { db } from "@/lib/db";
import { bookingAttempts, bookings, consents, documents, incidents, payments, quotes, savedTravelers, tripItems, trips } from "@/lib/db/schema";
import { nowMs } from "@/lib/clock";
import { opaqueId, prefixedId, safeEqual, sha256 } from "@/lib/security";
import { bookingOpsFor, modeFor, verticalOf } from "@/lib/providers/registry";
import { ProviderError, type Bookable, type SelectedOption, type TravelerInput, type Vertical } from "@/lib/providers/types";
import { computeTotals, requiresPlatformPayment } from "@/lib/booking/pricing";
import { validateTravelers, type TravelerIssue } from "@/lib/booking/travelers";
import { isBookingScenario } from "@/lib/providers/scenarios";
import { completeDemoAuthentication, createDemoPayment } from "@/lib/payments/demo-psp";
import { enqueueJob, runDueJobs } from "@/lib/jobs";
import { audit } from "@/lib/audit";
import type { Viewer } from "@/lib/viewer";
import type { BookingRow } from "@/lib/booking/processing";

export const QUOTE_TTL_MINUTES = 20;
export const GUEST_LINK_TTL_DAYS = 30;

export type QuoteRow = typeof quotes.$inferSelect;
export type PaymentRow = typeof payments.$inferSelect;

export class BookingError extends Error {
  constructor(
    message: string,
    public readonly code: "NOT_FOUND" | "FORBIDDEN" | "INVALID" | "STATE" | "PROVIDER" = "INVALID",
  ) {
    super(message);
  }
}

// ---------------------------------------------------------------------------
// Accès
// ---------------------------------------------------------------------------

export function canAccessBooking(b: Pick<BookingRow, "ownerUserId" | "guestTokenHash" | "guestTokenExpiresAt">, viewer: Viewer, guestToken: string | null): boolean {
  if (b.ownerUserId && viewer.user?.id === b.ownerUserId) return true;
  if (!b.ownerUserId && b.guestTokenHash && guestToken) {
    if (b.guestTokenExpiresAt && b.guestTokenExpiresAt.getTime() < nowMs()) return false;
    return safeEqual(b.guestTokenHash, sha256(guestToken));
  }
  return false;
}

export interface BookingView {
  booking: BookingRow;
  quote: QuoteRow;
  bookable: Bookable;
  payment: PaymentRow | null;
  documents: (typeof documents.$inferSelect)[];
  incidents: (typeof incidents.$inferSelect)[];
  previousQuote: QuoteRow | null;
}

/** Charge un dossier uniquement si le visiteur y a droit ; sinon `null` (aucune fuite d'existence). */
export async function getBookingView(bookingId: string, viewer: Viewer, guestToken: string | null): Promise<BookingView | null> {
  const database = await db();
  const rows = await database.select().from(bookings).where(eq(bookings.id, bookingId)).limit(1);
  const booking = rows[0];
  if (!booking || !canAccessBooking(booking, viewer, guestToken)) return null;
  const q = await database.select().from(quotes).where(eq(quotes.id, booking.quoteId)).limit(1);
  const quote = q[0];
  if (!quote) return null;
  const pay = await database.select().from(payments).where(eq(payments.bookingId, bookingId)).orderBy(desc(payments.createdAt)).limit(1);
  const docs = await database.select().from(documents).where(eq(documents.bookingId, bookingId));
  const inc = await database.select().from(incidents).where(eq(incidents.bookingId, bookingId));
  const prev = quote.previousQuoteId ? (await database.select().from(quotes).where(eq(quotes.id, quote.previousQuoteId)).limit(1))[0] ?? null : null;
  return { booking, quote, bookable: quote.snapshot as Bookable, payment: pay[0] ?? null, documents: docs, incidents: inc, previousQuote: prev };
}

async function requireView(bookingId: string, viewer: Viewer, guestToken: string | null): Promise<BookingView> {
  const view = await getBookingView(bookingId, viewer, guestToken);
  if (!view) throw new BookingError("Réservation introuvable ou accès refusé.", "NOT_FOUND");
  return view;
}

// ---------------------------------------------------------------------------
// Démarrage : actualisation de l'offre et création du devis
// ---------------------------------------------------------------------------

async function insertQuote(bookable: Bookable, options: SelectedOption[], previousQuoteId: string | null): Promise<QuoteRow> {
  const totals = computeTotals(bookable, options);
  const database = await db();
  const row = {
    id: prefixedId("quo"),
    vertical: bookable.vertical,
    providerId: bookable.providerId,
    providerMode: bookable.mode,
    offerRef: bookable.offerRef,
    status: "active",
    totalAmount: totals.total.amount,
    payNowAmount: totals.payNow.amount,
    payOnSiteAmount: totals.payOnSite.amount,
    depositAmount: totals.deposit?.amount ?? null,
    currency: totals.total.currency,
    snapshot: bookable,
    expiresAt: new Date(nowMs() + QUOTE_TTL_MINUTES * 60000),
    previousQuoteId,
    createdAt: new Date(nowMs()),
  };
  await database.insert(quotes).values(row);
  return { ...row, priceChangeAcceptedAt: null };
}

export async function startBooking(input: { offerRef: string; tripItemId: string | null }, viewer: Viewer): Promise<{ bookingId: string; guestToken: string | null }> {
  const vertical = verticalOf(input.offerRef) ?? ("flights" as Vertical);
  const ops = bookingOpsFor(vertical);
  if (!ops.info.capabilities.includes("book")) {
    throw new BookingError(`La réservation n'est pas disponible pour ce service (${ops.info.name}, mode ${ops.info.mode.toUpperCase()}).`, "PROVIDER");
  }
  let bookable: Bookable;
  try {
    bookable = await ops.reprice(input.offerRef, {});
  } catch (err) {
    if (err instanceof ProviderError) throw new BookingError(err.message, "PROVIDER");
    throw err;
  }
  if (!bookable.bookable) throw new BookingError(`Cette offre ne peut pas être réservée en l'état : ${bookable.blockingReasons.join(" ")}`, "INVALID");
  const database = await db();
  if (input.tripItemId) {
    // Le voyage doit appartenir au visiteur.
    const item = (await database.select().from(tripItems).where(eq(tripItems.id, input.tripItemId)).limit(1))[0];
    const trip = item ? (await database.select().from(trips).where(eq(trips.id, item.tripId)).limit(1))[0] : undefined;
    const owns = trip && ((trip.ownerUserId && trip.ownerUserId === viewer.user?.id) || (!trip.ownerUserId && trip.anonOwnerHash && trip.anonOwnerHash === viewer.anonHash));
    if (!owns) input.tripItemId = null;
  }
  const quote = await insertQuote(bookable, [], null);
  const bookingId = prefixedId("bkg", 16);
  let guestToken: string | null = null;
  if (!viewer.user) guestToken = opaqueId(32);
  await database.insert(bookings).values({
    id: bookingId,
    vertical: bookable.vertical,
    providerId: bookable.providerId,
    mode: bookable.mode,
    quoteId: quote.id,
    ownerUserId: viewer.user?.id ?? null,
    guestTokenHash: guestToken ? sha256(guestToken) : null,
    guestTokenExpiresAt: guestToken ? new Date(nowMs() + GUEST_LINK_TTL_DAYS * 86400000) : null,
    tripItemId: input.tripItemId,
    step: "travelers",
    contactEmail: viewer.user?.email ?? null,
    paymentStatus: requiresPlatformPayment(bookable, computeTotals(bookable, [])) ? "requires_payment" : "not_required",
    totalAmount: quote.totalAmount,
    payNowAmount: quote.payNowAmount,
    payOnSiteAmount: quote.payOnSiteAmount,
    currency: quote.currency,
    createdAt: new Date(nowMs()),
    updatedAt: new Date(nowMs()),
  });
  await audit({ actorType: viewer.user ? "user" : "guest", actorId: viewer.user?.id, action: "booking.started", entityType: "booking", entityId: bookingId, metadata: { vertical: bookable.vertical, mode: bookable.mode } });
  return { bookingId, guestToken };
}

// ---------------------------------------------------------------------------
// Étapes du tunnel
// ---------------------------------------------------------------------------

function assertEditable(b: BookingRow) {
  if (!["travelers", "options", "review"].includes(b.step)) throw new BookingError("Ce dossier ne peut plus être modifié.", "STATE");
}

export async function saveTravelers(
  bookingId: string,
  viewer: Viewer,
  guestToken: string | null,
  input: { travelers: TravelerInput[]; contactEmail: string; saveToAccount: boolean },
): Promise<{ issues: TravelerIssue[] }> {
  const view = await requireView(bookingId, viewer, guestToken);
  assertEditable(view.booking);
  const issues = validateTravelers(view.bookable.travelers, input.travelers);
  if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(input.contactEmail)) issues.push({ index: -1, field: "general", message: "Adresse email de contact invalide." });
  if (issues.length) return { issues };
  const database = await db();
  const clean = input.travelers.map((t) => ({ type: t.type, firstName: t.firstName.trim(), lastName: t.lastName.trim(), birthDate: t.birthDate || null }));
  await database.update(bookings).set({ travelers: clean, contactEmail: input.contactEmail.trim(), step: "options", updatedAt: new Date(nowMs()) }).where(eq(bookings.id, bookingId));
  if (guestToken && !view.booking.ownerUserId) {
    // Lien invité opaque envoyé à l'adresse du réservant : c'est la preuve de propriété pour un rattachement ultérieur.
    const { sendEmail } = await import("@/lib/mail");
    const { siteUrl } = await import("@/lib/env");
    await sendEmail({
      to: input.contactEmail.trim(),
      subject: "Nomadia — votre lien d'accès à la réservation (DÉMONSTRATION)",
      text: `Conservez ce lien personnel : il permet de suivre votre réservation sans compte, pendant ${GUEST_LINK_TTL_DAYS} jours.\n${siteUrl()}/reservation/${bookingId}/acces?cle=${guestToken}\n\nNe le transmettez pas : toute personne qui le possède peut consulter la réservation.`,
      template: "guest_access",
      dedupeKey: `guest-link:${bookingId}:${sha256(input.contactEmail.trim().toLowerCase())}`,
    });
  }
  if (input.saveToAccount && viewer.user) {
    for (const t of clean) {
      await database.insert(savedTravelers).values({ id: prefixedId("trv"), userId: viewer.user.id, firstName: t.firstName, lastName: t.lastName, birthDate: t.birthDate, consentAt: new Date(nowMs()), createdAt: new Date(nowMs()) });
    }
    await database.insert(consents).values({ id: prefixedId("cns"), userId: viewer.user.id, kind: "saved_travelers", granted: true, source: "booking_travelers_step", createdAt: new Date(nowMs()) });
  }
  return { issues: [] };
}

export async function saveOptions(bookingId: string, viewer: Viewer, guestToken: string | null, options: SelectedOption[]): Promise<void> {
  const view = await requireView(bookingId, viewer, guestToken);
  assertEditable(view.booking);
  if (view.booking.step === "travelers") throw new BookingError("Renseignez d'abord les voyageurs.", "STATE");
  const totals = computeTotals(view.bookable, options);
  const database = await db();
  await database
    .update(bookings)
    .set({ options: options.filter((o) => o.quantity > 0), totalAmount: totals.total.amount, payNowAmount: totals.payNow.amount, payOnSiteAmount: totals.payOnSite.amount, step: "review", updatedAt: new Date(nowMs()) })
    .where(eq(bookings.id, bookingId));
}

export async function goToStep(bookingId: string, viewer: Viewer, guestToken: string | null, step: "travelers" | "options"): Promise<void> {
  const view = await requireView(bookingId, viewer, guestToken);
  assertEditable(view.booking);
  if (step === "options" && view.booking.step === "travelers") return;
  const database = await db();
  await database.update(bookings).set({ step, updatedAt: new Date(nowMs()) }).where(eq(bookings.id, bookingId));
}

export type ReviewOutcome =
  | { state: "expired" }
  | { state: "price_changed"; previousTotal: number; newTotal: number; currency: string }
  | { state: "blocked"; reasons: string[] }
  | { state: "payment" }
  | { state: "processing" };

/** Validation finale : contrôle d'expiration, nouvelle actualisation du prix, acceptation des conditions. */
export async function submitReview(bookingId: string, viewer: Viewer, guestToken: string | null, input: { termsAccepted: boolean; scenario: string | null }): Promise<ReviewOutcome> {
  const view = await requireView(bookingId, viewer, guestToken);
  const { booking, quote } = view;
  if (booking.step !== "review") throw new BookingError("Étape inattendue.", "STATE");
  if (!input.termsAccepted) throw new BookingError("Vous devez accepter les conditions de l'offre et du fournisseur.", "INVALID");
  const database = await db();
  const demo = modeFor(booking.vertical as Vertical) === "demo";
  const scenario = demo && isBookingScenario(input.scenario) && input.scenario !== "nominal" ? input.scenario : null;
  await database.update(bookings).set({ scenario, updatedAt: new Date(nowMs()) }).where(eq(bookings.id, bookingId));

  // 1. Échéance du devis (le scénario « devis expiré » ne s'applique qu'une fois).
  const forcedExpiry = scenario === "devis-expire" && !quote.previousQuoteId;
  if (forcedExpiry || quote.expiresAt.getTime() <= nowMs()) {
    await database.update(quotes).set({ status: "expired" }).where(eq(quotes.id, quote.id));
    if (forcedExpiry) await database.update(bookings).set({ scenario: null }).where(eq(bookings.id, bookingId));
    return { state: "expired" };
  }

  // 2. Actualisation du prix et de la disponibilité auprès du fournisseur.
  const ops = bookingOpsFor(booking.vertical as Vertical);
  let fresh: Bookable;
  try {
    fresh = await ops.reprice(quote.offerRef, { scenario });
  } catch (err) {
    if (err instanceof ProviderError) throw new BookingError(err.message, "PROVIDER");
    throw err;
  }
  if (!fresh.bookable) return { state: "blocked", reasons: fresh.blockingReasons };
  const totals = computeTotals(fresh, booking.options);
  if (totals.total.amount !== quote.totalAmount || totals.total.currency !== quote.currency) {
    // Changement de prix : nouveau devis, nouvelle acceptation explicite requise.
    const newQuote = await insertQuote(fresh, booking.options, quote.id);
    await database.update(quotes).set({ status: "superseded" }).where(eq(quotes.id, quote.id));
    await database
      .update(bookings)
      .set({ quoteId: newQuote.id, totalAmount: totals.total.amount, payNowAmount: totals.payNow.amount, payOnSiteAmount: totals.payOnSite.amount, updatedAt: new Date(nowMs()) })
      .where(eq(bookings.id, bookingId));
    await audit({ actorType: viewer.user ? "user" : "guest", actorId: viewer.user?.id, action: "quote.price_changed", entityType: "booking", entityId: bookingId, metadata: { from: quote.totalAmount, to: totals.total.amount } });
    return { state: "price_changed", previousTotal: quote.totalAmount, newTotal: totals.total.amount, currency: totals.total.currency };
  }
  if (quote.previousQuoteId && !quote.priceChangeAcceptedAt) {
    const prev = view.previousQuote;
    return { state: "price_changed", previousTotal: prev?.totalAmount ?? quote.totalAmount, newTotal: quote.totalAmount, currency: quote.currency };
  }

  // 3. Engagement : le montant à payer est celui calculé côté serveur.
  await database.update(quotes).set({ status: "accepted" }).where(eq(quotes.id, quote.id));
  const needsPayment = requiresPlatformPayment(fresh, totals);
  await database
    .update(bookings)
    .set({ termsAcceptedAt: new Date(nowMs()), step: needsPayment ? "payment" : "processing", paymentStatus: needsPayment ? "requires_payment" : "not_required", updatedAt: new Date(nowMs()) })
    .where(eq(bookings.id, bookingId));
  await audit({ actorType: viewer.user ? "user" : "guest", actorId: viewer.user?.id, action: "booking.terms_accepted", entityType: "booking", entityId: bookingId, metadata: { total: totals.total.amount, scenario } });
  if (!needsPayment) {
    await enqueueJob("provider_book", `provider_book:${bookingId}`, { bookingId });
    await runDueJobs({ bookingId });
    return { state: "processing" };
  }
  return { state: "payment" };
}

export async function acceptPriceChange(bookingId: string, viewer: Viewer, guestToken: string | null): Promise<void> {
  const view = await requireView(bookingId, viewer, guestToken);
  if (!view.quote.previousQuoteId) return;
  const database = await db();
  await database.update(quotes).set({ priceChangeAcceptedAt: new Date(nowMs()) }).where(eq(quotes.id, view.quote.id));
  await audit({ actorType: viewer.user ? "user" : "guest", actorId: viewer.user?.id, action: "quote.price_change_accepted", entityType: "booking", entityId: bookingId, metadata: { total: view.quote.totalAmount } });
}

/** Devis expiré : nouvelle actualisation en conservant voyageurs et options. */
export async function refreshQuote(bookingId: string, viewer: Viewer, guestToken: string | null): Promise<ReviewOutcome | { state: "refreshed" }> {
  const view = await requireView(bookingId, viewer, guestToken);
  assertEditable(view.booking);
  const ops = bookingOpsFor(view.booking.vertical as Vertical);
  let fresh: Bookable;
  try {
    fresh = await ops.reprice(view.quote.offerRef, {});
  } catch (err) {
    if (err instanceof ProviderError) throw new BookingError(err.message, "PROVIDER");
    throw err;
  }
  if (!fresh.bookable) return { state: "blocked", reasons: fresh.blockingReasons };
  const newQuote = await insertQuote(fresh, view.booking.options, view.quote.id);
  const database = await db();
  const changed = newQuote.totalAmount !== view.quote.totalAmount;
  if (!changed) await database.update(quotes).set({ priceChangeAcceptedAt: new Date(nowMs()) }).where(eq(quotes.id, newQuote.id));
  await database.update(quotes).set({ status: "superseded" }).where(eq(quotes.id, view.quote.id));
  await database
    .update(bookings)
    .set({ quoteId: newQuote.id, totalAmount: newQuote.totalAmount, payNowAmount: newQuote.payNowAmount, payOnSiteAmount: newQuote.payOnSiteAmount, step: "review", updatedAt: new Date(nowMs()) })
    .where(eq(bookings.id, bookingId));
  return changed ? { state: "price_changed", previousTotal: view.quote.totalAmount, newTotal: newQuote.totalAmount, currency: newQuote.currency } : { state: "refreshed" };
}

// ---------------------------------------------------------------------------
// Paiement simulé
// ---------------------------------------------------------------------------

/** Clé d'idempotence du formulaire de paiement : générée côté serveur, réutilisée en cas de double clic. */
export function newPaymentAttemptKey(bookingId: string): string {
  return `pay:${bookingId}:${opaqueId(9)}`;
}

/** États de paiement du dossier à partir desquels une (nouvelle) tentative peut être lancée. */
const PAYABLE_STATUSES = ["requires_payment", "declined"];

export interface PayResult {
  paymentStatus: string;
  /** Devis échu avant l'encaissement : rien n'est débité, le dossier revient à la vérification (actualisation de l'offre). */
  quoteExpired?: true;
}

/** Résultat courant sans nouvelle tentative : paiement de cette clé s'il existe, sinon statut du dossier. */
async function currentPaymentResult(bookingId: string, idempotencyKey: string): Promise<PayResult> {
  const database = await db();
  const own = await database.select({ status: payments.status }).from(payments).where(eq(payments.idempotencyKey, idempotencyKey)).limit(1);
  if (own[0]) {
    await runDueJobs({ bookingId });
    return { paymentStatus: own[0].status };
  }
  const row = await database.select({ paymentStatus: bookings.paymentStatus }).from(bookings).where(eq(bookings.id, bookingId)).limit(1);
  return { paymentStatus: row[0]?.paymentStatus ?? "requires_payment" };
}

/**
 * Prise atomique de l'étape de paiement, au niveau de la réservation (et non de la seule clé) :
 * la mise à jour conditionnelle du dossier (étape « payment », statut payable) ne réussit que pour une
 * seule requête, même si plusieurs onglets envoient des clés différentes au même instant. La tentative
 * de cette clé est enregistrée dans la même transaction ; si la clé a déjà servi, tout est annulé.
 */
async function claimPaymentStep(bookingId: string, idempotencyKey: string, claimedStatus: "processing" | "requires_action"): Promise<boolean> {
  const database = await db();
  try {
    return await database.transaction(async (tx) => {
      const claimed = await tx
        .update(bookings)
        .set({ paymentStatus: claimedStatus, updatedAt: new Date(nowMs()) })
        .where(and(eq(bookings.id, bookingId), eq(bookings.step, "payment"), inArray(bookings.paymentStatus, PAYABLE_STATUSES)))
        .returning({ id: bookings.id });
      if (!claimed.length) return false;
      const attempt = await tx
        .insert(bookingAttempts)
        .values({ id: prefixedId("att"), bookingId, kind: "payment", idempotencyKey, status: "started", createdAt: new Date(nowMs()) })
        .onConflictDoNothing()
        .returning({ id: bookingAttempts.id });
      if (!attempt.length) tx.rollback();
      return true;
    });
  } catch (err) {
    if (is(err, TransactionRollbackError)) return false;
    throw err;
  }
}

/**
 * Devis échu au moment de payer : même traitement qu'à la validation (devis marqué expiré, actualisation
 * proposée en conservant voyageurs et options). Le dossier revient à l'étape « review », seulement s'il
 * n'a pas été pris entre-temps par une autre tentative.
 */
async function expireQuoteBeforePayment(view: BookingView, viewer: Viewer, idempotencyKey: string): Promise<PayResult> {
  const { booking, quote } = view;
  const database = await db();
  const reopened = await database
    .update(bookings)
    .set({ step: "review", paymentStatus: "requires_payment", updatedAt: new Date(nowMs()) })
    .where(and(eq(bookings.id, booking.id), eq(bookings.step, "payment"), inArray(bookings.paymentStatus, PAYABLE_STATUSES)))
    .returning({ id: bookings.id });
  if (!reopened.length) return currentPaymentResult(booking.id, idempotencyKey);
  await database.update(quotes).set({ status: "expired" }).where(eq(quotes.id, quote.id));
  await audit({ actorType: viewer.user ? "user" : "guest", actorId: viewer.user?.id, action: "quote.expired_before_payment", entityType: "booking", entityId: booking.id, metadata: { quoteId: quote.id } });
  return { paymentStatus: "requires_payment", quoteExpired: true };
}

export async function payBooking(bookingId: string, viewer: Viewer, guestToken: string | null, idempotencyKey: string): Promise<PayResult> {
  const view = await requireView(bookingId, viewer, guestToken);
  const { booking, quote } = view;
  if (!idempotencyKey.startsWith(`pay:${bookingId}:`)) throw new BookingError("Clé de paiement invalide.", "INVALID");
  const database = await db();
  // Double soumission avec la même clé : on renvoie le résultat existant.
  const existing = await database.select().from(payments).where(eq(payments.idempotencyKey, idempotencyKey)).limit(1);
  if (existing[0]) {
    await runDueJobs({ bookingId });
    return { paymentStatus: existing[0].status };
  }
  if (booking.step !== "payment" || !PAYABLE_STATUSES.includes(booking.paymentStatus)) {
    // Rechargement ou nouvelle clé alors qu'un paiement est déjà en cours / réussi : aucun nouveau paiement.
    return { paymentStatus: booking.paymentStatus };
  }
  // Échéance du devis revérifiée avant tout encaissement (le délai peut s'écouler pendant l'étape de paiement).
  if (quote.status === "expired" || quote.expiresAt.getTime() <= nowMs()) {
    return expireQuoteBeforePayment(view, viewer, idempotencyKey);
  }
  const scenario = booking.scenario;
  const outcome = scenario === "paiement-refuse" ? "decline" : scenario === "authentification" ? "require_action" : "succeed";
  if (!(await claimPaymentStep(bookingId, idempotencyKey, outcome === "require_action" ? "requires_action" : "processing"))) {
    // Une autre requête (autre onglet, double clic) a déjà lancé le paiement de ce dossier : aucun second paiement.
    return currentPaymentResult(bookingId, idempotencyKey);
  }
  const payment = await createDemoPayment({ bookingId, amount: booking.payNowAmount, currency: booking.currency, idempotencyKey, outcome });
  // Les scénarios de refus / authentification sont à usage unique : une nouvelle tentative peut réussir.
  if (outcome !== "succeed") await database.update(bookings).set({ scenario: null }).where(eq(bookings.id, bookingId));
  await database.update(bookingAttempts).set({ status: payment.status === "declined" ? "failed" : "succeeded", result: { paymentStatus: payment.status }, completedAt: new Date(nowMs()) }).where(eq(bookingAttempts.idempotencyKey, idempotencyKey));
  await runDueJobs({ bookingId });
  return { paymentStatus: payment.status };
}

export async function confirmAuthentication(bookingId: string, viewer: Viewer, guestToken: string | null): Promise<void> {
  const view = await requireView(bookingId, viewer, guestToken);
  if (!view.payment || view.payment.status !== "requires_action") return;
  await completeDemoAuthentication(view.payment.id);
  await runDueJobs({ bookingId });
}

export async function refreshStatus(bookingId: string, viewer: Viewer, guestToken: string | null): Promise<void> {
  await requireView(bookingId, viewer, guestToken);
  await runDueJobs({ bookingId });
}

// ---------------------------------------------------------------------------
// Annulation
// ---------------------------------------------------------------------------

export async function cancellationPreview(bookingId: string, viewer: Viewer, guestToken: string | null) {
  const view = await requireView(bookingId, viewer, guestToken);
  if (!view.booking.providerReference || !["confirmed", "ticketed"].includes(view.booking.providerStatus)) return null;
  const ops = bookingOpsFor(view.booking.vertical as Vertical);
  return ops.cancellationQuote(view.booking.providerReference, {});
}

export async function cancelBooking(bookingId: string, viewer: Viewer, guestToken: string | null, input: { acceptedFee: number }): Promise<void> {
  const view = await requireView(bookingId, viewer, guestToken);
  const { booking } = view;
  if (!booking.providerReference || !["confirmed", "ticketed"].includes(booking.providerStatus)) throw new BookingError("Cette réservation ne peut pas être annulée en ligne.", "STATE");
  const ops = bookingOpsFor(booking.vertical as Vertical);
  const preview = await ops.cancellationQuote(booking.providerReference, {});
  if (!preview.allowed) throw new BookingError(preview.message, "STATE");
  // Les frais affichés doivent être ceux acceptés : sinon nouvelle acceptation.
  if (preview.fee.amount !== input.acceptedFee) throw new BookingError("Les frais d'annulation ont changé : vérifiez le nouveau montant.", "STATE");
  const key = `cancel:${bookingId}`;
  const database = await db();
  const claimed = await database
    .insert(bookingAttempts)
    .values({ id: prefixedId("att"), bookingId, kind: "cancel", idempotencyKey: key, status: "started", createdAt: new Date(nowMs()) })
    .onConflictDoNothing()
    .returning({ id: bookingAttempts.id });
  if (!claimed.length) return;
  await database.update(bookings).set({ providerStatus: "cancel_requested", updatedAt: new Date(nowMs()) }).where(eq(bookings.id, bookingId));
  const result = await ops.cancel(booking.providerReference, key, {});
  await database
    .update(bookings)
    .set({ providerStatus: "cancelled", cancellationFee: result.fee.amount, refundAmount: result.refund.amount, updatedAt: new Date(nowMs()) })
    .where(eq(bookings.id, bookingId));
  await database.update(bookingAttempts).set({ status: "succeeded", result, completedAt: new Date(nowMs()) }).where(eq(bookingAttempts.idempotencyKey, key));
  if (booking.tripItemId) await database.update(tripItems).set({ status: "to_book", bookingId: null }).where(eq(tripItems.id, booking.tripItemId));
  if (result.refund.amount > 0) {
    const paid = await database.select().from(payments).where(and(eq(payments.bookingId, bookingId), eq(payments.status, "succeeded"))).limit(1);
    if (paid[0]) {
      const { requestDemoRefund } = await import("@/lib/payments/demo-psp");
      await requestDemoRefund(paid[0].id, result.refund.amount);
      await database.update(bookings).set({ paymentStatus: "refund_requested" }).where(eq(bookings.id, bookingId));
    }
  }
  await audit({ actorType: viewer.user ? "user" : "guest", actorId: viewer.user?.id, action: "booking.cancelled", entityType: "booking", entityId: bookingId, metadata: { fee: result.fee.amount, refund: result.refund.amount } });
}

// ---------------------------------------------------------------------------
// Compte : liste et rattachement
// ---------------------------------------------------------------------------

export async function listBookingsForUser(userId: string) {
  const database = await db();
  const rows = await database.select().from(bookings).where(eq(bookings.ownerUserId, userId)).orderBy(desc(bookings.createdAt));
  if (!rows.length) return [];
  const qs = await database.select().from(quotes).where(inArray(quotes.id, rows.map((r) => r.quoteId)));
  return rows.map((b) => ({ booking: b, bookable: qs.find((q) => q.id === b.quoteId)?.snapshot as Bookable | undefined }));
}

/**
 * Rattachement d'une réservation invitée au compte connecté.
 * Preuve de propriété : possession du lien invité opaque (envoyé à l'adresse du réservant),
 * jamais la seule correspondance d'adresse email.
 */
export async function claimGuestBooking(bookingId: string, viewer: Viewer, guestToken: string | null): Promise<boolean> {
  if (!viewer.user || !guestToken) return false;
  const database = await db();
  const rows = await database.select().from(bookings).where(eq(bookings.id, bookingId)).limit(1);
  const b = rows[0];
  if (!b || b.ownerUserId || !canAccessBooking(b, { user: null, anonHash: null }, guestToken)) return false;
  await database.update(bookings).set({ ownerUserId: viewer.user.id, guestTokenHash: null, guestTokenExpiresAt: null, updatedAt: new Date(nowMs()) }).where(eq(bookings.id, bookingId));
  await audit({ actorType: "user", actorId: viewer.user.id, action: "booking.claimed_from_guest_link", entityType: "booking", entityId: bookingId });
  return true;
}
