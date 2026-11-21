import type { Metadata } from "next";
import { today } from "@/lib/clock";
import { compareCivil, isCivilDate } from "@/lib/dates";
import { DESTINATIONS, getDestination } from "@/lib/content/destinations";
import { destinationName } from "@/lib/content/localized";
import { tripIdeaById, tripIdeas } from "@/lib/search/suggestions";
import { TripForm, type TripFormInitial } from "@/components/search/trip-form";
import { SuggestionGrid } from "@/components/search/suggestion-grid";
import { Breadcrumbs, Notice, SectionHeading } from "@/components/ui/misc";
import { getMessages } from "@/i18n/messages";
import { getI18n } from "@/i18n/request";
import { toLocale } from "@/i18n/config";
import { localeAlternates } from "@/i18n/metadata";

export async function generateMetadata({ params }: { params: Promise<{ locale: string }> }): Promise<Metadata> {
  const locale = toLocale((await params).locale);
  const t = getMessages(locale).planner.newTrip;
  return { title: t.metaTitle, description: t.metaDescription, alternates: localeAlternates(locale, "/voyage/nouveau") };
}

export const dynamic = "force-dynamic";

type Params = { destination?: string; debut?: string; fin?: string; adultes?: string; enfants?: string; idee?: string; origine?: string };

/** Préremplissage depuis l'URL (idées de voyage, pages destination) ; toute valeur invalide est ignorée. */
function initialFromParams(p: Params, t: string): TripFormInitial {
  const int = (v: string | undefined, min: number, max: number) => {
    const n = Number(v);
    return v !== undefined && Number.isInteger(n) && n >= min && n <= max ? n : undefined;
  };
  const start = isCivilDate(p.debut) && compareCivil(p.debut, t) >= 0 ? p.debut : undefined;
  const end = start && isCivilDate(p.fin) && compareCivil(p.fin, start) >= 0 ? p.fin : undefined;
  return {
    destination: p.destination && getDestination(p.destination) ? p.destination : undefined,
    start,
    end,
    adults: int(p.adultes, 1, 9),
    children: int(p.enfants, 0, 8),
  };
}

export default async function NewTripPage({ searchParams }: { searchParams: Promise<Params> }) {
  const { locale, m, f } = await getI18n();
  const tr = m.planner.newTrip;
  const params = await searchParams;
  const t = today();
  const initial = initialFromParams(params, t);
  const applied = tripIdeaById(t, params.idee, locale);
  const formKey = new URLSearchParams(Object.entries(params).filter((e): e is [string, string] => typeof e[1] === "string")).toString();
  const destinations = DESTINATIONS.map((d) => ({ slug: d.slug, name: destinationName(d.slug, locale) }));
  return (
    <div className="container-page max-w-6xl pt-8">
      <Breadcrumbs label={m.common.nav.breadcrumbs} items={[{ href: "/", label: m.common.nav.home }, { label: tr.title }]} />
      <div className="mt-6">
        <SectionHeading as="h1" eyebrow={tr.eyebrow} title={tr.title} intro={tr.intro} />
      </div>
      {applied ? (
        <Notice role="status" className="mt-6" title={f.t(tr.ideaApplied, { title: applied.title })}>
          {tr.ideaText}
        </Notice>
      ) : params.origine === "assistant" ? (
        <Notice role="status" className="mt-6" title={tr.assistantTitle}>
          {tr.assistantText}
        </Notice>
      ) : null}
      <div className="mt-6 rounded-[var(--radius-xl)] bg-white p-6 shadow-[var(--shadow-card)]">
        <TripForm key={formKey} today={t} destinations={destinations} initial={initial} />
      </div>
      <div className="mt-12">
        <SuggestionGrid id="idees-voyage" eyebrow={tr.ideasEyebrow} title={tr.ideasTitle} intro={tr.ideasIntro} items={tripIdeas(t, locale)} cta={tr.ideasCta} />
      </div>
      <Notice className="mt-10" title={tr.anonTitle}>
        {tr.anonText}
      </Notice>
    </div>
  );
}
