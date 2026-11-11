# Fournisseurs

Chaque verticale possède un adaptateur et une liste de capacités (`search`, `reprice`, `book`, `retrieve`, `cancel`, `modify`, `ancillaries`, `redirect`). Le mode est lu dans la configuration serveur ; il n'est jamais modifiable par un paramètre d'URL. Un tunnel ne concerne qu'une offre d'un seul fournisseur : prestations simulées et réelles ne peuvent pas être mélangées.

| Verticale | DEMO | SANDBOX / LIVE |
| --- | --- | --- |
| Vols | Fournisseur simulé (`src/lib/providers/demo/flights.ts`) | Duffel : recherche + actualisation écrites, non testées ; réservation non activée |
| Hôtels | Fournisseur simulé (`demo/hotels.ts`) | Booking.com Demand API : non implémenté (accès partenaire requis) |
| Voitures | Fournisseur simulé (`demo/cars.ts`) | Booking.com Demand API (Cars) : non implémenté |

Un fournisseur non configuré ou indisponible renvoie une erreur explicite (`NOT_CONFIGURED`, `UNAVAILABLE`, `TIMEOUT`) affichée comme telle ; aucune offre de remplacement n'est générée.

## DEMO (actif)

- Données locales déterministes : mêmes critères => mêmes offres ; prix régénérés côté serveur depuis la référence d'offre (jamais lus depuis le navigateur).
- Couverture : vols depuis 8 aéroports français vers Lisbonne (LIS), Rome-Fiumicino (FCO) et Keflavík (KEF) ; 10 établissements fictifs à Lisbonne, Rome et Reykjavik ; 9 agences fictives (aéroports et centres-villes).
- Compagnies, loueurs, établissements, numéros de vol et références (`DEMO-XXXXXX`) fictifs et signalés comme tels.
- Scénarios : voir `src/lib/providers/scenarios.ts`.
- Capacités : `search`, `reprice`, `book`, `retrieve`, `cancel`, `ancillaries`. Pas de `modify` (affiché comme « non proposé en ligne »).

## Duffel (vols) — fiche

- Documentation consultée le **2026-11-09** : https://duffel.com/docs/api/offer-requests, https://duffel.com/docs/api/offers, https://duffel.com/docs/api/orders, https://duffel.com/docs/guides/getting-started-with-flights.
- Points d'accès vérifiés dans la documentation : `POST /air/offer_requests` (paramètres `return_offers`, `supplier_timeout`), `GET /air/offers/{id}`, `POST /air/offers/{id}/actions/price`, `POST /air/orders`, `GET /air/orders/{id}` ; en-têtes `Authorization: Bearer`, `Duffel-Version: v2`. Champs utilisés : `slices`, `segments`, `departing_at` / `arriving_at` (heure locale) + `time_zone` des aéroports, `marketing_carrier`, `operating_carrier`, `marketing_carrier_flight_number`, `total_amount`, `total_currency`, `tax_amount`, `expires_at`, `conditions.refund_before_departure` / `change_before_departure`, passagers `type: adult` ou `age`.
- Mode accessible : SANDBOX avec un jeton de test (`duffel_test_…`) après création d'un compte développeur ; LIVE selon éligibilité et validation commerciale de Duffel.
- Implémenté (`src/lib/providers/duffel.ts`) : recherche et actualisation par identifiant, conversion vers le modèle commun. **Non testé** : aucun jeton dans cet environnement.
- Non implémenté : création de commande, paiement (solde Duffel ou Duffel Payments), services additionnels (bagages, sièges), annulation/modification, webhooks. Raison : nécessite de choisir le modèle d'encaissement et de valider le cadre commercial.
- Points à vérifier avant activation : couverture des compagnies, frais Duffel, quotas, conditions de redistribution et de mise en cache des offres, ordre paiement/émission, distinction commande créée / billets émis (exposée par l'API), politique de remboursement.

## Booking.com Demand API (hôtels, voitures) — fiche

- Documentation consultée le **2026-11-09** : https://developers.booking.com/demand/docs/getting-started/overview, https://developers.booking.com/demand/docs/getting-started/try-out-the-api.
- Constat : API « Demand » version 3 couvrant hébergements, voitures, attractions (transferts en bêta) ; sandbox avec données de test ; authentification par clé d'API et en-tête `X-Affiliate-Id` ; parcours voitures décrit comme « Search, look and redirect » (recherche puis redirection) ; accès soumis à l'acceptation comme partenaire.
- Implémenté : rien au-delà du registre (le mode `sandbox`/`live` renvoie « non configuré »). **Aucun point d'accès n'a été inventé.**
- Étapes d'activation : candidature partenaire, obtention des identifiants, lecture des guides Accommodation et Cars, choix du parcours (réservation native ou redirection) selon les droits accordés, règles d'affichage des photos et avis de l'établissement, conditions de mise en cache.
- Si seule la redirection est accordée : afficher « Voir l'offre chez Booking.com », indiquer que la réservation et le paiement ont lieu chez le partenaire, ne pas créer de réservation dans l'espace client, suivre l'événement analytique `partner_redirect` (déjà prévu) et les remontées autorisées.

## Paiement

- DEMO : prestataire simulé (`src/lib/payments/demo-psp.ts`), aucun champ carte. Événements signés HMAC (`nomadia-demo-signature: t=…,v1=…`), tolérance 5 min, déduplication par identifiant d'événement, transitions monotones (un événement en retard ne fait pas reculer l'état). Webhook HTTP : `POST /api/demo/webhooks/payment`, fermé (404) si aucun service n'est en mode DEMO ou si `DEMO_WEBHOOK_SECRET` n'est pas configuré (obligatoire en production). Un seul paiement actif par réservation (prise atomique de l'étape + index unique partiel `payments_active_booking`) ; un devis échu est refusé avant tout encaissement.
- Exploitation : Stripe est une option uniquement si la plateforme est autorisée à encaisser. Privilégier l'intégration hébergée (Checkout) ou les composants officiels ; webhooks signés ; clés d'idempotence (https://docs.stripe.com/api/idempotent_requests). Ne pas créer de seconde transaction pour une offre déjà encaissée par le fournisseur. Aucune donnée carte brute dans le backend ; une garantie bancaire exigée par un hôtel sans intégration tokenisée conforme est un blocage à la réservation native.

## Emails

Adaptateur `src/lib/mail.ts`. Transport disponible : `capture` (enregistrement en base, non envoyé). Un transport réel (fournisseur d'emailing transactionnel) se branche dans `sendEmail` ; la déduplication par clé métier est déjà en place.

## Anthropic (assistant de l'accueil) — fiche

- **Usage** : interpréter une demande écrite (« Vol Paris–Rome le 12 juin, retour le 16, avec une voiture sur place ») en appels d'outils (recherche de vols / hôtels / voitures, fiche destination, voyage prérempli, question de précision). Code : `src/lib/assistant/` (route `src/app/api/assistant/route.ts`). SDK officiel `@anthropic-ai/sdk` **1.8.0** (version exacte), `client.beta.messages.create` (bêta requise par `fallbacks`).
- **Paramètres** : modèle `claude-opus-5-5` ; `output_config.effort: "low"` (tâche de routage et d'extraction courte et sensible à la latence ; la réflexion reste adaptative et ne peut pas être désactivée sur ce modèle) ; `max_tokens: 4096` (réflexion + appels d'outils) ; six outils `strict: true`, `tool_choice: auto` (le forçage d'outil est refusé par ce modèle) ; `fallbacks: "default"` avec l'en-tête bêta `server-side-fallback-2026-07-01` (en cas de refus par les classifieurs de sécurité, l'API relance la même requête sur le modèle de repli qu'elle choisit selon la catégorie, facturé à son tarif) ; délai 20 s par tentative, 1 nouvelle tentative (`maxRetries: 1`) ; `maxDuration` de la route : 60 s. Une seule requête par demande (aucune boucle : le référentiel des lieux est dans le prompt).
- **Cache** : outils (ordre figé) puis bloc système stable (consignes + référentiel des 41 lieux et 12 destinations) marqué `cache_control: ephemeral`, puis bloc variable (date du jour, horizon, premier jour des mois). Préfixe identique d'une requête à l'autre (testé) ; minimum de mise en cache de ce modèle : 512 jetons. Vérifier `usage.cache_read_input_tokens` sur des requêtes réelles (non fait : aucune clé).
- **Envoyé à Anthropic** : le texte saisi (≤ 500 caractères), et pour une réponse à une question, la demande précédente et la question (≤ 300 caractères) ; la date du jour ; le référentiel public des lieux et destinations ; les définitions d'outils. **Jamais** : adresse IP, identifiant de compte ou de session, cookies, `metadata.user_id`. Le texte n'est ni stocké ni journalisé par Nomadia (journaux : classe d'erreur du SDK, statut, type, code d'erreur, identifiant de requête).
- **Conservation chez Anthropic** (centre de confidentialité d'Anthropic, articles « How long do you store my organization's data? » et « Is my data used for model training? », consultés le 2026-11-11, page datée du 1er juillet 2026) : entrées et sorties de l'API supprimées automatiquement sous 30 jours ; jusqu'à 2 ans pour un contenu signalé par les systèmes de sécurité (scores de classification jusqu'à 7 ans) ; plus longtemps si la loi l'exige ; durée différente sous accord contractuel (par exemple zéro conservation). Produits commerciaux : pas d'entraînement sur les entrées et sorties par défaut. **À valider** : DPA, transfert hors UE (Anthropic, PBC, États-Unis), mention dans la politique de confidentialité (faite : `/confidentialite#assistant`).
- **Coûts à vérifier** (tarifs consultés le 2026-11-11 dans la documentation du SDK, à revérifier sur la page de tarifs d'Anthropic) : `claude-opus-5-5` 4 $ par million de jetons d'entrée, 20 $ par million de jetons de sortie, lectures de cache 0,20 $ ; la réflexion compte en sortie. Ordre de grandeur non mesuré (aucune clé) : quelques milliers de jetons d'entrée, dont l'essentiel en cache, et quelques centaines de jetons de sortie par demande ; plafond théorique de sortie 4 096 jetons (≈ 0,08 $). Plafonds : `NOMADIA_ASSISTANT_DAILY_LIMIT` (défaut 300 demandes / jour UTC, tous visiteurs) et `NOMADIA_ASSISTANT_IP_HOURLY_LIMIT` (défaut 20 / heure / visiteur). Un repli après refus est facturé au tarif du modèle de repli. Prévoir aussi une limite de dépense dans la Console Anthropic.
- **Limitation de débit** : compteurs en base (`assistant_rate_limits`, fenêtres fixes, `INSERT … ON CONFLICT DO UPDATE … RETURNING`), donc partagés entre instances Vercel ; adresse IP lue dans `x-forwarded-for` (réécrit par Vercel), stockée seulement sous forme d'empreinte HMAC-SHA256 (secret `BETTER_AUTH_SECRET`) ; purge des compteurs expirés au premier appel de chaque jour. Hors Vercel, l'en-tête peut être falsifié : le plafond journalier reste la borne de coût.
- **Erreurs** : erreurs typées du SDK (`AuthenticationError` / `PermissionDeniedError`, `RateLimitError`, `APIConnectionTimeoutError` → 504, `APIConnectionError`, `BadRequestError`, `InternalServerError`, `APIError`) ⇒ réponse 503 / 504 « indisponible » en français, le reste du site fonctionne. Sans `ANTHROPIC_API_KEY` : 503 sans appel ni consommation de quota ; l'onglet affiche « indisponible ». `stop_reason` `refusal` ⇒ message fixe ; `max_tokens` ⇒ 503.
- **Identifiants** : seule `ANTHROPIC_API_KEY` est lue (passée explicitement au client : un profil `ant auth` ou `ANTHROPIC_AUTH_TOKEN` présent sur le serveur n'est pas utilisé). Le SDK respecte `ANTHROPIC_BASE_URL` s'il est défini : ne pas le définir sur Vercel, sauf passerelle voulue.
- **Tests** : aucun appel réel. Vitest injecte un faux client ; Playwright utilise le mode simulé `NOMADIA_ASSISTANT_MOCK=e2e` (interdit sur Vercel et en production). **Non testé contre l'API réelle** (aucune clé ni profil `ant` dans l'environnement de développement) : qualité des appels d'outils du modèle, latence, coût réel, comportement de `fallbacks: "default"`, taux de cache.

## Activation commerciale (préalables, à faire valider)

1. Statut et obligations d'opérateur de voyages en France (immatriculation Atout France, garantie financière, assurance RC professionnelle selon l'activité) ; analyse de l'impact d'un éventuel regroupement de prestations.
2. Contrats fournisseurs (droits de vente, encaissement, redistribution des contenus).
3. Documents légaux complétés (mentions, CGU/CGV, confidentialité, médiateur).
4. Puis `NOMADIA_LIVE_SALES_APPROVED=true` et passage du mode concerné en `live`.
