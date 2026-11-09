import "server-only";
/**
 * Prestataire de paiement SIMULÉ (mode DEMO). Aucune donnée bancaire n'est demandée ni stockée.
 * Il reproduit les états utiles au tunnel : refus, authentification supplémentaire, succès,
 * remboursement demandé puis confirmé, avec des événements signés livrés au même gestionnaire
 * que le webhook HTTP (/api/demo/webhooks/payment).
 *
 * En production, un prestataire réel (ex. Stripe, intégration hébergée) remplacerait ce module ;
 * voir docs/providers.md pour l'ordre autorisation / encaissement / réservation.
 */
import { eq } from "drizzle-orm";
import { db } from "@/lib/db";
import { payments } from "@/lib/db/schema";
import { env } from "@/lib/env";
import { nowMs } from "@/lib/clock";
import { prefixedId } from "@/lib/security";
import { signPayload } from "@/lib/payments/signature";
import { handlePspEvent, type PspEvent } from "@/lib/payments/webhook";
import { enqueueJob } from "@/lib/jobs";

export const REFUND_SETTLE_DELAY_MS = 5000;

export type PaymentRow = typeof payments.$inferSelect;

export async function deliverEvent(event: Omit<PspEvent, "id" | "created">): Promise<void> {
  const full: PspEvent = { ...event, id: prefixedId("evt"), created: Math.floor(nowMs() / 1000) };
  const body = JSON.stringify(full);
  const header = signPayload(env().DEMO_WEBHOOK_SECRET, body, Math.floor(nowMs() / 1000));
  await handlePspEvent(body, header);
}

export async function createDemoPayment(input: { bookingId: string; amount: number; currency: string; idempotencyKey: string; outcome: "succeed" | "decline" | "require_action" }): Promise<PaymentRow> {
  const database = await db();
  const existing = await database.select().from(payments).where(eq(payments.idempotencyKey, input.idempotencyKey)).limit(1);
  if (existing[0]) return existing[0];
  const initial = input.outcome === "require_action" ? "requires_action" : "processing";
  const row = {
    id: prefixedId("pay"),
    bookingId: input.bookingId,
    psp: "demo",
    pspPaymentId: prefixedId("dpi"),
    idempotencyKey: input.idempotencyKey,
    amount: input.amount,
    currency: input.currency,
    status: initial,
    createdAt: new Date(nowMs()),
    updatedAt: new Date(nowMs()),
  };
  // Seul un conflit sur la clé d'idempotence est absorbé : un second paiement actif pour la même réservation
  // (index « payments_active_booking ») est une erreur, jamais un succès silencieux.
  const inserted = await database.insert(payments).values(row).onConflictDoNothing({ target: payments.idempotencyKey }).returning();
  if (!inserted[0]) {
    const again = await database.select().from(payments).where(eq(payments.idempotencyKey, input.idempotencyKey)).limit(1);
    return again[0]!;
  }
  if (input.outcome === "succeed") {
    await deliverEvent({ type: "payment.succeeded", data: { paymentId: row.pspPaymentId, bookingId: row.bookingId, amount: row.amount, currency: row.currency } });
  } else if (input.outcome === "decline") {
    await deliverEvent({ type: "payment.failed", data: { paymentId: row.pspPaymentId, bookingId: row.bookingId, amount: row.amount, currency: row.currency, reason: "card_declined" } });
  }
  const fresh = await database.select().from(payments).where(eq(payments.id, row.id)).limit(1);
  return fresh[0]!;
}

/** Validation simulée d'une authentification bancaire (3-D Secure). */
export async function completeDemoAuthentication(paymentId: string): Promise<void> {
  const database = await db();
  const rows = await database.select().from(payments).where(eq(payments.id, paymentId)).limit(1);
  const p = rows[0];
  if (!p || p.status !== "requires_action") return;
  await deliverEvent({ type: "payment.succeeded", data: { paymentId: p.pspPaymentId, bookingId: p.bookingId, amount: p.amount, currency: p.currency } });
}

/** Demande de remboursement : acceptée immédiatement, confirmée plus tard par un événement « refund.succeeded ». */
export async function requestDemoRefund(paymentId: string, amount: number): Promise<void> {
  const database = await db();
  const rows = await database.select().from(payments).where(eq(payments.id, paymentId)).limit(1);
  const p = rows[0];
  if (!p || (p.status !== "succeeded" && p.status !== "refund_requested")) return;
  if (p.status === "succeeded") {
    await database.update(payments).set({ status: "refund_requested", refundAmount: amount, updatedAt: new Date(nowMs()) }).where(eq(payments.id, p.id));
  }
  await enqueueJob("psp_refund_settle", `refund:${p.id}`, { paymentId: p.id, bookingId: p.bookingId, amount }, REFUND_SETTLE_DELAY_MS);
}

export async function settleDemoRefund(paymentId: string): Promise<void> {
  const database = await db();
  const rows = await database.select().from(payments).where(eq(payments.id, paymentId)).limit(1);
  const p = rows[0];
  if (!p || p.status !== "refund_requested") return;
  await deliverEvent({ type: "refund.succeeded", data: { paymentId: p.pspPaymentId, bookingId: p.bookingId, amount: p.refundAmount ?? p.amount, currency: p.currency } });
}
