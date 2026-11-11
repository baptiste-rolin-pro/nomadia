import { describe, expect, it } from "vitest";
import { analyzeTrip, itemsInvalidatedByDates, type PlannerItem } from "@/lib/planner/analyze";
import { validateTravelers } from "@/lib/booking/travelers";
import { computeTotals, OptionError } from "@/lib/booking/pricing";
import type { Bookable } from "@/lib/providers/types";
import { money } from "@/lib/money";

const trip = { startDate: "2027-01-20", endDate: "2027-01-25", transferMarginMinutes: 90, budgetTarget: 100000, currency: "EUR" };

function flight(arrLocal: string, retDep: string): PlannerItem {
  return {
    id: "f1",
    vertical: "flights",
    status: "considered",
    title: "Vol Paris → Keflavík",
    quoteValidity: "valid",
    priceAmount: 60000,
    payOnSiteAmount: 0,
    depositAmount: 0,
    currency: "EUR",
    snapshot: {
      segments: [
        { label: "CDG → KEF", start: { local: "2027-01-20T21:30", timeZone: "Europe/Paris" }, end: { local: arrLocal, timeZone: "Atlantic/Reykjavik" }, kind: "flight" },
        { label: "KEF → CDG", start: { local: retDep, timeZone: "Atlantic/Reykjavik" }, end: { local: "2027-01-25T19:00", timeZone: "Europe/Paris" }, kind: "flight" },
      ],
    },
  };
}

function hotel(id: string, checkIn: string, checkOut: string): PlannerItem {
  return {
    id,
    vertical: "hotels",
    status: "considered",
    title: `Hôtel ${id}`,
    quoteValidity: "valid",
    priceAmount: 30000,
    payOnSiteAmount: 2000,
    depositAmount: 0,
    currency: "EUR",
    snapshot: { segments: [{ label: id, start: { local: `${checkIn}T15:00`, timeZone: "Atlantic/Reykjavik" }, end: { local: `${checkOut}T11:00`, timeZone: "Atlantic/Reykjavik" }, kind: "stay" }], checkIn, checkOut, checkInFrom: "15:00", receptionNote: "Accueil de 8 h à 20 h uniquement." },
  };
}

function car(pickup: string, dropoff: string): PlannerItem {
  return {
    id: "c1",
    vertical: "cars",
    status: "considered",
    title: "4x4 compact",
    quoteValidity: "valid",
    priceAmount: 40000,
    payOnSiteAmount: 0,
    depositAmount: 120000,
    currency: "EUR",
    snapshot: { segments: [{ label: "KEF", start: { local: pickup, timeZone: "Atlantic/Reykjavik" }, end: { local: dropoff, timeZone: "Atlantic/Reykjavik" }, kind: "car" }], agencyHours: { pickup: "06:00-23:00", dropoff: "06:00-23:00" } },
  };
}

describe("analyse du voyage", () => {
  it("signale une voiture prise avant l'atterrissage + marge, et l'agence fermée", () => {
    const { warnings } = analyzeTrip(trip, [flight("2027-01-20T23:55", "2027-01-25T14:20"), car("2027-01-20T23:30", "2027-01-25T12:00")]);
    const codes = warnings.map((w) => w.code);
    expect(codes).toContain("car_before_landing");
    expect(codes).toContain("agency_closed");
    expect(warnings[0]!.severity).toBe("bloquant");
  });

  it("signale une voiture rendue trop tard pour le vol retour", () => {
    const { warnings } = analyzeTrip(trip, [flight("2027-01-20T23:55", "2027-01-25T14:20"), car("2027-01-21T08:00", "2027-01-25T13:30")]);
    expect(warnings.map((w) => w.code)).toContain("car_after_departure");
  });

  it("gère l'arrivée nocturne : la nuit précédente est requise (nuitée décalée)", () => {
    const res = analyzeTrip(trip, [flight("2027-01-21T00:40", "2027-01-25T14:20"), hotel("h1", "2027-01-20", "2027-01-25")]);
    expect(res.warnings.find((w) => w.code === "late_arrival")?.message).toMatch(/nuitée décalée/);
    expect(res.warnings.map((w) => w.code)).not.toContain("hotel_before_arrival");
    expect(res.warnings.map((w) => w.code)).not.toContain("hotel_gap");
  });

  it("détecte les nuits sans hébergement et les chevauchements, sans rien corriger", () => {
    const items = [flight("2027-01-20T23:55", "2027-01-25T14:20"), hotel("h1", "2027-01-20", "2027-01-22"), hotel("h2", "2027-01-21", "2027-01-23")];
    const res = analyzeTrip(trip, items);
    const codes = res.warnings.map((w) => w.code);
    expect(codes).toContain("hotel_overlap");
    expect(codes).toContain("hotel_gap");
    expect(res.warnings.find((w) => w.code === "hotel_gap")!.message).toMatch(/2 nuits/);
    expect(items[1]!.snapshot.checkIn).toBe("2027-01-20");
  });

  it("calcule le budget avec montants sur place et dépôts séparés", () => {
    const { budget } = analyzeTrip(trip, [flight("2027-01-20T23:55", "2027-01-25T14:20"), hotel("h1", "2027-01-20", "2027-01-25"), car("2027-01-21T08:00", "2027-01-25T11:00")]);
    expect(budget.total).toBe(130000);
    expect(budget.payOnSite).toBe(2000);
    expect(budget.deposits).toBe(120000);
    expect(budget.overBudget).toBe(true);
  });

  it("invalide les devis hors des nouvelles dates", () => {
    const items = [hotel("h1", "2027-01-20", "2027-01-25"), hotel("h2", "2027-01-26", "2027-01-27")];
    expect(itemsInvalidatedByDates(items, "2027-01-20", "2027-01-25")).toEqual(["h2"]);
  });
});

describe("voyageurs : âge à la date de chaque trajet", () => {
  const req = { kind: "passengers" as const, adults: 1, children: 1, infants: 1, travelStart: "2027-06-01", travelEnd: "2027-06-15" };
  it("refuse un enfant qui aura 12 ans avant le retour et un bébé qui aura 2 ans", () => {
    const issues = validateTravelers(req, [
      { type: "adult", firstName: "Alex", lastName: "Martin", birthDate: "1990-01-01" },
      { type: "child", firstName: "Léa", lastName: "Martin", birthDate: "2015-06-10" },
      { type: "infant", firstName: "Noé", lastName: "Martin", birthDate: "2025-06-05" },
    ]);
    expect(issues.map((i) => i.index)).toEqual([1, 2]);
  });

  it("accepte des voyageurs valides", () => {
    expect(
      validateTravelers(req, [
        { type: "adult", firstName: "Alex", lastName: "Martin", birthDate: "1990-01-01" },
        { type: "child", firstName: "Léa", lastName: "Martin", birthDate: "2018-09-10" },
        { type: "infant", firstName: "Noé", lastName: "Martin", birthDate: "2026-09-05" },
      ]),
    ).toEqual([]);
  });

  it("signale un âge de conducteur différent de celui de la recherche", () => {
    const issues = validateTravelers({ kind: "driver", declaredAge: 30, travelStart: "2027-06-01", travelEnd: "2027-06-05" }, [{ type: "driver", firstName: "Sam", lastName: "Petit", birthDate: "2004-01-01" }]);
    expect(issues[0]?.message).toMatch(/23 ans/);
  });
});

describe("total serveur avec options", () => {
  const bookable = {
    vertical: "cars",
    start: { local: "2027-01-10T10:00", timeZone: "Europe/Rome" },
    end: { local: "2027-01-13T10:00", timeZone: "Europe/Rome" },
    price: { lines: [{ label: "Location", amount: money(9000), kind: "base", payable: "now" }], total: money(9000), payNow: money(9000), payOnSite: money(0), deposit: money(50000), taxes: "included", notes: [] },
    ancillaries: [
      { id: "child-seat", label: "Siège enfant", description: "", unitPrice: money(900), per: "day", payable: "on_site", maxQuantity: 2, guaranteed: false },
      { id: "excess-reduction", label: "Réduction de franchise", description: "", unitPrice: money(1800), per: "day", payable: "now", maxQuantity: 1, guaranteed: true },
    ],
  } as unknown as Bookable;

  it("ajoute les options par jour et sépare payé maintenant / sur place", () => {
    const t = computeTotals(bookable, [
      { id: "child-seat", quantity: 1 },
      { id: "excess-reduction", quantity: 1 },
    ]);
    expect(t.payNow.amount).toBe(9000 + 1800 * 3);
    expect(t.payOnSite.amount).toBe(900 * 3);
    expect(t.total.amount).toBe(t.payNow.amount + t.payOnSite.amount);
    expect(t.deposit?.amount).toBe(50000);
  });

  it("refuse une option inconnue ou une quantité hors limites", () => {
    expect(() => computeTotals(bookable, [{ id: "gps", quantity: 1 }])).toThrow(OptionError);
    expect(() => computeTotals(bookable, [{ id: "excess-reduction", quantity: 2 }])).toThrow(OptionError);
  });
});
