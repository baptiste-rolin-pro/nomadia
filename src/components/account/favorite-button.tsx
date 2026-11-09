"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useEffect, useState } from "react";
import { Heart } from "lucide-react";

/** Favori (destination ou hébergement) : nécessite un compte ; l'état est lu et modifié côté serveur. */
export function FavoriteButton({ kind, refId, label, tone = "default" }: { kind: "destination" | "hotel"; refId: string; label: string; tone?: "default" | "light" }) {
  const pathname = usePathname();
  const [state, setState] = useState<{ loggedIn: boolean; favorite: boolean } | null>(null);
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState("");

  useEffect(() => {
    const ctrl = new AbortController();
    fetch(`/api/favorites?kind=${kind}&ref=${encodeURIComponent(refId)}`, { signal: ctrl.signal })
      .then((r) => (r.ok ? r.json() : null))
      .then((j: { loggedIn: boolean; favorite: boolean } | null) => j && setState(j))
      .catch(() => undefined);
    return () => ctrl.abort();
  }, [kind, refId]);

  const base = `inline-flex min-h-10 items-center gap-2 rounded-full border px-4 text-sm font-semibold transition-colors ${
    tone === "light" ? "border-white/70 text-white hover:bg-white/15" : "border-forest text-forest hover:bg-forest-soft"
  }`;

  if (state && !state.loggedIn) {
    return (
      <Link href={`/connexion?retour=${encodeURIComponent(pathname)}`} className={base}>
        <Heart aria-hidden className="size-4" /> Se connecter pour ajouter aux favoris
      </Link>
    );
  }
  return (
    <>
      <button
        type="button"
        className={base}
        aria-pressed={state?.favorite ?? false}
        disabled={!state || busy}
        onClick={async () => {
          setBusy(true);
          try {
            const res = await fetch("/api/favorites", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ kind, ref: refId }) });
            if (res.ok) {
              const j = (await res.json()) as { favorite: boolean };
              setState({ loggedIn: true, favorite: j.favorite });
              setMessage(j.favorite ? `${label} ajouté aux favoris` : `${label} retiré des favoris`);
            }
          } finally {
            setBusy(false);
          }
        }}
      >
        <Heart aria-hidden className={`size-4 ${state?.favorite ? "fill-current" : ""}`} />
        {state?.favorite ? "Dans mes favoris" : "Ajouter aux favoris"}
      </button>
      <span className="sr-only" aria-live="polite">
        {message}
      </span>
    </>
  );
}
