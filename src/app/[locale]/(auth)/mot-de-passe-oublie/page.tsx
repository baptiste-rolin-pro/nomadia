import type { Metadata } from "next";
import { devMailboxEnabled } from "@/lib/mail";
import { sharedDemoAccounts } from "@/lib/demo-site";
import { ForgotPasswordForm } from "@/components/auth/auth-forms";
import { DemoClosedNotice } from "@/components/auth/demo-closed";
import { getMessages } from "@/i18n/messages";
import { getI18n } from "@/i18n/request";
import { toLocale } from "@/i18n/config";

export async function generateMetadata({ params }: { params: Promise<{ locale: string }> }): Promise<Metadata> {
  const locale = toLocale((await params).locale);
  return { title: getMessages(locale).auth.forgot.title, robots: { index: false, follow: true } };
}
export const dynamic = "force-dynamic";

export default async function ForgotPasswordPage() {
  const { m } = await getI18n();
  const t = m.auth.forgot;
  if (sharedDemoAccounts()) {
    return (
      <>
        <h1 className="mb-8 font-serif text-title">{t.title}</h1>
        <DemoClosedNotice title={t.closedTitle}>
          <p>{t.closedText}</p>
        </DemoClosedNotice>
      </>
    );
  }
  return (
    <>
      <h1 className="font-serif text-title">{t.title}</h1>
      <p className="mb-8 mt-3 text-ink-soft">{t.intro}</p>
      <ForgotPasswordForm devMailbox={devMailboxEnabled()} />
    </>
  );
}
