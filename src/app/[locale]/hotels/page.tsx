import type { Metadata } from "next";
import { Suspense } from "react";
import { today } from "@/lib/clock";
import { placeLabelIn } from "@/lib/content/place-labels";
import { hotelSuggestions } from "@/lib/search/suggestions";
import { SuggestionGrid } from "@/components/search/suggestion-grid";
import { decodeRooms } from "@/lib/search/params";
import { modeFor } from "@/lib/providers/registry";
import { HotelSearchForm } from "@/components/search/forms";
import { HotelResults } from "@/components/results/hotel-results";
import { Breadcrumbs, Notice } from "@/components/ui/misc";
import { DemoScenarioLinks } from "@/components/results/demo-scenarios";
import { getMessages } from "@/i18n/messages";
import { ClientMessages, getI18n } from "@/i18n/request";
import { toLocale } from "@/i18n/config";
import { localeAlternates } from "@/i18n/metadata";

export async function generateMetadata({ params }: { params: Promise<{ locale: string }> }): Promise<Metadata> {
  const locale = toLocale((await params).locale);
  const t = getMessages(locale).offers.hotelsPage;
  return { title: t.metaTitle, description: t.metaDescription, robots: { index: false, follow: true }, alternates: localeAlternates(locale, "/hotels") };
}

export default async function HotelsPage({ searchParams }: { searchParams: Promise<Record<string, string | undefined>> }) {
  const { locale, m } = await getI18n();
  const t = m.offers.hotelsPage;
  const raw = await searchParams;
  const day = today();
  const hasSearch = !!(raw.dest && raw.arr && raw.dep);
  const tripId = raw.voyage ?? null;
  const formKey = new URLSearchParams(Object.entries(raw).filter((e): e is [string, string] => typeof e[1] === "string")).toString();
  return (
    <ClientMessages ns={["results"]}>
      <div className="container-page pt-8">
        <Breadcrumbs label={m.common.nav.breadcrumbs} items={[{ href: "/", label: m.common.nav.home }, { label: t.crumb }]} />
        <h1 className="mt-4 font-serif text-title">{t.title}</h1>
        {tripId ? (
          <Notice className="mt-4" title={t.tripTitle}>
            {t.tripText}
          </Notice>
        ) : null}
        <div className="mt-6 rounded-[var(--radius-xl)] bg-white p-5 shadow-[var(--shadow-card)] sm:p-6">
          <HotelSearchForm
            key={formKey}
            today={day}
            extraQuery={tripId ? { voyage: tripId } : undefined}
            initial={hasSearch ? { destination: placeLabelIn(raw.dest, locale), checkIn: raw.arr, checkOut: raw.dep, rooms: decodeRooms(raw.ch ?? null) } : undefined}
          />
        </div>
        <div className="mt-10">
          {hasSearch ? (
            <Suspense fallback={null}>
              <HotelResults />
            </Suspense>
          ) : (
            <SuggestionGrid id="suggestions-hotels" eyebrow={m.search.suggestions.hotelsEyebrow} title={m.search.suggestions.hotelsTitle} intro={m.search.suggestions.hotelsIntro} items={hotelSuggestions(day, locale)} cta={m.search.suggestions.hotelsCta} />
          )}
          {hasSearch && modeFor("hotels") === "demo" ? <DemoScenarioLinks scenarios={m.domain.searchScenarios} /> : null}
        </div>
      </div>
    </ClientMessages>
  );
}
