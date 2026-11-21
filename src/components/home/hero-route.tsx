import { Plane } from "lucide-react";
import { getI18n } from "@/i18n/request";
import { cityName } from "@/lib/content/localized";

/**
 * Habillage animé du hero (CSS + SVG, aucun JavaScript) : un trajet en pointillés au départ de Paris, un avion
 * qui le parcourt toutes les 9 s, et l'arrivée qui défile entre quatre destinations du catalogue, synchronisée
 * avec chaque vol (le changement a lieu quand l'avion est invisible). Purement décoratif (`aria-hidden`).
 * Taille fixe en pixels : la trajectoire CSS (`offset-path`) et le tracé SVG coïncident (comme FlightPath).
 * Animé seulement avec JavaScript (bouton pause disponible) ; mouvement réduit : avion posé, première arrivée.
 * Écriture de droite à gauche : le trajet est retourné (globals.css), les textes restent lisibles.
 */
const ROUTE = "M18 186 C 84 92, 186 46, 302 38";

/** Coordonnées : [degrés, minutes, hémisphère] pour la latitude puis la longitude. */
type Coord = [number, number, "north" | "south" | "east" | "west"];
const ARRIVALS: { city: string; lat: Coord; lng: Coord }[] = [
  { city: "Lisbonne", lat: [38, 43, "north"], lng: [9, 8, "west"] },
  { city: "Reykjavik", lat: [64, 8, "north"], lng: [21, 56, "west"] },
  { city: "Rome", lat: [41, 54, "north"], lng: [12, 29, "east"] },
  { city: "Kyoto", lat: [35, 0, "north"], lng: [135, 46, "east"] },
];
const PARIS: { lat: Coord; lng: Coord } = { lat: [48, 51, "north"], lng: [2, 21, "east"] };

export async function HeroRoute({ className = "" }: { className?: string }) {
  const { locale, m, f } = await getI18n();
  const t = m.home.hero;
  const coord = ([deg, min, hemi]: Coord) => `${f.number(deg)}°${f.number(min, { minimumIntegerDigits: 2 })}′ ${t[hemi]}`;
  const pair = (c: { lat: Coord; lng: Coord }) => `${coord(c.lat)} · ${coord(c.lng)}`;
  // Première arrivée répétée à la fin : le retour au début du cycle est invisible.
  const ticker = [...ARRIVALS, ARRIVALS[0]!];
  return (
    <div aria-hidden className={`hero-route ${className}`}>
      <svg width={320} height={210} viewBox="0 0 320 210" fill="none" className="absolute inset-0 overflow-visible">
        <path d={ROUTE} stroke="currentColor" strokeOpacity={0.7} strokeWidth={2} strokeLinecap="round" strokeDasharray="0.5 8" />
        <circle cx={18} cy={186} r={4} fill="currentColor" />
        <circle cx={302} cy={38} r={4.5} fill="none" stroke="currentColor" strokeWidth={2} />
        <circle cx={302} cy={38} r={4.5} className="hero-route__ring hero-anim" stroke="currentColor" strokeWidth={1.5} />
      </svg>
      <span className="hero-route__plane hero-anim" style={{ offsetPath: `path("${ROUTE}")` }}>
        <Plane className="size-full" strokeWidth={1.5} fill="currentColor" />
      </span>
      <p className="absolute left-0 top-[198px] whitespace-nowrap text-[0.7rem] font-semibold uppercase tracking-[0.16em]">
        {cityName("Paris", locale)} <span className="font-normal normal-case tracking-normal text-white/80">{pair(PARIS)}</span>
      </p>
      <div className="absolute bottom-[calc(100%-22px)] right-0 h-[2.6rem] overflow-hidden text-right">
        <ul className="hero-route__ticker hero-anim">
          {ticker.map((a, i) => (
            <li key={`${a.city}-${i}`} className="flex h-[2.6rem] flex-col justify-end">
              <span className="font-serif text-xl leading-tight">{cityName(a.city, locale)}</span>
              <span className="whitespace-nowrap text-[0.7rem] text-white/80">{pair(a)}</span>
            </li>
          ))}
        </ul>
      </div>
    </div>
  );
}
