/**
 * Type d'accès d'une agence de location (comptoir au terminal, navette, agence en ville) : une seule mention.
 * Le nom d'une agence ne contient que « Loueur — Lieu » ; le type d'accès vient de son propre libellé.
 * Régression : « Centauro — Lisbonne Aéroport (navette) (navette), 21 déc. à 10 h 00 » sur les billets /voitures.
 */
import { describe, expect, it } from "vitest";
import { LOCALES, type Locale } from "@/i18n/config";
import { formatter } from "@/i18n/format";
import { getMessages } from "@/i18n/messages";
import { civilDateOf } from "@/lib/dates";
import { DEMO_AGENCIES, buildCarOffer } from "@/lib/providers/demo/cars";
import { localizeAgency } from "@/lib/providers/localize";
import { agencyWithAccess } from "@/lib/providers/agency-label";
import { carToBookable } from "@/lib/providers/bookable";
import type { ProviderInfo, RentalAgency } from "@/lib/providers/types";

const T = 1_800_000_000;
const ACCESS = ["terminal", "shuttle", "city"] as const;

/** Mot « terminal » de chaque langue (en plus des trois libellés d'accès) : jamais dans un nom d'agence. */
const TERMINAL_WORD: Record<Locale, string> = { fr: "terminal", en: "terminal", es: "terminal", pt: "terminal", id: "terminal", ru: "терминал", zh: "航站楼", hi: "टर्मिनल", bn: "টার্মিনাল", ar: "مبنى" };

const count = (text: string, needle: string) => text.toLocaleLowerCase().split(needle.toLocaleLowerCase()).length - 1;

/** Ligne « Retrait » d'un billet de résultat, rendue comme dans components/results/car-results.tsx. */
function ticketPickupLine(agency: RentalAgency, locale: Locale): string {
  const f = formatter(locale);
  const t = getMessages(locale).results.cars;
  const a = localizeAgency(agency, locale);
  return f.t(t.pickupValue, { agency: a.name, access: t.access[a.access], date: f.date(civilDateOf("2026-12-21T10:00"), "short"), time: f.time("2026-12-21T10:00") });
}

describe("agences de location : type d'accès mentionné une seule fois", () => {
  for (const locale of LOCALES) {
    const labels = getMessages(locale).results.cars.access;

    for (const agency of DEMO_AGENCIES) {
      it(`${locale} · ${agency.id} : nom sans type d'accès, billet avec un seul libellé`, () => {
        const name = localizeAgency(agency, locale).name;
        for (const word of [...ACCESS.map((k) => labels[k]), TERMINAL_WORD[locale]]) expect(name.toLocaleLowerCase()).not.toContain(word.toLocaleLowerCase());

        const line = ticketPickupLine(agency, locale);
        expect(count(line, labels[agency.access]), line).toBe(1);
        expect(count(agencyWithAccess(localizeAgency(agency, locale), locale), labels[agency.access])).toBe(1);
      });
    }

    it(`${locale} · réservation avec retour dans une autre agence : accès de l'agence de retour une seule fois`, () => {
      const car = buildCarOffer({ pu: "kef-apt-rl", do: "lis-apt-rl", m: "eco", pl: "2027-01-20T10:00", rl: "2027-01-24T10:00", age: 30, res: "FR", pre: true, t: T }, locale);
      const lines = carToBookable(car, { id: "demo-cars", name: "Nomadia", mode: "demo" } as unknown as ProviderInfo, locale).summaryLines;
      for (const l of lines) expect(count(l, labels.shuttle), l).toBeLessThanOrEqual(1);
      expect(lines.some((l) => count(l, labels.shuttle) === 1 && l.includes(car.returnAgency.name))).toBe(true);
    });
  }
});
