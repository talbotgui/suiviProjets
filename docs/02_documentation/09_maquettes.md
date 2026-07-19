# Maquettes / wireframes

## Sommaire

1. [Conventions de description des maquettes](#conventions-de-description-des-maquettes)
2. [Maquettes par écran](#maquettes-par-écran)
3. [États particuliers](#états-particuliers)

## Conventions de description des maquettes

En l'absence d'outil graphique, chaque écran est décrit textuellement sous forme de zones (regroupements visuels : en-tête, bandeau, colonne, tableau), chaque zone précisant ses composants et les actions qu'elle rend possibles. Quatre écrans (Accueil, Synthèse des audits, Fiche projet, Tableau de bord d'exécution) disposent d'une maquette haute-fidélité de référence dans [Suivi Qualimetrie.dc.html](../01_besoin/Suivi%20Qualimetrie.dc.html) (captures dans [screenshots/](../01_besoin/screenshots/)) : leur description ci-dessous en reprend fidèlement la structure. Les autres écrans sont décrits selon la même convention et les mêmes tokens visuels (cartes à coins arrondis, badges/pastilles, codes de couleur systématiques, tableau dense pour les listes volumineuses), à détailler en maquette haute-fidélité si besoin avant la conception détaillée.

## Maquettes par écran

### Écran d'accueil

| écran | zone | composants / actions |
|---|---|---|
| Accueil | Actions principales | Deux cartes côte à côte : « Créer un nouveau fichier » (neutre) et « Charger un fichier existant » (mise en avant) |
| Accueil | Bandeau statistiques | Quatre cartes : Groupes/Projets, Dernière campagne, Membres inconnus (carte dédiée, toujours visible), Alertes actives |
| Accueil | Bandeau d'alerte membres inconnus | Bandeau pleine largeur si des membres inconnus existent, avec lien « Ouvrir la liste de travail » |
| Accueil | Alertes principales | Liste des trois alertes les plus importantes : point de couleur, libellé, groupe concerné |

### Gestion des credentials

| écran | zone | composants / actions |
|---|---|---|
| Gestion des credentials | Saisie | Formulaire multi-sources et zone de collage d'une chaîne JSON (map credentials par instance), validée par schéma |
| Gestion des credentials | Assistant de création de token | Par instance : lien direct vers la page de création de token, nom suggéré, portée minimale en lecture seule, durée de vie recommandée |
| Gestion des credentials | Test | Bouton « Tester » par credential, verdict affiché, avertissement en cas de portée excessive ; bouton « Tester toutes les instances » (test de connectivité global) |
| Gestion des credentials | Gabarit | Bouton de génération d'un gabarit JSON pré-rempli des identifiants d'instances |

### Administration

| écran | zone | composants / actions |
|---|---|---|
| Administration | Onglet Groupes | Liste des groupes, formulaire de création/modification (nom, description, instances), sous-onglets Membres connus et Annotations |
| Administration | Onglet Projets | Liste des projets du groupe sélectionné, formulaire de création/modification, action « Dupliquer », bascule Politique IA |
| Administration | Onglet Sources | Liste des sources d'un projet, formulaire de rattachement (instance, type, identifiant externe, ref auditée avec autocomplétion) |
| Administration | Suppression | Confirmation systématique rappelant la perte de l'historique d'audits associé |

### Constitution de campagne

| écran | zone | composants / actions |
|---|---|---|
| Constitution de campagne | Sélection du périmètre | Cases à cocher (tout, par groupes, manuel), raccourcis « rejouer les échecs de la dernière campagne » et « projets non audités depuis N jours » |
| Constitution de campagne | Récapitulatif | Coût prévisionnel (nombre de projets et d'instances), contrôle de présence des credentials nécessaires avec renvoi vers la saisie manquante |
| Constitution de campagne | Lancement | Bouton « Lancer la campagne », désactivé si un brouillon est en attente de traitement |

### Tableau de bord d'exécution

| écran | zone | composants / actions |
|---|---|---|
| Tableau de bord d'exécution | En-tête | Nom et heure de la campagne, compteur « X / N projets terminés », estimation de temps restant, barre de progression, bouton « Annuler la campagne » |
| Tableau de bord d'exécution | Liste des projets | Tableau à quatre colonnes (Projet, État, Connecteur/détail, Durée) ; états Terminé (nombre de résultats), Échoué (motif court, encart dépliable), En cours (connecteur actif), En attente |

### Brouillon et rapport d'anomalies

| écran | zone | composants / actions |
|---|---|---|
| Brouillon | Différentiel | Liste des projets de la campagne, indicateurs en évolution au-delà du seuil de matérialité, nouveautés remarquables, valeurs aberrantes signalées |
| Brouillon | Actions | « Intégrer tout », intégration projet par projet, ou « Rejeter » avec motif optionnel |
| Rapport d'anomalies | Liste des anomalies | Regroupées par cause commune ; par ligne : projet, source, catégorie typée, message technique repliable, action suggérée |

### Synthèse des audits

| écran | zone | composants / actions |
|---|---|---|
| Synthèse des audits | Barre de filtres | Sélecteur de groupe, sélecteur d'indicateurs, champ de recherche, compteur de projets |
| Synthèse des audits | Bandeau d'alerte | Bandeau membres inconnus, toujours au-dessus du tableau si applicable |
| Synthèse des audits | Tableau dense | Douze colonnes (Projet, Groupe, Dernier audit, Vitalité, Taille, Couverture, Notes Sonar, Violations, MR ouvertes, Membres, IA, Sonar) ; première colonne fixe au défilement horizontal ; badges « AUDIT ANCIEN » et pictogramme de campagne en échec ; ligne teintée si membre inconnu |
| Synthèse des audits | Export | Export de la vue en image PNG, alerte membre inconnu conservée |

### Synthèse graphique

| écran | zone | composants / actions |
|---|---|---|
| Synthèse graphique | Filtres | Groupe, projet, type d'indicateur |
| Synthèse graphique | Graphique | Zoom temporel, séries superposables, lignes verticales pour les annotations et les changements de seuils, signaux affichés en séries binaires |
| Synthèse graphique | Export | Export natif du graphique en image PNG |

### Fiche projet

| écran | zone | composants / actions |
|---|---|---|
| Fiche projet | En-tête | Groupe > nom du projet > description et référence auditée, badges de statut (IA, SONAR_KO, membre inconnu) |
| Fiche projet | Métadonnées | Âge chez nous, dernier audit, dernière campagne (mise en évidence si échec), taille/classe |
| Fiche projet | Anomalie technique | Encart si la dernière campagne a échoué, avec action suggérée |
| Fiche projet | Colonne gauche | Indicateurs Sonar (grisés si SONAR_KO), dépendances (référence/version/statut), merge requests ouvertes |
| Fiche projet | Colonne droite | Membres et statuts (mis en évidence si membre inconnu, lien « Qualifier ce membre »), marqueurs IA détectés, annotations et journal |
| Fiche projet | Actions | Accès à la comparaison entre deux audits, export PNG de la fiche |

### Comparaison entre deux audits

| écran | zone | composants / actions |
|---|---|---|
| Comparaison entre deux audits | Sélection | Choix de deux dates, raccourcis (dernier vs précédent, un mois, trois mois) |
| Comparaison entre deux audits | Différentiel | Quatre volets : indicateurs (avant/après/delta), dépendances, membres et contributeurs, marqueurs IA ; rappel des annotations de l'intervalle |

### Liste de travail

| écran | zone | composants / actions |
|---|---|---|
| Liste de travail | Filtres et vues | Filtres combinables, sélection ou enregistrement d'une vue nommée |
| Liste de travail | Tableau des alertes | Membres inconnus toujours en tête ; par ligne : gravité, projet, groupe, description, date de première détection, statut vu/traité avec commentaire et horodatage |

### Recherche transversale

| écran | zone | composants / actions |
|---|---|---|
| Recherche transversale | Champ de recherche | Ouverture par raccourci clavier depuis tout écran, option « inclure l'historique » |
| Recherche transversale | Résultats | Groupés par nature (dépendances, membres et contributeurs, outils IA, entités), chaque ligne menant à la fiche concernée |

### Écran de paramétrage

| écran | zone | composants / actions |
|---|---|---|
| Paramétrage | Seuils de couleur | Seuils de chaque indicateur de la synthèse et seuils spécifiques (vitalité, bornes de taille, fraîcheur Sonar, activité sans qualité, matérialité du brouillon, fraîcheur d'audit) |
| Paramétrage | Référentiels | Référentiel des dépendances (motif, versions, statut) et référentiel des marqueurs IA |
| Paramétrage | Réglages applicatifs | Délai de verrouillage, concurrence d'audit, proxy optionnel, nombre de sauvegardes de sécurité |
| Paramétrage | Accès complémentaires | Journal des modifications, purge des audits, export/import de configuration |

### Écran de verrouillage

| écran | zone | composants / actions |
|---|---|---|
| Verrouillage | Superposition plein écran | Masque toute donnée, champ de saisie du mot de passe du fichier, message rappelant que les credentials sont à resaisir |
| Verrouillage | Échecs | Compteur d'échecs de déverrouillage restants avant fermeture automatique du fichier |

## États particuliers

| écran | état particulier |
|---|---|
| Accueil | Aucun fichier récent : les deux cartes d'action restent seules, sans bandeau de résumé |
| Tableau de bord d'exécution | Campagne annulée en cours de traitement : projets non traités affichés en « ignoré », distincts des échecs |
| Brouillon | Aucun brouillon en attente : accès direct autorisé vers la constitution d'une nouvelle campagne |
| Synthèse des audits | Aucun audit intégré pour un projet : ligne grisée avec mention « jamais audité », sans seuil de couleur applicable |
| Synthèse graphique | Aucune donnée sur la période ou le filtre sélectionné : message explicite invitant à élargir le filtre |
| Fiche projet | Dernière campagne en échec : encart d'anomalie technique affiché en tête, indicateurs de la campagne précédente conservés |
| Fiche projet | SONAR_KO actif : bloc Indicateurs Sonar grisé avec légende explicative de l'écart |
| Liste de travail | Aucune alerte active : message de confirmation explicite, pas de tableau vide silencieux |
| Recherche transversale | Aucun résultat : message explicite avec suggestion d'étendre la recherche à l'historique |
| Gestion des credentials | Instance sans credential saisi : listée explicitement, jamais masquée, avec statut « — » |
| Écran de verrouillage | Dernier échec autorisé avant fermeture : avertissement explicite avant la tentative suivante |
