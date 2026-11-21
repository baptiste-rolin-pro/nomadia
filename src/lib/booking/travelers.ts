/**
 * Validation des voyageurs selon les exigences de l'offre.
 * L'âge est calculé à la date de chaque trajet (aller ET retour), jamais à la date de réservation.
 * Messages dans la langue de la réservation (`domain.travelers`).
 */
import { ageOn, isCivilDate } from "@/lib/dates";
import type { TravelerInput, TravelerRequirement } from "@/lib/providers/types";
import { DEFAULT_LOCALE, type Locale } from "@/i18n/config";
import { formatMessage } from "@/i18n/format";
import { getMessages } from "@/i18n/messages";

export interface TravelerIssue {
  index: number;
  field: "firstName" | "lastName" | "birthDate" | "general";
  message: string;
}

const NAME_RE = /^[\p{L}][\p{L}\p{M}' -]{0,59}$/u;

export function expectedTravelerTypes(req: TravelerRequirement): TravelerInput["type"][] {
  if (req.kind === "passengers") {
    return [...Array(req.adults).fill("adult"), ...Array(req.children).fill("child"), ...Array(req.infants).fill("infant")];
  }
  if (req.kind === "guests") return Array(req.rooms).fill("guest");
  return ["driver"];
}

export function validateTravelers(req: TravelerRequirement, travelers: TravelerInput[], locale: Locale = DEFAULT_LOCALE): TravelerIssue[] {
  const t = getMessages(locale).domain.travelers;
  const fmt = (msg: string, params: Record<string, number>) => formatMessage(locale, msg, params);
  const issues: TravelerIssue[] = [];
  const expected = expectedTravelerTypes(req);
  if (travelers.length !== expected.length) {
    return [{ index: -1, field: "general", message: fmt(t.count, { expected: expected.length, received: travelers.length }) }];
  }
  travelers.forEach((tr, index) => {
    if (tr.type !== expected[index]) issues.push({ index, field: "general", message: t.unexpectedType });
    if (!NAME_RE.test(tr.firstName.trim())) issues.push({ index, field: "firstName", message: t.firstName });
    if (!NAME_RE.test(tr.lastName.trim())) issues.push({ index, field: "lastName", message: t.lastName });
    const needsBirth = req.kind === "passengers" || req.kind === "driver";
    if (!needsBirth) return;
    if (!tr.birthDate || !isCivilDate(tr.birthDate)) {
      issues.push({ index, field: "birthDate", message: t.birthRequired });
      return;
    }
    const ageStart = ageOn(tr.birthDate, req.travelStart);
    const ageEnd = ageOn(tr.birthDate, req.travelEnd);
    if (ageStart < 0) {
      issues.push({ index, field: "birthDate", message: t.birthAfterTrip });
      return;
    }
    if (tr.type === "adult" && ageStart < 12) issues.push({ index, field: "birthDate", message: fmt(t.adultUnder12, { age: ageStart }) });
    if (tr.type === "child") {
      if (ageStart < 2) issues.push({ index, field: "birthDate", message: fmt(t.childIsInfant, { age: ageStart }) });
      else if (ageEnd > 11) issues.push({ index, field: "birthDate", message: fmt(t.childIsAdult, { age: ageEnd }) });
    }
    if (tr.type === "infant" && ageEnd >= 2) {
      issues.push({ index, field: "birthDate", message: fmt(t.infantIsChild, { age: ageEnd }) });
    }
    if (tr.type === "driver" && req.kind === "driver" && ageStart !== req.declaredAge) {
      issues.push({ index, field: "birthDate", message: fmt(t.driverAge, { age: ageStart, declared: req.declaredAge }) });
    }
  });
  if (req.kind === "passengers") {
    const adultsOk = travelers.filter((tr) => tr.type === "adult" && tr.birthDate && isCivilDate(tr.birthDate) && ageOn(tr.birthDate, req.travelStart) >= 18).length;
    if (adultsOk === 0 && issues.length === 0) issues.push({ index: -1, field: "general", message: t.adultRequired });
  }
  return issues;
}
