# Validation

Toutes les vérifications ci-dessous ont été **réellement exécutées** le 2026-11-09 sur Windows 11, Node.js 26.13, npm 11.20, Chromium (Playwright 1.65). Rien n'est déclaré réussi sans exécution.

Dernière passe : **durcissement des paiements** après revue indépendante (voir la section dédiée). Les cinq premières lignes du tableau sont les résultats de cette passe ; les trois dernières datent de la passe initiale et n'ont pas été relancées.

## Résultats

| Vérification | Commande | Résultat |
| --- | --- | --- |
| Types | `npx tsc --noEmit` | OK, 0 erreur, code de sortie 0 (TypeScript 5.9, `strict` + `noUncheckedIndexedAccess`) |
| Lint | `npx eslint .` | OK, 0 erreur, 0 avertissement, code de sortie 0 |
| Tests métier et intégration | `npx vitest run` | **56/56** (5 fichiers), code de sortie 0 |
| Build de production | `npx next build` | OK, 60 pages générées, aucun avertissement, code de sortie 0 |
| Parcours | `npx playwright test` | **24/24** (1,3 min), code de sortie 0 ; passe initiale : 24/24 sur deux exécutions consécutives |
| Serveur de développement | `npx next dev` + requêtes HTTP | Passe initiale : 200 sur `/`, `/destinations/rome`, `/api/auth/get-session` (accès base), `/voyage/nouveau`, `/api/search/hotels`, `/dev/boite-mail` |
| Base locale | `npm run db:reset` | Passe initiale : migrations + seed OK (2 comptes, 3 voyages de référence) |
| Liens externes | `npm run links:check` | Passe initiale : 68 liens, **0 en erreur** ; 15 réponses 403 de protections anti-robot (sites de compagnies/loueurs, capetown.travel, visitnorway.com) à contrôler manuellement dans un navigateur |

## Durcissement des paiements (revue indépendante, 2026-11-09)

Trois problèmes signalés, chacun corrigé avec des tests qui **échouaient avant la correction** (7 échecs constatés sur le code d'origine, dont 3 paiements créés pour une seule réservation) et passent après :

1. **Secret de repli fixe du webhook de démonstration.** `DEMO_WEBHOOK_SECRET` retombait sur une valeur fixe publiée dans le code, y compris avec `NOMADIA_SITE_ENV=production`. Désormais : obligatoire en production (même garde-fou que `BETTER_AUTH_SECRET`) ; hors production sans valeur, secret aléatoire propre au processus (jamais une constante) ; `POST /api/demo/webhooks/payment` répond 404 si aucun service n'est en mode DEMO **ou** si le secret n'est pas explicitement configuré. Tests : `tests/unit/payment-webhook-config.test.ts` (production sans secret refusée, route fermée sans secret ou hors DEMO même avec une signature valide, signature vérifiée sinon, charge utile invalide refusée avant tout accès base).
2. **Unicité du paiement par clé seulement.** Deux appels simultanés avec des clés différentes (deux onglets) passaient tous deux le contrôle d'étape. Désormais : prise atomique de l'étape par réservation (mise à jour conditionnelle `step = payment` et statut payable, dans une transaction avec l'enregistrement de la tentative ; annulée si la clé a déjà servi) ; index unique partiel `payments_active_booking` (un seul paiement non refusé par réservation), migration `drizzle/0001_payments_active_booking.sql` générée par `drizzle-kit generate`. Le double clic avec la même clé renvoie toujours le résultat existant. Tests : 3 clés simultanées => 1 paiement, 1 réservation fournisseur ; nouvelle soumission de chaque clé => toujours 1 paiement ; contrainte en base (tous les statuts actifs refusés, refus multiples acceptés) ; clé déjà enregistrée sans paiement => prise annulée, dossier non bloqué (test vérifié par mutation : il échoue si la transaction n'est pas annulée).
3. **Échéance du devis non revérifiée au paiement.** Désormais un devis échu (ou marqué expiré) est refusé avant tout encaissement, comme à la validation : devis marqué « expiré », dossier ramené à l'étape « vérification » (actualisation proposée, voyageurs conservés), rien n'est débité. Tests : devis échu pendant l'étape de paiement => 0 paiement, actualisation puis paiement réussi ; paiement refusé puis devis échu => nouvelle tentative refusée.

Contrôle supplémentaire : la migration 0001 a été appliquée à une **copie** de la base locale `.data/pglite` (index créé, aucune réservation existante avec deux paiements actifs) ; la base locale elle-même n'a pas été modifiée et recevra la migration au prochain démarrage du serveur.

### Tests métier (Vitest)

- Argent : entiers, arrondi des ratios, refus des devises mélangées, devises sans décimales (ISK, JPY), formatage français exact.
- Dates : nuits à travers les changements d'heure (29 mars et 25 octobre 2026), année bissextile, heure locale inexistante / ambiguë, durée Paris → Reykjavik entre fuseaux, changement de jour, âge au 29 février.
- Fournisseurs DEMO : déterminisme, régénération depuis la référence, total = somme des lignes et des passagers, billets séparés signalés, arrivée tardive à Keflavík, aucune offre hors couverture, filtres et tris ; hôtels nuit par nuit, échéance d'annulation avec fuseau, taxes inconnues, occupation compatible ; voitures : jours de location avec tolérance, agence fermée + correction proposée non appliquée, dépôt / franchise / jeune conducteur.
- Validation des recherches : dates impossibles, retour avant aller, bébés > adultes, départ = arrivée, dates passées ou trop lointaines.
- Planificateur : voiture avant l'atterrissage + marge, agence fermée (bloquant), voiture rendue trop tard, arrivée nocturne et nuitée décalée, nuits sans hébergement, chevauchements, budget (sur place et dépôts séparés), invalidation des devis hors dates.
- Voyageurs : enfant ayant 12 ans avant le retour, bébé ayant 2 ans avant le retour, âge du conducteur différent de la recherche.
- Total serveur avec options par jour, refus d'options inconnues ou de quantités hors limites.
- **Intégration du tunnel** (base PGlite temporaire, horloge contrôlée) : parcours nominal ; double soumission simultanée du paiement => un seul paiement ; paiements simultanés avec des clés différentes => un seul paiement par réservation ; index unique « un paiement actif par réservation » ; devis échu au moment du paiement => aucun encaissement, actualisation ; rechargement => aucun second paiement ; une seule tentative fournisseur ; émission différée des billets ; email de confirmation unique ; événement de paiement reçu deux fois => un seul effet, événement en retard ignoré, signature invalide refusée ; prix modifié => nouveau devis + acceptation obligatoire ; devis expiré => actualisation en conservant les voyageurs ; paiement refusé => rien transmis, nouvelle tentative possible ; paiement réussi + réservation refusée => incident, remboursement demandé puis confirmé par événement ; délai dépassé => statut inconnu puis réconciliation sans seconde réservation ; annulation avec frais (frais modifiés => refus) ; accès refusé à un autre utilisateur et à un visiteur sans jeton ; lien invité et rattachement par possession du lien.

### Parcours (Playwright)

Inscription → email capturé → lien de vérification → session → déconnexion → `/compte` redirigé → reconnexion ; connexion refusée avant vérification. Voyage de démonstration retrouvé après rechargement avec alertes. Brouillon anonyme conservé après rechargement puis rattaché au compte. Tunnel complet via l'interface avec double clic sur « Payer », statuts séparés, billets émis, récapitulatif ; la réservation renvoie **404** à un autre utilisateur. Prix modifié avec acceptation. Paiement réussi + réservation refusée jusqu'au remboursement confirmé. `/admin` refusé à un voyageur. Pages principales 200 avec un seul H1 ; tous les liens internes de l'accueil aboutissent ; 404 explicite. **Aucun débordement horizontal à 375, 768 et 1440 px** (accueil, destination, hôtels, planificateur, crédits). Menu mobile en dialogue fermé par Échap avec retour du focus ; onglets aux flèches. Mouvement réduit : contenu visible. Images bloquées : titre et liens présents. Sans JavaScript : sections lisibles. `robots.txt` en `Disallow: /` (démo). Vols : filtre direct, détail, retour arrière avec critères et filtres conservés ; validation client (retour avant aller) et serveur (400) ; états « aucune offre » et « fournisseur indisponible » sans résultat de remplacement. Hôtels : prix par nuit, plan chargé à la demande, échéance d'annulation avec fuseau, choix d'un tarif. Voitures : agence fermée à 23 h 55, correction proposée appliquée seulement au clic.

## Mesures de performance

Serveur de production local (`next start`), tailles **transférées compressées (gzip)** mesurées avec curl :

| Page | HTML | JavaScript initial |
| --- | --- | --- |
| `/` | 22 Ko | **191 Ko** (13 fichiers, framework inclus) — budget 200 Ko respecté |
| `/destinations/lisbonne` | 14 Ko | 197 Ko |
| `/vols?…` (résultats) | 12 Ko | 208 Ko |
| `/connexion` | 10 Ko | 199 Ko |

Image LCP de l'accueil (AVIF qualité 70) : 25 Ko à 828 px (mobile), 102 Ko à 1920 px — sous le budget de 250 Ko. Cartes : 19–30 Ko.

**Problème corrigé** : première mesure de l'accueil à 290 Ko de JavaScript. Corrections : Motion retiré de l'accueil (transition CSS pour les ambiances, −50 Ko), validation Zod chargée au moment de la soumission (−38 Ko), formulaires Vols / Hôtels / Voitures chargés à l'ouverture de leur onglet.

Non mesuré : LCP / INP / CLS terrain (aucun trafic réel ; un score de laboratoire ne les prouverait pas), rendu sous limitation réseau/CPU mobile, Lighthouse.

## Inspection visuelle

Navigateur intégré, serveur de production local : accueil en 375 px (hero, bannière cookies, moteur à onglets) et 1440 px ; résultats de vols en 375 px ; carnet « Islande : arrivée tardive » (alertes bloquante / attention / information) ; page destination Reykjavik. Corrections issues de l'inspection : cadrage du hero mobile, filtres repliés par défaut sur mobile, double point après une abréviation de mois dans les alertes.

## Problèmes trouvés et corrigés pendant la validation

- Fonctions importées depuis un module client utilisées côté serveur (résumés de voyageurs, libellés d'énergie) : déplacées dans des modules partagés.
- Limitation de débit de Better Auth déclenchée par les connexions successives des tests (message « Trop de tentatives » correctement affiché) : variable `NOMADIA_AUTH_RATE_LIMIT=off` réservée aux tests, refusée en production.
- Lien de vérification envoyé lors d'une connexion non vérifiée redirigeait vers `/` : la destination de retour est désormais transmise.
- Scénario « prix modifié » réinitialisé à la seconde validation : le scénario choisi est conservé.
- Lien de source météo grecque en erreur : remplacé par l'URL vérifiée.
- Revue indépendante des paiements : secret de webhook de repli fixe, unicité du paiement par clé seulement, échéance du devis non revérifiée au paiement (détail dans la section « Durcissement des paiements »).

## Limites restantes / à vérifier

- Adaptateur Duffel et chemin PostgreSQL (`DATABASE_URL`) écrits mais non testés (ni jeton, ni serveur PostgreSQL disponibles). Cela inclut la prise atomique de l'étape de paiement (transaction) et l'index partiel, vérifiés uniquement sur PGlite.
- Paiement : une tentative interrompue entre la prise de l'étape et la création du paiement (arrêt du processus) laisse le dossier « paiement en cours » sans paiement ; aucune réconciliation automatique (comportement antérieur, inchangé). La validation de l'authentification bancaire (3-D Secure simulé) ne revérifie pas l'échéance du devis : le paiement a été créé pendant sa validité.
- `npx vitest run` affiche un avertissement Vite préexistant (`__dirname` dans `vitest.config.mts`, chargeur de configuration natif à venir) ; sans effet sur les résultats.
- Pas de test sur Firefox/WebKit ni sur appareil mobile réel ; lecteurs d'écran non testés (contrôles ARIA vérifiés par les tests et le code).
- Pas d'audit Lighthouse ni de mesure sous limitation mobile.
- Le dossier PGlite n'accepte qu'un processus : ne pas lancer `db:seed` pendant que le serveur tourne.
- Avertissement npm : ESLint 9.39 est marqué « plus maintenu » ; ESLint 10 n'est pas encore accepté par `eslint-plugin-react` (dépendance de `eslint-config-next`).
