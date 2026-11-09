"use client";

import Link from "next/link";
import { useCallback, useEffect, useRef, useState, useSyncExternalStore } from "react";

/**
 * Consentement aux traceurs non essentiels (mesure d'audience interne, sans donnée personnelle).
 * Refuser est aussi simple qu'accepter ; le choix est modifiable à tout moment.
 * Le cookie de consentement lui-même est strictement nécessaire.
 */
const COOKIE = "nomadia_consent";
const EVENT = "nomadia:consent-change";
const OPEN_EVENT = "nomadia:consent-open";

export interface ConsentState {
  audience: boolean;
  decidedAt: string;
}

export function readConsent(): ConsentState | null {
  if (typeof document === "undefined") return null;
  const raw = document.cookie.split("; ").find((c) => c.startsWith(`${COOKIE}=`));
  if (!raw) return null;
  try {
    const value = JSON.parse(decodeURIComponent(raw.slice(COOKIE.length + 1))) as ConsentState;
    return typeof value.audience === "boolean" ? value : null;
  } catch {
    return null;
  }
}

function writeConsent(audience: boolean) {
  const value: ConsentState = { audience, decidedAt: new Date().toISOString() };
  const secure = location.protocol === "https:" ? "; Secure" : "";
  // 6 mois, conformément aux recommandations usuelles de durée de conservation du choix.
  document.cookie = `${COOKIE}=${encodeURIComponent(JSON.stringify(value))}; Path=/; Max-Age=${60 * 60 * 24 * 182}; SameSite=Lax${secure}`;
  window.dispatchEvent(new Event(EVENT));
}

function subscribe(cb: () => void) {
  window.addEventListener(EVENT, cb);
  return () => window.removeEventListener(EVENT, cb);
}

export function useConsent(): ConsentState | null {
  const snapshot = useSyncExternalStore(
    subscribe,
    () => {
      const c = readConsent();
      return c ? `${c.audience}|${c.decidedAt}` : "";
    },
    () => "ssr",
  );
  if (!snapshot || snapshot === "ssr") return null;
  const [audience, decidedAt] = snapshot.split("|");
  return { audience: audience === "true", decidedAt: decidedAt ?? "" };
}

export function ManageCookiesButton({ className = "" }: { className?: string }) {
  return (
    <button type="button" className={className} onClick={() => window.dispatchEvent(new Event(OPEN_EVENT))}>
      Gérer les cookies
    </button>
  );
}

export function ConsentBanner() {
  const decided = useSyncExternalStore(
    subscribe,
    () => readConsent() !== null,
    () => true,
  );
  const [forcedOpen, setForcedOpen] = useState(false);
  const [details, setDetails] = useState(false);
  const regionRef = useRef<HTMLDivElement>(null);
  const open = forcedOpen || !decided;

  useEffect(() => {
    const onOpen = () => {
      setForcedOpen(true);
      setDetails(true);
      requestAnimationFrame(() => regionRef.current?.querySelector<HTMLButtonElement>("button")?.focus());
    };
    window.addEventListener(OPEN_EVENT, onOpen);
    return () => window.removeEventListener(OPEN_EVENT, onOpen);
  }, []);

  const choose = useCallback((audience: boolean) => {
    writeConsent(audience);
    setForcedOpen(false);
  }, []);

  if (!open) return null;
  const current = readConsent();
  return (
    <div
      ref={regionRef}
      role="region"
      aria-label="Gestion des cookies"
      className="no-print fixed inset-x-3 bottom-3 z-[var(--z-toast)] mx-auto max-w-3xl rounded-[var(--radius-lg)] border border-line bg-white p-5 shadow-[var(--shadow-panel)] sm:inset-x-6"
    >
      <h2 className="font-serif text-xl">Vos choix sur les cookies</h2>
      <p className="mt-2 text-sm leading-relaxed text-ink-soft">
        Nomadia utilise uniquement des cookies nécessaires (session, sécurité, brouillon de voyage). Avec votre accord, nous mesurons aussi
        l&apos;usage du site de façon anonyme (recherches, étapes de réservation) pour l&apos;améliorer. Aucun traceur publicitaire.
      </p>
      {details ? (
        <ul className="mt-3 space-y-1 text-sm">
          <li>
            <strong>Nécessaires</strong> — toujours actifs : connexion, protection, panier de réservation.
          </li>
          <li>
            <strong>Mesure d&apos;audience interne</strong> — {current?.audience ? "actuellement acceptée" : "actuellement refusée ou non choisie"}.
          </li>
        </ul>
      ) : null}
      <div className="mt-4 flex flex-col gap-2 sm:flex-row sm:items-center">
        <button type="button" onClick={() => choose(false)} className="min-h-11 rounded-[var(--radius-md)] border border-forest px-5 font-semibold text-forest hover:bg-forest-soft">
          Tout refuser
        </button>
        <button type="button" onClick={() => choose(true)} className="min-h-11 rounded-[var(--radius-md)] border border-forest px-5 font-semibold text-forest hover:bg-forest-soft">
          Tout accepter
        </button>
        <button type="button" onClick={() => setDetails((d) => !d)} aria-expanded={details} className="min-h-11 px-3 text-sm font-semibold text-ink underline underline-offset-4">
          {details ? "Masquer le détail" : "Voir le détail"}
        </button>
        <Link href="/cookies" className="text-sm text-ink-soft underline underline-offset-4 sm:ml-auto">
          Politique cookies
        </Link>
      </div>
    </div>
  );
}
