# Glossaire et journal des décisions

## Sommaire

1. [Termes métier](#termes-métier)
2. [Termes techniques](#termes-techniques)
3. [Acronymes](#acronymes)
4. [Journal des décisions](#journal-des-décisions)

## Termes métier

Ce chapitre liste les termes métier employés dans la discussion et les documents, avec leur définition et l'étape au cours de laquelle ils sont apparus. Il est complété au fil des étapes suivantes dès qu'un nouveau terme ambigu apparaît.

| terme | définition | étape |
|---|---|---|
| Qualimétrie | Mesure de la qualité logicielle d'un projet (couverture de tests, dette technique, violations, notes Sonar, etc.), au sens large adopté dans ce projet pour désigner l'ensemble des indicateurs de qualité et d'obsolescence suivis. | 2 |
| Membre inconnu (statut `inconnu`) | Statut attribué par défaut à un membre de dépôt ou contributeur ne correspondant à aucune règle des membres connus du groupe ; signal de sécurité prioritaire devant rester visible en toutes circonstances (cf. [Specification.md, section 5.17](./01_besoin/Specification.md#517-f17--surveillance-des-membres-et-premier-commit-interne)). | 2 |
| Politique IA | Paramètre par projet (`iaAutorisee`) déterminant si l'usage d'outils d'intelligence artificielle est autorisé sur ce projet ; interdit par défaut (cf. [Specification.md, section 5.18](./01_besoin/Specification.md#518-f18--politique-ia)). | 2 |
| Groupe | Rassemble des projets en un ensemble ayant du sens organisationnel ; porte les instances, la liste des membres connus et les annotations de portée groupe (cf. [Specification.md, section 4](./01_besoin/Specification.md#4-glossaire)). | 3 |
| Projet | Unité logique de suivi contenant au moins un dépôt GitLab et pouvant rassembler d'autres sources (projets Sonar, autres dépôts). | 3 |
| Source | Élément fournissant la vérité auditable : un dépôt GitLab ou un projet Sonar rattaché à une instance. | 3 |
| Instance | Serveur GitLab ou Sonar (URL de base) référencé dans un groupe, dans lequel sont sélectionnées les sources des projets. | 3 |
| Audit | Action d'interroger les sources d'un ou plusieurs projets pour en extraire les indicateurs à la date du jour et en sauvegarder les résultats. | 3 |
| Campagne | Une exécution d'audit portant sur un périmètre de projets, laissant une trace (verdicts par projet) support de la reprise et du rapport d'anomalies. | 3 |
| Brouillon | Zone de transit des résultats d'une campagne avant validation et intégration à l'historique ; au plus un brouillon à la fois. | 3 |
| Résultat | Donnée structurée conservée d'un audit à l'autre, typée par un discriminant `type` (ex. `gitlab.dependances`, `sonar.notes`) ; ne contient jamais de verdict, seulement des constats bruts (cf. [RG-011](./05_reglesGestion.md#constat-jugement-et-politique-ia)). | 3 |
| Indicateur | Grandeur restituée à l'utilisateur, extraite d'un résultat directement ou par calcul contre les seuils et référentiels courants. | 3 |
| Référentiel | Grille de lecture partageable entre utilisateurs (règles de dépendances, règles de marqueurs IA), exportable en clair. | 3 |
| Membres connus | Donnée propre à un groupe, non partageable et jamais exportée en clair : règles d'identification des collaborateurs par username, email ou domaine (cf. [RG-006](./05_reglesGestion.md#membres-et-sécurité-des-accès) à [RG-008](./05_reglesGestion.md#membres-et-sécurité-des-accès)). | 3 |
| Alerte | Situation remontée par la liste de travail (membre inconnu, violation IA, SONAR_KO, projet mort, dépendance obsolète, etc.), identifiée par une clé stable pour le suivi de traitement. | 3 |
| Annotation | Repère daté posé sur un projet ou un groupe (migration, changement d'équipe, incident, activation IA, etc.), affiché sur les graphiques d'évolution. | 3 |
| Ref auditée (`refAuditee`) | Branche, tag ou SHA sur lequel portent les audits d'un dépôt GitLab ; par défaut la branche par défaut du dépôt. | 3 |
| SONAR_KO | Badge signalant que la dernière analyse Sonar est incohérente avec la date du dernier commit de la ref auditée, au-delà d'une tolérance paramétrable. | 3 |
| Vue enregistrée | Modèle nommé de filtres (groupes, projets, indicateurs, période, tri) réutilisable sur la synthèse, le grand graphique ou la liste de travail. | 3 |

## Termes techniques

Ce chapitre liste les termes techniques employés dans la discussion et les documents, avec leur définition et l'étape au cours de laquelle ils sont apparus.

| terme | définition | étape |
|---|---|---|
| [IA Fluency](./01_modalitesUsageEtConventions.md#usage-de-lia-au-sens-large) | Cadre de référence (4D Framework), défini par les professeurs Rick Dakan et Joseph Feller en collaboration avec Anthropic, structurant l'usage de l'IA selon quatre axes : délégation (quelles tâches confier à l'IA), description (comment formuler les demandes et tracer les échanges), discernement (évaluer la fiabilité des réponses) et diligence (relire, vérifier, assumer la responsabilité finale). Documentation de référence : [aifluencyframework.org](https://aifluencyframework.org/). | 1 |
| Credential | Identifiant d'accès (jeton, token) à une instance GitLab ou SonarQube, saisi en mémoire volatile et jamais persisté sur disque (cf. [Specification.md, section 5.2](./01_besoin/Specification.md#52-f02--gestion-des-credentials-et-assistant-de-création)). | 2 |
| Cœur natif | Partie de l'application exécutée hors du bac à sable du navigateur (accès disque, cryptographie, appels réseau sortants), retenue en Rust ; s'oppose à l'interface utilisateur web embarquée (cf. [étape 6](./11_architectureTechnique.md#style-architectural-retenu-et-justification)). | 6 |
| Façade de commandes | Frontière unique et typée par laquelle l'interface utilisateur invoque le cœur natif (mutations) et reçoit ses événements (ex. progression de campagne), sans accès direct aux couches internes du cœur natif. | 6 |
| [Tauri](https://tauri.app/) | Framework de packaging d'applications de bureau combinant un cœur natif (ici Rust) et une interface web embarquée, retenu pour la distribution native multiplateforme de l'application (cf. [étape 6](./11_architectureTechnique.md#choix-technologiques-structurants)). | 6 |
| [Signals](https://angular.dev/guide/signals) | Primitive de réactivité fine d'Angular, retenue pour l'état réactif local de l'interface (cf. [étape 6](./11_architectureTechnique.md#choix-technologiques-structurants)). | 6 |
| [RxJS](https://rxjs.dev/) | Bibliothèque de programmation réactive par flux (Observables), retenue pour l'orchestration asynchrone des campagnes d'audit concurrentes (cf. [étape 6](./11_architectureTechnique.md#choix-technologiques-structurants)). | 6 |
| [ECharts](https://echarts.apache.org/) | Bibliothèque de graphiques JavaScript, retenue pour la synthèse graphique et son export natif en image (cf. [étape 6](./11_architectureTechnique.md#choix-technologiques-structurants)). | 6 |
| [RustCrypto](https://github.com/RustCrypto) | Ensemble de crates Rust implémentant des primitives cryptographiques, dont Argon2id et AES-256-GCM, retenu pour la chaîne cryptographique du fichier de données (cf. [étape 6](./11_architectureTechnique.md#choix-technologiques-structurants)). | 6 |
| [zstd](https://github.com/facebook/zstd) | Algorithme de compression sans perte, retenu pour compresser le document JSON du fichier de données avant chiffrement (cf. [étape 6](./11_architectureTechnique.md#choix-technologiques-structurants)). | 6 |
| [reqwest](https://docs.rs/reqwest/) | Bibliothèque cliente HTTP pour Rust, retenue pour l'implémentation des connecteurs GitLab et Sonar du cœur natif, avec prise en charge de la configuration proxy du poste (cf. [étape 8](./13_conceptionDetaillee.md#détail-des-modulescomposants-et-de-leurs-interfaces)). | 8 |
| [Trunk-based development](https://trunkbaseddevelopment.com/) | Stratégie de gestion de branches privilégiant le développement direct sur la branche principale par incréments réduits, retenue sous une forme simplifiée pour ce projet mené en solo (cf. [étape 9](./14_normesDeveloppement.md#stratégie-de-branches-et-de-contribution-git)). | 9 |
| [Conventional Commits](https://www.conventionalcommits.org/) | Convention de formatage des messages de commit (`type(scope): description`), retenue pour les commits de code applicatif (cf. [étape 9](./14_normesDeveloppement.md#stratégie-de-branches-et-de-contribution-git)). | 9 |
| [rustfmt](https://rust-lang.github.io/rustfmt/) | Outil de formatage automatique du code Rust, exécuté avant tout commit (cf. [étape 9](./14_normesDeveloppement.md#règles-de-qualité-de-code)). | 9 |
| [Prettier](https://prettier.io/) | Outil de formatage automatique du code TypeScript/Angular, exécuté avant tout commit (cf. [étape 9](./14_normesDeveloppement.md#règles-de-qualité-de-code)). | 9 |
| [Clippy](https://doc.rust-lang.org/clippy/) | Analyseur statique (linter) du code Rust, dont les avertissements sont traités comme des erreurs en intégration continue (cf. [étape 9](./14_normesDeveloppement.md#règles-de-qualité-de-code)). | 9 |
| [ESLint](https://eslint.org/) | Analyseur statique (linter) du code TypeScript/Angular (cf. [étape 9](./14_normesDeveloppement.md#règles-de-qualité-de-code)). | 9 |
| [cargo audit](https://github.com/rustsec/rustsec/tree/main/cargo-audit) | Outil d'audit des vulnérabilités connues dans les dépendances Rust, à partir de la base RustSec (cf. [étape 9](./14_normesDeveloppement.md#gestion-des-dépendances)). | 9 |
| [npm audit](https://docs.npmjs.com/cli/v11/commands/npm-audit) | Outil d'audit des vulnérabilités connues dans les dépendances Angular/npm (cf. [étape 9](./14_normesDeveloppement.md#gestion-des-dépendances)). | 9 |
| [Hook (Claude Code)](https://code.claude.com/docs/en/hooks) | Script déclenché automatiquement par l'outillage Claude Code à un point donné du cycle de vie d'une modification (ex. `PostToolUse`, après l'écriture d'un fichier) ; retenu pour exécuter automatiquement le formatage et l'analyse statique du code à la fin de chaque modification (cf. [étape 9](./14_normesDeveloppement.md#règles-de-qualité-de-code)). | 9 |
| [typescript-eslint](https://typescript-eslint.io/) | Ensemble d'outils (parseur et plugin ESLint) apportant des règles d'analyse statique sensibles aux types TypeScript, retenu pour contrôler la rigueur de typage exigée côté TypeScript (cf. [étape 9](./14_normesDeveloppement.md#rigueur-du-typage-et-de-la-documentation--typescript)). | 9 |
| [eslint-plugin-jsdoc](https://github.com/gajus/eslint-plugin-jsdoc) | Plugin ESLint imposant et validant la présence de commentaires JSDoc, retenu pour rendre obligatoire la JSDoc sur toute classe et méthode (cf. [étape 9](./14_normesDeveloppement.md#rigueur-du-typage-et-de-la-documentation--typescript)). | 9 |
| [JSDoc](https://jsdoc.app/) | Convention de commentaire de documentation placé au-dessus d'une déclaration TypeScript/JavaScript (classe, méthode, fonction), retenue comme documentation systématique du code TypeScript (cf. [étape 9](./14_normesDeveloppement.md#rigueur-du-typage-et-de-la-documentation--typescript)). | 9 |
| [Rustdoc](https://doc.rust-lang.org/rustdoc/) | Outil et convention de commentaire de documentation (`///`) du code Rust, équivalent de la JSDoc côté Rust (cf. [étape 9](./14_normesDeveloppement.md#rigueur-du-typage-et-de-la-documentation--rust)). | 9 |
| [EditorConfig](https://editorconfig.org/) | Convention indépendante de tout éditeur fixant les réglages de base d'un fichier (encodage, fin de ligne, indentation), retenue pour homogénéiser les fichiers hors périmètre des formateurs dédiés (cf. [étape 9](./14_normesDeveloppement.md#règles-de-qualité-de-code)). | 9 |
| [rust-toolchain.toml](https://rust-lang.github.io/rustup/overrides.html) | Fichier reconnu par `rustup` fixant la version du compilateur Rust et de ses composants (`rustfmt`, `clippy`) pour un dépôt donné, retenu pour garantir un comportement de compilation et d'analyse identique quel que soit le poste ou la date (cf. [étape 9](./14_normesDeveloppement.md#gestion-des-dépendances)). | 9 |

## Acronymes

Ce chapitre liste les acronymes employés dans la discussion et les documents, avec leur signification développée.

| aconyme | signification |
|---|---|
| IA | Intelligence Artificielle |
| MoSCoW | Méthode de priorisation Must have / Should have / Could have / Won't have, retenue pour prioriser les cas d'usage à partir de l'étape 3 |
| US | User Story (cas d'usage), identifiant `US-NNN` défini à l'étape 3 |
| RG | Règle de Gestion, identifiant `RG-NNN` défini à l'étape 3 |
| RNF | Exigence Non Fonctionnelle, identifiant `RNF-NNN` défini à l'étape 4 |
| WCAG | Web Content Accessibility Guidelines, référentiel international de critères d'accessibilité numérique (niveau AA retenu à l'étape 4, cf. [WCAG 2.1](https://www.w3.org/TR/WCAG21/), W3C) |
| RGPD | Règlement Général sur la Protection des Données, réglementation européenne encadrant le traitement des données à caractère personnel (cf. [Règlement (UE) 2016/679](https://eur-lex.europa.eu/eli/reg/2016/679/oj)) |
| CSP | Content Security Policy, mécanisme du navigateur limitant les sources de contenu exécutable pour réduire le risque d'injection (XSS) |
| SLA | Service Level Agreement, engagement contractuel de disponibilité d'un service ; non applicable à cette application locale et mono-poste |
| SPA | Single Page Application, application web s'exécutant entièrement côté client après un chargement initial, sans rechargement de page à la navigation |
| CORS | Cross-Origin Resource Sharing, mécanisme du navigateur restreignant les appels réseau vers une origine différente de celle de la page ; contrainte à l'origine du choix d'un exécuteur hors navigateur (cf. [étape 6](./11_architectureTechnique.md#style-architectural-retenu-et-justification)) |
| CI | Intégration Continue (Continuous Integration), automatisation de la compilation, de l'analyse statique et des tests à chaque changement ; détaillée à l'étape 12 |
| PR | Pull Request, proposition de fusion d'une branche vers la branche principale, revue avant intégration (cf. [stratégie de branches, étape 9](./14_normesDeveloppement.md#stratégie-de-branches-et-de-contribution-git)) |

## Journal des décisions

Ce chapitre trace les décisions structurantes prises au fil des étapes (choix d'architecture, de technologies, de conception, etc.) : décision retenue, alternatives envisagées, justification du choix, étape et date de la décision. Il est complété au fil des étapes suivantes dès qu'une décision structurante est prise.

| décision | alternatives envisagées | justification | étape | date |
|---|---|---|---|---|
| [Délégation IA étendue à la documentation et au code, avec supervision humaine continue à chaque étape intermédiaire](./01_modalitesUsageEtConventions.md#périmètre-des-tâches-délégables-à-lia) | Documentation uniquement ; documentation et code avec seule relecture finale | Projet mené par un développeur unique : la supervision continue permet de détecter tôt les dérives sans ralentir excessivement le flux de travail | 1 | 2026-07-14 |
| [Traçabilité des échanges assurée par l'historique des sessions et les commits Git ; script de journalisation dédié différé](./01_modalitesUsageEtConventions.md#traçabilité-des-échanges-significatifs) | Script de journalisation mis en place immédiatement ; absence de traçabilité formalisée | Un outillage dédié est jugé prématuré avant que les normes de développement (étape 9) et le poste développeur (étape 12) ne soient définis | 1 | 2026-07-14 |
| [Mention explicite de l'origine IA dans les documents et le code substantiellement générés, en complément des messages de commit](./01_modalitesUsageEtConventions.md#mention-de-lorigine-des-contenus) | Mention en commit uniquement ; aucune mention | Renforce la transparence sur la part de contenu généré, utile en cas de relecture ultérieure ou d'audit | 1 | 2026-07-14 |
| [Quatre domaines de vigilance renforcée retenus : calcul des indicateurs qualité, sécurité et confidentialité des données, architecture technique de l'application desktop, conformité aux référentiels externes](./01_modalitesUsageEtConventions.md#points-de-vigilance-spécifiques-au-projet) | Vigilance limitée à un sous-ensemble de ces domaines | Ces domaines concentrent le risque métier (jugement erroné), le risque de sécurité (données personnelles/membres) et le risque technique (architecture desktop, choix non encore figé) propres à ce projet | 1 | 2026-07-14 |
| [Architecture desktop hybride (cœur natif Rust + UI Angular embarquée, packagée via Tauri), sans serveur ni base de données](./11_architectureTechnique.md#style-architectural-retenu-et-justification) | Application web classique (SPA + backend serveur) ; Electron ; base de données embarquée (SQLite, IndexedDB) | Les contraintes CORS et proxy des instances GitLab/Sonar imposent un exécuteur HTTP hors navigateur ; l'objectif « 100 % local, sans serveur » exclut toute architecture distante ; un cœur Rust offre une empreinte réduite et une cryptographie native mémoire-sûre par rapport à un cœur Node.js | 6 | 2026-07-18 |
| [Extension de fichier `.sqm` proposée par défaut pour le fichier de données, librement renommable](./12_modeleDonnees.md#stratégie-de-persistance) | Aucune extension imposée ; extension plus longue (`.suiviqualimetrie`) | Le dossier de besoin ne fixe aucune extension ; une extension courte par défaut facilite la reconnaissance du fichier sans contraindre l'utilisateur, seul propriétaire de son nommage | 7 | 2026-07-18 |
| [Valeur par défaut de 5 sauvegardes de sécurité conservées (`parametres.sauvegarde.nombreSauvegardesSecurite`)](./12_modeleDonnees.md#stratégie-de-sauvegarde-et-de-restauration) | Aucune valeur par défaut retenue, laissée à l'appréciation de l'implémentation | [RG-003](./05_reglesGestion.md#stockage-et-confidentialité-des-données) fixe un nombre paramétrable sans en donner la valeur ; l'exemple livré avec le dossier de besoin (`exemple-donnees.json`) illustre déjà 5 sauvegardes, retenu comme valeur par défaut plutôt que d'introduire une valeur arbitraire non sourcée | 7 | 2026-07-18 |
| [Stratégie de branches trunk-based simplifiée pour le code applicatif](./14_normesDeveloppement.md#stratégie-de-branches-et-de-contribution-git) | GitHub Flow (branche par fonctionnalité, PR systématique) ; Git Flow complet (main/develop/feature/release/hotfix) | Développement solo sans conflit de fusion à arbitrer entre développeurs ; les branches courtes restent réservées aux changements risqués ou expérimentaux | 9 | 2026-07-18 |
| [Messages de commit au format Conventional Commits pour le code applicatif](./14_normesDeveloppement.md#stratégie-de-branches-et-de-contribution-git) | Format libre avec seule référence US/RG | Permet l'automatisation (changelog, versionnage sémantique) tout en restant lisible en solo | 9 | 2026-07-18 |
| [Revue de code par auto-revue et revue assistée par l'IA avant toute intégration](./14_normesDeveloppement.md#règles-de-revue-de-code) | Auto-revue seule sans outillage IA ; revue ciblée uniquement sur les zones à risque | Absence de second développeur humain ; cohérent avec la diligence et la non-substitution du jugement métier actées à l'étape 1 | 9 | 2026-07-18 |
| [Script de journalisation des prompts définitivement reporté à l'étape 12 (poste développeur)](./plan_01_miseEnPlace.md#actions-issues-de-létape-1--modalités-dusage-de-lia-et-glossaire) | Mise en place à l'étape 9 (normes de développement) | L'étape 9 couvre la structuration du code, le Git et la qualité, pas l'outillage de poste ; l'étape 12 est le point naturel pour cet outillage | 9 | 2026-07-18 |
| [Fonctions utilitaires TypeScript regroupées en classes à membres uniquement statiques, via `@typescript-eslint/no-extraneous-class` configurée en `allowStaticOnly: true`](./14_normesDeveloppement.md#rigueur-du-typage-et-de-la-documentation--typescript) | Suivre la recommandation par défaut du plugin (`allowStaticOnly: false`, fonctions exportées individuellement) | Exigence explicite qu'aucune fonction TypeScript ne soit développée en dehors d'une classe ; la divergence avec la recommandation par défaut de l'outillage est assumée en connaissance de cause | 9 | 2026-07-18 |
| [Typage exhaustif des variables TypeScript assuré par les options `noImplicitAny` et `strictPropertyInitialization` de `tsconfig.json`, plutôt que par une règle ESLint dédiée](./14_normesDeveloppement.md#rigueur-du-typage-et-de-la-documentation--typescript) | Règle `@typescript-eslint/typedef` | `typedef` est dépréciée par l'éditeur de `typescript-eslint` lui-même, qui recommande ces options du compilateur pour atteindre le même objectif sans annotation redondante | 9 | 2026-07-18 |
