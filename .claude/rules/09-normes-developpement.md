# Normes de développement

Synthèse actionnable de [14_normesDeveloppement.md](../../docs/02_documentation/14_normesDeveloppement.md). En cas de doute, le document source fait foi ; toute évolution de ce document entraîne la mise à jour de ce fichier.

## Structure et nommage

- Monorepo Tauri : UI Angular sous `src/app/` (`ecrans/`, `composants/`, `services/sansetat/{jugement,commandes}/`, `services/avecetat/{campagne,etat,recherche}/`), cœur natif Rust sous `src-tauri/src/` (`connecteurs/`, `persistance/`, `commandes/`, `modele/`) ([source](../../docs/02_documentation/14_normesDeveloppement.md#structuration-du-code-et-découpage-en-couches)).
- Les services de l'interface sont classés selon leur caractère stateless (`services/sansetat/`) ou stateful (`services/avecetat/`), sous-regroupés fonctionnellement à l'intérieur de chacune des deux catégories (ajouté le 2026-07-19 : décision humaine issue de la relecture de la Phase 0, rendant visible dès l'arborescence l'absence ou la présence d'un état interne conservé entre deux appels).
- Aucune dépendance circulaire entre couches (ex. un connecteur ne dépend jamais du moteur de persistance).
- Nommage : fichiers Rust en `snake_case`, fichiers/dossiers Angular en `kebab-case`, composants Angular en `PascalCase` **avec préfixe applicatif** (ex. `SqmFicheProjetComponent`), services Angular en `PascalCase` suffixé `Service`, variables/fonctions en `camelCase` (TS) / `snake_case` (Rust), en français sauf identifiants imposés par les API externes, commandes de la Façade alignées un à un entre TS et Rust (`creerFichier` / `creer_fichier`) ([source](../../docs/02_documentation/14_normesDeveloppement.md#conventions-de-nommage)).
- Toute règle non évidente à la lecture est référencée en commentaire vers l'identifiant `US-NNN`/`RG-NNN` qu'elle implémente.
- Fichiers de référence exemplaire (gabarits) nommés `exemple-reference.*` (Angular) / `exemple_reference.rs` (Rust), placés dans le répertoire structurant du pattern qu'ils illustrent, en-tête explicitant leur statut de gabarit non fonctionnel (ajouté le 2026-07-19 : convention déjà appliquée en Phase 0 mais non formalisée jusqu'ici, cf. [source](../../docs/02_documentation/14_normesDeveloppement.md#structuration-du-code-et-découpage-en-couches)).
- Aucun fichier de note de travail personnelle non documenté à la racine du dépôt ou dans un répertoire de code : un constat de ce type est versé dans le rapport de développement ou transformé en ajout de règle, jamais laissé en fichier isolé sans propriétaire (ajouté le 2026-07-19 : fichier de ce type constaté, non documenté et partiellement inexact, découvert et supprimé en relecture de la Phase 0, cf. [source](../../docs/02_documentation/14_normesDeveloppement.md#règles-de-qualité-de-code)).
- Toute valeur par défaut nécessaire au fonctionnement mais non fixée par un texte normatif (règle de gestion, exigence non fonctionnelle) est reprise, par convention, de la valeur portée par `docs/01_besoin/exemple-donnees.json`, documentée comme telle en commentaire au plus près de la constante, et signalée explicitement comme décision arbitraire à valider par un humain dans le rapport de développement (ajouté le 2026-07-20 : nombre de sauvegardes de sécurité et nombre d'échecs de déverrouillage avant fermeture, tous deux fixés ainsi en Phase 1 faute de valeur chiffrée dans les règles de gestion correspondantes, cf. [source](../../docs/02_documentation/14_normesDeveloppement.md#règles-de-qualité-de-code)).
- Une commande de la Façade de commandes nécessaire à la couverture d'un cas d'usage mais non nommée explicitement par la conception détaillée est nommée par symétrie avec les commandes voisines déjà nommées (même verbe, structure identique), ce choix étant signalé comme décision arbitraire à valider par un humain (ajouté le 2026-07-20 : commande de déverrouillage de session, absente de `13_conceptionDetaillee.md`, nommée `deverrouillerSession`/`deverrouiller_session` par symétrie avec `verrouillerSession`/`verrouiller_session` en Phase 1, cf. [source](../../docs/02_documentation/14_normesDeveloppement.md#conventions-de-nommage)).

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
- Périmètre d'extensions couvert par le hook de formatage/analyse statique tenu à jour à chaque nouveau type de fichier de configuration versionné, sous peine de le laisser échapper silencieusement à l'automatisme local (ajouté le 2026-07-19 : `*.js`/`*.yml` initialement absents du hook, corrigé, cf. [source](../../docs/02_documentation/14_normesDeveloppement.md#règles-de-qualité-de-code)).
- Exclusion Prettier (`.prettierignore`) tenue alignée sur l'exclusion ESLint dès la mise en place initiale des formateurs, pour que `prettier --check` reste exploitable sur le code applicatif plutôt que noyé par les documents Markdown et artefacts générés (ajouté le 2026-07-19, cf. [source](../../docs/02_documentation/14_normesDeveloppement.md#règles-de-qualité-de-code)).

### Rigueur TypeScript

Visibilité explicite sur tout membre de classe ; type de retour explicite partout ; JSDoc obligatoire sur toute classe/méthode ; aucune fonction hors classe (fonctions utilitaires en classes à membres statiques uniquement, `allowStaticOnly: true`, divergence assumée du défaut `typescript-eslint`) ; aucun `any` ; tout typé explicitement ou via `noImplicitAny`/`strictPropertyInitialization` ; aucune assertion `as`/`!` non justifiée ; aucun accès non sûr à une valeur JSON externe ; aucune variable/import inutilisé ; switch exhaustif sur le discriminant `type` d'un Résultat ; toute Promise explicitement gérée ([détail et contrôle outillé par règle](../../docs/02_documentation/14_normesDeveloppement.md#rigueur-du-typage-et-de-la-documentation--typescript)).

- Couverture de la règle ESLint personnalisée « aucune fonction hors classe » revérifiée manuellement sur chaque combinaison déclaration/expression de fonction/fonction fléchée croisée avec absence d'export/export nommé/export par défaut, à chaque évolution de cette règle (ajouté le 2026-07-19 : trou silencieux constaté et corrigé en relecture de la Phase 0 sur l'export nommé en `function` et l'export par défaut, cf. [source](../../docs/02_documentation/14_normesDeveloppement.md#rigueur-du-typage-et-de-la-documentation--typescript)).

### Rigueur Rust

Visibilité la plus restrictive possible (`pub(crate)`/`pub(super)` plutôt que `pub`) ; Rustdoc (`///`) sur tout élément public ; `#![forbid(unsafe_code)]` ; jamais `.unwrap()`/`.expect()` (`clippy::unwrap_used`, `clippy::expect_used` en erreur) ([détail](../../docs/02_documentation/14_normesDeveloppement.md#rigueur-du-typage-et-de-la-documentation--rust)).

## Revue de code

- Pas de second développeur : auto-revue systématique **et** revue assistée par l'IA avant toute intégration, ciblant en priorité les [domaines de vigilance renforcée](./01-usage-ia-et-conventions.md#discernement) ([source](../../docs/02_documentation/14_normesDeveloppement.md#règles-de-revue-de-code)).
- Les constats de la revue IA sont tranchés par le développeur ; aucun code généré/modifié par l'IA n'est intégré sans relecture humaine.
