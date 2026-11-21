import type { Metadata } from "next";
import { StaticPage } from "@/components/content/static-page";
import { RichText } from "@/components/content/rich-text";
import { getMessages } from "@/i18n/messages";
import { getI18n } from "@/i18n/request";
import { toLocale } from "@/i18n/config";
import { localeAlternates } from "@/i18n/metadata";

export async function generateMetadata({ params }: { params: Promise<{ locale: string }> }): Promise<Metadata> {
  const locale = toLocale((await params).locale);
  return { title: getMessages(locale).legal.terms.title, alternates: localeAlternates(locale, "/conditions") };
}

export default async function TermsPage() {
  const { m } = await getI18n();
  const t = m.legal.terms;
  return (
    <StaticPage title={t.title} intro={t.intro}>
      <RichText lines={t.body} />
    </StaticPage>
  );
}
