import { Fragment, type ReactNode } from "react";
import { Link } from "@/i18n/link";

/**
 * Texte éditorial traduit (pages légales, aide) : une ligne par bloc, syntaxe minimale et sans HTML :
 *   `## Titre {#ancre}` → titre de section ; `- élément` → liste (lignes consécutives) ; autre ligne → paragraphe.
 * En ligne : `**gras**`, `[texte](/chemin)` (lien interne dans la langue, ou externe s'il commence par http),
 * `[[à compléter]]` → mention « à compléter ». Le texte est rendu par React (échappé).
 */
/** Mention « à compléter » (informations légales non encore fournies). */
export function ToComplete({ children }: { children: ReactNode }) {
  return <mark className="rounded bg-warning-soft px-1 font-semibold text-warning">{children}</mark>;
}

export function RichText({ lines }: { lines: readonly string[] }) {
  const blocks: ReactNode[] = [];
  let list: string[] = [];
  const flush = (key: number) => {
    if (list.length) {
      blocks.push(
        <ul key={`ul-${key}`}>
          {list.map((item, i) => (
            <li key={i}>{inline(item)}</li>
          ))}
        </ul>,
      );
      list = [];
    }
  };
  lines.forEach((line, i) => {
    if (line.startsWith("- ")) {
      list.push(line.slice(2));
      return;
    }
    flush(i);
    if (line.startsWith("## ")) {
      const m = /^## (.*?)(?:\s*\{#([a-z0-9-]+)\})?$/.exec(line);
      blocks.push(
        <h2 key={i} id={m?.[2]}>
          {inline(m?.[1] ?? line.slice(3))}
        </h2>,
      );
    } else {
      blocks.push(<p key={i}>{inline(line)}</p>);
    }
  });
  flush(lines.length);
  return <>{blocks}</>;
}

const TOKEN = /\*\*(.+?)\*\*|\[\[(.+?)\]\]|\[([^\]]+)\]\(([^)\s]+)\)/g;

export function inline(text: string): ReactNode {
  const out: ReactNode[] = [];
  let last = 0;
  let k = 0;
  for (const m of text.matchAll(TOKEN)) {
    if (m.index > last) out.push(text.slice(last, m.index));
    if (m[1] !== undefined) out.push(<strong key={k++}>{m[1]}</strong>);
    else if (m[2] !== undefined) out.push(<ToComplete key={k++}>{m[2]}</ToComplete>);
    else if (m[3] !== undefined && m[4] !== undefined) {
      const href = m[4];
      out.push(
        href.startsWith("http") ? (
          <a key={k++} href={href} rel="noopener" target="_blank">
            {m[3]}
          </a>
        ) : (
          <Link key={k++} href={href}>
            {m[3]}
          </Link>
        ),
      );
    }
    last = m.index + m[0].length;
  }
  if (last < text.length) out.push(text.slice(last));
  return out.length === 1 ? out[0] : <Fragment>{out}</Fragment>;
}
