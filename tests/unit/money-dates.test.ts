import { describe, expect, it } from "vitest";
import { add, formatMoney, money, multiply, parseDecimal, ratio, sum, toDecimalString } from "@/lib/money";
import { addDays, ageOn, dayShift, durationMinutes, epochDay, fromEpochDay, localToUtc, nightsBetween, utcToLocal, weekday } from "@/lib/dates";

describe("money (unités mineures, sans flottant)", () => {
  it("additionne et multiplie des entiers", () => {
    expect(add(money(1999), money(1)).amount).toBe(2000);
    expect(multiply(money(3333), 3).amount).toBe(9999);
    expect(sum([money(10), money(20), money(30)]).amount).toBe(60);
  });

  it("arrondit les ratios au plus proche (demi vers le haut)", () => {
    expect(ratio(money(1005), 50, 100).amount).toBe(503); // 502,5 -> 503
    expect(ratio(money(1000), 1, 3).amount).toBe(333);
    expect(ratio(money(-1005), 50, 100).amount).toBe(-503);
  });

  it("refuse le mélange de devises et les montants non entiers", () => {
    expect(() => add(money(100, "EUR"), money(100, "ISK"))).toThrow();
    expect(() => money(10.5)).toThrow();
  });

  it("gère les devises sans décimales (ISK, JPY)", () => {
    expect(toDecimalString(money(1500, "ISK"))).toBe("1500");
    expect(toDecimalString(money(5, "EUR"))).toBe("0.05");
    expect(parseDecimal("12,5", "EUR").amount).toBe(1250);
    expect(parseDecimal("1500", "JPY").amount).toBe(1500);
    expect(() => parseDecimal("12.345", "EUR")).toThrow();
  });

  it("formate en français sans conversion flottante", () => {
    expect(formatMoney(money(123456)).replace(/\s/g, " ")).toBe("1 234,56 €");
    expect(formatMoney(money(1500, "ISK")).replace(/\s/g, " ")).toMatch(/1 500/);
  });
});

describe("dates civiles et fuseaux", () => {
  it("compte les nuits par calendrier, y compris aux changements d'heure", () => {
    // Passage à l'heure d'été en France : 29 mars 2026 ; retour à l'heure d'hiver : 25 octobre 2026.
    expect(nightsBetween("2026-03-28", "2026-03-30")).toBe(2);
    expect(nightsBetween("2026-10-24", "2026-10-26")).toBe(2);
    expect(nightsBetween("2028-02-28", "2028-03-01")).toBe(2); // année bissextile
  });

  it("aller-retour epochDay / fromEpochDay", () => {
    for (const d of ["1970-01-01", "2000-02-29", "2026-12-31", "2100-03-01"]) expect(fromEpochDay(epochDay(d))).toBe(d);
    expect(addDays("2026-12-31", 1)).toBe("2027-01-01");
    expect(weekday("2026-11-09")).toBe(1); // lundi
  });

  it("ne décale jamais une date d'arrivée en minuit UTC", () => {
    expect(addDays("2026-06-15", 0)).toBe("2026-06-15");
  });

  it("résout une heure locale inexistante (saut de printemps) et ambiguë (automne)", () => {
    const gap = localToUtc("2026-03-29T02:30", "Europe/Paris");
    expect(gap.ambiguity).toBe("gap");
    expect(utcToLocal(gap.instantMs, "Europe/Paris")).toBe("2026-03-29T03:30");
    const overlap = localToUtc("2026-10-25T02:30", "Europe/Paris");
    expect(overlap.ambiguity).toBe("overlap");
    expect(new Date(overlap.instantMs).toISOString()).toBe("2026-10-25T00:30:00.000Z");
  });

  it("calcule la durée réelle d'un vol entre deux fuseaux et le changement de jour", () => {
    // Paris (UTC+1 en hiver) 21:30 -> Reykjavik (UTC+0) 23:55 = 3 h 25 de vol
    expect(durationMinutes({ local: "2026-12-10T21:30", timeZone: "Europe/Paris" }, { local: "2026-12-10T23:55", timeZone: "Atlantic/Reykjavik" })).toBe(205);
    expect(dayShift("2026-12-10T18:10", "2026-12-11T00:40")).toBe(1);
  });

  it("calcule l'âge révolu à une date donnée (29 février)", () => {
    expect(ageOn("2014-06-10", "2026-06-09")).toBe(11);
    expect(ageOn("2014-06-10", "2026-06-10")).toBe(12);
    expect(ageOn("2016-02-29", "2027-02-28")).toBe(10);
    expect(ageOn("2016-02-29", "2027-03-01")).toBe(11);
  });
});
