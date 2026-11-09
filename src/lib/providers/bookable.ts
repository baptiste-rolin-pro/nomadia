/** Conversion des offres de chaque verticale en « Bookable » normalisé pour le tunnel. */
import { civilDateOf, formatCivilDate, formatDuration, formatLocalTime } from "@/lib/dates";
import { formatMoney } from "@/lib/money";
import { getPlace } from "@/lib/content/places";
import { BOARD_LABELS, CABIN_LABELS, type Bookable, type CarOffer, type FlightOffer, type HotelProperty, type HotelRateOffer, type ProviderInfo } from "@/lib/providers/types";
import { decodeFlightRef } from "@/lib/providers/demo/flights";
import { decodeCarRef } from "@/lib/providers/demo/cars";
import { encodeRooms } from "@/lib/search/params";

function cityOf(code: string): string {
  return getPlace(`airport:${code}`)?.city ?? code;
}

export function flightSearchUrl(offer: FlightOffer): string {
  const p = decodeFlightRef(offer.id);
  const first = offer.slices[0]!.segments[0]!;
  const last = offer.slices[0]!.segments[offer.slices[0]!.segments.length - 1]!;
  const q = new URLSearchParams({
    o: `airport:${first.origin.code}`,
    d: `airport:${last.destination.code}`,
    type: offer.slices.length > 1 ? "ar" : "as",
    dep: civilDateOf(first.departure.local),
    adt: String(offer.passengers.adults),
  });
  if (offer.slices[1]) q.set("ret", civilDateOf(offer.slices[1].segments[0]!.departure.local));
  if (p?.c.length) q.set("chd", p.c.join(","));
  if (offer.passengers.infants) q.set("inf", String(offer.passengers.infants));
  if (offer.fare.cabin !== "economy") q.set("cab", offer.fare.cabin);
  return `/vols?${q.toString()}`;
}

export function flightConditions(offer: FlightOffer): string[] {
  const f = offer.fare;
  const lines = [
    `Famille tarifaire : ${f.name} (${CABIN_LABELS[f.cabin]}).`,
    `Bagages inclus par passager : ${f.personalItem ? "1 petit sac sous le siège" : "aucun petit sac"}${f.cabinBags ? `, ${f.cabinBags} bagage${f.cabinBags > 1 ? "s" : ""} cabine` : ""}${f.checkedBags ? `, ${f.checkedBags} bagage${f.checkedBags > 1 ? "s" : ""} en soute${f.checkedBagKg ? ` (${f.checkedBagKg} kg)` : ""}` : ", pas de bagage en soute"}.`,
    `Modification : ${f.change === "free" ? "sans frais (hors différence tarifaire)" : f.change === "with_fee" ? `avec frais de ${f.changeFee ? formatMoney(f.changeFee) : "montant non communiqué"} par passager, plus différence tarifaire` : "non autorisée"}.`,
    `Remboursement : ${f.refund === "free" ? "sans frais" : f.refund === "with_fee" ? `avec frais de ${f.refundFee ? formatMoney(f.refundFee) : "montant non communiqué"} par passager` : "non remboursable"}.`,
    `Choix du siège : ${f.seatSelection === "included" ? "inclus" : f.seatSelection === "paid" ? "payant, non proposé dans cette démonstration" : "non disponible"}.`,
  ];
  if (offer.separateTickets) {
    lines.push("Billets séparés : la correspondance n'est pas protégée. En cas de retard du premier vol, le second n'est pas garanti ; vous devez récupérer vos bagages et vous enregistrer à nouveau.");
  }
  return lines;
}

export function flightToBookable(offer: FlightOffer, info: ProviderInfo): Bookable {
  const out = offer.slices[0]!;
  const outFirst = out.segments[0]!;
  const outLast = out.segments[out.segments.length - 1]!;
  const lastSlice = offer.slices[offer.slices.length - 1]!;
  const end = lastSlice.segments[lastSlice.segments.length - 1]!.arrival;
  const summaryLines = offer.slices.map((s, i) => {
    const a = s.segments[0]!;
    const b = s.segments[s.segments.length - 1]!;
    return `${i === 0 ? "Aller" : "Retour"} : ${cityOf(a.origin.code)} (${a.origin.code}) ${formatCivilDate(civilDateOf(a.departure.local), "weekday")} ${formatLocalTime(a.departure.local)} → ${cityOf(b.destination.code)} (${b.destination.code}) ${formatLocalTime(b.arrival.local)}${s.dayShift ? ` (+${s.dayShift} j)` : ""}, ${formatDuration(s.durationMinutes)}, ${s.stops === 0 ? "direct" : `${s.stops} escale${s.stops > 1 ? "s" : ""}`}`;
  });
  const pax = offer.passengers;
  return {
    vertical: "flights",
    offerRef: offer.id,
    providerId: info.id,
    providerName: info.name,
    mode: info.mode,
    title: `Vol ${cityOf(outFirst.origin.code)} → ${cityOf(outLast.destination.code)}${offer.slices.length > 1 ? " (aller-retour)" : " (aller simple)"}`,
    subtitle: `${offer.fare.name} · ${pax.adults} adulte${pax.adults > 1 ? "s" : ""}${pax.children ? `, ${pax.children} enfant${pax.children > 1 ? "s" : ""}` : ""}${pax.infants ? `, ${pax.infants} bébé${pax.infants > 1 ? "s" : ""}` : ""}`,
    start: outFirst.departure,
    end,
    summaryLines,
    travelers: { kind: "passengers", adults: pax.adults, children: pax.children, infants: pax.infants, travelStart: civilDateOf(outFirst.departure.local), travelEnd: civilDateOf(end.local) },
    price: offer.price,
    cancellation: {
      refundable: offer.fare.refund !== "no",
      freeUntil: null,
      feeAfter: offer.fare.refundFee,
      summary: offer.fare.refund === "no" ? "Billet non remboursable." : offer.fare.refund === "free" ? "Remboursable sans frais." : "Remboursable avec frais par passager.",
    },
    conditions: flightConditions(offer),
    paymentCollector: offer.paymentCollector,
    sellerOfRecord: info.sellerOfRecord,
    ancillaries: [
      {
        id: "extra-bag",
        label: "Bagage en soute supplémentaire (23 kg)",
        description: "Par passager et par trajet, réservé auprès de la compagnie (démonstration).",
        unitPrice: { amount: 3500, currency: "EUR" },
        per: "passenger",
        payable: "now",
        maxQuantity: (pax.adults + pax.children) * offer.slices.length,
        guaranteed: true,
      },
    ],
    searchUrl: flightSearchUrl(offer),
    bookable: true,
    blockingReasons: [],
    ticketingSeparate: true,
  };
}

export function hotelSearchUrl(rate: HotelRateOffer, hotel: HotelProperty): string {
  const place = { lisbonne: "city:LIS", rome: "city:ROM", reykjavik: "city:REK" }[hotel.destinationSlug] ?? "";
  const q = new URLSearchParams({ dest: place, arr: rate.checkIn, dep: rate.checkOut, ch: encodeRooms(rate.rooms) });
  return `/hotels?${q.toString()}`;
}

export function hotelToBookable(rate: HotelRateOffer, hotel: HotelProperty, info: ProviderInfo): Bookable {
  const guests = rate.rooms.reduce((n, r) => n + r.adults + r.childrenAges.length, 0);
  const deadline = rate.cancellation.freeUntil;
  return {
    vertical: "hotels",
    offerRef: rate.id,
    providerId: info.id,
    providerName: info.name,
    mode: info.mode,
    title: `${hotel.name} — ${hotel.city}`,
    subtitle: `${rate.rooms.length} × ${rate.room.name} · ${rate.rateName}`,
    start: { local: `${rate.checkIn}T${hotel.checkInFrom}`, timeZone: hotel.timeZone },
    end: { local: `${rate.checkOut}T${hotel.checkOutUntil}`, timeZone: hotel.timeZone },
    summaryLines: [
      `Arrivée ${formatCivilDate(rate.checkIn)} à partir de ${formatLocalTime(`${rate.checkIn}T${hotel.checkInFrom}`)}${hotel.checkInUntil ? ` (jusqu'à ${formatLocalTime(`${rate.checkIn}T${hotel.checkInUntil}`)})` : ""}`,
      `Départ ${formatCivilDate(rate.checkOut)} avant ${formatLocalTime(`${rate.checkOut}T${hotel.checkOutUntil}`)}`,
      `${rate.nights} nuit${rate.nights > 1 ? "s" : ""}, ${guests} voyageur${guests > 1 ? "s" : ""}, ${BOARD_LABELS[rate.board]}`,
      `Accueil : ${hotel.receptionNote}`,
    ],
    travelers: { kind: "guests", rooms: rate.rooms.length, travelStart: rate.checkIn, travelEnd: rate.checkOut },
    price: rate.price,
    cancellation: rate.cancellation,
    conditions: [
      rate.cancellation.summary,
      deadline ? `Échéance d'annulation gratuite : ${formatCivilDate(civilDateOf(deadline.local))} à ${formatLocalTime(deadline.local)} (heure locale, ${deadline.timeZone}).` : "Aucune annulation gratuite.",
      rate.cancellation.feeAfter ? `Frais après l'échéance : ${formatMoney(rate.cancellation.feeAfter)}.` : "",
      `Occupation : ${rate.room.maxAdults} adultes maximum et ${rate.room.maxOccupancy} personnes au total par chambre (hors lit bébé).`,
      rate.paymentCollector === "property" ? "Paiement à l'établissement : aucune somme n'est encaissée par Nomadia." : "Paiement à la réservation, encaissé pour le compte du fournisseur (démonstration).",
    ].filter(Boolean),
    paymentCollector: rate.paymentCollector,
    sellerOfRecord: info.sellerOfRecord,
    ancillaries: [
      {
        id: "baby-cot",
        label: "Lit bébé",
        description: "Sur demande auprès de l'établissement ; disponibilité non garantie, sans frais annoncés (démonstration).",
        unitPrice: { amount: 0, currency: "EUR" },
        per: "booking",
        payable: "on_site",
        maxQuantity: 1,
        guaranteed: false,
      },
    ],
    searchUrl: hotelSearchUrl(rate, hotel),
    bookable: true,
    blockingReasons: [],
    ticketingSeparate: false,
  };
}

export function carSearchUrl(car: CarOffer): string {
  const p = decodeCarRef(car.id);
  const q = new URLSearchParams({
    pu: car.pickupAgency.placeId,
    pud: civilDateOf(car.pickup.local),
    put: car.pickup.local.slice(11, 16),
    dod: civilDateOf(car.dropoff.local),
    dot: car.dropoff.local.slice(11, 16),
    age: String(car.driverAge),
  });
  if (car.returnAgency.placeId !== car.pickupAgency.placeId) q.set("do", car.returnAgency.placeId);
  if (p && p.res !== "FR") q.set("res", p.res);
  return `/voitures?${q.toString()}`;
}

export function carToBookable(car: CarOffer, info: ProviderInfo): Bookable {
  return {
    vertical: "cars",
    offerRef: car.id,
    providerId: info.id,
    providerName: info.name,
    mode: info.mode,
    title: `${car.category} — ${car.supplier.name}`,
    subtitle: `${car.exampleModel} (modèle non garanti) · ${car.rentalDays} jour${car.rentalDays > 1 ? "s" : ""}`,
    start: car.pickup,
    end: car.dropoff,
    summaryLines: [
      `Prise en charge : ${car.pickupAgency.name}, ${formatCivilDate(civilDateOf(car.pickup.local))} à ${formatLocalTime(car.pickup.local)}`,
      `Restitution : ${car.returnAgency.name}, ${formatCivilDate(civilDateOf(car.dropoff.local))} à ${formatLocalTime(car.dropoff.local)}`,
      `Accès : ${car.pickupAgency.accessNote}`,
      `Horaires de l'agence : ${car.pickupAgency.opens.replace(":", " h ")} – ${car.pickupAgency.closes.replace(":", " h ")} (heure locale)`,
    ],
    travelers: { kind: "driver", declaredAge: car.driverAge, travelStart: civilDateOf(car.pickup.local), travelEnd: civilDateOf(car.dropoff.local) },
    price: car.price,
    cancellation: {
      refundable: true,
      freeUntil: null,
      feeAfter: null,
      summary: "Annulation sans frais jusqu'à 48 h avant la prise en charge, puis une journée de location retenue (règle de démonstration).",
    },
    conditions: [
      `Catégorie ${car.category} (${car.acriss}) : ${car.exampleModel}. Le modèle exact n'est pas garanti.`,
      `Kilométrage : ${car.mileage.unlimited ? "illimité" : `${car.mileage.kmPerDay} km par jour, puis ${car.mileage.extraKmFee ? formatMoney(car.mileage.extraKmFee) : "?"} par km`}.`,
      `Carburant : ${car.fuelPolicy}`,
      `Dépôt de garantie : ${formatMoney(car.deposit)} bloqués sur la carte au comptoir (non encaissés).`,
      `Franchise : ${formatMoney(car.excess)}.`,
      ...car.coverages.map((c) => `Couverture incluse : ${c}.`),
      car.licenceRequirement,
      car.cardRequirement,
    ],
    paymentCollector: car.paymentCollector,
    sellerOfRecord: info.sellerOfRecord,
    ancillaries: car.extras,
    searchUrl: carSearchUrl(car),
    bookable: car.bookable,
    blockingReasons: car.blockingReasons,
    ticketingSeparate: false,
  };
}
