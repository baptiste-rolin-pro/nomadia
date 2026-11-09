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
| z-index | `--z-header` 40, `--z-overlay` 50, `--z-modal` 60, `--z-toast` 70 |
| Durées | micro 160 ms, révélation 520 ms ; courbe `--ease-out-soft` |

Contrastes calculés (WCAG 2.2) : encre sur ivoire ≈ 13:1 ; vert sur blanc ≈ 9,9:1 ; terre cuite sur ivoire ≈ 4,7:1 (réservée aux accents et petits titres en gras) ; texte secondaire `#46595A` sur ivoire ≈ 6,7:1 ; attention `#85560A` sur blanc ≈ 6,3:1 (≈ 5,6:1 sur son fond doux). Le texte sur photographie est posé sur un voile dégradé fonctionnel.

## Composants

`components/ui` : boutons (5 variantes), badges, notices, fil d'Ariane, état vide, carte, champs avec libellé visible et erreurs reliées (`aria-describedby`). Icônes : une seule bibliothèque (lucide-react).

Composants interactifs accessibles : combobox de lieux (ARIA 1.2, `aria-activedescendant`), onglets (flèches, Début/Fin, tabindex itinérant), groupe radio des ambiances, sélecteurs de voyageurs (divulgation, Échap, retour du focus), menu mobile en `<dialog>` natif (focus piégé, Échap), bannière cookies (refuser aussi simple qu'accepter), filtres repliables, plan schématique chargé à la demande avec liste équivalente.

Les sections n'ont pas toutes la même structure : hero plein cadre, moteur flottant, mosaïque asymétrique (12 colonnes), bande ambiance sur fond ivoire foncé, double colonne texte + carnet interactif, cartes guides, FAQ en accordéons.

## Partition d'animation

| Zone | Effet | Technique | Limite |
| --- | --- | --- | --- |
| Hero | Apparition du titre (900 ms, décalages 80/160 ms) ; léger mouvement du paysage au défilement | CSS `@keyframes` ; parallaxe via `animation-timeline: scroll()` | Contenu rendu côté serveur, aucune attente ; parallaxe ≥ 1024 px, désactivée si mouvement réduit ou non supportée |
| Sections éditoriales | Révélation une fois (opacité + 18 px, 520 ms) | IntersectionObserver + classes CSS | Invisible seulement si JS actif (`html.js`) ; repli CSS à 2,5 s ; sans JS ou mouvement réduit : visible |
| Cartes destination | Zoom photo 4,5 % (700 ms) | CSS `transform` dans un cadre `overflow-hidden` | Aucun déplacement des voisines ; même effet au focus clavier |
| Ambiances | Fondu + translation de 12 px (320 ms) au changement | CSS (clé React) | État actif lisible (`aria-checked`), clavier conservé |
| Planificateur | Insertion / retrait / réorganisation fluides | Motion (`LazyMotion` + `domMax`, `layout`) | `MotionConfig reducedMotion="user"` ; ordre DOM = ordre logique |
| Formulaires | Retour visuel de focus et d'erreur (160 ms) | CSS | Aucune animation ne retarde la saisie |
| Statut de réservation | Actualisation douce par rafraîchissement serveur | `router.refresh()` à intervalle croissant | Suspendu quand l'onglet est masqué |

Règles globales : `prefers-reduced-motion` réduit toutes les animations et transitions à 1 ms ; pas de scroll hijacking, pas de son, pas de curseur personnalisé, pas de carrousel automatique. Aucune vidéo n'est utilisée (photographie par défaut sur tous les appareils). Pas de scène 3D.

Motion n'est chargé que sur les pages du planificateur, pour respecter le budget JavaScript de l'accueil (voir validation.md).
