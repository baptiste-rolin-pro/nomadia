/**
 * Guides éditoriaux originaux. Ils expliquent des notions utiles sans promettre de résultat
 * et sans chiffres inventés : les montants cités sont présentés comme des exemples.
 */
export interface GuideSection {
  heading: string;
  paragraphs: string[];
  list?: string[];
}

export interface Guide {
  slug: string;
  title: string;
  description: string;
  readingMinutes: number;
  heroPhoto: string;
  updatedOn: string;
  sections: GuideSection[];
  related: { label: string; href: string }[];
}

export const GUIDES: Guide[] = [
  {
    slug: "lire-un-prix-de-voyage",
    title: "Lire un prix de voyage sans mauvaise surprise",
    description: "Total du séjour, payé maintenant, payable sur place, dépôt de garantie, taxes : ce que recouvre chaque montant affiché.",
    readingMinutes: 6,
    heroPhoto: "lisbonne-3",
    updatedOn: "2026-11-09",
    sections: [
      {
        heading: "Un prix total, plusieurs moments de paiement",
        paragraphs: [
          "Un même séjour peut se régler en plusieurs fois et auprès de plusieurs interlocuteurs. Nomadia affiche toujours le total de la prestation, puis sépare ce qui est payé au moment de la réservation et ce qui reste à payer sur place.",
          "Une taxe de séjour réglée à l'hôtel ou des frais réglés au comptoir du loueur font partie du coût réel de votre voyage, même s'ils ne passent pas par la plateforme.",
        ],
      },
      {
        heading: "Le dépôt de garantie n'est pas un paiement",
        paragraphs: [
          "Pour une voiture de location, le loueur bloque généralement un montant sur une carte de crédit au nom du conducteur. Ce montant n'est pas encaissé s'il n'y a pas de dommage, mais il réduit le plafond disponible de la carte pendant la location.",
          "Le dépôt de garantie est donc affiché à part, jamais additionné au prix du séjour.",
        ],
      },
      {
        heading: "Taxes incluses, exclues… ou inconnues",
        paragraphs: [
          "Certaines taxes sont incluses dans le prix, d'autres sont dues sur place, et certains fournisseurs ne communiquent pas leur montant à l'avance. Dans ce dernier cas, Nomadia l'indique clairement plutôt que d'afficher un total faussement complet.",
        ],
        list: [
          "« Taxes incluses » : le total affiché les contient.",
          "« Payable sur place » : le montant est connu et s'ajoute au paiement en ligne.",
          "« Montant inconnu » : le fournisseur ne l'a pas communiqué ; il peut s'ajouter sur place.",
        ],
      },
      {
        heading: "Annulation gratuite : toujours avec une échéance",
        paragraphs: [
          "Une annulation gratuite n'a de sens qu'avec une date et une heure limites, exprimées dans le fuseau de l'établissement. Passé ce délai, les frais indiqués s'appliquent.",
        ],
      },
    ],
    related: [
      { label: "Rechercher un hôtel", href: "/hotels" },
      { label: "Comment fonctionnent les réservations", href: "/aide#reservations" },
    ],
  },
  {
    slug: "louer-une-voiture-a-l-etranger",
    title: "Louer une voiture à l'étranger : ce qu'il faut vérifier",
    description: "Catégorie « ou similaire », franchise, dépôt de garantie, carte de crédit, horaires d'agence : la liste à relire avant de valider.",
    readingMinutes: 7,
    heroPhoto: "le-cap-3",
    updatedOn: "2026-11-09",
    sections: [
      {
        heading: "Vous louez une catégorie, pas un modèle",
        paragraphs: [
          "La plupart des loueurs garantissent une catégorie de véhicule (nombre de places, transmission, volume de coffre) et citent un modèle « ou similaire ». Le modèle exact est attribué au comptoir.",
        ],
      },
      {
        heading: "Franchise, couvertures et options",
        paragraphs: [
          "Les protections incluses laissent souvent une franchise à votre charge en cas de dommage ou de vol. Une option de réduction de franchise peut la diminuer, aux conditions du loueur.",
          "Sur Nomadia, aucune option n'est précochée : vous ajoutez uniquement ce que vous choisissez.",
        ],
      },
      {
        heading: "Carte de crédit, permis et âge",
        paragraphs: ["Ces conditions dépendent de l'offre et de l'agence, pas seulement de la marque du loueur. Relisez-les dans le détail de l'offre."],
        list: [
          "Une carte de crédit au nom du conducteur principal est souvent exigée pour le dépôt de garantie.",
          "Une ancienneté minimale de permis peut être demandée, parfois plus élevée pour certaines catégories.",
          "Des frais de jeune conducteur peuvent s'appliquer en dessous d'un certain âge.",
        ],
      },
      {
        heading: "Horaires d'agence et arrivée tardive",
        paragraphs: [
          "Une agence d'aéroport n'est pas toujours ouverte à l'atterrissage d'un vol du soir. Si l'heure de prise en charge tombe hors des horaires, Nomadia le signale et vous propose une autre heure : la correction reste votre décision.",
        ],
      },
    ],
    related: [
      { label: "Rechercher une voiture", href: "/voitures" },
      { label: "Annuaire des loueurs", href: "/loueurs" },
    ],
  },
  {
    slug: "arrivee-tardive-premiere-nuit",
    title: "Arrivée tardive : organiser sereinement la première nuit",
    description: "Vol du soir, réception fermée, voiture à récupérer : comment éviter les mauvaises surprises lorsqu'on atterrit vers minuit.",
    readingMinutes: 5,
    heroPhoto: "reykjavik-3",
    updatedOn: "2026-11-09",
    sections: [
      {
        heading: "La nuit du jour d'arrivée compte",
        paragraphs: [
          "Si votre vol atterrit à 0 h 40 le 13, la nuit dont vous avez besoin est souvent celle du 12 au 13 : l'hôtel doit être réservé à partir du 12, et prévenu de votre arrivée tardive.",
          "Le planificateur de Nomadia signale ces nuitées décalées sans modifier vos dates à votre place.",
        ],
      },
      {
        heading: "Vérifier l'accueil de l'établissement",
        paragraphs: [
          "Réception 24 h/24, arrivée autonome avec code, ou accueil limité le soir : l'information figure dans la fiche de l'établissement. En cas de doute, contactez-le avant le départ.",
        ],
      },
      {
        heading: "Décaler la prise du véhicule",
        paragraphs: [
          "Plutôt que de récupérer une voiture fatigué et de nuit, il est souvent plus simple de dormir près de l'aéroport et de prendre le véhicule le lendemain matin, à l'ouverture de l'agence.",
        ],
      },
    ],
    related: [
      { label: "Découvrir Reykjavik", href: "/destinations/reykjavik" },
      { label: "Organiser mon voyage", href: "/voyage/nouveau" },
    ],
  },
];

export function getGuide(slug: string): Guide | undefined {
  return GUIDES.find((g) => g.slug === slug);
}
