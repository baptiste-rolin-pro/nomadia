import type { Metadata } from "next";
import { siteConfig } from "@/lib/config/site";
import { sharedDemoAccounts } from "@/lib/demo-site";
import { StaticPage, ToComplete } from "@/components/content/static-page";
import { ContactForm } from "@/components/content/contact-form";
import { Notice } from "@/components/ui/misc";

export const metadata: Metadata = { title: "Contact", description: "Contacter Nomadia.", alternates: { canonical: "/contact" } };
// Dépend de la configuration d'exécution (NOMADIA_PUBLIC_SIGNUP) : rendu à la requête.
export const dynamic = "force-dynamic";

export default function ContactPage() {
  return (
    <StaticPage title="Contact" intro="Une question sur le site, une réservation ou vos données personnelles ?">
      <p>
        Adresse : <ToComplete>{siteConfig.contact.postalAddress}</ToComplete>
        <br />
        Horaires du service client : <ToComplete>{siteConfig.contact.supportHours}</ToComplete>
        <br />
        Email (domaine d&apos;exemple, non opérationnel) : {siteConfig.contact.email}
      </p>
      {sharedDemoAccounts() ? (
        <Notice tone="info" className="not-prose" title="Formulaire de contact désactivé sur ce site de démonstration">
          Cette démonstration publique ne collecte aucune donnée personnelle : aucun message ni aucune adresse email n&apos;est enregistré, et aucun service client n&apos;est opéré.
        </Notice>
      ) : (
        <ContactForm />
      )}
    </StaticPage>
  );
}
