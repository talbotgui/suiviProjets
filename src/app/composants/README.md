# Composants réutilisables

Fichier généré avec l'assistance de l'IA (Claude Code), conformément à la mention d'origine requise par `.claude/rules/01-usage-ia-et-conventions.md`.

Ce dossier accueille les composants d'interface réutilisables, conformes à la charte d'ergonomie définie à l'étape 5 (cf. `docs/02_documentation/10_charteErgonomie.md`).

Depuis la Phase 6 (incrément 2), il porte les trois premiers composants transverses de la charte : `badge/` (pastille couleur + libellé, jamais de couleur seule porteuse de sens), `bandeau-alerte/` (bandeau pleine largeur, RG-009) et `explication-jugement/` (popover d'explication du calcul, consommant `ParametresJugementUtils`). Le gabarit `exemple-reference.component.*` reste en place à titre de modèle documenté, il n'est utilisé par aucun écran réel.

Depuis la Phase 6 (incrément 3), il porte également `shell/` (sidebar et barre supérieure communes à tous les écrans, `<router-outlet>` enfant).

Depuis la Phase 6 (incrément 4), il porte `tableau-dense/` : composant générique (première colonne fixe au défilement horizontal, tri et filtres accessibles au clavier, ligne activable, RG-013 grisage de cellule isolée), consommé par l'écran Synthèse des audits (US-015).
