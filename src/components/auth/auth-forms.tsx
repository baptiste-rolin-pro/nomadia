"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState, type FormEvent } from "react";
import { Loader2 } from "lucide-react";
import { authClient } from "@/lib/auth/client";

function safePath(v: string | null | undefined, fallback = "/compte"): string {
  return v && v.startsWith("/") && !v.startsWith("//") && !v.startsWith("/\\") ? v : fallback;
}

function Submit({ pending, children }: { pending: boolean; children: React.ReactNode }) {
  return (
    <button type="submit" disabled={pending} className="inline-flex min-h-12 w-full items-center justify-center gap-2 rounded-[var(--radius-md)] bg-forest px-6 font-semibold text-white hover:bg-forest-deep disabled:opacity-60">
      {pending ? <Loader2 aria-hidden className="size-4 animate-spin" /> : null}
      {children}
    </button>
  );
}

function TextField({ id, label, type = "text", autoComplete, error, hint, value, onChange }: { id: string; label: string; type?: string; autoComplete?: string; error?: string; hint?: string; value: string; onChange: (v: string) => void }) {
  const describedBy = [hint ? `${id}-hint` : null, error ? `${id}-error` : null].filter(Boolean).join(" ") || undefined;
  return (
    <div className="flex flex-col gap-1.5">
      <label htmlFor={id} className="text-sm font-semibold">
        {label}
      </label>
      <input id={id} name={id} type={type} autoComplete={autoComplete} value={value} onChange={(e) => onChange(e.target.value)} className="field-input" aria-invalid={error ? true : undefined} aria-describedby={describedBy} required />
      {hint ? (
        <p id={`${id}-hint`} className="text-xs text-ink-soft">
          {hint}
        </p>
      ) : null}
      {error ? (
        <p id={`${id}-error`} className="text-sm font-medium text-danger">
          {error}
        </p>
      ) : null}
    </div>
  );
}

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

export function SignUpForm({ devMailbox }: { devMailbox: boolean }) {
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [confirm, setConfirm] = useState("");
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [pending, setPending] = useState(false);
  const [done, setDone] = useState(false);
  const [formError, setFormError] = useState("");

  const onSubmit = async (e: FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    const errs: Record<string, string> = {};
    if (name.trim().length < 2) errs.name = "Indiquez votre prénom ou votre nom.";
    if (!EMAIL_RE.test(email)) errs.email = "Adresse email invalide.";
    if (password.length < 10) errs.password = "10 caractères minimum.";
    if (confirm !== password) errs.confirm = "Les deux mots de passe ne correspondent pas.";
    setErrors(errs);
    if (Object.keys(errs).length) {
      const form = e.currentTarget;
      requestAnimationFrame(() => form.querySelector<HTMLElement>("[aria-invalid='true']")?.focus());
      return;
    }
    setPending(true);
    setFormError("");
    const { error } = await authClient.signUp.email({ name: name.trim(), email: email.trim(), password, callbackURL: "/auth/verifie" });
    setPending(false);
    if (error) {
      setFormError(error.status === 429 ? "Trop de tentatives : réessayez dans une minute." : "L'inscription n'a pas pu aboutir. Vérifiez les informations saisies.");
      return;
    }
    setDone(true);
  };

  if (done) {
    return (
      <div role="status" className="space-y-3">
        <p className="font-serif text-2xl">Vérifiez votre adresse email</p>
        <p>Si cette adresse peut être utilisée, un lien de confirmation vient d&apos;être généré. Il est valable 24 heures. Votre compte sera actif après confirmation.</p>
        {devMailbox ? (
          <p className="rounded-[var(--radius-md)] bg-ivory-deep p-3 text-sm">
            Environnement local : les emails ne sont pas envoyés mais capturés dans la{" "}
            <Link href="/dev/boite-mail" className="font-semibold underline">
              boîte de réception de test
            </Link>
            .
          </p>
        ) : null}
      </div>
    );
  }

  return (
    <form onSubmit={onSubmit} noValidate className="space-y-4">
      {formError ? (
        <p role="alert" className="rounded-[var(--radius-md)] bg-danger-soft p-3 text-sm font-medium text-danger">
          {formError}
        </p>
      ) : null}
      <TextField id="name" label="Prénom ou nom" autoComplete="name" value={name} onChange={setName} error={errors.name} />
      <TextField id="email" label="Adresse email" type="email" autoComplete="email" value={email} onChange={setEmail} error={errors.email} />
      <TextField id="password" label="Mot de passe" type="password" autoComplete="new-password" value={password} onChange={setPassword} error={errors.password} hint="10 caractères minimum. Une phrase de passe est plus simple à retenir." />
      <TextField id="confirm" label="Confirmer le mot de passe" type="password" autoComplete="new-password" value={confirm} onChange={setConfirm} error={errors.confirm} />
      <p className="text-xs text-ink-soft">
        En créant un compte, vous acceptez les <Link href="/conditions" className="underline">conditions d&apos;utilisation</Link>. Vos données sont traitées selon la <Link href="/confidentialite" className="underline">politique de confidentialité</Link>. Aucune communication marketing sans votre accord séparé.
      </p>
      <Submit pending={pending}>Créer mon compte</Submit>
    </form>
  );
}

export function SignInForm({ returnTo, devMailbox }: { returnTo: string | null; devMailbox: boolean }) {
  const router = useRouter();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [pending, setPending] = useState(false);
  const [formError, setFormError] = useState("");
  const [unverified, setUnverified] = useState(false);

  const onSubmit = async (e: FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    setPending(true);
    setFormError("");
    setUnverified(false);
    // callbackURL : redirection après connexion, et destination du lien de vérification si l'adresse n'est pas confirmée.
    const { error } = await authClient.signIn.email({ email: email.trim(), password, callbackURL: safePath(returnTo) });
    setPending(false);
    if (error) {
      if (error.status === 403) {
        setUnverified(true);
        return;
      }
      setFormError(error.status === 429 ? "Trop de tentatives : réessayez dans une minute." : "Adresse email ou mot de passe incorrect.");
      return;
    }
    router.push(safePath(returnTo));
    router.refresh();
  };

  return (
    <form onSubmit={onSubmit} className="space-y-4">
      {formError ? (
        <p role="alert" className="rounded-[var(--radius-md)] bg-danger-soft p-3 text-sm font-medium text-danger">
          {formError}
        </p>
      ) : null}
      {unverified ? (
        <p role="alert" className="rounded-[var(--radius-md)] bg-warning-soft p-3 text-sm">
          Votre adresse n&apos;est pas encore confirmée. Un nouveau lien de confirmation vient d&apos;être généré.
          {devMailbox ? (
            <>
              {" "}
              <Link href="/dev/boite-mail" className="font-semibold underline">
                Ouvrir la boîte de test
              </Link>
            </>
          ) : null}
        </p>
      ) : null}
      <TextField id="email" label="Adresse email" type="email" autoComplete="email" value={email} onChange={setEmail} />
      <TextField id="password" label="Mot de passe" type="password" autoComplete="current-password" value={password} onChange={setPassword} />
      <div className="flex justify-end text-sm">
        <Link href="/mot-de-passe-oublie" className="font-semibold text-forest underline underline-offset-4">
          Mot de passe oublié ?
        </Link>
      </div>
      <Submit pending={pending}>Se connecter</Submit>
    </form>
  );
}

export function ForgotPasswordForm({ devMailbox }: { devMailbox: boolean }) {
  const [email, setEmail] = useState("");
  const [pending, setPending] = useState(false);
  const [done, setDone] = useState(false);
  const onSubmit = async (e: FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    setPending(true);
    await authClient.requestPasswordReset({ email: email.trim(), redirectTo: "/reinitialiser-mot-de-passe" });
    setPending(false);
    setDone(true);
  };
  if (done) {
    return (
      <div role="status" className="space-y-3">
        <p>Si un compte existe pour cette adresse, un lien de réinitialisation valable une heure vient d&apos;être généré.</p>
        {devMailbox ? (
          <Link href="/dev/boite-mail" className="font-semibold underline">
            Ouvrir la boîte de réception de test
          </Link>
        ) : null}
      </div>
    );
  }
  return (
    <form onSubmit={onSubmit} className="space-y-4">
      <TextField id="email" label="Adresse email du compte" type="email" autoComplete="email" value={email} onChange={setEmail} />
      <Submit pending={pending}>Recevoir un lien de réinitialisation</Submit>
    </form>
  );
}

export function ResetPasswordForm({ token, error: linkError }: { token: string | null; error: string | null }) {
  const router = useRouter();
  const [password, setPassword] = useState("");
  const [confirm, setConfirm] = useState("");
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [pending, setPending] = useState(false);
  const [formError, setFormError] = useState("");
  if (!token || linkError) {
    return (
      <p role="alert" className="rounded-[var(--radius-md)] bg-danger-soft p-3 text-sm">
        Ce lien de réinitialisation est invalide ou a expiré. <Link href="/mot-de-passe-oublie" className="font-semibold underline">Demander un nouveau lien</Link>
      </p>
    );
  }
  const onSubmit = async (e: FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    const errs: Record<string, string> = {};
    if (password.length < 10) errs.password = "10 caractères minimum.";
    if (confirm !== password) errs.confirm = "Les deux mots de passe ne correspondent pas.";
    setErrors(errs);
    if (Object.keys(errs).length) return;
    setPending(true);
    const { error } = await authClient.resetPassword({ newPassword: password, token });
    setPending(false);
    if (error) {
      setFormError("Le lien a expiré ou a déjà été utilisé. Demandez-en un nouveau.");
      return;
    }
    router.push("/connexion?reinitialise=1");
  };
  return (
    <form onSubmit={onSubmit} noValidate className="space-y-4">
      {formError ? (
        <p role="alert" className="rounded-[var(--radius-md)] bg-danger-soft p-3 text-sm font-medium text-danger">
          {formError}
        </p>
      ) : null}
      <TextField id="password" label="Nouveau mot de passe" type="password" autoComplete="new-password" value={password} onChange={setPassword} error={errors.password} hint="10 caractères minimum. Toutes vos sessions seront déconnectées." />
      <TextField id="confirm" label="Confirmer" type="password" autoComplete="new-password" value={confirm} onChange={setConfirm} error={errors.confirm} />
      <Submit pending={pending}>Enregistrer le nouveau mot de passe</Submit>
    </form>
  );
}

export function SignOutButton({ className = "" }: { className?: string }) {
  const router = useRouter();
  const [pending, setPending] = useState(false);
  return (
    <button
      type="button"
      disabled={pending}
      className={className}
      onClick={async () => {
        setPending(true);
        await authClient.signOut();
        router.push("/");
        router.refresh();
      }}
    >
      {pending ? "Déconnexion…" : "Se déconnecter"}
    </button>
  );
}
