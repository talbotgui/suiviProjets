# Charte d'ergonomie

## Sommaire

1. [Principes d'interaction communs](#principes-dinteraction-communs)
2. [Composants d'interface réutilisables](#composants-dinterface-réutilisables)
3. [Messages utilisateurs](#messages-utilisateurs)
4. [Rappel des exigences d'accessibilité](#rappel-des-exigences-daccessibilité)

## Principes d'interaction communs

- La navigation repose sur un shell persistant (sidebar + barre supérieure, cf. [arborescence et navigation](./08_arborescenceNavigation.md)) : l'utilisateur sait à tout instant où il se trouve et comment revenir en arrière.
- Un signal de sécurité (membre inconnu) est toujours visible en priorité sur tout autre signal, quel que soit l'écran consulté (cf. [RG-009](./05_reglesGestion.md#membres-et-sécurité-des-accès)) : il n'est jamais masqué par un filtre ou un tri.
- Le jugement affiché (statuts, seuils, badges) est toujours présenté comme calculé à partir de constats et de référentiels courants, jamais comme une valeur figée : l'interface donne accès, en un clic, à l'explication du calcul (seuil appliqué, référentiel utilisé) plutôt que d'afficher un verdict opaque.
- Le statut de sauvegarde du fichier de données est visible en permanence dans la barre supérieure, pour que l'utilisateur sache toujours si ses modifications sont persistées.
- Toute action destructive ou irréversible (suppression, rejet d'un brouillon, purge d'audits, écrasement à l'import) fait l'objet d'une confirmation explicite rappelant la conséquence concrète.
- L'ensemble de l'application est utilisable au clavier, sans dépendre de la souris, avec un ordre de tabulation cohérent avec l'ordre de lecture visuel.
- La densité d'information privilégie les tableaux pour les listes volumineuses (synthèse, liste de travail) et les cartes pour les regroupements synthétiques (accueil, en-tête de fiche projet), avec une typographie dédiée aux valeurs brutes (police à chasse fixe) distincte du texte courant.

## Composants d'interface réutilisables

| composant | comportement attendu |
|---|---|
| Carte | Regroupement visuel à coins arrondis, utilisé pour les actions principales et les blocs de synthèse ; met en avant un contenu sans nécessiter de défilement interne |
| Badge / pastille | Forme pilule associant une couleur sémantique et un libellé textuel explicite ; jamais de couleur seule porteuse de sens (cf. [RNF-020](./07_exigencesNonFonctionnelles.md#accessibilité)) |
| Bandeau d'alerte pleine largeur | Utilisé exclusivement pour les signaux prioritaires (membre inconnu) ; reste visible au-dessus du contenu qu'il concerne, y compris après filtrage |
| Tableau dense | Première colonne fixe au défilement horizontal, en-têtes explicites, tri et filtres accessibles au clavier, ligne activable pour naviguer vers le détail |
| Barre de progression | Utilisée pour les campagnes d'audit en cours ; toujours accompagnée d'un texte explicite (compteur, estimation), jamais de la seule barre visuelle |
| Graphique d'évolution | Zoom temporel, séries activables/désactivables individuellement, annotations et changements de seuils affichés en lignes verticales étiquetées |
| Modale de confirmation | Rappelle explicitement l'action et sa conséquence, bouton de validation jamais pré-sélectionné par défaut pour une action destructive |
| Indicateur de sauvegarde | Affichage discret et permanent dans la barre supérieure, sans notification intrusive pour une sauvegarde réussie |
| Recherche globale | Superposition modale ouverte par raccourci clavier, résultats groupés par nature, fermeture par Échap |

## Messages utilisateurs

- Une anomalie technique (échec d'audit, instance injoignable) est présentée avec sa catégorie typée, un message technique repliable et une action suggérée en langage clair, distincte d'un message de validation métier (cf. [RG-021](./05_reglesGestion.md#audits-et-campagnes)).
- Une erreur de saisie ou de validation métier (mot de passe incorrect, doublon de règle de membre) est signalée au plus près du champ concerné, avec un message explicite sur la correction attendue.
- Une confirmation de succès (sauvegarde, intégration du brouillon, qualification d'un membre) reste discrète et n'interrompt jamais le flux de travail par une fenêtre modale, sauf lorsqu'elle porte sur une action destructive.
- Le ton des messages est professionnel et neutre, cohérent avec le registre retenu à l'étape 1, sans familiarité ni humour.

## Rappel des exigences d'accessibilité

Les exigences d'accessibilité définies à l'étape 4 ([RNF-019](./07_exigencesNonFonctionnelles.md#accessibilité), [RNF-020](./07_exigencesNonFonctionnelles.md#accessibilité)) se traduisent dans les principes d'ergonomie suivants :
- tous les textes, badges et éléments d'interface respectent les contrastes minimaux du niveau WCAG 2.1 AA ;
- chaque composant interactif dispose d'un état de focus visible et est atteignable au clavier dans un ordre de tabulation cohérent ;
- tout code de couleur porteur de sens (seuils, alerte membre inconnu, statuts) est systématiquement doublé d'un libellé textuel ou d'un pictogramme ;
- la structure de chaque écran repose sur une hiérarchie de titres sémantique et des tableaux avec en-têtes explicites, compatibles avec les technologies d'assistance.
