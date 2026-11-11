import Link from "next/link";
import { siteConfig } from "@/lib/config/site";
import { DESTINATIONS } from "@/lib/content/destinations";
import { ManageCookiesButton } from "@/components/layout/consent";
import { DemoNoticeButton } from "@/components/layout/demo-notice";

export function SiteFooter({ demo = false }: { demo?: boolean }) {
  const columns = [
    {
      title: "Destinations",
      links: DESTINATIONS.slice(0, 6).map((d) => ({ href: `/destinations/${d.slug}`, label: d.name })).concat([{ href: "/destinations", label: "Toutes les destinations" }]),
    },
    {
      title: "Voyager",
      links: [
        { href: "/voyage/nouveau", label: "Organiser mon voyage" },
        { href: "/vols", label: "Vols" },
        { href: "/hotels", label: "Hôtels" },
        { href: "/voitures", label: "Voitures" },
        { href: "/compagnies-aeriennes", label: "Compagnies aériennes" },
        { href: "/loueurs", label: "Loueurs de voitures" },
        { href: "/guides", label: "Guides" },
      ],
    },
    {
      title: "Aide et informations",
      links: [
        { href: "/aide", label: "Aide et FAQ" },
        { href: "/aide#reservations", label: "Comment fonctionnent les réservations" },
        { href: "/contact", label: "Contact" },
        { href: "/conditions", label: "Conditions d'utilisation" },
        { href: "/mentions-legales", label: "Mentions légales" },
        { href: "/confidentialite", label: "Confidentialité" },
        { href: "/cookies", label: "Cookies" },
        { href: "/credits", label: "Crédits photographiques" },
      ],
    },
  ];
  return (
    <footer className="no-print mt-section bg-forest-deep text-white/85">
      <div className="container-page grid gap-10 py-16 md:grid-cols-[1.3fr_repeat(3,1fr)]">
        <div>
          <p className="font-serif text-3xl text-white">{siteConfig.name}</p>
          <p className="mt-4 max-w-xs text-sm leading-relaxed">{siteConfig.promise}</p>
          {demo ? (
            <DemoNoticeButton className="mt-5 inline-flex min-h-11 items-center gap-2 text-sm font-semibold text-white underline decoration-white/40 underline-offset-4 hover:decoration-white">
              À propos de la démo
            </DemoNoticeButton>
          ) : null}
        </div>
        {columns.map((col) => (
          <nav key={col.title} aria-label={col.title}>
            <h2 className="text-sm font-semibold uppercase tracking-[0.12em] text-white">{col.title}</h2>
            <ul className="mt-4 space-y-2.5 text-sm">
              {col.links.map((l) => (
                <li key={l.href + l.label}>
                  <Link href={l.href} className="hover:text-white hover:underline hover:underline-offset-4">
                    {l.label}
                  </Link>
                </li>
              ))}
              {col.title === "Aide et informations" ? (
                <li>
                  <ManageCookiesButton className="text-left hover:text-white hover:underline hover:underline-offset-4" />
                </li>
              ) : null}
            </ul>
          </nav>
        ))}
      </div>
      <div className="border-t border-white/15">
        <div className="container-page flex flex-col gap-2 py-6 text-xs text-white/70 sm:flex-row sm:justify-between">
          <p>
            © {new Date().getFullYear()} {siteConfig.name}. Disponibilité juridique du nom non vérifiée.
          </p>
          <p>Photographies : Wikimedia Commons, licences Creative Commons — voir les crédits.</p>
        </div>
      </div>
    </footer>
  );
}
