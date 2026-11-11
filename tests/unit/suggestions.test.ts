/**
 * Suggestions préremplies (vols, hôtels, voitures, idées de voyage) : chaque lien est une vraie recherche
 * valide, datée dans l'horizon de réservation, qui renvoie des offres en mode démonstration, quel que soit
 * le jour de l'année où la page est affichée.
 */
import { describe, expect, it } from "vitest";
import { addDays, compareCivil, nightsBetween, parseCivilDate, weekday } from "@/lib/dates";
import { getDestination } from "@/lib/content/destinations";
import { photo } from "@/lib/content/photos";
import { MAX_BOOKING_HORIZON_DAYS, dateWindowIssues, parseCarSearch, parseFlightSearch, parseHotelSearch } from "@/lib/search/params";
import { carSuggestions, flightSuggestions, homeRoutes, hotelSuggestions, nextInSeason, nextWeekday, tripIdeas, type Suggestion } from "@/lib/search/suggestions";
import { searchCars, searchFlights, searchHotels } from "@/lib/providers/registry";

// Un jour par mois environ, dont des cas limites (fin d'année, juste après une saison).
const DAYS = ["2026-11-11", "2026-12-31", "2027-01-31", "2027-02-28", "2027-03-15", "2027-04-30", "2027-05-20", "2027-06-30", "2027-07-11", "2027-08-31", "2027-10-02", "2027-12-24"];

function queryOf(s: Suggestion, path: string): URLSearchParams {
  expect(s.href.startsWith(`${path}?`), s.id).toBe(true);
  return new URLSearchParams(s.href.slice(path.length + 1));
}

function commonChecks(items: Suggestion[]) {
  expect(items.length).toBeGreaterThanOrEqual(6);
  expect(new Set(items.map((s) => s.id)).size).toBe(items.length);
  for (const s of items) {
    expect(s.href).not.toContain("#");
    expect(s.title.length).toBeGreaterThan(3);
    expect(getDestination(s.destinationSlug), s.id).toBeTruthy();
    expect(() => photo(s.photoId), s.id).not.toThrow();
  }
}

describe("calcul des dates de suggestion", () => {
  it("prochain jour de semaine : au moins le délai demandé, bon jour", () => {
    for (const t of DAYS) {
      const fri = nextWeekday(t, 5, 6);
      expect(weekday(fri)).toBe(5);
      expect(nightsBetween(t, fri)).toBeGreaterThanOrEqual(6);
      expect(nightsBetween(t, fri)).toBeLessThan(13);
    }
  });

  it("fenêtre saisonnière : départ dans la saison, à cheval sur l'année, séjour dans l'horizon", () => {
    const aurora = [[[9, 1], [4, 30]]] as const;
    expect(nextInSeason("2027-06-10", aurora, 21, 5)).toBe("2027-09-01");
    expect(nextInSeason("2026-11-11", aurora, 21, 5)).toBe("2026-12-02");
    const midnightSun = [[[5, 25], [7, 10]]] as const;
    const start = nextInSeason("2027-07-11", midnightSun, 21, 7);
    expect(start).toBe("2028-05-25");
    expect(nightsBetween("2027-07-11", start) + 7).toBeLessThanOrEqual(MAX_BOOKING_HORIZON_DAYS);
  });
});

describe("suggestions de vols", () => {
  it("recherches valides, dans l'horizon, avec des offres de démonstration", async () => {
    for (const t of DAYS) {
      const items = flightSuggestions(t);
      commonChecks(items);
      for (const s of items) {
        const { params, issues } = parseFlightSearch(queryOf(s, "/vols"));
        expect(issues, `${t} ${s.id}`).toEqual([]);
        const dates = [{ field: "departDate", date: params!.departDate }];
        if (params!.returnDate) dates.push({ field: "returnDate", date: params!.returnDate });
        expect(dateWindowIssues(dates, t), `${t} ${s.id}`).toEqual([]);
        const { offers } = await searchFlights(params!);
        expect(offers.length, `${t} ${s.id}`).toBeGreaterThan(0);
      }
    }
  });
});

describe("suggestions d'hébergements", () => {
  it("recherches valides, dans l'horizon, avec au moins un établissement compatible", async () => {
    for (const t of DAYS) {
      const items = hotelSuggestions(t);
      commonChecks(items);
      for (const s of items) {
        const { params, issues } = parseHotelSearch(queryOf(s, "/hotels"));
        expect(issues, `${t} ${s.id}`).toEqual([]);
        expect(dateWindowIssues([{ field: "checkIn", date: params!.checkIn }, { field: "checkOut", date: params!.checkOut }], t), `${t} ${s.id}`).toEqual([]);
        const { results } = await searchHotels(params!);
        expect(results.length, `${t} ${s.id}`).toBeGreaterThan(0);
      }
    }
  });
});

describe("suggestions de voitures", () => {
  it("recherches valides, dans l'horizon, avec des offres réservables", async () => {
    for (const t of DAYS) {
      const items = carSuggestions(t);
      commonChecks(items);
      for (const s of items) {
        const { params, issues } = parseCarSearch(queryOf(s, "/voitures"));
        expect(issues, `${t} ${s.id}`).toEqual([]);
        expect(dateWindowIssues([{ field: "pickupDate", date: params!.pickupDate }, { field: "dropoffDate", date: params!.dropoffDate }], t), `${t} ${s.id}`).toEqual([]);
        const { offers } = await searchCars(params!);
        expect(offers.length, `${t} ${s.id}`).toBeGreaterThan(0);
      }
    }
  });
});

describe("idées de voyage", () => {
  it("préremplissent le formulaire avec une destination existante, des dates futures et des voyageurs valides", () => {
    for (const t of DAYS) {
      const ideas = tripIdeas(t);
      commonChecks(ideas);
      for (let i = 1; i < ideas.length; i++) expect(compareCivil(ideas[i - 1]!.start, ideas[i]!.start)).toBeLessThanOrEqual(0);
      for (const idea of ideas) {
        const q = queryOf(idea, "/voyage/nouveau");
        expect(q.get("destination")).toBe(idea.destinationSlug);
        expect(q.get("debut")).toBe(idea.start);
        expect(q.get("fin")).toBe(idea.end);
        expect(q.get("idee")).toBe(idea.id);
        expect(compareCivil(idea.start, t)).toBeGreaterThan(0);
        expect(compareCivil(idea.end, idea.start)).toBeGreaterThanOrEqual(0);
        expect(nightsBetween(t, idea.end)).toBeLessThanOrEqual(MAX_BOOKING_HORIZON_DAYS);
        expect(idea.adults).toBeGreaterThanOrEqual(1);
      }
    }
  });

  it("respectent les saisons des fiches (aurores, soleil de minuit, randonnée)", () => {
    for (const t of DAYS) {
      const byId = Object.fromEntries(tripIdeas(t).map((i) => [i.id, i]));
      const month = (d: string) => parseCivilDate(d)!.month;
      expect([9, 10, 11, 12, 1, 2, 3, 4]).toContain(month(byId["voyage-islande-aurores"]!.start));
      expect([5, 6, 7]).toContain(month(byId["voyage-lofoten-soleil-minuit"]!.start));
      expect([6, 7, 8, 9]).toContain(month(byId["voyage-dolomites-randonnee"]!.start));
      expect([3, 4, 11]).toContain(month(byId["voyage-kyoto-saison"]!.start));
    }
  });
});

describe("itinéraires de l'accueil", () => {
  it("vols, hôtels et voiture aux mêmes dates, chacun avec des offres", async () => {
    const t = DAYS[0]!;
    const routes = homeRoutes(t);
    expect(routes.map((r) => r.slug)).toEqual(["lisbonne", "rome", "reykjavik"]);
    for (const r of routes) {
      const f = parseFlightSearch(new URLSearchParams(r.flightHref.split("?")[1]));
      const h = parseHotelSearch(new URLSearchParams(r.hotelHref.split("?")[1]));
      const c = parseCarSearch(new URLSearchParams(r.carHref.split("?")[1]));
      expect([f.issues, h.issues, c.issues]).toEqual([[], [], []]);
      expect(h.params!.checkIn).toBe(f.params!.departDate);
      expect(c.params!.dropoffDate).toBe(f.params!.returnDate);
      expect((await searchFlights(f.params!)).offers.length).toBeGreaterThan(0);
      expect((await searchHotels(h.params!)).results.length).toBeGreaterThan(0);
      expect((await searchCars(c.params!)).offers.length).toBeGreaterThan(0);
    }
    expect(addDays(t, 28) <= routes[0]!.flightHref.split("dep=")[1]!.slice(0, 10)).toBe(true);
  });
});
