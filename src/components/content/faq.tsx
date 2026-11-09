import { ChevronDown } from "lucide-react";

export const FAQ: { q: string; a: string }[] = [
  {
    q: "Puis-je réserver un vol, un hôtel et une voiture en un seul paiement ?",
    a: "Non. Chaque prestation est réservée séparément, avec ses propres conditions et son propre fournisseur. Le carnet de voyage additionne les montants pour votre budget, mais il ne crée pas de forfait.",
  },
  {
    q: "Les prix affichés sont-ils garantis ?",
    a: "Un prix issu d'une recherche est indicatif et daté. Il est vérifié à nouveau avant tout engagement ; s'il change, le nouveau montant vous est présenté et doit être accepté.",
  },
  {
    q: "Que signifie « payable sur place » ?",
    a: "Une partie du coût peut être réglée directement à l'établissement ou au loueur (taxe de séjour, frais de jeune conducteur…). Ce montant est inclus dans le total affiché mais n'est pas encaissé en ligne.",
  },
  {
    q: "Le dépôt de garantie d'une location de voiture est-il un paiement ?",
    a: "Non. C'est un montant bloqué sur une carte de crédit pendant la location puis libéré. Il est affiché à part et n'est jamais ajouté au prix.",
  },
  {
    q: "Dois-je créer un compte pour comparer ?",
    a: "Non. Vous pouvez explorer, comparer et préparer un brouillon de voyage sans compte. Le compte sert à retrouver vos voyages et réservations sur tous vos appareils.",
  },
  {
    q: "Cette version permet-elle de réserver réellement ?",
    a: "Non. Il s'agit d'une démonstration : offres, prix et prestataires sont fictifs et aucun paiement n'est encaissé. Les documents générés portent la mention « démonstration ».",
  },
  {
    q: "Comment sont choisies les photos ?",
    a: "Les photographies proviennent de Wikimedia Commons, sous licences Creative Commons, et représentent la destination indiquée. Les crédits complets figurent sur la page dédiée. Aucune photo d'illustration n'est utilisée pour représenter un hôtel ou un véhicule vendu.",
  },
];

export function FaqList({ items }: { items: { q: string; a: string }[] }) {
  return (
    <div className="divide-y divide-line border-y border-line">
      {items.map((item) => (
        <details key={item.q} className="group py-1">
          <summary className="flex min-h-12 cursor-pointer list-none items-center justify-between gap-4 py-3 font-semibold [&::-webkit-details-marker]:hidden">
            {item.q}
            <ChevronDown aria-hidden className="size-5 shrink-0 transition-transform duration-200 group-open:rotate-180" />
          </summary>
          <p className="pb-4 text-ink-soft">{item.a}</p>
        </details>
      ))}
    </div>
  );
}
