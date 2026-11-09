import type { Metadata } from "next";
import { siteConfig } from "@/lib/config/site";
import { StaticPage, ToComplete } from "@/components/content/static-page";
import { ContactForm } from "@/components/content/contact-form";

export const metadata: Metadata = { title: "Contact", description: "Contacter Nomadia.", alternates: { canonical: "/contact" } };

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
      <ContactForm />
    </StaticPage>
  );
}
