# Plan de développement

## Sommaire

1. [Objet du document et principes directeurs](#objet-du-document-et-principes-directeurs)
2. [Définition de fin (« Definition of Done ») transverse](#définition-de-fin--definition-of-done--transverse)
3. [Phase 0 — Bootstrap du poste de développement et de l'outillage](#phase-0--bootstrap-du-poste-de-développement-et-de-loutillage)
4. [Phases de développement fonctionnel](#phases-de-développement-fonctionnel)
5. [Phase 10 — Intégration continue, empaquetage et publication](#phase-10--intégration-continue-empaquetage-et-publication)
6. [Phase 11 — Recette et durcissement avant première version utilisable](#phase-11--recette-et-durcissement-avant-première-version-utilisable)
7. [Matrice de couverture des phases](#matrice-de-couverture-des-phases)

## Objet du document et principes directeurs

Ce document décrit, à partir de l'état actuel du dépôt, l'ensemble des phases nécessaires pour développer l'application conformément au cadrage documentaire réalisé aux [14 étapes précédentes](../00_init&prompt/00_promptInitial.md#étapes). Conformément à l'étape 15 de ce même prompt :

- **La documentation existante n'est pas modifiée par ce plan** : il s'appuie sur elle sans la remplacer ni la dupliquer, en y renvoyant systématiquement plutôt qu'en reformulant son contenu (cf. [règle générale n°9](../00_init&prompt/00_promptInitial.md)).
- **Le développement se fonde exclusivement sur [docs/02_documentation/](../02_documentation/)**, qui constitue à ce stade la spécification faisant foi. Le dossier de besoin [docs/01_besoin/](../01_besoin/README.md) ([Specification.md](../01_besoin/Specification.md), [README.md](../01_besoin/README.md)) n'est plus une source à consulter pour le développement : son contenu a été repris, confirmé ou révisé au fil des 14 étapes de cadrage, et toute divergence entre les deux doit se résoudre en faveur de [docs/02_documentation/](../02_documentation/).
- **Exception unique** : les maquettes du dossier de besoin ([Suivi Qualimetrie.dc.html](../01_besoin/Suivi%20Qualimetrie.dc.html) et le dossier [screenshots/](../01_besoin/screenshots/)) peuvent être consultées pour le développement des feuilles de style (couleurs, typographie, espacements, tokens visuels), ces informations visuelles fines n'étant reprises que sous forme descriptive dans [09_maquettes.md](../02_documentation/09_maquettes.md) et [10_charteErgonomie.md](../02_documentation/10_charteErgonomie.md).
- Chaque phase ci-dessous précise son objectif, les cas d'usage couverts (avec leur [qualification consultation/mutation](../02_documentation/04_casUsage.md#convention-de-qualification-consultationmutation)), les règles de gestion et modules principalement concernés, son critère de sortie et ses dépendances. Les phases sont ordonnées par dépendance technique et par priorité [MoSCoW](../02_documentation/04_casUsage.md#convention-de-priorisation) (Must have traités au plus tôt), non par numéro d'étape du cadrage.

## Définition de fin (« Definition of Done ») transverse

Sauf mention contraire, chaque phase n'est considérée close que lorsque l'ensemble des points suivants, déjà actés dans les normes existantes, sont respectés :

- code structuré et nommé conformément aux [normes de développement](../02_documentation/14_normesDeveloppement.md), formaté et analysé statiquement sans avertissement bloquant (cf. [09-normes-developpement.md](../../.claude/rules/09-normes-developpement.md)) ;
- règles de [sécurité applicative](../02_documentation/15_normesSecurite.md) respectées, en particulier sur les [points de vigilance renforcée](../02_documentation/01_modalitesUsageEtConventions.md#points-de-vigilance-spécifiques-au-projet) touchés par la phase (cf. [10-normes-securite.md](../../.claude/rules/10-normes-securite.md)) ;
- tests unitaires écrits pour tout module concerné, seuils de couverture de la [stratégie de l'étape 11](../02_documentation/16_normesTests.md#stratégie-de-couverture-de-code) atteints ou écart justifié (cf. [11-normes-tests.md](../../.claude/rules/11-normes-tests.md)) ;
- toute règle de gestion (`RG-NNN`) ou exigence non fonctionnelle (`RNF-NNN`) concernée par la phase est vérifiée par au moins un test, conformément aux matrices de traçabilité déjà établies ;
- auto-revue puis revue assistée par IA effectuées avant toute intégration (cf. [règles de revue de code, étape 9](../02_documentation/14_normesDeveloppement.md#règles-de-revue-de-code)) ;
- commit(s) au format [Conventional Commits](../02_documentation/14_normesDeveloppement.md#stratégie-de-branches-et-de-contribution-git), réalisés par le développeur humain (jamais par l'IA, cf. [règle générale n°1](../00_init&prompt/00_promptInitial.md)).

## Phase 0 — Bootstrap du poste de développement et de l'outillage

Objectif : passer d'un dépôt exclusivement documentaire à un socle de code compilable et testable, en soldant les actions techniques déjà tracées comme différées « au démarrage effectif du développement » dans les plans des étapes précédentes.

| action | référence |
|---|---|
| Scaffold du monorepo Tauri (`src/`, `src-tauri/`) conforme à la structure définie | [structuration du code, étape 9](../02_documentation/14_normesDeveloppement.md#structuration-du-code-et-découpage-en-couches) |
| Toolchain figée (`rust-toolchain.toml`, `.nvmrc`), lockfiles initiaux | [plan de l'étape 9](./plan_09_normesDeveloppement.md#actions-issues-de-létape-9--normes-de-développement) |
| Configuration des formateurs/linters (`rustfmt.toml`, `.prettierrc`, `.eslintrc`, lints Cargo) et hook Claude Code de formatage/analyse statique | [plan de l'étape 9](./plan_09_normesDeveloppement.md#actions-issues-de-létape-9--normes-de-développement) |
| Fichiers de référence exemplaires par pattern de fichier récurrent | [plan de l'étape 9](./plan_09_normesDeveloppement.md#actions-issues-de-létape-9--normes-de-développement) |
| `.vscode/settings.json`, `.env.local.example` | [plan de l'étape 12](./plan_12_environnementsEtCI.md#actions-issues-de-létape-12--environnements-intégration-continue-et-mise-en-production) |
| Script de journalisation des prompts (hook `UserPromptSubmit`) | [plan de l'étape 1](./plan_01_miseEnPlace.md#actions-issues-de-létape-1--modalités-dusage-de-lia-et-glossaire) |
| Exclusion des futurs jeux de test chiffrés `.sqm` de la lecture par l'IA dans `.claude/settings.json`, dès l'introduction des premières fixtures (phase 1) | [plan de l'étape 1](./plan_01_miseEnPlace.md#actions-issues-de-létape-1--modalités-dusage-de-lia-et-glossaire) |
| Configuration de Jest pour les tests unitaires Angular (seuils de couverture 90 %/80 % par périmètre, rapport de couverture par fonctions pour les composants graphiques) | [plan de l'étape 11](./plan_11_normesTests.md#actions-issues-de-létape-11--normes-de-tests-automatisés) |
| Squelette du workflow GitHub Actions (checkout + installation de l'outillage uniquement, sans les étapes fonctionnelles encore vides) | [mise en place du pipeline, étape 12](../02_documentation/18_pic.md#mise-en-place-du-pipeline) |

Critère de sortie : `npm run tauri dev` ouvre une fenêtre vide, `cargo test`/`npm test` s'exécutent (même sans test métier), le pipeline CI passe au vert sur un commit trivial.

## Phases de développement fonctionnel

Chaque cas d'usage y est qualifié [Mutation ou Consultation](../02_documentation/04_casUsage.md#convention-de-qualification-consultationmutation) tel que décidé à l'étape 3.

| phase | objectif | cas d'usage couverts | règles de gestion / modules principaux | critère de sortie | dépend de |
|---|---|---|---|---|---|
| 1 — Socle de persistance et sécurité du fichier | Créer, charger et verrouiller un fichier de données chiffré | [US-001](../02_documentation/04_casUsage.md#cas-dusage--user-stories) (Mutation), [US-002](../02_documentation/04_casUsage.md#cas-dusage--user-stories) (Consultation), [US-026](../02_documentation/04_casUsage.md#cas-dusage--user-stories) (Consultation) | [RG-001](../02_documentation/05_reglesGestion.md#stockage-et-confidentialité-des-données) à [RG-005](../02_documentation/05_reglesGestion.md#stockage-et-confidentialité-des-données) ; Moteur de persistance, Store d'état applicatif | Création/chargement/sauvegarde/verrouillage d'un fichier chiffré fonctionnels et testés (round-trip, mot de passe incorrect, migration) | Phase 0 |
| 2 — Gestion des credentials | Saisir et tester des credentials de session, jamais persistés | [US-003](../02_documentation/04_casUsage.md#cas-dusage--user-stories) (Consultation), [US-004](../02_documentation/04_casUsage.md#cas-dusage--user-stories) (Consultation) | [RG-004](../02_documentation/05_reglesGestion.md#stockage-et-confidentialité-des-données) ; Façade de commandes (partielle), Store d'état applicatif | Saisie, collage JSON validé par schéma, test de credential fonctionnels | Phase 1 |
| 3 — Administration du modèle | Gérer groupes, projets et sources | [US-006](../02_documentation/04_casUsage.md#cas-dusage--user-stories), [US-007](../02_documentation/04_casUsage.md#cas-dusage--user-stories), [US-008](../02_documentation/04_casUsage.md#cas-dusage--user-stories) (Mutation) | [RG-014](../02_documentation/05_reglesGestion.md#constat-jugement-et-politique-ia), [RG-023](../02_documentation/05_reglesGestion.md#seuils-référentiels-et-historisation) ; Moteur de persistance (CRUD), écrans Administration | CRUD complet groupes/projets/sources, ref auditée avec autocomplétion | Phase 1 |
| 4 — Membres connus et politique IA | Qualifier les membres et piloter l'usage de l'IA par projet | [US-022](../02_documentation/04_casUsage.md#cas-dusage--user-stories), [US-023](../02_documentation/04_casUsage.md#cas-dusage--user-stories), [US-024](../02_documentation/04_casUsage.md#cas-dusage--user-stories) (Mutation) | [RG-006](../02_documentation/05_reglesGestion.md#membres-et-sécurité-des-accès) à [RG-008](../02_documentation/05_reglesGestion.md#membres-et-sécurité-des-accès), [RG-012](../02_documentation/05_reglesGestion.md#constat-jugement-et-politique-ia), [RG-014](../02_documentation/05_reglesGestion.md#constat-jugement-et-politique-ia) à [RG-016](../02_documentation/05_reglesGestion.md#constat-jugement-et-politique-ia), [RG-023](../02_documentation/05_reglesGestion.md#seuils-référentiels-et-historisation) | Qualification de membre, précédence des règles, politique IA (annotation + journal) opérationnelles | Phase 3 |
| 5 — Moteur d'audit | Lancer, suivre, reprendre et intégrer des campagnes d'audit | [US-009](../02_documentation/04_casUsage.md#cas-dusage--user-stories) à [US-014](../02_documentation/04_casUsage.md#cas-dusage--user-stories) (Mutation sauf [US-010](../02_documentation/04_casUsage.md#cas-dusage--user-stories), [US-012](../02_documentation/04_casUsage.md#cas-dusage--user-stories), [US-013](../02_documentation/04_casUsage.md#cas-dusage--user-stories) en Consultation) | [RG-011](../02_documentation/05_reglesGestion.md#constat-jugement-et-politique-ia), [RG-017](../02_documentation/05_reglesGestion.md#audits-et-campagnes) à [RG-021](../02_documentation/05_reglesGestion.md#audits-et-campagnes) ; Connecteur GitLab, Connecteur Sonar, Connecteur croisé, Orchestrateur de campagne | Campagne complète (lancement, suivi, annulation, reprise, brouillon, intégration) ; [tests d'intégration hors CI](../02_documentation/16_normesTests.md#tests-dintégration-hors-intégration-continue-contre-des-instances-réelles) mis en place et exécutés au moins une fois contre des instances réelles | Phases 3, 4 |
| 6 — Restitution et jugement | Consulter synthèse, graphique, fiche projet et comparaisons | [US-005](../02_documentation/04_casUsage.md#cas-dusage--user-stories), [US-015](../02_documentation/04_casUsage.md#cas-dusage--user-stories) à [US-018](../02_documentation/04_casUsage.md#cas-dusage--user-stories) (Consultation) | [RG-009](../02_documentation/05_reglesGestion.md#membres-et-sécurité-des-accès), [RG-010](../02_documentation/05_reglesGestion.md#membres-et-sécurité-des-accès), [RG-011](../02_documentation/05_reglesGestion.md#constat-jugement-et-politique-ia), [RG-013](../02_documentation/05_reglesGestion.md#constat-jugement-et-politique-ia), [RG-016](../02_documentation/05_reglesGestion.md#constat-jugement-et-politique-ia), [RG-022](../02_documentation/05_reglesGestion.md#seuils-référentiels-et-historisation), [RG-023](../02_documentation/05_reglesGestion.md#seuils-référentiels-et-historisation), [RG-026](../02_documentation/05_reglesGestion.md#vues-alertes-export-et-import) ; Moteur de jugement | Synthèse, graphique, fiche projet et comparaison affichent des indicateurs calculés conformes aux règles de [Constat, jugement et politique IA](../02_documentation/05_reglesGestion.md#constat-jugement-et-politique-ia) et au détail du [Moteur de jugement](../02_documentation/13_conceptionDetaillee.md#détail-des-modulescomposants-et-de-leurs-interfaces) | Phase 5 |
| 7 — Paramétrage, historisation et recherche | Ajuster seuils/référentiels, consulter le journal, purger, rechercher | [US-021](../02_documentation/04_casUsage.md#cas-dusage--user-stories) (Consultation), [US-025](../02_documentation/04_casUsage.md#cas-dusage--user-stories) (Mutation), [US-027](../02_documentation/04_casUsage.md#cas-dusage--user-stories) (Consultation), [US-033](../02_documentation/04_casUsage.md#cas-dusage--user-stories) (Mutation) | [RG-022](../02_documentation/05_reglesGestion.md#seuils-référentiels-et-historisation) à [RG-025](../02_documentation/05_reglesGestion.md#seuils-référentiels-et-historisation) | Requalification instantanée de l'historique après changement de seuil, purge par densité/âge, recherche transversale fonctionnelles | Phase 6 |
| 8 — Alertes et annotations | Centraliser les alertes actives et poser des repères sur les graphiques | [US-019](../02_documentation/04_casUsage.md#cas-dusage--user-stories), [US-020](../02_documentation/04_casUsage.md#cas-dusage--user-stories) (Mutation) | [RG-026](../02_documentation/05_reglesGestion.md#vues-alertes-export-et-import) | Liste de travail et annotations opérationnelles, membre inconnu toujours en tête | Phase 6 |
| 9 — Vues, export/import, connectivité et exports | Compléter les fonctionnalités de confort | [US-028](../02_documentation/04_casUsage.md#cas-dusage--user-stories) à [US-032](../02_documentation/04_casUsage.md#cas-dusage--user-stories) (Mutation pour [US-028](../02_documentation/04_casUsage.md#cas-dusage--user-stories)/[US-030](../02_documentation/04_casUsage.md#cas-dusage--user-stories), Consultation sinon) | [RG-027](../02_documentation/05_reglesGestion.md#vues-alertes-export-et-import) à [RG-029](../02_documentation/05_reglesGestion.md#vues-alertes-export-et-import) | Vues enregistrées, export/import de configuration, test de connectivité globale, exports PNG fonctionnels | Phase 7 |

## Phase 10 — Intégration continue, empaquetage et publication

Objectif : compléter le workflow GitHub Actions au-delà du socle de la phase 0 et réaliser une première publication.

| action | référence |
|---|---|
| Étapes fonctionnelles du pipeline (analyse statique, tests unitaires et couverture, tests de bout en bout, SCA) | [mise en place du pipeline, étape 12](../02_documentation/18_pic.md#mise-en-place-du-pipeline) |
| Harnais `tauri-driver`/WebDriver pour les tests de bout en bout, intégration de `cargo-llvm-cov` et de la couverture Jest (Istanbul) au pipeline | [plan de l'étape 11](./plan_11_normesTests.md#actions-issues-de-létape-11--normes-de-tests-automatisés) |
| Intégration `cargo audit`/`npm audit`, fichier d'exceptions | [plan de l'étape 10](./plan_10_normesSecurite.md#actions-issues-de-létape-10--normes-de-sécurité-applicative) |
| Secret de signature, permissions `contents: write`, configuration du updater Tauri | [plan de l'étape 12](./plan_12_environnementsEtCI.md#actions-issues-de-létape-12--environnements-intégration-continue-et-mise-en-production) |
| Build multiplateforme (dont l'archive ZIP portable Windows), déclenchement par tag ou `workflow_dispatch` | [stratégie de build, empaquetage et publication, étape 12](../02_documentation/19_environnementProduction.md#stratégie-de-build-empaquetage-et-publication) |
| Fonction d'export du rapport de diagnostic local, gestionnaire global d'erreurs non gérées | [plan de l'étape 12](./plan_12_environnementsEtCI.md#actions-issues-de-létape-12--environnements-intégration-continue-et-mise-en-production) |

Critère de sortie : une GitHub Release `v0.1.0` publiée, installable sur les trois systèmes d'exploitation cibles, mise à jour automatique fonctionnelle.

## Phase 11 — Recette et durcissement avant première version utilisable

Objectif : valider la version obtenue avant de la considérer comme une première version utilisable, conformément à la [recette et aux tests d'acceptation utilisateur](../02_documentation/16_normesTests.md#recette-et-tests-dacceptation-utilisateur).

- Checklist manuelle rejouée sur un jeu de données réaliste, reprenant les [parcours utilisateurs principaux et alternatifs](../02_documentation/06_parcoursUtilisateurs.md#parcours-principaux).
- Vérification ciblée des [quatre domaines de vigilance renforcée](../02_documentation/01_modalitesUsageEtConventions.md#points-de-vigilance-spécifiques-au-projet) : calcul des indicateurs, sécurité/confidentialité des données, architecture technique, conformité aux référentiels externes.
- Vérification des seuils de [couverture de code](../02_documentation/16_normesTests.md#stratégie-de-couverture-de-code) (90 % Moteur de jugement, 80 % reste du cœur natif, couverture par fonctions pour l'UI).
- Test du [plan de reprise d'activité](../02_documentation/19_environnementProduction.md#plan-de-reprise-dactivité) : restauration d'une sauvegarde de sécurité, réinstallation sur un poste vierge.
- [Tests de charge et de performance](../02_documentation/16_normesTests.md#tests-de-charge-et-de-performance) exécutés sur le jeu de données synthétique constitué à l'échelle [RNF-006](../02_documentation/07_exigencesNonFonctionnelles.md#scalabilité-et-montée-en-charge) (action différée de [l'étape 11](./plan_11_normesTests.md#actions-issues-de-létape-11--normes-de-tests-automatisés)) : temps de rendu/calcul confrontés aux seuils de [performance](../02_documentation/07_exigencesNonFonctionnelles.md#performance) (RNF-001 à RNF-005), régularité des événements de progression d'une campagne simulée (RNF-004), et croissance contenue du fichier de données après purge ([RNF-007](../02_documentation/07_exigencesNonFonctionnelles.md#scalabilité-et-montée-en-charge)).
- Revue de sécurité complète au regard de [15_normesSecurite.md](../02_documentation/15_normesSecurite.md).

## Matrice de couverture des phases

| cas d'usage | phase |
|---|---|
| [US-001](../02_documentation/04_casUsage.md#cas-dusage--user-stories), [US-002](../02_documentation/04_casUsage.md#cas-dusage--user-stories), [US-026](../02_documentation/04_casUsage.md#cas-dusage--user-stories) | 1 |
| [US-003](../02_documentation/04_casUsage.md#cas-dusage--user-stories), [US-004](../02_documentation/04_casUsage.md#cas-dusage--user-stories) | 2 |
| [US-006](../02_documentation/04_casUsage.md#cas-dusage--user-stories), [US-007](../02_documentation/04_casUsage.md#cas-dusage--user-stories), [US-008](../02_documentation/04_casUsage.md#cas-dusage--user-stories) | 3 |
| [US-022](../02_documentation/04_casUsage.md#cas-dusage--user-stories), [US-023](../02_documentation/04_casUsage.md#cas-dusage--user-stories), [US-024](../02_documentation/04_casUsage.md#cas-dusage--user-stories) | 4 |
| [US-009](../02_documentation/04_casUsage.md#cas-dusage--user-stories) à [US-014](../02_documentation/04_casUsage.md#cas-dusage--user-stories) | 5 |
| [US-005](../02_documentation/04_casUsage.md#cas-dusage--user-stories), [US-015](../02_documentation/04_casUsage.md#cas-dusage--user-stories) à [US-018](../02_documentation/04_casUsage.md#cas-dusage--user-stories) | 6 |
| [US-021](../02_documentation/04_casUsage.md#cas-dusage--user-stories), [US-025](../02_documentation/04_casUsage.md#cas-dusage--user-stories), [US-027](../02_documentation/04_casUsage.md#cas-dusage--user-stories), [US-033](../02_documentation/04_casUsage.md#cas-dusage--user-stories) | 7 |
| [US-019](../02_documentation/04_casUsage.md#cas-dusage--user-stories), [US-020](../02_documentation/04_casUsage.md#cas-dusage--user-stories) | 8 |
| [US-028](../02_documentation/04_casUsage.md#cas-dusage--user-stories) à [US-032](../02_documentation/04_casUsage.md#cas-dusage--user-stories) | 9 |

Les 33 cas d'usage de [04_casUsage.md](../02_documentation/04_casUsage.md#cas-dusage--user-stories) sont ainsi répartis sans omission ni doublon sur les phases 1 à 9 ; les phases 0, 10 et 11 sont transverses (outillage, publication, recette) et ne portent pas de cas d'usage propre.
