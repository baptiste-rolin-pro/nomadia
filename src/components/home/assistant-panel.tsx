"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useEffect, useId, useRef, useState, type FormEvent, type KeyboardEvent } from "react";
import { ArrowRight, Sparkles } from "lucide-react";
import { ASSISTANT_MAX_INPUT, isAssistantHref, type AssistantAction, type AssistantResponseBody, type AssistantResult, type AssistantStatusBody } from "@/lib/assistant/types";

/**
 * Assistant de l'accueil (chargé à l'ouverture de son onglet : hors du JavaScript initial).
 * Le texte est envoyé à /api/assistant, qui renvoie des actions validées avec des chemins construits par le serveur.
 * Une seule action : ce qui a été compris s'affiche, puis la page s'ouvre après un court délai (« Rester ici » annule).
 * Plusieurs actions : plan en étapes, le visiteur choisit. Question de précision : le champ devient « Votre réponse ».
 * Accessibilité : libellé visible, région `status` pour l'avancement, focus déplacé sur le résultat ou sur le champ.
 */

const EXAMPLES = ["Un week-end à Lisbonne en mars pour 2", "Vol Paris–Rome le 12 juin, retour le 16, avec une voiture sur place", "Organise-moi 5 jours en Islande en famille"];
/** Délai avant l'ouverture automatique d'une action unique : le temps de lire ce qui a été compris. */
export const AUTO_OPEN_DELAY_MS = 2200;
const UNREACHABLE = "L'assistant est injoignable pour le moment. Les onglets Mon voyage, Vols, Hôtels et Voitures fonctionnent normalement.";

type Previous = { request: string; question: string };

const OPEN_LABEL: Record<AssistantAction["kind"], string> = {
  search_flights: "Ouvrir la recherche de vols",
  search_hotels: "Ouvrir la recherche d'hébergement",
  search_cars: "Ouvrir la recherche de voitures",
  open_destination: "Ouvrir la fiche destination",
  plan_trip: "Ouvrir le formulaire du voyage",
};

export default function AssistantPanel({ active }: { active: boolean }) {
  const router = useRouter();
  const ids = useId();
  const fieldId = `${ids}-texte`;
  const [available, setAvailable] = useState<boolean | null>(null);
  const [text, setText] = useState("");
  const [fieldError, setFieldError] = useState<string | null>(null);
  const [pending, setPending] = useState(false);
  const [result, setResult] = useState<AssistantResult | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [previous, setPrevious] = useState<Previous | null>(null);
  const [status, setStatus] = useState("");
  const [autoOpen, setAutoOpen] = useState<string | null>(null);
  const fieldRef = useRef<HTMLTextAreaElement>(null);
  const resultRef = useRef<HTMLHeadingElement>(null);
  const abortRef = useRef<AbortController | null>(null);
  const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => {
    const ctrl = new AbortController();
    fetch("/api/assistant", { cache: "no-store", signal: ctrl.signal })
      .then((r) => (r.ok ? (r.json() as Promise<AssistantStatusBody>) : { available: false }))
      .then((b) => setAvailable(b.available === true))
      .catch(() => {
        if (!ctrl.signal.aborted) setAvailable(false);
      });
    return () => ctrl.abort();
  }, []);

  const cancelAutoOpen = (announce: boolean) => {
    if (timerRef.current) clearTimeout(timerRef.current);
    timerRef.current = null;
    if (autoOpen && announce) setStatus("Ouverture annulée. Le lien reste disponible.");
    setAutoOpen(null);
  };

  // Onglet quitté : l'ouverture automatique n'a plus lieu (vérifié au moment du déclenchement).
  const activeRef = useRef(active);
  useEffect(() => {
    activeRef.current = active;
  }, [active]);
  // Démontage : aucune ouverture ni requête orpheline.
  useEffect(
    () => () => {
      if (timerRef.current) clearTimeout(timerRef.current);
      abortRef.current?.abort();
    },
    [],
  );

  const showResult = (r: AssistantResult, sent: string) => {
    if (r.type === "clarification") {
      setPrevious((p) => ({ request: (p ? `${p.request} — ${sent}` : sent).slice(0, ASSISTANT_MAX_INPUT), question: r.question }));
      setResult(r);
      setText("");
      setStatus(`Question de l'assistant : ${r.question}`);
      requestAnimationFrame(() => fieldRef.current?.focus());
      return;
    }
    setPrevious(null);
    if (r.type === "out_of_scope") {
      setResult(r);
      setStatus(r.message);
      requestAnimationFrame(() => fieldRef.current?.focus());
      return;
    }
    const actions = r.actions.filter((a) => isAssistantHref(a.href));
    if (!actions.length) {
      setError(UNREACHABLE);
      return;
    }
    setResult({ type: "actions", actions });
    if (actions.length === 1) {
      const only = actions[0]!;
      router.prefetch(only.href);
      setStatus(`J'ai compris : ${only.title}. ${only.details.join(". ")}. Ouverture dans un instant.`);
      setAutoOpen(only.href);
      timerRef.current = setTimeout(() => {
        timerRef.current = null;
        setAutoOpen(null);
        if (activeRef.current) router.push(only.href);
      }, AUTO_OPEN_DELAY_MS);
    } else {
      setStatus(`Plan en ${actions.length} étapes prêt : ${actions.map((a) => a.title).join(", ")}. Choisissez l'étape à ouvrir.`);
    }
    requestAnimationFrame(() => resultRef.current?.focus());
  };

  const submit = async () => {
    const value = text.trim();
    if (!value) {
      setFieldError("Décrivez votre voyage en quelques mots.");
      fieldRef.current?.focus();
      return;
    }
    setFieldError(null);
    cancelAutoOpen(false);
    abortRef.current?.abort();
    const ctrl = new AbortController();
    abortRef.current = ctrl;
    setPending(true);
    setError(null);
    setStatus("Analyse de votre demande…");
    try {
      const res = await fetch("/api/assistant", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ text: value, previous }),
        signal: ctrl.signal,
      });
      const body = (await res.json().catch(() => null)) as AssistantResponseBody | null;
      if (ctrl.signal.aborted) return;
      // Une question en cours reste affichée (le tour précédent sera renvoyé avec la prochaine réponse).
      const keepQuestion = (r: AssistantResult | null) => (r?.type === "clarification" ? r : null);
      if (!body) {
        setResult(keepQuestion);
        setError(UNREACHABLE);
        setStatus("");
      } else if (body.status === "error") {
        setResult(keepQuestion);
        setError(body.message);
        setStatus("");
      } else {
        showResult(body.result, value);
      }
    } catch {
      if (ctrl.signal.aborted) return;
      setResult((r) => (r?.type === "clarification" ? r : null));
      setError(UNREACHABLE);
      setStatus("");
    } finally {
      if (abortRef.current === ctrl) {
        abortRef.current = null;
        setPending(false);
      }
    }
  };

  const onSubmit = (e: FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    void submit();
  };

  const onKeyDown = (e: KeyboardEvent<HTMLTextAreaElement>) => {
    if (e.key === "Enter" && !e.shiftKey && !e.nativeEvent.isComposing) {
      e.preventDefault();
      if (!pending) void submit();
    }
  };

  const restart = () => {
    cancelAutoOpen(false);
    setPrevious(null);
    setResult(null);
    setError(null);
    setText("");
    setStatus("Nouvelle demande.");
    fieldRef.current?.focus();
  };

  const question = result?.type === "clarification" ? result.question : null;
  const hintId = `${ids}-aide`;
  const questionId = `${ids}-question`;
  const errorId = `${ids}-erreur`;

  if (available === null) return <p className="py-6 text-sm text-ink-soft">Chargement de l&apos;assistant…</p>;
  if (!available) {
    return (
      <div className="rounded-[var(--radius-md)] border border-warning/35 bg-warning-soft p-4 text-sm" data-testid="assistant-indisponible">
        <p className="font-semibold">L&apos;assistant est indisponible pour le moment.</p>
        <p className="mt-1 text-ink-soft">Les onglets Mon voyage, Vols, Hôtels et Voitures fonctionnent normalement.</p>
      </div>
    );
  }

  return (
    <div className="space-y-4" data-testid="assistant">
      <p className="text-sm text-ink-soft">
        Décrivez votre voyage en une phrase : l&apos;assistant prépare la recherche ou le voyage correspondant et vous montre ce qu&apos;il a compris avant d&apos;ouvrir la page. Il ne réserve rien. Votre texte est transmis à Anthropic (Claude) pour être interprété : n&apos;y mettez aucune donnée personnelle (
        <Link href="/confidentialite#assistant" className="font-semibold text-forest underline underline-offset-4">
          en savoir plus
        </Link>
        ).
      </p>

      {question ? (
        <div id={questionId} className="flex gap-3 rounded-[var(--radius-md)] border border-forest/25 bg-forest-soft p-3 text-sm" data-testid="assistant-question">
          <Sparkles aria-hidden className="mt-0.5 size-4 shrink-0 text-forest" />
          <p>
            <span className="sr-only">Question de l&apos;assistant : </span>
            {question}
          </p>
        </div>
      ) : null}

      <form onSubmit={onSubmit} noValidate aria-label="Demande à l'assistant" aria-busy={pending} className="space-y-3">
        <div className="flex flex-col gap-1.5">
          <label htmlFor={fieldId} className="text-sm font-semibold">
            {question ? "Votre réponse" : "Décrivez votre voyage"}
          </label>
          <textarea
            ref={fieldRef}
            id={fieldId}
            name="demande"
            rows={2}
            maxLength={ASSISTANT_MAX_INPUT}
            className="field-input min-h-[4.5rem] resize-y py-3"
            placeholder={question ? "Par exemple : 2 adultes et 2 enfants, du 10 au 14 avril" : `Par exemple : ${EXAMPLES[0]}`}
            value={text}
            onChange={(e) => {
              setText(e.target.value);
              if (fieldError) setFieldError(null);
            }}
            onKeyDown={onKeyDown}
            aria-invalid={fieldError ? true : undefined}
            aria-describedby={[question ? questionId : null, hintId, fieldError ? errorId : null].filter(Boolean).join(" ")}
          />
          <p id={hintId} className="flex flex-wrap justify-between gap-2 text-xs text-ink-soft">
            <span>Entrée pour envoyer, Maj + Entrée pour aller à la ligne. {ASSISTANT_MAX_INPUT} caractères au plus.</span>
            <span aria-hidden>
              {text.length}/{ASSISTANT_MAX_INPUT}
            </span>
          </p>
          {fieldError ? (
            <p id={errorId} className="text-sm font-medium text-danger">
              {fieldError}
            </p>
          ) : null}
        </div>

        {!question ? (
          <div>
            <p className="text-xs font-semibold text-ink-soft" id={`${ids}-exemples`}>
              Exemples
            </p>
            <ul className="mt-1.5 flex flex-wrap gap-2" aria-labelledby={`${ids}-exemples`}>
              {EXAMPLES.map((ex) => (
                <li key={ex}>
                  <button
                    type="button"
                    className="rounded-full border border-line bg-white px-3 py-1.5 text-left text-xs font-medium text-ink transition-colors hover:border-sand hover:bg-ivory"
                    onClick={() => {
                      setText(ex);
                      setFieldError(null);
                      fieldRef.current?.focus();
                    }}
                  >
                    {ex}
                  </button>
                </li>
              ))}
            </ul>
          </div>
        ) : null}

        <div className="flex flex-wrap items-center justify-between gap-3">
          <p className="text-xs text-ink-soft">Les dates supposées sont toujours signalées ; vérifiez-les avant de réserver.</p>
          <div className="flex flex-wrap items-center gap-2">
            {previous || result ? (
              <button type="button" onClick={restart} className="inline-flex min-h-12 items-center rounded-[var(--radius-md)] px-4 text-sm font-semibold text-forest underline underline-offset-4">
                Nouvelle demande
              </button>
            ) : null}
            <button type="submit" disabled={pending} className="inline-flex min-h-12 items-center justify-center gap-2 rounded-[var(--radius-md)] bg-forest px-6 font-semibold text-white transition-colors hover:bg-forest-deep disabled:opacity-60">
              <Sparkles aria-hidden className="size-4" />
              {pending ? "Analyse…" : question ? "Répondre" : "Demander à l'assistant"}
            </button>
          </div>
        </div>
      </form>

      <p role="status" className="sr-only" data-testid="assistant-status">
        {status}
      </p>

      {error ? (
        <p role="alert" className="rounded-[var(--radius-md)] border border-danger/35 bg-danger-soft p-3 text-sm font-medium text-ink" data-testid="assistant-erreur">
          {error}
        </p>
      ) : null}

      {result?.type === "out_of_scope" ? (
        <p className="rounded-[var(--radius-md)] border border-line bg-ivory p-3 text-sm" data-testid="assistant-hors-sujet">
          {result.message}
        </p>
      ) : null}

      {result?.type === "actions" ? (
        <section aria-labelledby={`${ids}-resultat`} className="rounded-[var(--radius-lg)] border border-line bg-ivory p-4" data-testid="assistant-resultat">
          <h3 ref={resultRef} id={`${ids}-resultat`} tabIndex={-1} className="font-serif text-lg outline-none">
            {result.actions.length === 1 ? "Voici ce que j'ai compris" : `Votre plan en ${result.actions.length} étapes`}
          </h3>
          <ol className="mt-3 space-y-4">
            {result.actions.map((a, i) => {
              const titleId = `${ids}-etape-${i}`;
              const many = result.actions.length > 1;
              return (
                <li key={`${a.kind}-${i}`} className="rounded-[var(--radius-md)] bg-white p-3 shadow-[var(--shadow-card)]" data-testid="assistant-etape">
                  <p id={titleId} className="font-semibold">
                    {many ? `Étape ${i + 1} · ` : ""}
                    {a.title}
                  </p>
                  <ul className="mt-1 space-y-0.5 text-sm text-ink-soft">
                    {a.details.map((d) => (
                      <li key={d}>{d}</li>
                    ))}
                  </ul>
                  {a.assumptions.length ? (
                    <div className="mt-2 rounded-[var(--radius-sm,0.375rem)] bg-warning-soft px-3 py-2 text-sm">
                      <p className="font-semibold text-warning">Supposé par l&apos;assistant, à vérifier</p>
                      <ul className="mt-0.5 list-disc pl-5">
                        {a.assumptions.map((s) => (
                          <li key={s}>{s}</li>
                        ))}
                      </ul>
                    </div>
                  ) : null}
                  {a.notes.length ? (
                    <ul className="mt-2 space-y-0.5 text-xs text-ink-soft">
                      {a.notes.map((n) => (
                        <li key={n}>{n}</li>
                      ))}
                    </ul>
                  ) : null}
                  <Link
                    href={a.href}
                    aria-describedby={titleId}
                    onClick={() => cancelAutoOpen(false)}
                    className="mt-3 inline-flex min-h-11 items-center gap-2 rounded-[var(--radius-md)] bg-forest px-4 text-sm font-semibold text-white hover:bg-forest-deep"
                  >
                    {many ? `Ouvrir l'étape ${i + 1}` : OPEN_LABEL[a.kind]}
                    <ArrowRight aria-hidden className="size-4" />
                  </Link>
                </li>
              );
            })}
          </ol>
          {autoOpen ? (
            <p className="mt-3 flex flex-wrap items-center gap-3 text-sm text-ink-soft" data-testid="assistant-ouverture">
              Ouverture automatique dans un instant…
              <button type="button" onClick={() => cancelAutoOpen(true)} className="inline-flex min-h-11 items-center rounded-[var(--radius-md)] border border-forest px-3 font-semibold text-forest hover:bg-forest-soft">
                Rester ici
              </button>
            </p>
          ) : null}
        </section>
      ) : null}
    </div>
  );
}
