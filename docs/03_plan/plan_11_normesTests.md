# Plan de mise en place

## Sommaire

1. [Objet du document](#objet-du-document)
2. [Actions issues de l'étape 11 — Normes de tests automatisés](#actions-issues-de-létape-11--normes-de-tests-automatisés)

## Objet du document

Ce document trace, au fil des étapes de cadrage, les modifications techniques détectées durant les conversations et restant à réaliser après la rédaction des documents ([règle générale n°8](../00_init&prompt/00_promptInitial.md)). Chaque ligne précise l'action, le ou les fichiers concernés, l'étape d'origine, l'étape cible (lorsque le traitement est différé à une étape ultérieure connue), le statut d'avancement, ainsi que sa reprise dans le plan de développement de l'étape 15 (colonne complétée le 2026-07-19, en cohérence avec le modèle [plan_miseEnPlace.md](./_modèles/plan_miseEnPlace.md), lors du démarrage effectif du développement).

## Actions issues de l'étape 11 — Normes de tests automatisés

| action | fichier(s) concerné(s) | étape d'origine | étape cible | statut | repris dans le plan de développement |
|---|---|---|---|---|---|
| Configurer Jest pour les tests unitaires Angular (configuration, seuils de couverture 90 %/80 % par périmètre, rapport de couverture par fonctions activé pour les composants graphiques) | `jest.config.js` (à créer) | [11](../02_documentation/16_normesTests.md#tests-unitaires) | 12 (poste développeur) — l'arborescence de code (`src/`) n'existe pas encore à ce stade | différé | [Phase 0](./plan_13_developpement.md#phase-0--bootstrap-du-poste-de-développement-et-de-loutillage) |
| Configurer `tauri-driver` et le harnais WebDriver pour les tests de bout en bout, avec les quatre séquences minimales identifiées et les clients HTTP des connecteurs bouchonnés | configuration WebDriver (à créer) | [11](../02_documentation/16_normesTests.md#tests-de-bout-en-bout) | 12 (poste développeur) — l'application packagée n'existe pas encore à ce stade | différé | [Phase 10](./plan_13_developpement.md#phase-10--intégration-continue-empaquetage-et-publication) |
| Intégrer `cargo-llvm-cov` et la couverture Jest (Istanbul) au pipeline d'intégration continue, avec échec du pipeline en cas de seuil non atteint (hors composants graphiques, suivis via la couverture par fonctions) | pipeline CI (à définir) | [11](../02_documentation/16_normesTests.md#stratégie-de-couverture-de-code) | 12 (intégration continue) — le pipeline n'existe pas encore à ce stade | différé | [Phase 10](./plan_13_developpement.md#phase-10--intégration-continue-empaquetage-et-publication) |
| Constituer le jeu de données synthétique à l'échelle de [RNF-006](../02_documentation/07_exigencesNonFonctionnelles.md#scalabilité-et-montée-en-charge) pour les tests de charge et de performance | jeu de données de test (à créer) | [11](../02_documentation/16_normesTests.md#tests-de-charge-et-de-performance) | 12 (poste développeur) — nécessite l'outillage de génération, pas encore en place | différé | [Phase 11](./plan_13_developpement.md#phase-11--recette-et-durcissement-avant-première-version-utilisable) |
| Mettre en place les tests d'intégration contre les instances GitLab/Sonar réelles du développeur (tests marqués `#[ignore]`/tag équivalent, lecture des credentials depuis des variables d'environnement locales, exclusion explicite du pipeline CI) | tests d'intégration (à créer, sous `src-tauri/`) | [11](../02_documentation/16_normesTests.md#tests-dintégration-hors-intégration-continue-contre-des-instances-réelles) | 12 (poste développeur) — l'arborescence de code (`src-tauri/`) n'existe pas encore à ce stade | différé | [Phase 5](./plan_13_developpement.md#phases-de-développement-fonctionnel) |
