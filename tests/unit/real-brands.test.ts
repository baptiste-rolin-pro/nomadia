/**
 * Offres simulées avec de vraies marques : compagnies et loueurs réels (annuaire), vols et prix simulés.
 * - chaque compagnie et chaque loueur de démonstration figure dans l'annuaire, avec le même code IATA ;
 * - aucune étiquette « Démo » / « fictif » dans les noms et textes des offres (10 langues) ;
 * - numéros de vol générés (préfixe IATA réel, plage 9000-9999), partages de code plausibles seulement ;
 * - références déjà enregistrées (anciennes compagnies et agences fictives) : régénérées sans erreur, au même prix.
 */
import { describe, expect, it } from "vitest";
import { DEFAULT_LOCALE, LOCALES, type Locale } from "@/i18n/config";
import { AIRLINES, RENTERS } from "@/lib/content/directory";
import { PRACTICAL } from "@/lib/content/practical";
import { CODESHARE_MARKETER, DEMO_CARRIERS, DEMO_FLIGHT_DESTINATIONS, FRENCH_ORIGINS, buildFlightOffer, decodeFlightRef, generateFlightOffers } from "@/lib/providers/demo/flights";
import { DEMO_AGENCIES, DEMO_SUPPLIERS, buildCarOffer, decodeCarRef, generateCarOffers } from "@/lib/providers/demo/cars";
import { searchDemoHotels } from "@/lib/providers/demo/hotels";
import { rebuildDemo } from "@/lib/providers/registry";
import { ProviderError, type FlightOffer } from "@/lib/providers/types";

const T = 1_800_000_000;
const DATES = ["2027-01-08", "2027-03-27", "2027-06-18"];

/** Mots d'étiquette « démo / fictif » dans les 10 langues, et anciens noms de marques inventées. */
const TAG = /d[ée]mo|fictif|fictive|fictitious|ficticio|ficticia|fictício|fictícia|fiktif|вымышлен|демо|虚构|演示|काल्पनिक|डेमो|কাল্পনিক|ডেমো|وهمي|تجريبي|ديمو|Route Libre|Wheels|Atlantique|Régional/i;

function allFlights(locale: Locale = DEFAULT_LOCALE): FlightOffer[] {
  const out: FlightOffer[] = [];
  for (const o of FRENCH_ORIGINS)
    for (const d of DEMO_FLIGHT_DESTINATIONS)
      for (const date of DATES) {
        out.push(...generateFlightOffers({ originAirports: [o], destinationAirports: [d], departDate: date, returnDate: "2027-07-02", adults: 1, childrenAges: [], infants: 0, cabin: "economy", generatedAtSec: T }, locale));
        out.push(...generateFlightOffers({ originAirports: [d], destinationAirports: [o], departDate: date, returnDate: null, adults: 1, childrenAges: [], infants: 0, cabin: "economy", generatedAtSec: T }, locale));
      }
  return out;
}

const segments = (offers: FlightOffer[]) => offers.flatMap((o) => o.slices.flatMap((s) => s.segments));

function carOffers(locale: Locale = DEFAULT_LOCALE) {
  const places = ["airport:LIS", "city:LIS", "airport:FCO", "city:ROM", "airport:KEF", "city:REK"];
  return places.flatMap((pu) => places.flatMap((dr) => generateCarOffers({ pickupPlace: pu, dropoffPlace: dr, pickupLocal: "2027-01-20T10:00", dropoffLocal: "2027-01-24T10:00", driverAge: 30, residence: "FR", t: T }, locale)));
}

function hotels(locale: Locale = DEFAULT_LOCALE) {
  return ["city:LIS", "city:ROM", "city:REK"].flatMap((dest) => searchDemoHotels(dest, "2027-03-27", "2027-03-30", [{ adults: 2, childrenAges: [] }], T, locale));
}

describe("vraies marques : annuaire", () => {
  it("chaque compagnie de démonstration figure dans l'annuaire, même nom, même code IATA", () => {
    expect(Object.keys(DEMO_CARRIERS).length).toBeGreaterThan(0);
    for (const c of Object.values(DEMO_CARRIERS)) {
      const entry = AIRLINES.find((a) => a.iata === c.code);
      expect(entry, c.code).toBeDefined();
      expect(entry!.name, c.code).toBe(c.name);
      expect(c.fictional, c.code).toBe(false);
    }
  });

  it("chaque compagnie des vols générés (commercialisante et opérante) figure dans l'annuaire avec le même code IATA", () => {
    const seen = new Map<string, string>();
    for (const s of segments(allFlights())) for (const c of [s.marketingCarrier, s.operatingCarrier]) seen.set(c.code, c.name);
    expect(seen.size).toBeGreaterThan(5);
    for (const [code, name] of seen) expect(AIRLINES.find((a) => a.iata === code)?.name, code).toBe(name);
  });

  it("chaque loueur et chaque agence de démonstration renvoient à un loueur de l'annuaire, même nom", () => {
    for (const s of Object.values(DEMO_SUPPLIERS)) {
      expect(RENTERS.find((r) => r.slug === s.id)?.name, s.id).toBe(s.name);
      expect(s.fictional, s.id).toBe(false);
    }
    for (const a of DEMO_AGENCIES) {
      expect(DEMO_SUPPLIERS[a.supplierId], a.id).toBeDefined();
      expect(a.name.startsWith(`${DEMO_SUPPLIERS[a.supplierId]!.name} — `), a.id).toBe(true);
    }
    for (const o of carOffers()) expect(RENTERS.some((r) => r.slug === o.supplier.id && r.name === o.supplier.name), o.supplier.id).toBe(true);
  });

  it("loueurs relevés au même endroit privilégiés (informations pratiques)", () => {
    const observed = (slug: string) => new Set(PRACTICAL.find((p) => p.slug === slug)!.cars.flatMap((c) => c.renters.map((r) => r.slug)).filter(Boolean));
    const at = (prefix: string) => new Set(DEMO_AGENCIES.filter((a) => a.id.startsWith(prefix)).map((a) => a.supplierId));
    for (const s of at("lis-")) expect(observed("lisbonne").has(s), `Lisbonne ${s}`).toBe(true);
    for (const s of [...at("fco-"), ...at("rom-")]) expect(observed("rome").has(s), `Rome ${s}`).toBe(true);
    for (const s of at("kef-")) expect(observed("reykjavik").has(s), `Keflavík ${s}`).toBe(true);
  });
});

describe("vraies marques : vols simulés", () => {
  it("vols directs depuis Paris : compagnies relevées sur la liaison (PAR→LIS, ORY→FCO, PAR→KEF)", () => {
    const observed = (to: string, from: string[]) => new Set(PRACTICAL.flatMap((p) => p.routes).filter((r) => r.to === to && from.includes(r.from)).flatMap((r) => r.airlines.map((a) => a.name)));
    const cases: [string[], string, Set<string>][] = [
      [["CDG", "ORY"], "LIS", observed("LIS", ["PAR"])],
      [["ORY"], "FCO", observed("FCO", ["ORY"])],
      [["CDG", "ORY"], "KEF", observed("KEF", ["PAR"])],
    ];
    for (const [origins, dest, names] of cases) {
      expect(names.size, dest).toBeGreaterThan(0);
      const direct = generateFlightOffers({ originAirports: origins, destinationAirports: [dest], departDate: "2027-01-08", returnDate: null, adults: 1, childrenAges: [], infants: 0, cabin: "economy", generatedAtSec: T }).filter((o) => o.slices[0]!.stops === 0);
      expect(direct.length, dest).toBeGreaterThan(0);
      for (const o of direct) expect(names.has(o.slices[0]!.segments[0]!.operatingCarrier.name), `${dest} ${o.slices[0]!.segments[0]!.operatingCarrier.name}`).toBe(true);
    }
  });

  it("numéro de vol : préfixe IATA réel de la compagnie commercialisante, numéro généré 9000-9999", () => {
    for (const s of segments(allFlights())) {
      const m = s.flightNumber.match(/^([A-Z0-9]{2}) (\d{4})$/);
      expect(m, s.flightNumber).not.toBeNull();
      expect(m![1]).toBe(s.marketingCarrier.code);
      expect(Number(m![2])).toBeGreaterThanOrEqual(9000);
      expect(Number(m![2])).toBeLessThanOrEqual(9999);
    }
  });

  it("partage de code : seulement entre compagnies d'un même groupe ou d'une même alliance", () => {
    const shared = segments(allFlights()).filter((s) => s.marketingCarrier.code !== s.operatingCarrier.code);
    expect(shared.length).toBeGreaterThan(0);
    for (const s of shared) expect(CODESHARE_MARKETER[s.operatingCarrier.code], `${s.marketingCarrier.code}/${s.operatingCarrier.code}`).toBe(s.marketingCarrier.code);
    expect(Object.entries(CODESHARE_MARKETER).sort()).toEqual([["AF", "KL"], ["KL", "AF"], ["SK", "KL"]]);
  });

  it("une nouvelle référence se régénère à l'identique (aller-retour de l'identifiant)", () => {
    for (const o of allFlights().filter((_, i) => i % 97 === 0)) {
      const again = buildFlightOffer(decodeFlightRef(o.id)!);
      expect(again.id).toBe(o.id);
      expect(again.price.total).toEqual(o.price.total);
      expect(again.slices).toEqual(o.slices);
    }
    for (const o of carOffers().filter((_, i) => i % 11 === 0)) {
      const again = buildCarOffer(decodeCarRef(o.id)!);
      expect(again.id).toBe(o.id);
      expect(again.price.total).toEqual(o.price.total);
      expect(again.supplier).toEqual(o.supplier);
    }
  });
});

describe("vraies marques : aucune étiquette « démo » ou « fictif » dans les offres", () => {
  it.each(LOCALES)("%s : compagnies, numéros de vol, loueurs, agences et établissements", (locale) => {
    const texts: string[] = [];
    for (const s of segments(allFlights(locale))) texts.push(s.marketingCarrier.name, s.operatingCarrier.name, s.flightNumber);
    for (const o of carOffers(locale)) for (const a of [o.pickupAgency, o.returnAgency]) texts.push(o.supplier.name, a.name, a.address, a.accessNote);
    for (const r of hotels(locale)) texts.push(r.hotel.name, r.hotel.address, r.hotel.categoryNote, r.hotel.description, r.hotel.neighborhood);
    expect(texts.length).toBeGreaterThan(100);
    expect(texts.filter((s) => TAG.test(s))).toEqual([]);
  });

  it("français : aucune occurrence de « Démo » ni de « fictive » dans les offres complètes", () => {
    const all = JSON.stringify([allFlights("fr"), carOffers("fr"), hotels("fr")]);
    expect(all).not.toMatch(/Démo|fictive/);
  });
});

describe("références enregistrées avant le passage aux vraies marques", () => {
  // Références produites par la version précédente (compagnies « ZA / ZB / ZC », loueur « Démo Location ») ;
  // totaux relevés avec cette version.
  const LEGACY_FLIGHT =
    "dfl.eyJvIjoiQ0RHIiwiZCI6IkxJUyIsImRkIjoiMjAyNy0wMS0wOCIsInJkIjoiMjAyNy0wMS0xMiIsImEiOjIsImMiOls3XSwiaSI6MSwiY2FiIjoiZWNvbm9teSIsIm91dCI6MCwiaW5iIjowLCJmIjoiQ09ORiIsInQiOjE4MDAwMDAwMDB9";
  const LEGACY_CROSS_BRAND_CAR =
    "dcr.eyJwdSI6Imxpcy1hcHQtZGwiLCJkbyI6ImZjby1hcHQtZGwiLCJtIjoiZWNvIiwicGwiOiIyMDI3LTAxLTIwVDEwOjAwIiwicmwiOiIyMDI3LTAxLTI0VDEwOjAwIiwiYWdlIjoyMiwicmVzIjoiRlIiLCJwcmUiOnRydWUsInQiOjE4MDAwMDAwMDB9";

  it("vol : même identifiant, même prix, horaires inchangés, compagnies réelles", () => {
    const offer = buildFlightOffer(decodeFlightRef(LEGACY_FLIGHT)!);
    expect(offer.id).toBe(LEGACY_FLIGHT);
    expect(offer.price.total.amount).toBe(105475);
    expect(offer.slices[0]!.segments[0]!.departure.local.startsWith("2027-01-08T")).toBe(true);
    for (const s of offer.slices.flatMap((x) => x.segments)) {
      expect(AIRLINES.some((a) => a.iata === s.marketingCarrier.code)).toBe(true);
      expect(s.marketingCarrier.name).not.toMatch(TAG);
    }
    expect(rebuildDemo(LEGACY_FLIGHT).price.total.amount).toBe(105475);
  });

  it("voiture : aller simple Lisbonne → Rome (deux loueurs désormais différents) régénéré sans erreur, au même prix", () => {
    const offer = buildCarOffer(decodeCarRef(LEGACY_CROSS_BRAND_CAR)!);
    expect(offer.price.total.amount).toBe(24100);
    expect(offer.price.payNow.amount).toBe(13200);
    expect(offer.supplier.name).toBe("Budget");
    expect(offer.returnAgency.id).toBe("fco-apt-dl");
    expect(rebuildDemo(LEGACY_CROSS_BRAND_CAR).price.total.amount).toBe(24100);
    // Les nouvelles recherches ne proposent plus d'aller simple d'un loueur à un autre.
    const fresh = generateCarOffers({ pickupPlace: "airport:LIS", dropoffPlace: "airport:FCO", pickupLocal: "2027-01-20T10:00", dropoffLocal: "2027-01-24T10:00", driverAge: 22, residence: "FR", t: T });
    expect(fresh.every((o) => o.supplier.id === DEMO_SUPPLIERS[DEMO_AGENCIES.find((a) => a.id === o.returnAgency.id)!.supplierId]!.id)).toBe(true);
  });

  it("agence ou référence inconnue : erreur « offre introuvable » contrôlée, jamais d'exception inattendue", () => {
    const unknown = `dcr.${Buffer.from(JSON.stringify({ pu: "old-agency", do: "old-agency", m: "eco", pl: "2027-01-20T10:00", rl: "2027-01-24T10:00", age: 30, res: "FR", pre: true, t: T })).toString("base64url")}`;
    expect(() => rebuildDemo(unknown)).toThrow(ProviderError);
    try {
      rebuildDemo(unknown);
    } catch (err) {
      expect((err as ProviderError).code).toBe("OFFER_NOT_FOUND");
    }
    expect(() => rebuildDemo("dfl.pas-du-base64")).toThrow(ProviderError);
  });
});
