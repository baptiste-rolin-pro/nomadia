import "server-only";
/**
 * Traitement fournisseur après validation (et paiement si applicable).
 * - Une seule tentative de réservation par dossier : clé d'idempotence stable « book:<id> ».
 * - Délai dépassé => statut « inconnu » + réconciliation (retrieve) ; jamais de nouvel achat automatique.
 * - Paiement réussi + réservation refusée => incident + remboursement (compensation) suivi jusqu'à confirmation.
 * - Email de confirmation envoyé une seule fois, après la confirmation fournisseur.
 */
import { and, eq, inArray } from "drizzle-orm";
import { db } from "@/lib/db";
import { bookingAttempts, bookings, documents, incidents, payments, quotes, tripItems } from "@/lib/db/schema";
import { nowMs } from "@/lib/clock";
import { prefixedId } from "@/lib/security";
import { bookingOpsFor } from "@/lib/providers/registry";
import { ProviderError, type Bookable, type ProviderBookingResult, type TravelerInput, type Vertical } from "@/lib/providers/types";
import { enqueueJob, type JobType } from "@/lib/jobs";
import { requestDemoRefund, settleDemoRefund } from "@/lib/payments/demo-psp";
import { sendEmail } from "@/lib/mail";
import { audit } from "@/lib/audit";
import { formatMoney } from "@/lib/money";
import { siteUrl } from "@/lib/env";

export type BookingRow = typeof bookings.$inferSelect;

export const RECONCILE_DELAY_MS = 3000;

async function loadBooking(id: string): Promise<BookingRow | null> {
  const database = await db();
  const rows = await database.select().from(bookings).where(eq(bookings.id, id)).limit(1);
  return rows[0] ?? null;
}

async function loadQuote(id: string) {
  const database = await db();
  const rows = await database.select().from(quotes).where(eq(quotes.id, id)).limit(1);
  return rows[0] ?? null;
}

export function bookingIdempotencyKey(bookingId: string): string {
  return `book:${bookingId}`;
}

async function markTripItem(booking: BookingRow, status: "booking" | "confirmed" | "to_book") {
  if (!booking.tripItemId) return;
  const database = await db();
  await database.update(tripItems).set({ status, bookingId: booking.id }).where(eq(tripItems.id, booking.tripItemId));
}

async function onConfirmed(booking: BookingRow, result: ProviderBookingResult) {
  const database = await db();
  await database
    .update(bookings)
    .set({ providerStatus: result.status, providerReference: result.providerReference, documentStatus: "available", step: "done", updatedAt: new Date(nowMs()) })
    .where(eq(bookings.id, booking.id));
  await database.insert(documents).values({ id: prefixedId("doc"), bookingId: booking.id, kind: "demo_summary", title: "Récapitulatif de réservation (démonstration)", createdAt: new Date(nowMs()) }).onConflictDoNothing();
  await markTripItem(booking, "confirmed");
  await database
    .update(incidents)
    .set({ status: "resolved", resolvedAt: new Date(nowMs()) })
    .where(and(eq(incidents.bookingId, booking.id), eq(incidents.kind, "provider_outcome_unknown"), eq(incidents.status, "open")));
  if (booking.contactEmail) {
    const quote = await loadQuote(booking.quoteId);
    const bookable = quote?.snapshot as Bookable | undefined;
    const sent = await sendEmail({
      to: booking.contactEmail,
      subject: `Nomadia — réservation confirmée (DÉMONSTRATION) ${result.providerReference ?? ""}`.trim(),
      text: [
        "DÉMONSTRATION — aucune réservation ni aucun paiement réel.",
        "",
        bookable ? bookable.title : "",
        bookable ? bookable.subtitle : "",
        `Référence fournisseur (fictive) : ${result.providerReference ?? "—"}`,
        `Total : ${formatMoney({ amount: booking.totalAmount, currency: booking.currency })}`,
        "",
        `Détail et documents : ${siteUrl()}/reservation/${booking.id}`,
        "Ce lien exige d'être connecté au compte qui a réservé (ou d'utiliser le lien invité reçu)."
      ].join("\n"),
      template: "booking_confirmed",
      dedupeKey: `booking-confirmed:${booking.id}`,
    });
    if (sent.status === "captured") {
      await database.update(bookings).set({ confirmationEmailSentAt: new Date(nowMs()) }).where(eq(bookings.id, booking.id));
    }
  }
  await audit({ actorType: "system", action: "booking.confirmed", entityType: "booking", entityId: booking.id, metadata: { vertical: booking.vertical, status: result.status } });
  if (booking.vertical === "flights" && result.status === "confirmed") {
    // Dossier créé ≠ billet émis : on suit l'émission auprès du fournisseur.
    await enqueueJob("reconcile_booking", `reconcile:${booking.id}`, { bookingId: booking.id }, RECONCILE_DELAY_MS);
  }
}

async function compensate(booking: BookingRow, reason: string) {
  const database = await db();
  const paid = await database
    .select()
    .from(payments)
    .where(and(eq(payments.bookingId, booking.id), eq(payments.status, "succeeded")))
    .limit(1);
  if (paid[0]) {
    await database.insert(incidents).values({ id: prefixedId("inc"), bookingId: booking.id, kind: "paid_booking_failed", status: "compensation_pending", detail: reason, createdAt: new Date(nowMs()) });
    await requestDemoRefund(paid[0].id, paid[0].amount);
    await database.update(bookings).set({ paymentStatus: "refund_requested", updatedAt: new Date(nowMs()) }).where(eq(bookings.id, booking.id));
    await audit({ actorType: "system", action: "compensation.refund_requested", entityType: "booking", entityId: booking.id, metadata: { amount: paid[0].amount } });
  }
}

async function onFailed(booking: BookingRow, message: string) {
  const database = await db();
  await database.update(bookings).set({ providerStatus: "failed", step: "done", updatedAt: new Date(nowMs()) }).where(eq(bookings.id, booking.id));
  await markTripItem(booking, "to_book");
  await compensate(booking, message);
  await audit({ actorType: "system", action: "booking.failed", entityType: "booking", entityId: booking.id });
}

export async function processProviderBooking(bookingId: string): Promise<void> {
  const booking = await loadBooking(bookingId);
  if (!booking) return;
  if (booking.providerStatus === "unknown") {
    await reconcileBooking(bookingId);
    return;
  }
  if (booking.providerStatus !== "not_started") return;
  const paymentOk = booking.paymentStatus === "paid" || booking.paymentStatus === "not_required";
  if (!paymentOk) return;
  const database = await db();
  // Verrou : passage atomique « not_started » -> « pending ».
  const claimed = await database
    .update(bookings)
    .set({ providerStatus: "pending", step: "processing", updatedAt: new Date(nowMs()) })
    .where(and(eq(bookings.id, bookingId), eq(bookings.providerStatus, "not_started")))
    .returning({ id: bookings.id });
  if (!claimed.length) return;
  await markTripItem(booking, "booking");
  const quote = await loadQuote(booking.quoteId);
  if (!quote) return onFailed(booking, "Devis introuvable.");
  const key = bookingIdempotencyKey(bookingId);
  await database.insert(bookingAttempts).values({ id: prefixedId("att"), bookingId, kind: "provider_book", idempotencyKey: key, status: "started", createdAt: new Date(nowMs()) }).onConflictDoNothing();
  const ops = bookingOpsFor(booking.vertical as Vertical);
  try {
    const result = await ops.book(
      {
        bookingId,
        offerRef: quote.offerRef,
        expectedTotal: { amount: booking.totalAmount, currency: booking.currency },
        travelers: booking.travelers as TravelerInput[],
        options: booking.options,
        idempotencyKey: key,
        scenario: booking.scenario,
      },
      { scenario: booking.scenario },
    );
    await database.update(bookingAttempts).set({ status: result.status === "failed" ? "failed" : "succeeded", result, completedAt: new Date(nowMs()) }).where(eq(bookingAttempts.idempotencyKey, key));
    if (result.status === "failed") return onFailed({ ...booking, providerStatus: "pending" }, result.message);
    return onConfirmed({ ...booking, providerStatus: "pending" }, result);
  } catch (err) {
    if (err instanceof ProviderError && (err.code === "TIMEOUT" || err.code === "UNAVAILABLE")) {
      await database.update(bookingAttempts).set({ status: "unknown", result: { code: err.code, message: err.message }, completedAt: new Date(nowMs()) }).where(eq(bookingAttempts.idempotencyKey, key));
      await database.update(bookings).set({ providerStatus: "unknown", step: "processing", updatedAt: new Date(nowMs()) }).where(eq(bookings.id, bookingId));
      await database.insert(incidents).values({ id: prefixedId("inc"), bookingId, kind: "provider_outcome_unknown", status: "open", detail: err.message, createdAt: new Date(nowMs()) });
      await enqueueJob("reconcile_booking", `reconcile:${bookingId}`, { bookingId }, RECONCILE_DELAY_MS);
      await audit({ actorType: "system", action: "booking.outcome_unknown", entityType: "booking", entityId: bookingId });
      return;
    }
    await database.update(bookingAttempts).set({ status: "failed", result: { message: err instanceof Error ? err.message : "erreur" }, completedAt: new Date(nowMs()) }).where(eq(bookingAttempts.idempotencyKey, key));
    return onFailed({ ...booking, providerStatus: "pending" }, err instanceof Error ? err.message : "Erreur fournisseur");
  }
}

/** Réconciliation : interroge le fournisseur avec la même clé avant toute autre action. */
export async function reconcileBooking(bookingId: string): Promise<{ retryInMs?: number }> {
  const booking = await loadBooking(bookingId);
  if (!booking) return {};
  if (!["unknown", "confirmed"].includes(booking.providerStatus)) return {};
  const ops = bookingOpsFor(booking.vertical as Vertical);
  const result = await ops.retrieve({ providerReference: booking.providerReference, idempotencyKey: bookingIdempotencyKey(bookingId) }, {});
  const database = await db();
  if (booking.providerStatus === "unknown") {
    if (result.status === "confirmed" || result.status === "ticketed") {
      await database.update(bookingAttempts).set({ status: "succeeded", result }).where(eq(bookingAttempts.idempotencyKey, bookingIdempotencyKey(bookingId)));
      await onConfirmed(booking, result);
      // La même tâche continue de suivre l'émission des billets d'un vol.
      return booking.vertical === "flights" && result.status === "confirmed" ? { retryInMs: RECONCILE_DELAY_MS } : {};
    }
    if (result.status === "failed") {
      await onFailed(booking, "Aucune réservation trouvée chez le fournisseur après vérification.");
      await database
        .update(incidents)
        .set({ status: "resolved", resolvedAt: new Date(nowMs()) })
        .where(and(eq(incidents.bookingId, bookingId), eq(incidents.kind, "provider_outcome_unknown")));
      return {};
    }
    return { retryInMs: 5000 };
  }
  // Vol confirmé : suivi de l'émission des billets.
  if (result.status === "ticketed") {
    await database.update(bookings).set({ providerStatus: "ticketed", updatedAt: new Date(nowMs()) }).where(eq(bookings.id, bookingId));
    await audit({ actorType: "system", action: "booking.ticketed", entityType: "booking", entityId: bookingId });
    return {};
  }
  return booking.vertical === "flights" ? { retryInMs: 2000 } : {};
}

export const JOB_HANDLERS: Record<JobType, (payload: Record<string, unknown>) => Promise<{ retryInMs?: number }>> = {
  provider_book: async (p) => {
    await processProviderBooking(String(p.bookingId));
    return {};
  },
  reconcile_booking: async (p) => reconcileBooking(String(p.bookingId)),
  psp_refund_settle: async (p) => {
    await settleDemoRefund(String(p.paymentId));
    return {};
  },
};

export async function openIncidents() {
  const database = await db();
  return database.select().from(incidents).where(inArray(incidents.status, ["open", "compensation_pending"]));
}
