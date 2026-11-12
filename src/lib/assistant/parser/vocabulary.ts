/**
 * Vocabulaire du parseur (mots normalisés : minuscules, sans accents). Les mots-clés de service décident des
 * actions ; STOP_WORDS liste les mots jamais corrigés en nom de lieu (« pars » n'est pas « Paris »,
 * « montrer » n'est pas « Montréal », « Irlande » n'est pas « Islande »).
 */

export const FLIGHT_WORDS = new Set(["vol", "vols", "avion", "avions", "billet", "billets", "allerretour", "allersimple", "aerien", "aerienne", "aeriens", "decoller", "envoler", "compagnie"]);
export const HOTEL_WORDS = new Set(["hotel", "hotels", "hebergement", "hebergements", "logement", "logements", "loger", "dormir", "nuit", "nuits", "nuitee", "nuitees", "chambre", "chambres", "auberge", "appartement", "airbnb", "gite"]);
export const CAR_WORDS = new Set(["voiture", "voitures", "location", "louer", "loue", "conduire", "vehicule", "roadtrip", "permis", "conducteur", "conductrice", "suv", "decapotable"]);
/** Organisation explicite d'un voyage : toujours un voyage prérempli (avec les services cités). */
export const PLAN_STRONG = new Set(["organise", "organiser", "organisez", "organises", "planifie", "planifier", "planifiez", "itineraire", "carnet"]);
/** Voyage au sens large : voyage prérempli seulement si aucun service n'est cité. */
export const PLAN_WEAK = new Set(["voyage", "voyages", "voyager", "sejour", "sejours", "vacances", "escapade", "circuit", "visiter"]);
/** Découverte d'une destination (fiche). */
export const DISCOVER_WORDS = new Set(["decouvrir", "decouvre", "decouverte", "infos", "info", "information", "informations", "renseignement", "renseignements", "fiche", "idees", "idee", "inspiration"]);
/** Formulations de découverte en plusieurs mots (texte normalisé) : « montre-moi Bali », « en savoir plus sur… ». */
export const DISCOVER_PHRASES = /\b(?:montre|montrez|parle|parlez) moi\b|\ben savoir plus\b|\bc est comment\b/;
/** Réserver ou payer : jamais exécuté, signalé au visiteur. */
export const BOOKING_WORDS = new Set(["reserve", "reserver", "reservez", "reservation", "payer", "paie", "paye", "payez", "paiement", "achete", "acheter", "achat", "commande", "commander", "carte", "cb", "regle", "regler"]);

export const UNIT_WORDS = new Set([
  "jour", "jours", "j", "nuit", "nuits", "nuitee", "nuitees", "semaine", "semaines", "mois", "an", "ans", "heure", "heures", "h", "minutes", "min", "km", "euros", "euro", "eur",
  "chambre", "chambres", "enfant", "enfants", "adulte", "adultes", "bebe", "bebes", "personne", "personnes", "voyageur", "voyageurs", "pers", "passager", "passagers", "pax",
  "weekend", "fois", "etoiles", "valises", "bagages", "ado", "ados", "adolescent", "adolescents",
]);

export const STOP_WORDS = new Set([
  // Faux amis proches de noms de lieux.
  "pars", "part", "parts", "pari", "paris", "parti", "partie", "partir", "partons", "partez", "parle", "parler", "montre", "montrer", "montrez", "montres", "rose", "rame", "rime",
  "lion", "leon", "bail", "balai", "grace", "italien", "italienne", "jupon", "irlande", "venir", "vienne", "nice", "marco", "maree", "madame", "monde", "mondial", "rouen",
  "lisons", "lise", "lyse", "nante", "dome", "home", "tome", "come", "rome", "romain", "romaine", "romantique", "japonais", "portugais", "grecque", "marocain", "canadien",
  // Mots du parseur.
  ...FLIGHT_WORDS, ...HOTEL_WORDS, ...CAR_WORDS, ...PLAN_STRONG, ...PLAN_WEAK, ...DISCOVER_WORDS, ...BOOKING_WORDS, ...UNIT_WORDS,
  "janvier", "fevrier", "mars", "avril", "juin", "juillet", "aout", "septembre", "octobre", "novembre", "decembre",
  "lundi", "mardi", "mercredi", "jeudi", "vendredi", "samedi", "dimanche", "demain", "aujourdhui", "apresdemain", "hier", "prochain", "prochaine", "dernier", "derniere",
  "debut", "milieu", "fin", "courant", "dans", "pour", "avec", "sans", "depuis", "vers", "entre", "jusqu", "apres", "avant", "pendant", "chez", "sous", "selon",
  "deux", "trois", "quatre", "cinq", "sept", "huit", "neuf", "onze", "douze", "treize", "quatorze", "quinze", "seize", "vingt", "trente", "premier", "premiere",
  "famille", "couple", "seul", "seule", "solo", "amis", "amies", "copain", "copine", "femme", "mari", "epoux", "epouse", "fils", "fille", "filles", "parents", "pere", "mere", "frere", "soeur", "compagne", "compagnon", "conjoint", "conjointe", "partenaire", "amoureux", "nous", "vous",
  "economie", "economique", "economy", "premium", "business", "affaires", "classe", "first",
  "aller", "allez", "allons", "retour", "retours", "rentrer", "rentre", "rendre", "rendue", "rendu", "prise", "prendre", "depart", "arrivee", "arriver", "midi", "minuit", "matin", "soir",
  "bonjour", "salut", "merci", "bonsoir", "aide", "cherche", "chercher", "trouve", "trouver", "veux", "voudrais", "voulons", "aimerais", "souhaite", "besoin", "peux", "pouvez", "faire", "plus", "moins",
  "quel", "quelle", "quels", "quelles", "comment", "quand", "combien", "pourquoi", "cette", "cela", "celui", "votre", "notre", "leur", "leurs", "elle", "elles", "tout", "tous", "toutes",
  "beau", "belle", "pas", "cher", "chere", "petit", "petite", "grand", "grande", "bien", "tres", "sympa", "soleil", "plage", "plages", "mer", "montagne", "neige", "ville", "villes", "pays",
  "ignore", "ignorez", "oublie", "oubliez", "instructions", "consignes", "regles", "prompt", "systeme", "poeme", "blague", "histoire", "recette", "code",
]);
