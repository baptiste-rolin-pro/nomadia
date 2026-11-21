import type { LangPack } from "@/lib/assistant/parser/lang/types";

const MONTHS = ["janvier", "fevrier", "mars", "avril", "mai", "juin", "juillet", "aout", "septembre", "octobre", "novembre", "decembre"];
const M = (m: string) => MONTHS[Number(m) - 1] ?? "";
const DIGITS: Record<string, number> = { 零: 0, 〇: 0, 一: 1, 二: 2, 两: 2, 兩: 2, 三: 3, 四: 4, 五: 5, 六: 6, 七: 7, 八: 8, 九: 9 };

/** Petits nombres chinois (jusqu'à 99) : « 十二 » → 12, « 二十五 » → 25, « 两 » → 2. */
function cnNumber(s: string): string {
  if (!s.includes("十")) return String(Number([...s].map((c) => DIGITS[c] ?? 0).join("")));
  const [tens, units] = s.split("十");
  return String((tens ? (DIGITS[tens] ?? 1) : 1) * 10 + (units ? (DIGITS[units] ?? 0) : 0));
}
const CN = "[零〇一二两兩三四五六七八九十]+";
const SEP = "\\s*(?:到|至|-|–|—|~|～|－)\\s*";
const half = (h: string, ap?: string) => String(Number(h) + (ap && /下午|晚上/.test(ap) && Number(h) < 12 ? 12 : 0));

/**
 * Chinois simplifié (et formes traditionnelles courantes). Pas d'espaces entre les mots : les dates, heures et
 * nombres sont d'abord réécrits, puis le texte est découpé par dictionnaire (mot le plus long d'abord).
 */
const zh: LangPack = {
  locale: "zh",
  segment: true,
  pre: [
    // Nombres en caractères devant un compteur (« 两个人 », « 三晚 », « 十二月 »), jamais dans « 星期一 ».
    [new RegExp(`(${CN})(?=[日号號月岁歲个個位晚天夜周週人名间間点點年号])`, "g"), (_m, n) => cnNumber(n)],
    // « 2027年6月12日到16日 », « 6月12日至7月2日 », « 6月12-16日 ».
    [new RegExp(`(?:(\\d{4})年)?(\\d{1,2})月(\\d{1,2})[日号號]?${SEP}(?:(\\d{1,2})月)?(\\d{1,2})[日号號]?`, "g"), (_m, y, m1, d1, m2, d2) =>
      m2 && m2 !== m1 ? ` ${d1} ${M(m1)} au ${d2} ${M(m2)}${y ? ` ${y}` : ""} ` : ` du ${d1} au ${d2} ${M(m1)}${y ? ` ${y}` : ""} `],
    [/(?:(\d{4})年)?(\d{1,2})月(\d{1,2})[日号號]/g, (_m, y, m, d) => ` ${d} ${M(m)}${y ? ` ${y}` : ""} `],
    [/(\d{1,2})月(?:份)?(初|上旬)/g, (_m, m) => ` debut ${M(m)} `],
    [/(\d{1,2})月(?:份)?(中旬|中)/g, (_m, m) => ` mi ${M(m)} `],
    [/(\d{1,2})月(?:份)?(底|末|下旬)/g, (_m, m) => ` fin ${M(m)} `],
    [/(\d{1,2})月份?(?!\d)/g, (_m, m) => ` ${M(m)} `],
    [/(\d{1,2})[日号號]/g, " le $1 "],
    [/(上午|早上|下午|晚上)?(\d{1,2})[点點](?:(半)|(\d{1,2})分?)?/g, (_m, ap, h, hf, mm) => ` ${half(h, ap)}h${hf ? "30" : (mm ?? "")} `],
    // « 两个5岁和8岁的孩子 » : « 2 enfants de 5 et 8 ans ».
    [/(\d+)[个個]?(\d{1,2})[岁歲](?:和|、|,|，)(\d{1,2})[岁歲]的(?:孩子|小孩|儿童|兒童)/g, " $1 enfants de $2 et $3 ans "],
    [/我(\d{1,2})[岁歲]/g, " 我年龄 $1 岁 "],
    // « 巴黎飞罗马 » : le verbe « voler » sépare origine et destination (« Paris à Rome ») et vaut demande de vol.
    [/^([^]*?)(?:飞往|飛往|[飞飛](?![机機行]))([^]*)$/, (_m, a, b) => `${a} 到 ${b} 航班 `],
    [/(\d+)(天|周|週|个星期|個星期|个月|個月)(?:以?后|以?後)/g, " 之后 $1 $2 "],
  ],
  words: {
    机票: "billet", 機票: "billet", 航班: "vol", 班机: "vol", 飞机: "avion", 飛機: "avion", 飞往: "vol a", 飛往: "vol a", 飞: "vol", 飛: "vol", 往返: "aller-retour", 来回: "aller-retour", 單程: "aller simple", 单程: "aller simple",
    酒店: "hotel", 宾馆: "hotel", 賓館: "hotel", 饭店: "hotel", 旅馆: "hotel", 旅館: "hotel", 住宿: "hebergement", 民宿: "hebergement", 房间: "chambres", 房間: "chambres", 间: "chambres", 間: "chambres", 房: "", 晚: "nuits", 晚上: "nuits", 夜: "nuits", 住: "dormir",
    租车: "location voiture", 租車: "location voiture", 汽车: "voiture", 汽車: "voiture", 车: "voiture", 車: "voiture", 轿车: "voiture", 租: "louer", 自驾: "roadtrip", 自駕: "roadtrip", 开车: "conduire", 開車: "conduire", 驾驶: "conduire", 司机: "conducteur", 司機: "conducteur", 驾驶员: "conducteur", 年轻司机: "jeune conducteur",
    旅行: "voyage", 旅游: "voyage", 旅遊: "voyage", 行程: "itineraire", 度假: "vacances", 假期: "vacances", 安排: "organise", 规划: "planifie", 規劃: "planifie", 计划: "planifie", 計劃: "planifie", 策划: "organise", 自由行: "voyage", 游览: "visiter", 参观: "visiter", 參觀: "visiter",
    了解: "infos", 介绍: "infos", 介紹: "infos", 信息: "infos", 资料: "infos", 看看: "montre moi",
    预订: "reserver", 預訂: "reserver", 预定: "reserver", 订: "reserver", 訂: "reserver", 支付: "payer", 付款: "payer", 付钱: "payer", 买: "acheter", 買: "acheter", 购买: "acheter", 信用卡: "carte",
    从: "de", 從: "de", 自: "de", 到: "a", 去: "a", 前往: "a", 往: "a", 在: "a", 至: "au", 和: "et", 还有: "et", 還有: "et", 与: "et", 與: "et", 跟: "avec", 带: "avec", 帶: "avec", 同: "avec", 为: "pour", 為: "pour", 给: "pour", 之后: "dans",
    回来: "retour", 回來: "retour", 返回: "retour", 回程: "retour", 回: "retour", 还车: "rendre", 還車: "rendre", 取车: "prise", 取車: "prise", 中午: "midi", 午夜: "minuit",
    星期一: "lundi", 周一: "lundi", 週一: "lundi", 礼拜一: "lundi", 星期二: "mardi", 周二: "mardi", 週二: "mardi", 星期三: "mercredi", 周三: "mercredi", 週三: "mercredi",
    星期四: "jeudi", 周四: "jeudi", 週四: "jeudi", 星期五: "vendredi", 周五: "vendredi", 週五: "vendredi", 星期六: "samedi", 周六: "samedi", 週六: "samedi", 星期日: "dimanche", 星期天: "dimanche", 周日: "dimanche", 週日: "dimanche",
    下周一: "lundi prochain", 下周二: "mardi prochain", 下周三: "mercredi prochain", 下周四: "jeudi prochain", 下周五: "vendredi prochain", 下周六: "samedi prochain", 下周日: "dimanche prochain",
    这周五: "ce vendredi", 本周五: "ce vendredi", 这周六: "ce samedi",
    今天: "aujourd'hui", 明天: "demain", 后天: "apres-demain", 後天: "apres-demain", 今晚: "ce soir",
    这个周末: "ce week-end", 這個週末: "ce week-end", 这周末: "ce week-end", 本周末: "ce week-end", 下个周末: "le week-end prochain", 下個週末: "le week-end prochain", 下周末: "le week-end prochain", 周末: "week-end", 週末: "week-end",
    下周: "la semaine prochaine", 下週: "la semaine prochaine", 下个星期: "la semaine prochaine", 下星期: "la semaine prochaine", 这周: "cette semaine", 本周: "cette semaine", 下个月: "le mois prochain", 下個月: "le mois prochain",
    周: "semaine", 週: "semaine", 星期: "semaine", 个星期: "semaine", 礼拜: "semaine", 天: "jours", 个月: "mois", 個月: "mois",
    成人: "adultes", 大人: "adultes", 成年人: "adultes", 孩子: "enfants", 孩子们: "enfants", 儿童: "enfants", 兒童: "enfants", 小孩: "enfants", 婴儿: "bebe", 嬰兒: "bebe", 宝宝: "bebe", 寶寶: "bebe",
    人: "personnes", 位: "personnes", 个人: "personnes", 個人: "personnes", 乘客: "passagers", 旅客: "voyageurs", 个: "", 個: "",
    家人: "famille", 全家: "en famille", 一家人: "en famille", 家庭: "famille", 带家人: "en famille", 和家人: "en famille",
    和我妻子: "avec ma femme", 和老婆: "avec ma femme", 跟老婆: "avec ma femme", 和我老婆: "avec ma femme", 和我丈夫: "avec mon mari", 和老公: "avec mon mari", 和我老公: "avec mon mari",
    带孩子: "avec mes enfants", 带着孩子: "avec mes enfants", 和孩子: "avec mes enfants", 和父母: "avec mes parents", 和朋友: "entre amis", 跟朋友: "entre amis", 和朋友们: "entre amis",
    一个人: "seul", 独自: "seul", 獨自: "seul", 夫妻: "en couple", 情侣: "en couple", 两个人: "2 personnes", 我们: "nous sommes", 我們: "nous sommes",
    岁: "ans", 歲: "ans", 年龄: "age", 年齡: "age", 我年龄: "j ai", 住在: "habite en", 驾照: "permis", 駕照: "permis",
    商务舱: "business", 商務艙: "business", 公务舱: "business", 头等舱: "premiere classe", 頭等艙: "premiere classe", 经济舱: "economique", 經濟艙: "economique", 超级经济舱: "premium", 高端经济舱: "premium",
    忽略: "ignore", 忘记: "oublie", 指令: "instructions", 说明: "instructions", 规则: "regles", 系统提示: "prompt systeme", 你现在是: "tu es maintenant",
  },
};

export default zh;
