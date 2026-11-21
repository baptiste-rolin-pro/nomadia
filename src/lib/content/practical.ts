/**
 * Informations pratiques « Y aller / Sur place » des 12 destinations : aéroport d'accès, liaisons sans escale
 * relevées (compagnies observées) et location de voiture (modèles « ou similaires », zone couverte par les agences,
 * loueurs observés).
 *
 * - Statut : informations OBSERVÉES le 2026-11-21 sur des pages publiques, à titre indicatif, sans garantie. Les
 *   liaisons, compagnies et agences changent ; aucune de ces marques n'est partenaire de Nomadia ni réservable ici.
 * - Données réduites à l'usage éditorial : aucune URL source, aucun hébergement, aucune enseigne hôtelière, aucun
 *   annuaire en masse. Provenance, sélection et exclusions : docs/data-sources.md.
 * - Les noms de marques et de modèles ne se traduisent pas. Les noms de lieux viennent du référentiel
 *   (src/lib/content/places.ts, traduit par les packs de contenu) ou, pour les quelques lieux qui n'y figurent pas,
 *   de `PRACTICAL_PLACES` ci-dessous (traduits par la clé `practical` des packs de contenu).
 * - Une marque n'a de lien que si elle figure dans l'annuaire (src/lib/content/directory.ts) ; les autres sont
 *   citées en texte simple (vérifié par tests/unit/practical.test.ts).
 */
import type { CivilDate } from "@/lib/dates";

/** Date du relevé (affichée dans la mention « informations relevées le … »). */
export const PRACTICAL_OBSERVED_ON: CivilDate = "2026-11-21";

/** Nombre maximal de modèles affichés par relevé (les premiers dans l'ordre observé). */
export const MAX_MODELS = 6;

/** Marque citée : `slug` seulement si elle a une fiche dans l'annuaire (compagnie ou loueur selon le contexte). */
export interface BrandRef {
  name: string;
  slug?: string;
}

/**
 * Liaison sans escale relevée. `from` / `to` : code IATA d'aéroport, ou code de ville IATA (« PAR » = tous les
 * aéroports de Paris).
 */
export interface PracticalRoute {
  from: string;
  to: string;
  airlines: BrandRef[];
}

/** Zone couverte par les agences relevées. `airport` : code IATA ; `town` : clé de `PRACTICAL_TOWNS` ou slug de destination. */
export type AgencyArea =
  | { kind: "airport"; airport: string }
  | { kind: "airport-shuttle"; airport: string }
  | { kind: "town"; town: string }
  | { kind: "town-airport"; town: string; airport: string };

/** Relevé de location de voiture. `segment: "suv"` : relevé issu d'une recherche limitée aux SUV. */
export interface CarObservation {
  area: AgencyArea;
  models: string[];
  renters: BrandRef[];
  segment?: "suv";
}

export interface PracticalInfo {
  slug: string;
  /** Aéroport d'accès relevé (code IATA). */
  accessAirport: string;
  routes: PracticalRoute[];
  cars: CarObservation[];
}

/**
 * Aéroports cités qui ne figurent pas dans le référentiel de recherche (noms français ; traductions : clé
 * `practical.airports` des packs de contenu). Ils ne sont volontairement PAS ajoutés au référentiel : la recherche
 * et l'assistant restent inchangés.
 */
export const PRACTICAL_AIRPORTS: Record<string, string> = {
  SIN: "Aéroport de Singapour-Changi",
  JNB: "Aéroport international O. R. Tambo de Johannesburg",
  SVJ: "Aéroport de Svolvær-Helle",
};

/** Localités citées qui ne sont pas des destinations éditoriales (traductions : clé `practical.towns`). */
export const PRACTICAL_TOWNS: Record<string, string> = {
  svolvaer: "Svolvær",
};

/** Codes de ville (et non d'aéroport) utilisés dans les liaisons. */
export const CITY_CODES = new Set(["PAR"]);

/** Origines considérées comme « depuis Paris ». */
export const PARIS_CODES = new Set(["PAR", "CDG", "ORY"]);

// Compagnies et loueurs : lien vers l'annuaire seulement quand la fiche existe.
const airline = (name: string, slug?: string): BrandRef => (slug ? { name, slug } : { name });
const renter = airline;

const AF = airline("Air France", "air-france");
const TO = airline("Transavia France", "transavia-france");
const U2 = airline("easyJet", "easyjet");
const FR = airline("Ryanair", "ryanair");

const HERTZ = renter("Hertz", "hertz");
const AVIS = renter("Avis", "avis");
const EUROPCAR = renter("Europcar", "europcar");
const SIXT = renter("Sixt", "sixt");
const BUDGET = renter("Budget", "budget");
const ALAMO = renter("Alamo", "alamo");
const THRIFTY = renter("Thrifty", "thrifty");
const KEDDY = renter("keddy by Europcar");

export const PRACTICAL: PracticalInfo[] = [
  {
    slug: "lisbonne",
    accessAirport: "LIS",
    routes: [{ from: "PAR", to: "LIS", airlines: [AF, FR, airline("TAP Air Portugal", "tap-air-portugal")] }],
    cars: [
      {
        area: { kind: "town-airport", town: "lisbonne", airport: "LIS" },
        models: ["Dacia Sandero", "Renault Mégane", "Peugeot 3008", "Fiat 500", "Mercedes-Benz A-Class", "Volkswagen Caddy"],
        renters: [renter("Klass Wagen"), renter("Wheego"), renter("Centauro", "centauro"), BUDGET, ALAMO],
      },
    ],
  },
  {
    slug: "rome",
    accessAirport: "FCO",
    routes: [{ from: "ORY", to: "FCO", airlines: [TO, airline("Wizz Air", "wizz-air"), U2] }],
    cars: [
      {
        area: { kind: "airport", airport: "FCO" },
        models: ["Peugeot 208", "Skoda Fabia", "Toyota Aygo", "Volkswagen Multivan", "Seat Arona", "Volkswagen T-Roc"],
        renters: [HERTZ, renter("Dollar", "dollar"), renter("Autovia"), renter("Rent Smart 24")],
      },
    ],
  },
  {
    slug: "reykjavik",
    accessAirport: "KEF",
    routes: [{ from: "PAR", to: "KEF", airlines: [airline("Icelandair", "icelandair"), TO, U2] }],
    cars: [
      {
        area: { kind: "airport-shuttle", airport: "KEF" },
        models: ["Dacia Sandero", "Volkswagen Golf", "Kia Picanto", "Kia Ceed SW", "Dacia Duster"],
        renters: [renter("Fair Car"), SIXT, EUROPCAR],
      },
    ],
  },
  {
    slug: "marrakech",
    accessAirport: "RAK",
    routes: [{ from: "PAR", to: "RAK", airlines: [AF, airline("Royal Air Maroc", "royal-air-maroc"), FR] }],
    cars: [
      {
        area: { kind: "airport-shuttle", airport: "RAK" },
        models: ["Fiat Panda", "Dacia Logan", "Kia Sportage", "Kia Picanto", "Dacia Duster"],
        renters: [renter("Locationauto"), renter("Ace"), renter("OptimoRent"), renter("U-Save"), AVIS],
      },
    ],
  },
  {
    slug: "madere",
    accessAirport: "FNC",
    routes: [{ from: "PAR", to: "FNC", airlines: [TO] }],
    cars: [
      {
        area: { kind: "airport", airport: "FNC" },
        models: ["Volkswagen Polo", "Ford Focus", "Fiat 500", "Dacia Jogger", "Kia Ceed SW", "Seat Arona"],
        renters: [renter("FunchalDrive Rent-a-car"), renter("Madeira Rent"), HERTZ, BUDGET],
      },
    ],
  },
  {
    slug: "athenes",
    accessAirport: "ATH",
    routes: [{ from: "PAR", to: "ATH", airlines: [airline("Aegean Airlines", "aegean-airlines"), AF, airline("Sky Express", "sky-express")] }],
    cars: [
      {
        area: { kind: "airport", airport: "ATH" },
        models: ["Seat Ibiza", "Skoda Fabia", "Fiat Panda", "Opel Combo", "Ford Kuga", "Nissan Qashqai"],
        renters: [BUDGET, renter("CarQ"), THRIFTY, renter("Lets Drive")],
      },
    ],
  },
  {
    slug: "kyoto",
    accessAirport: "KIX",
    routes: [{ from: "CDG", to: "KIX", airlines: [AF] }],
    cars: [
      {
        area: { kind: "town", town: "kyoto" },
        models: ["Nissan March", "Toyota Corolla", "Nissan Dayz", "Toyota Sienta", "Toyota Raize", "Nissan Kicks"],
        renters: [renter("Toyota Rent a Car", "toyota-rent-a-car"), renter("Nissan Rent-A-Car", "nissan-rent-a-car"), HERTZ],
      },
    ],
  },
  {
    slug: "bali",
    accessAirport: "DPS",
    routes: [
      { from: "PAR", to: "SIN", airlines: [airline("Singapore Airlines", "singapore-airlines"), AF] },
      { from: "SIN", to: "DPS", airlines: [airline("Garuda Indonesia", "garuda-indonesia"), airline("Jetstar"), airline("KLM", "klm")] },
    ],
    cars: [
      {
        area: { kind: "airport", airport: "DPS" },
        models: ["Mazda2", "Toyota Agya", "Toyota Avanza"],
        renters: [AVIS, renter("TRAC Astra"), renter("EasyRent Bali"), KEDDY],
      },
    ],
  },
  {
    slug: "montreal",
    accessAirport: "YUL",
    routes: [{ from: "PAR", to: "YUL", airlines: [airline("Air Canada", "air-canada"), AF, airline("Air Transat", "air-transat")] }],
    cars: [
      {
        area: { kind: "airport", airport: "YUL" },
        models: ["Kia Rio", "Nissan Versa", "Dodge Grand Caravan", "Kia Sportage", "Ford Edge"],
        renters: [AVIS, ALAMO, HERTZ, EUROPCAR],
      },
    ],
  },
  {
    slug: "le-cap",
    accessAirport: "CPT",
    routes: [
      { from: "CDG", to: "CPT", airlines: [AF] },
      { from: "JNB", to: "CPT", airlines: [airline("Airlink", "airlink"), airline("CemAir"), airline("FlySafair", "flysafair")] },
    ],
    cars: [
      {
        area: { kind: "airport", airport: "CPT" },
        models: ["Suzuki Swift", "Toyota Agya", "Volkswagen Polo", "Suzuki Ertiga", "BMW 3 Series", "Mercedes-Benz C-Class"],
        renters: [SIXT, HERTZ, THRIFTY, renter("Tempest Car Hire"), BUDGET],
      },
    ],
  },
  {
    slug: "dolomites",
    accessAirport: "VCE",
    routes: [{ from: "PAR", to: "VCE", airlines: [AF, TO, U2] }],
    cars: [
      {
        area: { kind: "airport", airport: "VCE" },
        models: ["Opel Corsa", "Toyota Corolla", "Peugeot 3008", "Fiat Panda", "Fiat Talento", "Seat Arona"],
        renters: [THRIFTY, AVIS, BUDGET],
      },
    ],
  },
  {
    slug: "lofoten",
    accessAirport: "SVJ",
    routes: [{ from: "BOO", to: "SVJ", airlines: [airline("Widerøe", "wideroe")] }],
    cars: [
      {
        area: { kind: "airport", airport: "SVJ" },
        models: ["Volkswagen ID.3"],
        renters: [AVIS, BUDGET, EUROPCAR, HERTZ, SIXT, KEDDY],
      },
      {
        area: { kind: "town", town: "svolvaer" },
        models: ["Toyota Yaris Cross", "Toyota RAV4", "Suzuki SX4 S-Cross", "Volvo XC60"],
        renters: [HERTZ, SIXT, BUDGET],
        segment: "suv",
      },
    ],
  },
];

const bySlug = new Map(PRACTICAL.map((p) => [p.slug, p]));

export function getPractical(slug: string): PracticalInfo | undefined {
  return bySlug.get(slug);
}

export type ParisAccess = { kind: "direct" } | { kind: "connection"; via: string } | { kind: "first"; via: string };

/**
 * Accès depuis Paris d'après les liaisons relevées :
 * - « direct » : une liaison sans escale part de Paris vers l'aéroport d'accès ;
 * - « connection » : Paris → escale puis escale → aéroport d'accès, les deux tronçons relevés (Bali via SIN) ;
 * - « first » : seul le dernier tronçon est relevé ; il faut d'abord rejoindre son origine (Lofoten via BOO).
 */
export function parisAccess(info: PracticalInfo): ParisAccess {
  if (info.routes.some((r) => PARIS_CODES.has(r.from) && r.to === info.accessAirport)) return { kind: "direct" };
  const last = info.routes.find((r) => r.to === info.accessAirport);
  const via = last?.from ?? info.accessAirport;
  const fromParis = info.routes.some((r) => PARIS_CODES.has(r.from) && r.to === via);
  return fromParis ? { kind: "connection", via } : { kind: "first", via };
}
