import type { Metadata } from "next";
import { StaticPage, ToComplete } from "@/components/content/static-page";

export const metadata: Metadata = { title: "Conditions d'utilisation", alternates: { canonical: "/conditions" } };

export default function TermsPage() {
  return (
    <StaticPage title="Conditions d'utilisation" intro="Projet de conditions pour la version de démonstration. Un document définitif doit être rédigé et validé juridiquement avant toute vente.">
      <h2>Objet</h2>
      <p>Nomadia permet de découvrir des destinations, de préparer un voyage daté et de comparer des vols, hébergements et locations de voitures. Dans sa version actuelle, toutes les offres sont fictives et aucune réservation n&apos;est réalisée.</p>
      <h2>Compte</h2>
      <p>La création d&apos;un compte est facultative pour explorer et comparer. Vous êtes responsable de la confidentialité de votre mot de passe. Une adresse email confirmée est requise pour se connecter.</p>
      <h2>Prestations et conditions applicables</h2>
      <p>
        Chaque prestation est soumise aux conditions de son fournisseur (compagnie aérienne, établissement, loueur), affichées avant la validation : bagages, modification, annulation, montants payables sur place, dépôt de garantie. Aucune règle universelle de rétractation ou d&apos;annulation n&apos;est appliquée par Nomadia : seules les conditions de l&apos;offre font foi.
      </p>
      <p>
        Le cadre contractuel exact (intermédiaire, vendeur, agent de voyages) et les obligations liées à un éventuel regroupement de prestations sont : <ToComplete>à définir et valider avant commercialisation</ToComplete>.
      </p>
      <h2>Prix</h2>
      <p>Les prix issus d&apos;une recherche sont indicatifs. Avant tout engagement, le prix et la disponibilité sont vérifiés à nouveau ; un changement doit être accepté explicitement.</p>
      <h2>Responsabilité</h2>
      <p>Les informations éditoriales (saisons, idées de séjour) sont générales. Les formalités, la sécurité et la santé relèvent des sources officielles mentionnées sur chaque page destination.</p>
      <h2>Contact et médiation</h2>
      <p>
        Médiateur de la consommation : <ToComplete>à désigner</ToComplete>.
      </p>
    </StaticPage>
  );
}
