/**
 * Sélection éditoriale de 12 destinations. Textes originaux rédigés pour Nomadia.
 * Les conseils saisonniers restent qualitatifs et renvoient à des sources officielles ;
 * les formalités renvoient aux « Conseils aux voyageurs » du ministère français des Affaires étrangères.
 * Aucune information ne constitue une garantie d'entrée ou de sécurité.
 */
export type Ambiance = "mer" | "nature" | "city-break" | "aventure" | "culture" | "road-trip";

export const AMBIANCES: { id: Ambiance; label: string; description: string }[] = [
  { id: "mer", label: "Mer", description: "Littoraux, baies et lumière sur l'eau." },
  { id: "nature", label: "Nature", description: "Montagnes, rizières, grands espaces." },
  { id: "city-break", label: "City break", description: "Quelques jours en ville, à pied ou en tram." },
  { id: "aventure", label: "Aventure", description: "Randonnées exigeantes et météo à surveiller." },
  { id: "culture", label: "Culture", description: "Sites historiques, musées, quartiers anciens." },
  { id: "road-trip", label: "Road trip", description: "Itinéraires à parcourir en voiture." },
];

export interface SourceLink {
  label: string;
  url: string;
}

export interface Destination {
  slug: string;
  name: string;
  country: string;
  region: string;
  tagline: string;
  intro: string[];
  stayType: string;
  ambiances: Ambiance[];
  duration: { min: number; max: number };
  location: { summary: string; timeZone: string; airports: string[] };
  ideas: { title: string; text: string }[];
  seasons: { period: string; text: string }[];
  seasonSources: SourceLink[];
  formalities: SourceLink;
  heroPhoto: string;
  gallery: string[];
  demoOffers: boolean;
  search: { flights: string; hotels: string | null; cars: string | null };
}

const diplomatie = (country: string, slug: string): SourceLink => ({
  label: `France Diplomatie — Conseils aux voyageurs : ${country}`,
  url: `https://www.diplomatie.gouv.fr/fr/conseils-aux-voyageurs/conseils-par-pays-destination/${slug}/`,
});

export const DESTINATIONS: Destination[] = [
  {
    slug: "lisbonne",
    name: "Lisbonne",
    country: "Portugal",
    region: "Estuaire du Tage",
    tagline: "Sept collines, des tramways qui grincent et la lumière du Tage.",
    intro: [
      "Lisbonne se découvre en montant et en descendant : escaliers d'Alfama, belvédères ouverts sur l'estuaire, rues commerçantes de la Baixa reconstruite après le séisme de 1755.",
      "La ville se prête bien à un premier voyage en couple sur quatre ou cinq jours, avec une journée hors les murs vers Sintra ou la côte de Cascais par le train.",
    ],
    stayType: "City break",
    ambiances: ["city-break", "culture", "mer"],
    duration: { min: 3, max: 5 },
    location: { summary: "Capitale du Portugal, sur la rive nord de l'estuaire du Tage. L'aéroport Humberto Delgado est proche du centre.", timeZone: "Europe/Lisbon", airports: ["LIS"] },
    ideas: [
      { title: "Alfama à l'aube", text: "Partir tôt du château Saint-Georges et descendre vers le fleuve par les ruelles, avant l'arrivée des groupes." },
      { title: "Belém en fin de journée", text: "Rejoindre Belém en tram ou en train de banlieue, puis longer les quais jusqu'au coucher du soleil." },
      { title: "Une journée à Sintra", text: "Prendre le train depuis la gare du Rossio et réserver les palais à l'avance : les créneaux se remplissent." },
    ],
    seasons: [
      { period: "Printemps et automne", text: "Températures généralement agréables pour marcher ; prévoir une couche pour le vent du soir." },
      { period: "Été", text: "Chaud et sec, forte fréquentation ; privilégier les visites tôt le matin." },
      { period: "Hiver", text: "Doux mais plus pluvieux ; les pavés deviennent glissants." },
    ],
    seasonSources: [
      { label: "IPMA — Institut portugais de la mer et de l'atmosphère", url: "https://www.ipma.pt/en/" },
      { label: "Visit Lisboa — office de tourisme", url: "https://www.visitlisboa.com/" },
    ],
    formalities: diplomatie("Portugal", "portugal"),
    heroPhoto: "lisbonne-1",
    gallery: ["lisbonne-2", "lisbonne-3"],
    demoOffers: true,
    search: { flights: "city:LIS", hotels: "city:LIS", cars: "airport:LIS" },
  },
  {
    slug: "rome",
    name: "Rome",
    country: "Italie",
    region: "Latium",
    tagline: "Vingt-sept siècles empilés, à parcourir à pied.",
    intro: [
      "À Rome, les époques se superposent dans un périmètre étonnamment compact : forums antiques, églises baroques, places animées et quartiers résidentiels comme Prati ou Monti.",
      "Pour une famille, la ville fonctionne bien avec un hébergement central, des journées courtes et une pause chaque après-midi.",
    ],
    stayType: "Culture",
    ambiances: ["culture", "city-break"],
    duration: { min: 4, max: 6 },
    location: { summary: "Capitale de l'Italie, dans le Latium. Deux aéroports : Fiumicino (principal) et Ciampino.", timeZone: "Europe/Rome", airports: ["FCO", "CIA"] },
    ideas: [
      { title: "Colisée et forums", text: "Réserver un créneau horaire officiel et prévoir une demi-journée : le site est vaste et peu ombragé." },
      { title: "Trastevere en soirée", text: "Traverser le Tibre par le pont Sisto puis monter au Janicule pour la vue sur les toits." },
      { title: "Rythme familial", text: "Alterner un grand site le matin et un parc l'après-midi, par exemple la villa Borghèse." },
    ],
    seasons: [
      { period: "Avril–juin, septembre–octobre", text: "Saisons souvent les plus confortables pour les visites en extérieur." },
      { period: "Juillet–août", text: "Chaleur marquée ; prévoir de l'eau et les visites au frais." },
      { period: "Hiver", text: "Plus calme et doux, avec des journées pluvieuses." },
    ],
    seasonSources: [
      { label: "Aeronautica Militare — service météorologique italien", url: "https://www.meteoam.it/" },
      { label: "Turismo Roma — office de tourisme de Rome", url: "https://www.turismoroma.it/" },
    ],
    formalities: diplomatie("Italie", "italie"),
    heroPhoto: "rome-1",
    gallery: ["rome-2", "rome-3"],
    demoOffers: true,
    search: { flights: "city:ROM", hotels: "city:ROM", cars: "airport:FCO" },
  },
  {
    slug: "reykjavik",
    name: "Reykjavik",
    country: "Islande",
    region: "Région de la capitale",
    tagline: "Une capitale à taille humaine, porte d'entrée des grands espaces.",
    intro: [
      "Reykjavik se parcourt en une journée, mais sert surtout de point de départ : péninsule de Reykjanes, Cercle d'or, côte sud. Beaucoup de vols arrivent tard le soir.",
      "Une arrivée nocturne demande d'anticiper la première nuit et la prise du véhicule : les agences de location ne sont pas toutes ouvertes à minuit.",
    ],
    stayType: "Road trip",
    ambiances: ["road-trip", "nature", "aventure"],
    duration: { min: 5, max: 10 },
    location: { summary: "Capitale de l'Islande. L'aéroport international de Keflavík se trouve à environ 50 km, sur la péninsule de Reykjanes.", timeZone: "Atlantic/Reykjavik", airports: ["KEF"] },
    ideas: [
      { title: "Première nuit près de l'aéroport", text: "Après un vol tardif, dormir à Reykjanesbær et prendre la voiture le lendemain matin." },
      { title: "Cercle d'or", text: "Þingvellir, Geysir et Gullfoss en une boucle d'une journée, à adapter à la météo." },
      { title: "Côte sud", text: "Cascades et plages de sable noir : vérifier vents et état des routes avant chaque étape." },
    ],
    seasons: [
      { period: "Juin–août", text: "Jours très longs ; les routes de l'intérieur (pistes F) ouvrent en général pendant l'été seulement." },
      { period: "Septembre–avril", text: "Possibilité d'aurores boréales par nuit claire ; conditions routières hivernales fréquentes." },
      { period: "Toute l'année", text: "Météo changeante : consulter les prévisions et l'état des routes chaque jour." },
    ],
    seasonSources: [
      { label: "Veðurstofa Íslands — office météorologique islandais", url: "https://en.vedur.is/" },
      { label: "Umferðin — état des routes (Vegagerðin)", url: "https://umferdin.is/en" },
      { label: "Safetravel — conseils de sécurité", url: "https://safetravel.is/" },
    ],
    formalities: diplomatie("Islande", "islande"),
    heroPhoto: "reykjavik-1",
    gallery: ["reykjavik-2", "reykjavik-3"],
    demoOffers: true,
    search: { flights: "airport:KEF", hotels: "city:REK", cars: "airport:KEF" },
  },
  {
    slug: "marrakech",
    name: "Marrakech",
    country: "Maroc",
    region: "Marrakech-Safi",
    tagline: "La médina, ses souks et l'Atlas à l'horizon.",
    intro: [
      "Marrakech alterne effervescence et calme : la place Jemaa el-Fna et les souks d'un côté, les riads et les jardins de l'autre.",
      "Les contreforts de l'Atlas sont accessibles à la journée, mais demandent un rythme tranquille et des pauses à l'ombre.",
    ],
    stayType: "City break",
    ambiances: ["culture", "city-break"],
    duration: { min: 3, max: 5 },
    location: { summary: "Ville du centre du Maroc, au pied du Haut Atlas. Aéroport Marrakech-Ménara proche de la ville.", timeZone: "Africa/Casablanca", airports: ["RAK"] },
    ideas: [
      { title: "Souks le matin", text: "Entrer dans la médina tôt, quand les ruelles sont encore fraîches et calmes." },
      { title: "Jardins", text: "Prévoir une pause dans un jardin aux heures chaudes de l'après-midi." },
      { title: "Vallée de l'Ourika", text: "Une sortie à la journée vers l'Atlas, avec un guide local agréé si vous randonnez." },
    ],
    seasons: [
      { period: "Printemps et automne", text: "Saisons généralement les plus agréables pour la ville et l'Atlas." },
      { period: "Été", text: "Très chaud ; adapter les horaires de visite." },
      { period: "Hiver", text: "Journées douces, nuits fraîches ; neige possible sur les sommets de l'Atlas." },
    ],
    seasonSources: [
      { label: "Direction générale de la météorologie du Maroc", url: "https://www.marocmeteo.ma/" },
      { label: "Visit Morocco — office national marocain du tourisme", url: "https://www.visitmorocco.com/fr" },
    ],
    formalities: diplomatie("Maroc", "maroc"),
    heroPhoto: "marrakech-1",
    gallery: ["marrakech-2", "marrakech-3"],
    demoOffers: false,
    search: { flights: "city:N-RAK", hotels: null, cars: null },
  },
  {
    slug: "madere",
    name: "Madère",
    country: "Portugal",
    region: "Région autonome de Madère",
    tagline: "Une île verticale, entre mer de nuages et levadas.",
    intro: [
      "Madère est une île de randonnée : sentiers de crête au-dessus des nuages et levadas, ces canaux d'irrigation longés de chemins étroits.",
      "Funchal, la capitale, sert de base confortable ; une voiture aide à rejoindre les départs de sentiers, sur des routes très pentues.",
    ],
    stayType: "Nature",
    ambiances: ["nature", "aventure", "mer"],
    duration: { min: 5, max: 8 },
    location: { summary: "Archipel portugais de l'Atlantique, au large du Maroc. Aéroport de Madère près de Santa Cruz, à l'est de Funchal.", timeZone: "Atlantic/Madeira", airports: ["FNC"] },
    ideas: [
      { title: "Lever du jour au Pico do Areeiro", text: "Monter avant l'aube pour voir la mer de nuages, en vérifiant l'ouverture du sentier." },
      { title: "Levadas", text: "Choisir un itinéraire adapté à son niveau : certains passages sont exposés." },
      { title: "Funchal", text: "Marché, vieille ville et jardins, à découvrir à pied." },
    ],
    seasons: [
      { period: "Toute l'année", text: "Climat généralement doux, mais très variable selon l'altitude et le versant de l'île." },
      { period: "Avant chaque randonnée", text: "Consulter l'état des sentiers publié par les autorités régionales : certains sont fermés après des intempéries." },
    ],
    seasonSources: [
      { label: "IFCN — Institut des forêts et de la conservation de la nature de Madère", url: "https://ifcn.madeira.gov.pt/" },
      { label: "Visit Madeira — office de tourisme", url: "https://visitmadeira.com/" },
    ],
    formalities: diplomatie("Portugal", "portugal"),
    heroPhoto: "madere-1",
    gallery: ["madere-2", "madere-3"],
    demoOffers: false,
    search: { flights: "airport:FNC", hotels: null, cars: null },
  },
  {
    slug: "athenes",
    name: "Athènes",
    country: "Grèce",
    region: "Attique",
    tagline: "L'Acropole au-dessus des toits, la mer à une heure.",
    intro: [
      "Athènes ne se résume pas à l'Acropole : quartiers de Plaka et Anafiotika, collines de Philopappos et du Lycabette, marchés et musées.",
      "La ville se combine facilement avec quelques jours sur une île du golfe Saronique, accessible en ferry depuis le Pirée.",
    ],
    stayType: "Culture",
    ambiances: ["culture", "city-break", "mer"],
    duration: { min: 3, max: 5 },
    location: { summary: "Capitale de la Grèce, en Attique. L'aéroport international est à l'est de la ville, relié par métro.", timeZone: "Europe/Athens", airports: ["ATH"] },
    ideas: [
      { title: "Acropole à l'ouverture", text: "Réserver un créneau officiel tôt le matin et poursuivre au musée de l'Acropole." },
      { title: "Philopappos au coucher du soleil", text: "La vue sur le Parthénon depuis cette colline boisée est l'une des plus belles." },
      { title: "Une île proche", text: "Égine ou Hydra se rejoignent en ferry pour une journée ou un séjour prolongé." },
    ],
    seasons: [
      { period: "Avril–juin, septembre–octobre", text: "Conditions souvent plus confortables pour les sites archéologiques en plein air." },
      { period: "Été", text: "Chaud et sec ; épisodes de canicule possibles, certains sites adaptent leurs horaires." },
    ],
    seasonSources: [
      { label: "EMY (HNMS) — service météorologique national grec", url: "https://www.emy.gr/" },
      { label: "This is Athens — office de tourisme de la ville", url: "https://www.thisisathens.org/" },
    ],
    formalities: diplomatie("Grèce", "grece"),
    heroPhoto: "athenes-1",
    gallery: ["athenes-2", "athenes-3"],
    demoOffers: false,
    search: { flights: "airport:ATH", hotels: null, cars: null },
  },
  {
    slug: "kyoto",
    name: "Kyoto",
    country: "Japon",
    region: "Kansai",
    tagline: "Temples en bois, ruelles calmes et jardins de mousse.",
    intro: [
      "Ancienne capitale impériale, Kyoto concentre des centaines de temples et sanctuaires. Les plus connus sont très fréquentés ; les quartiers du nord et de l'est restent paisibles tôt le matin.",
      "On y arrive généralement par l'aéroport du Kansai, à Osaka, puis en train : comptez une à deux heures selon la liaison choisie.",
    ],
    stayType: "Culture",
    ambiances: ["culture", "nature"],
    duration: { min: 4, max: 7 },
    location: { summary: "Ville du Kansai, sur l'île de Honshū. Pas d'aéroport à Kyoto : l'aéroport du Kansai (KIX) est le plus utilisé.", timeZone: "Asia/Tokyo", airports: ["KIX"] },
    ideas: [
      { title: "Fushimi Inari tôt", text: "Monter parmi les torii à l'aube, avant l'affluence, et continuer au-delà des premiers points de vue." },
      { title: "Higashiyama à pied", text: "Du Kiyomizu-dera au sanctuaire Yasaka par les ruelles pavées." },
      { title: "Arashiyama", text: "Bambouseraie, jardin du Tenryū-ji et bord de rivière, à combiner sur une journée." },
    ],
    seasons: [
      { period: "Printemps et automne", text: "Floraison des cerisiers et couleurs des érables : périodes très demandées, à réserver tôt." },
      { period: "Juin–juillet", text: "Saison des pluies, puis été chaud et humide." },
      { period: "Fin d'été et automne", text: "Typhons possibles : suivre les avis de l'agence météorologique japonaise." },
    ],
    seasonSources: [
      { label: "JMA — agence météorologique du Japon", url: "https://www.jma.go.jp/jma/indexe.html" },
      { label: "Kyoto City Official Travel Guide", url: "https://kyoto.travel/en/" },
    ],
    formalities: diplomatie("Japon", "japon"),
    heroPhoto: "kyoto-1",
    gallery: ["kyoto-2", "kyoto-3"],
    demoOffers: false,
    search: { flights: "airport:KIX", hotels: null, cars: null },
  },
  {
    slug: "bali",
    name: "Bali",
    country: "Indonésie",
    region: "Petites îles de la Sonde",
    tagline: "Rizières en terrasses, temples d'eau et volcans.",
    intro: [
      "Au-delà des plages du sud, Bali révèle un intérieur montagneux : rizières autour d'Ubud, temples au bord des lacs de cratère, volcans à gravir de nuit.",
      "Les distances sont courtes sur la carte mais longues sur la route : mieux vaut changer peu de fois d'hébergement.",
    ],
    stayType: "Nature",
    ambiances: ["nature", "mer", "culture"],
    duration: { min: 7, max: 14 },
    location: { summary: "Île indonésienne entre Java et Lombok. Aéroport international Ngurah Rai, au sud de l'île.", timeZone: "Asia/Makassar", airports: ["DPS"] },
    ideas: [
      { title: "Ubud et ses rizières", text: "Marcher entre les rizières tôt le matin, quand la lumière est douce." },
      { title: "Lac Bratan", text: "Le temple Ulun Danu Bratan, souvent dans la brume, dans la fraîcheur des hauteurs." },
      { title: "Côte est", text: "Villages de pêcheurs et snorkeling, loin de l'agitation du sud." },
    ],
    seasons: [
      { period: "Avril–octobre (environ)", text: "Saison plutôt sèche, période la plus demandée." },
      { period: "Novembre–mars (environ)", text: "Saison humide : averses fréquentes, souvent en fin de journée." },
    ],
    seasonSources: [
      { label: "BMKG — agence indonésienne de météorologie", url: "https://www.bmkg.go.id/" },
      { label: "Wonderful Indonesia — site officiel du tourisme", url: "https://www.indonesia.travel/" },
    ],
    formalities: diplomatie("Indonésie", "indonesie"),
    heroPhoto: "bali-1",
    gallery: ["bali-2", "bali-3"],
    demoOffers: false,
    search: { flights: "airport:DPS", hotels: null, cars: null },
  },
  {
    slug: "montreal",
    name: "Montréal",
    country: "Canada",
    region: "Québec",
    tagline: "Une île francophone, entre mont Royal et Saint-Laurent.",
    intro: [
      "Montréal vit au rythme de ses quartiers : le Vieux-Montréal et ses pavés, le Plateau et ses escaliers extérieurs, Mile End et ses cafés.",
      "Le mont Royal offre une respiration verte en plein centre, en été comme sous la neige.",
    ],
    stayType: "City break",
    ambiances: ["city-break", "culture"],
    duration: { min: 4, max: 7 },
    location: { summary: "Ville du Québec, sur une île du Saint-Laurent. Aéroport international Montréal-Trudeau, à l'ouest du centre.", timeZone: "America/Toronto", airports: ["YUL"] },
    ideas: [
      { title: "Belvédère Kondiaronk", text: "Monter à pied par les sentiers du parc du Mont-Royal pour la vue sur le centre." },
      { title: "Vieux-Montréal", text: "Basilique Notre-Dame, rue Saint-Paul et Vieux-Port, à parcourir sans se presser." },
      { title: "Marchés", text: "Jean-Talon ou Atwater pour goûter aux produits du Québec selon la saison." },
    ],
    seasons: [
      { period: "Été", text: "Chaud et parfois humide, saison des festivals." },
      { period: "Automne", text: "Couleurs des érables, températures qui baissent vite en fin de saison." },
      { period: "Hiver", text: "Long, froid et enneigé : prévoir un équipement adapté." },
    ],
    seasonSources: [
      { label: "Environnement et Changement climatique Canada — météo", url: "https://meteo.gc.ca/" },
      { label: "Tourisme Montréal", url: "https://www.mtl.org/fr" },
    ],
    formalities: diplomatie("Canada", "canada"),
    heroPhoto: "montreal-1",
    gallery: ["montreal-2", "montreal-3"],
    demoOffers: false,
    search: { flights: "airport:YUL", hotels: null, cars: null },
  },
  {
    slug: "le-cap",
    name: "Le Cap",
    country: "Afrique du Sud",
    region: "Cap-Occidental",
    tagline: "La montagne de la Table, deux océans et la route des vins.",
    intro: [
      "Le Cap s'étire entre la montagne de la Table et l'Atlantique. Bo-Kaap, le front de mer et les plages de Camps Bay se découvrent en quelques jours.",
      "La péninsule du Cap et les vignobles se prêtent à un road trip court, avec une voiture et des étapes raisonnables.",
    ],
    stayType: "Road trip",
    ambiances: ["road-trip", "nature", "mer"],
    duration: { min: 6, max: 10 },
    location: { summary: "Ville du Cap-Occidental, à la pointe sud-ouest de l'Afrique. Aéroport international du Cap à l'est du centre.", timeZone: "Africa/Johannesburg", airports: ["CPT"] },
    ideas: [
      { title: "Montagne de la Table", text: "Téléphérique ou randonnée selon le vent : le sommet ferme parfois par mauvais temps." },
      { title: "Péninsule du Cap", text: "Chapman's Peak, Boulders Beach et le cap de Bonne-Espérance en une boucle." },
      { title: "Vignobles", text: "Stellenbosch ou Franschhoek, avec un conducteur qui ne boit pas." },
    ],
    seasons: [
      { period: "Décembre–février", text: "Été austral, sec et souvent venteux." },
      { period: "Juin–août", text: "Hiver austral, plus frais et plus pluvieux." },
    ],
    seasonSources: [
      { label: "South African Weather Service", url: "https://www.weathersa.co.za/" },
      { label: "Cape Town Tourism", url: "https://www.capetown.travel/" },
    ],
    formalities: diplomatie("Afrique du Sud", "afrique-du-sud"),
    heroPhoto: "le-cap-1",
    gallery: ["le-cap-2", "le-cap-3"],
    demoOffers: false,
    search: { flights: "airport:CPT", hotels: null, cars: null },
  },
  {
    slug: "dolomites",
    name: "Dolomites",
    country: "Italie",
    region: "Vénétie, Trentin-Haut-Adige",
    tagline: "Tours de roche pâle, alpages et refuges.",
    intro: [
      "Les Dolomites dressent des tours calcaires spectaculaires au-dessus d'alpages ondulés. Les Tre Cime di Lavaredo en sont l'image la plus connue.",
      "La région se parcourt en voiture, de vallée en vallée, avec des randonnées à la journée ou de refuge en refuge.",
    ],
    stayType: "Aventure",
    ambiances: ["nature", "aventure", "road-trip"],
    duration: { min: 5, max: 9 },
    location: { summary: "Massif du nord-est de l'Italie. Aéroports les plus utilisés : Venise et Innsbruck, puis route vers les vallées.", timeZone: "Europe/Rome", airports: ["VCE", "INN"] },
    ideas: [
      { title: "Tour des Tre Cime", text: "Boucle classique autour des trois tours, à faire tôt pour éviter l'affluence." },
      { title: "Alpages", text: "Seceda ou l'Alpe di Siusi pour des marches faciles avec des vues immenses." },
      { title: "Une nuit en refuge", text: "Réserver longtemps à l'avance et vérifier les dates d'ouverture saisonnières." },
    ],
    seasons: [
      { period: "Fin juin–septembre (selon l'enneigement)", text: "Saison de randonnée ; orages fréquents l'après-midi en été." },
      { period: "Hiver", text: "Saison de ski ; risque d'avalanche à consulter avant toute sortie hors-piste." },
    ],
    seasonSources: [
      { label: "Fondation Dolomites UNESCO", url: "https://www.dolomitiunesco.info/" },
      { label: "Avalanche.report — bulletin d'avalanche Euregio", url: "https://avalanche.report/" },
    ],
    formalities: diplomatie("Italie", "italie"),
    heroPhoto: "dolomites-1",
    gallery: ["dolomites-2", "dolomites-3"],
    demoOffers: false,
    search: { flights: "city:N-DOL", hotels: null, cars: null },
  },
  {
    slug: "lofoten",
    name: "Îles Lofoten",
    country: "Norvège",
    region: "Nordland",
    tagline: "Des villages de pêcheurs au pied de montagnes sorties de la mer.",
    intro: [
      "Au-delà du cercle polaire, l'archipel des Lofoten aligne des sommets abrupts, des plages claires et des villages de cabanes rouges comme Reine ou Hamnøy.",
      "La lumière change tout : soleil de minuit en début d'été, aurores boréales possibles l'hiver par nuit claire.",
    ],
    stayType: "Nature",
    ambiances: ["nature", "aventure", "road-trip", "mer"],
    duration: { min: 5, max: 8 },
    location: { summary: "Archipel du nord de la Norvège. Accès par avion (Bodø, Leknes, Evenes) ou par ferry depuis Bodø.", timeZone: "Europe/Oslo", airports: ["BOO", "LKN", "EVE"] },
    ideas: [
      { title: "Reine et Hamnøy", text: "Les villages les plus photographiés, à voir tôt ou tard pour la lumière." },
      { title: "Une randonnée de crête", text: "Choisir un itinéraire selon le vent et la visibilité, et partir avec une marge horaire." },
      { title: "Plages du nord", text: "Haukland ou Uttakleiv, pour des marches faciles au bord de l'eau." },
    ],
    seasons: [
      { period: "Fin mai–mi-juillet (environ)", text: "Soleil de minuit : le soleil ne se couche pas." },
      { period: "Autour du solstice d'hiver", text: "Quelques semaines sans lever du soleil au-dessus de l'horizon." },
      { period: "Septembre–avril", text: "Aurores boréales possibles par nuit claire ; routes hivernales." },
    ],
    seasonSources: [
      { label: "Yr — prévisions (MET Norway et NRK)", url: "https://www.yr.no/en" },
      { label: "Visit Norway — office de tourisme", url: "https://www.visitnorway.com/" },
    ],
    formalities: diplomatie("Norvège", "norvege"),
    heroPhoto: "lofoten-1",
    gallery: ["lofoten-2", "lofoten-3"],
    demoOffers: false,
    search: { flights: "city:N-LOF", hotels: null, cars: null },
  },
];

const bySlug = new Map(DESTINATIONS.map((d) => [d.slug, d]));

export function getDestination(slug: string): Destination | undefined {
  return bySlug.get(slug);
}

export function destinationsByAmbiance(ambiance: Ambiance): Destination[] {
  return DESTINATIONS.filter((d) => d.ambiances.includes(ambiance));
}

/** Date de dernière vérification des liens externes (script `npm run links:check`). */
export const SOURCES_CHECKED_ON = "2026-11-09";
