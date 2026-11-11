/**
 * Dates civiles (AAAA-MM-JJ) et heures locales avec fuseau IANA.
 * - Une date de séjour reste une date civile : jamais convertie en minuit UTC.
 * - Les nuits sont comptées par calendrier (numéro de jour civil), pas en divisant des millisecondes.
 * - Une heure locale (« 2026-03-29T02:30 ») est associée à un fuseau ; l'instant UTC est dérivé
 *   uniquement lorsque c'est nécessaire (durées, comparaisons entre fuseaux).
 */

export type CivilDate = string; // AAAA-MM-JJ
export type LocalDateTime = string; // AAAA-MM-JJTHH:mm

const CIVIL_RE = /^(\d{4})-(\d{2})-(\d{2})$/;
const LOCAL_RE = /^(\d{4})-(\d{2})-(\d{2})T(\d{2}):(\d{2})$/;
const TIME_RE = /^([01]\d|2[0-3]):([0-5]\d)$/;

export interface CivilParts {
  year: number;
  month: number;
  day: number;
}

function daysInMonth(year: number, month: number): number {
  return [31, isLeap(year) ? 29 : 28, 31, 30, 31, 30, 31, 31, 30, 31, 30, 31][month - 1] ?? 0;
}

function isLeap(year: number): boolean {
  return (year % 4 === 0 && year % 100 !== 0) || year % 400 === 0;
}

export function parseCivilDate(value: string): CivilParts | null {
  const m = CIVIL_RE.exec(value);
  if (!m) return null;
  const year = Number(m[1]);
  const month = Number(m[2]);
  const day = Number(m[3]);
  if (month < 1 || month > 12) return null;
  if (day < 1 || day > daysInMonth(year, month)) return null;
  return { year, month, day };
}

export function isCivilDate(value: unknown): value is CivilDate {
  return typeof value === "string" && parseCivilDate(value) !== null;
}

export function isTime(value: unknown): value is string {
  return typeof value === "string" && TIME_RE.test(value);
}

/** Nombre de jours depuis 1970-01-01 (algorithme « days from civil », arithmétique entière). */
export function epochDay(date: CivilDate): number {
  const p = parseCivilDate(date);
  if (!p) throw new Error(`Date civile invalide : ${date}`);
  const y = p.month <= 2 ? p.year - 1 : p.year;
  const era = Math.floor(y / 400);
  const yoe = y - era * 400;
  const mp = (p.month + 9) % 12;
  const doy = Math.floor((153 * mp + 2) / 5) + p.day - 1;
  const doe = yoe * 365 + Math.floor(yoe / 4) - Math.floor(yoe / 100) + doy;
  return era * 146097 + doe - 719468;
}

export function fromEpochDay(days: number): CivilDate {
  const z = days + 719468;
  const era = Math.floor(z / 146097);
  const doe = z - era * 146097;
  const yoe = Math.floor((doe - Math.floor(doe / 1460) + Math.floor(doe / 36524) - Math.floor(doe / 146096)) / 365);
  const y = yoe + era * 400;
  const doy = doe - (365 * yoe + Math.floor(yoe / 4) - Math.floor(yoe / 100));
  const mp = Math.floor((5 * doy + 2) / 153);
  const d = doy - Math.floor((153 * mp + 2) / 5) + 1;
  const m = mp < 10 ? mp + 3 : mp - 9;
  const year = m <= 2 ? y + 1 : y;
  return `${String(year).padStart(4, "0")}-${String(m).padStart(2, "0")}-${String(d).padStart(2, "0")}`;
}

export function addDays(date: CivilDate, days: number): CivilDate {
  return fromEpochDay(epochDay(date) + days);
}

/** Nombre de nuits entre deux dates civiles (indépendant des changements d'heure). */
export function nightsBetween(checkIn: CivilDate, checkOut: CivilDate): number {
  return epochDay(checkOut) - epochDay(checkIn);
}

export function compareCivil(a: CivilDate, b: CivilDate): number {
  return epochDay(a) - epochDay(b);
}

/** Jour de la semaine (0 = dimanche … 6 = samedi) d'une date civile. */
export function weekday(date: CivilDate): number {
  return (((epochDay(date) + 4) % 7) + 7) % 7;
}

export function eachNight(checkIn: CivilDate, checkOut: CivilDate): CivilDate[] {
  const n = nightsBetween(checkIn, checkOut);
  return Array.from({ length: Math.max(0, n) }, (_, i) => addDays(checkIn, i));
}

/** Âge révolu à une date donnée (anniversaire du 29 février traité au 1er mars les années non bissextiles). */
export function ageOn(birthDate: CivilDate, onDate: CivilDate): number {
  const b = parseCivilDate(birthDate);
  const o = parseCivilDate(onDate);
  if (!b || !o) throw new Error("Date invalide");
  let age = o.year - b.year;
  const birthdayPassed = o.month > b.month || (o.month === b.month && o.day >= b.day);
  if (!birthdayPassed) age -= 1;
  return age;
}

// ---------------------------------------------------------------------------
// Fuseaux horaires IANA
// ---------------------------------------------------------------------------

const dtfCache = new Map<string, Intl.DateTimeFormat>();

function partsFormatter(timeZone: string): Intl.DateTimeFormat {
  let f = dtfCache.get(timeZone);
  if (!f) {
    f = new Intl.DateTimeFormat("en-US", {
      timeZone,
      hourCycle: "h23",
      year: "numeric",
      month: "2-digit",
      day: "2-digit",
      hour: "2-digit",
      minute: "2-digit",
      second: "2-digit",
    });
    dtfCache.set(timeZone, f);
  }
  return f;
}

export function isValidTimeZone(timeZone: string): boolean {
  try {
    partsFormatter(timeZone);
    return true;
  } catch {
    return false;
  }
}

/** Heure locale (AAAA-MM-JJTHH:mm) d'un instant UTC dans un fuseau. */
export function utcToLocal(instantMs: number, timeZone: string): LocalDateTime {
  const parts = partsFormatter(timeZone).formatToParts(new Date(instantMs));
  const get = (type: string) => parts.find((p) => p.type === type)?.value ?? "00";
  return `${get("year")}-${get("month")}-${get("day")}T${get("hour")}:${get("minute")}`;
}

/** Décalage (ms) du fuseau par rapport à UTC à un instant donné. */
export function offsetMs(instantMs: number, timeZone: string): number {
  const parts = partsFormatter(timeZone).formatToParts(new Date(instantMs));
  const get = (type: string) => Number(parts.find((p) => p.type === type)?.value ?? "0");
  const asUtc = Date.UTC(get("year"), get("month") - 1, get("day"), get("hour"), get("minute"), get("second"));
  const truncated = Math.floor(instantMs / 1000) * 1000;
  return asUtc - truncated;
}

export interface ZonedResolution {
  instantMs: number;
  /** « gap » : l'heure locale n'existe pas (passage à l'heure d'été) ; « overlap » : elle existe deux fois. */
  ambiguity: "none" | "gap" | "overlap";
}

/**
 * Convertit une heure locale + fuseau en instant UTC.
 * - Heure inexistante (saut de printemps) : décalée vers l'avant de la durée du saut, signalée « gap ».
 * - Heure ambiguë (retour à l'heure d'hiver) : première occurrence retenue, signalée « overlap ».
 */
export function localToUtc(local: LocalDateTime, timeZone: string): ZonedResolution {
  const m = LOCAL_RE.exec(local);
  if (!m) throw new Error(`Heure locale invalide : ${local}`);
  const naive = Date.UTC(Number(m[1]), Number(m[2]) - 1, Number(m[3]), Number(m[4]), Number(m[5]));
  const offsetBefore = offsetMs(naive - 36 * 3600_000, timeZone);
  const offsetAfter = offsetMs(naive + 36 * 3600_000, timeZone);
  const candidates = [...new Set([offsetBefore, offsetAfter, offsetMs(naive, timeZone)])]
    .map((off) => naive - off)
    .filter((instant) => utcToLocal(instant, timeZone) === local)
    .sort((a, b) => a - b);
  if (candidates.length === 0) {
    // Heure inexistante : on applique le décalage d'avant le saut.
    return { instantMs: naive - offsetBefore, ambiguity: "gap" };
  }
  return { instantMs: candidates[0]!, ambiguity: candidates.length > 1 ? "overlap" : "none" };
}

export function civilDateOf(local: LocalDateTime): CivilDate {
  return local.slice(0, 10);
}

export function timeOf(local: LocalDateTime): string {
  return local.slice(11, 16);
}

export function isLocalDateTime(value: unknown): value is LocalDateTime {
  if (typeof value !== "string") return false;
  const m = LOCAL_RE.exec(value);
  return !!m && isCivilDate(value.slice(0, 10)) && isTime(value.slice(11, 16));
}

/** Durée en minutes entre deux heures locales situées dans des fuseaux éventuellement différents. */
export function durationMinutes(
  from: { local: LocalDateTime; timeZone: string },
  to: { local: LocalDateTime; timeZone: string },
): number {
  const a = localToUtc(from.local, from.timeZone).instantMs;
  const b = localToUtc(to.local, to.timeZone).instantMs;
  return Math.round((b - a) / 60000);
}

export function addMinutesInZone(local: LocalDateTime, timeZone: string, minutes: number, targetZone = timeZone): LocalDateTime {
  const start = localToUtc(local, timeZone).instantMs;
  return utcToLocal(start + minutes * 60000, targetZone);
}

export function formatDuration(minutes: number): string {
  const h = Math.floor(minutes / 60);
  const m = minutes % 60;
  if (h === 0) return `${m} min`;
  return m === 0 ? `${h} h` : `${h} h ${String(m).padStart(2, "0")}`;
}

const civilFormatters = new Map<string, Intl.DateTimeFormat>();

/** Formate une date civile en français sans décalage de fuseau. */
export function formatCivilDate(date: CivilDate, style: "long" | "short" | "weekday" = "long"): string {
  const p = parseCivilDate(date);
  if (!p) return date;
  const key = style;
  let f = civilFormatters.get(key);
  if (!f) {
    const options: Intl.DateTimeFormatOptions =
      style === "long"
        ? { weekday: "long", day: "numeric", month: "long", year: "numeric", timeZone: "UTC" }
        : style === "weekday"
          ? { weekday: "short", day: "numeric", month: "short", timeZone: "UTC" }
          : { day: "numeric", month: "short", timeZone: "UTC" };
    f = new Intl.DateTimeFormat("fr-FR", options);
    civilFormatters.set(key, f);
  }
  return f.format(new Date(Date.UTC(p.year, p.month - 1, p.day, 12)));
}

export function formatLocalTime(local: LocalDateTime): string {
  return timeOf(local).replace(":", " h ");
}

/** Nombre de jours civils entre deux heures locales (affichage « +1 » d'un vol arrivant le lendemain). */
export function dayShift(fromLocal: LocalDateTime, toLocal: LocalDateTime): number {
  return epochDay(civilDateOf(toLocal)) - epochDay(civilDateOf(fromLocal));
}
