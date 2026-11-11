"use client";

import Image from "next/image";
import Link from "next/link";
import { useId, useRef, useState, type KeyboardEvent } from "react";
import { ArrowRight } from "lucide-react";

export interface AmbianceDestination {
  slug: string;
  name: string;
  country: string;
  stayType: string;
  duration: string;
  ambiances: string[];
  photo: { src: string; alt: string; width: number; height: number };
}

/**
 * « Choisir une ambiance » : groupe de boutons radio navigable au clavier (flèches),
 * la sélection met à jour une liste lisible. Transition douce en CSS (fondu + translation courte, 320 ms),
 * neutralisée par prefers-reduced-motion. Motion n'est pas chargé sur l'accueil (budget JavaScript).
 */
export function AmbiancePicker({ ambiances, destinations }: { ambiances: { id: string; label: string; description: string }[]; destinations: AmbianceDestination[] }) {
  const [active, setActive] = useState(ambiances[0]!.id);
  const groupId = useId();
  const refs = useRef<Record<string, HTMLButtonElement | null>>({});
  const current = ambiances.find((a) => a.id === active)!;
  const selection = destinations.filter((d) => d.ambiances.includes(active)).slice(0, 4);

  const onKeyDown = (e: KeyboardEvent, i: number) => {
    let next = i;
    if (e.key === "ArrowRight" || e.key === "ArrowDown") next = (i + 1) % ambiances.length;
    else if (e.key === "ArrowLeft" || e.key === "ArrowUp") next = (i - 1 + ambiances.length) % ambiances.length;
    else return;
    e.preventDefault();
    const a = ambiances[next]!;
    setActive(a.id);
    refs.current[a.id]?.focus();
  };

  return (
        <div className="grid gap-10 lg:grid-cols-[0.8fr_2fr]">
          <div>
            <div role="radiogroup" aria-labelledby={`${groupId}-label`} className="flex flex-wrap gap-2 lg:flex-col lg:items-start">
              <span id={`${groupId}-label`} className="sr-only">
                Ambiance de voyage
              </span>
              {ambiances.map((a, i) => {
                const checked = a.id === active;
                return (
                  <button
                    key={a.id}
                    ref={(el) => {
                      refs.current[a.id] = el;
                    }}
                    type="button"
                    role="radio"
                    aria-checked={checked}
                    tabIndex={checked ? 0 : -1}
                    onClick={() => setActive(a.id)}
                    onKeyDown={(e) => onKeyDown(e, i)}
                    className={`rounded-full border px-4 py-2 text-left font-serif text-lg transition-colors duration-150 lg:border-0 lg:px-0 lg:py-1 lg:text-3xl ${
                      checked ? "border-forest bg-forest text-white lg:bg-transparent lg:text-forest" : "border-line text-ink-soft hover:text-ink lg:text-ink-soft/80"
                    }`}
                  >
                    {checked ? <span className="sr-only">Sélectionné : </span> : null}
                    {a.label}
                  </button>
                );
              })}
            </div>
            <p className="mt-6 max-w-xs text-ink-soft" aria-live="polite">
              {current.description} {selection.length} destination{selection.length > 1 ? "s" : ""}.
            </p>
          </div>
          <ul
              key={active}
              className="grid animate-fade-up gap-5 sm:grid-cols-2"
              aria-label={`Destinations — ${current.label}`}
            >
              {selection.map((d) => (
                <li key={d.slug}>
                  <Link href={`/destinations/${d.slug}`} className="group block">
                    <div className="media-zoom relative aspect-[4/3] overflow-hidden rounded-[var(--radius-lg)] bg-ivory-deep">
                      <Image src={d.photo.src} alt={d.photo.alt} fill sizes="(min-width: 1024px) 30vw, (min-width: 640px) 45vw, 92vw" className="object-cover" quality={70} />
                    </div>
                    <div className="mt-3 flex items-baseline justify-between gap-3">
                      <p className="font-serif text-xl">{d.name}</p>
                      <ArrowRight aria-hidden className="size-4 text-terracotta transition-transform duration-150 group-hover:translate-x-1" />
                    </div>
                    <p className="text-sm text-ink-soft">
                      {d.country} · {d.stayType} · {d.duration}
                    </p>
                  </Link>
                </li>
              ))}
            </ul>
        </div>
  );
}
