# Avancement — reprise de travail

Dernière mise à jour : 2026-11-09, durcissement des paiements après revue indépendante (après la session de construction initiale). Rien n'est commité (tous les fichiers sont dans l'arbre de travail).

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

## Dernières vérifications exécutées (détail : docs/validation.md)

- Passe « durcissement des paiements » : `npx tsc --noEmit` OK · `npx eslint .` OK (0 avertissement) · `npx vitest run` 56/56 (5 fichiers) · `npx next build` OK (60 pages) · `npx playwright test` 24/24.
- Passe initiale (non relancée depuis) : `npm run links:check` 0 erreur (15 réponses 403 anti-robot) · `next dev` vérifié (routes avec accès base en 200).
- Migration 0001 : appliquée au premier accès base de chaque processus. Les serveurs locaux (`next start` :3000, `next dev` :3005) ont été arrêtés pour libérer `.data/pglite` ; au redémarrage, la migration s'appliquera (vérifiée sur une copie de la base : aucun doublon bloquant).

## Reste à faire (priorités suivantes)

1. P1 — Connecter un fournisseur réel par verticale quand les accès existent : jeton Duffel sandbox → tester `src/lib/providers/duffel.ts`, puis implémenter commandes + paiement selon le modèle choisi ; candidature Booking.com Demand (hôtels/voitures) ou redirection partenaire.
2. P1 — Paiement réel (intégration hébergée) si la plateforme encaisse ; transport email réel ; ordonnanceur appelant `/api/jobs/run`. Avant cela : réconcilier une tentative de paiement interrompue (dossier « paiement en cours » sans paiement) ; décider si la validation 3-D Secure doit revérifier l'échéance du devis.
3. P1 — Tester `DATABASE_URL` (PostgreSQL) ; hébergement Node avec persistance.
4. P1 — Administration des contenus (aujourd'hui en code dans `src/lib/content`).
5. Qualité — Lighthouse et mesure sous limitation mobile ; tests Firefox/WebKit ; test lecteur d'écran ; JS de `/vols` (208 Ko gz) légèrement au-dessus de l'objectif fixé pour l'accueil.
6. Légal — compléter les champs « À compléter » ; valider statut Atout France et documents avant toute vente.
7. P2 (non commencé) — multi-destinations, alertes de prix, partage collaboratif, activités, i18n réelle.

## Comment reprendre

```bash
npm install
cp .env.example .env.local
npm run db:reset              # serveur arrêté (PGlite = un seul processus)
npm run dev                   # ou : npm run build && npm start
npm run check                 # typecheck + lint + tests + build
npm run test:e2e:install && npm run test:e2e   # après un build
```

Comptes de test : `voyageur@nomadia.test`, `admin@nomadia.test` (mots de passe dans `.env.example`). Emails capturés : `/dev/boite-mail`.

Points d'entrée utiles : registre des fournisseurs `src/lib/providers/registry.ts`, tunnel `src/lib/booking/service.ts` et `processing.ts`, analyse du carnet `src/lib/planner/analyze.ts`, schéma `src/lib/db/schema.ts` (après modification : `npm run db:generate`).
