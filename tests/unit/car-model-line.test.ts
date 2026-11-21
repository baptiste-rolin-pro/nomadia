import { describe, expect, it } from "vitest";
import { LOCALES, type Locale } from "@/i18n/config";
import { MESSAGES } from "@/i18n/messages";

/**
 * Ligne « modèle » des billets voiture (src/components/results/car-results.tsx) : le modèle traduit
 * (`domain.carModels.*.example`) porte déjà « ou similaire » ; il est affiché tel quel, suivi de
 * `results.cars.modelNote` (« — catégorie garantie, modèle non garanti »). Régression : un gabarit
 * « {model} ou similaire » ajouté autour du modèle affichait « Fiat 500 ou similaire ou similaire ».
 */
const OR_SIMILAR: Record<Locale, string> = {
  fr: "ou similaire",
  en: "or similar",
  zh: "或同级车型",
  hi: "या समान",
  es: "o similar",
  ar: "أو ما يماثلها",
  bn: "বা সমতুল্য",
  pt: "ou similar",
  ru: "или аналог",
  id: "atau sejenis",
};

const count = (text: string, phrase: string) => text.split(phrase).length - 1;

describe("billets voiture : « ou similaire » une seule fois", () => {
  it.each(LOCALES)("%s", (locale) => {
    const m = MESSAGES[locale];
    const cars = m.results.cars as Record<string, unknown>;
    const note = cars.modelNote as string;
    const phrase = OR_SIMILAR[locale];

    // Aucun gabarit de la liste ne réenveloppe le modèle (il contient déjà la mention).
    for (const [key, value] of Object.entries(cars)) {
      if (typeof value === "string") expect(value, `${locale}:results.cars.${key}`).not.toMatch(/\{model\}/);
    }
    // Mention « catégorie garantie, modèle non garanti » conservée, sans « ou similaire ».
    expect(note.trim()).not.toBe("");
    expect(count(note, phrase), note).toBe(0);

    const models = m.domain.carModels as Record<string, { example: string }>;
    for (const { example } of Object.values(models)) {
      const line = `${example} ${note}`;
      expect(count(line, phrase), line).toBe(1);
    }
  });
});
