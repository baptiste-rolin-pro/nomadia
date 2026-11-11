/**
 * Location de voitures de DÉMONSTRATION : loueurs et agences fictifs, catégories « ou similaire ».
 * Le modèle exact n'est jamais garanti. Aucun supplément ni assurance n'est précoché.
 * Les heures d'ouverture des agences sont vérifiées : une prise en charge hors horaires est signalée
 * et proposée à la correction explicite, jamais corrigée silencieusement.
 */
import { addDays, civilDateOf, durationMinutes, timeOf, type LocalDateTime } from "@/lib/dates";
import { money, multiply, sum, zero, type Money } from "@/lib/money";
import { createRng, hashString } from "@/lib/random";
import { getPlace } from "@/lib/content/places";
import { decodeRef, encodeRef } from "@/lib/providers/offer-ref";
import { ProviderError, type AncillaryDef, type CarOffer, type PriceBreakdown, type RentalAgency, type RentalSupplier, type ZonedTime } from "@/lib/providers/types";

export const DEMO_CAR_PROVIDER_ID = "demo-cars";
export const CAR_OFFER_TTL_MINUTES = 30;

export const DEMO_SUPPLIERS: Record<string, RentalSupplier> = {
  dl: { id: "dl", name: "Démo Location", fictional: true },
  rl: { id: "rl", name: "Route Libre (démo)", fictional: true },
  ew: { id: "ew", name: "Éco Wheels (démo)", fictional: true },
};

export const DEMO_AGENCIES: RentalAgency[] = [
  { id: "lis-apt-dl", supplierId: "dl", name: "Démo Location — Aéroport de Lisbonne", placeId: "airport:LIS", address: "Comptoir fictif, hall des arrivées, terminal 1", access: "terminal", accessNote: "Comptoir dans le terminal, véhicules au parking P2 (démo).", opens: "06:00", closes: "24:00", timeZone: "Europe/Lisbon" },
  { id: "lis-apt-rl", supplierId: "rl", name: "Route Libre — Lisbonne Aéroport (navette)", placeId: "airport:LIS", address: "Agence fictive hors aéroport", access: "shuttle", accessNote: "Navette gratuite depuis le terminal 1, environ 10 minutes (démo).", opens: "07:00", closes: "23:00", timeZone: "Europe/Lisbon" },
  { id: "lis-city-dl", supplierId: "dl", name: "Démo Location — Lisbonne Santa Apolónia", placeId: "city:LIS", address: "Agence fictive près de la gare Santa Apolónia", access: "city", accessNote: "Agence en ville.", opens: "08:00", closes: "20:00", timeZone: "Europe/Lisbon" },
  { id: "fco-apt-dl", supplierId: "dl", name: "Démo Location — Rome Fiumicino", placeId: "airport:FCO", address: "Comptoir fictif, zone location", access: "terminal", accessNote: "Comptoirs accessibles à pied depuis les terminaux (démo).", opens: "07:00", closes: "23:30", timeZone: "Europe/Rome" },
  { id: "fco-apt-ew", supplierId: "ew", name: "Éco Wheels — Fiumicino (navette)", placeId: "airport:FCO", address: "Agence fictive hors aéroport", access: "shuttle", accessNote: "Navette toutes les 20 minutes environ (démo).", opens: "08:00", closes: "22:00", timeZone: "Europe/Rome" },
  { id: "rom-city-dl", supplierId: "dl", name: "Démo Location — Roma Termini", placeId: "city:ROM", address: "Agence fictive près de la gare Termini", access: "city", accessNote: "Agence en ville, circulation en ZTL à vérifier auprès de la commune.", opens: "08:00", closes: "19:00", timeZone: "Europe/Rome" },
  { id: "kef-apt-dl", supplierId: "dl", name: "Démo Location — Keflavík (navette)", placeId: "airport:KEF", address: "Agence fictive à proximité de l'aéroport", access: "shuttle", accessNote: "Navette depuis le terminal, environ 5 minutes (démo).", opens: "06:00", closes: "23:00", timeZone: "Atlantic/Reykjavik" },
  { id: "kef-apt-rl", supplierId: "rl", name: "Route Libre — Keflavík terminal", placeId: "airport:KEF", address: "Comptoir fictif, hall des arrivées", access: "terminal", accessNote: "Comptoir dans le terminal (démo).", opens: "07:00", closes: "22:00", timeZone: "Atlantic/Reykjavik" },
  { id: "rek-city-ew", supplierId: "ew", name: "Éco Wheels — Reykjavik centre", placeId: "city:REK", address: "Agence fictive, centre de Reykjavik", access: "city", accessNote: "Agence en ville.", opens: "08:00", closes: "18:00", timeZone: "Atlantic/Reykjavik" },
];

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

function modelsForAgency(agency: RentalAgency): CarModel[] {
  const iceland = agency.timeZone === "Atlantic/Reykjavik";
  const ids = iceland ? ["eco", "compact-auto", "suv-hybrid", "4x4"] : agency.supplierId === "ew" ? ["mini", "eco", "ev"] : ["mini", "eco", "compact-auto", "suv-hybrid", "van7"];
  return MODELS.filter((m) => ids.includes(m.id));
}

export function agenciesForPlace(placeId: string): RentalAgency[] {
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

function extrasFor(model: CarModel, prepaid: boolean): AncillaryDef[] {
  return [
    { id: "child-seat", label: "Siège enfant", description: "Sur demande auprès de l'agence ; disponibilité non garantie.", unitPrice: money(900), per: "day", payable: "on_site", maxQuantity: 2, guaranteed: false },
    { id: "extra-driver", label: "Conducteur additionnel", description: "Payable à l'agence. Le conducteur additionnel présente son permis au comptoir.", unitPrice: money(800), per: "day", payable: "on_site", maxQuantity: 2, guaranteed: true },
    {
      id: "excess-reduction",
      label: "Réduction de franchise",
      description: `Ramène la franchise de ${(model.excess / 100).toLocaleString("fr-FR")} € à 0 € pour les dommages couverts (conditions du loueur, démonstration).`,
      unitPrice: money(1800),
      per: "day",
      payable: prepaid ? "now" : "on_site",
      maxQuantity: 1,
      guaranteed: true,
    },
  ];
}

export function buildCarOffer(p: CarRefPayload): CarOffer {
  const pickupAgency = DEMO_AGENCIES.find((a) => a.id === p.pu);
  const returnAgency = DEMO_AGENCIES.find((a) => a.id === p.do);
  const model = MODELS.find((m) => m.id === p.m);
  if (!pickupAgency || !returnAgency || !model) throw new ProviderError("OFFER_NOT_FOUND", "Offre de location introuvable.");
  if (pickupAgency.supplierId !== returnAgency.supplierId) throw new ProviderError("OFFER_NOT_FOUND", "Retour impossible dans une agence d'un autre loueur.");
  const supplier = DEMO_SUPPLIERS[pickupAgency.supplierId]!;
  const pickup = { local: p.pl, timeZone: pickupAgency.timeZone };
  const dropoff = { local: p.rl, timeZone: returnAgency.timeZone };
  const days = rentalDays(pickup, dropoff);
  const rng = createRng(hashString(`${p.pu}-${p.m}-${civilDateOf(p.pl)}`));
  const dayRate = money(Math.round((model.baseDay * (95 + rng.int(0, 20))) / 100 / 100) * 100);
  const payable = p.pre ? "now" : "on_site";
  const lines: PriceBreakdown["lines"] = [{ label: `Location ${days} jour${days > 1 ? "s" : ""} (${model.category})`, amount: multiply(dayRate, days), kind: "base", payable }];
  const blockingReasons: string[] = [];
  let youngDriverFeePerDay: Money | null = null;
  if (p.age < model.minAge) blockingReasons.push(`Âge minimum du conducteur pour cette catégorie : ${model.minAge} ans (conditions du loueur, démonstration).`);
  if (p.age > 79) blockingReasons.push("Conducteur de plus de 79 ans : non accepté par ce loueur (démonstration).");
  if (p.age < 25) {
    youngDriverFeePerDay = money(1500);
    lines.push({ label: `Frais jeune conducteur (moins de 25 ans), ${days} jour${days > 1 ? "s" : ""}`, amount: multiply(youngDriverFeePerDay, Math.min(days, 15)), kind: "fee", payable: "on_site" });
  }
  let oneWayFee: Money | null = null;
  if (pickupAgency.id !== returnAgency.id) {
    oneWayFee = money(pickupAgency.placeId === returnAgency.placeId ? 2500 : 4900);
    lines.push({ label: "Frais d'aller simple (restitution dans une autre agence)", amount: oneWayFee, kind: "fee", payable: "on_site" });
  }
  lines.push({ label: "Taxes locales et frais d'emplacement (inclus, montants fictifs)", amount: zero(), kind: "tax", payable });
  const total = sum(lines.map((l) => l.amount));
  const payNow = sum(lines.filter((l) => l.payable === "now").map((l) => l.amount));
  const payOnSite = sum(lines.filter((l) => l.payable === "on_site").map((l) => l.amount));
  const pickupTime = timeOf(p.pl);
  const returnTime = timeOf(p.rl);
  let suggestedPickup: ZonedTime | null = null;
  let suggestedDropoff: ZonedTime | null = null;
  if (!isAgencyOpen(pickupAgency, pickupTime)) {
    blockingReasons.push(`Agence fermée à ${pickupTime.replace(":", " h ")} (horaires : ${pickupAgency.opens.replace(":", " h ")} – ${pickupAgency.closes.replace(":", " h ")}, heure locale).`);
    suggestedPickup = { local: nextOpening(pickupAgency, p.pl), timeZone: pickupAgency.timeZone };
  }
  if (!isAgencyOpen(returnAgency, returnTime)) {
    blockingReasons.push(`Agence de retour fermée à ${returnTime.replace(":", " h ")} (horaires : ${returnAgency.opens.replace(":", " h ")} – ${returnAgency.closes.replace(":", " h ")}).`);
    const close = returnAgency.closes === "24:00" ? "23:30" : returnAgency.closes;
    suggestedDropoff = { local: returnTime < returnAgency.opens ? `${civilDateOf(p.rl)}T${returnAgency.opens}` : `${civilDateOf(p.rl)}T${close}`, timeZone: returnAgency.timeZone };
  }
  const iceland = pickupAgency.timeZone === "Atlantic/Reykjavik";
  const limitedMileage = supplier.id === "ew" && iceland;
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
    fuelPolicy: model.energy === "electric" ? "Restitution avec une charge au moins égale à celle du départ (démonstration)." : "Plein / plein : le véhicule est rendu avec le réservoir plein.",
    deposit: money(model.deposit),
    excess: money(model.excess),
    coverages: [
      "Responsabilité civile (obligatoire)",
      `Protection dommages collision (CDW) avec franchise de ${(model.excess / 100).toLocaleString("fr-FR")} €`,
      `Protection vol (TP) avec franchise de ${(model.excess / 100).toLocaleString("fr-FR")} €`,
      ...(iceland ? ["Exclusions courantes à vérifier : gravier, sable/cendres, passages à gué (conditions du loueur)"] : []),
    ],
    driverAge: p.age,
    youngDriverFeePerDay,
    oneWayFee,
    licenceRequirement: `Permis de conduire valide détenu depuis au moins ${model.licenceYears} an${model.licenceYears > 1 ? "s" : ""} ; permis international selon le pays de délivrance (à vérifier).`,
    cardRequirement: "Carte de crédit au nom du conducteur principal pour le dépôt de garantie ; cartes de débit et prépayées refusées (conditions de démonstration).",
    paymentCollector: p.pre ? "platform" : "agency",
    price: {
      lines,
      total,
      payNow,
      payOnSite,
      deposit: money(model.deposit),
      taxes: "included",
      notes: ["Le dépôt de garantie est bloqué sur la carte au comptoir puis libéré après restitution : il n'est pas encaissé."],
    },
    extras: extrasFor(model, p.pre),
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

export function generateCarOffers(input: CarGenInput): CarOffer[] {
  const pickupAgencies = agenciesForPlace(input.pickupPlace);
  const dropoffAgencies = agenciesForPlace(input.dropoffPlace);
  const offers: CarOffer[] = [];
  for (const pu of pickupAgencies) {
    const ret = input.dropoffPlace === input.pickupPlace ? pu : dropoffAgencies.find((a) => a.supplierId === pu.supplierId);
    if (!ret) continue;
    for (const m of modelsForAgency(pu)) {
      // Deux modes de paiement selon le loueur : prépayé (plateforme) ou à l'agence.
      const prepaid = pu.supplierId === "rl" || (pu.supplierId === "dl" && m.id !== "van7");
      offers.push(buildCarOffer({ pu: pu.id, do: ret.id, m: m.id, pl: input.pickupLocal, rl: input.dropoffLocal, age: input.driverAge, res: input.residence, pre: prepaid, t: input.t }));
    }
  }
  return offers;
}

