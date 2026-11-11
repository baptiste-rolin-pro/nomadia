import type { Metadata } from "next";
import { StaticPage } from "@/components/content/static-page";
import { ManageCookiesButton } from "@/components/layout/consent";

export const metadata: Metadata = { title: "Cookies", alternates: { canonical: "/cookies" } };

export default function CookiesPage() {
  return (
    <StaticPage title="Cookies et traceurs" intro="Nomadia n'utilise aucun traceur publicitaire.">
      <h2>Cookies strictement nécessaires (sans consentement)</h2>
      <ul>
        <li>Session de connexion (Better Auth) : authentification et sécurité, durée de 7 jours renouvelée à l&apos;usage.</li>
        <li>Brouillon de voyage anonyme (nomadia_anon) : retrouver un voyage créé sans compte, 90 jours.</li>
        <li>Accès invité à une réservation (nomadia_g_…) : 30 jours.</li>
        <li>Mémorisation de votre choix sur les cookies (nomadia_consent) : environ 6 mois.</li>
      </ul>
      <h2>Mesure d&apos;audience interne (avec consentement)</h2>
      <p>Si vous l&apos;acceptez, des événements anonymes sont enregistrés sur nos serveurs (recherche effectuée, offre consultée, ajout au voyage, début de réservation), sans identifiant personnel ni outil tiers. Refuser n&apos;a aucune conséquence sur l&apos;usage du site.</p>
      <div className="not-prose mt-6">
        <ManageCookiesButton className="min-h-11 rounded-[var(--radius-md)] bg-forest px-5 font-semibold text-white" />
      </div>
    </StaticPage>
  );
}
