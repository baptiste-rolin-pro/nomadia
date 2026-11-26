/**
 * Agence de location affichée avec son type d'accès : « Centauro — Lisbonne Aéroport (navette) ».
 * Le nom d'une agence ne contient que « Loueur — Lieu » ; le type d'accès (comptoir au terminal, navette, agence
 * en ville) vient toujours de son propre libellé (`results.cars.access`), pour n'apparaître qu'une seule fois.
 */
import type { Locale } from "@/i18n/config";
import { getMessages } from "@/i18n/messages";
import type { RentalAgency } from "@/lib/providers/types";

export function agencyAccessLabel(access: RentalAgency["access"], locale: Locale): string {
  return getMessages(locale).results.cars.access[access];
}

/** Nom de l'agence suivi de son type d'accès entre parenthèses (pleine chasse en chinois). */
export function agencyWithAccess(agency: Pick<RentalAgency, "name" | "access">, locale: Locale): string {
  const access = agencyAccessLabel(agency.access, locale);
  return locale === "zh" ? `${agency.name}（${access}）` : `${agency.name} (${access})`;
}
