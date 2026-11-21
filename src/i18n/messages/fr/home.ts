/** Accueil (sections éditoriales, hero, aperçu du carnet, itinéraires, ambiances). */
const home = {
  meta: {
    jsonLdName: "Nomadia",
  },
  hero: {
    eyebrow: "Destinations, vols, hôtels et voitures",
    /** Mots du titre, animés un par un. */
    words: ["Votre", "prochaine", "histoire", "s'écrit", "ailleurs."],
    intro: "Trouvez l'envie de partir, construisez un voyage daté et cohérent, puis réservez chaque prestation en sachant exactement ce que vous achetez.",
    videoCredit: "Vidéo d'illustration : {author}, {platform}",
    posterAlt: "Littoral vu du ciel : collines de maquis au-dessus d'une mer bleue (image d'illustration)",
    searchLabel: "Rechercher",
    pause: "Pause",
    play: "Lecture",
    motionSr: " de l'animation du bandeau",
    routeFrom: "Paris",
    /** Coordonnées : N, S, E, O. */
    north: "N",
    south: "S",
    east: "E",
    west: "O",
  },
  destinations: {
    eyebrow: "Destinations à explorer",
    title: "Douze départs, choisis pour leur lumière et leur rythme.",
    intro: "Chaque destination a sa page : idées de séjour, saisons, formalités renvoyées aux sources officielles et recherches préremplies.",
    all: "Toutes les destinations",
    demoOffers: "Offres de démonstration",
  },
  routes: {
    eyebrow: "Au départ de Paris",
    title: "Trois villes prêtes à réserver, de l'avion à la voiture.",
    intro: "Lisbonne, Rome et Reykjavik disposent d'offres de démonstration pour les vols, les hébergements et la location. Choisissez une ville : les trois recherches partagent les mêmes dates.",
    listLabel: "Villes au départ de Paris",
    from: "Paris",
    fromCode: "PAR",
    roundTrip: "Aller-retour · {detail}",
    seeFlights: "Voir les vols",
    seeFlightsSr: " Paris → {city}",
    hotels: "Hôtels",
    hotelsSr: " à {city}",
    car: "Voiture",
    carSr: " de location à {city}",
  },
  ambiance: {
    eyebrow: "Choisir une ambiance",
    title: "Mer, montagne ou grande ville ?",
    groupLabel: "Ambiance de voyage",
    selected: "Sélectionné : ",
    count: "{n, plural, one {# destination} other {# destinations}}.",
    listLabel: "Destinations — {label}",
  },
  plan: {
    eyebrow: "Préparer un voyage",
    title: "Un carnet qui garde le voyage cohérent, jour après jour.",
    steps: [
      { title: "Choisir ses dates", text: "Le voyage commence par une période, des voyageurs et un budget cible. Changer les dates signale les prix à actualiser." },
      { title: "Comparer les services", text: "Vols, hébergements et voitures se comparent avec leurs conditions réelles : bagages, annulation, dépôt de garantie." },
      { title: "Retrouver son itinéraire", text: "La timeline signale les nuits sans hébergement, une voiture prise avant l'atterrissage ou une arrivée tardive. Rien n'est corrigé sans vous." },
    ],
    cta: "Organiser mon voyage",
  },
  carnet: {
    title: "Carnet — Islande en 5 jours",
    badge: "Aperçu d'exemple",
    chooseDay: "Choisir un jour",
    days: [
      {
        label: "Jour 1",
        title: "Arrivée tardive",
        items: ["Vol Paris → Keflavík (exemple)", "Atterrissage, heure locale", "Nuit près de l'aéroport, accueil 24 h/24"],
        alert: "Agence de location fermée à l'arrivée : prise en charge proposée le lendemain à 6 h, à confirmer par vous.",
      },
      {
        label: "Jour 2",
        title: "Prise du véhicule",
        items: ["Voiture compacte « ou similaire »", "Maison d'hôtes à Reykjavik"],
        alert: null,
      },
      {
        label: "Jour 5",
        title: "Retour",
        items: ["Restitution du véhicule", "Vol retour"],
        alert: "Marge de transfert : 90 minutes entre la restitution et le décollage, modifiable.",
      },
    ],
  },
  guides: {
    eyebrow: "Guides pratiques",
    title: "Comprendre avant de réserver.",
  },
  trust: {
    eyebrow: "Transparence",
    title: "Comment fonctionnent les réservations sur Nomadia",
    p1: "Chaque prestation est réservée séparément auprès de son fournisseur. Le tunnel affiche l'interlocuteur responsable, qui encaisse, ce qui est payé maintenant et ce qui reste à régler sur place.",
    p2: "Avant tout paiement, le prix et la disponibilité sont vérifiés à nouveau. Si le prix change, vous devez l'accepter explicitement.",
    demoStrong: "Cette version est une démonstration :",
    demoText: " les offres sont fictives, aucun paiement n'est encaissé et aucune réservation n'est transmise à un fournisseur réel. Nous n'affichons ni avis clients ni note : aucune source vérifiée n'existe pour ces offres.",
    more: "En savoir plus",
    faq: "Questions fréquentes",
  },
};

export default home;
