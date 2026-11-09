/**
 * Validation des voyageurs selon les exigences de l'offre.
 * L'âge est calculé à la date de chaque trajet (aller ET retour), jamais à la date de réservation.
 */
import { ageOn, isCivilDate } from "@/lib/dates";
import type { TravelerInput, TravelerRequirement } from "@/lib/providers/types";

export interface TravelerIssue {
  index: number;
  field: "firstName" | "lastName" | "birthDate" | "general";
  message: string;
}

const NAME_RE = /^[\p{L}][\p{L}' -]{0,59}$/u;

export function expectedTravelerTypes(req: TravelerRequirement): TravelerInput["type"][] {
  if (req.kind === "passengers") {
    return [...Array(req.adults).fill("adult"), ...Array(req.children).fill("child"), ...Array(req.infants).fill("infant")];
  }
  if (req.kind === "guests") return Array(req.rooms).fill("guest");
  return ["driver"];
}

export function validateTravelers(req: TravelerRequirement, travelers: TravelerInput[]): TravelerIssue[] {
  const issues: TravelerIssue[] = [];
  const expected = expectedTravelerTypes(req);
  if (travelers.length !== expected.length) {
    return [{ index: -1, field: "general", message: `${expected.length} voyageur(s) attendu(s), ${travelers.length} reçu(s).` }];
  }
  travelers.forEach((t, index) => {
    if (t.type !== expected[index]) issues.push({ index, field: "general", message: "Type de voyageur inattendu." });
    if (!NAME_RE.test(t.firstName.trim())) issues.push({ index, field: "firstName", message: "Prénom requis, tel qu'il figure sur la pièce d'identité." });
    if (!NAME_RE.test(t.lastName.trim())) issues.push({ index, field: "lastName", message: "Nom requis, tel qu'il figure sur la pièce d'identité." });
    const needsBirth = req.kind === "passengers" || req.kind === "driver";
    if (!needsBirth) return;
    if (!t.birthDate || !isCivilDate(t.birthDate)) {
      issues.push({ index, field: "birthDate", message: "Date de naissance requise (JJ/MM/AAAA)." });
      return;
    }
    const ageStart = ageOn(t.birthDate, req.travelStart);
    const ageEnd = ageOn(t.birthDate, req.travelEnd);
    if (ageStart < 0) {
      issues.push({ index, field: "birthDate", message: "La date de naissance est postérieure au voyage." });
      return;
    }
    if (t.type === "adult" && ageStart < 12) issues.push({ index, field: "birthDate", message: `Ce passager aura ${ageStart} ans au départ : il doit être enregistré comme enfant. Relancez la recherche avec la bonne répartition.` });
    if (t.type === "child") {
      if (ageStart < 2) issues.push({ index, field: "birthDate", message: `Cet enfant aura ${ageStart} an(s) au départ : il relève de la catégorie bébé. Relancez la recherche.` });
      else if (ageEnd > 11) issues.push({ index, field: "birthDate", message: `Cet enfant aura ${ageEnd} ans au moment du retour : le tarif adulte s'applique sur ce trajet. Relancez la recherche avec un adulte supplémentaire.` });
    }
    if (t.type === "infant" && ageEnd >= 2) {
      issues.push({ index, field: "birthDate", message: `Ce bébé aura ${ageEnd} ans au moment du retour : un siège enfant est obligatoire sur ce trajet. Relancez la recherche avec un enfant au lieu d'un bébé.` });
    }
    if (t.type === "driver" && req.kind === "driver" && ageStart !== req.declaredAge) {
      issues.push({ index, field: "birthDate", message: `Le conducteur aura ${ageStart} ans à la prise en charge, alors que la recherche indiquait ${req.declaredAge} ans. Le tarif peut différer : relancez la recherche avec l'âge exact.` });
    }
  });
  if (req.kind === "passengers") {
    const adultsOk = travelers.filter((t) => t.type === "adult" && t.birthDate && isCivilDate(t.birthDate) && ageOn(t.birthDate, req.travelStart) >= 18).length;
    if (adultsOk === 0 && issues.length === 0) issues.push({ index: -1, field: "general", message: "Au moins un passager doit avoir 18 ans ou plus au départ (règle de démonstration ; les conditions varient selon les compagnies)." });
  }
  return issues;
}
