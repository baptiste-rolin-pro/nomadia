import type { Metadata } from "next";
import Link from "next/link";
import { StaticPage } from "@/components/content/static-page";
import { FAQ, FaqList } from "@/components/content/faq";

export const metadata: Metadata = {
  title: "Aide et questions fréquentes",
  description: "Fonctionnement des recherches, du carnet de voyage et des réservations sur Nomadia ; modes démonstration, test et production.",
  alternates: { canonical: "/aide" },
};

export default function HelpPage() {
  return (
    <StaticPage title="Aide et questions fréquentes" crumb="Aide">
      <h2 id="reservations">Comment fonctionnent les réservations</h2>
      <p>Une réservation concerne toujours une seule prestation (un vol, un hébergement ou une location) auprès d&apos;un seul fournisseur. Le parcours suit ces étapes :</p>
      <ul>
        <li>sélection d&apos;une offre, puis actualisation immédiate du prix et de la disponibilité auprès du fournisseur ;</li>
        <li>saisie des voyageurs ou du conducteur, avec contrôle de l&apos;âge à la date de chaque trajet ;</li>
        <li>options facultatives, jamais précochées ;</li>
        <li>vérification finale : le prix est contrôlé une dernière fois ; s&apos;il change, vous devez accepter le nouveau montant ;</li>
        <li>paiement lorsque la plateforme encaisse (sinon, règlement sur place) ;</li>
        <li>traitement par le fournisseur et confirmation vérifiée. Un paiement réussi n&apos;est pas une confirmation : chaque statut est affiché séparément.</li>
      </ul>
      <p>
        Si le fournisseur ne répond pas à temps, le statut reste « en cours de vérification » : Nomadia interroge le fournisseur avant toute nouvelle tentative, pour éviter une double réservation. Si un paiement a été reçu mais que la réservation échoue, un remboursement est demandé et affiché comme confirmé uniquement après confirmation.
      </p>
      <h2 id="modes">Démonstration, test et production</h2>
      <p>Chaque service fonctionne dans un mode explicite, défini par la configuration du serveur :</p>
      <ul>
        <li>
          <strong>Démonstration</strong> : données locales fictives, aucune réservation ni aucun paiement réel (mode actuel).
        </li>
        <li>
          <strong>Test (sandbox)</strong> : environnement de test d&apos;un fournisseur, sans paiement réel.
        </li>
        <li>
          <strong>Production</strong> : données réelles, activé uniquement après validation des contrats et obligations réglementaires.
        </li>
      </ul>
      <p>Un fournisseur indisponible produit un message d&apos;erreur explicite : aucune offre fictive n&apos;est affichée à sa place.</p>
      <h2>Questions fréquentes</h2>
      <FaqList items={FAQ} />
      <p className="mt-6">
        Une autre question ? <Link href="/contact">Contactez-nous</Link>.
      </p>
    </StaticPage>
  );
}
