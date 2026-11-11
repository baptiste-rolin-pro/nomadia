import type { Metadata } from "next";
import { devMailboxEnabled } from "@/lib/mail";
import { sharedDemoAccounts } from "@/lib/demo-site";
import { ForgotPasswordForm } from "@/components/auth/auth-forms";
import { DemoClosedNotice } from "@/components/auth/demo-closed";

export const metadata: Metadata = { title: "Mot de passe oublié", robots: { index: false, follow: true } };
export const dynamic = "force-dynamic";

export default function ForgotPasswordPage() {
  if (sharedDemoAccounts()) {
    return (
      <>
        <h1 className="mb-8 font-serif text-title">Mot de passe oublié</h1>
        <DemoClosedNotice title="Réinitialisation par email désactivée sur ce site de démonstration">
          <p>Aucun email n&apos;est demandé ni envoyé par cette démonstration. Les identifiants des comptes de démonstration sont affichés sur la page de connexion.</p>
        </DemoClosedNotice>
      </>
    );
  }
  return (
    <>
      <h1 className="font-serif text-title">Mot de passe oublié</h1>
      <p className="mb-8 mt-3 text-ink-soft">Indiquez l&apos;adresse de votre compte. Pour des raisons de sécurité, la réponse est identique que le compte existe ou non.</p>
      <ForgotPasswordForm devMailbox={devMailboxEnabled()} />
    </>
  );
}
