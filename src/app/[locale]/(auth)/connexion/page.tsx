import type { Metadata } from "next";
import { Link } from "@/i18n/link";
import { devMailboxEnabled } from "@/lib/mail";
import { safeReturnPath } from "@/lib/auth/session";
import { demoCredentials, sharedDemoAccounts } from "@/lib/demo-site";
import { SignInForm } from "@/components/auth/auth-forms";
import { Notice } from "@/components/ui/misc";
import { getMessages } from "@/i18n/messages";
import { getI18n } from "@/i18n/request";
import { localizePath, toLocale } from "@/i18n/config";
import { localeAlternates } from "@/i18n/metadata";

export async function generateMetadata({ params }: { params: Promise<{ locale: string }> }): Promise<Metadata> {
  const locale = toLocale((await params).locale);
  return { title: getMessages(locale).auth.signIn.title, robots: { index: false, follow: true }, alternates: localeAlternates(locale, "/connexion") };
}
export const dynamic = "force-dynamic";

export default async function SignInPage({ searchParams }: { searchParams: Promise<{ retour?: string; reinitialise?: string }> }) {
  const { locale, m } = await getI18n();
  const t = m.auth.signIn;
  const { retour, reinitialise } = await searchParams;
  const shared = sharedDemoAccounts();
  return (
    <>
      <h1 className="font-serif text-title">{t.title}</h1>
      <p className="mb-8 mt-3 text-ink-soft">{t.intro}</p>
      {reinitialise && !shared ? (
        <Notice tone="success" className="mb-6" title={t.resetDoneTitle}>
          {t.resetDone}
        </Notice>
      ) : null}
      {shared ? (
        <Notice tone="warning" className="mb-6" title={t.sharedTitle}>
          <p>{t.sharedText}</p>
          <p className="mt-1">{m.common.demo.sharedNotice}</p>
        </Notice>
      ) : null}
      <SignInForm returnTo={safeReturnPath(retour, localizePath(locale, "/compte"))} devMailbox={devMailboxEnabled()} demoAccounts={shared ? demoCredentials() : null} />
      {shared ? null : (
        <p className="mt-6 text-sm">
          {t.noAccount}{" "}
          <Link href="/inscription" className="font-semibold text-forest underline underline-offset-4">
            {t.createAccount}
          </Link>
        </p>
      )}
    </>
  );
}
