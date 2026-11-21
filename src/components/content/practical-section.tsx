import { Fragment, type ReactNode } from "react";
import { ArrowRight, CarFront, Plane } from "lucide-react";
import { Link } from "@/i18n/link";
import type { Locale } from "@/i18n/config";
import type { Formatter } from "@/i18n/format";
import type { Messages } from "@/i18n/types";
import { Badge, Notice } from "@/components/ui/misc";
import { buttonClasses } from "@/components/ui/button";
import { practicalAirportName, practicalTownName } from "@/lib/content/localized";
import { PRACTICAL_OBSERVED_ON, parisAccess, type AgencyArea, type BrandRef, type PracticalInfo } from "@/lib/content/practical";

type T = Messages["content"]["destination"]["practical"];

/**
 * Section « Y aller / Sur place » d'une fiche destination (composant serveur : aucun JavaScript ajouté).
 * Données observées à une date, affichées avec leur mention ; les marques ne sont liées que si elles ont une fiche
 * dans l'annuaire. Codes IATA et noms de marques isolés (`<bdi>`) pour un affichage correct en arabe.
 */
export function PracticalSection({
  info,
  locale,
  t,
  f,
  listSep,
  flights,
  cars,
}: {
  info: PracticalInfo;
  locale: Locale;
  t: T;
  f: Formatter;
  listSep: string;
  flights: { href: string; label: string };
  cars: { href: string; label: string } | null;
}) {
  const name = (code: string) => (code === "PAR" ? t.parisAll : (practicalAirportName(code, locale) ?? code));
  const named = (code: string) => `${name(code)} (${code})`;
  const access = parisAccess(info);
  const accessText = access.kind === "direct" ? t.direct : f.t(access.kind === "connection" ? t.viaConnection : t.viaFirst, { via: named(access.via) });

  const area = (a: AgencyArea): string => {
    switch (a.kind) {
      case "airport":
        return named(a.airport);
      case "airport-shuttle":
        return f.t(t.areaShuttle, { airport: named(a.airport) });
      case "town":
        return practicalTownName(a.town, locale);
      case "town-airport":
        return f.t(t.areaTownAirport, { town: practicalTownName(a.town, locale), airport: named(a.airport) });
    }
  };

  const brands = (list: BrandRef[], basePath: string): ReactNode =>
    list.map((b, i) => (
      <Fragment key={b.name}>
        {i > 0 ? listSep : null}
        {b.slug ? (
          <Link href={`${basePath}/${b.slug}`} className="font-medium text-forest underline underline-offset-2">
            <bdi>{b.name}</bdi>
          </Link>
        ) : (
          <bdi>{b.name}</bdi>
        )}
      </Fragment>
    ));

  return (
    <section aria-labelledby="practical" className="reveal" data-testid="practical-section">
      <h2 id="practical" className="font-serif text-heading">
        {t.title}
      </h2>
      <div className="mt-6 grid gap-8 md:grid-cols-2">
        <div className="min-w-0">
          <h3 className="flex items-center gap-2 font-serif text-xl">
            <Plane aria-hidden className="size-5 shrink-0 text-forest" /> {t.gettingThere}
          </h3>
          <dl className="mt-4 text-sm">
            <dt className="text-ink-soft">{t.accessAirport}</dt>
            <dd className="mt-1 flex flex-wrap items-baseline gap-x-2 font-semibold break-words">
              <Code>{info.accessAirport}</Code> {name(info.accessAirport)}
            </dd>
          </dl>
          <p className="mt-3 text-sm">{accessText}</p>
          <h4 className="mt-5 text-sm font-semibold">{t.routes}</h4>
          <ul className="mt-2 divide-y divide-line border-y border-line">
            {info.routes.map((r) => (
              <li key={`${r.from}-${r.to}`} className="py-3 text-sm">
                <p className="font-semibold break-words">
                  <span className="sr-only">{f.t(t.route, { from: named(r.from), to: named(r.to) })}</span>
                  <span aria-hidden className="flex flex-wrap items-center gap-x-2 gap-y-1">
                    <Code>{r.from}</Code>
                    <span>{name(r.from)}</span>
                    <ArrowRight className="size-4 shrink-0 text-terracotta rtl:-scale-x-100" />
                    <Code>{r.to}</Code>
                    <span>{name(r.to)}</span>
                  </span>
                </p>
                <dl className="mt-1.5">
                  <dt className="text-ink-soft">{t.airlines}</dt>
                  <dd className="mt-0.5 break-words">{brands(r.airlines, "/compagnies-aeriennes")}</dd>
                </dl>
              </li>
            ))}
          </ul>
          <p className="mt-2 text-xs text-ink-soft">{t.codeshare}</p>
        </div>

        <div className="min-w-0">
          <h3 className="flex items-center gap-2 font-serif text-xl">
            <CarFront aria-hidden className="size-5 shrink-0 text-forest" /> {t.onSite}
          </h3>
          <h4 className="mt-4 text-sm font-semibold">{t.carRental}</h4>
          <div className="mt-2 space-y-3">
            {info.cars.map((c, i) => (
              <dl key={i} className="space-y-2.5 rounded-[var(--radius-md)] border border-line bg-white p-4 text-sm">
                <div>
                  <dt className="text-ink-soft">{t.agencyArea}</dt>
                  <dd className="mt-0.5 font-semibold break-words">
                    {area(c.area)}
                    {c.segment === "suv" ? (
                      <Badge tone="warning" className="ms-2 align-middle">
                        {t.suv}
                      </Badge>
                    ) : null}
                  </dd>
                </div>
                <div>
                  <dt className="text-ink-soft">{t.renters}</dt>
                  <dd className="mt-0.5 break-words">{brands(c.renters, "/loueurs")}</dd>
                </div>
                <div>
                  <dt className="text-ink-soft">{t.models}</dt>
                  <dd className="mt-1">
                    <ul className="flex flex-wrap gap-1.5">
                      {c.models.map((model) => (
                        <li key={model}>
                          <Badge>
                            <bdi>{model}</bdi>
                          </Badge>
                        </li>
                      ))}
                    </ul>
                  </dd>
                </div>
              </dl>
            ))}
          </div>
        </div>
      </div>

      <Notice className="mt-6">{f.t(t.note, { date: f.date(PRACTICAL_OBSERVED_ON) })}</Notice>

      <h3 className="mt-6 text-sm font-semibold">{t.searchTitle}</h3>
      <ul className="mt-2 flex flex-wrap gap-3">
        <li>
          <Link href={flights.href} className={buttonClasses("secondary", "sm", "gap-2")}>
            <Plane aria-hidden className="size-4" /> {flights.label}
          </Link>
        </li>
        {cars ? (
          <li>
            <Link href={cars.href} className={buttonClasses("secondary", "sm", "gap-2")}>
              <CarFront aria-hidden className="size-4" /> {cars.label}
            </Link>
          </li>
        ) : null}
      </ul>
    </section>
  );
}

function Code({ children }: { children: string }) {
  return (
    <bdi className="inline-flex shrink-0 rounded-[var(--radius-sm)] bg-forest-soft px-1.5 py-0.5 font-mono text-xs font-semibold tracking-wide text-forest" translate="no">
      {children}
    </bdi>
  );
}
