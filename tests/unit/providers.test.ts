import { describe, expect, it } from "vitest";
import { buildFlightOffer, decodeFlightRef, generateFlightOffers } from "@/lib/providers/demo/flights";
import { buildRateOffer, ratesForHotel, roomFits } from "@/lib/providers/demo/hotels";
import { demoHotelById } from "@/lib/providers/demo/hotels-data";
import { buildCarOffer, rentalDays } from "@/lib/providers/demo/cars";
import { sum } from "@/lib/money";
import { applyCarFilters, applyFlightFilters, parseCarFilters, parseFlightFilters } from "@/lib/search/filters";
import { parseFlightSearch, parseHotelSearch, dateWindowIssues } from "@/lib/search/params";

const T = 1_800_000_000;

describe("vols de démonstration", () => {
  const input = { originAirports: ["CDG", "ORY"], destinationAirports: ["LIS"], departDate: "2027-01-12", returnDate: "2027-01-16", adults: 2, childrenAges: [7], infants: 1, cabin: "economy" as const, generatedAtSec: T };

  it("sont déterministes et régénérables depuis leur référence", () => {
    const a = generateFlightOffers(input);
    const b = generateFlightOffers(input);
    expect(a.map((o) => o.id)).toEqual(b.map((o) => o.id));
    expect(a.length).toBeGreaterThan(5);
    const first = a[3]!;
    const rebuilt = buildFlightOffer(decodeFlightRef(first.id)!);
    expect(rebuilt.price.total).toEqual(first.price.total);
  });

  it("le total est la somme des lignes et couvre tous les passagers", () => {
    for (const o of generateFlightOffers(input)) {
      expect(sum(o.price.lines.map((l) => l.amount)).amount).toBe(o.price.total.amount);
      expect(o.passengers).toEqual({ adults: 2, children: 1, infants: 1 });
      const unitTotal = o.perPassenger.reduce((n, p) => n + p.unit.amount * p.count, 0);
      expect(unitTotal).toBe(o.price.total.amount);
    }
  });

  it("présente explicitement les billets séparés", () => {
    const sep = generateFlightOffers({ ...input, returnDate: null }).filter((o) => o.separateTickets);
    expect(sep.length).toBeGreaterThan(0);
    expect(sep.every((o) => o.slices.some((s) => s.layovers.some((l) => l.selfTransfer)))).toBe(true);
  });

  it("propose une arrivée tardive à Keflavík (scénario n° 3)", () => {
    const offers = generateFlightOffers({ ...input, destinationAirports: ["KEF"], originAirports: ["CDG"], childrenAges: [], infants: 0 });
    const late = offers.find((o) => o.slices[0]!.segments[0]!.departure.local.endsWith("T21:30"));
    expect(late).toBeTruthy();
    const hour = Number(late!.slices[0]!.segments.at(-1)!.arrival.local.slice(11, 13));
    expect(hour >= 22 || hour < 5).toBe(true);
  });

  it("n'invente pas d'offres hors couverture", () => {
    expect(generateFlightOffers({ ...input, destinationAirports: ["ATH"] })).toHaveLength(0);
  });

  it("filtre et trie sans modifier les critères de recherche", () => {
    const offers = generateFlightOffers(input);
    const direct = applyFlightFilters(offers, parseFlightFilters(new URLSearchParams("escales=0&tri=prix")));
    expect(direct.every((o) => o.slices.every((s) => s.stops === 0))).toBe(true);
    for (let i = 1; i < direct.length; i++) expect(direct[i]!.price.total.amount).toBeGreaterThanOrEqual(direct[i - 1]!.price.total.amount);
    const bags = applyFlightFilters(offers, parseFlightFilters(new URLSearchParams("bagage=1")));
    expect(bags.every((o) => o.fare.checkedBags > 0)).toBe(true);
  });
});

describe("hôtels de démonstration", () => {
  it("calcule le séjour nuit par nuit et sépare payé maintenant / sur place", () => {
    const r = buildRateOffer({ h: "lis-patio-andorinha", r: "dbl", p: "flex", ci: "2027-03-27", co: "2027-03-30", rooms: [{ adults: 2, childrenAges: [] }], t: T });
    expect(r.nights).toBe(3);
    expect(r.nightly).toHaveLength(3);
    expect(r.price.payNow.amount + r.price.payOnSite.amount).toBe(r.price.total.amount);
    expect(r.price.payOnSite.amount).toBeGreaterThan(0); // taxe de séjour fictive sur place
    expect(r.cancellation.freeUntil).toEqual({ local: "2027-03-24T18:00", timeZone: "Europe/Lisbon" });
  });

  it("signale les taxes inconnues plutôt que d'afficher un total faussement complet", () => {
    const r = buildRateOffer({ h: "rek-hafnarljos", r: "dbl", p: "nonref", ci: "2027-02-10", co: "2027-02-12", rooms: [{ adults: 2, childrenAges: [] }], t: T });
    expect(r.price.taxes).toBe("unknown");
    expect(r.cancellation.refundable).toBe(false);
  });

  it("ne propose que des chambres compatibles avec l'occupation", () => {
    const hotel = demoHotelById("rom-corte-trastevere")!;
    const family = [{ adults: 2, childrenAges: [7, 4] }];
    const rates = ratesForHotel(hotel, "2027-04-01", "2027-04-05", family, T);
    expect(rates.length).toBeGreaterThan(0);
    expect(rates.every((r) => r.room.id === "quad")).toBe(true);
    expect(roomFits(hotel.rooms.find((x) => x.id === "dbl")!, family[0]!)).toBe(false);
  });
});

describe("voitures de démonstration", () => {
  it("compte les jours de location par périodes de 24 h avec tolérance", () => {
    const tz = "Europe/Lisbon";
    expect(rentalDays({ local: "2027-01-10T10:00", timeZone: tz }, { local: "2027-01-13T10:00", timeZone: tz })).toBe(3);
    expect(rentalDays({ local: "2027-01-10T10:00", timeZone: tz }, { local: "2027-01-13T10:45", timeZone: tz })).toBe(3);
    expect(rentalDays({ local: "2027-01-10T10:00", timeZone: tz }, { local: "2027-01-13T11:30", timeZone: tz })).toBe(4);
  });

  it("signale une agence fermée et propose une correction explicite sans l'appliquer", () => {
    const car = buildCarOffer({ pu: "kef-apt-dl", do: "kef-apt-dl", m: "4x4", pl: "2027-01-20T23:55", rl: "2027-01-25T10:00", age: 30, res: "FR", pre: true, t: T });
    expect(car.bookable).toBe(false);
    expect(car.suggestedPickup).toEqual({ local: "2027-01-21T06:00", timeZone: "Atlantic/Reykjavik" });
    expect(car.pickup.local).toBe("2027-01-20T23:55");
    expect(car.modelGuaranteed).toBe(false);
  });

  it("sépare dépôt de garantie, frais jeune conducteur et options non précochées", () => {
    const car = buildCarOffer({ pu: "fco-apt-dl", do: "fco-apt-dl", m: "eco", pl: "2027-01-20T10:00", rl: "2027-01-23T10:00", age: 22, res: "FR", pre: true, t: T });
    expect(car.price.deposit?.amount).toBeGreaterThan(0);
    expect(car.price.total.amount).toBe(car.price.payNow.amount + car.price.payOnSite.amount);
    expect(car.youngDriverFeePerDay?.amount).toBe(1500);
    expect(car.price.lines.some((l) => l.label.includes("jeune conducteur") && l.payable === "on_site")).toBe(true);
    const open = applyCarFilters([car], parseCarFilters(new URLSearchParams("ouvert=1")));
    expect(open).toHaveLength(1);
  });
});

describe("validation des recherches (client et serveur)", () => {
  it("refuse les dates impossibles et les combinaisons de passagers invalides", () => {
    expect(parseFlightSearch(new URLSearchParams("o=city:PAR&d=city:LIS&type=ar&dep=2027-01-10&ret=2027-01-05&adt=1")).issues[0]?.field).toBe("returnDate");
    expect(parseFlightSearch(new URLSearchParams("o=city:PAR&d=city:LIS&type=as&dep=2027-02-30&adt=1")).params).toBeNull();
    expect(parseFlightSearch(new URLSearchParams("o=city:PAR&d=city:LIS&type=as&dep=2027-01-10&adt=1&inf=2")).issues.some((i) => i.field === "infants")).toBe(true);
    expect(parseHotelSearch(new URLSearchParams("dest=city:LIS&arr=2027-01-10&dep=2027-01-10&ch=2")).issues[0]?.field).toBe("checkOut");
  });

  it("refuse une date passée ou trop lointaine", () => {
    expect(dateWindowIssues([{ field: "d", date: "2026-11-01" }], "2026-11-09")).toHaveLength(1);
    expect(dateWindowIssues([{ field: "d", date: "2028-01-01" }], "2026-11-09")).toHaveLength(1);
    expect(dateWindowIssues([{ field: "d", date: "2026-12-01" }], "2026-11-09")).toHaveLength(0);
  });
});
