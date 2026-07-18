# Architecture technique et choix technologiques

## Sommaire

1. [Style architectural retenu et justification](#style-architectural-retenu-et-justification)
2. [Patterns d'architecture et de conception retenus](#patterns-darchitecture-et-de-conception-retenus)
3. [Choix technologiques structurants](#choix-technologiques-structurants)
4. [Alternatives écartées et justification](#alternatives-écartées-et-justification)
5. [Découpage en composants/modules et responsabilités](#découpage-en-composantsmodules-et-responsabilités)
6. [Dépendances externes](#dépendances-externes)
7. [Stratégie d'évolutivité](#stratégie-dévolutivité)
8. [Stratégie de gestion d'état et de communication](#stratégie-de-gestion-détat-et-de-communication)

## Style architectural retenu et justification

L'architecture retenue est une **application de bureau hybride, monolithique et sans serveur** : un cœur applicatif natif (accès disque, cryptographie, appels réseau sortants) communique en local, par un canal de commandes et d'événements, avec une interface utilisateur web embarquée (SPA). Il ne s'agit pas d'une architecture client/serveur au sens réseau : aucun composant n'est distant, l'ensemble s'exécute sur le poste de l'utilisateur.

Ce style découle directement de contraintes déjà actées :
- les instances GitLab et SonarQube sont protégées par des en-têtes CORS, sans effet en dehors d'un navigateur : seul un exécuteur HTTP hors sandbox navigateur peut les interroger (cf. [Specification.md, section 1.1](./01_besoin/Specification.md#11-architecture-retenue)) ;
- l'accès à ces instances passe fréquemment par un proxy d'entreprise, nécessitant un client HTTP capable de respecter `HTTP_PROXY`/`HTTPS_PROXY`/`NO_PROXY` et de faire confiance à un bundle d'autorité de certification interne ;
- l'application doit rester « 100 % locale, sans base SQL ni serveur » (cf. [Specification.md, section 2](./01_besoin/Specification.md#2-objectifs)), ce qui exclut toute architecture client/serveur distante ;
- le chiffrement fort du fichier de données ([RNF-012](./07_exigencesNonFonctionnelles.md#sécurité)) est mieux maîtrisé dans un langage mémoire-sûr proche du système que depuis une couche purement JavaScript.

## Patterns d'architecture et de conception retenus

| pattern | justification |
|---|---|
| Architecture en couches (cœur natif) : connecteurs, moteur de calcul, persistance, façade de commandes | Isole la logique métier (calcul du jugement) des détails d'infrastructure (API externes, format de fichier), facilitant l'évolution du catalogue d'indicateurs sans toucher aux couches voisines |
| Repository pour l'accès au fichier de données | Centralise sérialisation, compression, chiffrement et migration de schéma derrière une façade unique, évitant toute dispersion d'accès disque |
| Adapter / Connecteur pour les sources (GitLab, Sonar) | Chaque source implémente une interface commune (cf. [Specification.md, section 5.5](./01_besoin/Specification.md#55-f05--audits-et-catalogue-des-indicateurs)) ; facilite l'ajout futur d'un type de source sans réécrire le moteur d'audit |
| Command (commandes explicites cœur natif ↔ UI) | Rend explicite la frontière entre mutation (lancer un audit, sauvegarder, qualifier un membre) et lecture d'état, cohérente avec la frontière constat/jugement ([RG-011](./05_reglesGestion.md#constat-jugement-et-politique-ia)) |
| Programmation réactive côté UI (flux d'état observables) | Nécessaire pour refléter en temps réel la progression d'une campagne d'audit asynchrone et multi-projets ([F06](./01_besoin/Specification.md#56-f06--tableau-de-bord-dexécution-daudit)) sans réimplémenter un mécanisme de polling ad hoc |

## Choix technologiques structurants

Le dossier source mentionnait déjà, à titre indicatif, un cœur Rust, une interface Angular (Signals, RxJS) et un packaging Tauri (cf. [Specification.md, section 1.1](./01_besoin/Specification.md#11-architecture-retenue)), ainsi que la chaîne cryptographique zstd/Argon2id/AES-256-GCM (cf. [Specification.md, section 6.3](./01_besoin/Specification.md#63-enveloppe-chiffrée)) ; conformément à [RNF-021](./07_exigencesNonFonctionnelles.md#portabilité-et-environnements-cibles), ces choix n'étaient pas encore actés avant cette étape. Ils sont **confirmés** ci-dessous, pour les raisons détaillées dans la colonne « justification ». Le choix d'ECharts et celui du rendu DOM vers image pour les exports hors graphiques sont, à l'inverse, des choix **nouveaux** de cette étape, non suggérés dans le dossier source.

| choix technologique | justification |
|---|---|
| Cœur applicatif natif en [Rust](https://www.rust-lang.org/) | Accès disque et cryptographie maîtrisés dans un langage mémoire-sûr ; client HTTP hors sandbox navigateur, contournant la contrainte CORS ; gestion fine du proxy d'entreprise et du bundle CA interne ; écosystème [RustCrypto](https://github.com/RustCrypto) mature pour Argon2id/AES-256-GCM |
| Interface utilisateur en [Angular](https://angular.dev/) (TypeScript), [Signals](https://angular.dev/guide/signals) pour l'état réactif local, [RxJS](https://rxjs.dev/) pour l'orchestration asynchrone | Typage fort adapté à un modèle de données riche et versionné (26 fonctionnalités interdépendantes) ; Signals adaptés à la réactivité fine des tableaux denses et du tableau de bord temps réel ; RxJS adapté à l'orchestration de campagnes d'audit concurrentes |
| Framework de packaging desktop combinant cœur natif et UI web embarquée ([Tauri](https://tauri.app/)) | Permet une distribution native sur Windows, macOS et Linux ([RNF-021](./07_exigencesNonFonctionnelles.md#portabilité-et-environnements-cibles)) à partir d'une base de code unique, avec une empreinte mémoire/disque réduite par rapport aux alternatives à moteur Node.js embarqué |
| [ECharts](https://echarts.apache.org/) pour la synthèse graphique | Zoom temporel, superposition de séries et export natif en image, répondant directement aux besoins de [F11](./01_besoin/Specification.md#511-f11--synthèse-graphique) et de l'export PNG ([F25](./01_besoin/Specification.md#525-f25--exports-png)) |
| [zstd](https://github.com/facebook/zstd) (compression) + [Argon2id](https://www.rfc-editor.org/rfc/rfc9106) (dérivation de clé) + [AES-256-GCM](https://nvlpubs.nist.gov/nistpubs/legacy/sp/nistspecialpublication800-38d.pdf) (chiffrement authentifié) | Chaîne cryptographique standard et éprouvée, détaillée en [RNF-012](./07_exigencesNonFonctionnelles.md#sécurité), disponible en crates [RustCrypto](https://github.com/RustCrypto) |
| Rendu DOM vers image pour les exports PNG hors graphiques (fiche projet, synthèse, comparaison) | Complète l'export natif d'ECharts, qui ne couvre que les graphiques, pour satisfaire [F25](./01_besoin/Specification.md#525-f25--exports-png) sur l'ensemble des écrans concernés |

## Alternatives écartées et justification

| alternative écartée | justification |
|---|---|
| Application web classique (SPA + backend serveur) | Contraire à la contrainte « 100 % locale, sans base SQL ni serveur » (cf. [Specification.md, section 2](./01_besoin/Specification.md#2-objectifs)) ; n'aurait pas résolu la contrainte CORS, un serveur relais introduisant à son tour une surface d'attaque et une dépendance d'hébergement non souhaitées |
| [Electron](https://www.electronjs.org/) (cœur Node.js) | Empreinte mémoire/disque significativement plus élevée qu'un cœur Rust ; la cryptographie et le client HTTP y dépendraient de bindings natifs supplémentaires plutôt que d'un écosystème natif mémoire-sûr |
| Framework front [React](https://react.dev/) ou [Vue](https://vuejs.org/) | Le typage fort et la structure imposée par Angular sont jugés mieux adaptés à un modèle de données riche, versionné et fortement contraint par un schéma JSON ; Signals et RxJS couvrent nativement les besoins de réactivité fine et d'orchestration asynchrone du projet |
| Base de données embarquée ([SQLite](https://www.sqlite.org/), [IndexedDB](https://developer.mozilla.org/fr/docs/Web/API/IndexedDB_API)) | Le principe d'un fichier chiffré unique et portable est jugé plus simple à raisonner, sauvegarder et transporter qu'un moteur de base de données embarqué, pour la volumétrie visée ([RNF-006](./07_exigencesNonFonctionnelles.md#scalabilité-et-montée-en-charge)) |
| Notifications système ou synchronisation cloud entre postes | Explicitement hors périmètre depuis l'étape 2 (pas de notification automatique, pas de synchronisation multi-poste) |

## Découpage en composants/modules et responsabilités

| composant / module | responsabilité |
|---|---|
| Cœur natif — Connecteur GitLab | Interroge l'API GitLab (dépendances, branches, vitalité, contributeurs, taille, merge requests, marqueurs IA, membres) en respectant la configuration proxy |
| Cœur natif — Connecteur Sonar | Interroge l'API SonarQube (violations, dette technique, couverture, notes, ncloc) |
| Cœur natif — Connecteur croisé | Calcule les résultats croisés (`croise.*`) à partir des résultats des deux connecteurs précédents (fraîcheur Sonar, activité sans qualité, IA et nouveau code) |
| Cœur natif — Moteur de persistance | Sérialisation, compression, chiffrement/déchiffrement, migration de version de schéma, sauvegardes de sécurité horodatées |
| Cœur natif — Orchestrateur de campagne | Planifie et exécute les audits d'un périmètre avec une concurrence limitée, gère la reprise et l'annulation, alimente le brouillon |
| Cœur natif — Façade de commandes | Expose à l'interface un ensemble de commandes et de requêtes typées ; frontière unique entre l'UI et le cœur natif |
| UI — Moteur de jugement | Calcule à l'affichage les statuts, badges et classes à partir des constats et des référentiels/seuils courants, sans jamais les persister ([RG-011](./05_reglesGestion.md#constat-jugement-et-politique-ia)) |
| UI — Écrans et navigation | Implémente les écrans de l'arborescence et les règles de navigation définies à l'étape 5 |
| UI — Store d'état applicatif | État réactif local : session en cours, filtres actifs, vues enregistrées sélectionnées |
| UI — Index de recherche transversale | Index construit en mémoire à l'ouverture du fichier pour la recherche transversale ([F16](./01_besoin/Specification.md#516-f16--recherche-transversale)) |

## Dépendances externes

| dépendance externe | modalité d'intégration |
|---|---|
| API d'une ou plusieurs instances GitLab | Appels HTTP authentifiés (en-tête `PRIVATE-TOKEN`) depuis le cœur natif, credentials transmis en mémoire uniquement, à travers le proxy configuré du poste |
| API d'une ou plusieurs instances SonarQube | Appels HTTP authentifiés (`Authorization: Bearer`) depuis le cœur natif, mêmes modalités que ci-dessus |
| Aucune autre dépendance externe | Conformément au périmètre explicitement exclu à l'étape 2 : pas d'autre connecteur, pas de service cloud, pas de notification externe |

## Stratégie d'évolutivité

- L'interface commune de connecteur (pattern Adapter) permet d'envisager, hors périmètre actuel, l'ajout d'un nouveau type de source sans réécrire le moteur d'audit ni remettre en cause le modèle constat/jugement.
- Le discriminant `type` des résultats, de la forme `origine.nature` (cf. [Specification.md, section 6.2](./01_besoin/Specification.md#62-règles-transverses)), permet d'ajouter de nouveaux types d'indicateurs sans modifier le moteur, les filtres ou les graphiques existants.
- Le versionnement indépendant du schéma de données et de l'enveloppe chiffrée (cf. [Specification.md, section 6.3](./01_besoin/Specification.md#63-enveloppe-chiffrée)) permet de faire évoluer séparément la structure fonctionnelle et les paramètres cryptographiques sans casser les fichiers existants.
- La séparation stricte entre la façade de commandes et l'UI limite le couplage : une évolution ultérieure du framework d'interface resterait cantonnée à la couche UI tant que le contrat de commandes reste stable.

## Stratégie de gestion d'état et de communication

- La communication entre le cœur natif et l'UI se fait par des commandes typées invoquées depuis l'UI (mutations : lancer un audit, sauvegarder, qualifier un membre) et par des événements poussés par le cœur natif vers l'UI (progression de campagne en temps réel) : un canal de commandes/événements local, jamais un flux réseau.
- L'état « constat » (résultats d'audit) est possédé et validé par le cœur natif, dont le fichier chiffré constitue la source de vérité ; l'état « jugement » (indicateurs calculés) est dérivé côté UI à partir des constats et des référentiels courants, et n'est jamais persisté ([RG-011](./05_reglesGestion.md#constat-jugement-et-politique-ia)) : c'est la frontière la plus structurante de la gestion d'état de l'application.
- L'état volatile sensible (credentials, clé dérivée) est cantonné à la mémoire du cœur natif et à un store mémoire dédié côté UI, jamais sérialisé, et purgé au verrouillage ([RG-004](./05_reglesGestion.md#stockage-et-confidentialité-des-données), [RG-005](./05_reglesGestion.md#stockage-et-confidentialité-des-données)).
- L'état de session de l'interface (filtres actifs, écran courant, vue sélectionnée) est un état local réactif, non persisté, sauf lorsqu'il est explicitement enregistré comme vue nommée ([F22](./01_besoin/Specification.md#522-f22--modèles-de-vues-enregistrées)).
