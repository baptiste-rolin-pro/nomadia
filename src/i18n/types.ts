/**
 * Types des messages : le français (src/i18n/messages/fr) est la référence ; chaque autre langue doit avoir
 * exactement les mêmes clés (vérifié par TypeScript avec `satisfies`, et par tests/unit/i18n.test.ts : mêmes
 * clés, mêmes longueurs de listes, aucune valeur vide).
 */
import type fr from "@/i18n/messages/fr";

type Deep<T> = T extends string ? string : T extends readonly (infer U)[] ? readonly Deep<U>[] : { [K in keyof T]: Deep<T[K]> };

export type Messages = Deep<typeof fr>;
export type Namespace = keyof Messages;

/**
 * Espaces de noms utilisés par des composants client. Seuls ceux de la page affichée, dans la langue active,
 * sont transmis au navigateur (fournisseur `I18nProvider` / `MessagesScope`).
 */
export const CLIENT_NAMESPACES = ["common", "search", "home", "results", "booking", "planner", "account", "auth", "assistantUi", "content"] as const;
export type ClientNamespace = (typeof CLIENT_NAMESPACES)[number];
export type ClientMessages = Pick<Messages, ClientNamespace>;
