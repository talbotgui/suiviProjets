# Mise en place et usage de la plateforme d'intégration continue (PIC)

## Sommaire

1. [Présentation de la PIC](#présentation-de-la-pic)
2. [Mise en place du pipeline](#mise-en-place-du-pipeline)
3. [Usage courant](#usage-courant)
4. [Sécurité de la PIC](#sécurité-de-la-pic)

## Présentation de la PIC

Le dépôt étant déjà hébergé sur GitHub (`https://github.com/talbotgui/suiviProjets`, cf. `.git/config`), la plateforme retenue est [GitHub Actions](https://docs.github.com/actions) : aucune plateforme tierce ni compte supplémentaire à intégrer, et des exécuteurs (« runners ») Windows, macOS et Linux disponibles nativement, cohérent avec le besoin de build multiplateforme de [RNF-021](./07_exigencesNonFonctionnelles.md#portabilité-et-environnements-cibles).

## Mise en place du pipeline

| étape du pipeline | description |
|---|---|
| Récupération du code | Extraction (checkout) du commit ou du tag déclencheur |
| Installation de l'outillage | Node.js (`.nvmrc`) et Rust (`rust-toolchain.toml`), puis dépendances verrouillées (`npm ci`, `cargo build --locked`), cf. [gestion des dépendances, étape 9](./14_normesDeveloppement.md#gestion-des-dépendances) |
| Analyse statique | Clippy (avertissements traités comme des erreurs), ESLint (cf. [règles de qualité de code, étape 9](./14_normesDeveloppement.md#règles-de-qualité-de-code)) |
| Tests unitaires et couverture | `cargo test` + `cargo-llvm-cov`, Jest + couverture Istanbul ; échec du pipeline si les seuils de [90 %/80 % par périmètre](./16_normesTests.md#stratégie-de-couverture-de-code) ne sont pas atteints ; pour les composants graphiques, non soumis à un seuil chiffré, le [rapport de couverture par fonctions](./16_normesTests.md#stratégie-de-couverture-de-code) est publié comme artefact du pipeline pour revue manuelle, sans faire échouer le pipeline |
| Tests de bout en bout | [Playwright](https://playwright.dev/) contre `ng serve` (façade de commandes bouchonnée), le parcours unique défini à la [Phase 12](../03_plan/plan_13_developpement.md#phase-12--test-de-bout-en-bout-playwright-ng-serve) — décision qui remplace la stratégie `tauri-driver` initialement documentée ici, cf. [tests de bout en bout, étape 11](./16_normesTests.md#tests-de-bout-en-bout) |
| Analyse des dépendances vulnérables (SCA) | `cargo audit --json`/`npm audit --json`, résultats croisés avec le fichier d'exceptions versionné unique `audit-exceptions.json` (un seul fichier pour les deux écosystèmes, entrées `{ecosysteme, id, paquet, gravite, justification, dateReevaluation}`) ; échec du pipeline sur toute vulnérabilité critique ou élevée absente de ce fichier (cf. [étape 10](./15_normesSecurite.md#analyse-des-dépendances-vulnérables)) |
| Génération et publication de la couverture de code | `cargo-llvm-cov --html` (seuil global 80 %) et `jest --coverage` (seuils par périmètre déjà configurés, reporter `html`) assemblés en un site statique unique, déployé sur GitHub Pages à chaque publication de release (cf. [Publication](#publication) ci-après) |
| Build multiplateforme | Compilation et empaquetage Tauri pour Windows, macOS et Linux (matrice d'exécuteurs), dont l'archive `.zip` portable Windows (cf. [étapes d'installation de l'environnement, étape 12](./19_environnementProduction.md#étapes-dinstallation-de-lenvironnement)) |
| Publication | Sur tag de version poussé ou sur déclenchement manuel (détail ci-après) : publication des exécutables (dont l'archive portable) en GitHub Release, changelog dérivé des [Conventional Commits](./14_normesDeveloppement.md#stratégie-de-branches-et-de-contribution-git), lien vers le site de couverture publié en même temps (cf. [stratégie de build, empaquetage et publication, étape 12](./19_environnementProduction.md#stratégie-de-build-empaquetage-et-publication)). Le manifeste de mise à jour du updater Tauri n'est pas encore généré à ce stade (plugin non encore intégré, cf. [plan de l'étape 12](../03_plan/plan_12_environnementsEtCI.md#actions-issues-de-létape-12--environnements-intégration-continue-et-mise-en-production)) |

Les tests d'intégration contre des instances GitLab/Sonar réelles (cf. [étape 11](./16_normesTests.md#tests-dintégration-hors-intégration-continue-contre-des-instances-réelles)) ne font partie d'aucune étape de ce pipeline : ils restent volontairement hors CI.

Contrairement à l'analyse statique, la vérification du formatage (`rustfmt --check`, Prettier en mode vérification) n'est volontairement pas revérifiée en CI : le formatage repose exclusivement sur les automatismes locaux déjà en place (hook Claude Code, format-on-save VS Code une fois `.vscode/settings.json` créé, cf. [étape 12](./17_posteDeveloppeur.md#utilisation-de-vs-code)). Ce choix accepte les angles morts de cette approche exclusivement locale (code généré par un outil en ligne de commande, opérations Git de type merge/rebase/cherry-pick, poste sans la configuration locale appliquée) au profit d'un pipeline plus court, jugé acceptable pour un projet mené en solo — à la différence de l'analyse statique (Clippy, ESLint), dont le résultat peut nécessiter un arbitrage humain et reste donc revérifié en CI comme niveau de vérité bloquant, cf. [règles de qualité de code, étape 9](./14_normesDeveloppement.md#règles-de-qualité-de-code).

Déclencheurs (décision révisée à la [Phase 14](../03_plan/plan_13_developpement.md#phase-14--intégration-continue-empaquetage-et-publication), arbitrage humain explicite : aucune exécution automatique sur push/pull request, pour ne pas consommer inutilement de minutes d'exécution GitHub Actions sur un projet mené en solo, à la différence de la rédaction initiale de ce document) :
- le pipeline de validation (récupération du code jusqu'à l'analyse des dépendances vulnérables incluse, avec génération de la couverture) ne se déclenche que manuellement, via `workflow_dispatch`, sans nouveau commit ;
- le build multiplateforme et la publication se déclenchent soit par un tag Git de version (`vX.Y.Z`) poussé par le développeur, soit manuellement via un déclencheur `workflow_dispatch` dédié dans l'onglet Actions de GitHub, avec saisie du numéro de version : le workflow crée alors lui-même le tag correspondant avant de poursuivre, sans que le développeur ait à manipuler `git tag`/`git push --tags`. Dans les deux cas, ce workflow de publication ré-exécute d'abord entièrement le pipeline de validation ci-dessus (aucun raccourci), puisque celui-ci ne tourne plus automatiquement à chaque commit : chaque release reste ainsi garantie vérifiée avant publication.

## Usage courant

- Les résultats de chaque exécution sont consultés dans l'onglet Actions du dépôt GitHub, un run par déclenchement.
- En cas d'échec, les journaux du run concerné sont examinés avant tout nouveau commit correctif, cohérent avec l'auto-revue assistée par IA retenue à [l'étape 9](./14_normesDeveloppement.md#règles-de-revue-de-code).
- Le déclenchement manuel du pipeline de validation (`workflow_dispatch`, sans nouveau commit) est le seul mode d'exécution de la validation : à rejouer par le développeur avant toute intégration significative sur `master`, plutôt qu'une confiance dans un déclenchement automatique qui n'existe plus.
- Le déclenchement manuel d'une release (`workflow_dispatch` dédié avec saisie du numéro de version, cf. [Mise en place du pipeline](#mise-en-place-du-pipeline)) est l'usage courant pour publier une nouvelle version, le tag Git poussé manuellement restant une alternative équivalente.

## Sécurité de la PIC

- Aucun credential GitLab/Sonar réel n'est nécessaire au pipeline : les tests exécutés en CI reposent exclusivement sur des réponses HTTP simulées (cf. [étape 11](./16_normesTests.md#tests-des-clients-dapi-et-des-services)), et les tests d'intégration contre des instances réelles en sont explicitement exclus.
- Le déclenchement manuel d'une release, qui pousse un tag Git et publie une GitHub Release, nécessite que le workflow dispose des droits d'écriture sur le dépôt (permission `contents: write` du jeton GitHub Actions), limités à ce seul workflow plutôt qu'accordés globalement au pipeline de validation.
- La publication du site de couverture nécessite les permissions `pages: write` et `id-token: write` du jeton GitHub Actions, limitées au job de déploiement Pages, et l'activation préalable de GitHub Pages sur le dépôt (Settings → Pages → Source : GitHub Actions), action de configuration de plateforme réalisée par le développeur, jamais par l'IA (cf. [01-usage-ia-et-conventions.md#actions-interdites-à-lia](../../.claude/rules/01-usage-ia-et-conventions.md#actions-interdites-à-lia)). Le site publié ne contient que des rapports de couverture de code (aucune donnée personnelle ni secret), cohérent avec sa publication en clair sur un site accessible publiquement.
- Le seul secret nécessaire au pipeline reste la clé de signature des exécutables et du manifeste de mise à jour, requise par le updater Tauri une fois ce dernier mis en place (cf. [gestion des versions et des mises à jour, étape 12](./19_environnementProduction.md#gestion-des-versions-et-des-mises-à-jour)) ; elle sera stockée comme secret chiffré GitHub Actions, jamais exposée en clair dans les journaux du pipeline.
- Les exécuteurs utilisés sont les exécuteurs hébergés par GitHub, sans exécuteur auto-hébergé à maintenir.
