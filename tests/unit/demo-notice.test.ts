/**
 * Mémorisation de la fenêtre « À propos de la démo » : localStorage quand il est disponible,
 * sans jamais lever d'exception quand il est bloqué (la page reste utilisable).
 */
import { describe, expect, it } from "vitest";
import { DEMO_NOTICE_STORAGE_KEY, readDemoNoticeDismissed, writeDemoNoticeDismissed, type StorageLike } from "@/lib/demo-notice";

function memoryStorage(): StorageLike & { data: Map<string, string> } {
  const data = new Map<string, string>();
  return { data, getItem: (k) => data.get(k) ?? null, setItem: (k, v) => void data.set(k, v) };
}

describe("fenêtre de démonstration : mémorisation par navigateur", () => {
  it("première visite : non fermée ; après fermeture : mémorisée", () => {
    const storage = memoryStorage();
    expect(readDemoNoticeDismissed(() => storage)).toBe(false);
    expect(writeDemoNoticeDismissed(() => storage)).toBe(true);
    expect(storage.data.has(DEMO_NOTICE_STORAGE_KEY)).toBe(true);
    expect(readDemoNoticeDismissed(() => storage)).toBe(true);
  });

  it("une valeur inconnue (ancienne version) affiche à nouveau la fenêtre", () => {
    const storage = memoryStorage();
    storage.setItem(DEMO_NOTICE_STORAGE_KEY, "autre");
    expect(readDemoNoticeDismissed(() => storage)).toBe(false);
  });

  it("stockage indisponible ou bloqué : aucune exception, lecture « inconnue », écriture refusée", () => {
    const throwing: StorageLike = {
      getItem: () => {
        throw new DOMException("bloqué", "SecurityError");
      },
      setItem: () => {
        throw new DOMException("plein", "QuotaExceededError");
      },
    };
    expect(readDemoNoticeDismissed(() => throwing)).toBeNull();
    expect(writeDemoNoticeDismissed(() => throwing)).toBe(false);
    const accessorThrows = () => {
      throw new DOMException("accès refusé", "SecurityError");
    };
    expect(readDemoNoticeDismissed(accessorThrows)).toBeNull();
    expect(writeDemoNoticeDismissed(accessorThrows)).toBe(false);
    expect(readDemoNoticeDismissed(() => null)).toBeNull();
  });
});
