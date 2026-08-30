# Poste développeur

Synthèse actionnable de [17_posteDeveloppeur.md](../../docs/02_documentation/17_posteDeveloppeur.md). En cas de doute, le document source fait foi ; toute évolution de ce document entraîne la mise à jour de ce fichier.

## Commandes

- Développement complet : `npm run tauri dev` (front + cœur natif, rechargement à chaud) ; front seul : `npm start` (commandes de la Façade indisponibles) ([source](../../docs/02_documentation/17_posteDeveloppeur.md#commandes-de-démarrage-en-mode-développement)).
- Tests : `npm test` (Jest), `cargo test` (Rust) ; tests d'intégration hors CI déclenchés manuellement une fois les variables d'environnement définies (cf. [11-normes-tests.md](./11-normes-tests.md)).
- Test de bout en bout (Phase 12) : `npm run test:e2e` (Playwright, démarre `ng serve` automatiquement via `webServer`) ; résultats et captures d'écran dans `e2e/test-output/` (strictement local, jamais committé).
- Build : `npm run tauri build` (build de production, packaging natif du poste courant) ; `cargo build --locked`/`cargo check --locked` pour vérifier la seule compilation Rust ([source](../../docs/02_documentation/17_posteDeveloppeur.md#commandes-de-build)). Le build multiplateforme est produit par la CI, pas en local.
- Documentation technique : `npm run doc` ([Compodoc](https://compodoc.app/), Angular/TypeScript) ; `cargo doc --locked --no-deps --open` (rustdoc, cœur natif Rust — outil standard de la toolchain, pas d'équivalent tiers nécessaire) ; les deux publiés sur GitHub Pages à chaque publication, aux côtés de la couverture de code ([source](../../docs/02_documentation/17_posteDeveloppeur.md#commandes-de-documentation-technique)).
- Site documentaire (MkDocs + Material, portail principal du domaine publié) : `pip install -r requirements.txt` puis `mkdocs serve` (prévisualisation locale, rechargement à chaud) ou `mkdocs build` (sortie statique dans `site/`) ; distinct de la documentation technique ci-dessus. Le [guide utilisateur](../../docs/guide-utilisateur.md) est une page de premier niveau du site (entre « Présentation » et « La méthode ») ; ses captures, versionnées dans `docs/assets/captures/`, sont des captures de l'application réelle sous `ng serve` alimentée par le jeu de démonstration du bouchon TypeScript, régénérées manuellement hors pipeline via un court script Playwright local non versionné (cf. [source](../../docs/02_documentation/17_posteDeveloppeur.md#commandes-de-documentation-technique)). Ne pas confondre avec les quatre captures de maquette de `docs/01_besoin/screenshots/`, réservées à la documentation de besoin.

## Variables d'environnement

- `RUST_LOG` : verbosité des journaux du cœur natif en développement.
- `SQM_TEST_GITLAB_URL`/`SQM_TEST_GITLAB_TOKEN`/`SQM_TEST_GITLAB_PROJET_ID`, `SQM_TEST_SONAR_URL`/`SQM_TEST_SONAR_TOKEN`/`SQM_TEST_SONAR_PROJET_CLE` : credentials et projet réel des tests d'intégration hors CI.
- `HTTP_PROXY`/`HTTPS_PROXY`/`NO_PROXY` : proxy respecté par le client HTTP du cœur natif.
- `TAURI_SIGNING_PRIVATE_KEY`/`TAURI_SIGNING_PRIVATE_KEY_PASSWORD` : optionnelles, build signé local uniquement.
- Toutes définies via `.env.local` (jamais committé) ou variables de session shell ([source](../../docs/02_documentation/17_posteDeveloppeur.md#variables-denvironnement)).

## Éditeur et outillage

- VS Code est l'éditeur de référence ; extensions déclarées dans `.vscode/extensions.json` ([source](../../docs/02_documentation/17_posteDeveloppeur.md#utilisation-de-vs-code)).
- Toolchain figée : version Rust/composants par `rust-toolchain.toml`, version Node.js par `.nvmrc`, version Python par `.python-version` (site documentaire uniquement).
- Toute dépendance installée en mode strict (`npm ci`, `cargo build --locked`, `pip install -r requirements.txt`), jamais `npm install`/`cargo build` seul.
- Formatage/analyse statique (rustfmt, Clippy, Prettier, ESLint) : cf. [09-normes-developpement.md#qualité-de-code](./09-normes-developpement.md#qualité-de-code).

## Traçabilité des échanges avec l'IA

- Les prompts soumis directement par l'utilisateur dans la session principale sont journalisés automatiquement (hook Claude Code `UserPromptSubmit`) dans `.claude/logs/prompts.log`, fichier strictement local, exclu du suivi de version, sans transmission distante ([source](../../docs/02_documentation/17_posteDeveloppeur.md#traçabilité-des-échanges-avec-lia)).
- Les échanges internes des sous-agents (délégation via l'outil Agent) sont explicitement exclus de cette journalisation.

## Résolution de problèmes courants

Échec de compilation Rust inattendu → vérifier `rust-toolchain.toml` ; échec de lancement lié au webview → installer la dépendance système (WebView2/WebKitGTK) ; dépendance verrouillée différente → relancer avec `--locked`/`npm ci` ; rafraîchissement (F5) en échec dans la fenêtre Tauri hors de la route racine → piège connu Tauri/Angular en `PathLocationStrategy`, déjà résolu par `withHashLocation()` dans `app.config.ts` (Phase 15, R15-01) ([source](../../docs/02_documentation/17_posteDeveloppeur.md#résolution-des-problèmes-courants)).
