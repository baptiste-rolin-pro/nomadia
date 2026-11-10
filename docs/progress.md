# Avancement — reprise de travail

Dernière mise à jour : 2026-11-10, préparation du déploiement Vercel + Neon en démonstration publique sans donnée personnelle. Branche `feat/nomadia-v1` : construction initiale et durcissement des paiements commités (4608c1f) ; la préparation Vercel est dans l'arbre de travail, **non commitée**, rien n'est déployé.

## État par étape du brief

| Étape | État |
| --- | --- |
| 1. Audit et cadrage | Fait. Dépôt vierge ; README (section Claude conservée), CLAUDE.md, AGENTS.md, `.claude/`, `.codex/` non modifiés. `next.config.ts` : `agentRules: false` pour que `next dev` ne réécrive pas AGENTS.md. |
| 2. Socle et direction artistique | Fait. Tokens, composants, en-tête/pied, accueil (séquences A à H), 36 photos Commons créditées. |
| 3. Parcours fonctionnels | Fait. Recherche vols/hôtels/voitures, fiches, annuaires, guides, planificateur, authentification réelle, compte, favoris. |
| 4. Réservation et intégrations | DEMO complet (tunnel + 8 scénarios de réservation + 3 scénarios de recherche). Duffel : recherche/actualisation écrites, non testées. Booking.com : non implémenté (accès partenaire). |
| 5. Finition et vérification | Fait : budget JS de l'accueil ramené à 191 Ko gz ; inspection visuelle 375/1440 px ; suites complètes vertes. |
| 6. Livraison | Fait : README, `.env.example`, `docs/architecture.md`, `providers.md`, `design-motion.md`, `assets.md`, `validation.md`, ce fichier. |
| Durcissement paiements (revue) | Fait : `DEMO_WEBHOOK_SECRET` obligatoire en production et webhook de démonstration fermé sans secret configuré ou hors DEMO ; un seul paiement actif par réservation (prise atomique de l'étape + index `payments_active_booking`, migration `drizzle/0001_payments_active_booking.sql`) ; devis échu refusé avant tout encaissement. 10 tests ajoutés. |
| Préparation Vercel (démo publique) | Fait, **non déployé** : `NOMADIA_PUBLIC_SIGNUP` (défaut `false`) ferme côté serveur inscription, réinitialisation par email et modifications du compte partagé ; identifiants de démonstration affichés sur `/connexion` ; avertissements « aucune donnée personnelle réelle » (bandeau, étape voyageurs) ; contact et voyageurs enregistrés fermés ; email de contact fictif imposé ; sessions sans IP ni user-agent. Base : pool serverless, TLS `verify-full`, plus de migration au démarrage pour PostgreSQL ; `vercel.json` (build = `db:migrate` + `db:seed` + `next build`, Cron quotidien sur `/api/jobs/run` avec `CRON_SECRET`) ; seed idempotent sous verrou consultatif ; bail de 15 min pour les tâches abandonnées. Étapes et variables : README « Déploiement sur Vercel ». |

## Dernières vérifications exécutées (détail : docs/validation.md)

- Passe « préparation Vercel » (2026-11-10) : `npx tsc --noEmit` OK · `npx eslint .` OK (0 avertissement) · `npx vitest run` 73/73 (7 fichiers) · `npx next build` OK (59 pages) · `npx playwright test` 29/29 (deux serveurs). Chemin node-postgres exécuté via un pont local vers PGlite (migrate ×2, seed ×2, 11/11 parcours dont réservation complète). **Test Neon non exécuté : aucune `DATABASE_URL` dans `.env.local`.**
- Passe « durcissement des paiements » : `npx tsc --noEmit` OK · `npx eslint .` OK (0 avertissement) · `npx vitest run` 56/56 (5 fichiers) · `npx next build` OK (60 pages) · `npx playwright test` 24/24.
- Passe initiale (non relancée depuis) : `npm run links:check` 0 erreur (15 réponses 403 anti-robot) · `next dev` vérifié (routes avec accès base en 200).
- Migration 0001 : appliquée au premier accès base de chaque processus. Les serveurs locaux (`next start` :3000, `next dev` :3005) ont été arrêtés pour libérer `.data/pglite` ; au redémarrage, la migration s'appliquera (vérifiée sur une copie de la base : aucun doublon bloquant).

## Reste à faire (priorités suivantes)

1. P0 — Déployer la démonstration sur Vercel (README « Déploiement sur Vercel », étapes 1 à 7) : créer la base Neon (intégration Vercel : `DATABASE_URL` + `DATABASE_URL_UNPOOLED`), définir `BETTER_AUTH_SECRET`, `CRON_SECRET`, `NOMADIA_SITE_URL`, choisir la région des fonctions (`fra1`), déployer, puis vérifier : journal de build (migrations + seed), connexion par compte de démonstration, réservation jusqu'à « Billets émis », `/api/jobs/run` en 401 sans jeton, exécution du Cron depuis l'onglet *Cron Jobs*. Localement, avant cela : ajouter les deux URL Neon à `.env.local` puis `npm run db:deploy` et `next start` (connexion + réservation) — jamais fait faute d'URL.
2. P1 — Connecter un fournisseur réel par verticale quand les accès existent : jeton Duffel sandbox → tester `src/lib/providers/duffel.ts`, puis implémenter commandes + paiement selon le modèle choisi ; candidature Booking.com Demand (hôtels/voitures) ou redirection partenaire.
3. P1 — Paiement réel (intégration hébergée) si la plateforme encaisse ; transport email réel (nécessaire avant `NOMADIA_PUBLIC_SIGNUP=true` en public). Avant cela : réconcilier une tentative de paiement interrompue (dossier « paiement en cours » sans paiement) ; décider si la validation 3-D Secure doit revérifier l'échéance du devis. Cron Vercel quotidien seulement sur Hobby : passer à Vercel Schedules (bêta, 15 min) ou Pro si nécessaire.
4. P1 — Démo publique : réinitialiser périodiquement les données des comptes partagés (réservations et voyages créés par les visiteurs) ; rafraîchir les dates des voyages de référence (créées à la date du premier seed) ; envisager `attachDatabasePool` (`@vercel/functions`, dépendance non ajoutée) pour fermer les connexions avant la suspension d'une instance Fluid.
5. P1 — Administration des contenus (aujourd'hui en code dans `src/lib/content`).
6. Qualité — Lighthouse et mesure sous limitation mobile ; tests Firefox/WebKit ; test lecteur d'écran ; JS de `/vols` (208 Ko gz) légèrement au-dessus de l'objectif fixé pour l'accueil.
7. Légal — compléter les champs « À compléter » ; valider statut Atout France et documents avant toute vente.
8. P2 (non commencé) — multi-destinations, alertes de prix, partage collaboratif, activités, i18n réelle.

## Comment reprendre

```bash
npm install
cp .env.example .env.local
npm run db:reset              # serveur arrêté (PGlite = un seul processus)
npm run dev                   # ou : npm run build && npm start
npm run check                 # typecheck + lint + tests + build
npm run test:e2e:install && npm run test:e2e   # après un build
```

Comptes de test : `voyageur@nomadia.test`, `admin@nomadia.test` (mots de passe dans `.env.example`, affichés sur `/connexion` tant que `NOMADIA_PUBLIC_SIGNUP=false`, le défaut). Pour tester l'inscription en local : `NOMADIA_PUBLIC_SIGNUP=true` + `NOMADIA_DEV_MAILBOX=true`. Emails capturés : `/dev/boite-mail`. Déploiement Vercel + Neon : README.

Points d'entrée utiles : registre des fournisseurs `src/lib/providers/registry.ts`, tunnel `src/lib/booking/service.ts` et `processing.ts`, analyse du carnet `src/lib/planner/analyze.ts`, schéma `src/lib/db/schema.ts` (après modification : `npm run db:generate`).
