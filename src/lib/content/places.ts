/**
 * Référentiel de lieux pour l'autocomplétion.
 * Identifiants normalisés : « airport:XXX » (code IATA d'aéroport), « city:XXX » (code IATA de ville
 * quand il existe, sinon un code interne préfixé « N- »), « agency:… » pour les agences de location démo.
 * Les coordonnées sont approximatives (centre-ville / aéroport) et servent uniquement à l'affichage.
 */
export type PlaceKind = "airport" | "city";

export interface Place {
  id: string;
  kind: PlaceKind;
  /** Code IATA (aéroport ou ville) ou code interne. */
  code: string;
  name: string;
  /** Libellé non ambigu affiché dans l'autocomplétion. */
  label: string;
  city: string;
  country: string;
  countryCode: string;
  timeZone: string;
  lat: number;
  lng: number;
  /** Destination éditoriale associée. */
  destinationSlug?: string;
  /** Aéroports desservant une ville (pour city:*). */
  airports?: string[];
  /** Mots-clés de recherche supplémentaires (sans accents). */
  keywords?: string[];
}

const a = (
  code: string,
  name: string,
  city: string,
  country: string,
  countryCode: string,
  timeZone: string,
  lat: number,
  lng: number,
  extra: Partial<Place> = {},
): Place => ({
  id: `airport:${code}`,
  kind: "airport",
  code,
  name,
  label: `${city} — ${name} (${code}), ${country}`,
  city,
  country,
  countryCode,
  timeZone,
  lat,
  lng,
  ...extra,
});

const c = (
  code: string,
  city: string,
  country: string,
  countryCode: string,
  timeZone: string,
  lat: number,
  lng: number,
  airports: string[],
  extra: Partial<Place> = {},
): Place => ({
  id: `city:${code}`,
  kind: "city",
  code,
  name: city,
  label: airports.length > 1 ? `${city}, ${country} — tous les aéroports` : `${city}, ${country} (ville)`,
  city,
  country,
  countryCode,
  timeZone,
  lat,
  lng,
  airports,
  ...extra,
});

export const places: Place[] = [
  // France (origines principales)
  c("PAR", "Paris", "France", "FR", "Europe/Paris", 48.8566, 2.3522, ["CDG", "ORY"]),
  a("CDG", "Aéroport Paris-Charles de Gaulle", "Paris", "France", "FR", "Europe/Paris", 49.0097, 2.5479, { keywords: ["roissy"] }),
  a("ORY", "Aéroport Paris-Orly", "Paris", "France", "FR", "Europe/Paris", 48.7262, 2.3652),
  a("LYS", "Aéroport Lyon-Saint Exupéry", "Lyon", "France", "FR", "Europe/Paris", 45.7256, 5.0811),
  a("MRS", "Aéroport Marseille Provence", "Marseille", "France", "FR", "Europe/Paris", 43.4393, 5.2214),
  a("NCE", "Aéroport Nice Côte d'Azur", "Nice", "France", "FR", "Europe/Paris", 43.6584, 7.2159),
  a("BOD", "Aéroport de Bordeaux-Mérignac", "Bordeaux", "France", "FR", "Europe/Paris", 44.8283, -0.7156),
  a("NTE", "Aéroport Nantes Atlantique", "Nantes", "France", "FR", "Europe/Paris", 47.1532, -1.6107),
  a("TLS", "Aéroport Toulouse-Blagnac", "Toulouse", "France", "FR", "Europe/Paris", 43.6291, 1.3638),

  // Destinations avec offres de démonstration
  c("LIS", "Lisbonne", "Portugal", "PT", "Europe/Lisbon", 38.7223, -9.1393, ["LIS"], { destinationSlug: "lisbonne", keywords: ["lisboa", "lisbon"] }),
  a("LIS", "Aéroport Humberto Delgado", "Lisbonne", "Portugal", "PT", "Europe/Lisbon", 38.7742, -9.1342, { destinationSlug: "lisbonne", keywords: ["lisboa", "lisbon"] }),
  c("ROM", "Rome", "Italie", "IT", "Europe/Rome", 41.9028, 12.4964, ["FCO", "CIA"], { destinationSlug: "rome", keywords: ["roma"] }),
  a("FCO", "Aéroport Rome-Fiumicino Leonardo da Vinci", "Rome", "Italie", "IT", "Europe/Rome", 41.8003, 12.2389, { destinationSlug: "rome", keywords: ["roma", "fiumicino"] }),
  a("CIA", "Aéroport Rome-Ciampino", "Rome", "Italie", "IT", "Europe/Rome", 41.7994, 12.5949, { destinationSlug: "rome", keywords: ["roma", "ciampino"] }),
  c("REK", "Reykjavik", "Islande", "IS", "Atlantic/Reykjavik", 64.1466, -21.9426, ["KEF"], { destinationSlug: "reykjavik", keywords: ["reykjavik", "islande", "iceland"] }),
  a("KEF", "Aéroport international de Keflavík", "Reykjavik", "Islande", "IS", "Atlantic/Reykjavik", 63.985, -22.6056, { destinationSlug: "reykjavik", keywords: ["keflavik", "islande"] }),

  // Autres destinations éditoriales (pas d'offres de démonstration).
  // Codes « N-… » : codes internes Nomadia, pas des codes IATA.
  c("N-RAK", "Marrakech", "Maroc", "MA", "Africa/Casablanca", 31.6295, -7.9811, ["RAK"], { destinationSlug: "marrakech" }),
  c("N-FNC", "Madère (Funchal)", "Portugal", "PT", "Atlantic/Madeira", 32.6669, -16.9241, ["FNC"], { destinationSlug: "madere", keywords: ["madeira", "funchal"] }),
  c("N-ATH", "Athènes", "Grèce", "GR", "Europe/Athens", 37.9838, 23.7275, ["ATH"], { destinationSlug: "athenes", keywords: ["athens"] }),
  c("N-KYO", "Kyoto", "Japon", "JP", "Asia/Tokyo", 35.0116, 135.7681, ["KIX"], { destinationSlug: "kyoto" }),
  c("N-BAL", "Bali (Ubud)", "Indonésie", "ID", "Asia/Makassar", -8.5069, 115.2625, ["DPS"], { destinationSlug: "bali", keywords: ["ubud"] }),
  c("N-MTL", "Montréal", "Canada", "CA", "America/Toronto", 45.5019, -73.5674, ["YUL"], { destinationSlug: "montreal" }),
  c("N-CPT", "Le Cap", "Afrique du Sud", "ZA", "Africa/Johannesburg", -33.9249, 18.4241, ["CPT"], { destinationSlug: "le-cap", keywords: ["cape town"] }),
  c("N-DOL", "Dolomites (Cortina d'Ampezzo)", "Italie", "IT", "Europe/Rome", 46.5405, 12.1357, ["VCE", "INN"], { destinationSlug: "dolomites", keywords: ["dolomiti", "cortina"] }),
  c("N-LOF", "Îles Lofoten (Svolvær)", "Norvège", "NO", "Europe/Oslo", 68.2342, 14.5683, ["BOO", "LKN", "EVE"], { destinationSlug: "lofoten", keywords: ["lofoten", "svolvaer"] }),
  a("RAK", "Aéroport Marrakech-Ménara", "Marrakech", "Maroc", "MA", "Africa/Casablanca", 31.6069, -8.0363, { destinationSlug: "marrakech" }),
  a("FNC", "Aéroport de Madère Cristiano Ronaldo", "Funchal", "Portugal", "PT", "Atlantic/Madeira", 32.6979, -16.7745, { destinationSlug: "madere", keywords: ["madere", "madeira"] }),
  a("ATH", "Aéroport international d'Athènes Elefthérios-Venizélos", "Athènes", "Grèce", "GR", "Europe/Athens", 37.9364, 23.9445, { destinationSlug: "athenes", keywords: ["athens", "athina"] }),
  a("KIX", "Aéroport international du Kansai", "Osaka", "Japon", "JP", "Asia/Tokyo", 34.4347, 135.244, { destinationSlug: "kyoto", keywords: ["kyoto", "kansai"] }),
  a("DPS", "Aéroport international Ngurah Rai", "Denpasar (Bali)", "Indonésie", "ID", "Asia/Makassar", -8.7482, 115.1675, { destinationSlug: "bali", keywords: ["bali"] }),
  a("YUL", "Aéroport international Montréal-Trudeau", "Montréal", "Canada", "CA", "America/Toronto", 45.4706, -73.7408, { destinationSlug: "montreal", keywords: ["montreal", "quebec"] }),
  a("CPT", "Aéroport international du Cap", "Le Cap", "Afrique du Sud", "ZA", "Africa/Johannesburg", -33.9715, 18.6021, { destinationSlug: "le-cap", keywords: ["cape town", "le cap"] }),
  a("VCE", "Aéroport de Venise Marco Polo", "Venise", "Italie", "IT", "Europe/Rome", 45.5053, 12.3519, { destinationSlug: "dolomites", keywords: ["dolomites", "venezia"] }),
  a("INN", "Aéroport d'Innsbruck", "Innsbruck", "Autriche", "AT", "Europe/Vienna", 47.2602, 11.344, { destinationSlug: "dolomites", keywords: ["dolomites"] }),
  a("BOO", "Aéroport de Bodø", "Bodø", "Norvège", "NO", "Europe/Oslo", 67.2692, 14.3653, { destinationSlug: "lofoten", keywords: ["lofoten", "bodo"] }),
  a("LKN", "Aéroport de Leknes", "Leknes", "Norvège", "NO", "Europe/Oslo", 68.1525, 13.6094, { destinationSlug: "lofoten", keywords: ["lofoten"] }),
  a("EVE", "Aéroport de Harstad/Narvik-Evenes", "Evenes", "Norvège", "NO", "Europe/Oslo", 68.4913, 16.6781, { destinationSlug: "lofoten", keywords: ["lofoten", "narvik", "harstad"] }),

  // Escales de démonstration
  a("MAD", "Aéroport Adolfo Suárez Madrid-Barajas", "Madrid", "Espagne", "ES", "Europe/Madrid", 40.4983, -3.5676),
  a("AMS", "Aéroport d'Amsterdam-Schiphol", "Amsterdam", "Pays-Bas", "NL", "Europe/Amsterdam", 52.3105, 4.7683),
  a("CPH", "Aéroport de Copenhague-Kastrup", "Copenhague", "Danemark", "DK", "Europe/Copenhagen", 55.618, 12.656),
  a("MUC", "Aéroport de Munich", "Munich", "Allemagne", "DE", "Europe/Berlin", 48.3537, 11.775),
];

const byId = new Map(places.map((p) => [p.id, p]));

export function getPlace(id: string): Place | undefined {
  return byId.get(id);
}

export function airportByCode(code: string): Place | undefined {
  return byId.get(`airport:${code}`);
}

/** Aéroports correspondant à un lieu (une ville se résout en ses aéroports). */
export function airportsFor(place: Place): Place[] {
  if (place.kind === "airport") return [place];
  return (place.airports ?? []).map((code) => airportByCode(code)).filter((p): p is Place => !!p);
}

export function normalize(text: string): string {
  return text
    .normalize("NFD")
    .replace(/[̀-ͯ]/g, "")
    .toLowerCase()
    .trim();
}

export function searchPlaces(query: string, opts: { kinds?: PlaceKind[]; limit?: number } = {}): Place[] {
  const q = normalize(query);
  if (q.length < 2) return [];
  const kinds = opts.kinds ?? ["airport", "city"];
  const scored = places
    .filter((p) => kinds.includes(p.kind))
    .map((p) => {
      const hay = [p.code, p.city, p.name, p.country, ...(p.keywords ?? [])].map(normalize);
      let score = 0;
      if (normalize(p.code) === q) score = 100;
      else if (hay.some((h) => h.startsWith(q))) score = 60;
      else if (hay.some((h) => h.includes(q))) score = 30;
      if (score && p.kind === "city") score += 5;
      return { p, score };
    })
    .filter((x) => x.score > 0)
    .sort((x, y) => y.score - x.score || x.p.label.localeCompare(y.p.label, "fr"));
  return scored.slice(0, opts.limit ?? 8).map((x) => x.p);
}

/** Lieux proposés pour l'hôtellerie (villes uniquement). */
export function hotelDestinations(): Place[] {
  return places.filter((p) => p.kind === "city" && p.destinationSlug);
}
