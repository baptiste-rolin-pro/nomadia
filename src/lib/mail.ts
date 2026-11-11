import "server-only";
import { db } from "@/lib/db";
import { emailOutbox } from "@/lib/db/schema";
import { env } from "@/lib/env";
import { prefixedId } from "@/lib/security";

/**
 * Adaptateur d'envoi transactionnel.
 * Transport « capture » (seul transport disponible sans configuration) : l'email est enregistré
 * dans `email_outbox` avec le statut `captured`. Il n'est PAS envoyé. La boîte de test locale
 * (/dev/boite-mail) n'est exposée que si NOMADIA_DEV_MAILBOX=true hors production.
 * Un transport réel (fournisseur d'emailing) se branche ici ; voir docs/architecture.md.
 */
export interface OutgoingEmail {
  to: string;
  subject: string;
  text: string;
  template: string;
  /** Clé de déduplication : un même événement métier ne produit qu'un seul email. */
  dedupeKey?: string;
}

export async function sendEmail(mail: OutgoingEmail): Promise<{ status: "captured" | "duplicate" }> {
  const transport = env().MAIL_TRANSPORT;
  const database = await db();
  const inserted = await database
    .insert(emailOutbox)
    .values({
      id: prefixedId("mail"),
      to: mail.to,
      subject: mail.subject,
      text: mail.text,
      template: mail.template,
      dedupeKey: mail.dedupeKey ?? null,
      status: "captured",
      transport,
    })
    .onConflictDoNothing()
    .returning({ id: emailOutbox.id });
  return { status: inserted.length ? "captured" : "duplicate" };
}

export function devMailboxEnabled(): boolean {
  const e = env();
  return e.NOMADIA_DEV_MAILBOX && e.NOMADIA_SITE_ENV !== "production";
}
