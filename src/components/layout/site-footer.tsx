import { siteConfig } from "@/lib/config/site";
import { DESTINATIONS } from "@/lib/content/destinations";
import { destinationText } from "@/lib/content/localized";
import { getI18n } from "@/i18n/request";
import { Link } from "@/i18n/link";
import { ManageCookiesButton } from "@/components/layout/consent";
import { DemoNoticeButton } from "@/components/layout/demo-notice";
import { LanguageSwitcher } from "@/components/layout/language-switcher";

export async function SiteFooter({ demo = false }: { demo?: boolean }) {
  const { locale, m, f } = await getI18n();
  const t = m.common.footer;
  const columns = [
    {
      id: "destinations",
      title: t.destinations,
      links: DESTINATIONS.slice(0, 6)
        .map((d) => ({ href: `/destinations/${d.slug}`, label: destinationText(d, locale).name }))
        .concat([{ href: "/destinations", label: t.allDestinations }]),
    },
    {
      id: "travel",
      title: t.travel,
      links: [
        { href: "/voyage/nouveau", label: m.common.nav.planTrip },
        { href: "/vols", label: m.common.nav.flights },
        { href: "/hotels", label: m.common.nav.hotels },
        { href: "/voitures", label: m.common.nav.cars },
        { href: "/compagnies-aeriennes", label: t.airlines },
        { href: "/loueurs", label: t.renters },
        { href: "/guides", label: m.common.nav.guides },
      ],
    },
    {
      id: "info",
      title: t.info,
      links: [
        { href: "/aide", label: t.helpFaq },
        { href: "/aide#reservations", label: t.howBookings },
        { href: "/contact", label: t.contact },
        { href: "/conditions", label: t.terms },
        { href: "/mentions-legales", label: t.legal },
        { href: "/confidentialite", label: t.privacy },
        { href: "/cookies", label: t.cookies },
        { href: "/credits", label: t.credits },
      ],
    },
  ];
  return (
    <footer className="no-print mt-section bg-forest-deep text-white/85">
      <div className="container-page grid gap-10 py-16 md:grid-cols-[1.3fr_repeat(3,1fr)]">
        <div>
          <p className="font-serif text-3xl text-white">{siteConfig.name}</p>
          <p className="mt-4 max-w-xs text-sm leading-relaxed">{m.common.site.promise}</p>
          {demo ? (
            <DemoNoticeButton className="mt-5 inline-flex min-h-11 items-center gap-2 text-sm font-semibold text-white underline decoration-white/40 underline-offset-4 hover:decoration-white">
              {t.aboutDemo}
            </DemoNoticeButton>
          ) : null}
        </div>
        {columns.map((col) => (
          <nav key={col.id} aria-label={col.title}>
            <h2 className="text-sm font-semibold uppercase tracking-[0.12em] text-white">{col.title}</h2>
            <ul className="mt-4 space-y-2.5 text-sm">
              {col.links.map((l) => (
                <li key={l.href + l.label}>
                  <Link href={l.href} className="hover:text-white hover:underline hover:underline-offset-4">
                    {l.label}
                  </Link>
                </li>
              ))}
              {col.id === "info" ? (
                <li>
                  <ManageCookiesButton className="text-start hover:text-white hover:underline hover:underline-offset-4" />
                </li>
              ) : null}
            </ul>
          </nav>
        ))}
      </div>
      <div className="border-t border-white/15">
        <nav aria-label={m.common.language.footerTitle} className="container-page flex flex-col gap-3 py-6 text-white/85 sm:flex-row sm:items-center">
          <h2 className="text-sm font-semibold uppercase tracking-[0.12em] text-white">{m.common.language.footerTitle}</h2>
          <LanguageSwitcher variant="list" />
        </nav>
      </div>
      <div className="border-t border-white/15">
        <div className="container-page flex flex-col gap-2 py-6 text-xs text-white/70 sm:flex-row sm:justify-between">
          <p>{f.t(t.copyright, { year: f.number(new Date().getFullYear(), { useGrouping: false }), name: siteConfig.name })}</p>
          <p>{t.photos}</p>
        </div>
      </div>
    </footer>
  );
}
