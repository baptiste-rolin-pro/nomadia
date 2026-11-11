"use client";

import { useActionState, useEffect, useRef, useState } from "react";
import { useFormStatus } from "react-dom";
import { useRouter } from "next/navigation";
import { CreditCard, Loader2, ShieldCheck } from "lucide-react";
import { formatMoney } from "@/lib/money";
import type { AncillaryDef, TravelerInput } from "@/lib/providers/types";
import { cancelBookingAction, payAction, saveOptionsAction, saveTravelersAction, submitReviewAction, type ActionState } from "@/app/reservation/actions";

const TYPE_LABEL: Record<TravelerInput["type"], string> = { adult: "Adulte (12 ans et plus)", child: "Enfant (2 à 11 ans)", infant: "Bébé (moins de 2 ans)", guest: "Voyageur principal de la chambre", driver: "Conducteur principal" };

function SubmitButton({ children, pendingLabel }: { children: React.ReactNode; pendingLabel: string }) {
  const { pending } = useFormStatus();
  return (
    <button type="submit" disabled={pending} className="inline-flex min-h-12 items-center justify-center gap-2 rounded-[var(--radius-md)] bg-forest px-6 font-semibold text-white hover:bg-forest-deep disabled:opacity-60">
      {pending ? <Loader2 aria-hidden className="size-4 animate-spin" /> : null}
      {pending ? pendingLabel : children}
    </button>
  );
}

function FormError({ state }: { state: ActionState }) {
  if (!state.error) return null;
  return (
    <p role="alert" className="rounded-[var(--radius-md)] bg-danger-soft p-3 text-sm font-medium text-danger">
      {state.error}
    </p>
  );
}

// ---------------------------------------------------------------------------

export function TravelersStep({
  bookingId,
  types,
  initial,
  contactEmail,
  needsBirthDate,
  saved,
  loggedIn,
  sharedDemo = false,
}: {
  bookingId: string;
  types: TravelerInput["type"][];
  initial: TravelerInput[];
  contactEmail: string;
  needsBirthDate: boolean;
  saved: { id: string; firstName: string; lastName: string; birthDate: string | null }[];
  loggedIn: boolean;
  /** Site de démonstration public : adresse fictive obligatoire, aucun voyageur enregistré dans le compte partagé. */
  sharedDemo?: boolean;
}) {
  const [state, action] = useActionState<ActionState, FormData>(saveTravelersAction, {});
  const [values, setValues] = useState(types.map((type, i) => ({ type, firstName: initial[i]?.firstName ?? "", lastName: initial[i]?.lastName ?? "", birthDate: initial[i]?.birthDate ?? "" })));
  const formRef = useRef<HTMLFormElement>(null);
  useEffect(() => {
    if (state.issues?.length) formRef.current?.querySelector<HTMLElement>("[aria-invalid='true']")?.focus();
  }, [state]);
  const issue = (index: number, field: string) => state.issues?.find((i) => i.index === index && i.field === field)?.message;
  const general = state.issues?.filter((i) => i.field === "general") ?? [];
  return (
    <form ref={formRef} action={action} className="space-y-6" noValidate>
      <input type="hidden" name="bookingId" value={bookingId} />
      <input type="hidden" name="count" value={types.length} />
      <FormError state={state} />
      {general.map((g) => (
        <p key={g.message} role="alert" className="text-sm font-medium text-danger">
          {g.message}
        </p>
      ))}
      {values.map((v, i) => (
        <fieldset key={i} className="rounded-[var(--radius-lg)] border border-line bg-white p-5">
          <legend className="px-1 font-semibold">
            Voyageur {i + 1} — {TYPE_LABEL[v.type]}
          </legend>
          <input type="hidden" name={`t${i}.type`} value={v.type} />
          {saved.length ? (
            <div className="mb-4">
              <label htmlFor={`saved-${i}`} className="text-sm font-semibold">
                Utiliser un voyageur enregistré
              </label>
              <select
                id={`saved-${i}`}
                className="field-input mt-1"
                defaultValue=""
                onChange={(e) => {
                  const s = saved.find((x) => x.id === e.target.value);
                  if (s) setValues((all) => all.map((x, j) => (j === i ? { ...x, firstName: s.firstName, lastName: s.lastName, birthDate: s.birthDate ?? "" } : x)));
                }}
              >
                <option value="">— Choisir —</option>
                {saved.map((s) => (
                  <option key={s.id} value={s.id}>
                    {s.firstName} {s.lastName}
                  </option>
                ))}
              </select>
            </div>
          ) : null}
          <div className="grid gap-4 sm:grid-cols-3">
            {(["firstName", "lastName"] as const).map((field) => (
              <div key={field} className="flex flex-col gap-1.5">
                <label htmlFor={`t${i}-${field}`} className="text-sm font-semibold">
                  {field === "firstName" ? "Prénom" : "Nom"}
                </label>
                <input
                  id={`t${i}-${field}`}
                  name={`t${i}.${field}`}
                  autoComplete={i === 0 && !sharedDemo ? (field === "firstName" ? "given-name" : "family-name") : "off"}
                  className="field-input"
                  value={v[field]}
                  onChange={(e) => setValues((all) => all.map((x, j) => (j === i ? { ...x, [field]: e.target.value } : x)))}
                  aria-invalid={issue(i, field) ? true : undefined}
                  aria-describedby={issue(i, field) ? `t${i}-${field}-error` : undefined}
                  required
                />
                {issue(i, field) ? (
                  <p id={`t${i}-${field}-error`} className="text-sm font-medium text-danger">
                    {issue(i, field)}
                  </p>
                ) : null}
              </div>
            ))}
            {needsBirthDate ? (
              <div className="flex flex-col gap-1.5">
                <label htmlFor={`t${i}-birth`} className="text-sm font-semibold">
                  Date de naissance
                </label>
                <input
                  id={`t${i}-birth`}
                  type="date"
                  name={`t${i}.birthDate`}
                  autoComplete={i === 0 && !sharedDemo ? "bday" : "off"}
                  className="field-input"
                  value={v.birthDate}
                  onChange={(e) => setValues((all) => all.map((x, j) => (j === i ? { ...x, birthDate: e.target.value } : x)))}
                  aria-invalid={issue(i, "birthDate") ? true : undefined}
                  aria-describedby={`t${i}-birth-hint${issue(i, "birthDate") ? ` t${i}-birth-error` : ""}`}
                  required
                />
                <p id={`t${i}-birth-hint`} className="text-xs text-ink-soft">
                  L&apos;âge est vérifié à la date de chaque trajet.
                </p>
                {issue(i, "birthDate") ? (
                  <p id={`t${i}-birth-error`} className="text-sm font-medium text-danger">
                    {issue(i, "birthDate")}
                  </p>
                ) : null}
              </div>
            ) : null}
          </div>
        </fieldset>
      ))}
      <div className="rounded-[var(--radius-lg)] border border-line bg-white p-5">
        <label htmlFor="contactEmail" className="text-sm font-semibold">
          Email de contact pour la confirmation
        </label>
        <input
          id="contactEmail"
          name="contactEmail"
          type="email"
          autoComplete={sharedDemo ? "off" : "email"}
          defaultValue={contactEmail}
          placeholder={sharedDemo ? "voyageur@exemple.test" : undefined}
          aria-describedby="contactEmail-hint"
          className="field-input mt-1.5"
          required
        />
        <p id="contactEmail-hint" className="mt-1 text-xs text-ink-soft">
          {sharedDemo
            ? "Adresse fictive obligatoire (domaine .test, .example ou example.com). Aucun email n'est envoyé par cette démonstration."
            : "En local, l'email est capturé dans la boîte de test et n'est pas envoyé."}
        </p>
        {loggedIn && !sharedDemo ? (
          <label className="mt-4 flex items-start gap-2 text-sm">
            <input type="checkbox" name="saveToAccount" className="mt-0.5 size-4 accent-[var(--color-forest)]" />
            <span>J&apos;accepte que ces voyageurs (nom, prénom, date de naissance) soient enregistrés dans mon compte pour mes prochaines réservations. Facultatif, modifiable dans mon profil.</span>
          </label>
        ) : null}
      </div>
      <SubmitButton pendingLabel="Vérification…">Continuer vers les options</SubmitButton>
    </form>
  );
}

// ---------------------------------------------------------------------------

export function OptionsStep({ bookingId, options, selected, days }: { bookingId: string; options: AncillaryDef[]; selected: Record<string, number>; days: number }) {
  const [state, action] = useActionState<ActionState, FormData>(saveOptionsAction, {});
  const [qty, setQty] = useState<Record<string, number>>(Object.fromEntries(options.map((o) => [o.id, selected[o.id] ?? 0])));
  return (
    <form action={action} className="space-y-5">
      <input type="hidden" name="bookingId" value={bookingId} />
      <FormError state={state} />
      <p className="text-sm text-ink-soft">Aucune option n&apos;est présélectionnée. Ajoutez uniquement ce qui vous est utile.</p>
      {options.length === 0 ? <p>Aucune option disponible pour cette offre.</p> : null}
      <ul className="space-y-3">
        {options.map((o) => (
          <li key={o.id} className="flex flex-wrap items-center justify-between gap-4 rounded-[var(--radius-lg)] border border-line bg-white p-4">
            <input type="hidden" name="optionIds" value={o.id} />
            <div className="min-w-0 flex-1">
              <label htmlFor={`opt-${o.id}`} className="font-semibold">
                {o.label}
              </label>
              <p className="text-sm text-ink-soft">{o.description}</p>
              <p className="mt-1 text-sm">
                {o.unitPrice.amount === 0 ? "Sans supplément annoncé" : `${formatMoney(o.unitPrice)} ${o.per === "day" ? `par jour (${days} jour${days > 1 ? "s" : ""})` : o.per === "passenger" ? "par passager et par trajet" : "par réservation"}`} · {o.payable === "now" ? "payé en ligne" : "payable sur place"}
                {!o.guaranteed ? " · demande non garantie" : ""}
              </p>
            </div>
            {o.maxQuantity > 1 ? (
              <div className="flex items-center gap-2">
                <span className="sr-only">Quantité</span>
                <select id={`opt-${o.id}`} name={`qty.${o.id}`} value={qty[o.id]} onChange={(e) => setQty({ ...qty, [o.id]: Number(e.target.value) })} className="field-input w-24">
                  {Array.from({ length: o.maxQuantity + 1 }, (_, n) => (
                    <option key={n} value={n}>
                      {n}
                    </option>
                  ))}
                </select>
              </div>
            ) : (
              <>
                <input type="hidden" name={`qty.${o.id}`} value={qty[o.id]} />
                <input id={`opt-${o.id}`} type="checkbox" checked={qty[o.id] === 1} onChange={(e) => setQty({ ...qty, [o.id]: e.target.checked ? 1 : 0 })} className="size-5 accent-[var(--color-forest)]" />
              </>
            )}
          </li>
        ))}
      </ul>
      <SubmitButton pendingLabel="Calcul du total…">Continuer vers la vérification</SubmitButton>
    </form>
  );
}

// ---------------------------------------------------------------------------

export function ReviewStep({ bookingId, scenarios, currentScenario, payNow, collector }: { bookingId: string; scenarios: Record<string, string> | null; currentScenario: string | null; payNow: string; collector: string }) {
  const [state, action] = useActionState<ActionState, FormData>(submitReviewAction, {});
  return (
    <form action={action} className="space-y-5">
      <input type="hidden" name="bookingId" value={bookingId} />
      <FormError state={state} />
      {scenarios ? (
        <div className="rounded-[var(--radius-lg)] border border-dashed border-terracotta/60 bg-terracotta-soft/40 p-4">
          <label htmlFor="scenario" className="text-sm font-semibold">
            Outil de démonstration — scénario fournisseur / paiement
          </label>
          <select id="scenario" name="scenario" className="field-input mt-1.5" defaultValue={currentScenario ?? "nominal"}>
            {Object.entries(scenarios).map(([k, v]) => (
              <option key={k} value={k}>
                {v}
              </option>
            ))}
          </select>
          <p className="mt-1 text-xs text-ink-soft">Disponible uniquement en mode DEMO ; sans effet sur un fournisseur réel.</p>
        </div>
      ) : null}
      <label className="flex items-start gap-3 rounded-[var(--radius-lg)] border border-line bg-white p-4 text-sm">
        <input type="checkbox" name="terms" required className="mt-0.5 size-5 shrink-0 accent-[var(--color-forest)]" />
        <span>
          J&apos;ai lu les conditions de l&apos;offre (bagages, annulation, modification, montants payables sur place) et les conditions du fournisseur, et je les accepte. Le prix et la disponibilité vont être vérifiés une dernière fois.
        </span>
      </label>
      <p className="text-sm text-ink-soft">
        {collector === "platform" ? `Montant qui sera demandé à l'étape suivante : ${payNow} (paiement simulé).` : "Aucun paiement en ligne : la prestation se règle sur place."}
      </p>
      <SubmitButton pendingLabel="Actualisation du prix…">Valider et vérifier le prix</SubmitButton>
    </form>
  );
}

// ---------------------------------------------------------------------------

export function PaymentStep({ bookingId, idempotencyKey, amount, status }: { bookingId: string; idempotencyKey: string; amount: string; status: string }) {
  const [state, action, pending] = useActionState<ActionState, FormData>(payAction, {});
  return (
    <form action={action} className="space-y-5">
      <input type="hidden" name="bookingId" value={bookingId} />
      <input type="hidden" name="idempotencyKey" value={idempotencyKey} />
      <FormError state={state} />
      {status === "declined" ? (
        <p role="alert" className="rounded-[var(--radius-md)] bg-danger-soft p-3 text-sm">
          Le paiement précédent a été <strong>refusé</strong> (simulation). Aucune réservation n&apos;a été transmise au fournisseur. Vous pouvez réessayer.
        </p>
      ) : null}
      <div className="rounded-[var(--radius-lg)] border border-line bg-white p-5">
        <p className="flex items-center gap-2 font-semibold">
          <CreditCard aria-hidden className="size-5 text-forest" /> Paiement simulé
        </p>
        <p className="mt-2 text-sm text-ink-soft">
          Aucune donnée bancaire n&apos;est demandée ni stockée. En exploitation, cette étape utiliserait une page de paiement hébergée par un prestataire agréé ; le numéro de carte ne transiterait jamais par les serveurs de Nomadia.
        </p>
        <p className="mt-4 flex items-center gap-2 text-sm">
          <ShieldCheck aria-hidden className="size-4 text-success" /> Montant calculé par le serveur à partir de l&apos;offre fournisseur : <strong>{amount}</strong>
        </p>
      </div>
      <button type="submit" disabled={pending} className="inline-flex min-h-12 items-center justify-center gap-2 rounded-[var(--radius-md)] bg-forest px-6 font-semibold text-white hover:bg-forest-deep disabled:opacity-60" data-testid="pay-button">
        {pending ? <Loader2 aria-hidden className="size-4 animate-spin" /> : null}
        {pending ? "Paiement en cours…" : `Payer ${amount} (simulation)`}
      </button>
    </form>
  );
}

// ---------------------------------------------------------------------------

/** Actualise la page tant que le statut fournisseur ou le remboursement est en attente (intervalle croissant). */
export function StatusPoller({ active }: { active: boolean }) {
  const router = useRouter();
  useEffect(() => {
    if (!active) return;
    let delay = 2000;
    let timer: ReturnType<typeof setTimeout>;
    const tick = () => {
      if (document.visibilityState === "visible") router.refresh();
      delay = Math.min(delay * 1.4, 10000);
      timer = setTimeout(tick, delay);
    };
    timer = setTimeout(tick, delay);
    return () => clearTimeout(timer);
  }, [active, router]);
  return null;
}

export function CancelPanel({ bookingId, fee, refund, message }: { bookingId: string; fee: { amount: number; currency: string }; refund: { amount: number; currency: string }; message: string }) {
  const [state, action] = useActionState<ActionState, FormData>(cancelBookingAction, {});
  const [confirming, setConfirming] = useState(false);
  if (state.notice) return <p role="status" className="text-sm font-semibold text-success">{state.notice}</p>;
  return (
    <div className="space-y-3 text-sm">
      <p>{message}</p>
      <p>
        Frais d&apos;annulation : <strong>{formatMoney(fee)}</strong> · Remboursement prévu : <strong>{formatMoney(refund)}</strong> (confirmé uniquement après le retour du prestataire de paiement).
      </p>
      <FormError state={state} />
      {!confirming ? (
        <button type="button" onClick={() => setConfirming(true)} className="min-h-11 rounded-[var(--radius-md)] border border-danger px-5 font-semibold text-danger hover:bg-danger-soft">
          Annuler la réservation…
        </button>
      ) : (
        <form action={action} className="flex flex-wrap items-center gap-3 rounded-[var(--radius-md)] bg-danger-soft p-3">
          <input type="hidden" name="bookingId" value={bookingId} />
          <input type="hidden" name="acceptedFee" value={fee.amount} />
          <p className="font-semibold">Confirmer l&apos;annulation avec {formatMoney(fee)} de frais ? Cette action est irréversible.</p>
          <SubmitButton pendingLabel="Annulation…">Confirmer l&apos;annulation</SubmitButton>
          <button type="button" onClick={() => setConfirming(false)} className="font-semibold underline">
            Garder la réservation
          </button>
        </form>
      )}
    </div>
  );
}
