/**
 * Statuts séparés : devis, paiement, réservation fournisseur et documents.
 * Un paiement réussi n'implique jamais une réservation confirmée.
 */
export type QuoteStatus = "active" | "expired" | "superseded" | "accepted";
export type PaymentStatus = "not_required" | "requires_payment" | "processing" | "requires_action" | "declined" | "paid" | "refund_requested" | "refunded";
export type ProviderStatus = "not_started" | "pending" | "confirmed" | "ticketed" | "failed" | "unknown" | "cancel_requested" | "cancelled";
export type DocumentStatus = "none" | "available";
export type BookingStep = "travelers" | "options" | "review" | "payment" | "processing" | "done";

export const PAYMENT_LABELS: Record<PaymentStatus, string> = {
  not_required: "Aucun paiement en ligne (réglé sur place)",
  requires_payment: "En attente de paiement",
  processing: "Paiement en cours",
  requires_action: "Authentification supplémentaire requise",
  declined: "Paiement refusé",
  paid: "Payé",
  refund_requested: "Remboursement demandé",
  refunded: "Remboursement confirmé",
};

export const PROVIDER_LABELS: Record<ProviderStatus, string> = {
  not_started: "Non transmise au fournisseur",
  pending: "Transmise, en attente du fournisseur",
  confirmed: "Confirmée par le fournisseur",
  ticketed: "Billets émis",
  failed: "Refusée par le fournisseur",
  unknown: "Statut en cours de vérification auprès du fournisseur",
  cancel_requested: "Annulation demandée",
  cancelled: "Annulée",
};

export const FLIGHT_CONFIRMED_LABEL = "Dossier créé — billets en cours d'émission";

export const DOCUMENT_LABELS: Record<DocumentStatus, string> = {
  none: "Aucun document disponible",
  available: "Récapitulatif de démonstration disponible",
};

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

export function bookingHeadline(b: { paymentStatus: string; providerStatus: string; vertical: string }): { tone: "ok" | "warn" | "error" | "pending"; text: string } {
  const p = b.providerStatus as ProviderStatus;
  const pay = b.paymentStatus as PaymentStatus;
  if (p === "ticketed") return { tone: "ok", text: "Réservation confirmée, billets émis (démonstration)." };
  if (p === "confirmed") return { tone: "ok", text: b.vertical === "flights" ? "Réservation confirmée par la compagnie ; émission des billets en cours." : "Réservation confirmée par le fournisseur." };
  if (p === "cancelled") return { tone: "warn", text: pay === "refunded" ? "Réservation annulée, remboursement confirmé." : pay === "refund_requested" ? "Réservation annulée, remboursement demandé (non encore confirmé)." : "Réservation annulée." };
  if (p === "failed") {
    if (pay === "refund_requested") return { tone: "error", text: "Paiement reçu mais réservation refusée par le fournisseur. Remboursement demandé, en attente de confirmation." };
    if (pay === "refunded") return { tone: "error", text: "Réservation refusée par le fournisseur. Remboursement confirmé." };
    return { tone: "error", text: "La réservation a été refusée par le fournisseur." };
  }
  if (p === "unknown") return { tone: "pending", text: pay === "paid" ? "Paiement reçu. Le fournisseur n'a pas encore confirmé : vérification en cours, aucune nouvelle réservation ne sera lancée automatiquement." : "Vérification en cours auprès du fournisseur." };
  if (pay === "paid" || p === "pending") return { tone: "pending", text: "Paiement reçu, réservation en cours de traitement par le fournisseur." };
  if (pay === "declined") return { tone: "error", text: "Paiement refusé : aucune réservation n'a été transmise." };
  if (pay === "requires_action") return { tone: "pending", text: "Authentification bancaire supplémentaire requise." };
  if (pay === "processing") return { tone: "pending", text: "Paiement en cours de traitement." };
  return { tone: "pending", text: "Réservation non finalisée." };
}
