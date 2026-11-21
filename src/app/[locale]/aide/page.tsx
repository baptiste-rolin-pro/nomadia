import type { Metadata } from "next";
import { StaticPage } from "@/components/content/static-page";
import { FaqList } from "@/components/content/faq";
import { RichText, inline } from "@/components/content/rich-text";
import { faq } from "@/lib/content/localized";
import { getMessages } from "@/i18n/messages";
import { getI18n } from "@/i18n/request";
import { toLocale } from "@/i18n/config";
import { localeAlternates } from "@/i18n/metadata";

export async function generateMetadata({ params }: { params: Promise<{ locale: string }> }): Promise<Metadata> {
  const locale = toLocale((await params).locale);
  const t = getMessages(locale).legal.help;
  return { title: t.title, description: t.description, alternates: localeAlternates(locale, "/aide") };
}

export default async function HelpPage() {
  const { locale, m } = await getI18n();
  const t = m.legal.help;
  return (
    <StaticPage title={t.title} crumb={t.crumb}>
      <RichText lines={t.body} />
      <h2>{t.faqTitle}</h2>
      <FaqList items={faq(locale)} />
      <p className="mt-6">{inline(t.more)}</p>
    </StaticPage>
  );
}
