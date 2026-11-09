import type { Metadata } from "next";
import { devMailboxEnabled } from "@/lib/mail";
import { ForgotPasswordForm } from "@/components/auth/auth-forms";

export const metadata: Metadata = { title: "Mot de passe oublié", robots: { index: false, follow: true } };
export const dynamic = "force-dynamic";

export default function ForgotPasswordPage() {
  return (
    <>
      <h1 className="font-serif text-title">Mot de passe oublié</h1>
      <p className="mb-8 mt-3 text-ink-soft">Indiquez l&apos;adresse de votre compte. Pour des raisons de sécurité, la réponse est identique que le compte existe ou non.</p>
      <ForgotPasswordForm devMailbox={devMailboxEnabled()} />
    </>
  );
}
