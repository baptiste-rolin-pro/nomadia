import type { LangPack } from "@/lib/assistant/parser/lang/types";

/**
 * Bengali. Postpositions après le nom (« প্যারিস থেকে » = depuis Paris) et terminaisons collées : locatif
 * (« রোমে » = à Rome), génitif (« রোমের »). Entre deux nombres, « থেকে » relie une plage de dates.
 */
const bn: LangPack = {
  locale: "bn",
  pre: [
    [/(\d{1,2})(?::(\d{2}))?\s*টায়/g, (_m, h, mm) => ` ${h}h${mm ?? ""} `],
    [/(\d+)\s*(দিন|সপ্তাহ|মাস)\s*পরে/g, " পরে $1 $2 "],
    [/(\d+)\s*(?:টি|টা)/g, "$1"],
    // « আমার বয়স ২৩ » sans « বছর ».
    [/বয়স\s*(\d{1,2})(?!\s*(?:বছর|\d))/g, "বয়স $1 বছর"],
    // « ৫ ও ৮ বছরের দুই সন্তান » : « 2 enfants de 5 et 8 ans ».
    [/(\d{1,2})\s*(?:ও|আর|,)\s*(\d{1,2})\s*বছরের\s*(\S+)\s*(?:সন্তান|বাচ্চা|শিশু)\S*/g, " $3 সন্তান de $1 et $2 ans "],
    [/(\S+?)(?:তে|য়|ে)?\s+থাকি/g, " থাকি $1 "],
  ],
  post: { থেকে: "de", হতে: "de", পর্যন্ত: "a", "এর জন্য": "pour", জন্য: "pour", যাব: "", যেতে: "" },
  suffixes: [["য়ের", "pour"], ["ের", "pour"], ["তে", "a"], ["কে", "a"], ["য়", "a"], ["ে", "a"], ["র", ""]],
  words: {
    ফ্লাইট: "vol", বিমান: "avion", উড়ান: "vol", টিকিট: "billet", "বিমানের টিকিট": "billet",
    "যাওয়া আসা": "aller-retour", "যাওয়া-আসা": "aller-retour", "রাউন্ড ট্রিপ": "aller-retour", একমুখী: "aller simple", "ওয়ান ওয়ে": "aller simple",
    হোটেল: "hotel", "থাকার জায়গা": "hebergement", আবাসন: "hebergement", রুম: "chambre", ঘর: "chambre", রাত: "nuits", রাতের: "nuits",
    গাড়ি: "voiture", "গাড়ি ভাড়া": "location voiture", ভাড়া: "location", চালানো: "conduire", চালক: "conducteur", ড্রাইভার: "conducteur", "তরুণ চালক": "jeune conducteur",
    ভ্রমণ: "voyage", ট্রিপ: "voyage", সফর: "voyage", ছুটি: "vacances", ছুটিতে: "vacances", পরিকল্পনা: "planifie", প্ল্যান: "planifie", সাজিয়ে: "organise", সাজাও: "organise", "রোড ট্রিপ": "roadtrip", ঘুরতে: "visiter", ঘোরা: "visiter",
    তথ্য: "infos", "সম্পর্কে বলো": "infos", সম্পর্কে: "infos", দেখাও: "montre moi",
    বুক: "reserver", বুকিং: "reservation", সংরক্ষণ: "reservation", পেমেন্ট: "payer", পরিশোধ: "payer", কিনতে: "acheter", কার্ড: "carte",
    এবং: "et", ও: "et", আর: "et", সাথে: "avec", সঙ্গে: "avec", মধ্যে: "entre", "থেকে শুরু": "a partir du", ফেরা: "retour", ফেরত: "retour", ফিরে: "retour", ফিরব: "retour", "ফেরত দেব": "rendre", নেব: "prise",
    দুপুর: "midi", সকাল: "matin", সন্ধ্যা: "soir", পরে: "dans",
    জানুয়ারি: "janvier", ফেব্রুয়ারি: "fevrier", মার্চ: "mars", এপ্রিল: "avril", মে: "mai", জুন: "juin", জুলাই: "juillet", আগস্ট: "aout", সেপ্টেম্বর: "septembre", অক্টোবর: "octobre", নভেম্বর: "novembre", ডিসেম্বর: "decembre",
    সোমবার: "lundi", মঙ্গলবার: "mardi", বুধবার: "mercredi", বৃহস্পতিবার: "jeudi", শুক্রবার: "vendredi", শনিবার: "samedi", রবিবার: "dimanche",
    "আগামী সোমবার": "lundi prochain", "আগামী মঙ্গলবার": "mardi prochain", "আগামী বুধবার": "mercredi prochain", "আগামী বৃহস্পতিবার": "jeudi prochain", "আগামী শুক্রবার": "vendredi prochain", "আগামী শনিবার": "samedi prochain", "আগামী রবিবার": "dimanche prochain",
    আজ: "aujourd'hui", আগামীকাল: "demain", কাল: "demain", পরশু: "apres-demain",
    "এই সপ্তাহান্তে": "ce week-end", "এই উইকেন্ডে": "ce week-end", "আগামী সপ্তাহান্তে": "le week-end prochain", "আগামী উইকেন্ডে": "le week-end prochain", সপ্তাহান্ত: "week-end", সপ্তাহান্তে: "week-end", উইকেন্ড: "week-end", উইকেন্ডে: "week-end",
    "আগামী সপ্তাহে": "la semaine prochaine", "পরের সপ্তাহে": "la semaine prochaine", "এই সপ্তাহে": "cette semaine", "আগামী মাসে": "le mois prochain", "পরের মাসে": "le mois prochain",
    সপ্তাহ: "semaine", সপ্তাহের: "semaine", দিন: "jours", দিনের: "jours", মাস: "mois", মাসের: "mois", শুরুতে: "debut", মাঝামাঝি: "mi", শেষে: "fin",
    প্রাপ্তবয়স্ক: "adultes", বড়: "adultes", শিশু: "enfants", শিশুর: "enfants", বাচ্চা: "enfants", বাচ্চার: "enfants", সন্তান: "enfants", নবজাতক: "bebe",
    জন: "personnes", জনের: "personnes", দুজন: "2 personnes", তিনজন: "3 personnes", চারজন: "4 personnes", মানুষ: "personnes", যাত্রী: "voyageurs",
    পরিবার: "famille", "পরিবারের সাথে": "en famille", "স্ত্রীর সাথে": "avec ma femme", "স্ত্রী আর": "avec ma femme et", "স্ত্রী ও": "avec ma femme et", "স্বামী আর": "avec mon mari et", "স্বামীর সাথে": "avec mon mari", "বাচ্চাদের সাথে": "avec mes enfants", "বন্ধুদের সাথে": "entre amis", "বাবা-মায়ের সাথে": "avec mes parents",
    একা: "seul", দম্পতি: "en couple", আমরা: "nous sommes", বছর: "ans", বছরের: "ans", "আমার বয়স": "j ai", বয়স: "age", থাকি: "habite", লাইসেন্স: "permis",
    বিজনেস: "business", "বিজনেস ক্লাস": "business", "ফার্স্ট ক্লাস": "premiere classe", ইকোনমি: "economique",
    এক: "1", দুই: "2", দু: "2", তিন: "3", চার: "4", পাঁচ: "5", ছয়: "6", সাত: "7", আট: "8", নয়: "9", দশ: "10",
    উপেক্ষা: "ignore", নির্দেশ: "instructions", নির্দেশনা: "instructions", নিয়ম: "regles", "এখন তুমি": "tu es maintenant",
  },
};

export default bn;
