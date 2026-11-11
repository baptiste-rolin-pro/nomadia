"use client";

import Image from "next/image";
import Link from "next/link";
import { useId, useState } from "react";
import { ArrowRight, BedDouble, CarFront } from "lucide-react";
import { FlightPath } from "@/components/ui/flight-path";

export interface RouteCard {
  slug: string;
  city: string;
  code: string;
  detail: string;
  flightHref: string;
  hotelHref: string;
  carHref: string;
  photo: { src: string; alt: string };
}

/**
 * « Au départ de Paris » : choisir une ville change la photographie (fondu croisé) et relance le vol
 * sur le billet ; le billet propose les recherches préremplies (vols, hébergements, voiture) aux mêmes dates.
 * Boutons natifs (`aria-pressed`), billet annoncé poliment. Le premier vol attend l'entrée du bloc dans l'écran.
 */
export function RouteExplorer({ routes }: { routes: RouteCard[] }) {
  const [active, setActive] = useState(0);
  const current = routes[active]!;
  const ticketId = useId();

  return (
    <div className="grid gap-5 lg:grid-cols-[0.85fr_1.15fr] lg:gap-12">
      {/* Petit écran : trois boutons côte à côte au-dessus de la photo (le choix et son effet restent dans la même vue). */}
      <ul className="grid grid-cols-3 gap-2 lg:flex lg:flex-col lg:justify-center lg:gap-0 lg:border-t lg:border-line" aria-label="Villes au départ de Paris">
        {routes.map((r, i) => {
          const selected = i === active;
          return (
            <li key={r.slug} className="lg:border-b lg:border-line">
              <button
                type="button"
                aria-pressed={selected}
                aria-controls={ticketId}
                onClick={() => setActive(i)}
                className={`group relative flex min-h-11 w-full items-center justify-center rounded-full border px-2 text-center transition-colors lg:justify-start lg:gap-4 lg:rounded-none lg:border-0 lg:bg-transparent lg:py-5 lg:pl-5 lg:pr-2 lg:text-left lg:hover:bg-ivory-deep/60 ${
                  selected ? "border-forest bg-forest text-white" : "border-line bg-white text-ink hover:border-ink"
                }`}
              >
                <span aria-hidden className={`absolute inset-y-4 left-0 hidden w-[3px] origin-center rounded-full bg-terracotta transition-transform duration-300 lg:block ${selected ? "scale-y-100" : "scale-y-0"}`} />
                <span className="min-w-0 lg:flex-1">
                  <span className="hidden text-xs font-semibold uppercase tracking-[0.14em] text-ink-soft lg:block">Paris → {r.code}</span>
                  <span className={`block font-serif text-lg leading-tight lg:mt-1 lg:text-4xl ${selected ? "lg:text-forest" : "lg:text-ink"}`}>{r.city}</span>
                  <span className="mt-1 hidden text-sm text-ink-soft lg:block">{r.detail}</span>
                </span>
                <span aria-hidden className={`hidden size-10 shrink-0 items-center justify-center rounded-full border transition-colors lg:flex ${selected ? "border-forest bg-forest text-white" : "border-line text-ink-soft group-hover:border-ink group-hover:text-ink"}`}>
                  <ArrowRight className="size-4" />
                </span>
              </button>
            </li>
          );
        })}
      </ul>

      <div className="relative">
        <div className="relative aspect-[4/3] overflow-hidden rounded-[var(--radius-xl)] bg-ink sm:aspect-[16/9] lg:aspect-auto lg:h-full lg:min-h-[32rem]">
          {routes.map((r, i) => (
            <Image
              key={r.slug}
              src={r.photo.src}
              alt={i === active ? r.photo.alt : ""}
              fill
              sizes="(min-width: 1024px) 52vw, 92vw"
              quality={70}
              className={`route-photo object-cover ${i === active ? "opacity-100" : "opacity-0"}`}
            />
          ))}
          <div aria-hidden className="absolute inset-0 bg-[linear-gradient(180deg,transparent_50%,rgb(20_43_42/0.55)_100%)]" />
        </div>

        <div id={ticketId} className="relative mx-3 -mt-14 rounded-[var(--radius-lg)] bg-white p-4 text-ink shadow-[var(--shadow-panel)] sm:mx-6 sm:p-5 lg:absolute lg:bottom-6 lg:left-6 lg:m-0 lg:w-[22rem]">
          <div aria-live="polite">
            <div className="flex items-end justify-between gap-2">
              <span>
                <span className="block font-serif text-2xl leading-none sm:text-3xl">PAR</span>
                <span className="mt-1 block text-xs text-ink-soft">Paris</span>
              </span>
              <FlightPath key={current.slug} size="sm" mode="once" className="mb-3 max-[359px]:hidden text-forest" />
              <span className="text-right">
                <span className="block font-serif text-2xl leading-none sm:text-3xl">{current.code}</span>
                <span className="mt-1 block text-xs text-ink-soft">{current.city}</span>
              </span>
            </div>
            <p className="mt-3 border-t border-dashed border-line pt-3 text-sm text-ink-soft text-pretty">Aller-retour · {current.detail}</p>
          </div>
          <div className="mt-4 flex flex-wrap items-center gap-x-4 gap-y-2">
            <Link href={current.flightHref} className="inline-flex min-h-11 items-center gap-2 rounded-[var(--radius-md)] bg-forest px-4 text-sm font-semibold text-white transition-[background-color,transform] duration-150 hover:bg-forest-deep active:translate-y-px">
              Voir les vols<span className="sr-only"> Paris → {current.city}</span> <ArrowRight aria-hidden className="size-4" />
            </Link>
            <Link href={current.hotelHref} className="inline-flex min-h-11 items-center gap-1.5 text-sm font-semibold text-forest underline-offset-4 hover:underline">
              <BedDouble aria-hidden className="size-4" /> Hôtels<span className="sr-only"> à {current.city}</span>
            </Link>
            <Link href={current.carHref} className="inline-flex min-h-11 items-center gap-1.5 text-sm font-semibold text-forest underline-offset-4 hover:underline">
              <CarFront aria-hidden className="size-4" /> Voiture<span className="sr-only"> de location à {current.city}</span>
            </Link>
          </div>
        </div>
      </div>
    </div>
  );
}
