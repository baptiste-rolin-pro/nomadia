# Nomadia

Plateforme de voyage immersive : découvrir une destination, construire un voyage daté et cohérent, comparer vols, hébergements et voitures, puis réserver chaque prestation en comprenant ce que l'on achète.

> **Version de démonstration.** Toutes les offres, tous les prix et tous les prestataires de réservation sont fictifs. Aucune réservation n'est transmise à un fournisseur réel et aucun paiement n'est encaissé. Ce dépôt n'est pas un système prêt à vendre ni à émettre des billets.

## Démarrage rapide

Prérequis : Node.js ≥ 20.9 (testé avec Node 26.13 et npm 11.20 sous Windows 11). Aucun Docker ni PostgreSQL local n'est nécessaire : la base est un PostgreSQL embarqué (PGlite) stocké dans `.data/`.

```bash
npm install
cp .env.example .env.local      # valeurs factices, à adapter
npm run db:reset                # crée la base locale, applique les migrations, insère les données de démo
npm run dev                     # http://localhost:3000
```

Ou en mode production locale :

```bash
npm run build
npm start
```

**Important :** PGlite n'accepte qu'un seul processus à la fois sur un même dossier. Arrêtez le serveur avant `npm run db:reset` / `db:seed`.

## Comptes de démonstration

Créés par `npm run db:seed` (idempotent : relançable sans risque) avec des mots de passe **de test** définis dans `.env.example` (`DEMO_USER_PASSWORD`, `DEMO_ADMIN_PASSWORD`, par défaut `voyage-demo-2026` / `admin-demo-2026`) :

| Compte | Rôle | Contenu |
| --- | --- | --- |
| `voyageur@nomadia.test` | voyageur | 3 voyages de référence (Lisbonne à deux, Rome en famille, Islande avec arrivée tardive) |
| `admin@nomadia.test` | administrateur | accès à `/admin` (consultation) |

Avec `NOMADIA_PUBLIC_SIGNUP=false` (défaut), ces identifiants sont **affichés sur la page de connexion** (bouton « Utiliser le compte… ») : ce sont des valeurs de test publiques, jamais de vrais mots de passe.

Les emails (vérification d'adresse, réinitialisation, confirmation) ne sont **pas envoyés** : ils sont capturés en base et visibles sur `/dev/boite-mail` lorsque `NOMADIA_DEV_MAILBOX=true` (jamais sur un site public).

## Site de démonstration public : aucune donnée personnelle

`NOMADIA_PUBLIC_SIGNUP` (serveur, **`false` par défaut**) choisit le mode :

| | `false` (défaut, démonstration publique) | `true` (inscription ouverte) |
| --- | --- | --- |
| Inscription, réinitialisation du mot de passe par email, renvoi d'email de vérification | **fermés côté serveur** : routes Better Auth en 404 (`disabledPaths`) et refus 403 des appels serveur `auth.api.*` (crochet `before`), `disableSignUp`, envois d'email neutralisés ; les pages affichent une explication | ouverts |
| Compte | comptes de démonstration **partagés** ; mot de passe, email, nom, suppression, sessions des autres visiteurs et comptes liés non modifiables ni listables (routes fermées, dont `/update-session`, `/unlink-account`, `/list-accounts`, `/account-info`, + actions serveur refusées) | comptes personnels |
| Voyageurs enregistrés, formulaire de contact | désactivés (pages et actions serveur) | actifs |
| Email de contact d'une réservation | **adresse fictive obligatoire** (domaines réservés `.test`, `.example`, `.invalid`, `.localhost`, `example.com/.net/.org`), vérifiée côté serveur | libre |

Dans les deux modes : fenêtre « Bienvenue sur la démo de Nomadia » à la première visite (aucun paiement réel, prix et prestataires fictifs, comptes partagés, aucune donnée personnelle réelle ; fermeture mémorisée par navigateur, réouverture par le lien « À propos de la démo » du pied de page), avertissement dans l'étape « voyageurs » du tunnel et sur `/connexion`, sessions enregistrées **sans adresse IP ni user-agent** (la limitation de débit utilise l'IP en mémoire seulement), mesure d'audience sans donnée personnelle et soumise au consentement.

Reste saisi par les visiteurs : noms et dates de naissance des voyageurs d'une réservation, titres et notes des voyages. Sur les comptes partagés, ces saisies sont **visibles des autres visiteurs** (avertissement affiché). Assistant : le texte saisi est envoyé à Anthropic pour être interprété (ni adresse IP, ni compte, ni cookie), jamais enregistré ni journalisé par Nomadia ; seuls une empreinte HMAC de l'adresse IP et des compteurs sont conservés pour la limitation de débit (voir `/confidentialite#assistant`). Hors application : Vercel et Neon tiennent leurs propres journaux techniques (adresses IP des requêtes HTTP, connexions à la base) selon leurs politiques.

## Déploiement sur Vercel (démonstration publique, base Neon gratuite)

### Choix techniques

- **Base** : Neon PostgreSQL. L'application utilise `DATABASE_URL` = chaîne **pooled** (hôte `-pooler`, PgBouncer) avec un petit pool node-postgres par instance (5 connexions sur Vercel, connexions inactives fermées après 10 s, délai de connexion 10 s, TLS vérifié : `sslmode=require` est réécrit en `verify-full`, équivalent dans pg 8 ; `sslmode=disable` ou `no-verify` sur un hôte distant est refusé avec une erreur explicite). Une erreur sur une connexion inactive (calcul Neon suspendu) est journalisée sans faire tomber l'instance. L'URL n'est jamais journalisée.
- **Migrations : étape explicite au build, jamais au démarrage à froid.** `vercel.json` remplace la commande de build par `npm run vercel-build` = `db:migrate` → `db:seed` → `next build`. Justification : une fois par déploiement et non par instance ; un échec de migration fait échouer le déploiement et laisse le précédent en ligne ; un verrou consultatif PostgreSQL (`pg_advisory_lock`, sur la connexion **directe** `DATABASE_URL_UNPOOLED`) sérialise deux builds simultanés ; chaque lot de migrations est transactionnel (migrateur Drizzle) ; aucun secret n'est nécessaire sur un poste de développement. Contrepartie : l'ancien déploiement sert encore le trafic pendant le build, donc les migrations doivent rester rétrocompatibles (ajouts). Alternative manuelle documentée plus bas.
- **Seed à chaque déploiement** : idempotent et sous le même verrou ; crée les comptes de démonstration s'ils manquent, resynchronise rôle / adresse vérifiée / mot de passe de test, recrée un voyage de référence manquant ou vide. Il ne supprime jamais les réservations des visiteurs.
- **Tâches en arrière-plan sans serveur permanent** : rien ne s'exécute après la réponse. (1) Le tunnel exécute les tâches de chaque dossier à la consultation : la page de réservation se rafraîchit seule (2 s puis jusqu'à 10 s) tant qu'un statut est en attente, ce qui fait avancer émission des billets, réconciliation et remboursement ; le parcours complet est vérifié par les tests. (2) **Vercel Cron** appelle `GET /api/jobs/run` une fois par jour (`17 4 * * *` UTC) avec `Authorization: Bearer $CRON_SECRET` pour balayer les dossiers abandonnés. Limites vérifiées le 2026-11-10 dans la documentation Vercel : plan Hobby = **une exécution par jour au plus**, déclenchée n'importe quand dans l'heure prévue (±59 min) ; Pro = à la minute ; pas de nouvel essai en cas d'échec, exécution en double possible (la route est idempotente : chaque tâche est prise par une seule instance) ; cron uniquement sur le déploiement de production. Vercel présente les Cron Jobs comme « legacy » au profit de *Schedules* (bêta publique ; Hobby : toutes les 15 min) : non utilisé ici, migration possible sans changer la route (`requestMethod: "GET"`). (3) Une tâche restée « en cours » plus de 15 min (fonction arrêtée) redevient exécutable ; un traitement fournisseur interrompu passe en « statut inconnu » puis réconciliation, jamais de seconde réservation.

### Étapes

1. **Neon** : créer un projet gratuit (région conseillée : AWS Europe Central 1, Francfort). Le plus simple : depuis Vercel, *Storage* / *Marketplace* → Neon → connecter au projet ; l'intégration définit `DATABASE_URL` (pooled) et `DATABASE_URL_UNPOOLED` (directe) pour les environnements choisis. Sinon, copier les deux chaînes depuis la console Neon (*Connect* → « Connection pooling » activé / désactivé) en conservant `?sslmode=require`.
2. **Vercel** : *Add New Project* → importer le dépôt. Framework : Next.js (détecté). Laisser la commande de build par défaut : `vercel.json` impose `npm run vercel-build`. Node.js : 22.x ou plus récent (*Settings → Build and Deployment*).
3. **Variables d'environnement** (*Settings → Environment Variables*, au minimum pour *Production*) : `BETTER_AUTH_SECRET`, `DATABASE_URL`, `DATABASE_URL_UNPOOLED`, `CRON_SECRET`, et de préférence `NOMADIA_SITE_URL` (voir le tableau ci-dessous). Pour l'assistant : `ANTHROPIC_API_KEY` (*Sensitive*) et, si besoin, `NOMADIA_ASSISTANT_DAILY_LIMIT` / `NOMADIA_ASSISTANT_IP_HOURLY_LIMIT` ; la migration `0003_assistant_rate_limits` est appliquée par le build. Générer chaque secret avec `node -e "console.log(require('crypto').randomBytes(32).toString('base64url'))"` et le saisir comme variable *Sensitive*. Ne pas définir `NOMADIA_DEV_MAILBOX`, `NOMADIA_AUTH_RATE_LIMIT=off`, `NOMADIA_FIXED_NOW`, `NOMADIA_ASSISTANT_MOCK` ni `NOMADIA_PUBLIC_SIGNUP=true`. Ne pas définir non plus `NODE_ENV` : le build a besoin des `devDependencies` (`tsx` pour les scripts de migration et de seed).
4. **Région des fonctions** : *Settings → Functions → Function Region* = la plus proche de Neon (`fra1` pour Francfort) ; chaque page enchaîne plusieurs requêtes SQL.
5. **Déployer**. Le journal de build doit afficher « Migrations appliquées (PostgreSQL (DATABASE_URL_UNPOOLED, connexion directe)) » puis « Seed de démonstration … ». Une variable manquante fait échouer le build avec un message explicite (`BETTER_AUTH_SECRET`, `DATABASE_URL`).
6. **Vérifier** : `/connexion` affiche les comptes de démonstration ; se connecter, réserver un vol de démonstration jusqu'à « Billets émis » ; `/inscription` affiche l'explication ; `curl -i https://<domaine>/api/jobs/run` répond 401 ; *Settings → Cron Jobs* liste `/api/jobs/run` (bouton *Run* pour tester).
7. **Aperçus (Preview)** : un aperçu exécute aussi migrations et seed. Soit activer dans l'intégration Neon la création d'une branche de base par aperçu, soit fournir pour *Preview* une autre base / branche Neon. Sans base pour *Preview*, le build d'aperçu échoue volontairement (PGlite n'est pas persistant sur Vercel). Les aperçus sont protégés par l'authentification Vercel par défaut.

Alternative manuelle (sans migration au build) : remplacer `buildCommand` par `next build` dans `vercel.json`, puis avant chaque déploiement qui modifie `drizzle/`, exécuter depuis un poste `npm run db:deploy` avec `DATABASE_URL_UNPOOLED` (et `DATABASE_URL`) renseignées dans `.env.local` (chargé par les scripts, jamais affiché).

### Variables d'environnement

Toutes sont lues côté serveur (aucune `NEXT_PUBLIC_*`). « Public » = valeur non secrète (elle peut être visible) ; « Secret » = à saisir comme variable *Sensitive*.

| Variable | Nature | Sur Vercel | Défaut | Rôle |
| --- | --- | --- | --- | --- |
| `DATABASE_URL` | Secret | **Obligatoire** | — (PGlite en local) | Chaîne Neon **pooled** (`-pooler`, `sslmode=require`) utilisée par l'application |
| `DATABASE_URL_UNPOOLED` | Secret | Recommandée | `DATABASE_URL` | Chaîne Neon **directe**, utilisée seulement par `db:migrate` / `db:seed` (verrou consultatif). Sans elle, migrations via le pooler et verrou omis (avertissement) |
| `BETTER_AUTH_SECRET` | Secret | **Obligatoire** (production et aperçus) | secret de développement (local uniquement) | Signature des sessions, ≥ 32 caractères |
| `CRON_SECRET` | Secret | Recommandée | — | Envoyé par Vercel Cron (`Authorization: Bearer …`), ≥ 16 caractères alphanumériques. Sans elle, `/api/jobs/run` répond 401 et seul le traitement à la consultation fait avancer les dossiers |
| `NOMADIA_SITE_URL` | Public | Recommandée | `https://$VERCEL_PROJECT_PRODUCTION_URL` en production, URL de branche en aperçu, `http://localhost:3000` hors Vercel | URL publique (liens, canonicals, origine acceptée par Better Auth, cookies `Secure`). Doit être le domaine utilisé pour se connecter |
| `NOMADIA_PUBLIC_SIGNUP` | Public | Optionnelle | `false` | `false` = démonstration publique (voir plus haut) ; `true` = inscription et réinitialisation par email (inutiles sans vrai transport d'email) |
| `DEMO_USER_PASSWORD`, `DEMO_ADMIN_PASSWORD` | **Public** (affiché sur `/connexion`) | Optionnelles | `voyage-demo-2026`, `admin-demo-2026` | Mots de passe de test des comptes de démonstration, ≥ 10 caractères ; appliqués au prochain seed (donc au prochain déploiement). Jamais un vrai mot de passe |
| `NOMADIA_SITE_ENV` | Public | Optionnelle | `demo` | `demo` = non indexé ; `production` = indexable et exige `DEMO_WEBHOOK_SECRET` |
| `NOMADIA_JOB_RUNNER_TOKEN` | Secret | Optionnelle | — | Jeton d'un ordonnanceur externe pour `/api/jobs/run` (GET ou POST) |
| `DEMO_WEBHOOK_SECRET` | Secret | Optionnelle (obligatoire si `NOMADIA_SITE_ENV=production`) | aléatoire par processus | Sans valeur, le webhook HTTP de démonstration reste fermé (404) ; le paiement simulé fonctionne quand même |
| `FLIGHTS_PROVIDER_MODE`, `HOTELS_PROVIDER_MODE`, `CARS_PROVIDER_MODE` | Public | Optionnelles | `demo` | Garder `demo` |
| `NOMADIA_LIVE_SALES_APPROVED` | Public | Optionnelle | `false` | Garder `false` |
| `MAIL_TRANSPORT`, `MAIL_FROM` | Public | Optionnelles | `capture`, `Nomadia <no-reply@nomadia.example>` | Emails capturés en base, jamais envoyés |
| `NOMADIA_DEV_MAILBOX` | Public | **Interdite** en production Vercel | `false` | Boîte de test `/dev/boite-mail` (local uniquement) |
| `NOMADIA_AUTH_RATE_LIMIT` | Public | Laisser `on` (`off` interdit en production Vercel) | `on` | Limitation de débit de l'authentification |
| `NOMADIA_FIXED_NOW` | Public | Jamais | — | Horloge figée (tests) |
| `ANTHROPIC_API_KEY` | Secret | Optionnelle (sans elle : assistant « indisponible ») | — | Clé de l'API Anthropic pour l'assistant de l'accueil (modèle `claude-opus-5-5`). Seule source d'identifiants lue par le serveur. Voir docs/providers.md (données envoyées, conservation, coûts) |
| `NOMADIA_ASSISTANT_IP_HOURLY_LIMIT` | Public | Optionnelle | `20` | Demandes à l'assistant par visiteur (empreinte HMAC de l'adresse IP, jamais l'adresse) et par heure ; au-delà : 429 |
| `NOMADIA_ASSISTANT_DAILY_LIMIT` | Public | Recommandée | `300` | Plafond global de demandes par jour UTC (borne le coût) ; `0` ferme l'assistant ; au-delà : 429 |
| `NOMADIA_ASSISTANT_MOCK` | Public | **Interdite** (erreur de configuration sur Vercel et en production) | `off` | `e2e` : modèle simulé pour les tests de parcours, aucun appel réseau |
| `PGLITE_DATA_DIR` | Public | Inutilisée | `.data/pglite` | Base locale PGlite |
| `DUFFEL_ACCESS_TOKEN`, `BOOKING_DEMAND_API_KEY`, `BOOKING_DEMAND_AFFILIATE_ID` | Secret | Inutilisées en démonstration | — | Fournisseurs réels (non actifs) |
| `VERCEL`, `VERCEL_ENV`, `VERCEL_URL`, `VERCEL_BRANCH_URL`, `VERCEL_PROJECT_PRODUCTION_URL` | Système Vercel | Automatiques | — | Garde-fous et URL par défaut (option « Automatically expose System Environment Variables », active par défaut) |

## Ce qui fonctionne en démonstration

- Accueil immersif (hero photographique, moteur à onglets Mon voyage / Vols / Hôtels / Voitures / Assistant, mosaïque de destinations, ambiances, aperçu du carnet, guides, FAQ, transparence des réservations).
- 12 destinations avec pages détaillées (saisons sourcées, formalités renvoyées à France Diplomatie, galerie créditée, recherches préremplies), 3 guides, annuaires des compagnies et des loueurs.
- Assistant de l'accueil (onglet « Assistant ») : une demande écrite en français (« Vol Paris–Rome le 12 juin, retour le 16, avec une voiture sur place ») devient une ou plusieurs actions du site — recherche de vols, d'hébergements ou de voitures préremplie, fiche destination, formulaire « Organiser mon voyage » prérempli. Ce qui a été compris (lieux, dates, voyageurs, hypothèses signalées) s'affiche avant l'ouverture ; plusieurs services donnent un plan en étapes ; une information manquante donne une question. Modèle Claude (`claude-opus-5-5`) via l'API Anthropic, entrées validées et liens construits côté serveur, limitation de débit et plafond journalier. Sans `ANTHROPIC_API_KEY` : « indisponible ». Détail : docs/architecture.md, docs/providers.md.
- Recherche de vols, hôtels et voitures : autocomplétion de lieux, validation client **et** serveur, filtres partageables dans l'URL, tri expliqué, « afficher plus », états chargement / vide / erreur / fournisseur indisponible, fiches détaillées. Offres de démonstration sur Lisbonne, Rome et Reykjavik.
- Planificateur : voyage daté, ajout depuis les résultats, statuts envisagé / à réserver / en cours / confirmé, timeline jour par jour, budget détaillé, alertes (nuits sans hébergement, chevauchements, voiture avant l'atterrissage, arrivée nocturne, agence fermée…), version imprimable, export `.ics`, brouillon anonyme rattachable au compte.
- Authentification réelle (Better Auth) : connexion (comptes de démonstration partagés), déconnexion, sessions renouvelées ; espace client (voyages, réservations, favoris, profil en lecture, préférences, export et demande de suppression des données).
- Avec `NOMADIA_PUBLIC_SIGNUP=false` (défaut, démonstration publique partagée), l'inscription, la vérification d'adresse, le mot de passe oublié et les voyageurs enregistrés sont **fermés** (voir « Site de démonstration public » plus haut). Ils fonctionnent avec `NOMADIA_PUBLIC_SIGNUP=true` : comptes personnels, profil modifiable, voyageurs enregistrés sur consentement, emails capturés en base et visibles sur `/dev/boite-mail` en local avec `NOMADIA_DEV_MAILBOX=true`.
- Tunnel de réservation simulé : actualisation de l'offre, voyageurs (âge vérifié à chaque trajet), options non précochées, vérification, paiement simulé sans données bancaires, traitement fournisseur, statuts séparés (devis, paiement, réservation, documents), récapitulatif de démonstration, annulation avec frais, lien invité opaque.
- Scénarios contrôlables (mode DEMO) : aucune offre, fournisseur indisponible, réponse lente, prix modifié, devis expiré, paiement refusé, authentification bancaire, paiement réussi + réservation refusée, résultat incertain, annulation avec frais.

## Modes fournisseurs

Chaque service a un mode explicite défini côté serveur (`FLIGHTS_PROVIDER_MODE`, `HOTELS_PROVIDER_MODE`, `CARS_PROVIDER_MODE`) : `demo`, `sandbox` ou `live`. Il n'est jamais modifiable par l'URL. Un fournisseur non configuré produit une erreur explicite, jamais des offres fictives de remplacement. Voir [docs/providers.md](docs/providers.md).

## Commandes

| Commande | Rôle |
| --- | --- |
| `npm run dev` | serveur de développement |
| `npm run build` / `npm start` | build de production / serveur de production |
| `npm run typecheck` | TypeScript strict (`tsc --noEmit`) |
| `npm run lint` | ESLint (configuration Next.js + TypeScript) |
| `npm test` | tests métier et d'intégration (Vitest) |
| `npm run test:e2e:install` | installe Chromium pour Playwright (une fois) |
| `npm run test:e2e` | parcours Playwright (nécessite `npm run build` au préalable) : deux serveurs, `:3100` en configuration « démonstration publique » (`.data/pglite-e2e`) et `:3101` avec inscription ouverte (`.data/pglite-e2e-open`) ; `DATABASE_URL` et `ANTHROPIC_API_KEY` forcées à vide, assistant simulé sur `:3100`, indisponible sur `:3101` |
| `npm run check` | typecheck + lint + tests + build |
| `npm run db:generate` | génère une migration SQL depuis `src/lib/db/schema.ts` (drizzle-kit) |
| `npm run db:migrate` | applique les migrations : PostgreSQL si `DATABASE_URL_UNPOOLED` / `DATABASE_URL` (verrou consultatif), sinon PGlite. Les scripts `db:*` chargent `.env.local` comme Next.js |
| `npm run db:seed` | données de démonstration (idempotent, relançable) |
| `npm run db:deploy` | `db:migrate` puis `db:seed` |
| `npm run vercel-build` | commande de build Vercel (`vercel.json`) : `db:deploy` puis `next build` |
| `npm run db:reset` | supprime la base locale puis migrate + seed (refusé si une URL PostgreSQL est configurée) |
| `npm run links:check` | vérifie les liens externes cités (sources officielles, licences) |

## Documentation

- [docs/architecture.md](docs/architecture.md) — modèle de données, flux, décisions.
- [docs/providers.md](docs/providers.md) — fournisseurs, documentation consultée, capacités, activation.
- [docs/design-motion.md](docs/design-motion.md) — direction artistique, composants, partition d'animation.
- [docs/assets.md](docs/assets.md) — photographies, crédits, droits ; Blender.
- [docs/validation.md](docs/validation.md) — vérifications réellement exécutées, mesures, limites.
- [docs/progress.md](docs/progress.md) — état du travail pour reprise.

## Limites et activation commerciale

- Aucune connexion fournisseur réelle n'est active : pas de jeton Duffel, pas d'accès partenaire Booking.com. L'adaptateur Duffel (recherche, actualisation) est écrit mais **non testé**.
- Paiement : prestataire simulé. Une intégration hébergée (par exemple Stripe Checkout) est à brancher selon le modèle d'encaissement validé.
- Emails : transport « capture » uniquement.
- Avant toute vente réelle : statut d'opérateur de voyages (immatriculation Atout France, garantie financière, assurance RC professionnelle selon l'activité), contrats fournisseurs, mentions légales, CGV, politique de confidentialité et médiateur à compléter (champs marqués « À compléter »). La variable `NOMADIA_LIVE_SALES_APPROVED` conditionne la réservation en mode `live`.
- Hébergement : Vercel + Neon (voir plus haut) ou tout hébergement Node.js avec `DATABASE_URL` (pas GitHub Pages). Le chemin node-postgres (migrations, seed, `next start`, connexion, tunnel complet) a été exécuté localement à travers un pont réseau vers PGlite ; il n'a **pas encore été testé contre Neon** (TLS, PgBouncer, latence) ni sur un déploiement Vercel réel.

## Configuration Claude

- `CLAUDE.md` définit les règles de routage.
- `.claude/agents/` contient les agents du projet.
