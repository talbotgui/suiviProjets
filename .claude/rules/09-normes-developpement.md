# Normes de développement

Synthèse actionnable de [14_normesDeveloppement.md](../../docs/02_documentation/14_normesDeveloppement.md). En cas de doute, le document source fait foi ; toute évolution de ce document entraîne la mise à jour de ce fichier.

## Structure et nommage

- Monorepo Tauri : UI Angular sous `src/app/` (`ecrans/`, `composants/`, `campagne/`, `jugement/`, `etat/`, `recherche/`, `commandes/`), cœur natif Rust sous `src-tauri/src/` (`connecteurs/`, `persistance/`, `commandes/`, `modele/`) ([source](../../docs/02_documentation/14_normesDeveloppement.md#structuration-du-code-et-découpage-en-couches)).
- Aucune dépendance circulaire entre couches (ex. un connecteur ne dépend jamais du moteur de persistance).
- Nommage : fichiers Rust en `snake_case`, fichiers/dossiers Angular en `kebab-case`, composants Angular en `PascalCase`, services Angular en `PascalCase` suffixé `Service`, variables/fonctions en `camelCase` (TS) / `snake_case` (Rust), en français sauf identifiants imposés par les API externes, commandes de la Façade alignées un à un entre TS et Rust (`creerFichier` / `creer_fichier`) ([source](../../docs/02_documentation/14_normesDeveloppement.md#conventions-de-nommage)).
- Toute règle non évidente à la lecture est référencée en commentaire vers l'identifiant `US-NNN`/`RG-NNN` qu'elle implémente.

## Git et commits

- Trunk-based simplifié : développement direct sur la branche principale, par incréments réduits (idéalement un US ou une RG à la fois) ; branche courte réservée aux changements risqués/expérimentaux ([source](../../docs/02_documentation/14_normesDeveloppement.md#stratégie-de-branches-et-de-contribution-git)). Rappel : l'IA elle-même n'exécute jamais ces commandes ([01-usage-ia-et-conventions.md#actions-interdites-à-lia](./01-usage-ia-et-conventions.md#actions-interdites-à-lia)).
- Messages de commit au format [Conventional Commits](https://www.conventionalcommits.org/) (`type(scope): description`), types `feat`/`fix`/`refactor`/`test`/`docs`/`chore`/`security`, `scope` = module concerné, corps référençant l'US/RG concerné, mention de l'origine IA si applicable.

## Dépendances

- Lockfiles (`Cargo.lock`, `package-lock.json`) toujours committés ; installation stricte via `cargo build --locked`/`npm ci`, jamais `cargo build`/`npm install` seul ([source](../../docs/02_documentation/14_normesDeveloppement.md#gestion-des-dépendances)).
- Toolchain figée par `rust-toolchain.toml` et `.nvmrc` versionnés.
- Aucune mise à jour automatique de dépendance ; changelog lu avant toute montée de version majeure. Toute nouvelle dépendance est justifiée dans le commit qui l'introduit.

## Qualité de code

- Formatage (`rustfmt`, Prettier) et analyse statique (Clippy, ESLint) automatiques en fin de modification via le hook Claude Code dédié ; l'analyse statique est revérifiée en CI comme niveau de vérité bloquant, le formatage ne l'est pas (repose uniquement sur les automatismes locaux) ([source](../../docs/02_documentation/14_normesDeveloppement.md#règles-de-qualité-de-code)). Configuration de l'éditeur associée : [12-poste-developpeur.md#éditeur-et-outillage](./12-poste-developpeur.md#éditeur-et-outillage).
- Aucune valeur de seuil ou de référentiel codée en dur : toujours lue depuis `parametres`/`referentiels`.
- Une fonction du Moteur de jugement reste pure, sans effet de bord.

### Rigueur TypeScript

Visibilité explicite sur tout membre de classe ; type de retour explicite partout ; JSDoc obligatoire sur toute classe/méthode ; aucune fonction hors classe (fonctions utilitaires en classes à membres statiques uniquement, `allowStaticOnly: true`, divergence assumée du défaut `typescript-eslint`) ; aucun `any` ; tout typé explicitement ou via `noImplicitAny`/`strictPropertyInitialization` ; aucune assertion `as`/`!` non justifiée ; aucun accès non sûr à une valeur JSON externe ; aucune variable/import inutilisé ; switch exhaustif sur le discriminant `type` d'un Résultat ; toute Promise explicitement gérée ([détail et contrôle outillé par règle](../../docs/02_documentation/14_normesDeveloppement.md#rigueur-du-typage-et-de-la-documentation--typescript)).

### Rigueur Rust

Visibilité la plus restrictive possible (`pub(crate)`/`pub(super)` plutôt que `pub`) ; Rustdoc (`///`) sur tout élément public ; `#![forbid(unsafe_code)]` ; jamais `.unwrap()`/`.expect()` (`clippy::unwrap_used`, `clippy::expect_used` en erreur) ([détail](../../docs/02_documentation/14_normesDeveloppement.md#rigueur-du-typage-et-de-la-documentation--rust)).

## Revue de code

- Pas de second développeur : auto-revue systématique **et** revue assistée par l'IA avant toute intégration, ciblant en priorité les [domaines de vigilance renforcée](./01-usage-ia-et-conventions.md#discernement) ([source](../../docs/02_documentation/14_normesDeveloppement.md#règles-de-revue-de-code)).
- Les constats de la revue IA sont tranchés par le développeur ; aucun code généré/modifié par l'IA n'est intégré sans relecture humaine.
