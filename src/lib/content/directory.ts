/**
 * Annuaires des compagnies aériennes et des loueurs.
 * - La présence d'une marque ne signifie AUCUN partenariat contractuel avec Nomadia.
 * - Aucun logo n'est affiché faute de droit d'usage documenté : un monogramme textuel le remplace.
 * - Les règles de bagages, de modification, de remboursement, de caution ou de franchise dépendent
 *   de l'offre et de l'agence : elles ne sont jamais déduites du nom de la marque.
 * - Les fiches à faible valeur éditoriale restent non indexées (`indexable: false`).
 */
export interface AirlineEntry {
  slug: string;
  name: string;
  iata: string;
  icao: string;
  country: string;
  website: string;
  summary: string;
  indexable: boolean;
}

export const AIRLINES: AirlineEntry[] = [
  { slug: "air-france", name: "Air France", iata: "AF", icao: "AFR", country: "France", website: "https://www.airfrance.fr/", summary: "Compagnie nationale française, dont la principale plateforme de correspondance est Paris-Charles de Gaulle.", indexable: false },
  { slug: "transavia-france", name: "Transavia France", iata: "TO", icao: "TVF", country: "France", website: "https://www.transavia.com/", summary: "Compagnie à bas coûts du groupe Air France-KLM, très présente à Paris-Orly.", indexable: false },
  { slug: "tap-air-portugal", name: "TAP Air Portugal", iata: "TP", icao: "TAP", country: "Portugal", website: "https://www.flytap.com/", summary: "Compagnie nationale portugaise, basée à Lisbonne.", indexable: false },
  { slug: "ita-airways", name: "ITA Airways", iata: "AZ", icao: "ITY", country: "Italie", website: "https://www.ita-airways.com/", summary: "Compagnie italienne basée à Rome-Fiumicino, qui a succédé à Alitalia en 2021.", indexable: false },
  { slug: "icelandair", name: "Icelandair", iata: "FI", icao: "ICE", country: "Islande", website: "https://www.icelandair.com/", summary: "Compagnie islandaise dont la base est l'aéroport de Keflavík.", indexable: false },
  { slug: "royal-air-maroc", name: "Royal Air Maroc", iata: "AT", icao: "RAM", country: "Maroc", website: "https://www.royalairmaroc.com/", summary: "Compagnie nationale marocaine, basée à Casablanca.", indexable: false },
  { slug: "aegean-airlines", name: "Aegean Airlines", iata: "A3", icao: "AEE", country: "Grèce", website: "https://www.aegeanair.com/", summary: "Compagnie grecque dont la base principale est Athènes.", indexable: false },
  { slug: "japan-airlines", name: "Japan Airlines", iata: "JL", icao: "JAL", country: "Japon", website: "https://www.jal.co.jp/", summary: "Compagnie japonaise basée à Tokyo.", indexable: false },
  { slug: "all-nippon-airways", name: "All Nippon Airways", iata: "NH", icao: "ANA", country: "Japon", website: "https://www.ana.co.jp/", summary: "Compagnie japonaise basée à Tokyo.", indexable: false },
  { slug: "garuda-indonesia", name: "Garuda Indonesia", iata: "GA", icao: "GIA", country: "Indonésie", website: "https://www.garuda-indonesia.com/", summary: "Compagnie nationale indonésienne, basée à Jakarta.", indexable: false },
  { slug: "air-canada", name: "Air Canada", iata: "AC", icao: "ACA", country: "Canada", website: "https://www.aircanada.com/", summary: "Principale compagnie canadienne, dont le siège est à Montréal.", indexable: false },
  { slug: "air-transat", name: "Air Transat", iata: "TS", icao: "TSC", country: "Canada", website: "https://www.airtransat.com/", summary: "Compagnie canadienne basée à Montréal.", indexable: false },
  { slug: "klm", name: "KLM", iata: "KL", icao: "KLM", country: "Pays-Bas", website: "https://www.klm.fr/", summary: "Compagnie néerlandaise du groupe Air France-KLM, basée à Amsterdam-Schiphol.", indexable: false },
  { slug: "lufthansa", name: "Lufthansa", iata: "LH", icao: "DLH", country: "Allemagne", website: "https://www.lufthansa.com/", summary: "Compagnie allemande dont les principales plateformes sont Francfort et Munich.", indexable: false },
  { slug: "sas", name: "SAS Scandinavian Airlines", iata: "SK", icao: "SAS", country: "Danemark, Norvège, Suède", website: "https://www.flysas.com/", summary: "Compagnie scandinave opérant notamment depuis Copenhague, Oslo et Stockholm.", indexable: false },
  { slug: "wideroe", name: "Widerøe", iata: "WF", icao: "WIF", country: "Norvège", website: "https://www.wideroe.no/", summary: "Compagnie régionale norvégienne qui dessert de nombreux petits aéroports du nord du pays.", indexable: false },
  { slug: "easyjet", name: "easyJet", iata: "U2", icao: "EZY", country: "Royaume-Uni", website: "https://www.easyjet.com/", summary: "Compagnie européenne à bas coûts.", indexable: false },
  { slug: "vueling", name: "Vueling", iata: "VY", icao: "VLG", country: "Espagne", website: "https://www.vueling.com/", summary: "Compagnie espagnole à bas coûts basée à Barcelone.", indexable: false },
];

export interface RenterEntry {
  slug: string;
  name: string;
  website: string;
  summary: string;
  countriesNote: string;
  indexable: boolean;
}

export const RENTERS: RenterEntry[] = [
  { slug: "hertz", name: "Hertz", website: "https://www.hertz.fr/", summary: "Loueur international présent dans de nombreux aéroports.", countriesNote: "Pays de présence non vérifiés par Nomadia : consultez la recherche d'agences sur le site officiel.", indexable: false },
  { slug: "avis", name: "Avis", website: "https://www.avis.fr/", summary: "Loueur international de véhicules.", countriesNote: "Pays de présence non vérifiés par Nomadia : consultez la recherche d'agences sur le site officiel.", indexable: false },
  { slug: "europcar", name: "Europcar", website: "https://www.europcar.fr/", summary: "Loueur d'origine française, présent en France et à l'international.", countriesNote: "Pays de présence non vérifiés par Nomadia : consultez la recherche d'agences sur le site officiel.", indexable: false },
  { slug: "sixt", name: "Sixt", website: "https://www.sixt.fr/", summary: "Loueur d'origine allemande.", countriesNote: "Pays de présence non vérifiés par Nomadia : consultez la recherche d'agences sur le site officiel.", indexable: false },
  { slug: "enterprise", name: "Enterprise Rent-A-Car", website: "https://www.enterprise.fr/", summary: "Loueur d'origine américaine.", countriesNote: "Pays de présence non vérifiés par Nomadia : consultez la recherche d'agences sur le site officiel.", indexable: false },
  { slug: "budget", name: "Budget", website: "https://www.budget.fr/", summary: "Loueur de véhicules.", countriesNote: "Pays de présence non vérifiés par Nomadia : consultez la recherche d'agences sur le site officiel.", indexable: false },
];

export function getAirline(slug: string): AirlineEntry | undefined {
  return AIRLINES.find((a) => a.slug === slug);
}

export function getRenter(slug: string): RenterEntry | undefined {
  return RENTERS.find((r) => r.slug === slug);
}
