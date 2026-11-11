# Architecture

## Vue d'ensemble

Monolithe modulaire Next.js 16 (App Router, Turbopack), TypeScript strict.

```
src/
  app/                    routes (pages serveur, actions serveur, gestionnaires de route)
  components/             UI : ui/, layout/, home/, search/, results/, planner/, booking/, account/, auth/, content/
  lib/
    config/site.ts        marque, coordonnées, champs légaux « à compléter »
    env.ts                configuration serveur validée (Zod), garde-fous production
    money.ts, dates.ts    montants en unités mineures ; dates civiles et fuseaux IANA
    content/              destinations, guides, annuaires, lieux, photos (contenu éditorial versionné)
    providers/            types communs, registre, adaptateurs DEMO / Duffel, offre normalisée « Bookable »
    search/               paramètres (Zod, chargés à la demande côté client), requêtes, filtres et tris
    assistant/            assistant de l'accueil : outils stricts, prompt, validation et chemins, limitation de débit, client simulé
    planner/              service des voyages, analyse (timeline, budget, alertes)
    booking/              tunnel (service), traitement fournisseur, statuts, prix, voyageurs
    payments/             prestataire de paiement simulé, signature et gestion des événements
    auth/                 Better Auth (serveur), client, session
    db/                   schéma Drizzle et client (PGlite ou PostgreSQL)
    jobs.ts, mail.ts, audit.ts, viewer.ts, security.ts
    demo-site.ts          mode « démonstration publique » (NOMADIA_PUBLIC_SIGNUP), adresses fictives
    demo-accounts.ts      comptes de démonstration (seed + page de connexion)
  proxy.ts                redirection optimiste des zones privées (pas un contrôle d'accès)
drizzle/                  migrations SQL (seul chemin de migration)
scripts/                  migrate, seed, reset, préparation e2e, vérification des liens, outils d'images (lib/ : chargement de .env.local)
vercel.json               build Vercel (migrations + seed + next build) et Vercel Cron
tests/unit, tests/e2e     Vitest, Playwright
```

Rendu : pages éditoriales statiques (ISR 1 h pour celles qui affichent des dates relatives) ; pages de recherche, compte, voyage et réservation dynamiques. Les résultats de recherche sont chargés côté client depuis `/api/search/*` (requêtes temporisées, annulées, ordonnées) ; les filtres vivent dans l'URL (`history.replaceState`, intégré au routeur).

## Décisions structurantes

| Décision | Raison |
| --- | --- |
| PostgreSQL via **PGlite** en local, `pg` en exploitation | Environnement local reproductible sans Docker ; même dialecte et mêmes migrations qu'en production. Limite : un seul processus par dossier de données. PGlite migre au premier accès ; PostgreSQL **jamais au démarrage** : `npm run db:migrate` au build Vercel, sous verrou consultatif (connexion directe). Pool serverless : 5 connexions par instance, inactives fermées après 10 s, TLS vérifié, Neon « pooled » pour l'application. |
| **Drizzle ORM** + drizzle-kit | Un seul ORM, un seul chemin de migrations (`drizzle/`), requêtes typées. |
| **Better Auth** (adaptateur Drizzle) | Solution éprouvée : mots de passe hachés, sessions en base renouvelées (7 j, mise à jour quotidienne), vérification d'adresse, réinitialisation, limitation de débit. Sessions enregistrées sans IP ni user-agent. Mode démonstration publique (`NOMADIA_PUBLIC_SIGNUP=false`, défaut) : inscription, réinitialisation par email et modification du compte partagé fermées côté serveur (`disabledPaths` + crochet `before` + `disableSignUp`). |
| Adaptateurs fournisseurs par verticale | Le mode DEMO utilise la même logique de domaine (Bookable, tunnel, statuts) que SANDBOX/LIVE. |
| Prestataire de paiement simulé avec événements signés | Permet de démontrer idempotence, déduplication et ordre des événements sans clé ni carte. |
| File de tâches en base (`jobs`) exécutée à la demande | Réconciliation, émission différée, remboursement sans processus supplémentaire (compatible serverless : rien ne s'exécute après la réponse). La page de réservation se rafraîchit et exécute les tâches de son dossier ; `/api/jobs/run` (Vercel Cron quotidien avec `CRON_SECRET`, ou ordonnanceur externe) balaie le reste. Bail de 15 min : une tâche « running » abandonnée redevient exécutable (comparer-échanger sur statut + tentatives) ; un traitement fournisseur interrompu passe en « inconnu » puis réconciliation. |
| Motion uniquement dans le planificateur | Budget JavaScript de l'accueil ; animations CSS ailleurs. |
| Assistant : le modèle choisit des **outils**, le serveur construit les **liens** | Le modèle (Claude, API Anthropic) ne produit que des identifiants de lieux, des dates et des nombres ; le serveur les revalide avec les schémas de recherche du site et construit lui-même les chemins. Aucune URL ni aucun texte libre du modèle n'est suivi par le navigateur. |

## Modèle de données (tables)

- **Authentification** : `user` (+ `role`), `session`, `account`, `verification` (schéma Better Auth).
- **Profil** : `preferences` (consentement marketing distinct et horodaté), `saved_travelers` (avec `consent_at`), `consents` (historique), `data_requests`.
- **Voyages** : `trips` (propriétaire utilisateur OU empreinte SHA-256 d'un cookie anonyme ; dates civiles `date` ; budget en centimes ; marge de transfert), `trip_items` (verticale, statut, référence d'offre, instantané serveur, montants, validité du devis), `favorites`.
- **Réservation** : `quotes` (devis : montants, instantané de l'offre et des conditions, échéance, devis précédent, acceptation d'un changement de prix), `bookings` (étape, statuts **séparés** : `payment_status`, `provider_status`, `document_status` ; propriétaire ou jeton invité haché + expiration ; scénario démo), `booking_attempts` (clé d'idempotence unique par type), `payments` (clé d'idempotence unique, identifiant prestataire unique), `received_events` (unicité source + identifiant d'événement), `jobs` (clé unique), `incidents`, `documents`, `demo_provider_records` (mémoire du fournisseur simulé).
- **Exploitation** : `audit_log` (sans données personnelles), `email_outbox` (déduplication par clé métier), `analytics_events` (sans données personnelles, dédupliqués), `contact_messages`.
- **Assistant** : `assistant_rate_limits` (clé = `ip:<HMAC de l'adresse IP>:<heure>` ou `day:<AAAA-MM-JJ>`, compteur, échéance ; aucune adresse IP en clair, aucun texte saisi ; migration `drizzle/0003_assistant_rate_limits.sql`).

### Règles

- Montants : entiers en unités mineures + devise ; ISK/JPY sans décimales ; ratios par `BigInt` avec arrondi explicite ; formatage via chaîne décimale exacte (aucun flottant).
- Dates de séjour : type `date` (civil) ; nuits comptées par numéro de jour civil ; heures locales `AAAA-MM-JJTHH:mm` + fuseau IANA ; conversion UTC seulement pour durées et comparaisons (gestion des heures inexistantes / ambiguës au changement d'heure).
- Une référence fournisseur n'est jamais une clé d'accès : l'accès à une réservation exige le compte propriétaire ou le jeton invité (cookie httpOnly, empreinte en base, expiration 30 jours).
- Les pages privées renvoient `Cache-Control: private, no-store` et `noindex`.

## Flux de réservation

```
Offre (recherche) ──► startBooking : reprice fournisseur ──► devis (échéance 20 min) + dossier
   ──► voyageurs (âge à chaque trajet) ──► options (aucune précochée, total recalculé serveur)
   ──► vérification : échéance du devis ? nouvelle actualisation ; prix différent => nouveau devis + acceptation explicite
   ──► paiement (si la plateforme encaisse et montant > 0) : clé d'idempotence par formulaire ;
        échéance du devis revérifiée (expiré => retour à la vérification, rien n'est débité) ;
        prise atomique de l'étape par réservation + index unique « un paiement actif par réservation » ;
        refus / authentification / succès => événement signé => webhook (dédupliqué, ordonné)
   ──► tâche provider_book (clé stable book:<id>) :
        confirmé => documents, email unique, suivi d'émission (vols)
        refusé + payé => incident + remboursement demandé => confirmé par événement
        délai dépassé => statut inconnu + incident => réconciliation (retrieve) avant toute autre action
```

Ordre encaissement / réservation en DEMO : la plateforme encaisse d'abord (modèle « solde » de type agrégateur aérien), puis réserve ; compensation par remboursement en cas d'échec. Hôtels « paiement à l'établissement » et voitures « paiement à l'agence » : aucun encaissement. En exploitation, l'ordre doit suivre le contrat de chaque fournisseur (voir providers.md).

## Assistant de l'accueil (flux)

```
Onglet « Assistant » (fragment chargé à l'ouverture de l'onglet, ≈ 3,7 Ko gz ; GET /api/assistant => disponible ?)
   ──► POST /api/assistant { text ≤ 500, previous?: { request, question } }
        1. configuration : sans ANTHROPIC_API_KEY (ni simulation) => 503 « indisponible », rien n'est consommé
        2. origine (en-tête Origin = site) sinon 403 ; corps ≤ 4 Ko, schéma strict, sinon 400
        3. quotas en base (assistant_rate_limits, partagés entre instances) : visiteur/heure puis plafond/jour => 429 + Retry-After
        4. UNE requête au modèle (client.beta.messages.create), pas de boucle :
             outils stricts (ordre figé) → système stable [consignes + référentiel lieux/destinations, cache_control]
             → système variable [date du jour, horizon, 1er jour des mois] → message <demande>…</demande>
             claude-opus-5-5, effort « low », réflexion adaptative, max_tokens 4096, tool_choice auto,
             fallbacks « default » (bêta server-side-fallback-2026-07-01), délai 20 s, 1 nouvelle tentative
        5. interprétation : refus => message fixe ; aucun outil => message fixe (texte du modèle non affiché) ;
             ask_clarification => question nettoyée (sans lien, ≤ 300 caractères) ;
             sinon chaque appel : schéma Zod strict (propriété en plus refusée) → schéma de recherche du site
             → fenêtre de dates (passé, 330 jours) → chemin construit par le serveur → relu par l'analyseur de la page
             (identique, sinon refus). Une étape invalide => toute la demande revient en question (rien n'est retiré en silence).
   ◄── { status: "ok", result: actions[≤4] | clarification | out_of_scope } ou { status: "error", code, message (français) }
Navigateur : n'accepte que des chemins internes connus (/vols, /hotels, /voitures, /voyage/nouveau, /destinations/…) ;
   1 action => « Voici ce que j'ai compris » puis ouverture après 2,2 s (« Rester ici » annule) ;
   plusieurs => plan en étapes, un lien par étape ; question => champ « Votre réponse », tour précédent renvoyé.
```

- Actions possibles : recherche de vols, d'hébergements ou de voitures préremplie, fiche destination, formulaire « Organiser mon voyage » prérempli (`origine=assistant` affiche un avis ; le voyage n'est créé qu'à la validation du formulaire). Aucune réservation, aucun paiement, aucune modification de compte.
- Le texte saisi n'est ni stocké ni journalisé : les journaux d'erreur ne contiennent que la classe d'erreur du SDK, le statut, le type, le code et l'identifiant de requête.
- Mode simulé (`NOMADIA_ASSISTANT_MOCK=e2e`, tests de parcours) : même requête, même validation, réponse produite localement par `src/lib/assistant/mock.ts` ; refusé sur Vercel et en production.

## Sécurité

- Contrôle d'accès dans chaque page, action serveur et route (session vérifiée en base) ; `proxy.ts` ne fait qu'une redirection optimiste.
- Redirections post-connexion limitées aux chemins internes.
- Routes JSON mutantes : vérification de l'en-tête `Origin` + cookies `SameSite=Lax`.
- En-têtes : `X-Content-Type-Options`, `Referrer-Policy`, `X-Frame-Options: DENY`, `Permissions-Policy`.
- Site de démonstration public : aucune collecte de donnée personnelle par l'application (README, « Site de démonstration public ») ; actions serveur du profil, des voyageurs enregistrés et du contact refusées ; email de contact d'une réservation limité aux domaines réservés (RFC 2606 / 6761).
- Garde-fous Vercel (`VERCEL` défini) : `BETTER_AUTH_SECRET` et `DATABASE_URL` obligatoires (production et aperçus) ; boîte mail de test et `NOMADIA_AUTH_RATE_LIMIT=off` interdites en production Vercel ; URL publique par défaut tirée des variables système Vercel.
- Garde-fous de configuration : en production, secret d'authentification et secret des événements de paiement de démonstration (`DEMO_WEBHOOK_SECRET`) obligatoires ; boîte mail de test et désactivation de la limitation de débit interdites. Hors production, sans `DEMO_WEBHOOK_SECRET`, le secret est aléatoire par processus et le webhook HTTP de démonstration est fermé (404) ; il l'est aussi quand aucun service n'est en mode DEMO.

## Conservation des données (à valider)

Compte, voyages, favoris : jusqu'à suppression. Pièces liées à une réservation : durée légale applicable (à valider). Journal d'audit sans données personnelles : durée à définir. Les demandes de suppression sont enregistrées et traitées manuellement dans cette version.

## Extensions préparées (non construites)

Multi-devises et traductions (configuration centralisée, devise par montant), administration des contenus, alertes de prix, vols multi-destinations, achat groupé (nécessite orchestration et cadre contractuel validés).
