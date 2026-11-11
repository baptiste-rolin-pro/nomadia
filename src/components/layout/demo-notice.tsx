"use client";

import dynamic from "next/dynamic";
import type { ReactNode } from "react";
import { dismissDemoNotice, openDemoNotice, useDemoNoticeOpen } from "@/lib/demo-notice";
import { useIntroDone } from "@/lib/intro-state";

// La fenêtre (texte, icônes, piège de focus) est un fragment chargé seulement quand elle s'ouvre.
const DemoNoticeDialog = dynamic(() => import("@/components/layout/demo-notice-dialog"), { ssr: false });

/**
 * Monte la fenêtre de démonstration à la première visite ou quand le lien « À propos de la démo » la rouvre.
 * Première visite : seulement après l'écran d'accueil « avion » (ordre : écran, fenêtre, bannière cookies).
 */
export function DemoNoticeHost({ sharedAccounts }: { sharedAccounts: boolean }) {
  const open = useDemoNoticeOpen(true);
  const introDone = useIntroDone();
  return open && introDone ? <DemoNoticeDialog sharedAccounts={sharedAccounts} onDismiss={dismissDemoNotice} /> : null;
}

/** Bouton discret qui rouvre la fenêtre (pied de page). */
export function DemoNoticeButton({ children, className = "", label }: { children: ReactNode; className?: string; label?: string }) {
  return (
    <button type="button" aria-haspopup="dialog" aria-label={label} className={className} onClick={(e) => openDemoNotice(e.currentTarget)}>
      {children}
    </button>
  );
}
