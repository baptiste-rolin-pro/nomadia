import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { desc } from "drizzle-orm";
import { db } from "@/lib/db";
import { emailOutbox } from "@/lib/db/schema";
import { devMailboxEnabled } from "@/lib/mail";
import { Notice } from "@/components/ui/misc";

export const metadata: Metadata = { title: "Boîte de réception de test", robots: { index: false, follow: false } };
export const dynamic = "force-dynamic";

function linkify(text: string) {
  return text.split(/(https?:\/\/\S+)/g).map((part, i) =>
    /^https?:\/\//.test(part) ? (
      <a key={i} href={part} className="break-all font-semibold text-forest underline">
        {part}
      </a>
    ) : (
      <span key={i}>{part}</span>
    ),
  );
}

/**
 * Emails CAPTURÉS localement (transport « capture ») : ils n'ont pas été envoyés.
 * Page désactivée sauf NOMADIA_DEV_MAILBOX=true hors production, car elle expose des liens sensibles.
 */
export default async function DevMailboxPage() {
  if (!devMailboxEnabled()) notFound();
  const mails = await (await db()).select().from(emailOutbox).orderBy(desc(emailOutbox.createdAt)).limit(50);
  return (
    <div className="container-page max-w-4xl pt-8">
      <h1 className="font-serif text-title">Boîte de réception de test</h1>
      <Notice tone="warning" className="mt-4" title="Emails capturés, non envoyés">
        Environnement local : aucun email n&apos;a quitté le serveur. Cette page ne doit jamais être activée sur un site public.
      </Notice>
      <ul className="mt-8 space-y-4">
        {mails.map((m) => (
          <li key={m.id} className="rounded-[var(--radius-lg)] border border-line bg-white p-5" data-testid="captured-email">
            <p className="text-xs text-ink-soft">
              {m.createdAt.toLocaleString("fr-FR")} · modèle {m.template} · statut {m.status}
            </p>
            <p className="mt-1 text-sm">
              À : <strong data-testid="email-to">{m.to}</strong>
            </p>
            <p className="mt-1 font-semibold">{m.subject}</p>
            <pre className="mt-3 whitespace-pre-wrap font-sans text-sm">{linkify(m.text)}</pre>
          </li>
        ))}
        {mails.length === 0 ? <li className="text-ink-soft">Aucun email capturé.</li> : null}
      </ul>
    </div>
  );
}
