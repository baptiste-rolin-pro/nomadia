import type { Metadata } from "next";
import { Link } from "@/i18n/link";
import { devMailboxEnabled } from "@/lib/mail";
import { sharedDemoAccounts } from "@/lib/demo-site";
import { SignUpForm } from "@/components/auth/auth-forms";
import { DemoClosedNotice } from "@/components/auth/demo-closed";
import { getMessages } from "@/i18n/messages";
import { getI18n } from "@/i18n/request";
import { toLocale } from "@/i18n/config";
import { localeAlternates } from "@/i18n/metadata";

export async function generateMetadata({ params }: { params: Promise<{ locale: string }> }): Promise<Metadata> {
  const locale = toLocale((await params).locale);
  return { title: getMessages(locale).auth.signUp.title, robots: { index: false, follow: true }, alternates: localeAlternates(locale, "/inscription") };
}
export const dynamic = "force-dynamic";

export default async function SignUpPage() {
  const { m } = await getI18n();
  const t = m.auth.signUp;
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
      <SignUpForm devMailbox={devMailboxEnabled()} />
      <p className="mt-6 text-sm">
        {t.already}{" "}
        <Link href="/connexion" className="font-semibold text-forest underline underline-offset-4">
          {t.signIn}
        </Link>
      </p>
    </>
  );
}
