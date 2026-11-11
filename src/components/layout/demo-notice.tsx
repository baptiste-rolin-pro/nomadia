"use client";

import dynamic from "next/dynamic";
import type { ReactNode } from "react";
import { dismissDemoNotice, openDemoNotice, useDemoNoticeOpen } from "@/lib/demo-notice";

// La fenêtre (texte, icônes, piège de focus) est un fragment chargé seulement quand elle s'ouvre.
const DemoNoticeDialog = dynamic(() => import("@/components/layout/demo-notice-dialog"), { ssr: false });

/** Monte la fenêtre de démonstration à la première visite ou quand un bouton « Démo » la rouvre. */
export function DemoNoticeHost({ sharedAccounts }: { sharedAccounts: boolean }) {
  const open = useDemoNoticeOpen(true);
  return open ? <DemoNoticeDialog sharedAccounts={sharedAccounts} onDismiss={dismissDemoNotice} /> : null;
}

/** Bouton discret qui rouvre la fenêtre (en-tête, pied de page). */
export function DemoNoticeButton({ children, className = "", label }: { children: ReactNode; className?: string; label?: string }) {
  return (
    <button type="button" aria-haspopup="dialog" aria-label={label} className={className} onClick={(e) => openDemoNotice(e.currentTarget)}>
      {children}
    </button>
  );
}
