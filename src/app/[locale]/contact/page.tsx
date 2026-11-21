import type { Metadata } from "next";
import { sharedDemoAccounts } from "@/lib/demo-site";
import { StaticPage, legalValues } from "@/components/content/static-page";
import { ContactForm } from "@/components/content/contact-form";
import { inline } from "@/components/content/rich-text";
import { Notice } from "@/components/ui/misc";
import { getMessages } from "@/i18n/messages";
import { ClientMessages, getI18n } from "@/i18n/request";
import { toLocale } from "@/i18n/config";
import { localeAlternates } from "@/i18n/metadata";

export async function generateMetadata({ params }: { params: Promise<{ locale: string }> }): Promise<Metadata> {
  const locale = toLocale((await params).locale);
  const t = getMessages(locale).legal.contact;
  return { title: t.title, description: t.description, alternates: localeAlternates(locale, "/contact") };
}
// Dépend de la configuration d'exécution (NOMADIA_PUBLIC_SIGNUP) : rendu à la requête.
export const dynamic = "force-dynamic";

export default async function ContactPage() {
  const { m, f } = await getI18n();
  const t = m.legal.contact;
  const values = legalValues(m);
  return (
    <StaticPage title={t.title} intro={t.intro}>
      <p>
        {inline(f.t(t.address, values))}
        <br />
        {inline(f.t(t.hours, values))}
        <br />
        {f.t(t.email, values)}
      </p>
      {sharedDemoAccounts() ? (
        <Notice tone="info" className="not-prose" title={t.disabledTitle}>
          {t.disabledText}
        </Notice>
      ) : (
        <ClientMessages ns={["content"]}>
          <ContactForm />
        </ClientMessages>
      )}
    </StaticPage>
  );
}
