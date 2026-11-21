"use client";

import { Link } from "@/i18n/link";
import { useRouter } from "next/navigation";
import { useState, type FormEvent } from "react";
import { Loader2 } from "lucide-react";
import { authClient } from "@/lib/auth/client";
import { localizePath } from "@/i18n/config";
import { useI18n } from "@/i18n/client";
import { inline } from "@/components/content/rich-text";

function safePath(v: string | null | undefined, fallback: string): string {
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
      <input id={id} name={id} type={type} autoComplete={autoComplete} value={value} onChange={(e) => onChange(e.target.value)} className="field-input" aria-invalid={error ? true : undefined} aria-describedby={describedBy} required dir={type === "email" || type === "password" ? "ltr" : undefined} />
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
  const { locale, m } = useI18n();
  const t = m.auth.signUp;
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
    if (name.trim().length < 2) errs.name = t.nameRequired;
    if (!EMAIL_RE.test(email)) errs.email = t.emailInvalid;
    if (password.length < 10) errs.password = t.passwordMin;
    if (confirm !== password) errs.confirm = t.mismatch;
    setErrors(errs);
    if (Object.keys(errs).length) {
      const form = e.currentTarget;
      requestAnimationFrame(() => form.querySelector<HTMLElement>("[aria-invalid='true']")?.focus());
      return;
    }
    setPending(true);
    setFormError("");
    // La langue de la page est retrouvée côté serveur (Referer) et enregistrée avec le compte : emails dans cette langue.
    const { error } = await authClient.signUp.email({ name: name.trim(), email: email.trim(), password, callbackURL: localizePath(locale, "/auth/verifie") });
    setPending(false);
    if (error) {
      setFormError(error.status === 429 ? m.auth.signIn.tooMany : t.failed);
      return;
    }
    setDone(true);
  };

  if (done) {
    return (
      <div role="status" className="space-y-3">
        <p className="font-serif text-2xl">{t.checkTitle}</p>
        <p>{t.checkText}</p>
        {devMailbox ? <p className="rounded-[var(--radius-md)] bg-ivory-deep p-3 text-sm [&_a]:font-semibold [&_a]:underline">{inline(t.devMailbox)}</p> : null}
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
      <TextField id="name" label={t.name} autoComplete="name" value={name} onChange={setName} error={errors.name} />
      <TextField id="email" label={t.email} type="email" autoComplete="email" value={email} onChange={setEmail} error={errors.email} />
      <TextField id="password" label={t.password} type="password" autoComplete="new-password" value={password} onChange={setPassword} error={errors.password} hint={t.passwordHint} />
      <TextField id="confirm" label={t.confirm} type="password" autoComplete="new-password" value={confirm} onChange={setConfirm} error={errors.confirm} />
      <p className="text-xs text-ink-soft [&_a]:underline">{inline(t.terms)}</p>
      <Submit pending={pending}>{t.submit}</Submit>
    </form>
  );
}

export interface DemoAccountCredential {
  kind: "user" | "admin";
  email: string;
  password: string;
}

/** Comptes de démonstration partagés (identifiants de test publics) : affichés et utilisables en un clic. */
function DemoAccounts({ accounts, onUse }: { accounts: DemoAccountCredential[]; onUse: (a: DemoAccountCredential) => void }) {
  const { m, f } = useI18n();
  const t = m.auth.signIn;
  return (
    <section aria-labelledby="demo-accounts-title" className="mb-6 rounded-[var(--radius-lg)] border border-line bg-white p-4">
      <h2 id="demo-accounts-title" className="font-semibold">
        {t.demoAccounts}
      </h2>
      <ul className="mt-3 space-y-3 text-sm">
        {accounts.map((a) => {
          const title = a.kind === "admin" ? t.adminTitle : t.travelerTitle;
          const description = a.kind === "admin" ? t.adminDescription : t.travelerDescription;
          return (
            <li key={a.email} className="flex flex-wrap items-center justify-between gap-3" data-testid="demo-account">
              <div className="min-w-0">
                <p className="font-semibold">
                  {title} <span className="font-normal text-ink-soft">— {description}</span>
                </p>
                <p className="break-all">
                  {t.login}{" "}
                  <code className="rounded bg-ivory-deep px-1" dir="ltr">
                    {a.email}
                  </code>
                </p>
                <p className="break-all">
                  {t.testPassword}{" "}
                  <code className="rounded bg-ivory-deep px-1" dir="ltr">
                    {a.password}
                  </code>
                </p>
              </div>
              <button type="button" onClick={() => onUse(a)} data-account={a.kind} className="min-h-10 rounded-[var(--radius-md)] border border-forest px-3 font-semibold text-forest hover:bg-forest-soft">
                {f.t(t.useAccount, { label: a.kind === "admin" ? t.adminLabel : t.travelerLabel })}
              </button>
            </li>
          );
        })}
      </ul>
    </section>
  );
}

export function SignInForm({ returnTo, devMailbox, demoAccounts = null }: { returnTo: string | null; devMailbox: boolean; demoAccounts?: DemoAccountCredential[] | null }) {
  const router = useRouter();
  const { locale, m } = useI18n();
  const t = m.auth.signIn;
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [pending, setPending] = useState(false);
  const [formError, setFormError] = useState("");
  const [unverified, setUnverified] = useState(false);
  const target = safePath(returnTo, localizePath(locale, "/compte"));

  const onSubmit = async (e: FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    setPending(true);
    setFormError("");
    setUnverified(false);
    // callbackURL : redirection après connexion, et destination du lien de vérification si l'adresse n'est pas confirmée.
    const { error } = await authClient.signIn.email({ email: email.trim(), password, callbackURL: target });
    setPending(false);
    if (error) {
      if (error.status === 403) {
        setUnverified(true);
        return;
      }
      setFormError(error.status === 429 ? t.tooMany : t.wrong);
      return;
    }
    router.push(target);
    router.refresh();
  };

  return (
    <>
      {demoAccounts?.length ? (
        <DemoAccounts
          accounts={demoAccounts}
          onUse={(a) => {
            setEmail(a.email);
            setPassword(a.password);
            setFormError("");
          }}
        />
      ) : null}
      <form onSubmit={onSubmit} className="space-y-4">
        {formError ? (
          <p role="alert" className="rounded-[var(--radius-md)] bg-danger-soft p-3 text-sm font-medium text-danger">
            {formError}
          </p>
        ) : null}
        {unverified ? (
          <p role="alert" className="rounded-[var(--radius-md)] bg-warning-soft p-3 text-sm">
            {t.unverified}
            {devMailbox ? (
              <>
                {" "}
                <Link href="/dev/boite-mail" className="font-semibold underline">
                  {t.openTestMailbox}
                </Link>
              </>
            ) : null}
          </p>
        ) : null}
        <TextField id="email" label={t.email} type="email" autoComplete="email" value={email} onChange={setEmail} />
        <TextField id="password" label={t.password} type="password" autoComplete="current-password" value={password} onChange={setPassword} />
        {demoAccounts ? null : (
          <div className="flex justify-end text-sm">
            <Link href="/mot-de-passe-oublie" className="font-semibold text-forest underline underline-offset-4">
              {t.forgot}
            </Link>
          </div>
        )}
        <Submit pending={pending}>{t.submit}</Submit>
      </form>
    </>
  );
}

export function ForgotPasswordForm({ devMailbox }: { devMailbox: boolean }) {
  const { locale, m } = useI18n();
  const t = m.auth.forgot;
  const [email, setEmail] = useState("");
  const [pending, setPending] = useState(false);
  const [done, setDone] = useState(false);
  const onSubmit = async (e: FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    setPending(true);
    await authClient.requestPasswordReset({ email: email.trim(), redirectTo: localizePath(locale, "/reinitialiser-mot-de-passe") });
    setPending(false);
    setDone(true);
  };
  if (done) {
    return (
      <div role="status" className="space-y-3">
        <p>{t.done}</p>
        {devMailbox ? (
          <Link href="/dev/boite-mail" className="font-semibold underline">
            {t.openMailbox}
          </Link>
        ) : null}
      </div>
    );
  }
  return (
    <form onSubmit={onSubmit} className="space-y-4">
      <TextField id="email" label={t.email} type="email" autoComplete="email" value={email} onChange={setEmail} />
      <Submit pending={pending}>{t.submit}</Submit>
    </form>
  );
}

export function ResetPasswordForm({ token, error: linkError }: { token: string | null; error: string | null }) {
  const router = useRouter();
  const { locale, m } = useI18n();
  const t = m.auth.reset;
  const [password, setPassword] = useState("");
  const [confirm, setConfirm] = useState("");
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [pending, setPending] = useState(false);
  const [formError, setFormError] = useState("");
  if (!token || linkError) {
    return (
      <p role="alert" className="rounded-[var(--radius-md)] bg-danger-soft p-3 text-sm">
        {t.invalid}{" "}
        <Link href="/mot-de-passe-oublie" className="font-semibold underline">
          {t.requestNew}
        </Link>
      </p>
    );
  }
  const onSubmit = async (e: FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    const errs: Record<string, string> = {};
    if (password.length < 10) errs.password = m.auth.signUp.passwordMin;
    if (confirm !== password) errs.confirm = m.auth.signUp.mismatch;
    setErrors(errs);
    if (Object.keys(errs).length) return;
    setPending(true);
    const { error } = await authClient.resetPassword({ newPassword: password, token });
    setPending(false);
    if (error) {
      setFormError(t.expired);
      return;
    }
    router.push(localizePath(locale, "/connexion?reinitialise=1"));
  };
  return (
    <form onSubmit={onSubmit} noValidate className="space-y-4">
      {formError ? (
        <p role="alert" className="rounded-[var(--radius-md)] bg-danger-soft p-3 text-sm font-medium text-danger">
          {formError}
        </p>
      ) : null}
      <TextField id="password" label={t.password} type="password" autoComplete="new-password" value={password} onChange={setPassword} error={errors.password} hint={t.passwordHint} />
      <TextField id="confirm" label={t.confirm} type="password" autoComplete="new-password" value={confirm} onChange={setConfirm} error={errors.confirm} />
      <Submit pending={pending}>{t.submit}</Submit>
    </form>
  );
}

export function SignOutButton({ className = "" }: { className?: string }) {
  const router = useRouter();
  const { locale, m } = useI18n();
  const [pending, setPending] = useState(false);
  return (
    <button
      type="button"
      disabled={pending}
      className={className}
      onClick={async () => {
        setPending(true);
        await authClient.signOut();
        router.push(localizePath(locale, "/"));
        router.refresh();
      }}
    >
      {pending ? m.auth.signOut.pending : m.auth.signOut.label}
    </button>
  );
}
