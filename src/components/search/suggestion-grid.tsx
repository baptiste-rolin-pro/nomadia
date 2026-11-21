import Image from "next/image";
import { getLocale } from "@/i18n/request";
import { Link } from "@/i18n/link";
import { ArrowRight } from "lucide-react";
import { photoIn } from "@/lib/content/localized";
import type { Suggestion } from "@/lib/search/suggestions";

/**
 * Suggestions cliquables : chaque carte est un vrai lien vers une recherche (ou un formulaire) prérempli.
 * Clavier : liens natifs, focus visible ; survol : élévation de 2 px et photo à 1,03 (CSS).
 */
export async function SuggestionGrid({ id, eyebrow, title, intro, items, cta }: { id: string; eyebrow: string; title: string; intro?: string; items: Suggestion[]; cta: string }) {
  const locale = await getLocale();
  return (
    <section aria-labelledby={id}>
      <p className="eyebrow">{eyebrow}</p>
      <h2 id={id} className="mt-2 font-serif text-2xl sm:text-3xl">
        {title}
      </h2>
      {intro ? <p className="mt-2 max-w-2xl text-ink-soft text-pretty">{intro}</p> : null}
      <ul className="mt-6 grid gap-4 sm:grid-cols-2 xl:grid-cols-3" data-testid="suggestions">
        {items.map((s) => {
          const p = photoIn(s.photoId, locale);
          return (
            <li key={s.id}>
              <Link
                href={s.href}
                data-suggestion={s.id}
                className="card-lift group flex h-full gap-4 rounded-[var(--radius-lg)] border border-line bg-white p-3 pe-4 shadow-[var(--shadow-card)] transition-colors hover:border-sand"
              >
                <span className="media-zoom relative block size-24 shrink-0 overflow-hidden rounded-[var(--radius-md)] bg-ivory-deep sm:size-28">
                  <Image src={p.src} alt="" fill sizes="112px" quality={60} className="object-cover" />
                </span>
                <span className="flex min-w-0 flex-1 flex-col py-0.5">
                  <span className="eyebrow !text-[0.68rem]">{s.tag}</span>
                  <span className="mt-1 font-serif text-lg leading-snug">{s.title}</span>
                  <span className="mt-1 text-sm text-ink-soft">{s.detail}</span>
                  <span className="mt-auto inline-flex items-center gap-1.5 pt-2 text-sm font-semibold text-forest">
                    {cta}
                    <ArrowRight aria-hidden className="size-4 transition-transform duration-150 group-hover:translate-x-[3px] rtl:group-hover:-translate-x-[3px]" />
                  </span>
                </span>
              </Link>
            </li>
          );
        })}
      </ul>
    </section>
  );
}
