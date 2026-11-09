import { utcToLocal, civilDateOf, type CivilDate } from "@/lib/dates";

/**
 * Horloge applicative. En test, NOMADIA_FIXED_NOW (ISO 8601) fige l'instant courant
 * afin que les jeux de démonstration restent déterministes et toujours dans le futur.
 */
export function nowMs(): number {
  const fixed = process.env.NOMADIA_FIXED_NOW;
  if (fixed) {
    const t = Date.parse(fixed);
    if (!Number.isNaN(t)) return t;
  }
  return Date.now();
}

export function now(): Date {
  return new Date(nowMs());
}

/** Date civile du jour dans un fuseau (Paris par défaut, marché initial). */
export function today(timeZone = "Europe/Paris"): CivilDate {
  return civilDateOf(utcToLocal(nowMs(), timeZone));
}
