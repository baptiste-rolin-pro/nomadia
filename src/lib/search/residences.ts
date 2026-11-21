/**
 * Pays de résidence proposés pour la location de voiture (formulaire et assistant), code ISO 3166-1 alpha-2.
 * Noms affichés : `search.residences` dans src/i18n/messages (une traduction par langue).
 */
export const RESIDENCE_CODES = ["FR", "BE", "CH", "LU", "CA", "DE", "ES", "IT", "GB"] as const;
export type ResidenceCode = (typeof RESIDENCE_CODES)[number];

export function isResidenceCode(code: string): code is ResidenceCode {
  return (RESIDENCE_CODES as readonly string[]).includes(code);
}
