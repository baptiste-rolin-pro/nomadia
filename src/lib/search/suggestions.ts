/**
 * Suggestions de recherche préremplies (vols, hôtels, voitures, voyages), calculées à partir d'aujourd'hui.
 * Vols, hôtels et voitures : uniquement les trajets couverts par les offres de démonstration (Lisbonne, Rome,
 * Reykjavik, départs de France), pour que chaque suggestion mène à des résultats.
 * Voyages : idées sur les douze destinations, datées selon les saisons décrites dans leurs fiches.
 * Toutes les dates restent dans l'horizon de réservation (MAX_BOOKING_HORIZON_DAYS).
 */
import { addDays, parseCivilDate, weekday, type CivilDate } from "@/lib/dates";
import { MAX_BOOKING_HORIZON_DAYS } from "@/lib/search/query";
import { DEFAULT_LOCALE, type Locale } from "@/i18n/config";
import { formatter } from "@/i18n/format";
import { getMessages } from "@/i18n/messages";
import { cityName } from "@/lib/content/localized";

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

/** Textes et mises en forme d'une langue (titres, dates, voyageurs, villes). */
function texts(locale: Locale) {
  const t = getMessages(locale).suggest;
  const f = formatter(locale);
  const fmt = (d: CivilDate) => f.date(d, "weekday");
  return {
    t,
    f,
    fmt,
    city: (frenchName: string) => cityName(frenchName, locale),
    range: (a: CivilDate, b: CivilDate) => f.t(t.range, { from: fmt(a), to: fmt(b) }),
    travelers: (adults: number, children = 0) => f.t(t.travelers, { adults, children }),
    nights: (n: number) => f.t(t.nights, { n }),
    days: (n: number) => f.t(t.days, { n }),
    rooms: (n: number) => f.t(t.rooms, { n }),
  };
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

export function flightSuggestions(today: CivilDate, locale: Locale = DEFAULT_LOCALE): Suggestion[] {
  const { t, fmt, city, range, travelers } = texts(locale);
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
    { id: "vol-week-end-lisbonne", tag: t.tags.weekend, title: t.flights.lisbonWeekend, detail: `${city("Paris")} → ${city("Lisbonne")} · ${range(wkFri, wkMon)} · ${travelers(2)}`, href: flight("city:PAR", "city:LIS", wkFri, wkMon, 2), photoId: "lisbonne-2", destinationSlug: "lisbonne" },
    { id: "vol-rome-famille", tag: t.tags.family, title: t.flights.romeFamily, detail: `${city("Paris")} → ${city("Rome")} · ${range(romeDep, addDays(romeDep, 6))} · ${travelers(2, 1)}`, href: flight("city:PAR", "city:ROM", romeDep, addDays(romeDep, 6), 2, ["7"]), photoId: "rome-2", destinationSlug: "rome" },
    { id: "vol-reykjavik-aurores", tag: t.tags.auroraSeason, title: t.flights.icelandAurora, detail: `${city("Paris")} → Keflavík · ${range(auroraDep, addDays(auroraDep, 5))} · ${travelers(2)}`, href: flight("city:PAR", "airport:KEF", auroraDep, addDays(auroraDep, 5), 2), photoId: "reykjavik-2", destinationSlug: "reykjavik" },
    { id: "vol-lyon-lisbonne", tag: t.tags.fromLyon, title: t.flights.lyonLisbon, detail: `${t.roundTrip} · ${range(lyonDep, addDays(lyonDep, 4))} · ${travelers(1)}`, href: flight("airport:LYS", "city:LIS", lyonDep, addDays(lyonDep, 4), 1), photoId: "lisbonne-3", destinationSlug: "lisbonne" },
    { id: "vol-marseille-rome", tag: t.tags.oneWay, title: t.flights.marseilleRome, detail: `${t.oneWay} · ${fmt(mrsDep)} · ${travelers(1)}`, href: flight("airport:MRS", "city:ROM", mrsDep, null, 1), photoId: "rome-3", destinationSlug: "rome" },
    { id: "vol-nantes-islande-ete", tag: t.tags.summer, title: t.flights.icelandSummer, detail: `${city("Nantes")} → Keflavík · ${range(summerDep, addDays(summerDep, 7))} · ${travelers(2)}`, href: flight("airport:NTE", "airport:KEF", summerDep, addDays(summerDep, 7), 2), photoId: "reykjavik-3", destinationSlug: "reykjavik" },
  ];
}

// ---------------------------------------------------------------------------
// Hôtels (Lisbonne, Rome, Reykjavik)

export function hotelSuggestions(today: CivilDate, locale: Locale = DEFAULT_LOCALE): Suggestion[] {
  const { t, range, travelers, nights: nightsLabel, rooms } = texts(locale);
  const hotel = (dest: string, arr: CivilDate, nights: number, ch: string) => q("/hotels", { dest, arr, dep: addDays(arr, nights), ch });

  const wkFri = nextWeekday(today, 5, 6);
  const romeArr = nextInSeason(today, ROME_COMFORT, 21, 6);
  const auroraArr = nextInSeason(today, ICELAND_AURORA, 21, 4);
  const lisbonArr = nextInSeason(today, LISBON_MILD, 21, 5);
  const lisbonSpring = inWindow(lisbonArr, LISBON_MILD[0]!);
  const winterArr = nextInSeason(today, WINTER, 14, 4);
  const friendsArr = nextWeekday(today, 4, 30);

  return [
    { id: "hotel-lisbonne-week-end", tag: t.tags.weekend, title: t.hotels.lisbonThreeNights, detail: `${range(wkFri, addDays(wkFri, 3))} · ${nightsLabel(3)} · ${travelers(2)}`, href: hotel("city:LIS", wkFri, 3, "2"), photoId: "lisbonne-2", destinationSlug: "lisbonne" },
    { id: "hotel-rome-famille", tag: t.tags.family, title: t.hotels.romeWithChild, detail: `${range(romeArr, addDays(romeArr, 6))} · ${rooms(1)} · ${travelers(2, 1)}`, href: hotel("city:ROM", romeArr, 6, "2-7"), photoId: "rome-2", destinationSlug: "rome" },
    { id: "hotel-reykjavik-aurores", tag: t.tags.auroraSeason, title: t.hotels.reykjavikAurora, detail: `${range(auroraArr, addDays(auroraArr, 4))} · ${nightsLabel(4)} · ${travelers(2)}`, href: hotel("city:REK", auroraArr, 4, "2"), photoId: "reykjavik-2", destinationSlug: "reykjavik" },
    { id: "hotel-lisbonne-saison", tag: lisbonSpring ? t.tags.spring : t.tags.autumn, title: lisbonSpring ? t.hotels.lisbonSpring : t.hotels.lisbonAutumn, detail: `${range(lisbonArr, addDays(lisbonArr, 5))} · ${nightsLabel(5)} · ${travelers(2)}`, href: hotel("city:LIS", lisbonArr, 5, "2"), photoId: "lisbonne-3", destinationSlug: "lisbonne" },
    { id: "hotel-rome-hiver", tag: t.tags.winter, title: t.hotels.romeWinter, detail: `${range(winterArr, addDays(winterArr, 4))} · ${nightsLabel(4)} · ${travelers(2)}`, href: hotel("city:ROM", winterArr, 4, "2"), photoId: "rome-3", destinationSlug: "rome" },
    { id: "hotel-reykjavik-deux-chambres", tag: t.tags.twoRooms, title: t.hotels.reykjavikFriends, detail: `${range(friendsArr, addDays(friendsArr, 4))} · ${rooms(2)} · ${travelers(4)}`, href: hotel("city:REK", friendsArr, 4, "2|2"), photoId: "reykjavik-3", destinationSlug: "reykjavik" },
  ];
}

// ---------------------------------------------------------------------------
// Voitures (aéroports et villes couverts par les agences de démonstration)

export function carSuggestions(today: CivilDate, locale: Locale = DEFAULT_LOCALE): Suggestion[] {
  const { t, f, range, days: daysLabel } = texts(locale);
  const car = (pu: string, pud: CivilDate, put: string, days: number, dot: string, age: number, drop?: string) =>
    q("/voitures", { pu, ...(drop ? { do: drop } : {}), pud, put, dod: addDays(pud, days), dot, age: String(age) });

  const summer = nextInSeason(today, ICELAND_SUMMER, 21, 8);
  const wkFri = nextWeekday(today, 5, 6);
  const romeWeek = addDays(today, 30);
  const oneWay = nextWeekday(today, 4, 21);
  const rekCity = addDays(today, 24);
  const young = nextInSeason(today, ROME_COMFORT, 28, 5);

  return [
    { id: "voiture-islande-ete", tag: t.tags.summer, title: t.cars.icelandLoop, detail: `${t.cars.keflavikAirport} · ${range(summer, addDays(summer, 8))} · ${daysLabel(8)}`, href: car("airport:KEF", summer, "10:00", 8, "10:00", 30), photoId: "reykjavik-3", destinationSlug: "reykjavik" },
    { id: "voiture-lisbonne-week-end", tag: t.tags.weekend, title: t.cars.lisbonWeekend, detail: `${f.t(t.cars.pickupAt, { time: f.time("12:00") })} · ${range(wkFri, addDays(wkFri, 3))} · ${daysLabel(3)}`, href: car("airport:LIS", wkFri, "12:00", 3, "10:00", 34), photoId: "lisbonne-2", destinationSlug: "lisbonne" },
    { id: "voiture-rome-semaine", tag: t.tags.oneWeek, title: t.cars.romeWeek, detail: `${t.cars.fiumicinoAirport} · ${range(romeWeek, addDays(romeWeek, 7))} · ${daysLabel(7)}`, href: car("airport:FCO", romeWeek, "10:00", 7, "10:00", 35), photoId: "rome-2", destinationSlug: "rome" },
    { id: "voiture-lisbonne-aller-simple", tag: t.tags.oneWay, title: t.cars.lisbonOneWay, detail: `${t.cars.airportToCity} · ${range(oneWay, addDays(oneWay, 4))} · ${daysLabel(4)}`, href: car("airport:LIS", oneWay, "10:00", 4, "10:00", 34, "city:LIS"), photoId: "lisbonne-3", destinationSlug: "lisbonne" },
    { id: "voiture-reykjavik-centre", tag: t.tags.threeDays, title: t.cars.reykjavikCentre, detail: `${t.cars.cityAgency} · ${range(rekCity, addDays(rekCity, 3))} · ${daysLabel(3)}`, href: car("city:REK", rekCity, "10:00", 3, "10:00", 30), photoId: "reykjavik-2", destinationSlug: "reykjavik" },
    { id: "voiture-rome-jeune-conducteur", tag: t.tags.under25, title: t.cars.romeYoungDriver, detail: `${t.cars.fiumicino} · ${range(young, addDays(young, 5))} · ${f.t(t.cars.driverAge, { age: 23 })}`, href: car("airport:FCO", young, "10:00", 5, "10:00", 23), photoId: "rome-3", destinationSlug: "rome" },
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

export function tripIdeas(today: CivilDate, locale: Locale = DEFAULT_LOCALE): TripIdea[] {
  const { t, range, travelers, days: daysLabel } = texts(locale);
  const idea = (base: Omit<TripIdea, "href" | "detail" | "end"> & { days: number }): TripIdea => {
    const { days, ...rest } = base;
    const end = addDays(base.start, days - 1);
    const href = q("/voyage/nouveau", { destination: base.destinationSlug, debut: base.start, fin: end, adultes: String(base.adults), enfants: String(base.children), idee: base.id });
    return { ...rest, end, href, detail: `${range(base.start, end)} · ${daysLabel(days)} · ${travelers(base.adults, base.children)}` };
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
    idea({ id: "voyage-lisbonne-week-end", tag: t.tags.longWeekend, title: t.trips.lisbonLongWeekend, start: nextWeekday(today, 4, 7), days: 4, adults: 2, children: 0, photoId: "lisbonne-1", destinationSlug: "lisbonne" }),
    idea({ id: "voyage-islande-aurores", tag: t.tags.auroraSeason, title: t.trips.icelandAurora, start: nextInSeason(today, ICELAND_AURORA, 21, 5), days: 5, adults: 2, children: 0, photoId: "reykjavik-1", destinationSlug: "reykjavik" }),
    idea({ id: "voyage-kyoto-saison", tag: kyotoSpring ? t.tags.cherryBlossom : t.tags.autumnMaples, title: kyotoSpring ? t.trips.kyotoSpring : t.trips.kyotoAutumn, start: kyotoStart, days: 10, adults: 2, children: 0, photoId: "kyoto-1", destinationSlug: "kyoto" }),
    idea({ id: "voyage-dolomites-randonnee", tag: t.tags.hikingSeason, title: t.trips.dolomitesHiking, start: nextInSeason(today, [[[6, 25], [9, 10]]], 21, 7), days: 7, adults: 2, children: 0, photoId: "dolomites-1", destinationSlug: "dolomites" }),
    idea({ id: "voyage-rome-famille", tag: t.tags.family, title: t.trips.romeFamily, start: nextInSeason(today, ROME_COMFORT, 21, 6), days: 6, adults: 2, children: 2, photoId: "rome-1", destinationSlug: "rome" }),
    idea({ id: "voyage-lofoten-soleil-minuit", tag: t.tags.midnightSun, title: t.trips.lofotenMidnightSun, start: nextInSeason(today, [[[5, 25], [7, 10]]], 21, 7), days: 7, adults: 2, children: 0, photoId: "lofoten-2", destinationSlug: "lofoten" }),
  ];
  return ideas.sort((a, b) => (a.start < b.start ? -1 : a.start > b.start ? 1 : 0));
}

/** Idée retrouvée depuis le paramètre `idee` (pour confirmer l'idée appliquée au formulaire). */
export function tripIdeaById(today: CivilDate, id: string | undefined, locale: Locale = DEFAULT_LOCALE): TripIdea | undefined {
  return id ? tripIdeas(today, locale).find((i) => i.id === id) : undefined;
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

export function homeRoutes(today: CivilDate, locale: Locale = DEFAULT_LOCALE): HomeRoute[] {
  const { city, range, travelers, nights } = texts(locale);
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
      city: city(r.city),
      code: r.code,
      nights: r.nights,
      detail: `${range(dep, ret)} · ${nights(r.nights)} · ${travelers(2)}`,
      flightHref: q("/vols", { o: "city:PAR", d: r.flight, type: "ar", dep, ret, adt: "2" }),
      hotelHref: q("/hotels", { dest: r.hotel, arr: dep, dep: ret, ch: "2" }),
      carHref: q("/voitures", { pu: r.car, pud: dep, put: "12:00", dod: ret, dot: "10:00", age: "30" }),
      photoId: r.photoId,
    };
  });
}
