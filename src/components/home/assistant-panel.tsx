"use client";

import { Link } from "@/i18n/link";
import { useRouter } from "next/navigation";
import { useI18n } from "@/i18n/client";
import { localizePath } from "@/i18n/config";
import { useEffect, useId, useRef, useState, type FormEvent, type KeyboardEvent } from "react";
import { ArrowRight, MessageCircleQuestion, Send } from "lucide-react";
import {
  ASSISTANT_MAX_INPUT,
  ASSISTANT_TURN_SEPARATOR,
  isAssistantHref,
  type AssistantAction,
  type AssistantEngine,
  type AssistantResponseBody,
  type AssistantResult,
  type AssistantStatusBody,
} from "@/lib/assistant/types";

/**
 * Assistant de l'accueil (chargé à l'ouverture de son onglet : hors du JavaScript initial).
 * Le texte est envoyé à /api/assistant : analyse locale sur le serveur de Nomadia, puis, seulement si elle ne
 * comprend pas la demande et qu'une clé est configurée, repli vers Claude (moteur « ia », signalé ici).
 * Une seule action : ce qui a été compris s'affiche, puis la page s'ouvre après un court délai (« Rester ici » annule).
 * Plusieurs actions : plan en étapes, le visiteur choisit. Question de précision : le champ devient « Votre réponse ».
 * Demande non comprise : exemples et accès aux onglets classiques.
 * Accessibilité : libellé visible, région `status` pour l'avancement, focus déplacé sur le résultat ou sur le champ.
 */

/** Délai avant l'ouverture automatique d'une action unique : le temps de lire ce qui a été compris. */
export const AUTO_OPEN_DELAY_MS = 2200;

type Previous = { request: string; question: string };
export type ClassicTab = "voyage" | "vols" | "hotels" | "voitures";
const CLASSIC_TABS: ClassicTab[] = ["voyage", "vols", "hotels", "voitures"];

export default function AssistantPanel({ active, onOpenTab }: { active: boolean; onOpenTab?: (tab: ClassicTab) => void }) {
  const router = useRouter();
  const { locale, m, f } = useI18n();
  const t = m.assistantUi;
  const EXAMPLES = t.examples;
  const UNREACHABLE = t.unreachable;
  const OPEN_LABEL: Record<AssistantAction["kind"], string> = t.open;
  const ids = useId();
  const fieldId = `${ids}-texte`;
  /** Repli vers Claude configuré sur le serveur (null : pas encore connu). */
  const [fallback, setFallback] = useState<boolean | null>(null);
  const [engine, setEngine] = useState<AssistantEngine | null>(null);
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
    // Statut inconnu (réseau) : mention prudente « peut être transmise à Anthropic ».
    fetch("/api/assistant", { cache: "no-store", signal: ctrl.signal })
      .then((r) => (r.ok ? (r.json() as Promise<AssistantStatusBody>) : { available: true, fallback: true }))
      .then((b) => setFallback(b.fallback !== false))
      .catch(() => {
        if (!ctrl.signal.aborted) setFallback(true);
      });
    return () => ctrl.abort();
  }, []);

  const cancelAutoOpen = (announce: boolean) => {
    if (timerRef.current) clearTimeout(timerRef.current);
    timerRef.current = null;
    if (autoOpen && announce) setStatus(t.cancelled);
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
      // Tours séparés par ASSISTANT_TURN_SEPARATOR : le serveur réanalyse la demande initiale et chaque réponse.
      setPrevious((p) => ({ request: (p ? `${p.request}${ASSISTANT_TURN_SEPARATOR}${sent}` : sent).slice(0, ASSISTANT_MAX_INPUT), question: r.question }));
      setResult(r);
      setText("");
      setStatus(f.t(t.questionStatus, { question: r.question }));
      requestAnimationFrame(() => fieldRef.current?.focus());
      return;
    }
    setPrevious(null);
    if (r.type === "out_of_scope" || r.type === "help") {
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
      // Le serveur construit déjà le chemin dans la langue de la page (/en/vols…) ; localizePath ne double jamais le préfixe.
      const target = localizePath(locale, only.href);
      router.prefetch(target);
      setStatus(f.t(t.understoodStatus, { title: only.title, details: only.details.join(". ") }));
      setAutoOpen(target);
      timerRef.current = setTimeout(() => {
        timerRef.current = null;
        setAutoOpen(null);
        if (activeRef.current) router.push(target);
      }, AUTO_OPEN_DELAY_MS);
    } else {
      setStatus(f.t(t.planStatus, { n: actions.length, titles: actions.map((a) => a.title).join(m.common.listSep) }));
    }
    requestAnimationFrame(() => resultRef.current?.focus());
  };

  const submit = async () => {
    const value = text.trim();
    if (!value) {
      setFieldError(t.empty);
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
    setStatus(t.analysing);
    try {
      const res = await fetch("/api/assistant", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ text: value, previous, locale }),
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
        setEngine(body.engine === "ia" ? "ia" : "local");
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
    setEngine(null);
    setError(null);
    setText("");
    setStatus(t.restarted);
    fieldRef.current?.focus();
  };

  const question = result?.type === "clarification" ? result.question : null;
  const hintId = `${ids}-aide`;
  const questionId = `${ids}-question`;
  const errorId = `${ids}-erreur`;

  // Discret, et seulement quand le texte est réellement parti chez Anthropic (repli) : jamais pour l'analyse locale.
  const engineBadge =
    engine === "ia" && result ? (
      <p className="text-xs text-ink-soft" data-testid="assistant-moteur">
        {t.engine}
      </p>
    ) : null;

  if (fallback === null) return <p className="py-6 text-sm text-ink-soft">{t.loading}</p>;

  return (
    <div className="space-y-4" data-testid="assistant">
      <p className="text-sm text-ink-soft" data-testid="assistant-intro">
        {t.intro} {fallback ? t.introFallback : t.introLocal}
        <Link href="/confidentialite#assistant" className="font-semibold text-forest underline underline-offset-4">
          {t.learnMore}
        </Link>
        ).
      </p>

      {question ? (
        <div id={questionId} className="flex gap-3 rounded-[var(--radius-md)] border border-forest/25 bg-forest-soft p-3 text-sm" data-testid="assistant-question">
          <MessageCircleQuestion aria-hidden className="mt-0.5 size-4 shrink-0 text-forest" />
          <p>
            <span className="sr-only">{t.questionPrefix}</span>
            {question}
          </p>
        </div>
      ) : null}
      {question ? engineBadge : null}

      <form onSubmit={onSubmit} noValidate aria-label={t.formLabel} aria-busy={pending} className="space-y-3">
        <div className="flex flex-col gap-1.5">
          <label htmlFor={fieldId} className="text-sm font-semibold">
            {question ? t.answerLabel : t.requestLabel}
          </label>
          <textarea
            ref={fieldRef}
            id={fieldId}
            name="demande"
            rows={2}
            maxLength={ASSISTANT_MAX_INPUT}
            className="field-input min-h-[4.5rem] resize-y py-3"
            placeholder={question ? t.answerPlaceholder : f.t(t.placeholder, { example: EXAMPLES[0] ?? "" })}
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
            <span>{f.t(t.keys, { max: f.number(ASSISTANT_MAX_INPUT) })}</span>
            <span aria-hidden>
              {f.number(text.length)}/{f.number(ASSISTANT_MAX_INPUT)}
            </span>
          </p>
          {fieldError ? (
            <p id={errorId} className="text-sm font-medium text-danger">
              {fieldError}
            </p>
          ) : null}
        </div>

        {/* Pas d'exemples génériques pendant une question, ni en double sous l'aide (qui a les siens). */}
        {!question && result?.type !== "help" ? (
          <div>
            <p className="text-xs font-semibold text-ink-soft" id={`${ids}-exemples`}>
              {t.examplesTitle}
            </p>
            <ul className="mt-1.5 flex flex-wrap gap-2" aria-labelledby={`${ids}-exemples`}>
              {EXAMPLES.map((ex) => (
                <li key={ex}>
                  <button
                    type="button"
                    className="rounded-full border border-line bg-white px-3 py-1.5 text-start text-xs font-medium text-ink transition-colors hover:border-sand hover:bg-ivory"
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
          <p className="text-xs text-ink-soft">{t.datesNote}</p>
          <div className="flex flex-wrap items-center gap-2">
            {previous || result ? (
              <button type="button" onClick={restart} className="inline-flex min-h-12 items-center rounded-[var(--radius-md)] px-4 text-sm font-semibold text-forest underline underline-offset-4">
                {t.restart}
              </button>
            ) : null}
            <button type="submit" disabled={pending} className="inline-flex min-h-12 items-center justify-center gap-2 rounded-[var(--radius-md)] bg-forest px-6 font-semibold text-white transition-colors hover:bg-forest-deep disabled:opacity-60">
              <Send aria-hidden className="size-4" />
              {pending ? t.pending : question ? t.answer : t.ask}
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
        <div className="space-y-1">
          <p className="rounded-[var(--radius-md)] border border-line bg-ivory p-3 text-sm" data-testid="assistant-hors-sujet">
            {result.message}
          </p>
          {engineBadge}
        </div>
      ) : null}

      {result?.type === "help" ? (
        <section aria-labelledby={`${ids}-aide-titre`} className="rounded-[var(--radius-md)] border border-line bg-ivory p-3 text-sm" data-testid="assistant-aide">
          <p id={`${ids}-aide-titre`}>{result.message}</p>
          <ul className="mt-2 flex flex-wrap gap-2">
            {result.examples.map((ex) => (
              <li key={ex}>
                <button
                  type="button"
                  className="rounded-full border border-line bg-white px-3 py-1.5 text-start text-xs font-medium text-ink transition-colors hover:border-sand"
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
          {onOpenTab ? (
            <div className="mt-3 flex flex-wrap items-center gap-2">
              <span className="text-ink-soft">{t.classic}</span>
              {CLASSIC_TABS.map((tab) => (
                <button key={tab} type="button" onClick={() => onOpenTab(tab)} className="inline-flex min-h-11 items-center rounded-[var(--radius-md)] border border-forest px-3 text-sm font-semibold text-forest hover:bg-forest-soft">
                  {t.tabs[tab]}
                </button>
              ))}
            </div>
          ) : null}
        </section>
      ) : null}

      {result?.type === "actions" ? (
        <section aria-labelledby={`${ids}-resultat`} className="rounded-[var(--radius-lg)] border border-line bg-ivory p-4" data-testid="assistant-resultat">
          <h3 ref={resultRef} id={`${ids}-resultat`} tabIndex={-1} className="font-serif text-lg outline-none">
            {result.actions.length === 1 ? t.understoodTitle : f.t(t.planTitle, { n: result.actions.length })}
          </h3>
          {engineBadge ? <div className="mt-1">{engineBadge}</div> : null}
          <ol className="mt-3 space-y-4">
            {result.actions.map((a, i) => {
              const titleId = `${ids}-etape-${i}`;
              const many = result.actions.length > 1;
              return (
                <li key={`${a.kind}-${i}`} className="rounded-[var(--radius-md)] bg-white p-3 shadow-[var(--shadow-card)]" data-testid="assistant-etape">
                  <p id={titleId} className="font-semibold">
                    {many ? f.t(t.step, { n: i + 1 }) : ""}
                    {a.title}
                  </p>
                  <ul className="mt-1 space-y-0.5 text-sm text-ink-soft">
                    {a.details.map((d) => (
                      <li key={d}>{d}</li>
                    ))}
                  </ul>
                  {a.assumptions.length ? (
                    <div className="mt-2 rounded-[var(--radius-sm,0.375rem)] bg-warning-soft px-3 py-2 text-sm">
                      <p className="font-semibold text-warning">{t.assumed}</p>
                      <ul className="mt-0.5 list-disc ps-5">
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
                    {many ? f.t(t.openStep, { n: i + 1 }) : OPEN_LABEL[a.kind]}
                    <ArrowRight aria-hidden className="size-4" />
                  </Link>
                </li>
              );
            })}
          </ol>
          {autoOpen ? (
            <p className="mt-3 flex flex-wrap items-center gap-3 text-sm text-ink-soft" data-testid="assistant-ouverture">
              {t.autoOpen}
              <button type="button" onClick={() => cancelAutoOpen(true)} className="inline-flex min-h-11 items-center rounded-[var(--radius-md)] border border-forest px-3 font-semibold text-forest hover:bg-forest-soft">
                {t.stay}
              </button>
            </p>
          ) : null}
        </section>
      ) : null}
    </div>
  );
}
