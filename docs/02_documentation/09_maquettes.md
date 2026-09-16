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
| Administration | Sous-onglet Membres connus | Formulaire de règle : critère, type de critère, statut, puis champ facultatif « Parti le » (sélecteur de date, plafonné au jour courant, désactivé et vidé quand le type de critère est `domaineEmail`, US-061), libellé, alias courriel ; liste des règles **triée alphabétiquement** (`libelle`, à défaut `critere`, insensible à la casse et aux accents — critère précisé le 2026-09-15, cf. [plan_20](../03_plan/plan_20_triMembresConnusEtDatesCalendaires.md)), chacune affichant après son statut une mention discrète « · parti le JJ/MM/AAAA » quand `partiLe` est renseigné (texte atténué, sans couleur d'alerte, restituée sans interprétation de fuseau horaire) |
| Administration | Onglet Projets | Liste des projets du groupe sélectionné, formulaire de création/modification, action « Dupliquer », bascule Politique IA, case à cocher « En stase » (US-064, RG-064, `false` par défaut, aucune ressaisie de mot de passe, notification discrète, ajouté le 2026-09-15, cf. [plan_20](../03_plan/plan_20_triMembresConnusEtDatesCalendaires.md)) |
| Administration | Onglet Sources | Liste des sources d'un projet, formulaire de rattachement (instance, type, identifiant externe, ref auditée avec autocomplétion) |
| Administration | Onglet Métriques (US-055) | Lecture seule, aucune mutation. Bloc de cinq compteurs (groupes, projets, audits, règles de membre, règles de dépendance) ; deux valeurs de poids — poids du fichier chiffré sur disque avec mention « reflète la dernière sauvegarde » et état « — non sauvegardé » si le fichier n'a jamais été enregistré, poids du JSON en clair avec mention « état en mémoire courant » ; tableau de cinq lignes (poste, poids, part en %) pour la ventilation du JSON en clair, total 100 % ; indicateur « Calcul de la volumétrie en cours… » pendant l'appel natif |
| Administration | Suppression | Confirmation systématique rappelant la perte de l'historique d'audits associé |

### Constitution de campagne

| écran | zone | composants / actions |
|---|---|---|
| Constitution de campagne | Sélection du périmètre | Cases à cocher (tout, par groupes, manuel), raccourcis « rejouer les échecs de la dernière campagne » et « projets non audités depuis N jours » |
| Constitution de campagne | Carte « Options » (US-058) | Adjacente à la carte « Date d'analyse », prête à accueillir d'autres options futures. Case à cocher décochée par défaut « Calculer la date de prise en charge des projets sélectionnés », avec message d'aide : n'est utile que si les membres connus du groupe sont, en grande partie, qualifiés par courriel exact, alias courriel ou domaine ; sans effet sur les projets dont la date est déjà à jour |
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
| Synthèse des audits | Tableau dense | Treize colonnes (Projet, Groupe, Dernier audit, Vitalité, Taille, Couverture, Notes Sonar, Violations, MR ouvertes, Membres, IA, Sonar, Dépendances) ; première colonne fixe au défilement horizontal ; badges « AUDIT ANCIEN » et pictogramme de campagne en échec ; ligne teintée si membre inconnu. Colonne Dépendances ajoutée en Phase 15 (demande directe de l'utilisateur, hors périmètre initial de cette maquette) : trois compteurs (dépendances inconnues du référentiel, obsolètes, maintenues), fusionnés entre toutes les sources GitLab du projet (RG-011, cf. R15-06). Ligne d'un projet « en stase » (US-064, RG-064) : fond gris propre et pastille « en stase » dans la colonne Projet, distincts du grisage « jamais audité » et des cellules grisées SONAR_KO — un projet à la fois « en stase » et jamais audité reste identifiable comme « en stase » (ajouté le 2026-09-15, cf. [plan_20](../03_plan/plan_20_triMembresConnusEtDatesCalendaires.md)) |
| Synthèse des audits | Export | Export de la vue en image PNG, alerte membre inconnu conservée |

### Synthèse graphique

| écran | zone | composants / actions |
|---|---|---|
| Synthèse graphique | Filtres | [Barre de filtres commune](#barre-de-filtres-commune-synthèse-des-audits-synthèse-graphique-obsolescence-liste-de-travail) (filtre groupe/projet mutualisé + sélecteur de vue), puis sous elle : sélecteur de type d'indicateur |
| Synthèse graphique | Graphique | Zoom temporel, séries superposables (audits historiques et réguliers d'un projet fondus dans une même courbe continue, RG-046), lignes verticales pour les annotations, les changements de seuils, le repère « Début des audits réguliers » (date du plus ancien audit régulier tous projets confondus) et les montées de version Sonar (repère violet tireté étiqueté « `Sonar <version>` », dédoublonné entre projets d'une même instance, [US-062](./04_casUsage.md#cas-dusage--user-stories)), signaux affichés en séries binaires |
| Synthèse graphique | Légende | À côté de la légende des séries, panneau de boutons à bascule « Afficher les repères » (un bouton par catégorie de repère vertical présente — annotation, changement de seuil, premier audit régulier, montée de version Sonar —, `aria-pressed`, même idiome que la bascule de séries) permettant de masquer ou réafficher, sans rechargement, les repères d'une seule catégorie ; état de session, non mémorisé |
| Synthèse graphique | Export | Export natif du graphique en image PNG (les repères masqués au moment de l'export n'y figurent pas) |

### Obsolescence

Écran de pilotage dense (US-051), sans maquette haute-fidélité de référence : fond identique aux autres écrans, panneau légèrement plus foncé délimité par des filets fins, aucun effet décoratif. Chaque catégorie de dépendance du référentiel donne un indicateur ; chaque indicateur porte une teinte propre constante d'une vue à l'autre, la valeur étant encodée par la longueur d'une barre (la valeur numérique restant toujours affichée, RNF-020).

| écran | zone | composants / actions |
|---|---|---|
| Obsolescence | Entête | Titre de page, paragraphe d'introduction (largeur bornée) précisant l'échelle des indicateurs (retard en versions majeures, 0 = à jour) |
| Obsolescence | Barre de filtres | [Barre de filtres commune](#barre-de-filtres-commune-synthèse-des-audits-synthèse-graphique-obsolescence-liste-de-travail) (filtre groupe/projet mutualisé + sélecteur de vue), puis sous elle : filtre de date d'audit (dernier audit régulier à cette date ou avant, initialisé à aujourd'hui), un couple valeur min / valeur max par catégorie (minimum toujours à 0, maximum adapté à la valeur maximale de l'indicateur tous filtres ignorés), bouton bascule « Top 10 » (US-065, RG-065, `aria-pressed`, restreint la grille aux projets cumulant le plus grand retard d'obsolescence, ex æquo au rang 10 inclus, appliqué après les autres filtres, état local non persisté, ajouté le 2026-09-15, cf. [plan_20](../03_plan/plan_20_triMembresConnusEtDatesCalendaires.md)), bouton d'export PNG |
| Obsolescence | Bandeau du panneau | Légende des indicateurs (pastille de teinte, libellé, médiane par catégorie sur les projets affichés), mention « Top 10 — projets les plus en retard, ex æquo inclus » quand le bouton « Top 10 » est actif (pour rester lisible à l'export PNG), décompte total de projets à droite (décompte du sous-ensemble Top 10 quand il est actif) |
| Obsolescence | Grille de tuiles | Colonnes fluides (nombre adapté à la largeur), quadrillage continu de 1 px ; chaque tuile : nom du projet sur deux lignes à hauteur réservée, suivi, en fin de la ligne du nom, d'une à deux petites icônes de langage principal (US-057, absentes si la ventilation par langage est indisponible ; sur nom long, la zone d'icônes repasse sous le nom sans jamais le tronquer), puis une ligne de mesure par catégorie (sigle de 3 lettres, barre sur rail sombre, valeur numérique alignée à droite) ; une catégorie sans dépendance concernée pour le projet n'affiche que son sigle, sans barre ni valeur, pour rendre repérables les catégories manquantes (la valeur `0`, « à jour », garde sa barre) ; survol éclaircissant le fond, infobulle native donnant le détail complet, dont la liste des langages principaux ; tuile d'un projet « en stase » (US-064, RG-064) sur fond gris clair, infobulle mentionnant « Projet en stase » (ajouté le 2026-09-15, cf. [plan_20](../03_plan/plan_20_triMembresConnusEtDatesCalendaires.md)) |
| Obsolescence | Détail d'un projet | Au clic sur une tuile, modale résumant le dernier audit retenu du projet : date de l'audit, tableau des dépendances (référence, catégorie, version, retard calculé), ligne Java mise en évidence ; ouverture et fermeture pilotées par un paramètre de requête de la route `/obsolescence` (l'écran reste monté sous la modale, l'ouverture est une étape d'historique, cf. [RG-052](./05_reglesGestion.md#navigation-transverse-et-filtrage-mutualisé)) ; fermeture par bouton, touche Échap ou bouton Reculer, un lien « Ouvrir la fiche projet » dans le pied de la modale |
| Obsolescence | Export | Export de la grille (bandeau inclus) en image PNG |

### Commits des membres

Écran de pilotage (US-060, RG-060), sans maquette haute-fidélité de référence : même fond et mêmes panneaux à filets fins que l'Obsolescence, aucun effet décoratif. Tableau de tri unique, aucune frise ni sparkline par ligne.

| écran | zone | composants / actions |
|---|---|---|
| Commits des membres | Bandeau de dimension RH | Bandeau permanent non masquable en tête d'écran : « Cet écran présente des indicateurs nominatifs de rythme de travail. Leur exploitation relève de la responsabilité RH et d'information du personnel de votre organisation. » |
| Commits des membres | Bandeau de commande | Sélecteur de groupe applicatif (groupes possédant au moins une instance GitLab), bouton « Analyser » (désactivé tant qu'aucun groupe n'est sélectionné), horodatage « Analyse du … » de la dernière analyse, rappel « Les commits non poussés ne sont pas visibles », message « Le groupe déclare plusieurs instances GitLab ; seule la première (`<nom>`) est interrogée » le cas échéant, message signalant le nombre de règles `interne` non analysées (type `email` ou `domaineEmail`), lien « Ajuster les seuils » vers Paramétrage › Réglages applicatifs (champ texte « Groupe GitLab (chemin ou identifiant) » et filtre/colonne « Statut » retirés, plan_21, 2026-09-16 : l'analyse porte désormais uniquement sur les membres connus `interne`/`username` actifs du groupe applicatif, plus sur le roster d'un groupe GitLab distant) |
| Commits des membres | Analyse en cours | Indicateur de chargement avec progression « traités / total » |
| Commits des membres | Barre de filtres | Recherche texte, case « seulement les lignes en alerte » (filtre de statut retiré, plan_21) |
| Commits des membres | Tableau trié | Colonnes Développeur, Dernière poussée (date et heure locales), Dépôt, Jours ouvrés depuis, Poussées / commits (fenêtre), Cadence médiane, Écart à la cadence, Part en soirée, Score de risque ; en-têtes cliquables (tri, tri par défaut sur le score décroissant) ; un ou plusieurs **badges d'alerte** (`Inactivité`, `Écart à la cadence`, `Soirée`) sur la ligne concernée, calculés à partir des seuils `cadenceCommits` — la mise en évidence par ligne se limite à ces badges, sans coloration conditionnelle des cellules d'indicateur (choix acté à la relecture : ces indicateurs n'ont pas de grille de seuils de couleur au sens de RG-022) ; ligne « données insuffisantes » discrètement grisée quand le développeur a moins de deux poussées sur la fenêtre (colonne « Statut », devenue sans objet puisque tous les développeurs affichés sont déjà `interne`, retirée par plan_21) |
| Commits des membres | État initial | Avant toute analyse : « Sélectionnez un groupe, puis lancez une analyse. » |

### Fiche projet

| écran | zone | composants / actions |
|---|---|---|
| Fiche projet | En-tête | Groupe > nom du projet > description et référence auditée, liens vers les dépôts GitLab et les projets Sonar (accompagnés, pour un projet « en stase », de la pastille grise « en stase », US-064/RG-064, affichée même en l'absence de source rattachée, ajouté le 2026-09-15, cf. [plan_20](../03_plan/plan_20_triMembresConnusEtDatesCalendaires.md)), badges de statut (IA, SONAR_KO, membre inconnu) |
| Fiche projet | Métadonnées | Âge chez nous, dernier audit, dernière campagne (mise en évidence si échec), taille/classe. La métadonnée « Âge chez nous » (US-058) restitue les six statuts de `premierCommitInterne` : `determine` → « N ans (depuis AAAA-MM-JJ) » ; `aucune_regle_interne` → libellé conditionnel selon les règles de membres connus du groupe : « aucun membre interne qualifié pour ce groupe » si aucune règle `interne` n'existe, sinon « N membres internes qualifiés, mais uniquement par identifiant de connexion : renseignez un alias courriel sur ces règles, ou ajoutez une règle de courriel ou de domaine, pour permettre la datation » (règles `interne` présentes mais toutes de type `username` sans `aliasEmail`, RG-058) ; `aucun_membre_interne` → « aucun commit interne trouvé » ; `indetermine_trop_de_commits` → « non déterminé (dépôt trop volumineux) » ; `non_applicable` → « — (aucune source GitLab) » ; `depot_vide` → « — (dépôt vide) » ; absent → « non calculée ». Un bouton discret « recalculer » (recalcul systématique de ce projet, indicateur de chargement pendant l'appel) est placé à côté ; un recalcul sans changement affiche la notification « date de prise en charge inchangée » sans aucune écriture, un recalcul modifiant la valeur redemande le mot de passe puis sauvegarde. Une mention discrète « les membres internes ont changé depuis ce calcul » apparaît à côté du bouton quand l'empreinte du référentiel `interne` diffère de celle du dernier calcul. Le bouton et la mention sont masqués à l'export PNG |
| Fiche projet | Anomalie technique | Encart si la dernière campagne a échoué, avec action suggérée |
| Fiche projet | Colonne gauche | Indicateurs Sonar (grisés si SONAR_KO) ; ligne discrète « Langages principaux » (US-057) au-dessus de la section « Dépendances » : une à deux icônes de langage Sonar (Devicon), grisée quand les indicateurs Sonar le sont, absente quand la ventilation par langage du dernier audit régulier est indisponible ; dépendances ventilées par écosystème (US-056) en sections repliables natives fermées par défaut — « Maven », « NPM », et « Autres » seulement si non vide, dans cet ordre — chaque barre de titre portant le libellé, le total entre parenthèses puis un badge par statut d'obsolescence présent (statuts à zéro omis), le corps reprenant le tableau référence/version/manifeste/statut inchangé (copie de la référence, lien « Créer une règle » pour une dépendance non référencée) ; merge requests ouvertes |
| Fiche projet | Colonne droite | Membres et statuts ventilés en trois sections repliables fermées par défaut — (1) membres nominatifs directs, (2) membres des groupes invités au projet regroupés par groupe (chemin complet mentionné une fois, groupes du plus précis vers la racine), (3) membres hérités de l'arborescence — chaque barre de titre portant le décompte par statut (statuts sans membre omis) ; ligne de membre identique d'une section à l'autre (mise en évidence si membre inconnu, lien « Qualifier ce membre » ; sur un membre `interne` dont le statut est résolu contre une règle `username` ou `email`, lien « Marquer comme parti » ouvrant l'administration pré-filtrée sur cette règle, `partiLe` pré-rempli à la date du jour, US-061) ; marqueurs IA détectés, annotations et journal |
| Fiche projet | Actions | Accès à la comparaison entre deux audits, export PNG de la fiche (les sections repliables de membres et de dépendances apparaissent dépliées dans l'image, puis leur état de repli est restauré à l'écran) |

### Comparaison entre deux audits

| écran | zone | composants / actions |
|---|---|---|
| Comparaison entre deux audits | Sélection | Choix de deux dates, raccourcis (dernier vs précédent, un mois, trois mois). Quand `premierCommitInterne.statut` vaut `determine` et qu'un audit du projet porte cette date exacte, cet audit est suffixé « (prise en charge) » dans les sélecteurs (cumulable avec « (historique) ») et un raccourci « Depuis la prise en charge » le sélectionne comme borne gauche, le dernier audit régulier comme borne droite (US-059) ; sinon le raccourci est présenté désactivé, avec une invite « Aucun audit à la date de prise en charge (AAAA-MM-JJ). Lancez une campagne historique ciblant cette date… » et un lien vers la Constitution de campagne. Un avertissement discret « audit historique partiel » s'affiche au-dessus du différentiel quand la borne gauche est un audit historique sélectionné via ce raccourci |
| Comparaison entre deux audits | Différentiel | Quatre volets : indicateurs (avant/après/delta), dépendances, membres et contributeurs, marqueurs IA ; rappel des annotations de l'intervalle. Le volet Dépendances (US-056) est ventilé par écosystème en sections repliables natives fermées par défaut (« Maven », « NPM », « Autres » si non vide), chaque barre de titre portant le libellé, le total et un badge par type d'évolution présent (Ajout, Retrait, Changement de statut ; types à zéro omis), le corps reprenant le tableau de différentiel à sept colonnes filtré sur la section ; le message global « Aucune évolution des dépendances… » est conservé quand les trois listes sont vides. L'export PNG déplie ces sections le temps de la capture |

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
| Paramétrage | Réglages applicatifs | Délai de verrouillage, concurrence d'audit, proxy optionnel, nombre de sauvegardes de sécurité ; zone « Commits des membres » (US-060) regroupant les dix seuils de l'écran homonyme — fenêtre d'analyse, seuil de jours ouvrés sans poussée, multiplicateur d'écart à la cadence, trois pondérations du score de risque, bornes de la plage de soirée, fuseau horaire (choisi dans une liste), liste de comptes exclus — avec un texte de portée « s'applique au prochain calcul de l'écran Commits des membres », chaque enregistrement redemandant le mot de passe du fichier |
| Paramétrage | Accès complémentaires | Journal des modifications, purge des audits (automatique et ciblée), export/import de configuration, vues enregistrées |
| Paramétrage | Purge des audits — Purge automatique | Deux mécanismes existants, inchangés : purge par densité (conserve toujours le premier et le dernier audit de chaque projet) et purge par âge (suppression ou agrégation mensuelle), tous deux prévisualisés avant exécution |
| Paramétrage | Purge des audits — Suppression ciblée ([US-063](./04_casUsage.md#cas-dusage--user-stories)) | Liste transverse des audits de **tous les projets de tous les groupes** (colonnes : groupe, projet, type — régulier / historique —, date ciblée, date de réalisation / création, campagne, nombre d'indicateurs), triée par défaut par date de réalisation décroissante ; filtres en en-tête (plage de date de réalisation / création, plage de date ciblée, groupe, projet, type) ; case à cocher par ligne, bouton « tout cocher le résultat filtré » / « tout décocher », compteur « N audits sélectionnés sur M projets » ; bouton « Supprimer la sélection », désactivé si aucune ligne cochée ; état particulier « aucun audit ne correspond aux filtres » quand la liste filtrée est vide. La confirmation affiche une prévisualisation (« N audits sur M projets, X Mo → Y Mo ») et, le cas échéant, la liste des projets qui se retrouveraient sans aucun audit, puis redemande le mot de passe du fichier avant suppression effective (ajouté le 2026-09-15, cf. [plan_20](../03_plan/plan_20_triMembresConnusEtDatesCalendaires.md)) |
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
| Obsolescence | « Top 10 » actif et aucun projet en retard ne correspond aux filtres : message dédié « Aucun projet en retard ne correspond aux filtres. », distinct du message générique « Aucun projet ne correspond aux filtres. » |
| Obsolescence, Synthèse des audits | Projet « en stase » jamais audité : le grisage « jamais audité » et le traitement « en stase » (fond, pastille) restent tous deux visibles, jamais l'un masquant l'autre |
| Paramétrage (Suppression ciblée) | Aucun audit ne correspond aux filtres : message explicite, bouton de suppression désactivé, plutôt qu'une liste vide silencieuse |
| Paramétrage (Suppression ciblée) | Suppression vidant entièrement l'historique d'un projet : autorisée, le projet est listé dans le récapitulatif de confirmation, sa Fiche projet affiche ensuite « jamais audité » sans erreur |
| Commits des membres | Groupe sans instance GitLab : le groupe n'apparaît pas dans le sélecteur ; si aucun groupe n'en a, message renvoyant vers l'Administration des sources |
| Commits des membres | Membre connu `interne`/`username` sans compte GitLab actif correspondant (recherche par username infructueuse) : absent du tableau, notification et décompte, sans interrompre l'analyse des autres membres (plan_21, 2026-09-16) |
| Commits des membres | Membre résolu sans aucun événement de poussée visible : ligne présente, sans activité, sans avertissement (à interpréter par l'utilisateur, cf. RG-060) |
| Commits des membres | Erreur de résolution ou de récupération des événements d'un membre pendant l'analyse : consignée en notification, la boucle continue sans interrompre l'analyse des autres membres — aucune étape de préparation par lot n'existe plus (retrait de `preparerAnalyseCommitsMembres`, plan_21) susceptible de bloquer l'ensemble de l'analyse |
| Fiche projet | Dernière campagne en échec : encart d'anomalie technique affiché en tête, indicateurs de la campagne précédente conservés |
| Fiche projet | Date de prise en charge non calculée ou non déterminée : la métadonnée « Âge chez nous » affiche le libellé du statut concerné (« non calculée » ; pour `aucune_regle_interne`, « aucun membre interne qualifié pour ce groupe » ou, si des règles `interne` existent sans canal courriel, le libellé actionnable « N membres internes qualifiés, mais uniquement par identifiant de connexion… » ; « non déterminé (dépôt trop volumineux) » ; « — (aucune source GitLab) » ; « — (dépôt vide) »), jamais une valeur d'âge trompeuse ; le bouton « recalculer » reste disponible |
| Fiche projet | SONAR_KO actif : bloc Indicateurs Sonar grisé avec légende explicative de l'écart |
| Fiche projet | Section de membres sans membre : message explicite (« Aucun membre nominatif direct. » / « Aucun groupe invité à ce projet. » / « Aucun membre hérité de l'arborescence. »), jamais une section vide muette ; l'export PNG déplie toujours les trois sections |
| Fiche projet | Détail des groupes invités ou ancêtres inaccessible : les membres concernés sont restitués dans la section « hérités de l'arborescence », sans erreur affichée |
| Liste de travail | Aucune alerte active : message de confirmation explicite, pas de tableau vide silencieux, onglets masqués. Onglet « À traiter » vide alors que des alertes traitées existent : message « Aucune alerte à traiter : tout est traité. » ; onglet « Traités » vide : message « Aucun élément traité pour le moment. » |
| Recherche transversale | Aucun résultat : message explicite avec suggestion d'étendre la recherche à l'historique |
| Gestion des credentials | Instance sans credential saisi : listée explicitement, jamais masquée, avec statut « — » |
| Écran de verrouillage | Dernier échec autorisé avant fermeture : avertissement explicite avant la tentative suivante |
