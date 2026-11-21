/**
 * Statuts séparés : devis, paiement, réservation fournisseur et documents.
 * Un paiement réussi n'implique jamais une réservation confirmée.
 */
export type QuoteStatus = "active" | "expired" | "superseded" | "accepted";
export type PaymentStatus = "not_required" | "requires_payment" | "processing" | "requires_action" | "declined" | "paid" | "refund_requested" | "refunded";
export type ProviderStatus = "not_started" | "pending" | "confirmed" | "ticketed" | "failed" | "unknown" | "cancel_requested" | "cancelled";
export type DocumentStatus = "none" | "available";
export type BookingStep = "travelers" | "options" | "review" | "payment" | "processing" | "done";

// Libellés des statuts : `booking.status` dans src/i18n/messages (une traduction par langue).

/**
 * Ordre de progression des paiements : un événement qui ferait reculer l'état (événement en retard
 * ou désordonné) est ignoré. « declined » est terminal pour une tentative donnée.
 */
const PAYMENT_RANK: Record<string, number> = {
  processing: 1,
  requires_action: 1,
  declined: 2,
  succeeded: 2,
  refund_requested: 3,
  refunded: 4,
};

export function canTransitionPayment(from: string, to: string): boolean {
  if (from === to) return false;
  if (from === "declined") return false;
  return (PAYMENT_RANK[to] ?? 0) > (PAYMENT_RANK[from] ?? 0);
}

export function isProviderTerminal(s: ProviderStatus): boolean {
  return s === "confirmed" || s === "ticketed" || s === "failed" || s === "cancelled";
}

export type HeadlineKey =
  | "ticketed"
  | "confirmed"
  | "confirmedFlight"
  | "cancelledRefunded"
  | "cancelledRefundRequested"
  | "cancelled"
  | "failedRefundRequested"
  | "failedRefunded"
  | "failed"
  | "unknownPaid"
  | "unknown"
  | "processingProvider"
  | "declined"
  | "requiresAction"
  | "processingPayment"
  | "notFinalized";

/** Titre de l'état d'une réservation : ton et clé du message (`booking.headline`). */
export function bookingHeadline(b: { paymentStatus: string; providerStatus: string; vertical: string }): { tone: "ok" | "warn" | "error" | "pending"; key: HeadlineKey } {
  const p = b.providerStatus as ProviderStatus;
  const pay = b.paymentStatus as PaymentStatus;
  if (p === "ticketed") return { tone: "ok", key: "ticketed" };
  if (p === "confirmed") return { tone: "ok", key: b.vertical === "flights" ? "confirmedFlight" : "confirmed" };
  if (p === "cancelled") return { tone: "warn", key: pay === "refunded" ? "cancelledRefunded" : pay === "refund_requested" ? "cancelledRefundRequested" : "cancelled" };
  if (p === "failed") {
    if (pay === "refund_requested") return { tone: "error", key: "failedRefundRequested" };
    if (pay === "refunded") return { tone: "error", key: "failedRefunded" };
    return { tone: "error", key: "failed" };
  }
  if (p === "unknown") return { tone: "pending", key: pay === "paid" ? "unknownPaid" : "unknown" };
  if (pay === "paid" || p === "pending") return { tone: "pending", key: "processingProvider" };
  if (pay === "declined") return { tone: "error", key: "declined" };
  if (pay === "requires_action") return { tone: "pending", key: "requiresAction" };
  if (pay === "processing") return { tone: "pending", key: "processingPayment" };
  return { tone: "pending", key: "notFinalized" };
}
