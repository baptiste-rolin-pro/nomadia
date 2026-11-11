import "server-only";
import { betterAuth } from "better-auth";
import { APIError, createAuthMiddleware } from "better-auth/api";
import { drizzleAdapter } from "better-auth/adapters/drizzle";
import { nextCookies } from "better-auth/next-js";
import { db } from "@/lib/db";
import * as schema from "@/lib/db/schema";
import { env, secureCookies, siteUrl } from "@/lib/env";
import { sendEmail } from "@/lib/mail";
import { siteConfig } from "@/lib/config/site";

/**
 * Authentification réelle avec Better Auth (sessions en base, mots de passe hachés,
 * vérification d'adresse email, réinitialisation, renouvellement de session).
 * OAuth n'est pas activé : aucun accès fournisseur n'est configuré.
 *
 * NOMADIA_PUBLIC_SIGNUP=false (défaut, site de démonstration public) : seuls les comptes de démonstration
 * partagés existent. Les routes qui créent un compte, envoient un email à une adresse saisie ou modifient
 * l'identité / les accès du compte partagé sont fermées côté serveur (voir SHARED_DEMO_CLOSED_PATHS).
 */
type Auth = ReturnType<typeof createAuth>;

/**
 * Routes Better Auth fermées en mode « comptes de démonstration partagés ».
 * - `disabledPaths` : 404 pour les appels HTTP (chemins exacts) ;
 * - crochet `before` : refus aussi pour les appels serveur `auth.api.*` et les chemins paramétrés.
 */
export const SHARED_DEMO_CLOSED_PATHS = [
  "/sign-up/email",
  "/request-password-reset",
  "/reset-password",
  "/reset-password/:token",
  "/send-verification-email",
  "/change-email",
  "/change-password",
  "/set-password",
  "/update-user",
  "/delete-user",
  "/delete-user/callback",
  "/list-sessions",
  "/revoke-session",
  "/revoke-sessions",
  "/revoke-other-sessions",
  // Session et comptes liés : ni modification des champs de session, ni dissociation d'un fournisseur,
  // ni lecture des comptes liés / des informations fournisseur du compte partagé. Aucune page ne s'en sert
  // (la session est lue par /get-session et auth.api.getSession, qui restent ouverts).
  "/update-session",
  "/unlink-account",
  "/list-accounts",
  "/account-info",
] as const;

function createAuth(database: Awaited<ReturnType<typeof db>>) {
  const e = env();
  const shared = !e.NOMADIA_PUBLIC_SIGNUP;
  const closed = new Set<string>(shared ? SHARED_DEMO_CLOSED_PATHS : []);
  return betterAuth({
    appName: siteConfig.name,
    baseURL: siteUrl(),
    secret: e.BETTER_AUTH_SECRET,
    database: drizzleAdapter(database, {
      provider: "pg",
      schema: { user: schema.user, session: schema.session, account: schema.account, verification: schema.verification },
    }),
    telemetry: { enabled: false },
    disabledPaths: [...closed],
    hooks: {
      before: createAuthMiddleware(async (ctx) => {
        if (closed.has(ctx.path)) {
          throw new APIError("FORBIDDEN", { message: "Fonction désactivée sur le site de démonstration (comptes de démonstration partagés)." });
        }
      }),
    },
    user: {
      additionalFields: {
        role: { type: "string", required: false, defaultValue: "user", input: false },
      },
    },
    emailAndPassword: {
      enabled: true,
      disableSignUp: shared,
      requireEmailVerification: true,
      minPasswordLength: 10,
      maxPasswordLength: 128,
      autoSignIn: false,
      revokeSessionsOnPasswordReset: true,
      resetPasswordTokenExpiresIn: 60 * 60,
      sendResetPassword: async ({ user, url }) => {
        if (shared) return; // défense en profondeur : la route est déjà fermée
        void sendEmail({
          to: user.email,
          subject: "Nomadia — réinitialisation de votre mot de passe",
          text: `Bonjour,\n\nUne réinitialisation de mot de passe a été demandée pour votre compte Nomadia.\nCe lien est valable une heure :\n${url}\n\nSi vous n'êtes pas à l'origine de cette demande, ignorez ce message.`,
          template: "reset_password",
        });
      },
    },
    emailVerification: {
      sendOnSignUp: !shared,
      sendOnSignIn: !shared,
      autoSignInAfterVerification: true,
      expiresIn: 60 * 60 * 24,
      sendVerificationEmail: async ({ user, url }) => {
        if (shared) return;
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
    databaseHooks: {
      session: {
        create: {
          // Minimisation : ni adresse IP ni user-agent conservés avec la session (jamais lus par l'application).
          // La limitation de débit utilise l'adresse IP en mémoire uniquement.
          before: async () => ({ data: { ipAddress: "", userAgent: "" } }),
        },
      },
    },
    rateLimit: {
      enabled: e.NODE_ENV === "production" && e.NOMADIA_AUTH_RATE_LIMIT === "on",
      window: 60,
      max: 30,
    },
    advanced: {
      useSecureCookies: secureCookies(),
    },
    plugins: [nextCookies()],
  });
}

const globalForAuth = globalThis as unknown as { __nomadiaAuth?: Promise<Auth> };

export function getAuth(): Promise<Auth> {
  globalForAuth.__nomadiaAuth ??= db()
    .then(createAuth)
    .catch((err: unknown) => {
      // Pas de rejet mis en cache : une erreur transitoire (base, configuration) ne bloque pas l'instance.
      globalForAuth.__nomadiaAuth = undefined;
      throw err;
    });
  return globalForAuth.__nomadiaAuth;
}
