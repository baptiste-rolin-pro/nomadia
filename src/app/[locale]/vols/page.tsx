import type { Metadata } from "next";
import { Suspense } from "react";
import { today } from "@/lib/clock";
import { placeLabelIn } from "@/lib/content/place-labels";
import { flightSuggestions } from "@/lib/search/suggestions";
import { SuggestionGrid } from "@/components/search/suggestion-grid";
import { parseFlightSearch } from "@/lib/search/params";
import { modeFor } from "@/lib/providers/registry";
import { FlightSearchForm } from "@/components/search/forms";
import { FlightResults } from "@/components/results/flight-results";
import { Breadcrumbs, Notice } from "@/components/ui/misc";
import { DemoScenarioLinks } from "@/components/results/demo-scenarios";
import { getMessages } from "@/i18n/messages";
import { ClientMessages, getI18n } from "@/i18n/request";
import { toLocale } from "@/i18n/config";
import { localeAlternates } from "@/i18n/metadata";

export async function generateMetadata({ params }: { params: Promise<{ locale: string }> }): Promise<Metadata> {
  const locale = toLocale((await params).locale);
  const t = getMessages(locale).offers.flightsPage;
  return { title: t.metaTitle, description: t.metaDescription, robots: { index: false, follow: true }, alternates: localeAlternates(locale, "/vols") };
}

export default async function FlightsPage({ searchParams }: { searchParams: Promise<Record<string, string | undefined>> }) {
  const { locale, m } = await getI18n();
  const t = m.offers.flightsPage;
  const raw = await searchParams;
  const sp = new URLSearchParams(Object.entries(raw).filter((e): e is [string, string] => typeof e[1] === "string"));
  const { params } = parseFlightSearch(sp);
  const day = today();
  const hasSearch = !!(raw.o && raw.d);
  const tripId = raw.voyage ?? null;
  const formKey = sp.toString();
  return (
    <ClientMessages ns={["results"]}>
      <div className="container-page pt-8">
        <Breadcrumbs label={m.common.nav.breadcrumbs} items={[{ href: "/", label: m.common.nav.home }, { label: t.title }]} />
        <h1 className="mt-4 font-serif text-title">{t.title}</h1>
        {tripId ? (
          <Notice className="mt-4" title={t.tripTitle}>
            {t.tripText}
          </Notice>
        ) : null}
        <div className="mt-6 rounded-[var(--radius-xl)] bg-white p-5 shadow-[var(--shadow-card)] sm:p-6">
          <FlightSearchForm
            key={formKey}
            today={day}
            compact
            extraQuery={tripId ? { voyage: tripId } : undefined}
            initial={
              hasSearch
                ? {
                    origin: placeLabelIn(raw.o, locale),
                    destination: placeLabelIn(raw.d, locale),
                    tripType: raw.type === "as" ? "oneway" : "roundtrip",
                    departDate: params?.departDate ?? raw.dep,
                    returnDate: params?.returnDate ?? raw.ret ?? undefined,
                    travelers: params ? { adults: params.adults, childrenAges: params.childrenAges, infants: params.infants } : undefined,
                    cabin: params?.cabin,
                  }
                : undefined
            }
          />
        </div>
        <div className="mt-10">
          {hasSearch ? (
            <Suspense fallback={null}>
              <FlightResults tripId={tripId} />
            </Suspense>
          ) : (
            <div className="space-y-8">
              <SuggestionGrid id="suggestions-vols" eyebrow={m.search.suggestions.flightsEyebrow} title={m.search.suggestions.flightsTitle} intro={m.search.suggestions.flightsIntro} items={flightSuggestions(day, locale)} cta={m.search.suggestions.flightsCta} />
              <Notice title={t.whatTitle}>{t.whatText}</Notice>
            </div>
          )}
          {hasSearch && modeFor("flights") === "demo" ? <DemoScenarioLinks scenarios={m.domain.searchScenarios} /> : null}
        </div>
      </div>
    </ClientMessages>
  );
}
