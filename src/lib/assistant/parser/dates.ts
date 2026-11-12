/**
 * Dates, durées et heures en français, relatives à aujourd'hui (date civile Europe/Paris fournie par
 * l'appelant : src/lib/clock.ts). Tout se calcule en dates civiles (src/lib/dates.ts) : aucun passage par
 * minuit UTC, donc aucun décalage au changement d'heure. Toute date choisie par défaut est rendue comme
 * hypothèse ; une date impossible (« 31 juin ») est signalée, jamais corrigée en silence.
 */
import { addDays, compareCivil, formatCivilDate, isCivilDate, parseCivilDate, weekday, type CivilDate } from "@/lib/dates";
import { editDistance } from "@/lib/assistant/parser/fuzzy";
import type { Token } from "@/lib/assistant/parser/text";
import { UNIT_WORDS } from "@/lib/assistant/parser/vocabulary";

const MONTHS = ["janvier", "fevrier", "mars", "avril", "mai", "juin", "juillet", "aout", "septembre", "octobre", "novembre", "decembre"];
const MONTH_LABELS = ["janvier", "février", "mars", "avril", "mai", "juin", "juillet", "août", "septembre", "octobre", "novembre", "décembre"];
const MONTH_ABBR: Record<string, number> = { janv: 1, fev: 2, fevr: 2, avr: 4, juil: 7, sept: 9, sep: 9, oct: 10, nov: 11, dec: 12 };
const WEEKDAYS: Record<string, number> = { dimanche: 0, lundi: 1, mardi: 2, mercredi: 3, jeudi: 4, vendredi: 5, samedi: 6 };
const MAX_DAYS = [31, 29, 31, 30, 31, 30, 31, 31, 30, 31, 30, 31];

type Role = "start" | "end" | null;

export type DateAtom =
  | { kind: "abs"; d: number; m: number | null; y: number | null; role: Role; label: string }
  | { kind: "rel"; date: CivilDate; role: Role; label: string }
  | { kind: "wd"; wd: number; strict: boolean; role: Role; label: string };

export interface Period {
  kind: "month" | "week";
  from: CivilDate;
  to: CivilDate;
  part: "debut" | "mi" | "fin" | null;
  label: string;
}

export interface Duration {
  /** Nuits entre le premier et le dernier jour (« 5 jours » = 4, « 3 nuits » = 3, « une semaine » = 7). */
  nights: number;
  label: string;
  /** « un week-end » : du vendredi au dimanche. */
  weekend: boolean;
}

export interface DateFacts {
  atoms: DateAtom[];
  period: Period | null;
  /** « ce week-end », « le week-end prochain ». */
  weekend: { start: CivilDate; end: CivilDate; label: string } | null;
  duration: Duration | null;
  times: { pickup: string | null; dropoff: string | null; notes: string[] };
  /** Date impossible citée (« 31 juin »). */
  invalid: string | null;
  /** Le segment contient au moins une indication de date, de période, de durée ou d'heure. */
  any: boolean;
}

export const day = (d: CivilDate) => formatCivilDate(d, "weekday");
const iso = (y: number, m: number, d: number) => `${String(y).padStart(4, "0")}-${String(m).padStart(2, "0")}-${String(d).padStart(2, "0")}`;
const lastDay = (y: number, m: number) => (m === 2 ? (isCivilDate(iso(y, 2, 29)) ? 29 : 28) : MAX_DAYS[m - 1]!);

function addMonths(date: CivilDate, n: number): CivilDate {
  const p = parseCivilDate(date)!;
  const index = p.year * 12 + (p.month - 1) + n;
  const y = Math.floor(index / 12);
  const m = (index % 12) + 1;
  return iso(y, m, Math.min(p.day, lastDay(y, m)));
}

function monthAt(tokens: Token[], i: number, allowAbbr: boolean): number | null {
  const t = tokens[i]?.t;
  if (!t) return null;
  const full = MONTHS.indexOf(t);
  if (full >= 0) return full + 1;
  if (allowAbbr && t in MONTH_ABBR) return MONTH_ABBR[t]!;
  if (t.length >= 5 && /^[a-z]+$/.test(t)) {
    for (let k = 0; k < 12; k++) {
      const name = MONTHS[k]!;
      if (name.length >= 5 && name[0] === t[0] && editDistance(t, name, 1) === 1) return k + 1;
    }
  }
  return null;
}

/** Jour du mois : chiffres (« 12 », « 1er ») ou « premier ». */
function dayAt(tokens: Token[], i: number, allowWords: boolean): number | null {
  const tok = tokens[i];
  if (!tok || tok.n === null || tok.n < 1 || tok.n > 31) return null;
  if (tok.numWord && !allowWords) return null;
  if (!tok.numWord && !/^\d{1,2}(?:er|ere|e|eme)?$/.test(tok.t)) return null;
  return tok.n;
}

function yearAt(tokens: Token[], i: number): number | null {
  const t = tokens[i]?.t ?? "";
  if (/^20\d\d$/.test(t)) return Number(t);
  return null;
}

const END_MARKERS = new Set(["retour", "rentre", "rentrer", "rentrons", "revenir", "reviens", "jusqu", "jusquau", "fin", "rendre", "rendue", "restitution"]);
const START_MARKERS = new Set(["du", "des", "partir", "aller", "depart", "arrivee", "debut"]);
const DROPOFF_MARKERS = new Set(["retour", "rendre", "rendue", "rendu", "rends", "restitution", "restituer", "deposer", "depot", "jusqu", "jusquau"]);

function clauseBreak(norm: string, a: Token, b: Token): boolean {
  return /[.;!?\n]/.test(norm.slice(a.end, b.start));
}

/** Rôle d'une date selon les mots qui la précèdent (« retour le 16 », « jusqu'au 3 », « du 12 »). */
function roleBefore(norm: string, tokens: Token[], i: number): Role {
  if (tokens[i - 1]?.t === "au" || tokens[i - 1]?.t === "jusquau") return "end";
  for (let k = i - 1; k >= Math.max(0, i - 3); k--) {
    if (k < i - 1 && clauseBreak(norm, tokens[k]!, tokens[k + 1]!)) break;
    const t = tokens[k]!.t;
    if (END_MARKERS.has(t)) return "end";
    if (START_MARKERS.has(t)) return "start";
  }
  return null;
}

function roundTime(h: number, m: number): { time: string; rounded: boolean } {
  let hh = h;
  let mm = m < 15 ? 0 : m < 45 ? 30 : 60;
  if (mm === 60) {
    if (hh === 23) mm = 30;
    else {
      hh += 1;
      mm = 0;
    }
  }
  return { time: `${String(hh).padStart(2, "0")}:${mm ? "30" : "00"}`, rounded: mm !== m || hh !== h };
}

function startOfWeek(date: CivilDate): CivilDate {
  return addDays(date, -((weekday(date) + 6) % 7));
}

function monthPeriod(m: number, y: number | null, part: Period["part"], today: CivilDate): Period {
  const t = parseCivilDate(today)!;
  const build = (year: number): Period => {
    const end = lastDay(year, m);
    const [a, b] = part === "debut" ? [1, 10] : part === "mi" ? [11, 20] : part === "fin" ? [21, end] : [1, end];
    const prefix = part === "debut" ? "début " : part === "mi" ? "mi-" : part === "fin" ? "fin " : "";
    return { kind: "month", from: iso(year, m, a), to: iso(year, m, b), part, label: `${prefix}${MONTH_LABELS[m - 1]}${y ? ` ${year}` : ""}` };
  };
  if (y) return build(y);
  const current = build(t.year);
  return compareCivil(current.to, addDays(today, 1)) < 0 ? build(t.year + 1) : current;
}

/**
 * Extraction des dates d'un segment de texte ; les jetons utilisés sont marqués. `firstRole` : rôle d'une date
 * sans indice (« le 9 ») — la fin quand le segment répond à « Quand rendrez-vous la voiture ? ».
 */
export function extractDates(norm: string, tokens: Token[], used: boolean[], today: CivilDate, firstRole: "start" | "end" = "start"): DateFacts {
  const facts: DateFacts = { atoms: [], period: null, weekend: null, duration: null, times: { pickup: null, dropoff: null, notes: [] }, invalid: null, any: false };
  const t = (i: number) => tokens[i]?.t ?? "";
  const gap = (i: number) => (tokens[i] && tokens[i + 1] ? norm.slice(tokens[i]!.end, tokens[i + 1]!.start) : "");
  const take = (from: number, to: number) => {
    for (let k = from; k <= to; k++) used[k] = true;
    facts.any = true;
  };
  const free = (i: number) => !!tokens[i] && !used[i];
  const checkDay = (d: number, m: number, label: string) => {
    if (d > MAX_DAYS[m - 1]!) facts.invalid ??= label;
  };

  // 1. Heures (location de voiture) : « 10h », « 10h30 », « 10 h 30 », « 10:30 », « midi ».
  for (let i = 0; i < tokens.length; i++) {
    if (!free(i)) continue;
    let h: number | null = null;
    let m = 0;
    let last = i;
    const compact = /^(\d{1,2})h(\d{2})?$/.exec(t(i));
    if (compact) {
      h = Number(compact[1]);
      m = compact[2] ? Number(compact[2]) : 0;
    } else if (/^\d{1,2}$/.test(t(i)) && (t(i + 1) === "h" || ((t(i + 1) === "heures" || t(i + 1) === "heure") && ["a", "vers", "de"].includes(t(i - 1))))) {
      h = Number(t(i));
      last = i + 1;
      if (t(i + 1) === "h" && /^\d{2}$/.test(t(i + 2)) && /^\s*$/.test(gap(i + 1))) {
        m = Number(t(i + 2));
        last = i + 2;
      }
    } else if (/^\d{1,2}$/.test(t(i)) && gap(i).trim() === ":" && /^\d{2}$/.test(t(i + 1))) {
      h = Number(t(i));
      m = Number(t(i + 1));
      last = i + 1;
    } else if (t(i) === "midi" || t(i) === "minuit") {
      h = t(i) === "midi" ? 12 : 0;
    }
    if (h === null || h > 23 || m > 59) continue;
    const r = roundTime(h, m);
    let dropoff = facts.times.pickup !== null;
    for (let k = i - 1; k >= Math.max(0, i - 4); k--) if (DROPOFF_MARKERS.has(t(k))) dropoff = true;
    if (dropoff && facts.times.dropoff === null) facts.times.dropoff = r.time;
    else if (!dropoff && facts.times.pickup === null) facts.times.pickup = r.time;
    else continue;
    if (r.rounded) facts.times.notes.push(`Heure arrondie à ${r.time.replace(":", " h ")} (créneaux de 30 minutes)`);
    take(i, last);
    i = last;
  }

  // 2. Dates, périodes, durées.
  for (let i = 0; i < tokens.length; i++) {
    if (!free(i)) continue;
    const w = t(i);

    // Relatif : aujourd'hui, demain, après-demain, hier.
    const relDays: Record<string, number> = { aujourdhui: 0, demain: 1, apresdemain: 2, hier: -1, avanthier: -2 };
    if (w in relDays) {
      facts.atoms.push({ kind: "rel", date: addDays(today, relDays[w]!), role: roleBefore(norm, tokens, i), label: tokens[i]!.raw });
      take(i, i);
      continue;
    }
    if ((w === "soir" || w === "nuit") && (t(i - 1) === "ce" || t(i - 1) === "cette")) {
      facts.atoms.push({ kind: "rel", date: today, role: null, label: "ce soir" });
      take(i - 1, i);
      continue;
    }
    // « dans 2 semaines », « dans 10 jours », « dans un mois ».
    if (w === "dans" && tokens[i + 1]?.n != null && ["jour", "jours", "semaine", "semaines", "mois"].includes(t(i + 2))) {
      const n = tokens[i + 1]!.n!;
      const unit = t(i + 2);
      const date = unit.startsWith("mois") ? addMonths(today, n) : addDays(today, unit.startsWith("jour") ? n : 7 * n);
      facts.atoms.push({ kind: "rel", date, role: roleBefore(norm, tokens, i), label: `dans ${n} ${unit}` });
      take(i, i + 2);
      continue;
    }
    // Week-ends.
    if (w === "weekend") {
      const thisOne = ["ce", "cet"].includes(t(i - 1)) || t(i + 1) === "ci";
      const next = t(i + 1) === "prochain" || t(i - 1) === "prochain";
      if (thisOne || next) {
        // Un week-end va du vendredi au dimanche ; le dimanche, « ce week-end » désigne le suivant.
        const wd = weekday(today);
        const thisFriday = addDays(today, wd === 6 ? -1 : wd === 0 ? -2 : 5 - wd);
        const friday = next || wd === 0 ? addDays(thisFriday, 7) : thisFriday;
        const start = compareCivil(friday, today) < 0 ? today : friday;
        facts.weekend = { start, end: addDays(friday, 2), label: thisOne ? "Ce week-end" : "Le week-end prochain" };
        take(["ce", "cet", "prochain"].includes(t(i - 1)) ? i - 1 : i, ["ci", "prochain"].includes(t(i + 1)) ? i + 1 : i);
      } else {
        facts.duration ??= { nights: 2, label: "un week-end", weekend: true };
        take(i, i);
      }
      continue;
    }
    // Semaines : « la semaine prochaine », « cette semaine ».
    if ((w === "semaine" && (t(i + 1) === "prochaine" || t(i - 1) === "prochaine")) || (w === "semaine" && t(i - 1) === "cette")) {
      const nextWeek = t(i - 1) !== "cette";
      const monday = nextWeek ? addDays(startOfWeek(today), 7) : today;
      const sunday = nextWeek ? addDays(monday, 6) : addDays(startOfWeek(today), 6);
      facts.period ??= { kind: "week", from: monday, to: sunday, part: null, label: nextWeek ? "la semaine prochaine" : "cette semaine" };
      take(t(i - 1) === "prochaine" || t(i - 1) === "cette" ? i - 1 : i, t(i + 1) === "prochaine" ? i + 1 : i);
      continue;
    }
    if (w === "mois" && (t(i + 1) === "prochain" || t(i - 1) === "prochain")) {
      const p = parseCivilDate(addMonths(today, 1))!;
      facts.period ??= monthPeriod(p.month, p.year, null, today);
      take(t(i - 1) === "prochain" ? i - 1 : i, t(i + 1) === "prochain" ? i + 1 : i);
      continue;
    }
    // Jours de la semaine : « vendredi », « ce vendredi », « vendredi prochain » ; « vendredi 12 juin » = la date.
    if (w in WEEKDAYS) {
      if (dayAt(tokens, i + 1, true) !== null) {
        take(i, i);
        continue;
      }
      const next = t(i + 1) === "prochain";
      facts.atoms.push({ kind: "wd", wd: WEEKDAYS[w]!, strict: t(i - 1) !== "ce", role: roleBefore(norm, tokens, i), label: next ? `${tokens[i]!.raw} prochain` : "" });
      take(i, next ? i + 1 : i);
      continue;
    }

    // Date numérique : « 12/06 », « 12/06/2027 », « 12.06.27 ».
    const d0 = dayAt(tokens, i, false);
    if (d0 !== null && /^\s*[/.]\s*$/.test(gap(i)) && /^\d{1,2}$/.test(t(i + 1)) && Number(t(i + 1)) >= 1 && Number(t(i + 1)) <= 12) {
      const m = Number(t(i + 1));
      let y: number | null = null;
      let last = i + 1;
      if (/^\s*[/.]\s*$/.test(gap(i + 1)) && /^(\d{2}|\d{4})$/.test(t(i + 2))) {
        y = t(i + 2).length === 2 ? 2000 + Number(t(i + 2)) : Number(t(i + 2));
        last = i + 2;
      }
      checkDay(d0, m, `${d0}/${m}`);
      facts.atoms.push({ kind: "abs", d: d0, m, y, role: roleBefore(norm, tokens, i), label: `${d0}/${m}` });
      take(i, last);
      i = last;
      continue;
    }

    // Plage dans un mois : « du 12 au 16 juin », « 12-16 juin », « entre le 12 et le 16 juin ».
    const d1 = dayAt(tokens, i, true);
    if (d1 !== null) {
      const connector = ["au", "a", "et"].includes(t(i + 1)) ? 1 : /^\s*-\s*$/.test(gap(i)) ? 0 : -1;
      const j = connector === 1 ? (t(i + 2) === "le" ? i + 3 : i + 2) : i + 1;
      const d2 = connector >= 0 ? dayAt(tokens, j, true) : null;
      const m2 = d2 !== null ? monthAt(tokens, j + 1, true) : null;
      if (d2 !== null && m2 !== null && free(j) && free(j + 1)) {
        const y2 = yearAt(tokens, j + 2);
        const m1 = d1 > d2 ? (m2 === 1 ? 12 : m2 - 1) : m2;
        const y1 = y2 !== null && m1 > m2 ? y2 - 1 : y2;
        checkDay(d1, m1, `${d1} ${MONTH_LABELS[m1 - 1]}`);
        checkDay(d2, m2, `${d2} ${MONTH_LABELS[m2 - 1]}`);
        facts.atoms.push({ kind: "abs", d: d1, m: m1, y: y1, role: "start", label: `${d1} ${MONTH_LABELS[m1 - 1]}` });
        facts.atoms.push({ kind: "abs", d: d2, m: m2, y: y2, role: "end", label: `${d2} ${MONTH_LABELS[m2 - 1]}` });
        const last = y2 !== null ? j + 2 : j + 1;
        take(i, last);
        i = last;
        continue;
      }
      // Jour et mois : « le 12 juin », « 1er mars 2027 », « 3 sept ».
      const m = monthAt(tokens, i + 1, true);
      if (m !== null && free(i + 1)) {
        const y = yearAt(tokens, i + 2);
        const label = `${d1} ${MONTH_LABELS[m - 1]}`;
        checkDay(d1, m, label);
        facts.atoms.push({ kind: "abs", d: d1, m, y, role: roleBefore(norm, tokens, i), label });
        const last = y !== null ? i + 2 : i + 1;
        take(i, last);
        i = last;
        continue;
      }
    }
    // Jour seul après « le », « du », « au », « dès », « entre » : « retour le 16 », « du 12 au 16 ».
    const d3 = dayAt(tokens, i, false);
    if (d3 !== null && ["le", "du", "au", "des", "entre", "jusquau"].includes(t(i - 1)) && !UNIT_WORDS.has(t(i + 1)) && !/:/.test(gap(i))) {
      facts.atoms.push({ kind: "abs", d: d3, m: null, y: null, role: roleBefore(norm, tokens, i), label: `le ${d3}` });
      take(i, i);
      continue;
    }

    // Mois seul : « en mars », « début mars », « mi-mars », « fin mars 2027 », « la première semaine de mars ».
    const prevMonthWord = ["en", "de", "d", "debut", "mi", "milieu", "fin", "courant", "mois"].includes(t(i - 1));
    const mo = monthAt(tokens, i, prevMonthWord);
    // « un séjour de sept jours » : « sept » est un nombre, pas septembre.
    if (mo !== null && !(tokens[i]!.n !== null && UNIT_WORDS.has(t(i + 1)))) {
      let part: Period["part"] = null;
      let first = i;
      for (let k = i - 1; k >= Math.max(0, i - 4); k--) {
        const p = t(k);
        if (p === "debut" || (p === "semaine" && t(k - 1) === "premiere")) part = "debut";
        else if (p === "mi" || p === "milieu") part = "mi";
        else if (p === "fin" || (p === "semaine" && t(k - 1) === "derniere")) part = "fin";
        else if (["de", "d", "en", "au", "a", "la", "courant", "mois", "premiere", "derniere", "semaine"].includes(p)) continue;
        else break;
        first = k;
        break;
      }
      const y = yearAt(tokens, i + 1);
      facts.period ??= monthPeriod(mo, y, part, today);
      take(first, y !== null ? i + 1 : i);
      if (y !== null) i += 1;
      continue;
    }

    // Durées : « 5 jours », « 3 nuits », « une semaine », « 2 semaines », « quinze jours », « une quinzaine ».
    const n = tokens[i]!.n;
    if (n !== null && n >= 1 && n <= 90) {
      const unit = t(i + 1);
      let nights: number | null = null;
      if (unit === "jour" || unit === "jours" || unit === "j") nights = Math.max(0, n - 1);
      else if (unit === "nuit" || unit === "nuits" || unit === "nuitee" || unit === "nuitees") nights = n;
      else if (unit === "semaine" || unit === "semaines") nights = 7 * n;
      else if (unit === "mois" && n === 1) nights = 30;
      if (nights !== null && free(i + 1)) {
        facts.duration = { nights, label: `${tokens[i]!.raw} ${tokens[i + 1]!.raw}`, weekend: false };
        take(i, i + 1);
        i += 1;
        continue;
      }
    }
    if (w === "quinzaine") {
      facts.duration = { nights: 14, label: "une quinzaine", weekend: false };
      take(i, i);
    }
  }

  // Rôles par défaut : première date = début, suivante = fin (ou l'inverse pour une réponse sur le retour).
  let hasStart = facts.atoms.some((a) => a.role === "start");
  let hasEnd = facts.atoms.some((a) => a.role === "end");
  for (const a of facts.atoms) {
    if (a.role) continue;
    if (firstRole === "end" && !hasEnd) {
      a.role = "end";
      hasEnd = true;
    } else if (!hasStart) {
      a.role = "start";
      hasStart = true;
    } else if (!hasEnd) {
      a.role = "end";
      hasEnd = true;
    }
  }
  return facts;
}

// ---------------------------------------------------------------------------
// Résolution

type Resolved = { date: CivilDate; rolled: boolean } | { invalid: string };

function resolveAtom(a: DateAtom, today: CivilDate, after: CivilDate | null): Resolved {
  const ref = after ?? today;
  const r = parseCivilDate(ref)!;
  if (a.kind === "rel") return { date: a.date, rolled: false };
  if (a.kind === "wd") {
    let delta = (a.wd - weekday(ref) + 7) % 7;
    if (delta === 0 && a.strict && !after) delta = 7;
    return { date: addDays(ref, delta), rolled: false };
  }
  if (a.m !== null && a.y !== null) {
    const date = iso(a.y, a.m, a.d);
    return isCivilDate(date) ? { date, rolled: false } : { invalid: `${a.d} ${MONTH_LABELS[a.m - 1]} ${a.y}` };
  }
  if (a.m !== null) {
    for (const y of [r.year, r.year + 1]) {
      const date = iso(y, a.m, a.d);
      if (isCivilDate(date) && compareCivil(date, ref) >= 0) return { date, rolled: y > parseCivilDate(today)!.year };
    }
    return { invalid: `${a.d} ${MONTH_LABELS[a.m - 1]}` };
  }
  // Jour seul : prochaine date portant ce numéro de jour, à partir de la référence.
  for (let k = 0; k < 13; k++) {
    const index = r.year * 12 + (r.month - 1) + k;
    const date = iso(Math.floor(index / 12), (index % 12) + 1, a.d);
    if (isCivilDate(date) && compareCivil(date, ref) >= 0) return { date, rolled: false };
  }
  return { invalid: `le ${a.d}` };
}

export interface ResolvedDates {
  start: CivilDate | null;
  end: CivilDate | null;
  /** Hypothèses de dates (période choisie, mois implicite, année suivante, week-end…). */
  assumptions: string[];
  invalid: string | null;
  /** Le début vient d'une période (mois, semaine) : dates choisies par l'assistant. */
  chosen: boolean;
}

/**
 * Début et fin à partir des indices du texte. `fallbackNights` ne sert qu'à une période sans durée
 * (« en mars ») : la durée choisie est alors signalée.
 */
export function resolveDates(f: DateFacts, today: CivilDate, fallback: { nights: number; label: string }): ResolvedDates {
  const out: ResolvedDates = { start: null, end: null, assumptions: [], invalid: f.invalid, chosen: false };
  if (f.invalid) return out;
  const todayYear = parseCivilDate(today)!.year;
  let startAtom = f.atoms.find((a) => a.role === "start") ?? null;
  const endAtom = f.atoms.find((a) => a.role === "end") ?? null;
  let rolled = false;
  const take = (r: Resolved, isStart = false): CivilDate | null => {
    if ("invalid" in r) {
      out.invalid = r.invalid;
      return null;
    }
    if (isStart) rolled = r.rolled;
    return r.date;
  };

  // « le 12, retour le 16 juin » : le jour seul prend le mois de la fin.
  if (startAtom?.kind === "abs" && startAtom.m === null && endAtom?.kind === "abs" && endAtom.m !== null) {
    const m = startAtom.d > endAtom.d ? (endAtom.m === 1 ? 12 : endAtom.m - 1) : endAtom.m;
    startAtom = { ...startAtom, m, y: endAtom.y !== null && m > endAtom.m ? endAtom.y - 1 : endAtom.y };
  }

  if (startAtom) {
    out.start = take(resolveAtom(startAtom, today, null), true);
    if (out.start && startAtom.kind === "abs" && startAtom.m === null) out.assumptions.push(`« ${capitalize(startAtom.label)} » compris comme le ${day(out.start)}`);
    if (out.start && startAtom.kind === "wd" && startAtom.label) out.assumptions.push(`« ${capitalize(startAtom.label)} » compris comme le ${day(out.start)}`);
  } else if (f.weekend) {
    out.start = f.weekend.start;
    out.end = f.duration && !f.duration.weekend ? addDays(f.weekend.start, f.duration.nights) : f.weekend.end;
    out.assumptions.push(`« ${f.weekend.label} » : du ${day(out.start)} au ${day(out.end)}`);
  } else if (f.period) {
    const p = f.period;
    const tomorrow = addDays(today, 1);
    const from = compareCivil(p.from, tomorrow) < 0 ? tomorrow : p.from;
    const nights = f.duration?.nights ?? (p.kind === "week" ? 6 : fallback.nights);
    let start = from;
    let desc: string;
    if (f.duration?.weekend) {
      start = addDays(from, (5 - weekday(from) + 7) % 7);
      desc = p.kind === "week" || p.part ? `week-end de ${p.label}` : `premier week-end de ${p.label}`;
    } else {
      if (p.part === "fin") {
        const latest = addDays(p.to, -nights);
        if (compareCivil(latest, from) > 0) start = latest;
      }
      desc = f.duration ? `${p.label}, ${f.duration.label}` : p.kind === "week" ? p.label : `${p.label}, ${fallback.label}`;
    }
    out.start = start;
    out.end = addDays(start, nights);
    out.chosen = true;
    const y = parseCivilDate(start)!.year;
    out.assumptions.push(`Dates choisies : du ${day(start)} au ${day(out.end)}${y !== todayYear ? ` ${y}` : ""} (${desc})`);
  } else if (endAtom && f.duration) {
    const end = take(resolveAtom(endAtom, today, null), true);
    if (end) {
      out.end = end;
      out.start = addDays(end, -f.duration.nights);
    }
  }

  if (out.start && !out.end) {
    if (endAtom) out.end = take(resolveAtom(endAtom, today, out.start));
    else if (f.duration) out.end = addDays(out.start, f.duration.nights);
  }
  if (rolled && out.start) out.assumptions.push(`Année : ${parseCivilDate(out.start)!.year} (prochaine occurrence de cette date)`);
  if (out.invalid) {
    out.start = null;
    out.end = null;
  }
  return out;
}

function capitalize(s: string): string {
  return s ? s[0]!.toUpperCase() + s.slice(1) : s;
}

/** Heure par défaut d'une location (comme le formulaire du site : prise 12 h, retour 10 h). */
export const DEFAULT_PICKUP_TIME = "12:00";
export const DEFAULT_DROPOFF_TIME = "10:00";
