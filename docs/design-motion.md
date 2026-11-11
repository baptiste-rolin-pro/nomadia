# Direction artistique et animation

## Intention

Un magazine de voyage interactif : grandes photographies, compositions aérées, typographie expressive. La photographie porte l'immersion ; les écrans de recherche et de paiement sont plus sobres pour faciliter la décision.

## Tokens (`src/app/globals.css`)

| Famille | Valeurs |
| --- | --- |
| Couleurs | ivoire `#F6F3EC` (fond), encre `#142B2A` (texte), vert profond `#174B45` (actions), terre cuite `#B84932` (accents limités, focus), blanc (surfaces transactionnelles), ivoire foncé, sable, ligne ; états succès / attention / danger avec fonds doux |
| Typographie | Fraunces (serif expressive, titres) + Instrument Sans (texte, formulaires, prix), via `next/font` (auto-hébergées, WOFF2, `display: swap`, sous-ensemble latin) |
| Tailles fluides | `text-display`, `text-title`, `text-heading`, `text-lead` (clamp) |
| Espacements | `section` (clamp 4–8,5 rem), `gutter` |
| Rayons | 4 / 8 / 14 / 22 px |
| Ombres | `card`, `panel` (légères) |
| z-index | `--z-header` 40, `--z-overlay` 50, `--z-modal` 60, `--z-toast` 70 (les `<dialog>` modaux passent dans la couche supérieure native) |
| Durées | micro 160 ms, révélation 520 ms ; courbes `--ease-out-soft` (interface) et `--ease-enter` (entrées qui se posent, sans dépassement) |

Contrastes calculés (WCAG 2.2) : encre sur ivoire ≈ 13:1 ; vert sur blanc ≈ 9,9:1 ; terre cuite sur ivoire ≈ 4,7:1 (réservée aux accents et petits titres en gras) ; texte secondaire `#46595A` sur ivoire ≈ 6,7:1 ; attention `#85560A` sur blanc ≈ 6,3:1 (≈ 5,6:1 sur son fond doux). Le texte sur photographie est posé sur un voile dégradé fonctionnel.

## Composants

`components/ui` : boutons (5 variantes), badges, notices, fil d'Ariane, état vide, carte, champs avec libellé visible et erreurs reliées (`aria-describedby`). Icônes : une seule bibliothèque (lucide-react).

Composants interactifs accessibles : combobox de lieux (ARIA 1.2, `aria-activedescendant`), onglets (flèches, Début/Fin, tabindex itinérant), groupe radio des ambiances, sélecteurs de voyageurs (divulgation, Échap, retour du focus), menu mobile en `<dialog>` natif (focus piégé, Échap), bannière cookies (refuser aussi simple qu'accepter), filtres repliables, plan schématique chargé à la demande avec liste équivalente.

Ajouts (passe « accueil immersif ») :

- **Fenêtre « À propos de la démo »** (`components/layout/demo-notice*.tsx`, état dans `lib/demo-notice.ts`) : remplace le bandeau de démonstration. `<dialog>` modal natif, `aria-labelledby` (titre) et `aria-describedby` (introduction), Tab / Maj+Tab bouclent dans la fenêtre, Échap, bouton « Fermer », « Explorer la démo » ou clic hors de la fenêtre la ferment, le focus revient au bouton qui l'a ouverte. Affichée à la première visite, fermeture mémorisée par navigateur (`localStorage`, clé `nomadia:demo-notice`, lecture et écriture sous `try/catch` ; stockage bloqué : mémorisée en mémoire jusqu'au prochain chargement complet). Réouverture : bouton « Démo » de l'en-tête, « À propos de la démo » du pied de page. La bannière cookies attend sa fermeture (jamais les deux à la fois). Fragment chargé seulement à l'ouverture (≈ 3,2 Ko gz). Les avertissements de formulaire (étape voyageurs, `/connexion`) restent.
- **Chargement « avion »** (`components/ui/plane-loader.tsx`, motif `components/ui/flight-path.tsx`) : avion qui suit un trajet en pointillés (`offset-path`, CSS seul), `role="status"` et libellé français. Utilisé par les `loading.tsx` de `/vols`, `/hotels`, `/voitures`, `/voyage` (transitions de route) et au premier chargement des résultats (décoratif là, le statut des résultats annonce déjà la recherche). Aucune durée minimale, apparition après 150 ms seulement (pas de clignotement), aucun écran d'accueil bloquant.
- **Suggestions** (`lib/search/suggestions.ts`, `components/search/suggestion-grid.tsx`) : six cartes-liens par page sur `/vols`, `/hotels`, `/voitures` (trajets couverts par les offres de démonstration, datés depuis aujourd'hui et selon les saisons des fiches) et `/voyage/nouveau` (idées sur les douze destinations, formulaire prérempli par l'URL, confirmation « Idée appliquée »). Vrais liens, clavier natif.
- **Itinéraires de l'accueil** (`components/home/route-explorer.tsx`) : trois villes au départ de Paris ; choisir une ville (boutons `aria-pressed`, puces au-dessus de la photo sur petit écran) change la photo et le billet, qui ouvre vols, hébergements et voiture aux mêmes dates.

Les sections n'ont pas toutes la même structure : hero plein cadre, moteur flottant, mosaïque asymétrique (12 colonnes), itinéraires (liste + photo et billet), bande ambiance sur fond ivoire foncé, double colonne texte + carnet interactif, cartes guides, FAQ en accordéons.

## Partition d'animation

| Zone | Effet | Technique | Limite |
| --- | --- | --- | --- |
| Hero | Entrée unique : la photo se pose (1,06 → 1, 1,6 s, jamais masquée), le titre monte mot à mot hors de masques (760 ms, 45 ms entre les mots), puis texte (380 ms), moteur de recherche (440 ms) et crédit (520 ms) en fondu + 12 px ; léger mouvement du paysage au défilement | CSS `@keyframes` (aucun JavaScript) ; parallaxe via `animation-timeline: scroll()` | Contenu rendu côté serveur, titre lisible en ≈ 1,1 s ; parallaxe sur la photo seulement, ≥ 1024 px, désactivée si mouvement réduit ou non supportée |
| Sections éditoriales | Révélation une fois par bloc au défilement (opacité + 18 px, 520 ms) | IntersectionObserver + classes CSS | Invisible seulement si JS actif (`html.js`) ; repli CSS à 2,5 s tant que le script n'a pas pris la main (`html.reveal-ready`) ; script arrivé après 2,3 s, sans JS ou mouvement réduit : tout visible |
| Cartes destination et suggestions | Élévation 2 px, zoom photo 3 % (600 ms), pastille flèche qui se place | CSS `transform` dans un cadre `overflow-hidden` | Survol avec pointeur fin uniquement ; même état au focus clavier ; pastille toujours visible au toucher |
| Itinéraires (moment de la page) | Fondu croisé des photos (600 ms) ; l'avion du billet vole une fois (1,7 s) à l'entrée du bloc puis à chaque changement de ville | CSS (`offset-path`, `animation-play-state` suspendu tant que le bloc n'est pas révélé) | Mouvement réduit ou sans JS : avion posé à l'arrivée |
| Chargement | Avion en boucle (2,4 s) et pointillés qui défilent | CSS (`offset-path`) | Apparaît après 150 ms, aucune durée minimale ; mouvement réduit : avion immobile au milieu du trajet |
| Fenêtre de démonstration | Fondu + 10 px à l'ouverture (340 ms), un vol de l'avion dans l'en-tête (≥ 640 px) | CSS | Mouvement réduit : apparition immédiate |
| Ambiances | Fondu + translation de 12 px (320 ms) au changement | CSS (clé React) | État actif lisible (`aria-checked`), clavier conservé |
| Planificateur | Insertion / retrait / réorganisation fluides | Motion (`LazyMotion` + `domMax`, `layout`) | `MotionConfig reducedMotion="user"` ; ordre DOM = ordre logique |
| Formulaires | Retour visuel de focus et d'erreur (160 ms) | CSS | Aucune animation ne retarde la saisie |
| Statut de réservation | Actualisation douce par rafraîchissement serveur | `router.refresh()` à intervalle croissant | Suspendu quand l'onglet est masqué |

Règles globales : `prefers-reduced-motion` réduit toutes les animations et transitions à 1 ms ; pas de scroll hijacking, pas de son, pas de curseur personnalisé, pas de carrousel automatique. Aucune vidéo n'est utilisée (photographie par défaut sur tous les appareils). Pas de scène 3D.

Motion n'est chargé que sur les pages du planificateur, pour respecter le budget JavaScript de l'accueil (voir validation.md) : toutes les animations de l'accueil, du chargement et de la fenêtre de démonstration sont en CSS (zéro JavaScript d'animation). Le client d'authentification de l'en-tête est chargé après l'hydratation (`components/layout/session-bridge.tsx`). Mesure après build (2026-11-11) : JavaScript initial de l'accueil **194,5 Ko gz** (contre 204,0 Ko avant cette passe, même méthode).

Compétence `design-taste-frontend` : ses règles de mouvement ont été suivies là où elles ne contredisent pas la demande (entrée du hero une seule fois, couche de survol 2 px / 1,03, un moment par page, rien de caché en mouvement réduit, pas de bascule 3D ni de carrousel). Écarts assumés, demandés explicitement : un chargement « avion » (la compétence proscrit les écrans de chargement : ici il ne bloque jamais et n'a pas de durée minimale) et les révélations au défilement existantes. Son kit (palettes tirées au sort, gabarits statiques, `gate.mjs`) n'a pas été appliqué : il remplacerait les tokens et la direction éditoriale du projet.
