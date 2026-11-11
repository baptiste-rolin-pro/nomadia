"use client";

import { useEffect, useId, useRef, useState } from "react";
import { MapPin, Plane } from "lucide-react";

export interface PlaceValue {
  id: string;
  label: string;
}

interface Suggestion extends PlaceValue {
  code: string;
  kind: "airport" | "city";
}

/**
 * Autocomplétion de lieux (motif « combobox » ARIA 1.2) :
 * libellés non ambigus, identifiants normalisés, requêtes temporisées et annulées,
 * protection contre les réponses arrivant dans le désordre.
 */
export function PlaceCombobox({
  id,
  label,
  value,
  onChange,
  kinds = ["airport", "city"],
  error,
  placeholder,
}: {
  id: string;
  label: string;
  value: PlaceValue | null;
  onChange: (v: PlaceValue | null) => void;
  kinds?: ("airport" | "city")[];
  error?: string | null;
  placeholder?: string;
}) {
  const listId = useId();
  const [text, setText] = useState(value?.label ?? "");
  const [open, setOpen] = useState(false);
  const [items, setItems] = useState<Suggestion[]>([]);
  const [active, setActive] = useState(-1);
  const [loading, setLoading] = useState(false);
  const seq = useRef(0);
  const abortRef = useRef<AbortController | null>(null);
  const [prevValueId, setPrevValueId] = useState(value?.id);

  if (value?.id !== prevValueId) {
    setPrevValueId(value?.id);
    setText(value?.label ?? "");
  }

  useEffect(() => {
    if (!open) return;
    const q = text.trim();
    if (q.length < 2 || q === value?.label) return;
    const handle = setTimeout(async () => {
      abortRef.current?.abort();
      const ctrl = new AbortController();
      abortRef.current = ctrl;
      const mine = ++seq.current;
      setLoading(true);
      try {
        const res = await fetch(`/api/places?q=${encodeURIComponent(q)}&types=${kinds.join(",")}`, { signal: ctrl.signal });
        const json = (await res.json()) as { results: Suggestion[] };
        if (mine === seq.current) {
          setItems(json.results);
          setActive(json.results.length ? 0 : -1);
        }
      } catch {
        /* requête annulée ou réseau indisponible : la liste reste inchangée */
      } finally {
        if (mine === seq.current) setLoading(false);
      }
    }, 180);
    return () => clearTimeout(handle);
  }, [text, open, kinds, value?.label]);

  const select = (s: Suggestion) => {
    onChange({ id: s.id, label: s.label });
    setText(s.label);
    setOpen(false);
    setItems([]);
  };

  const searching = text.trim().length >= 2 && text.trim() !== value?.label;
  const visible = searching ? items : [];
  const expanded = open && searching && (visible.length > 0 || !loading);
  const errorId = error ? `${id}-error` : undefined;

  return (
    <div className="relative flex flex-col gap-1.5">
      <label htmlFor={id} className="text-sm font-semibold">
        {label}
      </label>
      <input
        id={id}
        type="text"
        role="combobox"
        autoComplete="off"
        spellCheck={false}
        aria-autocomplete="list"
        aria-expanded={expanded}
        aria-controls={listId}
        aria-activedescendant={expanded && active >= 0 ? `${listId}-${active}` : undefined}
        aria-invalid={error ? true : undefined}
        aria-describedby={errorId}
        className="field-input"
        placeholder={placeholder ?? "Ville ou aéroport"}
        value={text}
        onChange={(e) => {
          setText(e.target.value);
          setOpen(true);
          if (value) onChange(null);
        }}
        onFocus={() => setOpen(true)}
        onBlur={() => setTimeout(() => setOpen(false), 120)}
        onKeyDown={(e) => {
          if (e.key === "ArrowDown") {
            e.preventDefault();
            setOpen(true);
            setActive((a) => Math.min(visible.length - 1, a + 1));
          } else if (e.key === "ArrowUp") {
            e.preventDefault();
            setActive((a) => Math.max(0, a - 1));
          } else if (e.key === "Enter" && expanded && active >= 0 && visible[active]) {
            e.preventDefault();
            select(visible[active]);
          } else if (e.key === "Escape") {
            setOpen(false);
          }
        }}
      />
      {error ? (
        <p id={errorId} className="text-sm font-medium text-danger">
          {error}
        </p>
      ) : null}
      <ul
        id={listId}
        role="listbox"
        aria-label={`Suggestions — ${label}`}
        hidden={!expanded}
        className="absolute left-0 right-0 top-full z-[var(--z-overlay)] mt-1 max-h-80 overflow-auto rounded-[var(--radius-md)] border border-line bg-white py-1 shadow-[var(--shadow-panel)]"
      >
        {visible.map((s, i) => (
          <li
            key={s.id}
            id={`${listId}-${i}`}
            role="option"
            aria-selected={i === active}
            className={`flex cursor-pointer items-start gap-2 px-3 py-2.5 text-sm ${i === active ? "bg-forest-soft" : ""}`}
            onMouseDown={(e) => e.preventDefault()}
            onClick={() => select(s)}
            onMouseEnter={() => setActive(i)}
          >
            {s.kind === "airport" ? <Plane aria-hidden className="mt-0.5 size-4 shrink-0 text-ink-soft" /> : <MapPin aria-hidden className="mt-0.5 size-4 shrink-0 text-ink-soft" />}
            <span>{s.label}</span>
          </li>
        ))}
        {visible.length === 0 && !loading ? <li className="px-3 py-2.5 text-sm text-ink-soft">Aucun lieu correspondant dans notre référentiel.</li> : null}
      </ul>
      <span className="sr-only" aria-live="polite">
        {expanded ? `${visible.length} suggestion${visible.length > 1 ? "s" : ""}` : ""}
      </span>
    </div>
  );
}
