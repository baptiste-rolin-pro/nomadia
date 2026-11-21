import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { desc } from "drizzle-orm";
import { db } from "@/lib/db";
import { emailOutbox } from "@/lib/db/schema";
import { devMailboxEnabled } from "@/lib/mail";
import { Notice } from "@/components/ui/misc";
import { getMessages } from "@/i18n/messages";
import { getI18n } from "@/i18n/request";
import { LOCALE_INFO, toLocale } from "@/i18n/config";

export async function generateMetadata({ params }: { params: Promise<{ locale: string }> }): Promise<Metadata> {
  const locale = toLocale((await params).locale);
  return { title: getMessages(locale).admin.mailbox.metaTitle, robots: { index: false, follow: false } };
}
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
 * Le contenu des emails reste dans la langue de leur destinataire.
 */
export default async function DevMailboxPage() {
  if (!devMailboxEnabled()) notFound();
  const { locale, m, f } = await getI18n();
  const t = m.admin.mailbox;
  const mails = await (await db()).select().from(emailOutbox).orderBy(desc(emailOutbox.createdAt)).limit(50);
  return (
    <div className="container-page max-w-4xl pt-8">
      <h1 className="font-serif text-title">{t.title}</h1>
      <Notice tone="warning" className="mt-4" title={t.noticeTitle}>
        {t.notice}
      </Notice>
      <ul className="mt-8 space-y-4">
        {mails.map((mail) => (
          <li key={mail.id} className="rounded-[var(--radius-lg)] border border-line bg-white p-5" data-testid="captured-email">
            <p className="text-xs text-ink-soft">{f.t(t.meta, { date: mail.createdAt.toLocaleString(LOCALE_INFO[locale].intl), template: mail.template, status: mail.status })}</p>
            <p className="mt-1 text-sm">
              {t.to} <strong data-testid="email-to">{mail.to}</strong>
            </p>
            <p className="mt-1 font-semibold">{mail.subject}</p>
            <pre className="mt-3 whitespace-pre-wrap font-sans text-sm">{linkify(mail.text)}</pre>
          </li>
        ))}
        {mails.length === 0 ? <li className="text-ink-soft">{t.empty}</li> : null}
      </ul>
    </div>
  );
}
