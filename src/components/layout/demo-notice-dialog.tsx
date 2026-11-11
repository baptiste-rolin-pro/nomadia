"use client";

import Link from "next/link";
import { useEffect, useId, useRef, type KeyboardEvent, type MouseEvent } from "react";
import { CreditCard, ShieldAlert, Tag, Users, X } from "lucide-react";
import { demoNoticeOpener } from "@/lib/demo-notice";
import { FlightPath } from "@/components/ui/flight-path";

const FOCUSABLE = "a[href], button:not([disabled]), input:not([disabled]), select:not([disabled]), textarea:not([disabled]), [tabindex]:not([tabindex='-1'])";

/**
 * Fenêtre « À propos de la démonstration » (chargée à la demande).
 * `<dialog>` modal natif : le reste de la page est inerte ; Tab et Maj+Tab bouclent dans la fenêtre ;
 * Échap, le bouton « Fermer », « Explorer la démo » ou un clic hors de la fenêtre la ferment ;
 * le focus revient au bouton qui l'a ouverte.
 */
export default function DemoNoticeDialog({ sharedAccounts, onDismiss }: { sharedAccounts: boolean; onDismiss: () => void }) {
  const ref = useRef<HTMLDialogElement>(null);
  const primaryRef = useRef<HTMLButtonElement>(null);
  const titleId = useId();
  const descId = useId();

  useEffect(() => {
    const dialog = ref.current;
    if (!dialog) return;
    const active = document.activeElement;
    const opener = demoNoticeOpener() ?? (active instanceof HTMLElement && active !== document.body ? active : null);
    if (!dialog.open) dialog.showModal();
    // Sur petit écran, la fenêtre défile : le focus ne doit pas masquer le titre en la faisant défiler.
    primaryRef.current?.focus({ preventScroll: true });
    dialog.scrollTop = 0;
    const onClose = () => {
      if (opener?.isConnected) opener.focus();
      onDismiss();
    };
    dialog.addEventListener("close", onClose);
    return () => dialog.removeEventListener("close", onClose);
  }, [onDismiss]);

  const close = () => ref.current?.close();

  const onKeyDown = (e: KeyboardEvent<HTMLDialogElement>) => {
    if (e.key !== "Tab" || !ref.current) return;
    const items = Array.from(ref.current.querySelectorAll<HTMLElement>(FOCUSABLE));
    const first = items[0];
    const last = items[items.length - 1];
    if (!first || !last) return;
    if (e.shiftKey && (document.activeElement === first || document.activeElement === ref.current)) {
      e.preventDefault();
      last.focus();
    } else if (!e.shiftKey && document.activeElement === last) {
      e.preventDefault();
      first.focus();
    }
  };

  const onBackdrop = (e: MouseEvent<HTMLDialogElement>) => {
    if (e.target === ref.current) close();
  };

  const points = [
    { icon: CreditCard, title: "Aucune réservation ni aucun paiement réel", text: "Le parcours va jusqu'aux billets émis, mais rien n'est transmis à un fournisseur et aucune somme n'est débitée." },
    { icon: Tag, title: "Prix et prestataires fictifs", text: "Compagnies, hôtels et loueurs de démonstration : les offres varient selon vos critères, sans exister réellement." },
    sharedAccounts
      ? { icon: Users, title: "Comptes de démonstration partagés", text: "Les identifiants sont affichés sur la page de connexion. Ce que vous saisissez peut être vu par les autres visiteurs." }
      : { icon: Users, title: "Comptes de test", text: "Les comptes créés ici servent uniquement à tester le site et peuvent être supprimés à tout moment." },
    { icon: ShieldAlert, title: "Aucune donnée personnelle réelle", text: "Utilisez des noms, dates de naissance et adresses fictifs, par exemple camille@exemple.test." },
  ];

  return (
    <dialog
      ref={ref}
      aria-labelledby={titleId}
      aria-describedby={descId}
      onKeyDown={onKeyDown}
      onClick={onBackdrop}
      data-testid="demo-notice"
      className="demo-notice no-print m-auto max-h-[calc(100dvh-1.5rem)] w-[min(35rem,calc(100vw-1.5rem))] max-w-none overflow-y-auto overscroll-contain rounded-[var(--radius-xl)] border-0 bg-white p-0 text-ink shadow-[var(--shadow-panel)]"
    >
      <div className="relative overflow-hidden bg-forest-deep px-5 pb-5 pt-6 text-white sm:px-8 sm:pb-6 sm:pt-7">
        <FlightPath size="sm" mode="once" className="absolute bottom-3 right-12 hidden text-white/40 sm:inline-block" />
        <p className="eyebrow relative !text-white/80">Démonstration</p>
        <h2 id={titleId} className="relative mt-2 max-w-[17rem] font-serif text-[1.6rem] leading-tight text-balance sm:max-w-[22rem] sm:text-[1.85rem]">
          Bienvenue sur la démo de Nomadia
        </h2>
        <button type="button" onClick={close} aria-label="Fermer" className="absolute right-2 top-2 inline-flex size-11 items-center justify-center rounded-full text-white/85 transition-colors hover:bg-white/15 hover:text-white">
          <X aria-hidden className="size-5" />
        </button>
      </div>
      <div className="px-5 pb-5 pt-4 sm:px-8 sm:pb-7 sm:pt-5">
        <p id={descId} className="text-[0.95rem] text-ink-soft sm:text-base">
          Ce site montre le parcours complet d&apos;une plateforme de voyage, de l&apos;idée de départ aux billets émis. Tout y est simulé.
        </p>
        <ul className="mt-4 space-y-3 sm:mt-5 sm:space-y-4">
          {points.map((p) => (
            <li key={p.title} className="flex gap-3">
              <span className="mt-0.5 flex size-8 shrink-0 items-center justify-center rounded-full bg-forest-soft text-forest sm:size-9" aria-hidden>
                <p.icon className="size-4 sm:size-[1.1rem]" />
              </span>
              <div>
                <p className="font-semibold leading-snug">{p.title}</p>
                <p className="mt-0.5 text-[0.82rem] leading-relaxed text-ink-soft sm:text-sm">{p.text}</p>
              </div>
            </li>
          ))}
        </ul>
        <div className="mt-6 flex flex-col-reverse gap-3 sm:mt-7 sm:flex-row sm:items-center sm:justify-end">
          {sharedAccounts ? (
            <Link href="/connexion" onClick={close} className="inline-flex min-h-11 items-center justify-center rounded-[var(--radius-md)] border border-forest px-5 font-semibold text-forest transition-colors hover:bg-forest-soft">
              Voir les comptes de démo
            </Link>
          ) : null}
          <button ref={primaryRef} type="button" onClick={close} className="inline-flex min-h-11 items-center justify-center rounded-[var(--radius-md)] bg-forest px-6 font-semibold text-white transition-colors hover:bg-forest-deep">
            Explorer la démo
          </button>
        </div>
        <p className="mt-5 text-xs text-ink-soft">Ces informations restent accessibles depuis le lien « À propos de la démo » du pied de page.</p>
      </div>
    </dialog>
  );
}
