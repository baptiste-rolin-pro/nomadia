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

Créés par `npm run db:seed` avec des mots de passe **de test** définis dans `.env.example` (`DEMO_USER_PASSWORD`, `DEMO_ADMIN_PASSWORD`) :

| Compte | Rôle | Contenu |
| --- | --- | --- |
| `voyageur@nomadia.test` | voyageur | 3 voyages de référence (Lisbonne à deux, Rome en famille, Islande avec arrivée tardive) |
| `admin@nomadia.test` | administrateur | accès à `/admin` (consultation) |

Les emails (vérification d'adresse, réinitialisation, confirmation) ne sont **pas envoyés** : ils sont capturés en base et visibles sur `/dev/boite-mail` lorsque `NOMADIA_DEV_MAILBOX=true` (jamais sur un site public).

## Ce qui fonctionne en démonstration

- Accueil immersif (hero photographique, moteur à onglets Mon voyage / Vols / Hôtels / Voitures, mosaïque de destinations, ambiances, aperçu du carnet, guides, FAQ, transparence des réservations).
- 12 destinations avec pages détaillées (saisons sourcées, formalités renvoyées à France Diplomatie, galerie créditée, recherches préremplies), 3 guides, annuaires des compagnies et des loueurs.
- Recherche de vols, hôtels et voitures : autocomplétion de lieux, validation client **et** serveur, filtres partageables dans l'URL, tri expliqué, « afficher plus », états chargement / vide / erreur / fournisseur indisponible, fiches détaillées. Offres de démonstration sur Lisbonne, Rome et Reykjavik.
- Planificateur : voyage daté, ajout depuis les résultats, statuts envisagé / à réserver / en cours / confirmé, timeline jour par jour, budget détaillé, alertes (nuits sans hébergement, chevauchements, voiture avant l'atterrissage, arrivée nocturne, agence fermée…), version imprimable, export `.ics`, brouillon anonyme rattachable au compte.
- Authentification réelle (Better Auth) : inscription, vérification d'adresse, connexion, déconnexion, mot de passe oublié, sessions renouvelées ; espace client (voyages, réservations, favoris, profil, voyageurs enregistrés sur consentement, préférences, export et demande de suppression des données).
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
| `npm run test:e2e` | parcours Playwright (nécessite `npm run build` au préalable ; base de test dédiée `.data/pglite-e2e`) |
| `npm run check` | typecheck + lint + tests + build |
| `npm run db:generate` | génère une migration SQL depuis `src/lib/db/schema.ts` (drizzle-kit) |
| `npm run db:migrate` | applique les migrations |
| `npm run db:seed` | données de démonstration |
| `npm run db:reset` | supprime la base locale puis migrate + seed |
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
- Hébergement : nécessite un serveur Node.js avec persistance (pas GitHub Pages). En exploitation, utiliser `DATABASE_URL` (PostgreSQL) — chemin écrit mais non testé faute de serveur PostgreSQL dans cet environnement.

## Configuration Claude

- `CLAUDE.md` définit les règles de routage.
- `.claude/agents/` contient les agents du projet.
