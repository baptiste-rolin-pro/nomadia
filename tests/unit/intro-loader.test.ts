import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { INTRO_END_EVENT, INTRO_OPTIONS, INTRO_STORAGE_KEY, INTRO_STORAGE_VALUE, introLoaderInlineScript, runIntroLoader } from "@/lib/intro-loader";

/**
 * Script de l'écran d'accueil « avion », exécuté avec un document simulé et une horloge contrôlée
 * (le parcours réel dans un navigateur : tests/e2e/intro-loader.spec.ts).
 */
type StorageMode = "ok" | "blocked" | "read-only";

function setup({ stored = false, reduced = false, hidden = false, readyState = "loading", storage = "ok" as StorageMode } = {}) {
  const classes = new Set<string>();
  const events = new EventTarget();
  const store = new Map<string, string>();
  if (stored) store.set(INTRO_STORAGE_KEY, INTRO_STORAGE_VALUE);
  const start = Date.now();
  const ended: number[] = [];
  events.addEventListener(INTRO_END_EVENT, () => ended.push(Date.now() - start));
  vi.stubGlobal("performance", { now: () => Date.now() - start });
  vi.stubGlobal("window", {
    get sessionStorage() {
      if (storage === "blocked") throw new DOMException("Stockage bloqué", "SecurityError");
      return {
        getItem: (k: string) => store.get(k) ?? null,
        setItem: (k: string, v: string) => {
          if (storage === "read-only") throw new DOMException("Quota", "QuotaExceededError");
          store.set(k, v);
        },
      };
    },
    matchMedia: (query: string) => ({ matches: reduced && query.includes("reduce") }),
    setTimeout: (fn: () => void, ms: number) => setTimeout(fn, ms),
    addEventListener: events.addEventListener.bind(events),
    removeEventListener: events.removeEventListener.bind(events),
    dispatchEvent: events.dispatchEvent.bind(events),
  });
  vi.stubGlobal("document", {
    readyState,
    visibilityState: hidden ? "hidden" : "visible",
    documentElement: {
      classList: {
        add: (...c: string[]) => c.forEach((x) => classes.add(x)),
        remove: (...c: string[]) => c.forEach((x) => classes.delete(x)),
        contains: (x: string) => classes.has(x),
      },
    },
  });
  return { classes, store, ended, fire: (type: string) => events.dispatchEvent(new Event(type)) };
}

beforeEach(() => {
  vi.useFakeTimers();
});
afterEach(() => {
  vi.useRealTimers();
  vi.unstubAllGlobals();
});

describe("écran d'accueil « avion »", () => {
  it("première page de la session : affiché, mémorisé tout de suite, fermé après la durée minimale si la page est chargée", () => {
    const env = setup();
    runIntroLoader(INTRO_OPTIONS);
    expect([...env.classes]).toEqual(["intro"]);
    expect(env.store.get(INTRO_STORAGE_KEY)).toBe(INTRO_STORAGE_VALUE);
    vi.advanceTimersByTime(200);
    env.fire("load");
    vi.advanceTimersByTime(1_200); // 1,4 s : toujours affiché (minimum 1,5 s)
    expect(env.classes.has("intro-out")).toBe(false);
    vi.advanceTimersByTime(100); // 1,5 s : fondu de sortie
    expect([...env.classes].sort()).toEqual(["intro", "intro-out"]);
    expect(env.ended).toEqual([]);
    vi.advanceTimersByTime(INTRO_OPTIONS.fade);
    expect(env.classes.size).toBe(0);
    expect(env.ended).toEqual([1_500 + INTRO_OPTIONS.fade]);
    vi.advanceTimersByTime(5_000); // le plafond ne relance rien
    expect(env.ended).toHaveLength(1);
  });

  it("page lente : fermé au plafond (2,5 s) sans attendre le chargement", () => {
    const env = setup();
    runIntroLoader(INTRO_OPTIONS);
    vi.advanceTimersByTime(2_500);
    expect(env.classes.has("intro-out")).toBe(true);
    vi.advanceTimersByTime(INTRO_OPTIONS.fade);
    expect(env.ended).toEqual([2_500 + INTRO_OPTIONS.fade]);
    env.fire("load");
    vi.advanceTimersByTime(5_000);
    expect(env.ended).toHaveLength(1);
  });

  it("page déjà chargée au moment du script : durée minimale seulement", () => {
    const env = setup({ readyState: "complete" });
    runIntroLoader(INTRO_OPTIONS);
    vi.advanceTimersByTime(1_500 + INTRO_OPTIONS.fade);
    expect(env.ended).toEqual([1_500 + INTRO_OPTIONS.fade]);
  });

  it.each(["keydown", "pointerdown", "wheel", "touchstart"])("%s : fermé tout de suite (sans durée minimale), une seule fois", (type) => {
    const env = setup();
    runIntroLoader(INTRO_OPTIONS);
    vi.advanceTimersByTime(300);
    env.fire(type);
    expect(env.classes.has("intro-out")).toBe(true);
    env.fire(type);
    vi.advanceTimersByTime(INTRO_OPTIONS.fade);
    expect(env.ended).toEqual([300 + INTRO_OPTIONS.fade]);
    env.fire("load");
    vi.advanceTimersByTime(5_000);
    expect(env.ended).toHaveLength(1);
  });

  it.each([
    ["déjà vu dans cette session", { stored: true }],
    ["mouvement réduit", { reduced: true }],
    ["onglet en arrière-plan", { hidden: true }],
    ["stockage bloqué", { storage: "blocked" as StorageMode }],
    ["stockage en lecture seule (impossible de mémoriser)", { storage: "read-only" as StorageMode }],
  ])("%s : jamais affiché", (_label, options) => {
    const env = setup(options);
    expect(() => runIntroLoader(INTRO_OPTIONS)).not.toThrow();
    expect(env.classes.size).toBe(0);
    vi.advanceTimersByTime(5_000);
    expect(env.ended).toEqual([]);
    if ("reduced" in options || "hidden" in options) expect(env.store.has(INTRO_STORAGE_KEY)).toBe(false);
  });

  it("script en ligne autonome : la version sérialisée se comporte comme la fonction", () => {
    const env = setup();
    new Function(introLoaderInlineScript())();
    expect(env.classes.has("intro")).toBe(true);
    expect(env.store.get(INTRO_STORAGE_KEY)).toBe(INTRO_STORAGE_VALUE);
    vi.advanceTimersByTime(INTRO_OPTIONS.max + INTRO_OPTIONS.fade);
    expect(env.ended).toEqual([INTRO_OPTIONS.max + INTRO_OPTIONS.fade]);
  });
});
