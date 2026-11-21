import type { LangPack } from "@/lib/assistant/parser/lang/types";

/**
 * Arabe (standard moderne, mois grégoriens et levantins). Les préfixes collés (« و » et, « ب » à, « ل » pour,
 * « ال » article) sont détachés quand le reste est un mot ou un lieu connu (« لروما » → « a rome »).
 */
const ar: LangPack = {
  locale: "ar",
  pre: [
    [/(?:الساعة|الساعه)\s*(\d{1,2})(?:[:.](\d{2}))?/g, (_m, h, mm) => ` ${h}h${mm ?? ""} `],
    [/(\d{1,2}):(\d{2})/g, "$1h$2"],
  ],
  prefixes: [["وبال", "et a"], ["وال", "et"], ["بال", "a"], ["لل", "a"], ["فال", ""], ["كال", ""], ["ال", ""], ["و", "et"], ["ب", "a"], ["ل", "a"], ["ف", ""], ["ك", ""]],
  words: {
    "رحلة طيران": "vol", "رحلات طيران": "vol", "رحلة جوية": "vol", طيران: "vol", "تذكرة طيران": "billet", "تذاكر طيران": "billet", تذكرة: "billet", تذاكر: "billet", طائرة: "avion", الطائرة: "avion",
    "ذهاب وعودة": "aller-retour", "ذهاب وإياب": "aller-retour", "ذهاب فقط": "aller simple", "اتجاه واحد": "aller simple",
    فندق: "hotel", فنادق: "hotel", الفندق: "hotel", إقامة: "hebergement", سكن: "hebergement", غرفة: "chambre", غرف: "chambres", غرفتين: "2 chambres", ليلة: "nuit", ليال: "nuits", ليالي: "nuits", ليلتين: "2 nuits", شقة: "appartement",
    سيارة: "voiture", سيارات: "voiture", السيارة: "voiture", "استئجار سيارة": "location voiture", "تأجير سيارة": "location voiture", "سيارة إيجار": "location voiture", استئجار: "location", تأجير: "location", إيجار: "location", استأجر: "louer",
    قيادة: "conduire", سائق: "conducteur", السائق: "conducteur", "سائق شاب": "jeune conducteur",
    رحلة: "voyage", سفر: "voyage", السفر: "voyage", عطلة: "vacances", إجازة: "vacances", نظم: "organise", نظملي: "organise", "نظم لي": "organise", خطط: "planifie", "خطط لي": "planifie", خطة: "planifie", برنامج: "itineraire", زيارة: "visiter", "رحلة برية": "roadtrip",
    اكتشف: "decouvrir", اكتشاف: "decouvrir", معلومات: "infos", "أخبرني عن": "infos", "حدثني عن": "infos", أرني: "montre moi",
    احجز: "reserver", حجز: "reservation", الحجز: "reservation", ادفع: "payer", دفع: "payer", الدفع: "paiement", اشتري: "acheter", شراء: "acheter", بطاقة: "carte",
    من: "de", إلى: "a", الى: "a", نحو: "vers", في: "en", مع: "avec", بين: "entre", و: "et", حتى: "jusqu au", "ابتداء من": "a partir du", "اعتبارا من": "a partir du", "بدءا من": "a partir du", لمدة: "pour",
    عودة: "retour", العودة: "retour", رجوع: "retour", الرجوع: "retour", إعادة: "rendre", تسليم: "rendre", استلام: "prise",
    ظهرا: "midi", الظهر: "midi", منتصف: "mi", صباحا: "matin", مساء: "soir", الليلة: "ce soir",
    يناير: "janvier", "كانون الثاني": "janvier", فبراير: "fevrier", شباط: "fevrier", مارس: "mars", آذار: "mars", أبريل: "avril", ابريل: "avril", نيسان: "avril", مايو: "mai", أيار: "mai",
    يونيو: "juin", يونيه: "juin", حزيران: "juin", يوليو: "juillet", يوليه: "juillet", تموز: "juillet", أغسطس: "aout", آب: "aout", سبتمبر: "septembre", أيلول: "septembre",
    أكتوبر: "octobre", "تشرين الأول": "octobre", نوفمبر: "novembre", "تشرين الثاني": "novembre", ديسمبر: "decembre", "كانون الأول": "decembre",
    الاثنين: "lundi", الإثنين: "lundi", الثلاثاء: "mardi", الأربعاء: "mercredi", الخميس: "jeudi", الجمعة: "vendredi", السبت: "samedi", الأحد: "dimanche", يوم: "",
    القادم: "prochain", القادمة: "prochain", المقبل: "prochain", المقبلة: "prochain",
    اليوم: "aujourd'hui", غدا: "demain", غد: "demain", بكرة: "demain", "بعد غد": "apres-demain",
    "نهاية هذا الأسبوع": "ce week-end", "عطلة نهاية هذا الأسبوع": "ce week-end", "هذا الويكند": "ce week-end", "نهاية الأسبوع القادم": "le week-end prochain", "عطلة نهاية الأسبوع القادم": "le week-end prochain",
    "عطلة نهاية الأسبوع": "week-end", "نهاية الأسبوع": "week-end", "عطلة نهاية أسبوع": "un week-end", ويكند: "week-end", الويكند: "week-end",
    "الأسبوع القادم": "la semaine prochaine", "الأسبوع المقبل": "la semaine prochaine", "هذا الأسبوع": "cette semaine", "الشهر القادم": "le mois prochain", "الشهر المقبل": "le mois prochain",
    أسبوع: "semaine", الأسبوع: "semaine", أسابيع: "semaines", أسبوعين: "2 semaines", أيام: "jours", يومين: "2 jours", شهر: "mois", أشهر: "mois", شهور: "mois", بعد: "dans", خلال: "dans",
    بداية: "debut", أوائل: "debut", أواسط: "mi", نهاية: "fin", أواخر: "fin",
    بالغ: "adulte", بالغين: "adultes", بالغان: "adultes", كبار: "adultes", طفل: "enfant", أطفال: "enfants", طفلين: "2 enfants", أولاد: "enfants", ولد: "enfant", رضيع: "bebe", رضع: "bebes",
    شخص: "personne", أشخاص: "personnes", أفراد: "personnes", شخصين: "2 personnes", شخصان: "2 personnes", مسافر: "voyageur", مسافرين: "voyageurs", ركاب: "passagers",
    عائلة: "famille", العائلة: "famille", أسرة: "famille", "مع العائلة": "en famille", "مع عائلتي": "en famille", "مع أسرتي": "en famille", زوجين: "en couple", كزوجين: "en couple",
    وحدي: "seul", بمفردي: "seul", "مع الأصدقاء": "entre amis", "مع أصدقائي": "avec mes amis", "مع أصدقاء": "entre amis", نحن: "nous sommes",
    "مع زوجتي": "avec ma femme", "مع زوجي": "avec mon mari", "مع أطفالي": "avec mes enfants", "مع أولادي": "avec mes enfants", "مع والدي": "avec mes parents", "مع طفلي": "avec 1 enfant",
    سنة: "ans", سنوات: "ans", سنين: "ans", عام: "ans", أعوام: "ans", عمري: "j ai", عمر: "age", بعمر: "age", أعمار: "ages", أعمارهم: "ages",
    أقيم: "reside", أسكن: "habite", أعيش: "habite", رخصة: "permis", "رخصة قيادة": "permis",
    "درجة رجال الأعمال": "business", "رجال الأعمال": "business", بزنس: "business", "الدرجة الأولى": "premiere classe", "الدرجة السياحية": "economique", "الدرجة الاقتصادية": "economique", اقتصادية: "economique",
    واحد: "1", واحدة: "1", اثنان: "2", اثنين: "2", ثلاثة: "3", ثلاث: "3", أربعة: "4", أربع: "4", خمسة: "5", خمس: "5", ستة: "6", سبعة: "7", ثمانية: "8", تسعة: "9", عشرة: "10",
    تجاهل: "ignore", انس: "oublie", التعليمات: "instructions", تعليمات: "instructions", القواعد: "regles", "أنت الآن": "tu es maintenant",
  },
};

export default ar;
