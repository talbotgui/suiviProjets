# Plan de mise en place

## Sommaire

1. [Objet du document](#objet-du-document)
2. [Actions issues de l'étape 9 — Normes de développement](#actions-issues-de-létape-9--normes-de-développement)

## Objet du document

Ce document trace, au fil des étapes de cadrage, les modifications techniques détectées durant les conversations et restant à réaliser après la rédaction des documents ([règle générale n°8](../00_init&prompt/00_promptInitial.md)). Chaque ligne précise l'action, le ou les fichiers concernés, l'étape d'origine, l'étape cible (lorsque le traitement est différé à une étape ultérieure connue) et le statut d'avancement.

## Actions issues de l'étape 9 — Normes de développement

| action | fichier(s) concerné(s) | étape d'origine | étape cible | statut |
|---|---|---|---|---|
| Générer la configuration de chaque outil de formatage et d'analyse statique (`rustfmt.toml`, configuration Clippy, `.prettierrc`, `.eslintrc`) et mettre en place un hook Claude Code (`PostToolUse`) exécutant automatiquement ces outils à la fin de chaque modification de code, humaine ou assistée par IA | `rustfmt.toml`, `.prettierrc`, `.eslintrc`, `./.claude/settings.json` | [9](../02_documentation/14_normesDeveloppement.md#règles-de-qualité-de-code) | 12 (poste développeur) — l'arborescence de code (`src/`, `src-tauri/`) n'existe pas encore à ce stade | différé |
| Configurer dans `.eslintrc` l'ensemble des règles `typescript-eslint` et `eslint-plugin-jsdoc` retenues pour la rigueur de typage et de documentation TypeScript (dont le mode « typed linting » via `parserOptions.project`, et `no-extraneous-class` avec l'option `allowStaticOnly: true`), activer `noImplicitAny` et `strictPropertyInitialization` dans `tsconfig.json`, et écrire la règle ESLint dédiée interdisant toute fonction en dehors d'une classe | `.eslintrc`, `tsconfig.json` | [9](../02_documentation/14_normesDeveloppement.md#rigueur-du-typage-et-de-la-documentation--typescript) | 12 (poste développeur) — l'arborescence de code (`src/`) n'existe pas encore à ce stade | différé |
| Configurer dans `Cargo.toml` (`[lints.rust]`, `[lints.clippy]`) les lints `unreachable_pub`, `missing_docs`, `forbid(unsafe_code)`, `unwrap_used` et `expect_used` retenus pour la rigueur de typage et de documentation Rust | `Cargo.toml` | [9](../02_documentation/14_normesDeveloppement.md#rigueur-du-typage-et-de-la-documentation--rust) | 12 (poste développeur) — l'arborescence de code (`src-tauri/`) n'existe pas encore à ce stade | différé |
| Créer `rust-toolchain.toml` (version de Rust et composants `rustfmt`/`clippy`) et `.nvmrc` (version de Node.js), fixer `edition` dans `Cargo.toml`, et configurer `cargo build --locked`/`npm ci` dans le hook et le pipeline d'intégration continue | `rust-toolchain.toml`, `.nvmrc`, `Cargo.toml` | [9](../02_documentation/14_normesDeveloppement.md#gestion-des-dépendances) | 12 (poste développeur et intégration continue) — l'arborescence de code n'existe pas encore à ce stade | différé |
| Créer un fichier de référence exemplaire par pattern de fichier récurrent (composant Angular, service Angular, classe utilitaire, module Rust de connecteur), intégralement conforme aux règles de rigueur de typage et de documentation | à définir (un fichier par pattern, sous `src/`/`src-tauri/src/`) | [9](../02_documentation/14_normesDeveloppement.md#structuration-du-code-et-découpage-en-couches) | 12 (poste développeur) — l'arborescence de code n'existe pas encore à ce stade | différé |
