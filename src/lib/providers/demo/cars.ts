/**
 * Location de voitures de DÉMONSTRATION : catégories « ou similaire », offres simulées.
 * Les loueurs sont réels (noms de l'annuaire src/lib/content/directory.ts, de préférence ceux relevés au même
 * endroit dans src/lib/content/practical.ts), cités à titre d'illustration et sans aucun lien avec eux. Agences,
 * horaires, prix et conditions sont simulés.
 * Le modèle exact n'est jamais garanti. Aucun supplément ni assurance n'est précoché.
 * Les heures d'ouverture des agences sont vérifiées : une prise en charge hors horaires est signalée
 * et proposée à la correction explicite, jamais corrigée silencieusement.
 */
import { addDays, civilDateOf, durationMinutes, timeOf, type LocalDateTime } from "@/lib/dates";
import { money, multiply, sum, zero, type Money } from "@/lib/money";
import { createRng, hashString } from "@/lib/random";
import { getPlace } from "@/lib/content/places";
import { RENTERS } from "@/lib/content/directory";
import { decodeRef, encodeRef } from "@/lib/providers/offer-ref";
import { ProviderError, type AncillaryDef, type CarOffer, type PriceBreakdown, type RentalAgency, type RentalSupplier, type ZonedTime } from "@/lib/providers/types";
import { DEFAULT_LOCALE, type Locale } from "@/i18n/config";
import { formatMessage, formatMoneyIn, formatTime } from "@/i18n/format";
import { getMessages } from "@/i18n/messages";
import { carModelText, localizeAgency } from "@/lib/providers/localize";

export const DEMO_CAR_PROVIDER_ID = "demo-cars";
export const CAR_OFFER_TTL_MINUTES = 30;

/**
 * Profil interne d'une agence simulée : modèles proposés, prépaiement, kilométrage. Codes historiques (anciens
 * fournisseurs de démonstration) conservés car ils figurent dans les identifiants d'agence, donc dans les
 * références d'offre déjà enregistrées : prix et conditions restent identiques pour une même référence.
 */
export type DemoAgencyProfile = "dl" | "rl" | "ew";

export interface DemoAgency extends RentalAgency {
  profile: DemoAgencyProfile;
}

/** Loueur réel de l'annuaire, par slug (nom officiel, aucun logo). */
function renter(slug: string): RentalSupplier {
  const entry = RENTERS.find((r) => r.slug === slug);
  if (!entry) throw new Error(`Loueur absent de l'annuaire : ${slug}`);
  return { id: entry.slug, name: entry.name, fictional: false };
}

/**
 * Agences simulées. `supplierId` : loueur réel (slug de l'annuaire), relevé au même endroit quand c'est possible
 * (Lisbonne : Budget, Centauro ; Rome : Hertz, Dollar ; Keflavík : Sixt, Europcar ; Reykjavik : Avis, pris dans
 * l'annuaire faute de troisième loueur relevé). Adresses et horaires sont simulés.
 */
export const DEMO_AGENCIES: DemoAgency[] = [
  { id: "lis-apt-dl", supplierId: "budget", profile: "dl", name: "Budget — Aéroport de Lisbonne", placeId: "airport:LIS", address: "Hall des arrivées, terminal 1", access: "terminal", accessNote: "Comptoir dans le terminal, véhicules au parking P2.", opens: "06:00", closes: "24:00", timeZone: "Europe/Lisbon" },
  { id: "lis-apt-rl", supplierId: "centauro", profile: "rl", name: "Centauro — Lisbonne Aéroport", placeId: "airport:LIS", address: "Agence hors aéroport", access: "shuttle", accessNote: "Navette gratuite depuis le terminal 1, environ 10 minutes.", opens: "07:00", closes: "23:00", timeZone: "Europe/Lisbon" },
  { id: "lis-city-dl", supplierId: "budget", profile: "dl", name: "Budget — Lisbonne Santa Apolónia", placeId: "city:LIS", address: "Près de la gare Santa Apolónia", access: "city", accessNote: "Agence en ville.", opens: "08:00", closes: "20:00", timeZone: "Europe/Lisbon" },
  { id: "fco-apt-dl", supplierId: "hertz", profile: "dl", name: "Hertz — Rome Fiumicino", placeId: "airport:FCO", address: "Zone de location de voitures", access: "terminal", accessNote: "Comptoirs accessibles à pied depuis les terminaux.", opens: "07:00", closes: "23:30", timeZone: "Europe/Rome" },
  { id: "fco-apt-ew", supplierId: "dollar", profile: "ew", name: "Dollar — Fiumicino", placeId: "airport:FCO", address: "Agence hors aéroport", access: "shuttle", accessNote: "Navette toutes les 20 minutes environ.", opens: "08:00", closes: "22:00", timeZone: "Europe/Rome" },
  { id: "rom-city-dl", supplierId: "hertz", profile: "dl", name: "Hertz — Roma Termini", placeId: "city:ROM", address: "Près de la gare Termini", access: "city", accessNote: "Agence en ville, circulation en ZTL à vérifier auprès de la commune.", opens: "08:00", closes: "19:00", timeZone: "Europe/Rome" },
  { id: "kef-apt-dl", supplierId: "sixt", profile: "dl", name: "Sixt — Keflavík", placeId: "airport:KEF", address: "À proximité de l'aéroport", access: "shuttle", accessNote: "Navette depuis le terminal, environ 5 minutes.", opens: "06:00", closes: "23:00", timeZone: "Atlantic/Reykjavik" },
  { id: "kef-apt-rl", supplierId: "europcar", profile: "rl", name: "Europcar — Keflavík", placeId: "airport:KEF", address: "Hall des arrivées", access: "terminal", accessNote: "Comptoir dans le terminal.", opens: "07:00", closes: "22:00", timeZone: "Atlantic/Reykjavik" },
  { id: "rek-city-ew", supplierId: "avis", profile: "ew", name: "Avis — Reykjavik centre", placeId: "city:REK", address: "Centre de Reykjavik", access: "city", accessNote: "Agence en ville.", opens: "08:00", closes: "18:00", timeZone: "Atlantic/Reykjavik" },
];

/** Loueurs réels cités par les offres simulées (tous présents dans l'annuaire), par slug. */
export const DEMO_SUPPLIERS: Record<string, RentalSupplier> = Object.fromEntries([...new Set(DEMO_AGENCIES.map((a) => a.supplierId))].map((slug) => [slug, renter(slug)]));

/**
 * Loueur d'une offre. Une référence enregistrée avant le passage aux noms réels peut associer deux agences de
 * même profil mais de loueurs différents (aller simple entre deux villes) : le loueur affiché est alors celui de
 * l'agence de prise en charge, sans erreur.
 */
function supplierOf(agency: DemoAgency): RentalSupplier {
  return DEMO_SUPPLIERS[agency.supplierId]!;
}

interface CarModel {
  id: string;
  category: string;
  acriss: string;
  example: string;
  transmission: CarOffer["transmission"];
  seats: number;
  doors: number;
  bagsLarge: number;
  bagsSmall: number;
  energy: CarOffer["energy"];
  baseDay: number;
  deposit: number;
  excess: number;
  minAge: number;
  licenceYears: number;
}

const MODELS: CarModel[] = [
  { id: "mini", category: "Mini", acriss: "MBMR", example: "Fiat 500 ou similaire", transmission: "manual", seats: 4, doors: 3, bagsLarge: 1, bagsSmall: 1, energy: "petrol", baseDay: 2900, deposit: 30000, excess: 90000, minAge: 19, licenceYears: 1 },
  { id: "eco", category: "Économique", acriss: "EDMR", example: "Peugeot 208 ou similaire", transmission: "manual", seats: 5, doors: 5, bagsLarge: 1, bagsSmall: 2, energy: "petrol", baseDay: 3400, deposit: 40000, excess: 100000, minAge: 19, licenceYears: 1 },
  { id: "compact-auto", category: "Compacte automatique", acriss: "CDAR", example: "Volkswagen Golf ou similaire", transmission: "automatic", seats: 5, doors: 5, bagsLarge: 2, bagsSmall: 1, energy: "petrol", baseDay: 4600, deposit: 50000, excess: 120000, minAge: 21, licenceYears: 1 },
  { id: "suv-hybrid", category: "SUV intermédiaire hybride", acriss: "IFAH", example: "Toyota RAV4 hybride ou similaire", transmission: "automatic", seats: 5, doors: 5, bagsLarge: 3, bagsSmall: 2, energy: "hybrid", baseDay: 6900, deposit: 80000, excess: 150000, minAge: 23, licenceYears: 2 },
  { id: "ev", category: "Compacte électrique", acriss: "CDAE", example: "Renault Mégane E-Tech ou similaire", transmission: "automatic", seats: 5, doors: 5, bagsLarge: 2, bagsSmall: 1, energy: "electric", baseDay: 5200, deposit: 60000, excess: 120000, minAge: 21, licenceYears: 1 },
  { id: "van7", category: "Monospace 7 places", acriss: "FVMR", example: "Peugeot 5008 ou similaire", transmission: "manual", seats: 7, doors: 5, bagsLarge: 3, bagsSmall: 2, energy: "diesel", baseDay: 7800, deposit: 90000, excess: 150000, minAge: 23, licenceYears: 2 },
  { id: "4x4", category: "4x4 compact", acriss: "CFMD", example: "Dacia Duster 4x4 ou similaire", transmission: "manual", seats: 5, doors: 5, bagsLarge: 2, bagsSmall: 2, energy: "diesel", baseDay: 8200, deposit: 120000, excess: 250000, minAge: 23, licenceYears: 2 },
];

function modelsForAgency(agency: DemoAgency): CarModel[] {
  const iceland = agency.timeZone === "Atlantic/Reykjavik";
  const ids = iceland ? ["eco", "compact-auto", "suv-hybrid", "4x4"] : agency.profile === "ew" ? ["mini", "eco", "ev"] : ["mini", "eco", "compact-auto", "suv-hybrid", "van7"];
  return MODELS.filter((m) => ids.includes(m.id));
}

export function agenciesForPlace(placeId: string): DemoAgency[] {
  const place = getPlace(placeId);
  if (!place) return [];
  if (place.kind === "airport") return DEMO_AGENCIES.filter((a) => a.placeId === placeId);
  const airportIds = (place.airports ?? []).map((c) => `airport:${c}`);
  return DEMO_AGENCIES.filter((a) => a.placeId === placeId || airportIds.includes(a.placeId));
}

export function isAgencyOpen(agency: RentalAgency, time: string): boolean {
  const close = agency.closes === "24:00" ? "23:59" : agency.closes;
  return time >= agency.opens && time <= close;
}

/** Prochaine heure d'ouverture à partir d'une heure locale (correction proposée, jamais imposée). */
export function nextOpening(agency: RentalAgency, local: LocalDateTime): LocalDateTime {
  const date = civilDateOf(local);
  const time = timeOf(local);
  if (time < agency.opens) return `${date}T${agency.opens}`;
  return `${addDays(date, 1)}T${agency.opens}`;
}

/** Jours de location : périodes de 24 h entamées, avec une tolérance de 59 minutes (règle de démonstration). */
export function rentalDays(pickup: ZonedTime, dropoff: ZonedTime): number {
  const minutes = durationMinutes(pickup, dropoff);
  return Math.max(1, Math.ceil((minutes - 59) / 1440));
}

export interface CarRefPayload {
  pu: string;
  do: string;
  m: string;
  pl: LocalDateTime;
  rl: LocalDateTime;
  age: number;
  res: string;
  pre: boolean;
  t: number;
}

function extrasFor(model: CarModel, prepaid: boolean, locale: Locale): AncillaryDef[] {
  const t = getMessages(locale).domain.cars;
  const euros = (minor: number) => formatMoneyIn(locale, money(minor), { hideZeroDecimals: true });
  return [
    { id: "child-seat", label: t.childSeat, description: t.childSeatDesc, unitPrice: money(900), per: "day", payable: "on_site", maxQuantity: 2, guaranteed: false },
    { id: "extra-driver", label: t.extraDriver, description: t.extraDriverDesc, unitPrice: money(800), per: "day", payable: "on_site", maxQuantity: 2, guaranteed: true },
    {
      id: "excess-reduction",
      label: t.excessReduction,
      description: formatMessage(locale, t.excessReductionDesc, { excess: euros(model.excess), zero: euros(0) }),
      unitPrice: money(1800),
      per: "day",
      payable: prepaid ? "now" : "on_site",
      maxQuantity: 1,
      guaranteed: true,
    },
  ];
}

export function buildCarOffer(p: CarRefPayload, locale: Locale = DEFAULT_LOCALE): CarOffer {
  const t = getMessages(locale).domain.cars;
  const tt = (msg: string, params?: Record<string, string | number>) => formatMessage(locale, msg, params);
  const euros = (minor: number) => formatMoneyIn(locale, money(minor), { hideZeroDecimals: true });
  const time = (hhmm: string) => (locale === DEFAULT_LOCALE ? hhmm.replace(":", " h ") : formatTime(locale, hhmm === "24:00" ? "23:59" : hhmm));
  const basePickup = DEMO_AGENCIES.find((a) => a.id === p.pu);
  const baseReturn = DEMO_AGENCIES.find((a) => a.id === p.do);
  const baseModel = MODELS.find((m) => m.id === p.m);
  if (!basePickup || !baseReturn || !baseModel) throw new ProviderError("OFFER_NOT_FOUND", t.notFound);
  // Contrôle sur le profil (et non sur le loueur) : les références enregistrées avant le passage aux noms réels
  // restent régénérables à l'identique (voir supplierOf).
  if (basePickup.profile !== baseReturn.profile) throw new ProviderError("OFFER_NOT_FOUND", t.otherSupplier);
  const pickupAgency = localizeAgency(basePickup, locale);
  const returnAgency = localizeAgency(baseReturn, locale);
  const model = { ...baseModel, ...carModelText(baseModel.id, locale) };
  const supplier = supplierOf(basePickup);
  const pickup = { local: p.pl, timeZone: pickupAgency.timeZone };
  const dropoff = { local: p.rl, timeZone: returnAgency.timeZone };
  const days = rentalDays(pickup, dropoff);
  const rng = createRng(hashString(`${p.pu}-${p.m}-${civilDateOf(p.pl)}`));
  const dayRate = money(Math.round((model.baseDay * (95 + rng.int(0, 20))) / 100 / 100) * 100);
  const payable = p.pre ? "now" : "on_site";
  const lines: PriceBreakdown["lines"] = [{ label: tt(t.rental, { days, category: model.category }), amount: multiply(dayRate, days), kind: "base", payable }];
  const blockingReasons: string[] = [];
  let youngDriverFeePerDay: Money | null = null;
  if (p.age < model.minAge) blockingReasons.push(tt(t.minAge, { age: model.minAge }));
  if (p.age > 79) blockingReasons.push(t.tooOld);
  if (p.age < 25) {
    youngDriverFeePerDay = money(1500);
    lines.push({ label: tt(t.youngDriver, { days }), amount: multiply(youngDriverFeePerDay, Math.min(days, 15)), kind: "fee", payable: "on_site" });
  }
  let oneWayFee: Money | null = null;
  if (pickupAgency.id !== returnAgency.id) {
    oneWayFee = money(pickupAgency.placeId === returnAgency.placeId ? 2500 : 4900);
    lines.push({ label: t.oneWayFee, amount: oneWayFee, kind: "fee", payable: "on_site" });
  }
  lines.push({ label: t.localTaxes, amount: zero(), kind: "tax", payable });
  const total = sum(lines.map((l) => l.amount));
  const payNow = sum(lines.filter((l) => l.payable === "now").map((l) => l.amount));
  const payOnSite = sum(lines.filter((l) => l.payable === "on_site").map((l) => l.amount));
  const pickupTime = timeOf(p.pl);
  const returnTime = timeOf(p.rl);
  let suggestedPickup: ZonedTime | null = null;
  let suggestedDropoff: ZonedTime | null = null;
  if (!isAgencyOpen(pickupAgency, pickupTime)) {
    blockingReasons.push(tt(t.agencyClosed, { time: time(pickupTime), opens: time(pickupAgency.opens), closes: time(pickupAgency.closes) }));
    suggestedPickup = { local: nextOpening(pickupAgency, p.pl), timeZone: pickupAgency.timeZone };
  }
  if (!isAgencyOpen(returnAgency, returnTime)) {
    blockingReasons.push(tt(t.returnClosed, { time: time(returnTime), opens: time(returnAgency.opens), closes: time(returnAgency.closes) }));
    const close = returnAgency.closes === "24:00" ? "23:30" : returnAgency.closes;
    suggestedDropoff = { local: returnTime < returnAgency.opens ? `${civilDateOf(p.rl)}T${returnAgency.opens}` : `${civilDateOf(p.rl)}T${close}`, timeZone: returnAgency.timeZone };
  }
  const iceland = pickupAgency.timeZone === "Atlantic/Reykjavik";
  const limitedMileage = basePickup.profile === "ew" && iceland;
  return {
    id: encodeRef("dcr", p as unknown as Record<string, unknown>),
    providerId: DEMO_CAR_PROVIDER_ID,
    mode: "demo",
    supplier,
    pickupAgency,
    returnAgency,
    pickup,
    dropoff,
    rentalDays: days,
    category: model.category,
    modelId: model.id,
    acriss: model.acriss,
    exampleModel: model.example,
    modelGuaranteed: false,
    transmission: model.transmission,
    seats: model.seats,
    doors: model.doors,
    bagsLarge: model.bagsLarge,
    bagsSmall: model.bagsSmall,
    energy: model.energy,
    airConditioning: true,
    mileage: limitedMileage ? { unlimited: false, kmPerDay: 200, extraKmFee: money(35) } : { unlimited: true, kmPerDay: null, extraKmFee: null },
    fuelPolicy: model.energy === "electric" ? t.fuelElectric : t.fuelFull,
    deposit: money(model.deposit),
    excess: money(model.excess),
    coverages: [t.liability, tt(t.cdw, { excess: euros(model.excess) }), tt(t.theft, { excess: euros(model.excess) }), ...(iceland ? [t.icelandExclusions] : [])],
    driverAge: p.age,
    youngDriverFeePerDay,
    oneWayFee,
    licenceRequirement: tt(t.licence, { years: model.licenceYears }),
    cardRequirement: t.card,
    paymentCollector: p.pre ? "platform" : "agency",
    price: {
      lines,
      total,
      payNow,
      payOnSite,
      deposit: money(model.deposit),
      taxes: "included",
      notes: [t.depositNote],
    },
    extras: extrasFor(model, p.pre, locale),
    bookable: blockingReasons.length === 0,
    blockingReasons,
    suggestedPickup,
    suggestedDropoff,
    expiresAt: new Date((p.t + CAR_OFFER_TTL_MINUTES * 60) * 1000).toISOString(),
  };
}

export function decodeCarRef(ref: string): CarRefPayload | null {
  return decodeRef<CarRefPayload>("dcr", ref);
}

export interface CarGenInput {
  pickupPlace: string;
  dropoffPlace: string;
  pickupLocal: LocalDateTime;
  dropoffLocal: LocalDateTime;
  driverAge: number;
  residence: string;
  t: number;
}

export function generateCarOffers(input: CarGenInput, locale: Locale = DEFAULT_LOCALE): CarOffer[] {
  const pickupAgencies = agenciesForPlace(input.pickupPlace);
  const dropoffAgencies = agenciesForPlace(input.dropoffPlace);
  const offers: CarOffer[] = [];
  for (const pu of pickupAgencies) {
    // Restitution chez le même loueur (et au même profil d'agence) : jamais d'aller simple d'un loueur à un autre.
    const ret = input.dropoffPlace === input.pickupPlace ? pu : dropoffAgencies.find((a) => a.profile === pu.profile && a.supplierId === pu.supplierId);
    if (!ret) continue;
    for (const m of modelsForAgency(pu)) {
      // Deux modes de paiement selon le profil de l'agence : prépayé (plateforme) ou à l'agence.
      const prepaid = pu.profile === "rl" || (pu.profile === "dl" && m.id !== "van7");
      offers.push(buildCarOffer({ pu: pu.id, do: ret.id, m: m.id, pl: input.pickupLocal, rl: input.dropoffLocal, age: input.driverAge, res: input.residence, pre: prepaid, t: input.t }, locale));
    }
  }
  return offers;
}

