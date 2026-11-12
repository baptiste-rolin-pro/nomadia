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
    assistant/            assistant de l'accueil : analyse locale (parser/), repli vers le modèle (outils stricts, prompt), validation et chemins communs, limitation de débit, client simulé
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
| Assistant : **analyse locale d'abord**, modèle seulement en repli ; dans les deux cas des **outils** validés, le serveur construit les **liens** | L'analyse locale déterministe (src/lib/assistant/parser) rend l'assistant gratuit et utilisable sans clé ; le modèle (Claude, API Anthropic) n'est appelé que pour les demandes qu'elle ne comprend pas, si la clé est configurée. L'une comme l'autre ne produisent que des identifiants de lieux, des dates et des nombres (mêmes formes d'entrée d'outils) ; le serveur les revalide avec les schémas de recherche du site et construit lui-même les chemins (un seul code : actions.ts). Aucune URL ni aucun texte libre du modèle n'est suivi par le navigateur. |

## Modèle de données (tables)

- **Authentification** : `user` (+ `role`), `session`, `account`, `verification` (schéma Better Auth).
- **Profil** : `preferences` (consentement marketing distinct et horodaté), `saved_travelers` (avec `consent_at`), `consents` (historique), `data_requests`.
- **Voyages** : `trips` (propriétaire utilisateur OU empreinte SHA-256 d'un cookie anonyme ; dates civiles `date` ; budget en centimes ; marge de transfert), `trip_items` (verticale, statut, référence d'offre, instantané serveur, montants, validité du devis), `favorites`.
- **Réservation** : `quotes` (devis : montants, instantané de l'offre et des conditions, échéance, devis précédent, acceptation d'un changement de prix), `bookings` (étape, statuts **séparés** : `payment_status`, `provider_status`, `document_status` ; propriétaire ou jeton invité haché + expiration ; scénario démo), `booking_attempts` (clé d'idempotence unique par type), `payments` (clé d'idempotence unique, identifiant prestataire unique), `received_events` (unicité source + identifiant d'événement), `jobs` (clé unique), `incidents`, `documents`, `demo_provider_records` (mémoire du fournisseur simulé).
- **Exploitation** : `audit_log` (sans données personnelles), `email_outbox` (déduplication par clé métier), `analytics_events` (sans données personnelles, dédupliqués), `contact_messages`.
- **Assistant** : `assistant_rate_limits` (clé = `local:<HMAC de l'adresse IP>:<heure>` et `localday:<AAAA-MM-JJ>` pour l'analyse locale, `ip:<HMAC>:<heure>` et `day:<AAAA-MM-JJ>` pour le repli vers le modèle ; compteur, échéance ; aucune adresse IP en clair, aucun texte saisi ; migration `drizzle/0003_assistant_rate_limits.sql`, inchangée).

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

L'assistant fonctionne **sans clé** : une analyse locale déterministe en français est le chemin par défaut, gratuite ;
le modèle Claude n'est qu'un **repli**, appelé seulement si l'analyse locale ne comprend pas la demande **et** si
`ANTHROPIC_API_KEY` est configurée. Sans clé, rien n'est jamais envoyé à Anthropic.

```
Onglet « Assistant » (fragment chargé à l'ouverture de l'onglet ; GET /api/assistant => { available: true, fallback })
   ──► POST /api/assistant { text ≤ 500, previous?: { request (tours séparés par « \n↳ »), question } }
        1. origine (en-tête Origin = site) sinon 403 ; corps ≤ 4 Ko, schéma strict, sinon 400
        2. ANALYSE LOCALE (src/lib/assistant/parser, pur TypeScript, < 1 ms, aucun réseau) :
             normalisation (minuscules, accents, apostrophes, tirets, nombres en lettres) → tentative d'injection
             ou « réserve et paie » seul => message fixe → résidence → dates/durées/heures → voyageurs → conducteur
             → cabine → lieux (référentiel + pays + codes d'aéroport, fautes de frappe, ambiguïtés) → rôles
             (départ, destination, restitution) → services → UNE question si une information manque,
             sinon entrées d'outils de MÊMES formes que tools.ts → resultFromCalls / buildAction (ci-dessous)
           comprise (service ou lieu reconnu) ; une erreur inattendue de l'analyse vaut « non comprise » : quota local (compteur `local:`, 120/h par défaut) => réponse, engine « local »
        3. non comprise, sans repli (pas de clé, ou plafond journalier à 0) : quota local => aide (2–3 exemples
           + onglets classiques), engine « local » ; le client du modèle n'est pas construit
        4. non comprise, avec repli : quotas du modèle (visiteur/heure puis plafond/jour) => 429 + Retry-After ;
           UNE requête au modèle (client.beta.messages.create), pas de boucle :
             outils stricts (ordre figé) → système stable [consignes + référentiel lieux/destinations, cache_control]
             → système variable [date du jour, horizon, 1er jour des mois] → message <demande>…</demande>
             claude-opus-5-5, effort « low », réflexion adaptative, max_tokens 4096, tool_choice auto,
             fallbacks « default » (bêta server-side-fallback-2026-07-01), délai 20 s, 1 nouvelle tentative
           interprétation : refus => message fixe ; aucun outil => message fixe (texte du modèle non affiché) ;
             ask_clarification => question nettoyée (sans lien, ≤ 300 caractères) ; engine « ia »
        Validation commune (actions.ts, analyse locale ET modèle) : schéma Zod strict (propriété en plus refusée)
             → schéma de recherche du site → fenêtre de dates (passé, 330 jours) → chemin construit par le serveur
             → relu par l'analyseur de la page (identique, sinon refus). Une étape invalide => toute la demande revient
             en question (rien n'est retiré en silence).
   ◄── { status: "ok", engine: "local" | "ia", result: actions[≤4] | clarification | out_of_scope | help }
       ou { status: "error", code, message (français) }
Navigateur : n'accepte que des chemins internes connus (/vols, /hotels, /voitures, /voyage/nouveau, /destinations/…) ;
   1 action => « Voici ce que j'ai compris » puis ouverture après 2,2 s (« Rester ici » annule) ;
   plusieurs => plan en étapes, un lien par étape ; question => champ « Votre réponse », tours précédents renvoyés ;
   aide => exemples cliquables + boutons vers les onglets Mon voyage / Vols / Hôtels / Voitures ;
   mention discrète « interprétée par Claude (Anthropic) » seulement quand engine = « ia ».
```

- **Analyse locale** — lieux : villes, aéroports (noms et codes ; les codes qui sont aussi des mots, comme `PAR` ou `LIS`, seulement en majuscules), destinations éditoriales, pays (Islande → Reykjavik ; Portugal ou Italie : question), lieux connus mais non proposés (Berlin, Lille…) ; fautes de frappe par distance de Damerau-Levenshtein restreinte (≤ 1 jusqu'à 7 lettres, ≤ 2 au-delà avec mêmes deux premières lettres et même dernière, même initiale, mots courts seulement après une préposition, liste de faux amis : « pars », « montrer », « Irlande »…), égalité entre deux lieux => question. Départ absent : Paris (comme le formulaire de vols), toujours signalé. Dates relatives à aujourd'hui en Europe/Paris (src/lib/clock.ts) en dates civiles : absolues, plages, « demain », week-ends (vendredi → dimanche), « la semaine prochaine », « dans 2 semaines », mois (début / mi / fin), durées, « retour le 16 », heures de location arrondies à la demi-heure ; prochaine occurrence (année suivante signalée) ; date impossible => question. Toute valeur par défaut (dates choisies dans un mois, durée conseillée, 1 adulte, heures 12 h / 10 h, conducteur de 30 ans résidant en France, aéroport d'arrivée pour la voiture) est listée dans les hypothèses de l'action (6 au plus, jamais tronquées). Tours successifs : chaque tour est analysé seul, le plus récent l'emporte pour chaque information ; la question précédente ne sert qu'à interpréter une réponse courte (« 3 » nuits, « 6 et 10 » ans, « le 20 » pour un retour).
- Actions possibles : recherche de vols, d'hébergements ou de voitures préremplie, fiche destination, formulaire « Organiser mon voyage » prérempli (`origine=assistant` affiche un avis ; le voyage n'est créé qu'à la validation du formulaire). Aucune réservation, aucun paiement, aucune modification de compte (« réserve et paie » : message fixe, ou la recherche avec la remarque « Rien n'est réservé ni payé »).
- Limitation de débit : compteurs en base séparés. Analyse locale : `local:<HMAC>:<heure>` (spam ; si la base est indisponible, la demande est servie quand même et l'incident journalisé, ce chemin n'ayant ni coût ni tiers) + `localday:<jour>` (déclenche la purge quotidienne). Repli : `ip:<HMAC>:<heure>` et `day:<jour>` (plafond de coût), consommés **seulement** par les demandes envoyées au modèle ; base indisponible => 503 sans appel.
- Le texte saisi n'est ni stocké ni journalisé : les journaux d'erreur ne contiennent que la classe d'erreur du SDK, le statut, le type, le code et l'identifiant de requête.
- Mode simulé (`NOMADIA_ASSISTANT_MOCK=e2e`, tests de parcours) : repli simulé par `src/lib/assistant/mock.ts` (même requête, même validation), appelé comme le vrai modèle seulement pour les demandes non comprises localement ; refusé sur Vercel et en production.

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
