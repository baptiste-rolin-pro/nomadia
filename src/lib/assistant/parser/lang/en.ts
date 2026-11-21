import type { LangPack } from "@/lib/assistant/parser/lang/types";

const hour = (h: string, ap: string) => {
  const n = Number(h) % 12;
  return String(ap.toLowerCase().startsWith("p") ? n + 12 : n);
};

/** Anglais. */
const en: LangPack = {
  locale: "en",
  monthFirst: true,
  dropDeInDates: true,
  lowercaseNotPlace: ["nice"],
  pre: [
    // « 2pm », « 10:30 am » → « 14h », « 10h30 ».
    [/\b(\d{1,2})(?::(\d{2}))?\s*([ap])\.?\s?m\b\.?/gi, (_m, h, mm, ap) => `${hour(h, ap)}h${mm ?? ""}`],
    [/\b(i'?m|i am)\s+(\d{2})\b(?!\s*(?:years?|yrs?))/gi, "$1 $2 years"],
    [/\b(\d{2})[\s-]*years?[\s-]*old\s+driver\b/gi, "driver aged $1 years"],
    [/\bin\s+(\d+|a|an|one|two|three|four|five|six|seven|eight|nine|ten)\s+(days?|weeks?|months?)\b/gi, "within $1 $2"],
    [/\b(belgian|french|swiss|canadian|german|spanish|italian|british|luxembourgish)\s+(?:driving\s+)?licen[cs]e\b/gi, "licence $1"],
  ],
  words: {
    // Services
    flight: "vol", flights: "vol", fly: "vol", flying: "vol", airfare: "vol", plane: "avion", airplane: "avion", ticket: "billet", tickets: "billet",
    "round trip": "aller-retour", roundtrip: "aller-retour", "return flight": "aller-retour", "return ticket": "aller-retour", "return tickets": "aller-retour",
    "one way": "aller simple", oneway: "aller simple", "single ticket": "aller simple",
    hotel: "hotel", hotels: "hotel", accommodation: "hebergement", accommodations: "hebergement", lodging: "hebergement", "place to stay": "hebergement", "where to stay": "hebergement",
    room: "chambre", rooms: "chambres", stay: "sejour", staying: "sejour", hostel: "auberge", apartment: "appartement", night: "nuit", nights: "nuits", sleep: "dormir",
    car: "voiture", cars: "voiture", "car rental": "location voiture", "rental car": "location voiture", "car hire": "location voiture", "hire car": "location voiture", rent: "louer", rental: "location", hire: "louer",
    drive: "conduire", driving: "conduire", driver: "conducteur", vehicle: "vehicule", "road trip": "roadtrip", roadtrip: "roadtrip", suv: "suv", convertible: "decapotable",
    // Voyage, découverte
    plan: "planifie", planning: "planifie", organize: "organise", organise: "organise", itinerary: "itineraire", trip: "voyage", trips: "voyage", journey: "voyage", travel: "voyager",
    vacation: "vacances", holiday: "vacances", holidays: "vacances", getaway: "escapade", visit: "visiter", visiting: "visiter",
    discover: "decouvrir", explore: "decouvrir", info: "infos", information: "infos", "tell me about": "infos", "more about": "infos", "show me": "montre moi", ideas: "idees", inspiration: "inspiration",
    // Réservation (jamais exécutée)
    book: "reserver", booking: "reservation", reserve: "reserver", reservation: "reservation", pay: "payer", payment: "paiement", buy: "acheter", purchase: "acheter", "credit card": "carte", card: "carte", checkout: "payer",
    // Mots outils
    from: "de", "from the": "du", to: "a", in: "en", into: "en", at: "a", towards: "vers", toward: "vers", for: "pour", with: "avec", between: "entre", and: "et", on: "le", of: "de", the: "", a: "un", an: "un",
    until: "jusqu au", till: "jusqu au", through: "jusqu au", within: "dans", starting: "a partir du", "starting on": "a partir du", "starting from": "a partir du", "as of": "a partir du", "from the start of": "debut",
    return: "retour", returning: "retour", back: "retour", "coming back": "retour", "drop off": "rendre", "drop it off": "rendre", dropoff: "rendre", "return it": "rendre", "return the car": "rendre", "pick up": "prise", pickup: "prise", collect: "prise",
    noon: "midi", midday: "midi", midnight: "minuit", morning: "matin", evening: "soir", tonight: "ce soir",
    // Dates
    january: "janvier", jan: "janvier", february: "fevrier", feb: "fevrier", march: "mars", mar: "mars", april: "avril", apr: "avril", may: "mai", june: "juin", jun: "juin",
    july: "juillet", jul: "juillet", august: "aout", aug: "aout", september: "septembre", sep: "septembre", sept: "septembre", october: "octobre", oct: "octobre", november: "novembre", nov: "novembre", december: "decembre", dec: "decembre",
    monday: "lundi", tuesday: "mardi", wednesday: "mercredi", thursday: "jeudi", friday: "vendredi", saturday: "samedi", sunday: "dimanche",
    "next monday": "lundi prochain", "next tuesday": "mardi prochain", "next wednesday": "mercredi prochain", "next thursday": "jeudi prochain", "next friday": "vendredi prochain", "next saturday": "samedi prochain", "next sunday": "dimanche prochain",
    "this friday": "ce vendredi", "this saturday": "ce samedi", "this monday": "ce lundi",
    today: "aujourd'hui", tomorrow: "demain", "day after tomorrow": "apres-demain", "the day after tomorrow": "apres-demain",
    "this weekend": "ce week-end", "this week end": "ce week-end", "next weekend": "le week-end prochain", "next week end": "le week-end prochain", weekend: "week-end", "week end": "week-end", weekends: "week-end",
    "next week": "la semaine prochaine", "this week": "cette semaine", "next month": "le mois prochain",
    week: "semaine", weeks: "semaines", day: "jour", days: "jours", month: "mois", months: "mois", fortnight: "quinzaine",
    early: "debut", "beginning of": "debut", "start of": "debut", "early in": "debut", mid: "mi", "middle of": "mi", late: "fin", "end of": "fin", "late in": "fin",
    // Voyageurs
    adult: "adulte", adults: "adultes", child: "enfant", children: "enfants", kid: "enfant", kids: "enfants", teen: "ado", teens: "ados", teenager: "ado", teenagers: "ados",
    baby: "bebe", babies: "bebes", infant: "bebe", infants: "bebes", toddler: "enfant", person: "personne", people: "personnes", persons: "personnes",
    traveller: "voyageur", travellers: "voyageurs", traveler: "voyageur", travelers: "voyageurs", passenger: "passager", passengers: "passagers", pax: "pax",
    family: "famille", "as a family": "en famille", "with my family": "en famille", "with family": "en famille", "with the family": "en famille",
    couple: "en couple", "as a couple": "en couple", "with my partner": "avec mon conjoint", alone: "seul", solo: "seul", "on my own": "seul", "by myself": "seul",
    "with friends": "entre amis", "with some friends": "entre amis", "with my friends": "avec mes amis", "group of friends": "entre amis", friends: "amis",
    "we are": "nous sommes", "we re": "nous sommes", "there are": "nous sommes", "the two of us": "nous deux", "two of us": "nous deux", "just the two of us": "nous deux",
    "my wife": "ma femme", "my husband": "mon mari", "my partner": "mon conjoint", "my girlfriend": "ma copine", "my boyfriend": "mon copain", "my friend": "mon ami",
    "my mother": "ma mere", "my mom": "ma mere", "my mum": "ma mere", "my father": "mon pere", "my dad": "mon pere", "my sister": "ma soeur", "my brother": "mon frere",
    "my son": "mon fils", "my daughter": "ma fille", "my kids": "mes enfants", "my children": "mes enfants", "our kids": "nos enfants", "our children": "nos enfants", "my baby": "mon bebe", "our baby": "notre bebe", "my parents": "mes parents",
    years: "ans", year: "ans", "years old": "ans", "year old": "ans", yrs: "ans", yo: "ans", old: "", aged: "age", age: "age", ages: "ages",
    "i am": "j ai", "i m": "j ai", live: "habite", lives: "habite", living: "habite", reside: "reside", resident: "resident", based: "reside",
    licence: "permis", license: "permis", belgian: "belge", french: "francais", swiss: "suisse", canadian: "canadien", german: "allemand", spanish: "espagnol", italian: "italien", british: "britannique", luxembourgish: "luxembourgeois", uk: "uk",
    young: "jeune", "young driver": "jeune conducteur",
    // Vols
    "business class": "classe affaires", business: "business", "first class": "premiere classe", "premium economy": "premium", premium: "premium", economy: "economique", "economy class": "economique",
    // Nombres
    one: "1", two: "2", three: "3", four: "4", five: "5", six: "6", seven: "7", eight: "8", nine: "9", ten: "10", eleven: "11", twelve: "12", fifteen: "15", twenty: "20",
    // Consignes (détection d'injection)
    ignore: "ignore", forget: "oublie", instructions: "instructions", instruction: "instructions", rules: "regles", "system prompt": "prompt systeme", prompt: "prompt", "you are now": "tu es maintenant", "developer mode": "mode developpeur", jailbreak: "jailbreak", "api key": "cle api",
  },
};

export default en;
