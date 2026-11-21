import type { LangPack } from "@/lib/assistant/parser/lang/types";

const MONTH = "(जनवरी|फ़रवरी|फरवरी|मार्च|अप्रैल|मई|जून|जुलाई|अगस्त|सितंबर|सितम्बर|अक्टूबर|अक्तूबर|नवंबर|नवम्बर|दिसंबर|दिसम्बर)";

/**
 * Hindi. Les postpositions suivent le nom (« पेरिस से » = depuis Paris) : `post` les replace devant le lieu.
 * Entre deux nombres, « से » relie une plage de dates (« 12 से 16 जून »).
 */
const hi: LangPack = {
  locale: "hi",
  pre: [
    [/(\d{1,2})(?::(\d{2}))?\s*बजे/g, (_m, h, mm) => ` ${h}h${mm ?? ""} `],
    [new RegExp(`${MONTH}\\s*(?:की|के)?\\s*(शुरुआत|शुरू|मध्य|बीच|अंत|आख़िर|आखिर)(?:\\s*में)?`, "g"), (_m, month, part) => ` ${/शुरु|शुरू/.test(part) ? "शुरुआत" : /मध्य|बीच/.test(part) ? "मध्य" : "अंत"} ${month} `],
    [/(\d+)\s*(दिन|हफ़्ते|हफ्ते|सप्ताह|महीने)\s*(?:बाद|में)/g, " बाद $1 $2 "],
    [/(\S+)\s+में\s+रह(?:ता|ती|ते)\s+(?:हूँ|हूं|हैं)/g, " रहता $1 "],
    // « 5 और 8 साल के दो बच्चों » : âges avant le nom en hindi, après en français (« 2 enfants de 5 et 8 ans »).
    [/(\d{1,2})\s*(?:और|व|,)\s*(\d{1,2})\s*(?:साल|वर्ष)\s*(?:के|की)\s*(\S+)\s*बच्च(?:ों|े)/g, " $3 बच्चे de $1 et $2 ans "],
  ],
  post: { से: "de", तक: "a", को: "a", में: "a", "के लिए": "pour", पर: "a" },
  words: {
    उड़ान: "vol", उड़ानें: "vol", फ्लाइट: "vol", फ़्लाइट: "vol", "हवाई जहाज़": "avion", "हवाई जहाज": "avion", विमान: "avion", टिकट: "billet", "हवाई टिकट": "billet",
    "आने जाने": "aller-retour", "आना जाना": "aller-retour", "राउंड ट्रिप": "aller-retour", "रिटर्न टिकट": "aller-retour", "एक तरफ़ा": "aller simple", "एक तरफा": "aller simple", "वन वे": "aller simple",
    होटल: "hotel", "ठहरने की जगह": "hebergement", आवास: "hebergement", कमरा: "chambre", कमरे: "chambres", रात: "nuits", रातें: "nuits", रातों: "nuits", ठहरना: "sejour", रुकना: "sejour",
    कार: "voiture", गाड़ी: "voiture", गाडी: "voiture", "किराए पर कार": "location voiture", "कार किराए": "location voiture", "कार रेंटल": "location voiture", किराया: "location", किराए: "location", रेंटल: "location",
    चलाना: "conduire", ड्राइवर: "conducteur", चालक: "conducteur", "युवा ड्राइवर": "jeune conducteur",
    यात्रा: "voyage", ट्रिप: "voyage", सफ़र: "voyage", सफर: "voyage", छुट्टी: "vacances", छुट्टियाँ: "vacances", छुट्टियां: "vacances", छुट्टियों: "vacances", योजना: "planifie", प्लान: "planifie", व्यवस्थित: "organise", "रोड ट्रिप": "roadtrip", घूमना: "visiter", घूमने: "visiter",
    जानकारी: "infos", "के बारे में बताओ": "infos", "के बारे में": "infos", दिखाओ: "montre moi",
    बुक: "reserver", बुकिंग: "reservation", आरक्षण: "reservation", भुगतान: "payer", ख़रीदना: "acheter", खरीदना: "acheter", कार्ड: "carte",
    और: "et", साथ: "avec", "के साथ": "avec", बीच: "entre", "से शुरू": "a partir du", वापसी: "retour", लौटना: "retour", वापस: "retour", लौटाना: "rendre", लेना: "prise",
    बाद: "dans", दोपहर: "midi", सुबह: "matin", शाम: "soir",
    जनवरी: "janvier", फ़रवरी: "fevrier", फरवरी: "fevrier", मार्च: "mars", अप्रैल: "avril", मई: "mai", जून: "juin", जुलाई: "juillet", अगस्त: "aout",
    सितंबर: "septembre", सितम्बर: "septembre", अक्टूबर: "octobre", अक्तूबर: "octobre", नवंबर: "novembre", नवम्बर: "novembre", दिसंबर: "decembre", दिसम्बर: "decembre",
    सोमवार: "lundi", मंगलवार: "mardi", बुधवार: "mercredi", गुरुवार: "jeudi", बृहस्पतिवार: "jeudi", शुक्रवार: "vendredi", शनिवार: "samedi", रविवार: "dimanche",
    "अगले सोमवार": "lundi prochain", "अगले मंगलवार": "mardi prochain", "अगले बुधवार": "mercredi prochain", "अगले गुरुवार": "jeudi prochain", "अगले शुक्रवार": "vendredi prochain", "अगले शनिवार": "samedi prochain", "अगले रविवार": "dimanche prochain",
    आज: "aujourd'hui", कल: "demain", परसों: "apres-demain",
    "इस वीकेंड": "ce week-end", "इस सप्ताहांत": "ce week-end", "अगले वीकेंड": "le week-end prochain", "अगले सप्ताहांत": "le week-end prochain", वीकेंड: "week-end", सप्ताहांत: "week-end",
    "अगले हफ़्ते": "la semaine prochaine", "अगले हफ्ते": "la semaine prochaine", "अगले सप्ताह": "la semaine prochaine", "इस हफ़्ते": "cette semaine", "इस हफ्ते": "cette semaine", "इस सप्ताह": "cette semaine", "अगले महीने": "le mois prochain",
    हफ़्ता: "semaine", हफ़्ते: "semaines", हफ्ता: "semaine", हफ्ते: "semaines", सप्ताह: "semaine", दिन: "jours", दिनों: "jours", महीना: "mois", महीने: "mois",
    शुरुआत: "debut", मध्य: "mi", अंत: "fin",
    वयस्क: "adultes", बड़े: "adultes", बच्चा: "enfant", बच्चे: "enfants", बच्चों: "enfants", शिशु: "bebe", बेबी: "bebe", लोग: "personnes", लोगों: "personnes", व्यक्ति: "personnes", यात्री: "voyageurs",
    परिवार: "famille", "परिवार के साथ": "en famille", "पत्नी के साथ": "avec ma femme", "पत्नी और": "avec ma femme et", "पति और": "avec mon mari et", "मेरी पत्नी के साथ": "avec ma femme", "पति के साथ": "avec mon mari", "बच्चों के साथ": "avec mes enfants", "माता पिता के साथ": "avec mes parents",
    "दोस्तों के साथ": "entre amis", अकेले: "seul", अकेला: "seul", अकेली: "seul", दंपति: "en couple", कपल: "en couple", हम: "nous sommes",
    साल: "ans", वर्ष: "ans", "मेरी उम्र": "j ai", उम्र: "age", रहता: "habite", रहती: "habite", लाइसेंस: "permis",
    बिज़नेस: "business", बिजनेस: "business", "फ़र्स्ट क्लास": "premiere classe", "फर्स्ट क्लास": "premiere classe", "प्रथम श्रेणी": "premiere classe", इकॉनमी: "economique", इकोनॉमी: "economique",
    एक: "1", दो: "2", तीन: "3", चार: "4", पाँच: "5", पांच: "5", छह: "6", छः: "6", सात: "7", आठ: "8", नौ: "9", दस: "10",
    अनदेखा: "ignore", "नज़रअंदाज़": "ignore", निर्देश: "instructions", निर्देशों: "instructions", नियम: "regles", "अब तुम": "tu es maintenant",
  },
};

export default hi;
