# Normes de tests automatisés

## Sommaire

1. [Tests unitaires](#tests-unitaires)
2. [Tests des clients d'API et des services](#tests-des-clients-dapi-et-des-services)
   1. [Tests automatisés, exécutés en intégration continue](#tests-automatisés-exécutés-en-intégration-continue)
   2. [Tests d'intégration, hors intégration continue, contre des instances réelles](#tests-dintégration-hors-intégration-continue-contre-des-instances-réelles)
3. [Tests de bout en bout](#tests-de-bout-en-bout)
4. [Tests de charge et de performance](#tests-de-charge-et-de-performance)
5. [Gestion des données de test](#gestion-des-données-de-test)
6. [Recette et tests d'acceptation utilisateur](#recette-et-tests-dacceptation-utilisateur)
7. [Stratégie de couverture de code](#stratégie-de-couverture-de-code)

## Tests unitaires

Le [Moteur de jugement](./13_conceptionDetaillee.md#détail-des-modulescomposants-et-de-leurs-interfaces) est la priorité de couverture unitaire : chaque fonction de calcul d'un indicateur ([RG-011](./05_reglesGestion.md#constat-jugement-et-politique-ia)) est testée contre des constats connus et des seuils/référentiels connus, y compris les cas limites (valeur exactement au seuil, donnée absente). Ces fonctions étant pures et sans effet de bord (cf. [règles de qualité de code, étape 9](./14_normesDeveloppement.md#règles-de-qualité-de-code)), elles ne nécessitent aucun double ni mock.

Les modules du cœur natif ([Connecteur GitLab, Connecteur Sonar, Connecteur croisé, Moteur de persistance](./13_conceptionDetaillee.md#détail-des-modulescomposants-et-de-leurs-interfaces)) sont testés unitairement en isolant leurs dépendances externes : les connecteurs sont testés sans appel réseau réel (client HTTP simulé), le Moteur de persistance est testé en round-trip complet (sérialisation, compression, chiffrement puis déchiffrement, cf. [stratégie de persistance, étape 7](./12_modeleDonnees.md#stratégie-de-persistance)), y compris le rejet d'un mot de passe incorrect, la migration de schéma palier par palier (cf. [stratégie de migration, étape 7](./12_modeleDonnees.md#stratégie-de-migration-des-données), en vérifiant qu'elle ne se fonde jamais sur `meta.modifieLe` mais uniquement sur `versionSchema`, indépendamment de l'horloge système), le repli sur PBKDF2-SHA256 lorsque les paramètres de dérivation de clé de l'enveloppe ne correspondent à aucune version supportée, le nettoyage d'un fichier temporaire orphelin après une écriture interrompue, et le rejet explicite d'une sauvegarde lorsque le fichier cible est verrouillé par un autre processus (cf. [gestion des erreurs et cas limites, étape 8](./13_conceptionDetaillee.md#gestion-des-erreurs-et-cas-limites-au-niveau-technique)).

L'[Orchestrateur de campagne](./13_conceptionDetaillee.md#détail-des-modulescomposants-et-de-leurs-interfaces) est testé avec des connecteurs GitLab/Sonar simulés à latence contrôlée : respect de la concurrence configurée ([RG-017](./05_reglesGestion.md#audits-et-campagnes)), annulation propre laissant les projets non traités au statut « ignoré » y compris lorsqu'un appel est en vol au moment de l'annulation ([RG-018](./05_reglesGestion.md#audits-et-campagnes), cf. [gestion des erreurs et cas limites, étape 8](./13_conceptionDetaillee.md#gestion-des-erreurs-et-cas-limites-au-niveau-technique)), et détection des variations aberrantes par rapport au dernier audit intégré du même projet ([RG-020](./05_reglesGestion.md#audits-et-campagnes)).

Côté UI, le Store d'état applicatif et l'Index de recherche transversale ([détail des modules, étape 8](./13_conceptionDetaillee.md#détail-des-modulescomposants-et-de-leurs-interfaces)) sont couverts par les mêmes tests Jest : le Store d'état applicatif est testé sans dépendance externe (état local), et l'Index de recherche transversale est testé y compris pour le cas où une recherche est invoquée avant la fin de la construction de l'index, qui doit alors rester désactivée avec un indicateur de chargement explicite (cf. [gestion des erreurs et cas limites, étape 8](./13_conceptionDetaillee.md#gestion-des-erreurs-et-cas-limites-au-niveau-technique), [RNF-005](./07_exigencesNonFonctionnelles.md#performance)).

Conventions d'écriture : `cargo test` côté Rust, avec les tests d'un module regroupés dans un sous-module `#[cfg(test)]` au plus près du code testé ; un framework de test unitaire dédié côté Angular/TypeScript, retenu ci-après. Chaque test suit une structure arrange/act/assert et n'exerce qu'un seul comportement.

| choix technologique | justification |
|---|---|
| [Jest](https://jestjs.io/) pour les tests unitaires Angular/TypeScript | Exécution rapide et headless (sans navigateur réel), bonne prise en charge de TypeScript, écosystème de mocks intégré ; retenu de préférence au couple [Karma](https://karma-runner.github.io/)/[Jasmine](https://jasmine.github.io/) historiquement associé par défaut à Angular, plus lent car dépendant d'un navigateur réel pour chaque exécution |

## Tests des clients d'API et des services

### Tests automatisés, exécutés en intégration continue

Les Connecteurs GitLab et Sonar sont testés contre des réponses HTTP simulées (aucun appel à une instance réelle dans les tests exécutés en intégration continue), construites à partir de fixtures représentatives des réponses documentées en [Specification.md, section 5.5](../01_besoin/Specification.md#55-f05--audits-et-catalogue-des-indicateurs). Chaque catégorie d'anomalie typée définie en [RG-021](./05_reglesGestion.md#audits-et-campagnes) (authentification refusée, ref introuvable, instance injoignable, délai dépassé, réponse inattendue, droits insuffisants) fait l'objet d'au moins un test simulant la réponse HTTP correspondante, afin de vérifier que le connecteur la classe correctement plutôt que de la laisser produire un comportement indéfini (cf. [gestion des erreurs techniques, étape 8](./13_conceptionDetaillee.md#gestion-des-erreurs-et-cas-limites-au-niveau-technique)).

Le respect de la configuration proxy (`HTTP_PROXY`/`HTTPS_PROXY`/`NO_PROXY`, cf. [RNF-023](./07_exigencesNonFonctionnelles.md#portabilité-et-environnements-cibles)) est testé au niveau de la construction du client HTTP, sans nécessiter de proxy réel dans l'environnement de test.

### Tests d'intégration, hors intégration continue, contre des instances réelles

Les tests contre des réponses simulées ne garantissent pas, à eux seuls, la compatibilité des connecteurs avec le comportement réel des instances GitLab et Sonar. Des tests d'intégration distincts appellent donc réellement les instances mises à la disposition du développeur :
- ils sont marqués comme ignorés par défaut (`#[ignore]` côté Rust, mécanisme de tag équivalent côté Jest) et **jamais exécutés par le pipeline d'intégration continue**, faute de credentials et d'instances disponibles dans cet environnement ;
- ils sont déclenchés manuellement par le développeur, qui dispose seul des credentials et de l'accès réseau nécessaires ;
- conformément à la gestion des secrets définie à l'étape 10, les credentials utilisés proviennent exclusivement de variables d'environnement locales au moment de l'exécution, jamais écrits en dur dans le code de test ni committés ([RG-004](./05_reglesGestion.md#stockage-et-confidentialité-des-données)) ;
- leur exécution est recommandée avant toute montée de version majeure d'une dépendance HTTP, ou en cas de doute sur un changement de comportement d'une instance GitLab ou Sonar réelle.

## Tests de bout en bout

Les tests de bout en bout exercent l'application packagée réelle (cœur natif et interface embarquée), et non une simulation limitée au navigateur, afin de couvrir effectivement les commandes de la [Façade de commandes](./13_conceptionDetaillee.md#détail-des-modulescomposants-et-de-leurs-interfaces) et les dialogues natifs (sélection de fichier). Pour rester rejouables de façon déterministe, indépendamment de la disponibilité ou du contenu d'une instance réelle au moment de l'exécution, ils s'exécutent avec les clients d'appel HTTP des Connecteurs bouchonnés (mêmes réponses simulées que les tests automatisés de la section précédente) ; seuls les tests d'intégration décrits ci-dessus exercent de véritables instances GitLab/Sonar, précisément parce qu'ils restent hors du périmètre de la CI.

| choix technologique | justification |
|---|---|
| [tauri-driver](https://tauri.app/develop/tests/webdriver/) (protocole WebDriver) | Solution documentée par le projet Tauri pour piloter l'application packagée réelle, y compris les commandes IPC et les dialogues système ; retenue de préférence à un outil ne pilotant que la vue web embarquée (ex. [Playwright](https://playwright.dev/) seul), qui ne testerait pas l'intégration native |

Le périmètre minimal des tests de bout en bout couvre les quatre séquences détaillées à l'étape 8 — [créer un nouveau fichier de données](./13_conceptionDetaillee.md#créer-un-nouveau-fichier-de-données-us-001), [réaliser une campagne d'audit et intégrer les résultats](./13_conceptionDetaillee.md#réaliser-une-campagne-daudit-et-intégrer-les-résultats-us-009-us-010-us-014), [qualifier un membre inconnu depuis une alerte](./13_conceptionDetaillee.md#qualifier-un-membre-inconnu-depuis-une-alerte-us-022) et [verrouiller et déverrouiller la session](./13_conceptionDetaillee.md#verrouiller-et-déverrouiller-la-session-us-026) — ce dernier correspondant à un domaine de vigilance renforcée acté à l'étape 1 (sécurité et confidentialité des données).

## Tests de charge et de performance

L'application étant locale et sans serveur ([RNF-009](./07_exigencesNonFonctionnelles.md#disponibilité-et-tolérance-aux-pannes)), les tests de charge ne portent pas sur un nombre d'utilisateurs concurrents mais sur la volumétrie de données et la concurrence des appels d'audit :

- un jeu de données synthétique généré à l'échelle définie par [RNF-006](./07_exigencesNonFonctionnelles.md#scalabilité-et-montée-en-charge) (quelques dizaines de groupes, quelques centaines de projets, plusieurs années d'historique) sert de base à des mesures de temps de rendu et de calcul, comparées aux seuils [RNF-001](./07_exigencesNonFonctionnelles.md#performance) (moins de 2 secondes pour la synthèse), [RNF-003](./07_exigencesNonFonctionnelles.md#performance) (moins de 500 millisecondes de calcul local par projet) et [RNF-005](./07_exigencesNonFonctionnelles.md#performance) (moins d'une seconde pour la recherche transversale) ;
- une campagne simulée sur un grand nombre de projets, avec des connecteurs simulés à latence contrôlée, vérifie que la concurrence configurée ([RNF-004](./07_exigencesNonFonctionnelles.md#performance), 4 projets simultanés par défaut) est respectée et que les événements de progression restent réguliers ;
- le temps de dérivation de clé (Argon2id) au chargement et à la sauvegarde du fichier de données est mesuré et comparé au seuil [RNF-002](./07_exigencesNonFonctionnelles.md#performance) (quelques secondes au maximum) ;
- une purge par densité puis une purge par âge sont exécutées sur le jeu de données synthétique à l'échelle de [RNF-006](./07_exigencesNonFonctionnelles.md#scalabilité-et-montée-en-charge), afin de vérifier que la croissance du fichier de données reste contenue dans le temps sans perte de la tendance longue ([RNF-007](./07_exigencesNonFonctionnelles.md#scalabilité-et-montée-en-charge), [RG-024](./05_reglesGestion.md#seuils-référentiels-et-historisation), [RG-025](./05_reglesGestion.md#seuils-référentiels-et-historisation)).

## Gestion des données de test

Les jeux de données de test sont exclusivement synthétiques : aucune donnée réelle de production (nom de projet, identifiant de collaborateur, URL d'instance interne) n'est committée dans le dépôt. Le fichier [`exemple-donnees.json`](../01_besoin/exemple-donnees.json), livré avec le dossier de besoin, sert de point de départ : il s'agit d'un jeu d'exemple fictif (déduit du fait qu'il est présenté comme tel en [Specification.md, section 6.4](../01_besoin/Specification.md#64-fichiers-livrés-avec-cette-spécification)), sans donnée personnelle réelle à anonymiser. Tout jeu de données de test complémentaire créé pour les besoins des tests suit la même règle : identités et organisations fictives, dans le même esprit que les exemples déjà fournis.

Conformément à l'action tracée dans le [plan de mise en place](../03_plan/plan_01_miseEnPlace.md#actions-issues-de-létape-1--modalités-dusage-de-lia-et-glossaire) (action dont l'étape d'origine est l'étape 7, modèle de données), les futurs fichiers de données de test au format chiffré (extension `.sqm`) restent exclus de la lecture directe par l'IA.

## Recette et tests d'acceptation utilisateur

Aucune partie prenante autre que l'utilisateur unique n'a été identifiée à l'étape 2 (cf. [Parties prenantes](./03_expressionBesoin.md#parties-prenantes)) : il n'y a donc pas de recette formelle avec un tiers. La recette consiste en une checklist manuelle, rejouée par l'utilisateur avant toute mise à disposition d'une version, reprenant les [parcours utilisateurs principaux et alternatifs définis à l'étape 5](./06_parcoursUtilisateurs.md#parcours-principaux) sur un jeu de données réaliste, avec une attention particulière portée aux domaines de vigilance renforcée actés à l'étape 1 (calcul des indicateurs, sécurité et confidentialité des données, conformité aux référentiels externes).

## Stratégie de couverture de code

| périmètre | seuil visé |
|---|---|
| [Moteur de jugement](./13_conceptionDetaillee.md#détail-des-modulescomposants-et-de-leurs-interfaces) (fonctions pures de calcul des indicateurs) | 90 % |
| Cœur natif — Connecteurs, Moteur de persistance, Orchestrateur de campagne, Façade de commandes | 80 % |
| UI — Store d'état applicatif, Index de recherche transversale (logique applicative hors présentation) | 80 % |
| UI — écrans et composants de présentation | Aucun seuil chiffré de couverture en pourcentage de lignes ; le rapport effort/valeur d'un test unitaire de mise en page étant jugé défavorable, ces composants sont couverts principalement par les tests de bout en bout des parcours principaux |
| Code généré (bindings Tauri générés, fichiers de configuration) | Exclu de la mesure de couverture, n'étant pas du code métier propre au projet |

La couverture est mesurée par [cargo-llvm-cov](https://github.com/taiki-e/cargo-llvm-cov) côté Rust (basé sur l'instrumentation native du compilateur, plus précis que les solutions historiques comme `cargo-tarpaulin`) et par la couverture intégrée de [Jest](https://jestjs.io/docs/configuration#collectcoverage-boolean) (Istanbul) côté TypeScript ; l'intégration de ces mesures et de leurs seuils au pipeline d'intégration continue est détaillée en [mise en place du pipeline, étape 12](./18_pic.md#mise-en-place-du-pipeline).

Pour les composants graphiques (écrans et composants de présentation), l'indicateur suivi n'est pas le pourcentage de lignes couvertes mais le **nombre de méthodes ou fonctions jamais appelées** par l'ensemble des tests (unitaires et de bout en bout), tel que restitué par le rapport de couverture par fonctions de Jest/Istanbul. Une méthode jamais appelée signale soit un scénario ou un cas d'usage de l'application non exercé par les tests existants, soit du code mort à retirer : cet indicateur se veut plus révélateur de la complétude des scénarios de test que la seule proportion de lignes exécutées, un pourcentage de lignes élevé pouvant masquer des branches ou des méthodes entières jamais sollicitées.
