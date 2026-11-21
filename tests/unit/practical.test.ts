import { describe, expect, it } from "vitest";
import { LOCALES } from "@/i18n/config";
import { DESTINATIONS, getDestination } from "@/lib/content/destinations";
import { AIRLINES, RENTERS, getAirline, getRenter } from "@/lib/content/directory";
import { practicalAirportName, practicalTownName } from "@/lib/content/localized";
import { CITY_CODES, MAX_MODELS, PRACTICAL, PRACTICAL_OBSERVED_ON, getPractical, parisAccess, type AgencyArea, type BrandRef } from "@/lib/content/practical";
import { DEMO_SUPPLIERS } from "@/lib/providers/demo/cars";
import { DEMO_CARRIERS } from "@/lib/providers/demo/flights";

const IATA = /^[A-Z]{3}$/;

function areaAirports(a: AgencyArea): string[] {
  return a.kind === "airport" || a.kind === "airport-shuttle" || a.kind === "town-airport" ? [a.airport] : [];
}

function areaTowns(a: AgencyArea): string[] {
  return a.kind === "town" || a.kind === "town-airport" ? [a.town] : [];
}

/** Tous les codes de lieux cités (aéroport d'accès, liaisons, zones des agences). */
function allCodes(): string[] {
  return PRACTICAL.flatMap((p) => [p.accessAirport, ...p.routes.flatMap((r) => [r.from, r.to]), ...p.cars.flatMap((c) => areaAirports(c.area))]);
}

const airlineRefs: BrandRef[] = PRACTICAL.flatMap((p) => p.routes.flatMap((r) => r.airlines));
const renterRefs: BrandRef[] = PRACTICAL.flatMap((p) => p.cars.flatMap((c) => c.renters));

/** Toutes les clés d'objets, à toute profondeur. */
function keysDeep(node: unknown, out: string[] = []): string[] {
  if (Array.isArray(node)) node.forEach((v) => keysDeep(v, out));
  else if (node && typeof node === "object") for (const [k, v] of Object.entries(node)) (out.push(k), keysDeep(v, out));
  return out;
}

describe("informations pratiques : intégrité des données", () => {
  it("couvre exactement les 12 destinations du catalogue, une fois chacune", () => {
    const slugs = PRACTICAL.map((p) => p.slug);
    expect(slugs).toHaveLength(12);
    expect(new Set(slugs).size).toBe(12);
    expect([...slugs].sort()).toEqual(DESTINATIONS.map((d) => d.slug).sort());
    for (const d of DESTINATIONS) expect(getPractical(d.slug), d.slug).toBeDefined();
  });

  it("codes IATA : trois lettres majuscules partout", () => {
    for (const code of allCodes()) expect(code, code).toMatch(IATA);
  });

  it("chaque destination a au moins une liaison qui arrive à son aéroport d'accès et au moins un relevé de location", () => {
    for (const p of PRACTICAL) {
      expect(p.routes.some((r) => r.to === p.accessAirport), p.slug).toBe(true);
      expect(p.cars.length, p.slug).toBeGreaterThan(0);
      for (const r of p.routes) expect(r.airlines.length, `${p.slug} ${r.from}-${r.to}`).toBeGreaterThan(0);
      for (const c of p.cars) {
        expect(c.models.length, p.slug).toBeGreaterThan(0);
        expect(c.models.length, p.slug).toBeLessThanOrEqual(MAX_MODELS);
        expect(new Set(c.models).size, p.slug).toBe(c.models.length);
        expect(c.renters.length, p.slug).toBeGreaterThan(0);
      }
    }
  });

  it("chaque compagnie liée à l'annuaire a une fiche, au même nom ; une compagnie de l'annuaire n'est jamais citée sans lien", () => {
    for (const ref of airlineRefs) {
      if (ref.slug) expect(getAirline(ref.slug)?.name, ref.slug).toBe(ref.name);
      else expect(AIRLINES.find((a) => a.name.toLowerCase() === ref.name.toLowerCase()), ref.name).toBeUndefined();
    }
  });

  it("chaque loueur lié à l'annuaire a une fiche, au même nom ; un loueur de l'annuaire n'est jamais cité sans lien", () => {
    for (const ref of renterRefs) {
      if (ref.slug) expect(getRenter(ref.slug)?.name, ref.slug).toBe(ref.name);
      else expect(RENTERS.find((r) => r.name.toLowerCase() === ref.name.toLowerCase()), ref.name).toBeUndefined();
    }
  });

  it("aucun champ hébergement, aucune URL ni mention de la source dans les données publiées", () => {
    const keys = keysDeep(PRACTICAL);
    expect(keys.filter((k) => /hotel|hôtel|hebergement|hébergement|accommodation|source|url/i.test(k))).toEqual([]);
    const text = JSON.stringify(PRACTICAL);
    expect(text).not.toMatch(/https?:|www\.|kayak/i);
  });

  it("noms de lieux : chaque code et chaque localité ont un nom dans les 10 langues", () => {
    const codes = [...new Set(allCodes())].filter((c) => !CITY_CODES.has(c));
    const towns = [...new Set(PRACTICAL.flatMap((p) => p.cars.flatMap((c) => areaTowns(c.area))))];
    for (const locale of LOCALES) {
      for (const code of codes) expect(practicalAirportName(code, locale), `${locale}:${code}`).toBeTruthy();
      for (const town of towns) {
        const name = practicalTownName(town, locale);
        expect(name, `${locale}:${town}`).toBeTruthy();
        expect(name, `${locale}:${town}`).not.toBe(town);
      }
    }
  });

  it("accès depuis Paris : direct, correspondance relevée (Bali via SIN) ou dernier tronçon seul (Lofoten via BOO)", () => {
    expect(parisAccess(getPractical("lisbonne")!)).toEqual({ kind: "direct" });
    expect(parisAccess(getPractical("rome")!)).toEqual({ kind: "direct" });
    expect(parisAccess(getPractical("le-cap")!)).toEqual({ kind: "direct" });
    expect(parisAccess(getPractical("bali")!)).toEqual({ kind: "connection", via: "SIN" });
    expect(parisAccess(getPractical("lofoten")!)).toEqual({ kind: "first", via: "BOO" });
  });

  it("date du relevé au format AAAA-MM-JJ", () => {
    expect(PRACTICAL_OBSERVED_ON).toBe("2026-11-21");
  });

  it("écart connu avec le catalogue : seul Lofoten (SVJ) a un aéroport d'accès absent des aéroports de la destination", () => {
    // Signalé, non corrigé : la recherche préremplie de Lofoten reste city:N-LOF (BOO, LKN, EVE).
    const mismatches = PRACTICAL.filter((p) => !getDestination(p.slug)!.location.airports.includes(p.accessAirport)).map((p) => `${p.slug}:${p.accessAirport}`);
    expect(mismatches).toEqual(["lofoten:SVJ"]);
  });
});

describe("annuaires : entrées ajoutées", () => {
  it("toutes les fiches restent non indexées, avec codes et site officiel bien formés", () => {
    for (const a of AIRLINES) {
      expect(a.indexable, a.slug).toBe(false);
      expect(a.iata, a.slug).toMatch(/^[A-Z0-9]{2}$/);
      expect(a.icao, a.slug).toMatch(/^[A-Z]{3}$/);
      expect(a.website, a.slug).toMatch(/^https:\/\/[^/]+\/$/);
    }
    for (const r of RENTERS) {
      expect(r.indexable, r.slug).toBe(false);
      expect(r.website, r.slug).toMatch(/^https:\/\/[^/]+\/$/);
    }
    expect(new Set(AIRLINES.map((a) => a.slug)).size).toBe(AIRLINES.length);
    expect(new Set(AIRLINES.map((a) => a.iata)).size).toBe(AIRLINES.length);
    expect(new Set(RENTERS.map((r) => r.slug)).size).toBe(RENTERS.length);
  });

  it("aucune marque réelle ne devient un fournisseur de démonstration", () => {
    const real = new Set([...AIRLINES.map((a) => a.name), ...RENTERS.map((r) => r.name), ...airlineRefs.map((b) => b.name), ...renterRefs.map((b) => b.name)].map((n) => n.toLowerCase()));
    for (const s of Object.values(DEMO_SUPPLIERS)) expect(real.has(s.name.toLowerCase()), s.name).toBe(false);
    for (const c of Object.values(DEMO_CARRIERS)) {
      expect(real.has(c.name.toLowerCase()), c.name).toBe(false);
      expect(AIRLINES.some((a) => a.iata === c.code), c.code).toBe(false);
    }
  });
});
