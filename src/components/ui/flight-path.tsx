import { Plane } from "lucide-react";

/**
 * Motif de marque : un avion qui suit un trajet en pointillés.
 * Taille fixe (en pixels) pour que la trajectoire CSS (`offset-path`) et le tracé SVG coïncident.
 * - `loop` : vol continu (chargement) ;
 * - `once` : un seul vol, puis l'avion reste à l'arrivée (fenêtre de démonstration, itinéraires).
 * Mouvement réduit : avion immobile, aucun défilement des pointillés (voir globals.css).
 */
const SIZES = {
  lg: { w: 300, h: 96, d: "M12 82 C 86 8, 214 8, 288 82", from: [12, 82], to: [288, 82], plane: 28 },
  md: { w: 220, h: 72, d: "M10 60 C 64 6, 156 6, 210 60", from: [10, 60], to: [210, 60], plane: 22 },
  sm: { w: 168, h: 52, d: "M8 44 C 48 4, 120 4, 160 44", from: [8, 44], to: [160, 44], plane: 18 },
} as const;

export function FlightPath({ size = "md", mode = "loop", className = "" }: { size?: keyof typeof SIZES; mode?: "loop" | "once"; className?: string }) {
  const s = SIZES[size];
  return (
    <span aria-hidden className={`flight-path flight-path--${mode} ${className}`} style={{ width: s.w, height: s.h }}>
      <svg width={s.w} height={s.h} viewBox={`0 0 ${s.w} ${s.h}`} fill="none" className="flight-path__svg">
        <path d={s.d} className="flight-path__trail" stroke="currentColor" strokeWidth={2} strokeLinecap="round" strokeDasharray="0.5 7" />
        <circle cx={s.from[0]} cy={s.from[1]} r={3.5} fill="currentColor" />
        <circle cx={s.to[0]} cy={s.to[1]} r={3.5} fill="none" stroke="currentColor" strokeWidth={2} />
      </svg>
      <span className="flight-path__plane" style={{ width: s.plane, height: s.plane, offsetPath: `path("${s.d}")` }}>
        <Plane className="size-full" strokeWidth={1.6} fill="currentColor" />
      </span>
    </span>
  );
}
