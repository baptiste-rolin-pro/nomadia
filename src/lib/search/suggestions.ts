/**
 * Suggestions de recherche préremplies (vols, hôtels, voitures, voyages), calculées à partir d'aujourd'hui.
 * Vols, hôtels et voitures : uniquement les trajets couverts par les offres de démonstration (Lisbonne, Rome,
 * Reykjavik, départs de France), pour que chaque suggestion mène à des résultats.
 * Voyages : idées sur les douze destinations, datées selon les saisons décrites dans leurs fiches.
 * Toutes les dates restent dans l'horizon de réservation (MAX_BOOKING_HORIZON_DAYS).
 */
import { addDays, formatCivilDate, parseCivilDate, weekday, type CivilDate } from "@/lib/dates";
import { MAX_BOOKING_HORIZON_DAYS } from "@/lib/search/query";

export interface Suggestion {
  id: string;
  /** Repère court : saison, durée, type de voyage. */
  tag: string;
  title: string;
  /** Trajet ou lieu, dates et voyageurs. */
  detail: string;
  /** Lien vers la recherche (ou le formulaire) prérempli : jamais « # ». */
  href: string;
  photoId: string;
  destinationSlug: string;
}

/** Fenêtre saisonnière [mois, jour] → [mois, jour], éventuellement à cheval sur deux années. */
type MonthDay = readonly [number, number];
type Window = readonly [MonthDay, MonthDay];

function monthDay(date: CivilDate): number {
  const p = parseCivilDate(date)!;
  return p.month * 100 + p.day;
}

function inWindow(date: CivilDate, [from, to]: Window): boolean {
  const md = monthDay(date);
  const a = from[0] * 100 + from[1];
  const b = to[0] * 100 + to[1];
  return a <= b ? md >= a && md <= b : md >= a || md <= b;
}

/** Premier départ possible dans l'une des fenêtres, au moins `lead` jours après aujourd'hui, séjour compris dans l'horizon. */
export function nextInSeason(today: CivilDate, windows: readonly Window[], lead: number, stayDays: number): CivilDate {
  const last = MAX_BOOKING_HORIZON_DAYS - stayDays;
  for (let i = lead; i <= last; i++) {
    const d = addDays(today, i);
    if (windows.some((w) => inWindow(d, w))) return d;
  }
  return addDays(today, lead);
}

/** Prochain jour donné de la semaine (0 = dimanche … 6 = samedi), au moins `lead` jours après aujourd'hui. */
export function nextWeekday(today: CivilDate, day: number, lead: number): CivilDate {
  const start = addDays(today, lead);
  return addDays(start, (day - weekday(start) + 7) % 7);
}

const fmt = (d: CivilDate) => formatCivilDate(d, "weekday");
const range = (a: CivilDate, b: CivilDate) => `${fmt(a)} → ${fmt(b)}`;
const plural = (n: number, one: string, many: string) => `${n} ${n > 1 ? many : one}`;

function travelers(adults: number, children = 0): string {
  return [plural(adults, "adulte", "adultes"), children ? plural(children, "enfant", "enfants") : null].filter(Boolean).join(", ");
}

const q = (path: string, params: Record<string, string>) => `${path}?${new URLSearchParams(params).toString()}`;

// Saisons reprises des fiches destinations (src/lib/content/destinations.ts).
const ROME_COMFORT: Window[] = [
  [[4, 1], [6, 30]],
  [[9, 1], [10, 31]],
];
const ICELAND_AURORA: Window[] = [[[9, 1], [4, 30]]];
const ICELAND_SUMMER: Window[] = [[[6, 1], [8, 31]]];
const LISBON_MILD: Window[] = [
  [[3, 20], [6, 15]],
  [[9, 15], [11, 15]],
];
const WINTER: Window[] = [[[12, 1], [2, 28]]];

// ---------------------------------------------------------------------------
// Vols (départs de France vers Lisbonne, Rome, Keflavík)

export function flightSuggestions(today: CivilDate): Suggestion[] {
  const flight = (o: string, d: string, dep: CivilDate, ret: CivilDate | null, adt: number, chd: string[] = []) =>
    q("/vols", { o, d, type: ret ? "ar" : "as", dep, ...(ret ? { ret } : {}), adt: String(adt), ...(chd.length ? { chd: chd.join(",") } : {}) });

  const wkFri = nextWeekday(today, 5, 6);
  const wkMon = addDays(wkFri, 3);
  const romeDep = nextInSeason(today, ROME_COMFORT, 21, 6);
  const auroraDep = nextInSeason(today, ICELAND_AURORA, 21, 5);
  const lyonDep = nextWeekday(today, 4, 35);
  const mrsDep = addDays(today, 28);
  const summerDep = nextInSeason(today, ICELAND_SUMMER, 21, 7);

  return [
    { id: "vol-week-end-lisbonne", tag: "Week-end", title: "Week-end à Lisbonne", detail: `Paris → Lisbonne · ${range(wkFri, wkMon)} · ${travelers(2)}`, href: flight("city:PAR", "city:LIS", wkFri, wkMon, 2), photoId: "lisbonne-2", destinationSlug: "lisbonne" },
    { id: "vol-rome-famille", tag: "En famille", title: "Rome en famille", detail: `Paris → Rome · ${range(romeDep, addDays(romeDep, 6))} · ${travelers(2, 1)}`, href: flight("city:PAR", "city:ROM", romeDep, addDays(romeDep, 6), 2, ["7"]), photoId: "rome-2", destinationSlug: "rome" },
    { id: "vol-reykjavik-aurores", tag: "Septembre–avril", title: "Aurores boréales en Islande", detail: `Paris → Keflavík · ${range(auroraDep, addDays(auroraDep, 5))} · ${travelers(2)}`, href: flight("city:PAR", "airport:KEF", auroraDep, addDays(auroraDep, 5), 2), photoId: "reykjavik-2", destinationSlug: "reykjavik" },
    { id: "vol-lyon-lisbonne", tag: "Départ de Lyon", title: "Lyon → Lisbonne", detail: `Aller-retour · ${range(lyonDep, addDays(lyonDep, 4))} · ${travelers(1)}`, href: flight("airport:LYS", "city:LIS", lyonDep, addDays(lyonDep, 4), 1), photoId: "lisbonne-3", destinationSlug: "lisbonne" },
    { id: "vol-marseille-rome", tag: "Aller simple", title: "Marseille → Rome", detail: `Aller simple · ${fmt(mrsDep)} · ${travelers(1)}`, href: flight("airport:MRS", "city:ROM", mrsDep, null, 1), photoId: "rome-3", destinationSlug: "rome" },
    { id: "vol-nantes-islande-ete", tag: "Juin–août", title: "L'Islande aux jours longs", detail: `Nantes → Keflavík · ${range(summerDep, addDays(summerDep, 7))} · ${travelers(2)}`, href: flight("airport:NTE", "airport:KEF", summerDep, addDays(summerDep, 7), 2), photoId: "reykjavik-3", destinationSlug: "reykjavik" },
  ];
}

// ---------------------------------------------------------------------------
// Hôtels (Lisbonne, Rome, Reykjavik)

export function hotelSuggestions(today: CivilDate): Suggestion[] {
  const hotel = (dest: string, arr: CivilDate, nights: number, ch: string) => q("/hotels", { dest, arr, dep: addDays(arr, nights), ch });
  const nightsLabel = (n: number) => plural(n, "nuit", "nuits");

  const wkFri = nextWeekday(today, 5, 6);
  const romeArr = nextInSeason(today, ROME_COMFORT, 21, 6);
  const auroraArr = nextInSeason(today, ICELAND_AURORA, 21, 4);
  const lisbonArr = nextInSeason(today, LISBON_MILD, 21, 5);
  const lisbonSpring = inWindow(lisbonArr, LISBON_MILD[0]!);
  const winterArr = nextInSeason(today, WINTER, 14, 4);
  const friendsArr = nextWeekday(today, 4, 30);

  return [
    { id: "hotel-lisbonne-week-end", tag: "Week-end", title: "Lisbonne, trois nuits", detail: `${range(wkFri, addDays(wkFri, 3))} · ${nightsLabel(3)} · ${travelers(2)}`, href: hotel("city:LIS", wkFri, 3, "2"), photoId: "lisbonne-2", destinationSlug: "lisbonne" },
    { id: "hotel-rome-famille", tag: "En famille", title: "Rome avec un enfant", detail: `${range(romeArr, addDays(romeArr, 6))} · 1 chambre · ${travelers(2, 1)}`, href: hotel("city:ROM", romeArr, 6, "2-7"), photoId: "rome-2", destinationSlug: "rome" },
    { id: "hotel-reykjavik-aurores", tag: "Septembre–avril", title: "Reykjavik, saison des aurores", detail: `${range(auroraArr, addDays(auroraArr, 4))} · ${nightsLabel(4)} · ${travelers(2)}`, href: hotel("city:REK", auroraArr, 4, "2"), photoId: "reykjavik-2", destinationSlug: "reykjavik" },
    { id: "hotel-lisbonne-saison", tag: lisbonSpring ? "Printemps" : "Automne", title: lisbonSpring ? "Lisbonne au printemps" : "Lisbonne en automne", detail: `${range(lisbonArr, addDays(lisbonArr, 5))} · ${nightsLabel(5)} · ${travelers(2)}`, href: hotel("city:LIS", lisbonArr, 5, "2"), photoId: "lisbonne-3", destinationSlug: "lisbonne" },
    { id: "hotel-rome-hiver", tag: "Hiver", title: "Rome au calme de l'hiver", detail: `${range(winterArr, addDays(winterArr, 4))} · ${nightsLabel(4)} · ${travelers(2)}`, href: hotel("city:ROM", winterArr, 4, "2"), photoId: "rome-3", destinationSlug: "rome" },
    { id: "hotel-reykjavik-deux-chambres", tag: "Deux chambres", title: "Reykjavik entre amis", detail: `${range(friendsArr, addDays(friendsArr, 4))} · 2 chambres · ${travelers(4)}`, href: hotel("city:REK", friendsArr, 4, "2|2"), photoId: "reykjavik-3", destinationSlug: "reykjavik" },
  ];
}

// ---------------------------------------------------------------------------
// Voitures (aéroports et villes couverts par les agences de démonstration)

export function carSuggestions(today: CivilDate): Suggestion[] {
  const car = (pu: string, pud: CivilDate, put: string, days: number, dot: string, age: number, drop?: string) =>
    q("/voitures", { pu, ...(drop ? { do: drop } : {}), pud, put, dod: addDays(pud, days), dot, age: String(age) });
  const daysLabel = (n: number) => plural(n, "jour", "jours");

  const summer = nextInSeason(today, ICELAND_SUMMER, 21, 8);
  const wkFri = nextWeekday(today, 5, 6);
  const romeWeek = addDays(today, 30);
  const oneWay = nextWeekday(today, 4, 21);
  const rekCity = addDays(today, 24);
  const young = nextInSeason(today, ROME_COMFORT, 28, 5);

  return [
    { id: "voiture-islande-ete", tag: "Juin–août", title: "Boucle islandaise depuis Keflavík", detail: `Aéroport de Keflavík · ${range(summer, addDays(summer, 8))} · ${daysLabel(8)}`, href: car("airport:KEF", summer, "10:00", 8, "10:00", 30), photoId: "reykjavik-3", destinationSlug: "reykjavik" },
    { id: "voiture-lisbonne-week-end", tag: "Week-end", title: "Lisbonne aéroport, long week-end", detail: `Prise à 12 h · ${range(wkFri, addDays(wkFri, 3))} · ${daysLabel(3)}`, href: car("airport:LIS", wkFri, "12:00", 3, "10:00", 34), photoId: "lisbonne-2", destinationSlug: "lisbonne" },
    { id: "voiture-rome-semaine", tag: "Une semaine", title: "Rome Fiumicino, une semaine", detail: `Aéroport de Fiumicino · ${range(romeWeek, addDays(romeWeek, 7))} · ${daysLabel(7)}`, href: car("airport:FCO", romeWeek, "10:00", 7, "10:00", 35), photoId: "rome-2", destinationSlug: "rome" },
    { id: "voiture-lisbonne-aller-simple", tag: "Aller simple", title: "Lisbonne, rendue en ville", detail: `Aéroport → agence en ville · ${range(oneWay, addDays(oneWay, 4))} · ${daysLabel(4)}`, href: car("airport:LIS", oneWay, "10:00", 4, "10:00", 34, "city:LIS"), photoId: "lisbonne-3", destinationSlug: "lisbonne" },
    { id: "voiture-reykjavik-centre", tag: "Trois jours", title: "Reykjavik centre, trois jours", detail: `Agence en ville · ${range(rekCity, addDays(rekCity, 3))} · ${daysLabel(3)}`, href: car("city:REK", rekCity, "10:00", 3, "10:00", 30), photoId: "reykjavik-2", destinationSlug: "reykjavik" },
    { id: "voiture-rome-jeune-conducteur", tag: "Moins de 25 ans", title: "Jeune conducteur à Rome", detail: `Fiumicino · ${range(young, addDays(young, 5))} · conducteur de 23 ans`, href: car("airport:FCO", young, "10:00", 5, "10:00", 23), photoId: "rome-3", destinationSlug: "rome" },
  ];
}

// ---------------------------------------------------------------------------
// Voyages (formulaire « Organiser mon voyage » prérempli, douze destinations possibles)

export interface TripIdea extends Suggestion {
  start: CivilDate;
  end: CivilDate;
  adults: number;
  children: number;
}

export function tripIdeas(today: CivilDate): TripIdea[] {
  const idea = (base: Omit<TripIdea, "href" | "detail" | "end"> & { days: number }): TripIdea => {
    const { days, ...rest } = base;
    const end = addDays(base.start, days - 1);
    const href = q("/voyage/nouveau", { destination: base.destinationSlug, debut: base.start, fin: end, adultes: String(base.adults), enfants: String(base.children), idee: base.id });
    return { ...rest, end, href, detail: `${range(base.start, end)} · ${plural(days, "jour", "jours")} · ${travelers(base.adults, base.children)}` };
  };

  const kyotoStart = nextInSeason(
    today,
    [
      [[3, 25], [4, 20]],
      [[11, 5], [11, 30]],
    ],
    28,
    10,
  );
  const kyotoSpring = parseCivilDate(kyotoStart)!.month <= 4;

  const ideas = [
    idea({ id: "voyage-lisbonne-week-end", tag: "Week-end prolongé", title: "Long week-end à Lisbonne", start: nextWeekday(today, 4, 7), days: 4, adults: 2, children: 0, photoId: "lisbonne-1", destinationSlug: "lisbonne" }),
    idea({ id: "voyage-islande-aurores", tag: "Septembre–avril", title: "L'Islande des aurores boréales", start: nextInSeason(today, ICELAND_AURORA, 21, 5), days: 5, adults: 2, children: 0, photoId: "reykjavik-1", destinationSlug: "reykjavik" }),
    idea({ id: "voyage-kyoto-saison", tag: kyotoSpring ? "Cerisiers en fleur" : "Érables d'automne", title: kyotoSpring ? "Kyoto au printemps" : "Kyoto en automne", start: kyotoStart, days: 10, adults: 2, children: 0, photoId: "kyoto-1", destinationSlug: "kyoto" }),
    idea({ id: "voyage-dolomites-randonnee", tag: "Fin juin–septembre", title: "Randonnée dans les Dolomites", start: nextInSeason(today, [[[6, 25], [9, 10]]], 21, 7), days: 7, adults: 2, children: 0, photoId: "dolomites-1", destinationSlug: "dolomites" }),
    idea({ id: "voyage-rome-famille", tag: "En famille", title: "Rome en famille", start: nextInSeason(today, ROME_COMFORT, 21, 6), days: 6, adults: 2, children: 2, photoId: "rome-1", destinationSlug: "rome" }),
    idea({ id: "voyage-lofoten-soleil-minuit", tag: "Soleil de minuit", title: "Les Lofoten sous le soleil de minuit", start: nextInSeason(today, [[[5, 25], [7, 10]]], 21, 7), days: 7, adults: 2, children: 0, photoId: "lofoten-2", destinationSlug: "lofoten" }),
  ];
  return ideas.sort((a, b) => (a.start < b.start ? -1 : a.start > b.start ? 1 : 0));
}

/** Idée retrouvée depuis le paramètre `idee` (pour confirmer l'idée appliquée au formulaire). */
export function tripIdeaById(today: CivilDate, id: string | undefined): TripIdea | undefined {
  return id ? tripIdeas(today).find((i) => i.id === id) : undefined;
}

// ---------------------------------------------------------------------------
// Accueil : trois itinéraires au départ de Paris, chacun avec vols, hôtels et voiture aux mêmes dates

export interface HomeRoute {
  slug: string;
  city: string;
  code: string;
  nights: number;
  detail: string;
  flightHref: string;
  hotelHref: string;
  carHref: string;
  photoId: string;
}

export function homeRoutes(today: CivilDate): HomeRoute[] {
  const dep = nextWeekday(today, 4, 28);
  const routes = [
    { slug: "lisbonne", city: "Lisbonne", code: "LIS", flight: "city:LIS", hotel: "city:LIS", car: "airport:LIS", nights: 4, photoId: "lisbonne-3" },
    { slug: "rome", city: "Rome", code: "ROM", flight: "city:ROM", hotel: "city:ROM", car: "airport:FCO", nights: 5, photoId: "rome-3" },
    { slug: "reykjavik", city: "Reykjavik", code: "KEF", flight: "airport:KEF", hotel: "city:REK", car: "airport:KEF", nights: 5, photoId: "reykjavik-3" },
  ];
  return routes.map((r) => {
    const ret = addDays(dep, r.nights);
    return {
      slug: r.slug,
      city: r.city,
      code: r.code,
      nights: r.nights,
      detail: `${range(dep, ret)} · ${plural(r.nights, "nuit", "nuits")} · ${travelers(2)}`,
      flightHref: q("/vols", { o: "city:PAR", d: r.flight, type: "ar", dep, ret, adt: "2" }),
      hotelHref: q("/hotels", { dest: r.hotel, arr: dep, dep: ret, ch: "2" }),
      carHref: q("/voitures", { pu: r.car, pud: dep, put: "12:00", dod: ret, dot: "10:00", age: "30" }),
      photoId: r.photoId,
    };
  });
}
