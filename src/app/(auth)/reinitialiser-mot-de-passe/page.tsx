import type { Metadata } from "next";
import { sharedDemoAccounts } from "@/lib/demo-site";
import { ResetPasswordForm } from "@/components/auth/auth-forms";
import { DemoClosedNotice } from "@/components/auth/demo-closed";

export const metadata: Metadata = { title: "Nouveau mot de passe", robots: { index: false, follow: false } };
export const dynamic = "force-dynamic";

export default async function ResetPasswordPage({ searchParams }: { searchParams: Promise<{ token?: string; error?: string }> }) {
  if (sharedDemoAccounts()) {
    return (
      <>
        <h1 className="mb-8 font-serif text-title">Nouveau mot de passe</h1>
        <DemoClosedNotice title="Réinitialisation désactivée sur ce site de démonstration">
          <p>Les mots de passe des comptes de démonstration partagés ne peuvent pas être modifiés.</p>
        </DemoClosedNotice>
      </>
    );
  }
  const { token, error } = await searchParams;
  return (
    <>
      <h1 className="font-serif text-title">Nouveau mot de passe</h1>
      <p className="mb-8 mt-3 text-ink-soft">Choisissez un nouveau mot de passe pour votre compte.</p>
      <ResetPasswordForm token={token ?? null} error={error ?? null} />
    </>
  );
}
