import { FlightPath } from "@/components/ui/flight-path";

/**
 * Chargement de marque : un avion suit un trajet en pointillés.
 * N'impose aucune durée minimale (il disparaît dès que le contenu est prêt) et n'apparaît qu'après 150 ms,
 * pour ne pas clignoter lors des navigations rapides. Mouvement réduit : version immobile.
 * `announce` : région `role="status"` ; à désactiver quand un autre statut annonce déjà le chargement.
 */
export function PlaneLoader({ label, announce = true, className = "" }: { label: string; announce?: boolean; className?: string }) {
  return (
    <div role={announce ? "status" : undefined} aria-hidden={announce ? undefined : true} data-testid="plane-loader" className={`plane-loader flex flex-col items-center gap-3 text-forest ${className}`}>
      <FlightPath mode="loop" />
      <p className="text-sm font-semibold text-ink">{label}</p>
    </div>
  );
}
