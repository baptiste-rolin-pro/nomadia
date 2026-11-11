# Validation

Toutes les vérifications ci-dessous ont été **réellement exécutées** le 2026-11-09 sur Windows 11, Node.js 26.13, npm 11.20, Chromium (Playwright 1.65). Rien n'est déclaré réussi sans exécution.

Dernière passe : **hero vidéo, écran d'accueil « avion », moteur remonté** (2026-11-11, branche `feat/hero-video`, section dédiée ci-dessous). Le tableau « Résultats » date de la passe « préparation Vercel » (2026-11-10) ; les trois dernières lignes datent de la passe initiale et n'ont pas été relancées.

## Hero vidéo, écran d'accueil, moteur remonté (2026-11-11)

Exécuté sur Windows 11, Node.js 26.13, Chromium (Playwright 1.65), après arrêt de tout serveur (aucun processus sur `.data/pglite`, aucun port 3000 / 3005 / 3100 / 3101 occupé avant et après).

| Vérification | Commande | Résultat |
| --- | --- | --- |
| Types | `npx tsc --noEmit` | OK, code de sortie 0 |
| Lint | `npx eslint .` | OK, 0 erreur, 0 avertissement |
| Tests unitaires | `npx vitest run` | **107/107** (11 fichiers ; +22 : `tests/unit/intro-loader.test.ts`, script en ligne exécuté avec un document simulé et une horloge contrôlée — durée minimale, plafond, `load` déjà passé, Échap / clic / molette / toucher, déjà vu, mouvement réduit, onglet masqué, stockage bloqué ou en lecture seule, version sérialisée ; `tests/unit/hero-video.test.ts`, règles de lecture, choix du fichier, présence et poids des fichiers livrés, crédit) |
| Build | `npx next build` | OK, 59 pages, aucun avertissement |
| Parcours | `npx playwright test` | **50/50** en 2,7 min (+12). `intro-loader.spec.ts` : première visite (écran au-dessus d'une page rendue, ni fenêtre ni bannière dessus, fin entre 1,5 et 3,6 s, puis fenêtre de démonstration, puis bannière cookies, LCP = affiche, ni au rechargement ni sur `/vols` dans la même session) ; mouvement réduit (aucun écran) ; Échap et clic (fermé avant la durée minimale, page dessous non activée) ; sessionStorage bloqué (aucun écran, aucune erreur). `hero.spec.ts` : ordinateur (source posée après `load`, lecture muette en boucle, pause / lecture du bouton avec arrêt des animations CSS, pause hors écran et onglet masqué) ; économiseur de données ; mouvement réduit ; mobile et tablette tactiles (aucune requête vidéo, bouton pause du décor) ; moteur dans la première vue à 1440 × 900, 768 × 1024, 375 × 812 sans chevauchement, trajet animé sans recouvrir de texte. Sans JavaScript (`navigation.spec.ts`) : ni écran ni vidéo ni bouton, titre visible. |

**Tests existants non ralentis** : les parcours importent désormais `test` de `tests/e2e/fixtures.ts`, qui marque l'écran d'accueil comme déjà vu dans chaque contexte (sessionStorage, que `storageState` ne couvre pas). Durée cumulée des 38 parcours existants : 95,1 s, contre 97,0 s lors de la passe précédente.

**Poids** (`next start` local, octets transférés) :

| Ressource | Mesure |
| --- | --- |
| JavaScript initial de l'accueil (gzip, 12 fichiers, même méthode qu'avant : HTML puis chaque `<script src>` avec `Accept-Encoding: gzip`) | **195,9 Ko** (200 565 octets) ; 194,5 Ko avant la passe — budget ~200 Ko respecté |
| HTML de l'accueil (gzip) | 25,7 Ko (dont l'écran d'accueil, le script en ligne ≈ 1 Ko et le trajet animé) |
| Affiche (image LCP), `/_next/image` qualité 70 | AVIF 11,0 / 18,5 / 39,5 / 57,4 / 78,2 Ko en 640 / 828 / 1280 / 1600 / 1920 px ; WebP 22,0 → 135,4 Ko ; JPEG 22,8 → 171,7 Ko ; source JPEG 219,6 Ko |
| Vidéo (ordinateur seulement, après `load`) | WebM 1080p 2 878 931 o ; MP4 1080p 2 766 106 o ; WebM 720p 1 635 057 o ; MP4 720p 1 846 853 o. Un seul fichier téléchargé par visite (Chromium : WebM 1080p à 1440 px) ; 0 octet sur mobile, tablette, mouvement réduit, économiseur de données, sans JavaScript |

**LCP** (Chromium sans interface, 1440 × 900, écran d'accueil affiché) : élément = affiche du hero (`<img>` AVIF 1600 px), à 0,40–0,51 s sur trois mesures ; premier rendu (écran d'accueil et page dessous) à 0,28–0,40 s. L'écran d'accueil n'est jamais retenu comme LCP (fond uni et petit texte). Chronologie mesurée : écran posé à 0,1 s, `load` à 0,5 s, fondu à 1,5 s, fin à 1,93 s, fenêtre de démonstration à 2,26 s, bannière cookies après sa fermeture.

**Lecture des fichiers** : les quatre variantes lues en boucle dans Edge (H.264 et VP9) : 1920 × 1080 ou 1280 × 720, 8 s, 229 images en 9 s, aucune donnée audio décodée.

**Contraste du hero** : texte masqué, capture, luminance du pixel le plus clair sous chaque ligne de texte, comparée au blanc ; sur ordinateur, cinq images de la vidéo (0, 2, 4, 6, 7,5 s), ailleurs l'affiche. Minimums : titre 4,77:1 (1440 px), 5,17:1 (768 px), 5,39:1 (375 px) ; surtitre 5,05:1 ; texte d'introduction 6,13:1 ; crédit 6,99:1 ; logo et liens de l'en-tête 5,80:1. Une première version du voile donnait 3,9:1 pour le surtitre : voile renforcé et surtitre en blanc pur.

**Inspection visuelle** (navigateur intégré, `next start`, 375 / 768 / 1440 px) : écran d'accueil, vidéo en lecture (WebM 1080p à 1440 px, aucune source à 768 et 375 px), position du moteur (mesures ci-dessus), ordre écran → fenêtre de démonstration → bannière cookies, absence de débordement horizontal. Le panneau du navigateur intégré était masqué pendant une partie de l'inspection : ses captures montraient alors des images en retard ; les états ont été confirmés par lecture du DOM et par des captures Chromium sans interface (écran d'accueil, fondu, fenêtre, mouvement réduit à 1440 et 375 px — le navigateur intégré n'émule pas le mouvement réduit).

**Non vérifié** : Safari / Firefox (choix et lecture de la vidéo dans la page, `offset-path`, `animation-timeline`), appareils mobiles réels, lecteur d'écran, mesures terrain (LCP / INP / CLS) et sous limitation réseau, comportement de la vidéo sur Vercel (en-têtes de cache des fichiers de `public/videos`, servis ici avec `Cache-Control: public, max-age=0`).

## Résultats

| Vérification | Commande | Résultat |
| --- | --- | --- |
| Types | `npx tsc --noEmit` | OK, 0 erreur, code de sortie 0 (TypeScript 5.9, `strict` + `noUncheckedIndexedAccess`) |
| Lint | `npx eslint .` | OK, 0 erreur, 0 avertissement, code de sortie 0 |
| Tests métier et intégration | `npx vitest run` | **73/73** (7 fichiers), code de sortie 0 (passe précédente : 56/56) |
| Build de production | `npx next build` | OK, 59 pages générées (`/contact` devient dynamique), aucun avertissement, code de sortie 0 |
| Parcours | `npx playwright test` | **29/29** (1,1 min) sur deux serveurs (28 « demo-publique » + 1 « inscription-ouverte »), code de sortie 0 (passe précédente : 24/24) |
| Serveur de développement | `npx next dev` + requêtes HTTP | Passe initiale : 200 sur `/`, `/destinations/rome`, `/api/auth/get-session` (accès base), `/voyage/nouveau`, `/api/search/hotels`, `/dev/boite-mail` |
| Base locale | `npm run db:reset` | Passe initiale : migrations + seed OK (2 comptes, 3 voyages de référence) |
| Liens externes | `npm run links:check` | Passe initiale : 68 liens, **0 en erreur** ; 15 réponses 403 de protections anti-robot (sites de compagnies/loueurs, capetown.travel, visitnorway.com) à contrôler manuellement dans un navigateur |

## Préparation Vercel + Neon, démonstration publique sans donnée personnelle (2026-11-10)

- **Tests unitaires ajoutés** : `tests/unit/public-demo.test.ts` (11 tests : inscription fermée par défaut ; garde-fous Vercel `BETTER_AUTH_SECRET` / `DATABASE_URL` / boîte mail / limitation de débit ; URL publique par défaut ; adresses fictives ; chaîne PostgreSQL `verify-full` et identifiants préservés ; inscription refusée en HTTP (404) et par `auth.api` (403) sans écriture ; réinitialisation, renvoi de vérification refusés sans email capturé ; connexion du compte de démonstration avec session sans IP ni user-agent ; changement de mot de passe / email / nom, suppression, sessions refusés ; contact refusé sans écriture ; inscription et réinitialisation acceptées avec `NOMADIA_PUBLIC_SIGNUP=true`) et `tests/unit/jobs-serverless.test.ts` (6 tests : email réel refusé, aucun voyageur enregistré ; tunnel jusqu'à l'émission par consultations successives ; tâche abandonnée reprise après le bail et une seule fois sous concurrence ; échec définitif après 5 tentatives ; traitement fournisseur interrompu => inconnu => réconciliation sans seconde réservation ; `/api/jobs/run` 401 / GET `CRON_SECRET` / POST jeton).
- **Parcours ajoutés** : `tests/e2e/public-demo.spec.ts` (5 tests sur la configuration Vercel : avertissements, identifiants affichés et utilisables, pages fermées, API fermées, profil et contact fermés, réservation complète avec email réel refusé puis adresse fictive) ; le parcours d'inscription est déplacé dans `tests/e2e/signup-open.spec.ts` (serveur `NOMADIA_PUBLIC_SIGNUP=true`).
- **Scripts** sur une base PGlite jetable : `db:migrate` puis `db:seed` trois fois (créé ; déjà à jour ; mot de passe resynchronisé après changement de `DEMO_USER_PASSWORD`) ; `db:reset` refusé avec une URL PostgreSQL ; `db:migrate` / `db:seed` refusés sur Vercel sans base.
- **Chemin node-postgres (sans Neon)** : aucune `DATABASE_URL` dans `.env.local`, donc test Neon non exécuté. À la place, pont TCP « protocole PostgreSQL » vers PGlite (script jetable hors dépôt, sérialisation par transaction comme PgBouncer en mode transaction, sans TLS) : `db:migrate` ×2 (2 migrations, puis aucune), `db:seed` ×2 (créé puis déjà à jour) avec verrou consultatif ; `next start` avec `DATABASE_URL` : 11/11 parcours (`account-booking` + `public-demo` : connexion par compte de démonstration, tunnel complet jusqu'à « Billets émis », double clic sans double paiement, remboursement après réservation refusée). Contrôle en base : 10 sessions, 0 avec IP ou user-agent ; 0 message de contact ; 0 voyageur enregistré ; 0 email de contact non fictif ; toutes les tâches `done`.
- **Non vérifié** : Neon réel (TLS `verify-full`, PgBouncer, réveil après suspension, latence), sérialisation réelle de deux migrations simultanées (le pont partage une seule session), déploiement Vercel (build, région, Cron, variables système).

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
| `/` | 22 Ko (25,7 Ko après la passe « hero vidéo ») | **191 Ko** (13 fichiers, framework inclus) — budget 200 Ko respecté. Remesuré le 2026-11-11 (même méthode, 12 fichiers) : 204,0 Ko avant la passe « accueil immersif » (au-dessus du budget depuis la préparation Vercel), **194,5 Ko** après (client d'authentification de l'en-tête chargé après l'hydratation, animations en CSS) ; `/vols` 204,2 Ko, `/connexion` 202,2 Ko, `/voyage/nouveau` 189,4 Ko. Passe « hero vidéo » : **195,9 Ko** |
| `/destinations/lisbonne` | 14 Ko | 197 Ko |
| `/vols?…` (résultats) | 12 Ko | 208 Ko |
| `/connexion` | 10 Ko | 199 Ko |

Image LCP de l'accueil (AVIF qualité 70) : 25 Ko à 828 px (mobile), 102 Ko à 1920 px — sous le budget de 250 Ko. Cartes : 19–30 Ko. Depuis la passe « hero vidéo », l'image LCP est l'affiche de la vidéo : 18,5 Ko à 828 px, 78,2 Ko à 1920 px (AVIF).

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

- Adaptateur Duffel écrit mais non testé (aucun jeton). Chemin PostgreSQL (`DATABASE_URL`) exécuté le 2026-11-10 avec node-postgres à travers un pont local vers PGlite (migrations, seed, parcours complets) mais **jamais contre un vrai serveur PostgreSQL ni Neon** : TLS, PgBouncer, concurrence réelle entre connexions (la prise atomique de l'étape de paiement et l'index partiel n'ont été exercés que sur une session PGlite).
- Paiement : une tentative interrompue entre la prise de l'étape et la création du paiement (arrêt du processus) laisse le dossier « paiement en cours » sans paiement ; aucune réconciliation automatique (comportement antérieur, inchangé). La validation de l'authentification bancaire (3-D Secure simulé) ne revérifie pas l'échéance du devis : le paiement a été créé pendant sa validité.
- `npx vitest run` affiche un avertissement Vite préexistant (`__dirname` dans `vitest.config.mts`, chargeur de configuration natif à venir) ; sans effet sur les résultats.
- Pas de test sur Firefox/WebKit ni sur appareil mobile réel ; lecteurs d'écran non testés (contrôles ARIA vérifiés par les tests et le code).
- Pas d'audit Lighthouse ni de mesure sous limitation mobile.
- Le dossier PGlite n'accepte qu'un processus : ne pas lancer `db:seed` pendant que le serveur tourne.
- Avertissement npm : ESLint 9.39 est marqué « plus maintenu » ; ESLint 10 n'est pas encore accepté par `eslint-plugin-react` (dépendance de `eslint-config-next`).
