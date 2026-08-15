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
| Montée de version | Mise à jour du numéro de version (`package.json`/`package-lock.json`, `src-tauri/tauri.conf.json`, `src-tauri/Cargo.toml`/`Cargo.lock`) à partir du numéro saisi au déclenchement, committée et poussée directement sur `master`, sans branche ni Pull Request (arbitrage humain explicite : commit mécanique sans logique métier, revue a posteriori jugée suffisante) |
| Build multiplateforme | Compilation et empaquetage Tauri pour Windows, macOS et Linux (matrice d'exécuteurs) à partir du commit de montée de version, dont l'archive `.zip` portable Windows (cf. [étapes d'installation de l'environnement, étape 12](./19_environnementProduction.md#étapes-dinstallation-de-lenvironnement)) |
| Génération et publication de la couverture de code et de la documentation technique | `cargo-llvm-cov --html` (seuil global 80 %) et `jest --coverage` (seuils par périmètre déjà configurés, reporter `html`) pour la couverture ; `cargo doc --no-deps` (rustdoc, outil standard de la toolchain Rust, pas d'équivalent tiers de Compodoc côté Rust) et Compodoc (`npm run doc`, cf. [étape 9](./14_normesDeveloppement.md#rigueur-du-typage-et-de-la-documentation--typescript)) pour la documentation technique générée à partir des commentaires Rustdoc/TSDoc déjà obligatoires sur tout élément public ; les quatre rapports sont assemblés en un site statique unique (`site-rapports`), déployé sur GitHub Pages à chaque exécution du workflow (cf. [Publication](#publication) ci-après) |
| Publication | Création du tag de version et publication des exécutables (dont l'archive portable) en GitHub Release, changelog dérivé des [Conventional Commits](./14_normesDeveloppement.md#stratégie-de-branches-et-de-contribution-git), lien vers le site de couverture publié en même temps (cf. [stratégie de build, empaquetage et publication, étape 12](./19_environnementProduction.md#stratégie-de-build-empaquetage-et-publication)). Le manifeste de mise à jour du updater Tauri n'est pas encore généré à ce stade (plugin non encore intégré, cf. [plan de l'étape 12](../03_plan/plan_12_environnementsEtCI.md#actions-issues-de-létape-12--environnements-intégration-continue-et-mise-en-production)) |

Les tests d'intégration contre des instances GitLab/Sonar réelles (cf. [étape 11](./16_normesTests.md#tests-dintégration-hors-intégration-continue-contre-des-instances-réelles)) ne font partie d'aucune étape de ce pipeline : ils restent volontairement hors CI.

Contrairement à l'analyse statique, la vérification du formatage (`rustfmt --check`, Prettier en mode vérification) n'est volontairement pas revérifiée en CI : le formatage repose exclusivement sur les automatismes locaux déjà en place (hook Claude Code, format-on-save VS Code une fois `.vscode/settings.json` créé, cf. [étape 12](./17_posteDeveloppeur.md#utilisation-de-vs-code)). Ce choix accepte les angles morts de cette approche exclusivement locale (code généré par un outil en ligne de commande, opérations Git de type merge/rebase/cherry-pick, poste sans la configuration locale appliquée) au profit d'un pipeline plus court, jugé acceptable pour un projet mené en solo — à la différence de l'analyse statique (Clippy, ESLint), dont le résultat peut nécessiter un arbitrage humain et reste donc revérifié en CI comme niveau de vérité bloquant, cf. [règles de qualité de code, étape 9](./14_normesDeveloppement.md#règles-de-qualité-de-code).

Déclencheur unique (décision révisée en développement, [02_glossaire.md](./02_glossaire.md), arbitrage humain explicite : à l'usage, la coexistence de plusieurs workflows/actions déclenchables séparément — validation seule, montée de version avec Pull Request, publication — s'est révélée peu pratique pour un projet mené en solo) : un seul workflow GitHub Actions (`validationVersionEtPublication.yml`), déclenché uniquement via `workflow_dispatch` avec saisie du numéro de version, sans aucune exécution automatique sur push/pull request ni sur tag poussé. Ce déclenchement unique enchaîne, au sein du même fichier workflow (plusieurs jobs reliés par dépendance, sans appel à un fichier `.yml` séparé) :
1. les validations existantes (analyse statique, tests unitaires et couverture, tests de bout en bout, analyse des dépendances vulnérables) ;
2. la montée de version, committée et poussée directement sur `master`, sans branche ni Pull Request ;
3. le build multiplateforme à partir de ce commit ;
4. la création du tag de version et la publication de la GitHub Release ;
5. la publication du site de rapports (couverture de code et documentation technique) sur GitHub Pages.

Le build multiplateforme exigeant des exécuteurs d'OS distincts (Windows/macOS/Linux), il reste un job à part (matrice) au sein de ce même workflow, de même que la publication des rapports et de la Release : chaque étape reste néanmoins bloquante pour la suivante (`needs`), garantissant qu'aucune release n'est publiée sans que les validations aient réussi.

## Usage courant

- Les résultats de chaque exécution sont consultés dans l'onglet Actions du dépôt GitHub, un run par déclenchement.
- En cas d'échec, les journaux du run concerné sont examinés avant tout nouveau déclenchement correctif, cohérent avec l'auto-revue assistée par IA retenue à [l'étape 9](./14_normesDeveloppement.md#règles-de-revue-de-code).
- Un unique déclenchement manuel (`workflow_dispatch`, saisie du numéro de version) couvre l'intégralité du cycle, de la validation à la publication de la release : c'est l'usage courant pour publier une nouvelle version, il n'existe plus de déclenchement séparé de la seule validation ni de Pull Request à relire et fusionner avant de pouvoir publier.

## Sécurité de la PIC

- Aucun credential GitLab/Sonar réel n'est nécessaire au pipeline : les tests exécutés en CI reposent exclusivement sur des réponses HTTP simulées (cf. [étape 11](./16_normesTests.md#tests-des-clients-dapi-et-des-services)), et les tests d'intégration contre des instances réelles en sont explicitement exclus.
- Le job de validation et de montée de version, qui committe et pousse directement sur `master`, ainsi que le job de publication, qui pousse un tag Git et publie une GitHub Release, nécessitent chacun les droits d'écriture sur le dépôt (permission `contents: write` du jeton GitHub Actions), déclarés au niveau de ces deux seuls jobs plutôt qu'accordés globalement à l'ensemble du workflow.
- La publication du site de rapports nécessite les permissions `pages: write` et `id-token: write` du jeton GitHub Actions, limitées au job de déploiement Pages, et l'activation préalable de GitHub Pages sur le dépôt (Settings → Pages → Source : GitHub Actions), action de configuration de plateforme réalisée par le développeur, jamais par l'IA (cf. [01-usage-ia-et-conventions.md#actions-interdites-à-lia](../../.claude/rules/01-usage-ia-et-conventions.md#actions-interdites-à-lia)). Le site publié ne contient que des rapports de couverture de code et de la documentation technique générée à partir du code (aucune donnée personnelle ni secret), cohérent avec sa publication en clair sur un site accessible publiquement.
- Le seul secret nécessaire au pipeline reste la clé de signature des exécutables et du manifeste de mise à jour, requise par le updater Tauri une fois ce dernier mis en place (cf. [gestion des versions et des mises à jour, étape 12](./19_environnementProduction.md#gestion-des-versions-et-des-mises-à-jour)) ; elle sera stockée comme secret chiffré GitHub Actions, jamais exposée en clair dans les journaux du pipeline.
- Les exécuteurs utilisés sont les exécuteurs hébergés par GitHub, sans exécuteur auto-hébergé à maintenir.
