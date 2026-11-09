import type { Metadata } from "next";
import { ResetPasswordForm } from "@/components/auth/auth-forms";

export const metadata: Metadata = { title: "Nouveau mot de passe", robots: { index: false, follow: false } };
export const dynamic = "force-dynamic";

export default async function ResetPasswordPage({ searchParams }: { searchParams: Promise<{ token?: string; error?: string }> }) {
  const { token, error } = await searchParams;
  return (
    <>
      <h1 className="font-serif text-title">Nouveau mot de passe</h1>
      <p className="mb-8 mt-3 text-ink-soft">Choisissez un nouveau mot de passe pour votre compte.</p>
      <ResetPasswordForm token={token ?? null} error={error ?? null} />
    </>
  );
}
