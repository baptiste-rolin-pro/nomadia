/**
 * Mise en forme des messages et des valeurs, identique côté serveur et navigateur (aucune dépendance). Seul ce
 * module est chargé par les composants clients ; format.ts y ajoute les outils du serveur (listes, pays, mois).
 *
 * Messages : sous-ensemble de la syntaxe ICU MessageFormat, suffisant pour le site :
 *   - `{nom}` : valeur (les nombres sont mis en forme dans la langue) ;
 *   - `{n, plural, =0 {…} one {…} few {…} many {…} other {…}}` : pluriel selon Intl.PluralRules (`#` = n) ;
 *   - `{v, select, a {…} b {…} other {…}}` : choix selon une valeur.
 * Pas d'échappement par apostrophe : le texte français en contient beaucoup.
 *
 * Valeurs : nombres, montants (unités mineures exactes, voir money.ts), dates civiles et heures locales sans
 * conversion de fuseau et durées.
 */
import { DEFAULT_LOCALE, LOCALE_INFO, type Locale } from "@/i18n/config";
import { formatMoney, type Money } from "@/lib/money";
import { formatCivilDate, formatDuration, formatLocalTime, parseCivilDate, type CivilDate } from "@/lib/dates";

export type MessageParams = Record<string, string | number | null | undefined>;

type Node = string | { arg: string } | { arg: string; kind: "plural" | "select"; branches: Record<string, Node[]> } | { hash: true };

const cache = new Map<string, Node[]>();

function parse(msg: string): Node[] {
  let cached = cache.get(msg);
  if (!cached) {
    cached = parseNodes(msg, { i: 0 }, false);
    cache.set(msg, cached);
  }
  return cached;
}

function parseNodes(s: string, pos: { i: number }, inBranch: boolean): Node[] {
  const nodes: Node[] = [];
  let text = "";
  const flush = () => {
    if (text) nodes.push(text);
    text = "";
  };
  while (pos.i < s.length) {
    const c = s[pos.i]!;
    if (c === "}" && inBranch) break;
    if (c === "#" && inBranch) {
      flush();
      nodes.push({ hash: true });
      pos.i++;
      continue;
    }
    if (c === "{") {
      const close = matchArg(s, pos.i);
      if (close < 0) {
        text += c;
        pos.i++;
        continue;
      }
      flush();
      const inner = s.slice(pos.i + 1, close);
      const comma = inner.indexOf(",");
      if (comma < 0) {
        nodes.push({ arg: inner.trim() });
        pos.i = close + 1;
        continue;
      }
      const arg = inner.slice(0, comma).trim();
      const rest = inner.slice(comma + 1);
      const comma2 = rest.indexOf(",");
      const kind = (comma2 < 0 ? rest : rest.slice(0, comma2)).trim();
      if (kind !== "plural" && kind !== "select") {
        nodes.push({ arg });
        pos.i = close + 1;
        continue;
      }
      const branches: Record<string, Node[]> = {};
      const sub = { i: pos.i + 1 + comma + 1 + comma2 + 1 };
      while (sub.i < close) {
        while (sub.i < close && /\s/.test(s[sub.i]!)) sub.i++;
        let key = "";
        while (sub.i < close && s[sub.i] !== "{" && !/\s/.test(s[sub.i]!)) key += s[sub.i++];
        while (sub.i < close && /\s/.test(s[sub.i]!)) sub.i++;
        if (s[sub.i] !== "{" || !key) break;
        sub.i++;
        branches[key] = parseNodes(s, sub, true);
        sub.i++; // « } » de la branche
      }
      nodes.push({ arg, kind, branches });
      pos.i = close + 1;
      continue;
    }
    text += c;
    pos.i++;
  }
  flush();
  return nodes;
}

/** Position de l'accolade fermante correspondant à celle de `start` (−1 si absente). */
function matchArg(s: string, start: number): number {
  let depth = 0;
  for (let i = start; i < s.length; i++) {
    if (s[i] === "{") depth++;
    else if (s[i] === "}") {
      depth--;
      if (depth === 0) return i;
    }
  }
  return -1;
}

const pluralRules = new Map<string, Intl.PluralRules>();
const numberFormats = new Map<string, Intl.NumberFormat>();

function rules(locale: Locale): Intl.PluralRules {
  let r = pluralRules.get(locale);
  if (!r) {
    r = new Intl.PluralRules(LOCALE_INFO[locale].intl);
    pluralRules.set(locale, r);
  }
  return r;
}

export function formatNumber(locale: Locale, n: number, opts?: Intl.NumberFormatOptions): string {
  const key = `${locale}|${JSON.stringify(opts ?? {})}`;
  let f = numberFormats.get(key);
  if (!f) {
    f = new Intl.NumberFormat(LOCALE_INFO[locale].intl, { maximumFractionDigits: 2, ...opts });
    numberFormats.set(key, f);
  }
  return f.format(n);
}

function render(nodes: Node[], locale: Locale, params: MessageParams, hash: number | null): string {
  let out = "";
  for (const node of nodes) {
    if (typeof node === "string") out += node;
    else if ("hash" in node) out += hash === null ? "#" : formatNumber(locale, hash);
    else if (!("kind" in node)) {
      // Valeur absente des paramètres : l'accolade reste telle quelle (ancres `{#id}`, texte littéral).
      if (!(node.arg in params)) {
        out += `{${node.arg}}`;
        continue;
      }
      const v = params[node.arg];
      out += typeof v === "number" ? formatNumber(locale, v) : (v ?? "");
    } else if (node.kind === "plural") {
      const n = Number(params[node.arg] ?? 0);
      const branch = node.branches[`=${n}`] ?? node.branches[rules(locale).select(n)] ?? node.branches.other ?? [];
      out += render(branch, locale, params, n);
    } else {
      const v = String(params[node.arg] ?? "other");
      out += render(node.branches[v] ?? node.branches.other ?? [], locale, params, hash);
    }
  }
  return out;
}

/** Met en forme un message (voir la syntaxe en tête de fichier). */
export function formatMessage(locale: Locale, message: string, params: MessageParams = {}): string {
  if (!message.includes("{")) return message;
  return render(parse(message), locale, params, null);
}

// ---------------------------------------------------------------------------
// Valeurs

const dateFormats = new Map<string, Intl.DateTimeFormat>();

/** Formateur de dates mis en cache (fuseau UTC : dates civiles sans décalage). */
export function dtf(locale: Locale, key: string, options: Intl.DateTimeFormatOptions): Intl.DateTimeFormat {
  const k = `${locale}|${key}`;
  let f = dateFormats.get(k);
  if (!f) {
    f = new Intl.DateTimeFormat(LOCALE_INFO[locale].intl, { ...options, timeZone: "UTC" });
    dateFormats.set(k, f);
  }
  return f;
}

export type DateStyle = "long" | "short" | "weekday" | "medium" | "monthYear";

const DATE_OPTIONS: Record<DateStyle, Intl.DateTimeFormatOptions> = {
  long: { weekday: "long", day: "numeric", month: "long", year: "numeric" },
  weekday: { weekday: "short", day: "numeric", month: "short" },
  short: { day: "numeric", month: "short" },
  medium: { day: "numeric", month: "long", year: "numeric" },
  monthYear: { month: "long", year: "numeric" },
};

/** Date civile (AAAA-MM-JJ) dans la langue, sans décalage de fuseau. */
export function formatDate(locale: Locale, date: CivilDate, style: DateStyle = "long"): string {
  if (locale === DEFAULT_LOCALE && (style === "long" || style === "short" || style === "weekday")) return formatCivilDate(date, style);
  const p = parseCivilDate(date);
  if (!p) return date;
  return dtf(locale, style, DATE_OPTIONS[style]).format(new Date(Date.UTC(p.year, p.month - 1, p.day, 12)));
}

/** Heure locale (« AAAA-MM-JJTHH:mm » ou « HH:mm ») : « 21 h 30 » en français, « 21:30 »… ailleurs. */
export function formatTime(locale: Locale, local: string): string {
  const hhmm = local.length > 5 ? local.slice(11, 16) : local;
  if (locale === DEFAULT_LOCALE) return formatLocalTime(`2000-01-01T${hhmm}`);
  const [h = 0, m = 0] = hhmm.split(":").map(Number);
  return dtf(locale, "time", { hour: "2-digit", minute: "2-digit", hourCycle: "h23" }).format(new Date(Date.UTC(2000, 0, 1, h, m)));
}

/** Durée en minutes : « 2 h 30 » en français, unités Intl abrégées ailleurs (« 2 hr 30 min »). */
export function formatDurationIn(locale: Locale, minutes: number): string {
  if (locale === DEFAULT_LOCALE) return formatDuration(minutes);
  const h = Math.floor(minutes / 60);
  const m = minutes % 60;
  const hours = formatNumber(locale, h, { style: "unit", unit: "hour", unitDisplay: "short" });
  const mins = formatNumber(locale, m, { style: "unit", unit: "minute", unitDisplay: "short" });
  if (h === 0) return mins;
  return m === 0 ? hours : `${hours} ${mins}`;
}

export function formatMoneyIn(locale: Locale, m: Money, opts: { hideZeroDecimals?: boolean } = {}): string {
  return formatMoney(m, { locale: LOCALE_INFO[locale].intl, hideZeroDecimals: opts.hideZeroDecimals });
}
