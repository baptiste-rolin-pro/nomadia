"use client";

/**
 * Plan schématique chargé à la demande : positions relatives approximatives, sans fond cartographique
 * (aucun service de tuiles n'est configuré). La liste des résultats reste l'alternative complète.
 */
export function HotelsMap({ hotels }: { hotels: { id: string; name: string; lat: number; lng: number; price: string; neighborhood: string }[] }) {
  if (!hotels.length) return null;
  const lats = hotels.map((h) => h.lat);
  const lngs = hotels.map((h) => h.lng);
  const [minLat, maxLat, minLng, maxLng] = [Math.min(...lats), Math.max(...lats), Math.min(...lngs), Math.max(...lngs)];
  const pad = 0.12;
  const x = (lng: number) => (maxLng === minLng ? 50 : pad * 100 + ((lng - minLng) / (maxLng - minLng)) * (100 - 2 * pad * 100));
  const y = (lat: number) => (maxLat === minLat ? 50 : pad * 100 + ((maxLat - lat) / (maxLat - minLat)) * (100 - 2 * pad * 100));
  return (
    <figure className="rounded-[var(--radius-lg)] border border-line bg-white p-4">
      <div className="relative aspect-[16/9] w-full overflow-hidden rounded-[var(--radius-md)] bg-forest-soft">
        <svg viewBox="0 0 100 56.25" className="absolute inset-0 size-full" role="img" aria-label={`Plan schématique de ${hotels.length} hébergements`}>
          {hotels.map((h) => (
            <g key={h.id} transform={`translate(${x(h.lng)} ${y(h.lat) * 0.5625})`}>
              <circle r="1.6" fill="#174b45" stroke="#fff" strokeWidth="0.5" />
              <text x="2.4" y="0.9" fontSize="2.4" fill="#142b2a">
                {h.name} · {h.price}
              </text>
            </g>
          ))}
        </svg>
      </div>
      <figcaption className="mt-2 text-xs text-ink-soft">Plan schématique non contractuel : positions approximatives des établissements fictifs. Les quartiers sont réels. La liste ci-dessous contient toutes les informations.</figcaption>
    </figure>
  );
}
