/** Scénarios de démonstration contrôlables (mode DEMO uniquement, jamais en SANDBOX/LIVE). */
export const SEARCH_SCENARIOS = {
  "aucune-offre": "Aucune offre disponible",
  indisponible: "Fournisseur indisponible (erreur explicite)",
  lent: "Réponse lente (annulation des requêtes obsolètes)",
} as const;

export const BOOKING_SCENARIOS = {
  nominal: "Parcours nominal",
  "prix-modifie": "Prix modifié lors de l'actualisation",
  "devis-expire": "Devis expiré avant la validation",
  "paiement-refuse": "Paiement refusé (une fois)",
  authentification: "Authentification bancaire supplémentaire (simulée)",
  "reservation-echouee": "Paiement réussi puis réservation fournisseur échouée",
  "resultat-incertain": "Délai dépassé : résultat fournisseur incertain",
  "annulation-frais": "Annulation avec frais",
} as const;

export type SearchScenario = keyof typeof SEARCH_SCENARIOS;
export type BookingScenario = keyof typeof BOOKING_SCENARIOS;

export function isSearchScenario(v: unknown): v is SearchScenario {
  return typeof v === "string" && v in SEARCH_SCENARIOS;
}

export function isBookingScenario(v: unknown): v is BookingScenario {
  return typeof v === "string" && v in BOOKING_SCENARIOS;
}
