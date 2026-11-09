import "server-only";
/**
 * Gestionnaire des événements du prestataire de paiement (démonstration).
 * - Signature vérifiée (HMAC, tolérance d'horodatage).
 * - Déduplication par identifiant d'événement (contrainte d'unicité) : un événement reçu deux fois
 *   n'a qu'un seul effet métier.
 * - Événements désordonnés : une transition qui ferait reculer l'état est ignorée.
 */
import { and, eq, inArray } from "drizzle-orm";
import { z } from "zod";
import { db } from "@/lib/db";
import { bookings, incidents, payments, receivedEvents } from "@/lib/db/schema";
import { env } from "@/lib/env";
import { nowMs } from "@/lib/clock";
import { prefixedId } from "@/lib/security";
import { verifySignature } from "@/lib/payments/signature";
import { canTransitionPayment } from "@/lib/booking/status";
import { enqueueJob } from "@/lib/jobs";
import { audit } from "@/lib/audit";

const eventSchema = z.object({
  id: z.string().min(3),
  type: z.enum(["payment.succeeded", "payment.failed", "refund.succeeded"]),
  created: z.number().int(),
  data: z.object({
    paymentId: z.string(),
    bookingId: z.string(),
    amount: z.number().int(),
    currency: z.string(),
    reason: z.string().optional(),
  }),
});

export type PspEvent = z.infer<typeof eventSchema>;

/**
 * Le webhook HTTP du prestataire de démonstration n'est exposé que si le paiement de démonstration est en
 * service (au moins un service en mode DEMO) ET que DEMO_WEBHOOK_SECRET est explicitement configuré.
 * Le secret de repli propre au processus ne sert qu'aux événements livrés en interne (deliverEvent),
 * jamais à un appel HTTP. En production, env() refuse déjà de démarrer sans DEMO_WEBHOOK_SECRET.
 */
export function demoPaymentWebhookEnabled(): boolean {
  const e = env();
  if (e.demoWebhookSecretSource !== "configured") return false;
  return e.FLIGHTS_PROVIDER_MODE === "demo" || e.HOTELS_PROVIDER_MODE === "demo" || e.CARS_PROVIDER_MODE === "demo";
}

export interface EventOutcome {
  status: number;
  outcome: "applied" | "duplicate" | "ignored_stale" | "invalid_signature" | "invalid_payload" | "unknown_payment";
}

export async function handlePspEvent(rawBody: string, signatureHeader: string | null): Promise<EventOutcome> {
  const check = verifySignature(env().DEMO_WEBHOOK_SECRET, rawBody, signatureHeader, Math.floor(nowMs() / 1000));
  if (!check.valid) return { status: 400, outcome: "invalid_signature" };
  let event: PspEvent;
  try {
    event = eventSchema.parse(JSON.parse(rawBody));
  } catch {
    return { status: 400, outcome: "invalid_payload" };
  }
  const database = await db();
  const inserted = await database
    .insert(receivedEvents)
    .values({ id: prefixedId("rev"), source: "demo_psp", eventId: event.id, type: event.type, payload: event, receivedAt: new Date(nowMs()) })
    .onConflictDoNothing()
    .returning({ id: receivedEvents.id });
  if (!inserted.length) return { status: 200, outcome: "duplicate" };
  const recordId = inserted[0]!.id;

  const rows = await database.select().from(payments).where(eq(payments.pspPaymentId, event.data.paymentId)).limit(1);
  const payment = rows[0];
  let outcome: EventOutcome["outcome"] = "applied";
  if (!payment) {
    outcome = "unknown_payment";
  } else {
    const target = event.type === "payment.succeeded" ? "succeeded" : event.type === "payment.failed" ? "declined" : "refunded";
    if (!canTransitionPayment(payment.status, target)) {
      outcome = "ignored_stale";
    } else {
      await database.update(payments).set({ status: target, updatedAt: new Date(nowMs()) }).where(eq(payments.id, payment.id));
      if (target === "succeeded") {
        await database
          .update(bookings)
          .set({ paymentStatus: "paid", updatedAt: new Date(nowMs()) })
          .where(and(eq(bookings.id, payment.bookingId), inArray(bookings.paymentStatus, ["processing", "requires_action"])));
        await enqueueJob("provider_book", `provider_book:${payment.bookingId}`, { bookingId: payment.bookingId });
        await audit({ actorType: "system", action: "payment.succeeded", entityType: "booking", entityId: payment.bookingId, metadata: { amount: payment.amount, currency: payment.currency } });
      } else if (target === "declined") {
        await database
          .update(bookings)
          .set({ paymentStatus: "declined", updatedAt: new Date(nowMs()) })
          .where(and(eq(bookings.id, payment.bookingId), inArray(bookings.paymentStatus, ["processing", "requires_action"])));
        await audit({ actorType: "system", action: "payment.declined", entityType: "booking", entityId: payment.bookingId });
      } else {
        await database.update(bookings).set({ paymentStatus: "refunded", updatedAt: new Date(nowMs()) }).where(eq(bookings.id, payment.bookingId));
        await database
          .update(incidents)
          .set({ status: "resolved", resolvedAt: new Date(nowMs()) })
          .where(and(eq(incidents.bookingId, payment.bookingId), inArray(incidents.status, ["open", "compensation_pending"])));
        await audit({ actorType: "system", action: "refund.confirmed", entityType: "booking", entityId: payment.bookingId, metadata: { amount: event.data.amount } });
      }
    }
  }
  await database.update(receivedEvents).set({ processedAt: new Date(nowMs()), outcome }).where(eq(receivedEvents.id, recordId));
  return { status: 200, outcome };
}
