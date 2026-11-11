import type { Metadata } from "next";
import Link from "next/link";
import { siteConfig } from "@/lib/config/site";
import { StaticPage, ToComplete } from "@/components/content/static-page";

export const metadata: Metadata = { title: "Politique de confidentialité", alternates: { canonical: "/confidentialite" } };

export default function PrivacyPage() {
  return (
    <StaticPage title="Politique de confidentialité" intro="Décrit les données réellement traitées par cette version de Nomadia. À compléter et valider avant exploitation.">
      <h2>Responsable de traitement</h2>
      <p>
        <ToComplete>{siteConfig.legal.companyName}</ToComplete> — contact : <ToComplete>adresse et email du délégué ou du référent</ToComplete>.
      </p>
      <h2>Données traitées</h2>
      <ul>
        <li>Compte : nom, adresse email, mot de passe (stocké sous forme hachée), sessions (adresse IP et navigateur, pour la sécurité).</li>
        <li>Voyages : destination, dates, nombre de voyageurs, budget, notes, prestations sélectionnées.</li>
        <li>Réservations : noms des voyageurs, dates de naissance (vols et location), email de contact, options choisies, statuts. Aucune donnée de carte bancaire n&apos;est collectée.</li>
        <li>Voyageurs enregistrés : uniquement avec votre consentement explicite, supprimables à tout moment.</li>
        <li>Brouillon anonyme : identifiant aléatoire stocké dans un cookie technique ; seule son empreinte est conservée.</li>
        <li>Mesure d&apos;audience interne : uniquement après consentement, sans donnée personnelle (nom d&apos;événement, service concerné).</li>
        <li>Messages envoyés via le formulaire de contact.</li>
        <li>Demandes écrites à l&apos;assistant de l&apos;accueil : voir la section « Assistant » ci-dessous.</li>
      </ul>
      <p>Les données détaillées ne sont placées ni dans les adresses des pages, ni dans les journaux d&apos;audit, ni dans le stockage local du navigateur.</p>
      <h2 id="assistant">Assistant de recherche (Anthropic)</h2>
      <p>
        Quand vous utilisez l&apos;onglet « Assistant » de l&apos;accueil, le texte que vous saisissez (500 caractères au plus) et, si l&apos;assistant vous a posé une question, votre demande précédente et cette question sont envoyés à Anthropic, PBC (États-Unis), qui fournit le modèle de langage Claude, avec la date du jour et la liste des lieux du site. Votre adresse IP, votre compte et vos cookies ne lui sont pas transmis. Selon les informations publiées par Anthropic (consultées le 11 novembre 2026), les données envoyées à son API ne servent pas par défaut à entraîner ses modèles et sont supprimées de ses serveurs sous 30 jours, sauf exceptions qu&apos;elle décrit (contrôle des abus, obligations légales). N&apos;y mettez aucune donnée personnelle.
      </p>
      <p>
        Nomadia n&apos;enregistre pas ce texte et ne le journalise pas. Pour limiter les abus, une empreinte chiffrée de votre adresse IP (jamais l&apos;adresse elle-même) et un compteur de demandes sont conservés en base pour l&apos;heure en cours, puis supprimés lors de la purge quotidienne (au premier appel de l&apos;assistant du jour suivant). Encadrement contractuel et transfert hors de l&apos;Union européenne : <ToComplete>à valider avant exploitation</ToComplete>.
      </p>
      <h2>Destinataires</h2>
      <p>
        En démonstration : Anthropic pour le texte saisi dans l&apos;assistant (section ci-dessus), et aucun autre. En exploitation : les fournisseurs des prestations réservées (pour exécuter la réservation), le prestataire de paiement, l&apos;hébergeur et le prestataire d&apos;envoi d&apos;emails — <ToComplete>liste nominative à établir</ToComplete>.
      </p>
      <h2>Durées de conservation</h2>
      <p>
        Compte et voyages : jusqu&apos;à la suppression du compte. Pièces liées aux réservations : durée légale applicable <ToComplete>à valider</ToComplete>. Journal d&apos;audit sans donnée personnelle : <ToComplete>durée à définir</ToComplete>.
      </p>
      <h2>Vos droits</h2>
      <p>
        Accès, rectification, effacement, portabilité, opposition et limitation. Depuis votre compte : <Link href="/compte/donnees">export et demande de suppression</Link>. Vous pouvez saisir la CNIL.
      </p>
      <h2>Cookies</h2>
      <p>
        Voir la <Link href="/cookies">politique cookies</Link>.
      </p>
    </StaticPage>
  );
}
