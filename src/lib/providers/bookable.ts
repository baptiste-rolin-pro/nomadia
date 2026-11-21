/** Conversion des offres de chaque verticale en « Bookable » normalisé pour le tunnel (textes dans une langue). */
import { civilDateOf } from "@/lib/dates";
import { getPlace } from "@/lib/content/places";
import { cityName } from "@/lib/content/localized";
import { DEFAULT_LOCALE, type Locale } from "@/i18n/config";
import { formatter } from "@/i18n/format";
import { getMessages } from "@/i18n/messages";
import type { Bookable, CarOffer, FlightOffer, HotelProperty, HotelRateOffer, ProviderInfo } from "@/lib/providers/types";
import { decodeFlightRef } from "@/lib/providers/demo/flights";
import { decodeCarRef } from "@/lib/providers/demo/cars";
import { encodeRooms } from "@/lib/search/params";

function cityOf(code: string, locale: Locale): string {
  const p = getPlace(`airport:${code}`);
  return p ? cityName(p.city, locale) : code;
}

/** Heure affichée dans les textes de l'offre : « 21 h 30 » en français, format local ailleurs. */
function text(locale: Locale) {
  const m = getMessages(locale);
  const f = formatter(locale);
  return { m, f, d: m.domain };
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

export function flightConditions(offer: FlightOffer, locale: Locale = DEFAULT_LOCALE): string[] {
  const { m, f, d } = text(locale);
  const t = d.flights;
  const fare = offer.fare;
  const amount = (fee: FlightOffer["fare"]["changeFee"]) => (fee ? f.money(fee) : t.unknownAmount);
  const lines = [
    f.t(t.fareFamily, { fare: fare.name, cabin: m.search.cabins[fare.cabin] }),
    f.t(t.bags, {
      personal: fare.personalItem ? t.personalItem : t.noPersonalItem,
      cabin: fare.cabinBags ? f.t(t.cabinBags, { n: fare.cabinBags }) : "",
      checked: fare.checkedBags ? `${f.t(t.checkedBags, { n: fare.checkedBags })}${fare.checkedBagKg ? f.t(t.checkedKg, { kg: fare.checkedBagKg }) : ""}` : t.noChecked,
    }),
    fare.change === "free" ? t.changeFree : fare.change === "with_fee" ? f.t(t.changeFee, { fee: amount(fare.changeFee) }) : t.changeNo,
    fare.refund === "free" ? t.refundFree : fare.refund === "with_fee" ? f.t(t.refundFee, { fee: amount(fare.refundFee) }) : t.refundNo,
    fare.seatSelection === "included" ? t.seatIncluded : fare.seatSelection === "paid" ? t.seatPaid : t.seatUnavailable,
  ];
  if (offer.separateTickets) lines.push(t.separateTickets);
  return lines;
}

export function flightToBookable(offer: FlightOffer, info: ProviderInfo, locale: Locale = DEFAULT_LOCALE): Bookable {
  const { m, f, d } = text(locale);
  const t = d.flights;
  const out = offer.slices[0]!;
  const outFirst = out.segments[0]!;
  const outLast = out.segments[out.segments.length - 1]!;
  const lastSlice = offer.slices[offer.slices.length - 1]!;
  const end = lastSlice.segments[lastSlice.segments.length - 1]!.arrival;
  const summaryLines = offer.slices.map((s, i) => {
    const a = s.segments[0]!;
    const b = s.segments[s.segments.length - 1]!;
    return f.t(t.summaryLine, {
      direction: i === 0 ? t.outbound : t.inbound,
      from: cityOf(a.origin.code, locale),
      fromCode: a.origin.code,
      date: f.date(civilDateOf(a.departure.local), "weekday"),
      time: f.time(a.departure.local),
      to: cityOf(b.destination.code, locale),
      toCode: b.destination.code,
      arrival: f.time(b.arrival.local),
      shift: s.dayShift ? f.t(t.shift, { n: s.dayShift }) : "",
      duration: f.duration(s.durationMinutes),
      stops: s.stops === 0 ? t.direct : f.t(t.stops, { n: s.stops }),
    });
  });
  const pax = offer.passengers;
  const route = { from: cityOf(outFirst.origin.code, locale), to: cityOf(outLast.destination.code, locale) };
  return {
    vertical: "flights",
    offerRef: offer.id,
    providerId: info.id,
    providerName: info.name,
    mode: info.mode,
    title: f.t(offer.slices.length > 1 ? t.titleRoundTrip : t.titleOneWay, route),
    subtitle: f.t(t.subtitle, { fare: offer.fare.name, travelers: f.t(m.search.travelers.flightSummary, { adults: pax.adults, children: pax.children, infants: pax.infants }) }),
    start: outFirst.departure,
    end,
    summaryLines,
    travelers: { kind: "passengers", adults: pax.adults, children: pax.children, infants: pax.infants, travelStart: civilDateOf(outFirst.departure.local), travelEnd: civilDateOf(end.local) },
    price: offer.price,
    cancellation: {
      refundable: offer.fare.refund !== "no",
      freeUntil: null,
      feeAfter: offer.fare.refundFee,
      summary: offer.fare.refund === "no" ? t.cancelNo : offer.fare.refund === "free" ? t.cancelFree : t.cancelFee,
    },
    conditions: flightConditions(offer, locale),
    paymentCollector: offer.paymentCollector,
    sellerOfRecord: info.sellerOfRecord,
    ancillaries: [
      {
        id: "extra-bag",
        label: t.extraBag,
        description: t.extraBagDesc,
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

/** `hotel` : établissement déjà dans la langue (voir localizeHotel). */
export function hotelToBookable(rate: HotelRateOffer, hotel: HotelProperty, info: ProviderInfo, locale: Locale = DEFAULT_LOCALE): Bookable {
  const { f, d } = text(locale);
  const t = d.hotels;
  const guests = rate.rooms.reduce((n, r) => n + r.adults + r.childrenAges.length, 0);
  const deadline = rate.cancellation.freeUntil;
  const city = cityName(hotel.city, locale);
  return {
    vertical: "hotels",
    offerRef: rate.id,
    providerId: info.id,
    providerName: info.name,
    mode: info.mode,
    title: f.t(t.title, { hotel: hotel.name, city }),
    subtitle: f.t(t.subtitle, { rooms: rate.rooms.length, room: rate.room.name, rate: rate.rateName }),
    start: { local: `${rate.checkIn}T${hotel.checkInFrom}`, timeZone: hotel.timeZone },
    end: { local: `${rate.checkOut}T${hotel.checkOutUntil}`, timeZone: hotel.timeZone },
    summaryLines: [
      `${f.t(t.arrival, { date: f.date(rate.checkIn), from: f.time(hotel.checkInFrom) })}${hotel.checkInUntil ? f.t(t.arrivalUntil, { until: f.time(hotel.checkInUntil) }) : ""}`,
      f.t(t.departure, { date: f.date(rate.checkOut), until: f.time(hotel.checkOutUntil) }),
      f.t(t.stay, { nights: rate.nights, guests, board: t.boards[rate.board] }),
      f.t(t.reception, { note: hotel.receptionNote }),
    ],
    travelers: { kind: "guests", rooms: rate.rooms.length, travelStart: rate.checkIn, travelEnd: rate.checkOut },
    price: rate.price,
    cancellation: rate.cancellation,
    conditions: [
      rate.cancellation.summary,
      deadline ? f.t(t.deadline, { date: f.date(civilDateOf(deadline.local)), time: f.time(deadline.local), zone: deadline.timeZone }) : t.noFreeCancellation,
      rate.cancellation.feeAfter ? f.t(t.feeAfter, { fee: f.money(rate.cancellation.feeAfter) }) : "",
      f.t(t.occupancy, { adults: rate.room.maxAdults, total: rate.room.maxOccupancy }),
      rate.paymentCollector === "property" ? t.payAtProperty : t.payAtBooking,
    ].filter(Boolean),
    paymentCollector: rate.paymentCollector,
    sellerOfRecord: info.sellerOfRecord,
    ancillaries: [
      {
        id: "baby-cot",
        label: t.babyCot,
        description: t.babyCotDesc,
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

export function carToBookable(car: CarOffer, info: ProviderInfo, locale: Locale = DEFAULT_LOCALE): Bookable {
  const { f, d } = text(locale);
  const t = d.cars;
  const hours = (hhmm: string) => (locale === DEFAULT_LOCALE ? hhmm.replace(":", " h ") : f.time(hhmm === "24:00" ? "23:59" : hhmm));
  return {
    vertical: "cars",
    offerRef: car.id,
    providerId: info.id,
    providerName: info.name,
    mode: info.mode,
    title: f.t(t.title, { category: car.category, supplier: car.supplier.name }),
    subtitle: f.t(t.subtitle, { model: car.exampleModel, days: car.rentalDays }),
    start: car.pickup,
    end: car.dropoff,
    summaryLines: [
      f.t(t.pickup, { agency: car.pickupAgency.name, date: f.date(civilDateOf(car.pickup.local)), time: f.time(car.pickup.local) }),
      f.t(t.dropoff, { agency: car.returnAgency.name, date: f.date(civilDateOf(car.dropoff.local)), time: f.time(car.dropoff.local) }),
      f.t(t.access, { note: car.pickupAgency.accessNote }),
      f.t(t.hours, { opens: hours(car.pickupAgency.opens), closes: hours(car.pickupAgency.closes) }),
    ],
    travelers: { kind: "driver", declaredAge: car.driverAge, travelStart: civilDateOf(car.pickup.local), travelEnd: civilDateOf(car.dropoff.local) },
    price: car.price,
    cancellation: {
      refundable: true,
      freeUntil: null,
      feeAfter: null,
      summary: t.cancellation,
    },
    conditions: [
      f.t(t.categoryCondition, { category: car.category, acriss: car.acriss, model: car.exampleModel }),
      car.mileage.unlimited ? t.unlimited : f.t(t.limited, { km: car.mileage.kmPerDay ?? 0, fee: car.mileage.extraKmFee ? f.money(car.mileage.extraKmFee) : "?" }),
      f.t(t.fuel, { policy: car.fuelPolicy }),
      f.t(t.deposit, { amount: f.money(car.deposit) }),
      f.t(t.excess, { amount: f.money(car.excess) }),
      ...car.coverages.map((c) => f.t(t.coverage, { coverage: c })),
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
