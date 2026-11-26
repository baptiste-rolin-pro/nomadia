import { brandMarkFor } from "@/lib/content/brand-marks";

/**
 * Marque d'une compagnie ou d'un loueur : logo du domaine public (Wikimedia Commons, manifeste
 * `src/lib/content/brand-logos.ts`) sur une pastille blanche, sinon monogramme Nomadia (code IATA ou initiales).
 * - Le logo est une image `<img>` (jamais un SVG en ligne : aucun script ne peut s'exécuter), alt = nom de la marque,
 *   hauteur fixe, largeur plafonnée, `object-fit: contain` ; la pastille blanche le rend lisible sur tout fond.
 * - Le monogramme garde les couleurs de Nomadia (aucune imitation des couleurs de la marque).
 * - `decorative` : le nom est déjà écrit à côté ; la marque est masquée aux lecteurs d'écran (pas d'annonce en double),
 *   l'attribut alt reste le nom (affiché si l'image ne charge pas).
 * - Compagnie : logo cherché par code IATA (`code`) ; loueur : par slug de l'annuaire (`slug`).
 * - Sans hook : utilisable dans les composants serveur comme dans les composants client.
 */
const SIZES = {
  sm: { px: 20, img: "h-5 max-w-28", chip: "h-7 px-1.5", mono: "h-7 min-w-7 px-1.5 text-xs" },
  md: { px: 24, img: "h-6 max-w-20", chip: "h-11 px-2", mono: "size-11 text-sm" },
  lg: { px: 40, img: "h-10 max-w-44", chip: "h-16 px-3", mono: "size-16 text-xl" },
} as const;

export function BrandMark({ name, slug, code, size = "sm", decorative = false, className = "" }: { name: string; slug?: string | null; code?: string; size?: keyof typeof SIZES; decorative?: boolean; className?: string }) {
  const s = SIZES[size];
  const mark = brandMarkFor(slug, code);
  if (mark) {
    return (
      <span data-brand-mark="logo" aria-hidden={decorative || undefined} className={`inline-flex shrink-0 items-center justify-center rounded-[var(--radius-sm)] bg-white ring-1 ring-line ${s.chip} ${className}`}>
        {/* eslint-disable-next-line @next/next/no-img-element -- fichier statique déjà optimisé, servi tel quel ; <img> empêche toute exécution de script du SVG */}
        <img src={mark.src} alt={name} width={Math.round(s.px * mark.ratio)} height={s.px} loading="lazy" decoding="async" className={`w-auto object-contain ${s.img}`} />
      </span>
    );
  }
  return (
    <span
      data-brand-mark="monogram"
      aria-hidden={decorative || undefined}
      role={decorative ? undefined : "img"}
      aria-label={decorative ? undefined : name}
      title={name}
      className={`inline-flex shrink-0 items-center justify-center rounded-full bg-forest-soft font-semibold text-forest ${s.mono} ${className}`}
    >
      {code || name.slice(0, 2).toUpperCase()}
    </span>
  );
}
