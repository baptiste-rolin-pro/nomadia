import type { Metadata } from "next";
import { StaticPage } from "@/components/content/static-page";
import { RichText } from "@/components/content/rich-text";
import { ManageCookiesButton } from "@/components/layout/consent";
import { getMessages } from "@/i18n/messages";
import { getI18n } from "@/i18n/request";
import { toLocale } from "@/i18n/config";
import { localeAlternates } from "@/i18n/metadata";

export async function generateMetadata({ params }: { params: Promise<{ locale: string }> }): Promise<Metadata> {
  const locale = toLocale((await params).locale);
  return { title: getMessages(locale).legal.cookies.metaTitle, alternates: localeAlternates(locale, "/cookies") };
}

export default async function CookiesPage() {
  const { m } = await getI18n();
  const t = m.legal.cookies;
  return (
    <StaticPage title={t.title} intro={t.intro}>
      <RichText lines={t.body} />
      <div className="not-prose mt-6">
        <ManageCookiesButton className="min-h-11 rounded-[var(--radius-md)] bg-forest px-5 font-semibold text-white" />
      </div>
    </StaticPage>
  );
}
