/**
 * Analyse d'un voyage : timeline jour par jour, budget détaillé et alertes de cohérence.
 * Aucune correction automatique : les incohérences sont signalées, l'utilisateur décide.
 */
import { addDays, civilDateOf, compareCivil, eachNight, epochDay, localToUtc, timeOf, type CivilDate } from "@/lib/dates";
import { DEFAULT_LOCALE, type Locale } from "@/i18n/config";
import { formatter } from "@/i18n/format";
import { getMessages } from "@/i18n/messages";

export type ItemStatus = "considered" | "to_book" | "booking" | "confirmed";
// Libellés des statuts : `planner.status` dans src/i18n/messages.

export interface Zoned {
  local: string;
  timeZone: string;
}

export interface PlannerItem {
  id: string;
  vertical: "flights" | "hotels" | "cars";
  status: ItemStatus;
  title: string;
  quoteValidity: "valid" | "stale";
  priceAmount: number;
  payOnSiteAmount: number;
  depositAmount: number;
  currency: string;
  snapshot: {
    segments: { label: string; start: Zoned; end: Zoned; kind: "flight" | "stay" | "car" }[];
    checkIn?: string;
    checkOut?: string;
    checkInFrom?: string;
    receptionNote?: string;
    /** Accueil limité (heure limite d'arrivée) ; absent des anciens instantanés : repli sur le texte français. */
    receptionLimited?: boolean;
    agencyHours?: { pickup: string; dropoff: string };
  };
}

export interface PlannerTrip {
  startDate: CivilDate;
  endDate: CivilDate;
  transferMarginMinutes: number;
  budgetTarget: number | null;
  currency: string;
}

export type Severity = "info" | "attention" | "bloquant";

export interface TripWarning {
  severity: Severity;
  code: string;
  message: string;
  itemIds: string[];
}

export interface TimelineEntry {
  time: string | null;
  label: string;
  kind: "flight" | "stay" | "car" | "night";
  itemId: string;
}

export interface TimelineDay {
  date: CivilDate;
  entries: TimelineEntry[];
  hotelNight: string | null;
}

export interface BudgetSummary {
  byVertical: { vertical: PlannerItem["vertical"]; total: number; payOnSite: number; deposit: number; count: number }[];
  total: number;
  payOnSite: number;
  payNowOrBooked: number;
  deposits: number;
  target: number | null;
  overBudget: boolean;
  currency: string;
  staleCount: number;
}

const instant = (z: Zoned) => localToUtc(z.local, z.timeZone).instantMs;

/** Accueil limité d'après la note française de l'établissement (« jusqu'à 23 h », « uniquement », « de 9 h à 20 h »). */
export function isReceptionLimited(note: string | undefined): boolean {
  return !!note && /jusqu'à|uniquement|de \d+ h à \d+ h/i.test(note);
}

/** Termine une phrase sans doubler le point d'une abréviation (« janv. »). */
function sentence(text: string, stop: string): string {
  return text.endsWith(stop) ? text : `${text}${stop}`;
}

function parseHours(range: string | undefined): { opens: string; closes: string } | null {
  if (!range) return null;
  const [opens, closes] = range.split("-");
  return opens && closes ? { opens, closes: closes === "24:00" ? "23:59" : closes } : null;
}

/** Analyse dans une langue : textes des alertes et de la timeline (`planner.alerts`, `planner.timeline`). */
export function analyzeTrip(trip: PlannerTrip, items: PlannerItem[], locale: Locale = DEFAULT_LOCALE): { warnings: TripWarning[]; timeline: TimelineDay[]; budget: BudgetSummary } {
  const msg = getMessages(locale).planner;
  const sep = getMessages(locale).common.listSep;
  const a = msg.alerts;
  const f = formatter(locale);
  const short = (d: CivilDate) => f.date(d, "short");
  const hhmm = (local: string) => f.time(local);
  const warnings: TripWarning[] = [];
  const margin = trip.transferMarginMinutes;

  const flightSlices = items
    .filter((i) => i.vertical === "flights")
    .flatMap((i) => i.snapshot.segments.filter((s) => s.kind === "flight").map((s) => ({ item: i, seg: s })))
    .sort((a, b) => instant(a.seg.start) - instant(b.seg.start));
  const hotels = items.filter((i) => i.vertical === "hotels" && i.snapshot.checkIn && i.snapshot.checkOut);
  const cars = items.filter((i) => i.vertical === "cars" && i.snapshot.segments[0]);

  const arrival = flightSlices[0]?.seg.end ?? null;
  const departureSlice = flightSlices.length > 1 ? flightSlices[flightSlices.length - 1]! : null;
  const departure = departureSlice?.seg.start ?? null;

  // 1. Prestations hors des dates du voyage et devis périmés
  for (const item of items) {
    const segs = item.snapshot.segments;
    if (!segs.length) continue;
    const first = civilDateOf(segs[0]!.start.local);
    const last = civilDateOf(segs[segs.length - 1]!.end.local);
    if (compareCivil(first, trip.startDate) < 0 || compareCivil(last, addDays(trip.endDate, 1)) > 0) {
      warnings.push({ severity: "attention", code: "outside_dates", message: f.t(a.outsideDates, { title: item.title, from: short(trip.startDate), to: short(trip.endDate) }), itemIds: [item.id] });
    }
    if (item.quoteValidity === "stale") {
      warnings.push({ severity: "attention", code: "stale_quote", message: f.t(a.staleQuote, { title: item.title }), itemIds: [item.id] });
    }
  }

  // 2. Arrivée tardive et nuitée décalée
  let neededStart: CivilDate = trip.startDate;
  let neededEnd: CivilDate = trip.endDate;
  if (arrival) {
    const arrDate = civilDateOf(arrival.local);
    const arrHour = Number(arrival.local.slice(11, 13));
    const lateNight = arrHour < 5;
    neededStart = lateNight ? addDays(arrDate, -1) : arrDate;
    if (arrHour >= 22 || lateNight) {
      warnings.push({
        severity: "info",
        code: "late_arrival",
        message: lateNight
          ? f.t(a.lateNight, { date: short(arrDate), time: hhmm(arrival.local), nightFrom: short(addDays(arrDate, -1)), nightTo: short(arrDate) })
          : f.t(a.late, { time: hhmm(arrival.local) }),
        itemIds: [flightSlices[0]!.item.id],
      });
    }
  }
  if (departure) neededEnd = civilDateOf(departure.local);

  // 3. Couverture d'hébergement, chevauchements, hôtels avant l'arrivée / après le départ
  const coverage = new Map<CivilDate, string[]>();
  for (const h of hotels) {
    for (const night of eachNight(h.snapshot.checkIn!, h.snapshot.checkOut!)) {
      coverage.set(night, [...(coverage.get(night) ?? []), h.id]);
    }
    if (compareCivil(h.snapshot.checkIn!, neededStart) < 0) {
      warnings.push({ severity: "attention", code: "hotel_before_arrival", message: f.t(a.hotelBefore, { title: h.title, date: short(h.snapshot.checkIn!) }), itemIds: [h.id] });
    }
    if (compareCivil(h.snapshot.checkOut!, neededEnd) > 0) {
      warnings.push({ severity: "attention", code: "hotel_after_departure", message: f.t(a.hotelAfter, { title: h.title, date: short(h.snapshot.checkOut!) }), itemIds: [h.id] });
    }
    const limited = h.snapshot.receptionLimited ?? isReceptionLimited(h.snapshot.receptionNote);
    if (arrival && h.snapshot.checkIn === civilDateOf(arrival.local) && h.snapshot.receptionNote && limited) {
      const arrHour = Number(arrival.local.slice(11, 13));
      if (arrHour >= 20) {
        warnings.push({ severity: "attention", code: "reception_hours", message: f.t(a.reception, { time: hhmm(arrival.local), title: h.title, note: h.snapshot.receptionNote }), itemIds: [h.id] });
      }
    }
  }
  const overlapNights = [...coverage.entries()].filter(([, ids]) => ids.length > 1);
  if (overlapNights.length) {
    warnings.push({
      severity: "attention",
      code: "hotel_overlap",
      message: sentence(f.t(a.overlap, { dates: overlapNights.map(([d]) => short(d)).join(sep) }), a.fullStop),
      itemIds: [...new Set(overlapNights.flatMap(([, ids]) => ids))],
    });
  }
  if (compareCivil(neededEnd, neededStart) > 0) {
    const gaps = eachNight(neededStart, neededEnd).filter((n) => !coverage.has(n));
    if (gaps.length) {
      warnings.push({
        severity: hotels.length ? "attention" : "info",
        code: "hotel_gap",
        message: sentence(f.t(a.gap, { n: gaps.length, nights: gaps.map((d) => f.t(a.gapNight, { date: short(d) })).join(sep) }), a.fullStop),
        itemIds: [],
      });
    }
  }

  // 4. Voitures : retrait avant l'atterrissage, retour après le départ, agences fermées
  for (const car of cars) {
    const seg = car.snapshot.segments[0]!;
    if (arrival && instant(seg.start) < instant(arrival) + margin * 60000) {
      warnings.push({
        severity: "attention",
        code: "car_before_landing",
        message: f.t(a.carBeforeLanding, { title: car.title, date: short(civilDateOf(seg.start.local)), time: hhmm(seg.start.local), landing: hhmm(arrival.local), margin }),
        itemIds: [car.id, flightSlices[0]!.item.id],
      });
    }
    if (departure && instant(seg.end) > instant(departure) - margin * 60000) {
      warnings.push({
        severity: "attention",
        code: "car_after_departure",
        message: f.t(a.carAfterDeparture, { title: car.title, time: hhmm(seg.end.local), departure: hhmm(departure.local), margin }),
        itemIds: [car.id, departureSlice!.item.id],
      });
    }
    const hours = parseHours(car.snapshot.agencyHours?.pickup);
    const t = timeOf(seg.start.local);
    if (hours && (t < hours.opens || t > hours.closes)) {
      warnings.push({ severity: "bloquant", code: "agency_closed", message: f.t(a.agencyClosed, { title: car.title, time: hhmm(seg.start.local), opens: hours.opens, closes: hours.closes }), itemIds: [car.id] });
    }
  }

  // 5. Timeline jour par jour
  const days: TimelineDay[] = [];
  const span = Math.max(0, epochDay(trip.endDate) - epochDay(trip.startDate));
  for (let i = 0; i <= Math.min(span, 60); i++) {
    const date = addDays(trip.startDate, i);
    days.push({ date, entries: [], hotelNight: coverage.get(date)?.map((id) => items.find((x) => x.id === id)?.title ?? "").join(" + ") || null });
  }
  const dayOf = (d: CivilDate) => days.find((x) => x.date === d);
  for (const item of items) {
    for (const seg of item.snapshot.segments) {
      if (seg.kind === "flight") {
        dayOf(civilDateOf(seg.start.local))?.entries.push({ time: timeOf(seg.start.local), label: f.t(msg.timeline.departure, { label: seg.label }), kind: "flight", itemId: item.id });
        dayOf(civilDateOf(seg.end.local))?.entries.push({ time: timeOf(seg.end.local), label: f.t(msg.timeline.arrival, { label: seg.label }), kind: "flight", itemId: item.id });
      } else if (seg.kind === "stay") {
        dayOf(civilDateOf(seg.start.local))?.entries.push({ time: item.snapshot.checkInFrom ?? null, label: f.t(msg.timeline.checkIn, { title: item.title }), kind: "stay", itemId: item.id });
        dayOf(civilDateOf(seg.end.local))?.entries.push({ time: timeOf(seg.end.local), label: f.t(msg.timeline.checkOut, { title: item.title }), kind: "stay", itemId: item.id });
      } else {
        dayOf(civilDateOf(seg.start.local))?.entries.push({ time: timeOf(seg.start.local), label: f.t(msg.timeline.pickup, { label: seg.label }), kind: "car", itemId: item.id });
        dayOf(civilDateOf(seg.end.local))?.entries.push({ time: timeOf(seg.end.local), label: f.t(msg.timeline.dropoff, { label: seg.label }), kind: "car", itemId: item.id });
      }
    }
  }
  for (const d of days) d.entries.sort((a, b) => (a.time ?? "99").localeCompare(b.time ?? "99"));

  // 6. Budget (montants entiers en unités mineures)
  const verticals: PlannerItem["vertical"][] = ["flights", "hotels", "cars"];
  const byVertical = verticals.map((v) => {
    const list = items.filter((i) => i.vertical === v);
    return {
      vertical: v,
      total: list.reduce((n, i) => n + i.priceAmount, 0),
      payOnSite: list.reduce((n, i) => n + i.payOnSiteAmount, 0),
      deposit: list.reduce((n, i) => n + i.depositAmount, 0),
      count: list.length,
    };
  });
  const total = byVertical.reduce((n, v) => n + v.total, 0);
  const payOnSite = byVertical.reduce((n, v) => n + v.payOnSite, 0);
  const deposits = byVertical.reduce((n, v) => n + v.deposit, 0);
  const overBudget = trip.budgetTarget !== null && total > trip.budgetTarget;
  if (overBudget) {
    warnings.push({ severity: "info", code: "over_budget", message: a.overBudget, itemIds: [] });
  }
  const order: Record<Severity, number> = { bloquant: 0, attention: 1, info: 2 };
  warnings.sort((a, b) => order[a.severity] - order[b.severity]);
  return {
    warnings,
    timeline: days,
    budget: {
      byVertical,
      total,
      payOnSite,
      payNowOrBooked: total - payOnSite,
      deposits,
      target: trip.budgetTarget,
      overBudget,
      currency: trip.currency,
      staleCount: items.filter((i) => i.quoteValidity === "stale").length,
    },
  };
}

/** Une modification des dates invalide les devis des prestations hors de la nouvelle période. */
export function itemsInvalidatedByDates(items: PlannerItem[], startDate: CivilDate, endDate: CivilDate): string[] {
  return items
    .filter((i) => {
      const segs = i.snapshot.segments;
      if (!segs.length) return false;
      const first = civilDateOf(segs[0]!.start.local);
      const last = civilDateOf(segs[segs.length - 1]!.end.local);
      return compareCivil(first, startDate) < 0 || compareCivil(last, addDays(endDate, 1)) > 0;
    })
    .map((i) => i.id);
}
