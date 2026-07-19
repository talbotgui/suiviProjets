# Installation et usage du poste de développeur

## Sommaire

1. [Prérequis matériels et logiciels](#prérequis-matériels-et-logiciels)
2. [Étapes d'installation](#étapes-dinstallation)
3. [Configuration de l'environnement](#configuration-de-lenvironnement)
   1. [Variables d'environnement](#variables-denvironnement)
   2. [Utilisation de VS Code](#utilisation-de-vs-code)
4. [Usage courant](#usage-courant)
   1. [Commandes de démarrage en mode développement](#commandes-de-démarrage-en-mode-développement)
   2. [Commandes de build](#commandes-de-build)
5. [Résolution des problèmes courants](#résolution-des-problèmes-courants)

## Prérequis matériels et logiciels

| prérequis | description |
|---|---|
| Système d'exploitation | Windows, macOS ou Linux — les trois plateformes de développement sont équivalentes, cohérent avec la portabilité visée par [RNF-021](./07_exigencesNonFonctionnelles.md#portabilité-et-environnements-cibles) |
| [Node.js](https://nodejs.org/) | Version fixée par `.nvmrc` (action tracée à l'étape 9, cf. [gestion des dépendances](./14_normesDeveloppement.md#gestion-des-dépendances)) |
| [Rust](https://www.rust-lang.org/) (via [rustup](https://rustup.rs/)) | Version et composants (`rustfmt`, `clippy`) fixés par `rust-toolchain.toml` (action tracée à l'étape 9, cf. [gestion des dépendances](./14_normesDeveloppement.md#gestion-des-dépendances)) |
| [Tauri CLI](https://tauri.app/reference/cli/) | Nécessaire pour lancer, compiler et empaqueter l'application desktop (cf. [étape 6](./11_architectureTechnique.md#choix-technologiques-structurants)) |
| Dépendance système du webview | [WebView2](https://developer.microsoft.com/microsoft-edge/webview2/) sous Windows (généralement déjà présent), WebKitGTK sous Linux, WebKit natif sous macOS — requis par Tauri pour l'interface embarquée |
| [Git](https://git-scm.com/) | Nécessaire pour cloner le dépôt et appliquer la [stratégie de branches de l'étape 9](./14_normesDeveloppement.md#stratégie-de-branches-et-de-contribution-git) |

## Étapes d'installation

1. Cloner le dépôt (`https://github.com/talbotgui/suiviProjets`).
2. Installer Node.js (respectant `.nvmrc`) et Rust via `rustup` (respectant `rust-toolchain.toml`).
3. Installer les dépendances verrouillées : `npm ci` côté Angular, `cargo build --locked` côté cœur natif (cf. [gestion des dépendances, étape 9](./14_normesDeveloppement.md#gestion-des-dépendances)).
4. Installer la Tauri CLI et vérifier la dépendance système du webview correspondant à son poste.
5. Sur un poste GitHub Codespaces, la configuration `.devcontainer/devcontainer.json` (élément préexistant, cf. [00_init.md](../00_init&prompt/00_init.md)) initialise automatiquement le répertoire de mémoire Claude Code à l'ouverture du Codespace ; sur un poste physique, la commande équivalente documentée dans ce même fichier est exécutée manuellement.
6. Créer, si nécessaire, un fichier `.env.local` à la racine du dépôt pour y définir les [variables d'environnement locales](#variables-denvironnement) (credentials de test, proxy, etc.), sans jamais le committer.

## Configuration de l'environnement

### Variables d'environnement

| variable | usage | valeur |
|---|---|---|
| `RUST_LOG` | Ajuste la verbosité des journaux techniques du cœur natif en développement (ex. `debug`, `info`, `warn`), cf. [débogage](#commandes-de-démarrage-en-mode-développement) | Définie localement par le développeur ; absence = niveau par défaut de l'application |
| `SQM_TEST_GITLAB_URL`, `SQM_TEST_GITLAB_TOKEN` | URL et jeton d'une instance GitLab réelle, utilisés exclusivement par les [tests d'intégration hors CI](./16_normesTests.md#tests-dintégration-hors-intégration-continue-contre-des-instances-réelles) | Définies localement par le développeur, jamais committées |
| `SQM_TEST_SONAR_URL`, `SQM_TEST_SONAR_TOKEN` | URL et jeton d'une instance Sonar réelle, utilisés exclusivement par les [tests d'intégration hors CI](./16_normesTests.md#tests-dintégration-hors-intégration-continue-contre-des-instances-réelles) | Définies localement par le développeur, jamais committées |
| `HTTP_PROXY`, `HTTPS_PROXY`, `NO_PROXY` | Configuration proxy respectée par le client HTTP du cœur natif ([reqwest](./02_glossaire.md#termes-techniques)), utile si le poste de développement est lui-même derrière un proxy d'entreprise ([RNF-023](./07_exigencesNonFonctionnelles.md#portabilité-et-environnements-cibles)) | Définies localement selon le réseau du développeur, absentes sinon |
| `TAURI_SIGNING_PRIVATE_KEY`, `TAURI_SIGNING_PRIVATE_KEY_PASSWORD` | Clé de signature et mot de passe associé, nécessaires uniquement pour tester localement un build signé du updater ([gestion des versions et des mises à jour, étape 12](./19_environnementProduction.md#gestion-des-versions-et-des-mises-à-jour)) ; en intégration continue, portées par le secret GitHub Actions dédié (cf. [sécurité de la PIC](./18_pic.md#sécurité-de-la-pic)) | Optionnelles en développement courant, uniquement pour valider un build de publication en local |

Ces variables sont fournies via un fichier `.env.local` (et ses variantes `.env.*.local`), exclu du suivi de version par `.gitignore` (cf. [gestion des secrets, étape 10](./15_normesSecurite.md#gestion-des-secrets-et-données-sensibles)), ou via l'export de variables de session shell selon la préférence du développeur.

### Utilisation de VS Code

VS Code est l'éditeur de référence du projet, cohérent avec la configuration `.devcontainer/devcontainer.json` déjà présente dans le dépôt (cf. [Étapes d'installation](#étapes-dinstallation)). Les extensions recommandées, déjà déclarées dans `.vscode/extensions.json` (élément préexistant du dépôt), sont proposées automatiquement à l'installation à l'ouverture du dossier :

| extension | rôle |
|---|---|
| [`anthropic.claude-code`](https://marketplace.visualstudio.com/items?itemName=anthropic.claude-code) | Intégration de Claude Code à l'éditeur |
| [`rust-lang.rust-analyzer`](https://marketplace.visualstudio.com/items?itemName=rust-lang.rust-analyzer) | Complétion, navigation et diagnostics Rust pour le cœur natif |
| [`tamasfe.even-better-toml`](https://marketplace.visualstudio.com/items?itemName=tamasfe.even-better-toml) | Édition des fichiers `Cargo.toml`, `rust-toolchain.toml` |
| [`angular.ng-template`](https://marketplace.visualstudio.com/items?itemName=Angular.ng-template) | Support des templates et composants Angular |
| [`dbaeumer.vscode-eslint`](https://marketplace.visualstudio.com/items?itemName=dbaeumer.vscode-eslint) | Remontée des diagnostics ESLint dans l'éditeur (cf. [étape 9](./14_normesDeveloppement.md#règles-de-qualité-de-code)) |
| [`esbenp.prettier-vscode`](https://marketplace.visualstudio.com/items?itemName=esbenp.prettier-vscode) | Formatage Prettier à l'enregistrement (cf. [étape 9](./14_normesDeveloppement.md#règles-de-qualité-de-code)) |
| [`editorconfig.editorconfig`](https://marketplace.visualstudio.com/items?itemName=EditorConfig.EditorConfig) | Application des réglages `.editorconfig` (élément préexistant du dépôt) |

Le réglage d'espace de travail recommandé (formatage à l'enregistrement pour Prettier et `rustfmt`, ESLint en validation continue) sera versionné dans `.vscode/settings.json` une fois les fichiers de configuration des formateurs et linters eux-mêmes créés (`.prettierrc`, `.eslintrc`, cf. [plan de mise en place de l'étape 9](../03_plan/plan_09_normesDeveloppement.md#actions-issues-de-létape-9--normes-de-développement)) ; en attendant, chaque outil reste utilisable en ligne de commande.

La configuration Claude Code (`.claude/settings.json`, fichiers de règles `.claude/rules/`) suit les décisions actées à l'étape 1 (cf. [plan de mise en place de l'étape 1](../03_plan/plan_01_miseEnPlace.md#actions-issues-de-létape-1--modalités-dusage-de-lia-et-glossaire)).

## Usage courant

### Commandes de démarrage en mode développement

- `npm run tauri dev` lance l'application complète en mode développement : compilation du cœur natif Rust, démarrage du serveur Angular avec rechargement à chaud, puis ouverture de la fenêtre Tauri pointant vers ce serveur. Toute modification du front (`src/`) recharge la vue sans redémarrage ; toute modification du cœur natif (`src-tauri/src/`) déclenche une recompilation Rust suivie d'un redémarrage automatique de l'application.
- `npm start` (ou l'équivalent Angular CLI) permet de lancer le seul front Angular dans un navigateur, sans le cœur natif, pour un développement rapide de l'interface ne nécessitant pas de commande native ; les appels à la [Façade de commandes](./13_conceptionDetaillee.md#détail-des-modulescomposants-et-de-leurs-interfaces) y sont alors indisponibles ou à simuler.
- Le débogage du front s'appuie sur les outils de développement du navigateur intégrés à la vue Tauri en mode développement ; le débogage du cœur natif s'appuie sur la variable [`RUST_LOG`](#variables-denvironnement) et sur les outils de débogage Rust habituels (ex. extension de débogage VS Code pour `rust-analyzer`, `lldb`/`gdb`).
- Les tests unitaires s'exécutent avec `npm test` (Jest côté Angular) et `cargo test` (côté Rust), cf. [tests unitaires, étape 11](./16_normesTests.md#tests-unitaires) ; les [tests d'intégration hors CI](./16_normesTests.md#tests-dintégration-hors-intégration-continue-contre-des-instances-réelles) s'exécutent ponctuellement et manuellement une fois les [variables d'environnement de credentials](#variables-denvironnement) définies.
- Le formatage et l'analyse statique (`rustfmt`, Clippy, Prettier, ESLint, cf. [étape 9](./14_normesDeveloppement.md#règles-de-qualité-de-code)) s'exécutent automatiquement via le hook Claude Code dédié à chaque modification, ou manuellement (`cargo fmt`, `cargo clippy`, `npm run lint`) avant tout commit.

### Commandes de build

- `npm run tauri build` produit le build de production complet : compilation Rust en mode optimisé et empaquetage de l'installeur natif du poste courant (cf. [stratégie de build, empaquetage et publication, étape 12](./19_environnementProduction.md#stratégie-de-build-empaquetage-et-publication)). Le build multiplateforme (Windows/macOS/Linux) reste produit par la matrice d'exécuteurs de la [PIC](./18_pic.md#mise-en-place-du-pipeline), un poste de développement ne pouvant empaqueter nativement que pour son propre système d'exploitation.
- `cargo build --locked` (ou `cargo check --locked` pour une vérification plus rapide sans lien final) permet de vérifier la seule compilation du cœur natif, sans empaquetage complet ni front Angular.
- Un build signé (validant localement le mécanisme du updater) nécessite les [variables d'environnement de signature](#variables-denvironnement) ; il reste optionnel en développement courant.

## Résolution des problèmes courants

| problème rencontré | résolution |
|---|---|
| Échec de compilation Rust lié à une version de compilateur inattendue | Vérifier que la version active correspond à `rust-toolchain.toml` ; exécuter une mise à jour de `rustup` si nécessaire |
| Échec de lancement de l'application en mode développement, lié au webview système | Installer la dépendance système du webview correspondant à son poste (cf. [Prérequis](#prérequis-matériels-et-logiciels)) |
| Échec des tests d'intégration en local | Vérifier que les variables d'environnement de credentials sont définies et que les instances GitLab/Sonar de test sont accessibles depuis le poste |
| Dépendance verrouillée différente de celle installée | Relancer `npm ci`/`cargo build --locked` plutôt que `npm install`/`cargo build` seul, pour respecter strictement le lockfile (cf. [étape 9](./14_normesDeveloppement.md#gestion-des-dépendances)) |
