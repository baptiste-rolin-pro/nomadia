/**
 * Table compacte des logos pour les composants client (billets, annuaire filtrable) : seulement ce qu'il faut pour
 * afficher l'image sans décalage de mise en page (nom du fichier, rapport largeur / hauteur). Licences, crédits et
 * liens Commons : brand-logos.ts (fichier serveur, plus lourd). Les deux tables concordent (tests/unit/brand-logos.test.ts).
 */

/** Compagnies de l'annuaire qui ont un logo : code IATA → [slug = nom du fichier, largeur ÷ hauteur, « png » si PNG]. */
const AIRLINES: Record<string, readonly [string, number, "png"?]> = {
  AF: ["air-france", 10.5],
  TO: ["transavia-france", 5.71],
  TP: ["tap-air-portugal", 2.03],
  AZ: ["ita-airways", 2.4],
  FI: ["icelandair", 3.83],
  AT: ["royal-air-maroc", 1.46],
  A3: ["aegean-airlines", 4.89],
  JL: ["japan-airlines", 3.72],
  NH: ["all-nippon-airways", 3.85],
  GA: ["garuda-indonesia", 8.71],
  AC: ["air-canada", 7.67],
  TS: ["air-transat", 4.49],
  KL: ["klm", 1.72],
  LH: ["lufthansa", 5.68],
  SK: ["sas", 2.85],
  WF: ["wideroe", 3.42],
  U2: ["easyjet", 4.46],
  VY: ["vueling", 3.08],
  FR: ["ryanair", 8.18],
  W6: ["wizz-air", 2.17],
  GQ: ["sky-express", 1.65],
  SQ: ["singapore-airlines", 9.81],
  IB: ["iberia", 4.54],
};

/** Loueurs de l'annuaire qui ont un logo : slug = nom du fichier → [largeur ÷ hauteur, « png » si PNG]. */
const RENTERS: Record<string, readonly [number, "png"?]> = {
  hertz: [2.06],
  avis: [3.27],
  europcar: [3.92],
  sixt: [2.44],
  enterprise: [4.74],
  budget: [4.71],
  alamo: [2.17],
  thrifty: [3.63],
  "nissan-rent-a-car": [3.29, "png"],
};

/** Logo d'une compagnie (par code IATA) ou d'un loueur (par slug) ; null sans logo du domaine public (monogramme). */
export function brandMarkFor(slug?: string | null, iata?: string): { src: string; ratio: number } | null {
  const m = iata ? (Object.hasOwn(AIRLINES, iata) ? AIRLINES[iata] : undefined) : slug && Object.hasOwn(RENTERS, slug) ? ([slug, ...RENTERS[slug]!] as const) : undefined;
  return m ? { src: `/logos/brands/${m[0]}.${m[2] ?? "svg"}`, ratio: m[1] } : null;
}
