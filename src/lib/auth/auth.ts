import "server-only";
import { betterAuth } from "better-auth";
import { drizzleAdapter } from "better-auth/adapters/drizzle";
import { nextCookies } from "better-auth/next-js";
import { db } from "@/lib/db";
import * as schema from "@/lib/db/schema";
import { env, siteUrl } from "@/lib/env";
import { sendEmail } from "@/lib/mail";
import { siteConfig } from "@/lib/config/site";

/**
 * Authentification réelle avec Better Auth (sessions en base, mots de passe hachés,
 * vérification d'adresse email, réinitialisation, renouvellement de session).
 * OAuth n'est pas activé : aucun accès fournisseur n'est configuré.
 */
type Auth = ReturnType<typeof createAuth>;

function createAuth(database: Awaited<ReturnType<typeof db>>) {
  const e = env();
  return betterAuth({
    appName: siteConfig.name,
    baseURL: siteUrl(),
    secret: e.BETTER_AUTH_SECRET,
    database: drizzleAdapter(database, {
      provider: "pg",
      schema: { user: schema.user, session: schema.session, account: schema.account, verification: schema.verification },
    }),
    telemetry: { enabled: false },
    user: {
      additionalFields: {
        role: { type: "string", required: false, defaultValue: "user", input: false },
      },
    },
    emailAndPassword: {
      enabled: true,
      requireEmailVerification: true,
      minPasswordLength: 10,
      maxPasswordLength: 128,
      autoSignIn: false,
      revokeSessionsOnPasswordReset: true,
      resetPasswordTokenExpiresIn: 60 * 60,
      sendResetPassword: async ({ user, url }) => {
        void sendEmail({
          to: user.email,
          subject: "Nomadia — réinitialisation de votre mot de passe",
          text: `Bonjour,\n\nUne réinitialisation de mot de passe a été demandée pour votre compte Nomadia.\nCe lien est valable une heure :\n${url}\n\nSi vous n'êtes pas à l'origine de cette demande, ignorez ce message.`,
          template: "reset_password",
        });
      },
    },
    emailVerification: {
      sendOnSignUp: true,
      sendOnSignIn: true,
      autoSignInAfterVerification: true,
      expiresIn: 60 * 60 * 24,
      sendVerificationEmail: async ({ user, url }) => {
        void sendEmail({
          to: user.email,
          subject: "Nomadia — confirmez votre adresse email",
          text: `Bonjour ${user.name},\n\nConfirmez votre adresse email pour activer votre compte Nomadia :\n${url}\n\nCe lien est valable 24 heures.`,
          template: "verify_email",
        });
      },
    },
    session: {
      expiresIn: 60 * 60 * 24 * 7,
      updateAge: 60 * 60 * 24,
    },
    rateLimit: {
      enabled: e.NODE_ENV === "production" && e.NOMADIA_AUTH_RATE_LIMIT === "on",
      window: 60,
      max: 30,
    },
    advanced: {
      useSecureCookies: siteUrl().startsWith("https://"),
    },
    plugins: [nextCookies()],
  });
}

const globalForAuth = globalThis as unknown as { __nomadiaAuth?: Promise<Auth> };

export function getAuth(): Promise<Auth> {
  globalForAuth.__nomadiaAuth ??= db().then(createAuth);
  return globalForAuth.__nomadiaAuth;
}
