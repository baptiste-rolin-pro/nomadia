/**
 * Table compacte des logos pour les composants client (billets, annuaire filtrable) : seulement ce qu'il faut pour
 * afficher l'image sans décalage de mise en page. Licences, crédits et liens Commons : brand-logos.ts (fichier
 * serveur, plus lourd). Les deux tables sont identiques (vérifié par tests/unit/brand-logos.test.ts).
 */
/** slug de l'annuaire → [largeur, hauteur] du viewBox du fichier public/logos/brands/<slug>.svg (« png » : fichier PNG). */
export const BRAND_MARKS: Record<string, readonly [number, number, "png"?]> = {
  "air-france": [189, 18],
  "transavia-france": [160, 28],
  "tap-air-portugal": [239, 118],
  "ita-airways": [480, 200],
  "icelandair": [2300, 600],
  "royal-air-maroc": [2492, 1711],
  "aegean-airlines": [225, 46],
  "japan-airlines": [235, 63],
  "all-nippon-airways": [300, 78],
  "garuda-indonesia": [1472, 169],
  "air-canada": [160, 21],
  "air-transat": [235, 52],
  "klm": [350, 204],
  "lufthansa": [3326, 586],
  "sas": [114, 40],
  "wideroe": [255, 75],
  "easyjet": [397, 89],
  "vueling": [768, 249],
  "ryanair": [79, 10],
  "wizz-air": [130, 60],
  "sky-express": [675, 410],
  "singapore-airlines": [468, 48],
  "iberia": [400, 88],
  "hertz": [612, 296],
  "avis": [590, 180],
  "europcar": [620, 158],
  "sixt": [1000, 410],
  "enterprise": [251, 53],
  "budget": [849, 180],
  "alamo": [1094, 504],
  "thrifty": [479, 132],
  "nissan-rent-a-car": [355, 108, "png"],
};

/** Code IATA → slug, pour les compagnies de l'annuaire qui ont un logo. */
const AIRLINE_SLUGS: Record<string, string> = {
  AF: "air-france", TO: "transavia-france", TP: "tap-air-portugal", AZ: "ita-airways", FI: "icelandair", AT: "royal-air-maroc", A3: "aegean-airlines", JL: "japan-airlines", NH: "all-nippon-airways", GA: "garuda-indonesia", AC: "air-canada", TS: "air-transat", KL: "klm", LH: "lufthansa", SK: "sas", WF: "wideroe", U2: "easyjet", VY: "vueling", FR: "ryanair", W6: "wizz-air", GQ: "sky-express", SQ: "singapore-airlines", IB: "iberia",
};

export function brandMarkFor(slug: string | null | undefined): { src: string; width: number; height: number } | null {
  if (!slug || !Object.hasOwn(BRAND_MARKS, slug)) return null;
  const [width, height, ext = "svg"] = BRAND_MARKS[slug]!;
  return { src: `/logos/brands/${slug}.${ext}`, width, height };
}

export function airlineMarkSlug(iata: string): string | undefined {
  return Object.hasOwn(AIRLINE_SLUGS, iata) ? AIRLINE_SLUGS[iata] : undefined;
}
