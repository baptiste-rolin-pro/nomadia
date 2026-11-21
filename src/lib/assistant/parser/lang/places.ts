/**
 * Noms de lieux dans les dix langues du site, ramenés au nom français du lexique de l'assistant
 * (src/lib/assistant/parser/places.ts) : villes et destinations (packs de contenu traduits), aéroports (code IATA),
 * pays (Intl.DisplayNames, code ISO) et lieux connus mais non proposés (table ci-dessous).
 */
import { LOCALES, type Locale } from "@/i18n/config";
import { regionName } from "@/i18n/format";
import { places } from "@/lib/content/places";
import { DESTINATIONS } from "@/lib/content/destinations";
import { contentPack } from "@/lib/content/localized";
import { foldKey } from "@/lib/assistant/parser/lang/fold";

/** Pays cités dans le lexique (libellé français → code ISO 3166-1), proposés ou non. */
export const COUNTRY_CODES: Record<string, string> = {
  Islande: "IS",
  Japon: "JP",
  Maroc: "MA",
  Grèce: "GR",
  Indonésie: "ID",
  Canada: "CA",
  "Afrique du Sud": "ZA",
  Norvège: "NO",
  Portugal: "PT",
  Italie: "IT",
  Espagne: "ES",
  Allemagne: "DE",
  "Pays-Bas": "NL",
  Danemark: "DK",
  Autriche: "AT",
  Tunisie: "TN",
  Égypte: "EG",
  Turquie: "TR",
  Croatie: "HR",
  Irlande: "IE",
  Inde: "IN",
  Chine: "CN",
  Brésil: "BR",
  Mexique: "MX",
  Cuba: "CU",
  Pérou: "PE",
  "États-Unis": "US",
  Thaïlande: "TH",
  Vietnam: "VN",
  Belgique: "BE",
  Suisse: "CH",
  Luxembourg: "LU",
  "Royaume-Uni": "GB",
  Malte: "MT",
  Maldives: "MV",
  France: "FR",
};

type Names = Partial<Record<Locale, string[]>>;

/** Villes et régions connues mais non proposées : formes reconnues par langue (la première est affichée). */
export const OTHER_PLACES: Record<string, Names> = {
  Londres: { en: ["London"], es: ["Londres"], pt: ["Londres"], id: ["London"], ru: ["Лондон"], ar: ["لندن"], hi: ["लंदन"], bn: ["লন্ডন"], zh: ["伦敦"] },
  Berlin: { en: ["Berlin"], es: ["Berlín"], pt: ["Berlim"], id: ["Berlin"], ru: ["Берлин"], ar: ["برلين"], hi: ["बर्लिन"], bn: ["বার্লিন"], zh: ["柏林"] },
  Barcelone: { en: ["Barcelona"], es: ["Barcelona"], pt: ["Barcelona"], id: ["Barcelona"], ru: ["Барселона"], ar: ["برشلونة"], hi: ["बार्सिलोना"], bn: ["বার্সেলোনা"], zh: ["巴塞罗那"] },
  Porto: { en: ["Porto", "Oporto"], es: ["Oporto"], pt: ["Porto"], id: ["Porto"], ru: ["Порту"], ar: ["بورتو"], hi: ["पोर्टो"], bn: ["পোর্তো"], zh: ["波尔图"] },
  Naples: { en: ["Naples"], es: ["Nápoles"], pt: ["Nápoles"], id: ["Napoli"], ru: ["Неаполь"], ar: ["نابولي"], hi: ["नेपल्स"], bn: ["নেপলস"], zh: ["那不勒斯"] },
  Séville: { en: ["Seville"], es: ["Sevilla"], pt: ["Sevilha"], id: ["Sevilla"], ru: ["Севилья"], ar: ["إشبيلية"], hi: ["सेविल"], bn: ["সেভিয়া"], zh: ["塞维利亚"] },
  Bruxelles: { en: ["Brussels"], es: ["Bruselas"], pt: ["Bruxelas"], id: ["Brussel"], ru: ["Брюссель"], ar: ["بروكسل"], hi: ["ब्रसेल्स"], bn: ["ব্রাসেলস"], zh: ["布鲁塞尔"] },
  Genève: { en: ["Geneva"], es: ["Ginebra"], pt: ["Genebra"], id: ["Jenewa"], ru: ["Женева"], ar: ["جنيف"], hi: ["जिनेवा"], bn: ["জেনেভা"], zh: ["日内瓦"] },
  Dublin: { en: ["Dublin"], es: ["Dublín"], pt: ["Dublin"], id: ["Dublin"], ru: ["Дублин"], ar: ["دبلن"], hi: ["डबलिन"], bn: ["ডাবলিন"], zh: ["都柏林"] },
  Prague: { en: ["Prague"], es: ["Praga"], pt: ["Praga"], id: ["Praha"], ru: ["Прага"], ar: ["براغ"], hi: ["प्राग"], bn: ["প্রাগ"], zh: ["布拉格"] },
  Budapest: { en: ["Budapest"], es: ["Budapest"], pt: ["Budapeste"], id: ["Budapest"], ru: ["Будапешт"], ar: ["بودابست"], hi: ["बुडापेस्ट"], bn: ["বুদাপেস্ট"], zh: ["布达佩斯"] },
  "New York": { en: ["New York", "NYC"], es: ["Nueva York"], pt: ["Nova York", "Nova Iorque"], id: ["New York"], ru: ["Нью-Йорк"], ar: ["نيويورك"], hi: ["न्यूयॉर्क"], bn: ["নিউ ইয়র্ক"], zh: ["纽约"] },
  Tokyo: { en: ["Tokyo"], es: ["Tokio"], pt: ["Tóquio"], id: ["Tokyo"], ru: ["Токио"], ar: ["طوكيو"], hi: ["टोक्यो"], bn: ["টোকিও"], zh: ["东京"] },
  Bangkok: { en: ["Bangkok"], es: ["Bangkok"], pt: ["Bangkok", "Banguecoque"], id: ["Bangkok"], ru: ["Бангкок"], ar: ["بانكوك"], hi: ["बैंकॉक"], bn: ["ব্যাংকক"], zh: ["曼谷"] },
  Sydney: { en: ["Sydney"], es: ["Sídney"], pt: ["Sydney"], id: ["Sydney"], ru: ["Сидней"], ar: ["سيدني"], hi: ["सिडनी"], bn: ["সিডনি"], zh: ["悉尼"] },
  Dubaï: { en: ["Dubai"], es: ["Dubái"], pt: ["Dubai"], id: ["Dubai"], ru: ["Дубай"], ar: ["دبي"], hi: ["दुबई"], bn: ["দুবাই"], zh: ["迪拜"] },
  Crète: { en: ["Crete"], es: ["Creta"], pt: ["Creta"], id: ["Kreta"], ru: ["Крит"], ar: ["كريت"], hi: ["क्रीट"], bn: ["ক্রিট"], zh: ["克里特岛"] },
  Corse: { en: ["Corsica"], es: ["Córcega"], pt: ["Córsega"], id: ["Korsika"], ru: ["Корсика"], ar: ["كورسيكا"], hi: ["कोर्सिका"], bn: ["কর্সিকা"], zh: ["科西嘉岛"] },
  Sicile: { en: ["Sicily"], es: ["Sicilia"], pt: ["Sicília"], id: ["Sisilia"], ru: ["Сицилия"], ar: ["صقلية"], hi: ["सिसिली"], bn: ["সিসিলি"], zh: ["西西里岛"] },
  Sardaigne: { en: ["Sardinia"], es: ["Cerdeña"], pt: ["Sardenha"], id: ["Sardinia"], ru: ["Сардиния"], ar: ["سردينيا"], hi: ["सार्डिनिया"], bn: ["সার্ডিনিয়া"], zh: ["撒丁岛"] },
  Écosse: { en: ["Scotland"], es: ["Escocia"], pt: ["Escócia"], id: ["Skotlandia"], ru: ["Шотландия"], ar: ["اسكتلندا"], hi: ["स्कॉटलैंड"], bn: ["স্কটল্যান্ড"], zh: ["苏格兰"] },
  Angleterre: { en: ["England"], es: ["Inglaterra"], pt: ["Inglaterra"], id: ["Inggris"], ru: ["Англия"], ar: ["إنجلترا"], hi: ["इंग्लैंड"], bn: ["ইংল্যান্ড"], zh: ["英格兰"] },
  Nîmes: { en: ["Nîmes"], ru: ["Ним"], ar: ["نيم"], hi: ["नीम"], bn: ["নিম"], zh: ["尼姆"] },
  Lille: { en: ["Lille"], ru: ["Лилль"], ar: ["ليل"], hi: ["लील"], bn: ["লিল"], zh: ["里尔"] },
  Strasbourg: { en: ["Strasbourg"], es: ["Estrasburgo"], pt: ["Estrasburgo"], ru: ["Страсбург"], ar: ["ستراسبورغ"], hi: ["स्ट्रासबर्ग"], bn: ["স্ট্রাসবুর্গ"], zh: ["斯特拉斯堡"] },
  Rennes: { en: ["Rennes"], ru: ["Ренн"], ar: ["رين"], hi: ["रेन"], bn: ["রেন"], zh: ["雷恩"] },
  Montpellier: { en: ["Montpellier"], ru: ["Монпелье"], ar: ["مونبلييه"], hi: ["मोंपेलिए"], bn: ["মঁপেলিয়ে"], zh: ["蒙彼利埃"] },
  Grenoble: { en: ["Grenoble"], ru: ["Гренобль"], ar: ["غرونوبل"], hi: ["ग्रेनोबल"], bn: ["গ্রেনোবল"], zh: ["格勒诺布尔"] },
  Biarritz: { en: ["Biarritz"], ru: ["Биарриц"], ar: ["بياريتز"], hi: ["बियारिट्ज़"], bn: ["বিয়ারিৎস"], zh: ["比亚里茨"] },
  Ajaccio: { en: ["Ajaccio"], ru: ["Аяччо"], ar: ["أجاكسيو"], hi: ["अजाचियो"], bn: ["আজাক্সিও"], zh: ["阿雅克肖"] },
  Bari: { en: ["Bari"], ru: ["Бари"], ar: ["باري"], hi: ["बारी"], bn: ["বারি"], zh: ["巴里"] },
};

/** Nom affiché d'un lieu non proposé dans une langue (null : garder le libellé français). */
export function otherPlaceName(label: string, locale: Locale): string | null {
  return OTHER_PLACES[label]?.[locale]?.[0] ?? null;
}

/** Lieu reconnu : texte français canonique, et vrai pour un nom de lieu (pour l'ordre des postpositions). */
export type PlaceHit = string;

let built: Map<string, PlaceHit> | null = null;

const firstPart = (s: string) => s.split("(")[0]!.trim();

/**
 * Table globale « nom replié (toutes langues) → texte français canonique ». Construite à la première utilisation
 * (les packs de contenu sont chargés paresseusement). Les noms français sont exclus : le lexique les connaît déjà.
 */
export function placeNames(): Map<string, PlaceHit> {
  if (built) return built;
  const map = new Map<string, PlaceHit>();
  const add = (name: string | undefined, canonical: string) => {
    if (!name) return;
    const key = foldKey(name);
    if (key && !map.has(key)) map.set(key, canonical);
  };
  for (const locale of LOCALES) {
    if (locale === "fr") continue;
    const pack = contentPack(locale);
    for (const p of places) {
      add(pack.places.cities[p.city], firstPart(p.city));
      add(firstPart(pack.places.cities[p.city] ?? ""), firstPart(p.city));
      if (p.kind === "airport") add(pack.places.airports[p.code], p.code);
    }
    for (const d of DESTINATIONS) {
      add(pack.destinations[d.slug]?.name, firstPart(d.name));
      add(firstPart(pack.destinations[d.slug]?.name ?? ""), firstPart(d.name));
    }
    for (const [label, code] of Object.entries(COUNTRY_CODES)) add(regionName(locale, code), label);
    for (const [label, names] of Object.entries(OTHER_PLACES)) for (const n of names[locale] ?? []) add(n, label);
  }
  built = map;
  return map;
}
