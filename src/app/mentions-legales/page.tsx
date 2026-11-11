import type { Metadata } from "next";
import { siteConfig } from "@/lib/config/site";
import { StaticPage, ToComplete } from "@/components/content/static-page";

export const metadata: Metadata = { title: "Mentions légales", alternates: { canonical: "/mentions-legales" } };

export default function LegalNoticePage() {
  const l = siteConfig.legal;
  return (
    <StaticPage title="Mentions légales" intro="Ces informations doivent être complétées et validées avant toute commercialisation.">
      <h2>Éditeur du site</h2>
      <ul>
        <li>
          Dénomination : <ToComplete>{l.companyName}</ToComplete>
        </li>
        <li>
          Forme juridique et capital : <ToComplete>{l.legalForm}</ToComplete>
        </li>
        <li>
          Immatriculation (RCS / SIREN) : <ToComplete>{l.registrationNumber}</ToComplete>
        </li>
        <li>
          TVA intracommunautaire : <ToComplete>{l.vatNumber}</ToComplete>
        </li>
        <li>
          Directeur de la publication : <ToComplete>{l.publicationDirector}</ToComplete>
        </li>
        <li>
          Adresse : <ToComplete>{siteConfig.contact.postalAddress}</ToComplete>
        </li>
      </ul>
      <h2>Activité de voyage</h2>
      <p>
        La vente de prestations de voyage en France peut nécessiter une immatriculation au registre des opérateurs de voyages et de séjours tenu par Atout France, une garantie financière et une assurance de responsabilité civile professionnelle, selon l&apos;activité exercée.
      </p>
      <ul>
        <li>
          Immatriculation Atout France : <ToComplete>{l.atoutFranceRegistration}</ToComplete>
        </li>
        <li>
          Garant financier : <ToComplete>{l.financialGuarantee}</ToComplete>
        </li>
        <li>
          Assureur responsabilité civile professionnelle : <ToComplete>{l.professionalInsurance}</ToComplete>
        </li>
      </ul>
      <p>Dans la version actuelle (démonstration), aucune prestation n&apos;est vendue.</p>
      <h2>Hébergement</h2>
      <p>
        Hébergeur : <ToComplete>{l.host}</ToComplete>
      </p>
      <h2>Propriété intellectuelle et crédits</h2>
      <p>Les photographies sont publiées sous licences Creative Commons ; leurs auteurs et licences sont listés sur la page des crédits photographiques. Le nom « {siteConfig.name} » n&apos;a pas fait l&apos;objet d&apos;une vérification de disponibilité juridique.</p>
    </StaticPage>
  );
}
