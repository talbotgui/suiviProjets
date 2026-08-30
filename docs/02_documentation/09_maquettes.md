# Maquettes / wireframes

## Sommaire

1. [Conventions de description des maquettes](#conventions-de-description-des-maquettes)
2. [Maquettes par écran](#maquettes-par-écran)
3. [États particuliers](#états-particuliers)

## Conventions de description des maquettes

En l'absence d'outil graphique, chaque écran est décrit textuellement sous forme de zones (regroupements visuels : en-tête, bandeau, colonne, tableau), chaque zone précisant ses composants et les actions qu'elle rend possibles. Quatre écrans (Accueil, Synthèse des audits, Fiche projet, Tableau de bord d'exécution) disposent d'une maquette haute-fidélité de référence dans [Suivi Qualimetrie.dc.html](../01_besoin/Suivi%20Qualimetrie.dc.html) (captures dans [screenshots/](../01_besoin/screenshots/)) : leur description ci-dessous en reprend fidèlement la structure. Les autres écrans sont décrits selon la même convention et les mêmes tokens visuels (cartes à coins arrondis, badges/pastilles, codes de couleur systématiques, tableau dense pour les listes volumineuses), à détailler en maquette haute-fidélité si besoin avant la conception détaillée.

## Maquettes par écran

### Barre supérieure du shell

| écran | zone | composants / actions |
|---|---|---|
| Barre supérieure | Navigation d'historique | En tête de la barre supérieure, deux boutons Reculer (`◀`) et Avancer (`▶`) parcourant l'historique de navigation interne (cf. [RG-052](./05_reglesGestion.md#navigation-transverse-et-filtrage-mutualisé)) ; chaque bouton est grisé et non actionnable quand le déplacement correspondant n'est pas possible |
| Barre supérieure | Reste de la barre | Nom du fichier chargé, statut de sauvegarde, accès à la recherche transversale, à la gestion des credentials et au verrouillage manuel (inchangé) |

### Barre de filtres commune (Synthèse des audits, Synthèse graphique, Obsolescence, Liste de travail)

Composant mutualisé unique décrit ici une fois, référencé par les quatre écrans concernés (cf. [RG-053](./05_reglesGestion.md#navigation-transverse-et-filtrage-mutualisé)).

| zone | composants / actions |
|---|---|
| Filtre groupe/projet | Un sélecteur de groupe (« Tous les groupes » plus une entrée par groupe) et un sélecteur multi-projets dont la liste est restreinte au groupe sélectionné (tous les projets si aucun groupe) ; choisir un groupe désélectionne les projets ; la sélection est partagée entre les quatre écrans et suit l'utilisateur d'un écran à l'autre |
| Sélecteur de vue | Sélection, enregistrement, mise à jour ou suppression d'une vue nommée (sélection de groupe et de projets uniquement) ; lien « Gérer les vues… » vers l'onglet « Vues enregistrées » de l'écran de Paramétrage |
| Filtres complémentaires | Rendus sous la barre commune, gérés par chaque écran (indicateur pour les deux synthèses, date et bornes min/max par catégorie pour l'Obsolescence, filtres d'alerte pour la Liste de travail) ; jamais mémorisés dans une vue, jamais partagés entre écrans |

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
| Synthèse des audits | Barre de filtres | [Barre de filtres commune](#barre-de-filtres-commune-synthèse-des-audits-synthèse-graphique-obsolescence-liste-de-travail) (filtre groupe/projet mutualisé + sélecteur de vue), puis sous elle : sélecteur d'indicateurs, champ de recherche, compteur de projets |
| Synthèse des audits | Bandeau d'alerte | Bandeau membres inconnus, toujours au-dessus du tableau si applicable |
| Synthèse des audits | Tableau dense | Treize colonnes (Projet, Groupe, Dernier audit, Vitalité, Taille, Couverture, Notes Sonar, Violations, MR ouvertes, Membres, IA, Sonar, Dépendances) ; première colonne fixe au défilement horizontal ; badges « AUDIT ANCIEN » et pictogramme de campagne en échec ; ligne teintée si membre inconnu. Colonne Dépendances ajoutée en Phase 15 (demande directe de l'utilisateur, hors périmètre initial de cette maquette) : trois compteurs (dépendances inconnues du référentiel, obsolètes, maintenues), fusionnés entre toutes les sources GitLab du projet (RG-011, cf. R15-06) |
| Synthèse des audits | Export | Export de la vue en image PNG, alerte membre inconnu conservée |

### Synthèse graphique

| écran | zone | composants / actions |
|---|---|---|
| Synthèse graphique | Filtres | [Barre de filtres commune](#barre-de-filtres-commune-synthèse-des-audits-synthèse-graphique-obsolescence-liste-de-travail) (filtre groupe/projet mutualisé + sélecteur de vue), puis sous elle : sélecteur de type d'indicateur |
| Synthèse graphique | Graphique | Zoom temporel, séries superposables (audits historiques et réguliers d'un projet fondus dans une même courbe continue, RG-046), lignes verticales pour les annotations, les changements de seuils et le repère « Début des audits réguliers » (date du plus ancien audit régulier tous projets confondus), signaux affichés en séries binaires |
| Synthèse graphique | Export | Export natif du graphique en image PNG |

### Obsolescence

Écran de pilotage dense (US-051), sans maquette haute-fidélité de référence : fond identique aux autres écrans, panneau légèrement plus foncé délimité par des filets fins, aucun effet décoratif. Chaque catégorie de dépendance du référentiel donne un indicateur ; chaque indicateur porte une teinte propre constante d'une vue à l'autre, la valeur étant encodée par la longueur d'une barre (la valeur numérique restant toujours affichée, RNF-020).

| écran | zone | composants / actions |
|---|---|---|
| Obsolescence | Entête | Titre de page, paragraphe d'introduction (largeur bornée) précisant l'échelle des indicateurs (retard en versions majeures, 0 = à jour) |
| Obsolescence | Barre de filtres | [Barre de filtres commune](#barre-de-filtres-commune-synthèse-des-audits-synthèse-graphique-obsolescence-liste-de-travail) (filtre groupe/projet mutualisé + sélecteur de vue), puis sous elle : filtre de date d'audit (dernier audit régulier à cette date ou avant, initialisé à aujourd'hui), un couple valeur min / valeur max par catégorie (minimum toujours à 0, maximum adapté à la valeur maximale de l'indicateur tous filtres ignorés), bouton d'export PNG |
| Obsolescence | Bandeau du panneau | Légende des indicateurs (pastille de teinte, libellé, médiane par catégorie sur les projets affichés), décompte total de projets à droite |
| Obsolescence | Grille de tuiles | Colonnes fluides (nombre adapté à la largeur), quadrillage continu de 1 px ; chaque tuile : nom du projet sur deux lignes à hauteur réservée, puis une ligne de mesure par catégorie (sigle de 3 lettres, barre sur rail sombre, valeur numérique alignée à droite) ; une catégorie sans dépendance concernée pour le projet n'affiche que son sigle, sans barre ni valeur, pour rendre repérables les catégories manquantes (la valeur `0`, « à jour », garde sa barre) ; survol éclaircissant le fond, infobulle native donnant le détail complet |
| Obsolescence | Détail d'un projet | Au clic sur une tuile, modale résumant le dernier audit retenu du projet : date de l'audit, tableau des dépendances (référence, catégorie, version, retard calculé), ligne Java mise en évidence ; ouverture et fermeture pilotées par un paramètre de requête de la route `/obsolescence` (l'écran reste monté sous la modale, l'ouverture est une étape d'historique, cf. [RG-052](./05_reglesGestion.md#navigation-transverse-et-filtrage-mutualisé)) ; fermeture par bouton, touche Échap ou bouton Reculer, un lien « Ouvrir la fiche projet » dans le pied de la modale |
| Obsolescence | Export | Export de la grille (bandeau inclus) en image PNG |

### Fiche projet

| écran | zone | composants / actions |
|---|---|---|
| Fiche projet | En-tête | Groupe > nom du projet > description et référence auditée, badges de statut (IA, SONAR_KO, membre inconnu) |
| Fiche projet | Métadonnées | Âge chez nous, dernier audit, dernière campagne (mise en évidence si échec), taille/classe |
| Fiche projet | Anomalie technique | Encart si la dernière campagne a échoué, avec action suggérée |
| Fiche projet | Colonne gauche | Indicateurs Sonar (grisés si SONAR_KO), dépendances (référence/version/statut), merge requests ouvertes |
| Fiche projet | Colonne droite | Membres et statuts ventilés en trois sections repliables fermées par défaut — (1) membres nominatifs directs, (2) membres des groupes invités au projet regroupés par groupe (chemin complet mentionné une fois, groupes du plus précis vers la racine), (3) membres hérités de l'arborescence — chaque barre de titre portant le décompte par statut (statuts sans membre omis) ; ligne de membre identique d'une section à l'autre (mise en évidence si membre inconnu, lien « Qualifier ce membre ») ; marqueurs IA détectés, annotations et journal |
| Fiche projet | Actions | Accès à la comparaison entre deux audits, export PNG de la fiche |

### Comparaison entre deux audits

| écran | zone | composants / actions |
|---|---|---|
| Comparaison entre deux audits | Sélection | Choix de deux dates, raccourcis (dernier vs précédent, un mois, trois mois) |
| Comparaison entre deux audits | Différentiel | Quatre volets : indicateurs (avant/après/delta), dépendances, membres et contributeurs, marqueurs IA ; rappel des annotations de l'intervalle |

### Liste de travail

| écran | zone | composants / actions |
|---|---|---|
| Liste de travail | Filtres et vues | [Barre de filtres commune](#barre-de-filtres-commune-synthèse-des-audits-synthèse-graphique-obsolescence-liste-de-travail) (filtre groupe/projet mutualisé + sélecteur de vue), puis sous elle : filtres d'alerte combinables propres à l'écran |
| Liste de travail | Onglets « À traiter » / « Traités » | Deux onglets répartissent les alertes actives (chacun affiche son nombre) : « À traiter » (actif par défaut) regroupe les alertes qui ne sont pas au statut traité (jamais vues, ou seulement vues) ; « Traités » regroupe les alertes actives déjà marquées traitées, avec la date de leur traitement, pour les consulter et les réactiver ([RG-026](./05_reglesGestion.md#vues-alertes-export-et-import)) |
| Liste de travail | Tableau des alertes | Membres inconnus toujours en tête ; par ligne : gravité, projet, groupe, description, une colonne temporelle (« Détectée depuis » dans l'onglet « À traiter », « Traitée le » dans l'onglet « Traités »), statut vu/traité avec commentaire et horodatage |
| Liste de travail | Panneau de traitement | Ouvert par activation d'une ligne ; « Marquer vue » / « Marquer traitée » (avec commentaire) dans l'onglet « À traiter », « Réactiver » (repasse l'alerte au statut vu, elle revient dans l'onglet « À traiter ») dans l'onglet « Traités » ; chaque action redemande le mot de passe du fichier ([RG-002](./05_reglesGestion.md#stockage-et-confidentialité-des-données)) ; accès à la Fiche projet et, pour un membre inconnu, bouton « Qualifier ce membre » |

### Recherche transversale

| écran | zone | composants / actions |
|---|---|---|
| Recherche transversale | Champ de recherche | Ouverture par raccourci clavier depuis tout écran, option « inclure l'historique » |
| Recherche transversale | Résultats | Groupés par nature (dépendances, membres et contributeurs, outils IA, entités), chaque ligne menant à la fiche concernée |

### Écran de paramétrage

| écran | zone | composants / actions |
|---|---|---|
| Paramétrage | Seuils de couleur | Seuils de chaque indicateur de la synthèse et seuils spécifiques (vitalité, bornes de taille, fraîcheur Sonar, activité sans qualité, matérialité du brouillon, fraîcheur d'audit) |
| Paramétrage | Référentiels | Référentiel des dépendances (motif, versions, statut), référentiel des marqueurs IA, et motif de nommage des branches (expression régulière unique, initialisée à la convention Gitflow) |
| Paramétrage | Réglages applicatifs | Délai de verrouillage, concurrence d'audit, proxy optionnel, nombre de sauvegardes de sécurité |
| Paramétrage | Accès complémentaires | Journal des modifications, purge des audits, export/import de configuration, vues enregistrées |
| Paramétrage | Vues enregistrées | Onglet listant toutes les vues enregistrées regroupées par écran (libellé d'écran lisible) ; par ligne : nom, actions Renommer (nom seul), Dupliquer (« … (copie) »), Supprimer, et bascule « Vue par défaut » (exclusive par écran), plus un lien « Ouvrir l'écran concerné » ; chaque mutation redemande le mot de passe du fichier ([RG-002](./05_reglesGestion.md#stockage-et-confidentialité-des-données)) et est journalisée ([RG-054](./05_reglesGestion.md#vues-alertes-export-et-import)) |

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
| Obsolescence | Aucune catégorie de dépendance définie : message renvoyant vers l'écran de Paramétrage plutôt qu'une grille sans indicateur |
| Obsolescence | Aucun projet ne correspond aux filtres : message explicite plutôt qu'une grille vide silencieuse |
| Obsolescence | Projet sans audit retenu : indicateurs absents (jamais `0`), modale mentionnant « jamais audité » |
| Obsolescence | Catégorie sans dépendance concernée pour un projet : seul le sigle est affiché sur la tuile, sans barre ni valeur, pour repérer les catégories manquantes (distinct de la valeur `0`, « à jour », qui conserve sa barre) |
| Fiche projet | Dernière campagne en échec : encart d'anomalie technique affiché en tête, indicateurs de la campagne précédente conservés |
| Fiche projet | SONAR_KO actif : bloc Indicateurs Sonar grisé avec légende explicative de l'écart |
| Fiche projet | Section de membres sans membre : message explicite (« Aucun membre nominatif direct. » / « Aucun groupe invité à ce projet. » / « Aucun membre hérité de l'arborescence. »), jamais une section vide muette ; l'export PNG déplie toujours les trois sections |
| Fiche projet | Détail des groupes invités ou ancêtres inaccessible : les membres concernés sont restitués dans la section « hérités de l'arborescence », sans erreur affichée |
| Liste de travail | Aucune alerte active : message de confirmation explicite, pas de tableau vide silencieux, onglets masqués. Onglet « À traiter » vide alors que des alertes traitées existent : message « Aucune alerte à traiter : tout est traité. » ; onglet « Traités » vide : message « Aucun élément traité pour le moment. » |
| Recherche transversale | Aucun résultat : message explicite avec suggestion d'étendre la recherche à l'historique |
| Gestion des credentials | Instance sans credential saisi : listée explicitement, jamais masquée, avec statut « — » |
| Écran de verrouillage | Dernier échec autorisé avant fermeture : avertissement explicite avant la tentative suivante |
