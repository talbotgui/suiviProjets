# Installation et usage du poste de développeur

## Sommaire

1. [Prérequis matériels et logiciels](#prérequis-matériels-et-logiciels)
2. [Étapes d'installation](#étapes-dinstallation)
3. [Configuration de l'environnement](#configuration-de-lenvironnement)
   1. [Variables d'environnement](#variables-denvironnement)
   2. [Utilisation de VS Code](#utilisation-de-vs-code)
   3. [Traçabilité des échanges avec l'IA](#traçabilité-des-échanges-avec-lia)
4. [Usage courant](#usage-courant)
   1. [Commandes de démarrage en mode développement](#commandes-de-démarrage-en-mode-développement)
   2. [Commandes de build](#commandes-de-build)
   3. [Commandes de documentation technique](#commandes-de-documentation-technique)
5. [Résolution des problèmes courants](#résolution-des-problèmes-courants)

## Prérequis matériels et logiciels

| prérequis | description |
|---|---|
| Système d'exploitation | Windows, macOS ou Linux — les trois plateformes de développement sont équivalentes, cohérent avec la portabilité visée par [RNF-021](./07_exigencesNonFonctionnelles.md#portabilité-et-environnements-cibles) |
| [Node.js](https://nodejs.org/) | Version fixée par `.nvmrc` (action tracée à l'étape 9, cf. [gestion des dépendances](./14_normesDeveloppement.md#gestion-des-dépendances)) |
| [Rust](https://www.rust-lang.org/) (via [rustup](https://rustup.rs/)) | Version et composants (`rustfmt`, `clippy`) fixés par `rust-toolchain.toml` (action tracée à l'étape 9, cf. [gestion des dépendances](./14_normesDeveloppement.md#gestion-des-dépendances)) |
| [Python](https://www.python.org/) | Version fixée par `.python-version` ; nécessaire uniquement à la génération locale du [site documentaire](#commandes-de-documentation-technique) (MkDocs), pas au fonctionnement de l'application elle-même |
| [Tauri CLI](https://tauri.app/reference/cli/) | Nécessaire pour lancer, compiler et empaqueter l'application desktop (cf. [étape 6](./11_architectureTechnique.md#choix-technologiques-structurants)) |
| Dépendance système du webview | [WebView2](https://developer.microsoft.com/microsoft-edge/webview2/) sous Windows (généralement déjà présent), WebKitGTK sous Linux, WebKit natif sous macOS — requis par Tauri pour l'interface embarquée |
| [Git](https://git-scm.com/) | Nécessaire pour cloner le dépôt et appliquer la [stratégie de branches de l'étape 9](./14_normesDeveloppement.md#stratégie-de-branches-et-de-contribution-git) |

## Étapes d'installation

1. Cloner le dépôt (`https://github.com/talbotgui/suiviProjets`).
2. Installer Node.js (respectant `.nvmrc`) et Rust via `rustup` (respectant `rust-toolchain.toml`).
3. Installer les dépendances verrouillées : `npm ci` côté Angular, `cargo build --locked` côté cœur natif, et, uniquement pour générer le site documentaire en local, `pip install -r requirements.txt` (cf. [gestion des dépendances, étape 9](./14_normesDeveloppement.md#gestion-des-dépendances)).
4. Installer la Tauri CLI et vérifier la dépendance système du webview correspondant à son poste.
5. Sur un poste GitHub Codespaces, la configuration `.devcontainer/devcontainer.json` (élément préexistant, cf. [00_init.md](../00_init&prompt/00_init.md)) initialise automatiquement le répertoire de mémoire Claude Code à l'ouverture du Codespace ; sur un poste physique, la commande équivalente documentée dans ce même fichier est exécutée manuellement.
6. Créer, si nécessaire, un fichier `.env.local` à la racine du dépôt pour y définir les [variables d'environnement locales](#variables-denvironnement) (credentials de test, proxy, etc.), sans jamais le committer.

## Configuration de l'environnement

### Variables d'environnement

| variable | usage | valeur |
|---|---|---|
| `RUST_LOG` | Ajuste la verbosité des journaux techniques du cœur natif en développement (ex. `debug`, `info`, `warn`), cf. [débogage](#commandes-de-démarrage-en-mode-développement) | Définie localement par le développeur ; absence = niveau par défaut de l'application |
| `SQM_TEST_GITLAB_URL`, `SQM_TEST_GITLAB_TOKEN`, `SQM_TEST_GITLAB_PROJET_ID` | URL, jeton et identifiant d'un projet réel d'une instance GitLab, utilisés exclusivement par les [tests d'intégration hors CI](./16_normesTests.md#tests-dintégration-hors-intégration-continue-contre-des-instances-réelles) (`SQM_TEST_GITLAB_PROJET_ID` ajoutée Phase 5 incrément 7, pour les tests d'interrogation d'indicateur/de marqueurs IA contre un projet réel) | Définies localement par le développeur, jamais committées |
| `SQM_TEST_SONAR_URL`, `SQM_TEST_SONAR_TOKEN`, `SQM_TEST_SONAR_PROJET_CLE` | URL, jeton et clé d'un projet réel d'une instance Sonar, utilisés exclusivement par les [tests d'intégration hors CI](./16_normesTests.md#tests-dintégration-hors-intégration-continue-contre-des-instances-réelles) (`SQM_TEST_SONAR_PROJET_CLE` ajoutée Phase 5 incrément 7, même usage) | Définies localement par le développeur, jamais committées |
| `HTTP_PROXY`, `HTTPS_PROXY`, `NO_PROXY` | Configuration proxy respectée par le client HTTP du cœur natif ([reqwest](./02_glossaire.md#termes-techniques)), utile si le poste de développement est lui-même derrière un proxy d'entreprise ([RNF-023](./07_exigencesNonFonctionnelles.md#portabilité-et-environnements-cibles)) | Définies localement selon le réseau du développeur, absentes sinon |
| `TAURI_SIGNING_PRIVATE_KEY`, `TAURI_SIGNING_PRIVATE_KEY_PASSWORD` | Clé de signature et mot de passe associé, utiles uniquement pour tester localement un build signé (bonne pratique de distribution ; l'updater Tauri, qui en imposait l'usage, est abandonné, cf. [gestion des versions et des mises à jour, étape 12](./19_environnementProduction.md#gestion-des-versions-et-des-mises-à-jour)) ; en intégration continue, portées par le secret GitHub Actions dédié le cas échéant (cf. [sécurité de la PIC](./18_pic.md#sécurité-de-la-pic)) | Optionnelles, uniquement pour valider un build de publication signé en local |

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

### Traçabilité des échanges avec l'IA

Conformément à la décision de différer ce sujet jusqu'à la définition du poste développeur (cf. [traçabilité des échanges significatifs, étape 1](./01_modalitesUsageEtConventions.md#traçabilité-des-échanges-significatifs) et [journal des décisions](./02_glossaire.md#journal-des-décisions)), la journalisation automatique des prompts soumis à l'IA s'appuie sur un [hook Claude Code](https://code.claude.com/docs/en/hooks) `UserPromptSubmit`, déclaré dans `.claude/settings.json`, qui consigne l'horodatage et le contenu de chaque prompt dans un fichier local `.claude/logs/prompts.log`. Ce fichier, exclu du suivi de version par `.gitignore`, reste strictement local sans transmission distante, cohérent avec l'absence de télémétrie actée à l'étape 10 (cf. [journalisation des événements sensibles](./15_normesSecurite.md#journalisation-des-événements-sensibles)) ; il complète, sans le remplacer, l'historique des sessions et des commits Git déjà retenus comme trace de référence à l'étape 1.

Cette journalisation se limite aux prompts soumis directement par l'utilisateur dans la session principale : les échanges internes des sous-agents (délégation de tâches via l'outil Agent) en sont explicitement exclus, ces échanges relevant de l'orchestration interne de l'IA plutôt que d'une communication directe avec l'utilisateur, et leur volume rendrait le fichier de trace difficilement exploitable pour son objet initial.

Sa mise en place effective (déclaration du hook, création du répertoire `.claude/logs/`) reste tracée dans le [plan de mise en place de l'étape 1](../03_plan/plan_01_miseEnPlace.md#actions-issues-de-létape-1--modalités-dusage-de-lia-et-glossaire), au même titre que les autres éléments d'outillage de poste développeur différés jusqu'au démarrage effectif du développement.

## Usage courant

### Commandes de démarrage en mode développement

- `npm run tauri dev` lance l'application complète en mode développement : compilation du cœur natif Rust, démarrage du serveur Angular avec rechargement à chaud, puis ouverture de la fenêtre Tauri pointant vers ce serveur. Toute modification du front (`src/`) recharge la vue sans redémarrage ; toute modification du cœur natif (`src-tauri/src/`) déclenche une recompilation Rust suivie d'un redémarrage automatique de l'application.
- `npm start` (ou l'équivalent Angular CLI) permet de lancer le seul front Angular dans un navigateur, sans le cœur natif, pour un développement rapide de l'interface ne nécessitant pas de commande native ; les appels à la [Façade de commandes](./13_conceptionDetaillee.md#détail-des-modulescomposants-et-de-leurs-interfaces) y sont alors indisponibles ou à simuler.
- Le débogage du front s'appuie sur les outils de développement du navigateur intégrés à la vue Tauri en mode développement ; le débogage du cœur natif s'appuie sur la variable [`RUST_LOG`](#variables-denvironnement) et sur les outils de débogage Rust habituels (ex. extension de débogage VS Code pour `rust-analyzer`, `lldb`/`gdb`).
- Les tests unitaires s'exécutent avec `npm test` (Jest côté Angular) et `cargo test` (côté Rust), cf. [tests unitaires, étape 11](./16_normesTests.md#tests-unitaires) ; les [tests d'intégration hors CI](./16_normesTests.md#tests-dintégration-hors-intégration-continue-contre-des-instances-réelles) s'exécutent ponctuellement et manuellement une fois les [variables d'environnement de credentials](#variables-denvironnement) définies.
- Les [tests de bout en bout](./16_normesTests.md#tests-de-bout-en-bout) (`tauri-driver`, protocole WebDriver) se rejouent également en local contre un build de développement, ce qui permet de reproduire un échec constaté en intégration continue avant d'y apporter un correctif ; leur configuration précise reste à établir lors de la mise en œuvre effective (cf. [plan de mise en place de l'étape 11](../03_plan/plan_11_normesTests.md#actions-issues-de-létape-11--normes-de-tests-automatisés)).
- Le formatage et l'analyse statique (`rustfmt`, Clippy, Prettier, ESLint, cf. [étape 9](./14_normesDeveloppement.md#règles-de-qualité-de-code)) s'exécutent automatiquement via le hook Claude Code dédié à chaque modification, ou manuellement (`cargo fmt`, `cargo clippy`, `npm run lint`) avant tout commit.

### Commandes de build

- `npm run tauri build` produit le build de production complet : compilation Rust en mode optimisé et empaquetage de l'installeur natif du poste courant (cf. [stratégie de build, empaquetage et publication, étape 12](./19_environnementProduction.md#stratégie-de-build-empaquetage-et-publication)). Le build multiplateforme (Windows/macOS/Linux) reste produit par la matrice d'exécuteurs de la [PIC](./18_pic.md#mise-en-place-du-pipeline), un poste de développement ne pouvant empaqueter nativement que pour son propre système d'exploitation.
- `cargo build --locked` (ou `cargo check --locked` pour une vérification plus rapide sans lien final) permet de vérifier la seule compilation du cœur natif, sans empaquetage complet ni front Angular.
- Un build signé nécessite les [variables d'environnement de signature](#variables-denvironnement) ; il reste optionnel (l'updater Tauri, qui rendait la signature obligatoire, est abandonné, cf. [étape 12](./19_environnementProduction.md#gestion-des-versions-et-des-mises-à-jour)).

### Commandes de documentation technique

- `npm run doc` génère la documentation technique de l'interface Angular/TypeScript avec [Compodoc](https://compodoc.app/) (`compodoc -p tsconfig.app.json -d documentation`), à partir des commentaires TSDoc déjà obligatoires sur toute classe/méthode (cf. [rigueur du typage et de la documentation, étape 9](./14_normesDeveloppement.md#rigueur-du-typage-et-de-la-documentation--typescript)) ; le résultat, exclu du suivi de version, s'ouvre localement via `documentation/index.html`.
- `cargo doc --locked --no-deps --open` (depuis `src-tauri/`) génère et ouvre la documentation technique du cœur natif Rust avec [rustdoc](https://doc.rust-lang.org/rustdoc/), outil standard livré avec la toolchain Rust : aucun équivalent tiers de Compodoc n'est nécessaire côté Rust. Générée à partir des commentaires Rustdoc (`///`) déjà obligatoires sur tout élément public (cf. [rigueur du typage et de la documentation, étape 9](./14_normesDeveloppement.md#rigueur-du-typage-et-de-la-documentation--rust)) ; `--no-deps` exclut la documentation des dépendances, limitant le résultat au seul code de ce dépôt.
- Ces deux rapports sont régénérés et publiés sur GitHub Pages à chaque exécution du workflow de publication, aux côtés des rapports de couverture de code (cf. [mise en place du pipeline, étape 12](./18_pic.md#mise-en-place-du-pipeline)).
- Le [site documentaire](../../mkdocs.yml) (présentation, guide utilisateur, méthode de construction, arborescence complète de `docs/`, page de qualité), distinct de la documentation technique ci-dessus, se prévisualise en local avec `mkdocs serve` (rechargement à chaud, `http://127.0.0.1:8000/` par défaut) une fois les [dépendances Python installées](#étapes-dinstallation) ; `mkdocs build` en produit une version statique dans `site/` (exclu du suivi de version), sans passer par le pipeline.
- Les captures d'écran du [guide utilisateur](../guide-utilisateur.md) (`docs/assets/captures/`, versionnées) sont des captures de l'application réelle sous `ng serve`, alimentée par le jeu de démonstration du bouchon TypeScript (`RACINE_BOUCHON_CHARGEMENT`, chargé via l'écran de démarrage avec un mot de passe quelconque). Elles se régénèrent manuellement, hors pipeline, en pilotant l'application avec un court script Playwright local non versionné (viewport fixe, thème clair, navigation par la barre latérale, une capture par écran) ; ce sont les seules images propres au site, les quatre captures de maquette de `docs/01_besoin/screenshots/` restant réservées à la documentation de besoin (étape 4).

## Résolution des problèmes courants

| problème rencontré | résolution |
|---|---|
| Échec de compilation Rust lié à une version de compilateur inattendue | Vérifier que la version active correspond à `rust-toolchain.toml` ; exécuter une mise à jour de `rustup` si nécessaire |
| Échec de lancement de l'application en mode développement, lié au webview système | Installer la dépendance système du webview correspondant à son poste (cf. [Prérequis](#prérequis-matériels-et-logiciels)) |
| Échec des tests d'intégration en local | Vérifier que les variables d'environnement de credentials sont définies et que les instances GitLab/Sonar de test sont accessibles depuis le poste |
| Dépendance verrouillée différente de celle installée | Relancer `npm ci`/`cargo build --locked` plutôt que `npm install`/`cargo build` seul, pour respecter strictement le lockfile (cf. [étape 9](./14_normesDeveloppement.md#gestion-des-dépendances)) |
| Rafraîchissement (F5) en échec dans la fenêtre Tauri hors de la route racine (page blanche ou erreur de résolution de chemin) | Piège connu de toute application Tauri/Electron combinée à un routeur Angular en `PathLocationStrategy` par défaut : la webview ne sait pas résoudre un chemin profond au rechargement, faute de serveur HTTP applicatif capable d'un repli vers `index.html`. Résolu par `withHashLocation()` dans `provideRouter` (`app.config.ts`, corrigé lors de la recette de la Phase 15, cf. [rapport de développement](../04_rapports/rapportDeDeveloppement.md#étape-15-incrément-1--recette--correction-des-bugs-r15-01-à-r15-06)) : à vérifier en premier si ce défaut réapparaît après une modification du routeur |
