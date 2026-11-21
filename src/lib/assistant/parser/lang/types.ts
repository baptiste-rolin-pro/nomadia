import type { Locale } from "@/i18n/config";

/**
 * Vocabulaire d'une langue pour l'assistant local. Chaque entrée ramène un mot ou une expression (clé repliée :
 * minuscules, sans accents latins, mots séparés par une espace) vers un texte FRANÇAIS que comprend le cœur du
 * parseur ("" : mot ignoré). Les noms de lieux viennent des packs de contenu (lang/places.ts), pas d'ici.
 */
export interface LangPack {
  locale: Exclude<Locale, "fr">;
  /** Réécritures sur le texte saisi (chiffres déjà convertis), avant le découpage en mots. */
  pre?: [RegExp, string | ((...m: string[]) => string)][];
  words: Record<string, string>;
  /** Postpositions (hindi, bengali) : préposition française placée avant le lieu qui précède. */
  post?: Record<string, string>;
  /** Préfixes collés (arabe) : préfixe → préposition française, du plus long au plus court. */
  prefixes?: [string, string][];
  /** Terminaisons retirées pour retrouver un mot ou un lieu (russe : cas ; bengali : locatif, génitif). */
  suffixes?: [string, string][];
  /** Mois avant le jour (« June 12 ») : remis dans l'ordre français (« 12 juin »). */
  monthFirst?: boolean;
  /** « 12 de junio » : « de » entre un jour et un mois ignoré. */
  dropDeInDates?: boolean;
  /** Écriture sans espaces (chinois) : découpage par dictionnaire. */
  segment?: boolean;
  /** Mots en minuscules qui ne sont pas des lieux (anglais « nice ») ; en majuscule initiale, ils le restent. */
  lowercaseNotPlace?: string[];
}
