/** Pays de résidence proposés pour la location de voiture (formulaire et assistant), code ISO 3166-1 alpha-2. */
export const RESIDENCES: readonly (readonly [code: string, name: string])[] = [
  ["FR", "France"],
  ["BE", "Belgique"],
  ["CH", "Suisse"],
  ["LU", "Luxembourg"],
  ["CA", "Canada"],
  ["DE", "Allemagne"],
  ["ES", "Espagne"],
  ["IT", "Italie"],
  ["GB", "Royaume-Uni"],
];

export function residenceName(code: string): string | undefined {
  return RESIDENCES.find(([c]) => c === code)?.[1];
}
