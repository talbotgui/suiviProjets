# État d'avancement — Phase 6 (Restitution et jugement)

## Sommaire

1. [Objet du document](#objet-du-document)
2. [Documents de référence](#documents-de-référence)
3. [Ce qui est déjà validé](#ce-qui-est-déjà-validé)
4. [Incrément 7 — Synthèse graphique : à faire](#incrément-7--synthèse-graphique--à-faire)
5. [Mode opératoire pour la reprise](#mode-opératoire-pour-la-reprise)
6. [Points d'arbitrage humain en attente](#points-darbitrage-humain-en-attente)
7. [Points de vigilance transverses](#points-de-vigilance-transverses)

## Objet du document

Ce document permet de reprendre le développement de la Phase 6 dans une session distincte de celle qui l'a produit, sans dépendre de l'historique de conversation de cette dernière ni d'un fichier de plan propre à l'outillage local de l'IA. Il ne remplace pas `docs/04_rapports/rapportDeDeveloppement.md` (journal narratif au niveau fonctionnel, sans nom de fichier ni de fonction, conformément à `docs/_modèles/modele-rapport-developpement.md`) : ce document-ci reste volontairement plus technique et opérationnel, car sa finalité est de permettre l'exécution concrète des incréments restants, pas seulement leur compréhension fonctionnelle. Il est destiné à être supprimé ou archivé une fois la Phase 6 entièrement validée, son contenu étant alors intégralement repris par le rapport de développement.

## Documents de référence

- `docs/03_plan/plan_13_developpement.md` : place la Phase 6 dans l'ensemble du plan (dépend de la Phase 5, couvre US-005 et US-015 à US-018).
- `docs/04_rapports/rapportDeDeveloppement.md`, sections « Étape 6 (incrément de rattrapage) » à « Étape 6 (incrément 6) » : narration complète, fonctionnelle et décisionnelle, de tout ce qui a déjà été livré et relu.
- `docs/02_documentation/04_casUsage.md` (US-005, US-015 à US-018), `05_reglesGestion.md` (RG-006 à RG-030, notamment RG-009, RG-011, RG-013, RG-016, RG-022, RG-023, RG-026, RG-030), `09_maquettes.md` et `10_charteErgonomie.md` : spécification fonctionnelle et ergonomique de la phase.
- `docs/01_besoin/exemple-donnees.json` et `docs/01_besoin/Suivi Qualimetrie.dc.html` : jeu de données de référence et maquette haute-fidélité (cette dernière consultable uniquement pour les feuilles de style, conformément à la règle en vigueur).

## Ce qui est déjà validé

Code livré, relu en contexte isolé (un agent « Relecteur » distinct de l'agent « Codeur », sans accès à son raisonnement) et documenté dans `rapportDeDeveloppement.md` :

- **Incrément R (rattrapage Phase 5)** : constats bruts `gitlab.dependances` et `gitlab.branches` réellement produits ; retrait du champ `nommage_conforme` (contraire à RG-030) et abandon du champ `rebasee` (coût disproportionné) du modèle `Branche`.
- **Incrément 1** : typage TypeScript fort du catalogue `Resultat` (16 variantes), de `Referentiels` (dont `motifNommageBranches`, RG-030) et de `Parametres.seuils` — plus aucun `unknown` sur ces branches.
- **Incrément 2** : socle du Moteur de jugement (sept fonctions pures couvrant RG-006 à RG-010, RG-013, RG-016, RG-022, RG-030) et composants transverses réutilisables (badge, bandeau d'alerte, popover d'explication du calcul).
- **Incrément 3** : shell applicatif (sidebar et barre supérieure) et écran Accueil (US-005), avec l'agrégation des alertes actives (RG-026).
- **Incrément 4** : écran Synthèse des audits (US-015), premier export PNG de l'application (bibliothèque `html-to-image`), popover d'explication câblé sur les colonnes concernées.
- **Incrément 5** : écran Fiche projet (US-017 : en-tête avec badges, métadonnées, encart d'anomalie technique si dernière campagne en échec, colonne Sonar/dépendances/MR, colonne membres/marqueurs IA/annotations, actions Comparaison et export PNG) et deux nouvelles fonctions du Moteur de jugement (agrégation par thème des résultats du dernier audit, détermination de la dernière campagne et de son verdict).
- **Incrément 6** : écran Comparaison entre deux audits (US-018 : sélection de deux audits parmi ceux réellement enregistrés avec raccourcis dernier/précédent/un mois/trois mois, différentiel en quatre volets — indicateurs avant/après/delta, dépendances, membres et contributeurs, marqueurs IA —, rappel des annotations de l'intervalle, état dédié quand moins de deux audits sont disponibles) et une nouvelle fonction du Moteur de jugement calculant ce différentiel en réutilisant les statuts d'obsolescence, de rattachement de membre et d'IA déjà livrés.

Chaque section correspondante du rapport de développement porte le détail complet (décisions arbitraires, doutes, résultat des vérifications).

## Incrément 7 — Synthèse graphique : à faire

**Objectif (US-016)** : visualiser l'évolution des indicateurs d'un ou plusieurs projets dans le temps, pour détecter des tendances de dégradation ou d'amélioration. Aucune maquette haute-fidélité n'existe non plus pour cet écran.

**Contenu attendu** :
- Un composant de graphique d'évolution réutilisable, avec zoom temporel, séries activables/désactivables individuellement, lignes verticales étiquetées pour les annotations et pour les changements de seuil, et un message explicite si aucune donnée n'est disponible sur la période ou le filtre choisi.
- L'écran lui-même, avec des filtres par groupe, projet et type d'indicateur, et un export PNG (en réutilisant le mécanisme déjà en place depuis l'incrément 4).
- Une nouvelle fonction du Moteur de jugement lisant le journal des modifications pour déterminer les changements de seuil à représenter par les lignes verticales (RG-023, lecture seule).
- Une nouvelle dépendance npm de bibliothèque de graphique est à choisir et à justifier explicitement (aucune n'est présente dans le projet à ce jour), sur le même principe de justification déjà appliqué à `html-to-image` (licence, taille, dépendances transitives, alternatives écartées).

**Règles de gestion concernées** : RG-011, RG-022, RG-023.

**Tests attendus** : positionnement correct des lignes verticales à partir d'entrées de journal connues, message explicite en l'absence de données, activation et désactivation des séries sans recalcul erroné.

## Mode opératoire pour la reprise

Chaque incrément suit le même schéma, déjà appliqué aux incréments R à 6 :

1. Un agent « Codeur » reçoit une consigne détaillée (périmètre exact de l'incrément, fichiers concernés, règles de gestion à respecter, tests à écrire, vérifications à faire passer, rappel explicite qu'aucune commande git n'est autorisée) et livre du code réellement fonctionnel, pas seulement un plan.
2. Un agent « Relecteur » distinct, sans accès au raisonnement du Codeur, relit le code produit en le confrontant aux documents normatifs, rejoue réellement les vérifications annoncées, et peut corriger lui-même des anomalies mineures ou signaler des désaccords de fond pour arbitrage humain.
3. Si la relecture révèle un oubli fonctionnel réel (pas seulement une divergence d'interprétation), le Codeur est sollicité à nouveau pour corriger, puis le Relecteur revérifie spécifiquement le correctif.
4. Une section est rédigée dans `docs/04_rapports/rapportDeDeveloppement.md` (sous-sections Codeur puis Relecteur), reprenant fidèlement les décisions et doutes réels de chacun.

Vérifications systématiquement rejouées à chaque étape : compilation complète de l'application (pas seulement la vérification de types limitée aux fichiers de test, qui ne couvre pas les fichiers applicatifs seuls), vérification de types, analyse statique, formatage, suite de tests avec couverture (seuil de 90 % sur le Moteur de jugement à surveiller en particulier).

## Points d'arbitrage humain en attente

Consolidés depuis les relectures déjà faites, aucun n'est bloquant pour poursuivre le développement mais tous restent à trancher avant la validation définitive de la phase :

- Interprétation retenue de RG-009 dans un écran filtrable/triable (signal global toujours visible, ligne individuellement filtrable) : jugée défendable mais pas la seule lecture possible du texte de la règle.
- Incohérence désormais réelle entre deux écrans sur la couleur du statut IA sous réserve (vert sur la Synthèse des audits, orange sur la Fiche projet).
- Niveau d'accessibilité des entrées de sidebar non encore construites (attribut d'état désactivé porté par un élément sans rôle de widget).
- Tension non résolue par la documentation source elle-même entre deux documents sur la nature exacte de l'écran d'accueil (point d'entrée unique avant/après ouverture du fichier, ou deux écrans distincts).
- Duplication du seuil de fraîcheur d'audit avant son extraction (résolue depuis, mais le principe de centralisation dès qu'un troisième consommateur apparaît reste à surveiller pour d'autres seuils).
- Divergence entre la forme réelle des anomalies de campagne produites par le code et celle illustrée par le jeu de données d'exemple (Phase 5, non corrigée).
- Choix des huit indicateurs restitués dans le premier volet de la Comparaison entre deux audits (couverture, violations bloquantes/critiques, taille du dépôt, quatre notes Sonar) : ensemble raisonnable mais arbitraire, faute de maquette haute-fidélité pour cet écran (incrément 6).
- Règle de départage retenue pour les raccourcis de sélection « un mois »/« trois mois » en cas d'égalité stricte entre deux audits candidats (le plus ancien des deux est retenu) : cas jugé rare, non tranché par un texte normatif (incrément 6).
- Repli automatique et silencieux sur l'audit chronologiquement adjacent lorsque les deux sélecteurs de la Comparaison entre deux audits désignent le même audit, plutôt qu'un message d'erreur ou un différentiel vide : comportement non prescrit par la documentation source (incrément 6).
- Rattachement de la résolution des raccourcis de sélection de date à l'écran de Comparaison plutôt qu'au Moteur de jugement, celui-ci ne recevant que les deux audits déjà choisis : frontière défendable mais pas la seule lecture possible (incrément 6).

## Points de vigilance transverses

Deux agents distincts, à deux moments différents de cette phase, ont exécuté par erreur des commandes de consultation du gestionnaire de versions malgré l'interdiction explicite et répétée dans chaque consigne. Aucune n'était destructive, mais ce manquement recommande la mise en place d'un garde-fou technique (règle de configuration bloquant toute commande de ce type pour l'IA) plutôt que de continuer à s'appuyer uniquement sur une consigne textuelle répétée à chaque agent.

Aucune vérification visuelle interactive de l'application (lancement réel de l'interface) n'a pu être effectuée dans l'environnement où cette phase a été développée jusqu'ici, faute de serveur graphique disponible. Une vérification humaine sur un poste de développement complet reste recommandée avant la validation définitive de la phase, conformément à la règle du projet exigeant une exécution ou un test concret plutôt qu'une seule relecture visuelle.
