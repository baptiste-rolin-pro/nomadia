import type { Metadata } from "next";
import { Link } from "@/i18n/link";
import { getCurrentUser } from "@/lib/auth/session";
import { Notice } from "@/components/ui/misc";
import { getMessages } from "@/i18n/messages";
import { getI18n } from "@/i18n/request";
import { toLocale } from "@/i18n/config";

export async function generateMetadata({ params }: { params: Promise<{ locale: string }> }): Promise<Metadata> {
  const locale = toLocale((await params).locale);
  return { title: getMessages(locale).auth.verified.metaTitle, robots: { index: false, follow: false } };
}
export const dynamic = "force-dynamic";

/** Retour d'authentification après le lien de vérification d'adresse. */
export default async function VerifiedPage({ searchParams }: { searchParams: Promise<{ error?: string }> }) {
  const { m, f } = await getI18n();
  const t = m.auth.verified;
  const { error } = await searchParams;
  const user = await getCurrentUser();
  return (
    <>
      <h1 className="font-serif text-title">{error ? t.invalidTitle : t.doneTitle}</h1>
      {error ? (
        <Notice tone="danger" className="mt-6" title={t.invalidNotice}>
          {t.invalidText}
        </Notice>
      ) : (
        <Notice tone="success" className="mt-6" title={t.doneNotice}>
          {user ? f.t(t.signedInAs, { name: user.name }) : t.canSignIn}
        </Notice>
      )}
      <div className="mt-6">
        <Link href={user ? "/compte" : "/connexion"} className="inline-flex min-h-12 items-center rounded-[var(--radius-md)] bg-forest px-6 font-semibold text-white">
          {user ? t.toAccount : t.signIn}
        </Link>
      </div>
    </>
  );
}
