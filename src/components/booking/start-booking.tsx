"use client";

import { useActionState } from "react";
import { startBookingAction, type ActionState } from "@/app/reservation/actions";
import { track } from "@/lib/analytics-client";

/** Démarre le tunnel : l'offre est actualisée côté serveur et un devis daté est créé. */
export function StartBookingButton({ offerRef, tripItemId, vertical, label = "Réserver cette offre", disabled = false, compact = false }: { offerRef: string; tripItemId?: string | null; vertical: "flights" | "hotels" | "cars"; label?: string; disabled?: boolean; compact?: boolean }) {
  const [state, action, pending] = useActionState<ActionState, FormData>(startBookingAction, {});
  return (
    <form action={action} onSubmit={() => track("checkout_start", { vertical })} className="flex flex-col gap-2">
      <input type="hidden" name="offerRef" value={offerRef} />
      {tripItemId ? <input type="hidden" name="tripItemId" value={tripItemId} /> : null}
      <button
        type="submit"
        disabled={pending || disabled}
        className={`inline-flex items-center justify-center rounded-[var(--radius-md)] bg-forest font-semibold text-white hover:bg-forest-deep disabled:cursor-not-allowed disabled:opacity-55 ${compact ? "min-h-10 px-4 text-sm" : "min-h-12 px-6"}`}
      >
        {pending ? "Vérification du prix et de la disponibilité…" : label}
      </button>
      {state.error ? (
        <p role="alert" className="text-sm font-medium text-danger">
          {state.error}
        </p>
      ) : null}
    </form>
  );
}
