/**
 * Références d'offres de démonstration : encodage compact et auto-descriptif des critères
 * permettant au fournisseur DEMO de régénérer l'offre côté serveur de façon déterministe.
 * Le prix n'est jamais lu depuis la référence : il est recalculé par le fournisseur.
 */
export function encodeRef(prefix: string, payload: Record<string, unknown>): string {
  const json = JSON.stringify(payload);
  const b64 = typeof Buffer !== "undefined" ? Buffer.from(json, "utf8").toString("base64url") : btoa(unescape(encodeURIComponent(json))).replace(/\+/g, "-").replace(/\//g, "_").replace(/=+$/, "");
  return `${prefix}.${b64}`;
}

export function decodeRef<T>(prefix: string, ref: string): T | null {
  if (!ref.startsWith(`${prefix}.`)) return null;
  try {
    const b64 = ref.slice(prefix.length + 1);
    const json = typeof Buffer !== "undefined" ? Buffer.from(b64, "base64url").toString("utf8") : decodeURIComponent(escape(atob(b64.replace(/-/g, "+").replace(/_/g, "/"))));
    return JSON.parse(json) as T;
  } catch {
    return null;
  }
}

export function verticalOfRef(ref: string): "flights" | "hotels" | "cars" | null {
  if (ref.startsWith("dfl.")) return "flights";
  if (ref.startsWith("dht.")) return "hotels";
  if (ref.startsWith("dcr.")) return "cars";
  return null;
}
