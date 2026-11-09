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
    planner/              service des voyages, analyse (timeline, budget, alertes)
    booking/              tunnel (service), traitement fournisseur, statuts, prix, voyageurs
    payments/             prestataire de paiement simulé, signature et gestion des événements
    auth/                 Better Auth (serveur), client, session
    db/                   schéma Drizzle et client (PGlite ou PostgreSQL)
    jobs.ts, mail.ts, audit.ts, viewer.ts, security.ts
  proxy.ts                redirection optimiste des zones privées (pas un contrôle d'accès)
drizzle/                  migrations SQL (seul chemin de migration)
scripts/                  migrate, seed, reset, préparation e2e, vérification des liens, outils d'images
tests/unit, tests/e2e     Vitest, Playwright
```

Rendu : pages éditoriales statiques (ISR 1 h pour celles qui affichent des dates relatives) ; pages de recherche, compte, voyage et réservation dynamiques. Les résultats de recherche sont chargés côté client depuis `/api/search/*` (requêtes temporisées, annulées, ordonnées) ; les filtres vivent dans l'URL (`history.replaceState`, intégré au routeur).

## Décisions structurantes

| Décision | Raison |
| --- | --- |
| PostgreSQL via **PGlite** en local, `pg` en exploitation | Environnement local reproductible sans Docker ; même dialecte et mêmes migrations qu'en production. Limite : un seul processus par dossier de données. |
| **Drizzle ORM** + drizzle-kit | Un seul ORM, un seul chemin de migrations (`drizzle/`), requêtes typées. |
| **Better Auth** (adaptateur Drizzle) | Solution éprouvée : mots de passe hachés, sessions en base renouvelées (7 j, mise à jour quotidienne), vérification d'adresse, réinitialisation, limitation de débit. |
| Adaptateurs fournisseurs par verticale | Le mode DEMO utilise la même logique de domaine (Bookable, tunnel, statuts) que SANDBOX/LIVE. |
| Prestataire de paiement simulé avec événements signés | Permet de démontrer idempotence, déduplication et ordre des événements sans clé ni carte. |
| File de tâches en base (`jobs`) exécutée à la demande | Réconciliation, émission différée, remboursement sans processus supplémentaire ; `/api/jobs/run` pour un ordonnanceur externe. |
| Motion uniquement dans le planificateur | Budget JavaScript de l'accueil ; animations CSS ailleurs. |

## Modèle de données (tables)

- **Authentification** : `user` (+ `role`), `session`, `account`, `verification` (schéma Better Auth).
- **Profil** : `preferences` (consentement marketing distinct et horodaté), `saved_travelers` (avec `consent_at`), `consents` (historique), `data_requests`.
- **Voyages** : `trips` (propriétaire utilisateur OU empreinte SHA-256 d'un cookie anonyme ; dates civiles `date` ; budget en centimes ; marge de transfert), `trip_items` (verticale, statut, référence d'offre, instantané serveur, montants, validité du devis), `favorites`.
- **Réservation** : `quotes` (devis : montants, instantané de l'offre et des conditions, échéance, devis précédent, acceptation d'un changement de prix), `bookings` (étape, statuts **séparés** : `payment_status`, `provider_status`, `document_status` ; propriétaire ou jeton invité haché + expiration ; scénario démo), `booking_attempts` (clé d'idempotence unique par type), `payments` (clé d'idempotence unique, identifiant prestataire unique), `received_events` (unicité source + identifiant d'événement), `jobs` (clé unique), `incidents`, `documents`, `demo_provider_records` (mémoire du fournisseur simulé).
- **Exploitation** : `audit_log` (sans données personnelles), `email_outbox` (déduplication par clé métier), `analytics_events` (sans données personnelles, dédupliqués), `contact_messages`.

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

## Sécurité

- Contrôle d'accès dans chaque page, action serveur et route (session vérifiée en base) ; `proxy.ts` ne fait qu'une redirection optimiste.
- Redirections post-connexion limitées aux chemins internes.
- Routes JSON mutantes : vérification de l'en-tête `Origin` + cookies `SameSite=Lax`.
- En-têtes : `X-Content-Type-Options`, `Referrer-Policy`, `X-Frame-Options: DENY`, `Permissions-Policy`.
- Garde-fous de configuration : en production, secret d'authentification et secret des événements de paiement de démonstration (`DEMO_WEBHOOK_SECRET`) obligatoires ; boîte mail de test et désactivation de la limitation de débit interdites. Hors production, sans `DEMO_WEBHOOK_SECRET`, le secret est aléatoire par processus et le webhook HTTP de démonstration est fermé (404) ; il l'est aussi quand aucun service n'est en mode DEMO.

## Conservation des données (à valider)

Compte, voyages, favoris : jusqu'à suppression. Pièces liées à une réservation : durée légale applicable (à valider). Journal d'audit sans données personnelles : durée à définir. Les demandes de suppression sont enregistrées et traitées manuellement dans cette version.

## Extensions préparées (non construites)

Multi-devises et traductions (configuration centralisée, devise par montant), administration des contenus, alertes de prix, vols multi-destinations, achat groupé (nécessite orchestration et cadre contractuel validés).
