/**
 * Configuration de marque centralisée.
 * Les informations légales restent explicitement « à compléter » : aucune donnée
 * d'entreprise, d'immatriculation, d'assurance ou de garantie n'est inventée.
 * La disponibilité juridique du nom « Nomadia » n'a pas été vérifiée.
 */
export const TO_COMPLETE = "[À compléter avant commercialisation]";

export const siteConfig = {
  name: "Nomadia",
  shortDescription: "Plateforme de voyage immersive : destinations, vols, hôtels, voitures et carnet de voyage.",
  promise: "Trouver l'envie de partir, construire un voyage cohérent, réserver en comprenant ce que l'on achète.",
  locale: "fr-FR",
  language: "fr",
  market: "FR",
  currency: "EUR",
  timeZone: "Europe/Paris",
  contact: {
    email: "contact@nomadia.example",
    supportHours: TO_COMPLETE,
    postalAddress: TO_COMPLETE,
  },
  legal: {
    companyName: TO_COMPLETE,
    legalForm: TO_COMPLETE,
    registrationNumber: TO_COMPLETE,
    vatNumber: TO_COMPLETE,
    atoutFranceRegistration: TO_COMPLETE,
    financialGuarantee: TO_COMPLETE,
    professionalInsurance: TO_COMPLETE,
    publicationDirector: TO_COMPLETE,
    host: TO_COMPLETE,
  },
} as const;

export const mainNav = [
  { href: "/destinations", label: "Destinations" },
  { href: "/voyage/nouveau", label: "Organiser mon voyage" },
  { href: "/vols", label: "Vols" },
  { href: "/hotels", label: "Hôtels" },
  { href: "/voitures", label: "Voitures" },
] as const;
