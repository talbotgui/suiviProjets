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
8. [Matrice de traçabilité](#matrice-de-traçabilité)

## Tests unitaires

Le [Moteur de jugement](./13_conceptionDetaillee.md#détail-des-modulescomposants-et-de-leurs-interfaces) est la priorité de couverture unitaire : chaque fonction de calcul d'un indicateur ([RG-011](./05_reglesGestion.md#constat-jugement-et-politique-ia)) est testée contre des constats connus et des seuils/référentiels connus, y compris les cas limites (valeur exactement au seuil, donnée absente). Ces fonctions étant pures et sans effet de bord (cf. [règles de qualité de code, étape 9](./14_normesDeveloppement.md#règles-de-qualité-de-code)), elles ne nécessitent aucun double ni mock.

Les modules du cœur natif ([Connecteur GitLab, Connecteur Sonar, Moteur de persistance](./13_conceptionDetaillee.md#détail-des-modulescomposants-et-de-leurs-interfaces)) sont testés unitairement en isolant leurs dépendances externes : les connecteurs sont testés sans appel réseau réel (client HTTP simulé), le Moteur de persistance est testé en round-trip complet (sérialisation, compression, chiffrement puis déchiffrement, cf. [stratégie de persistance, étape 7](./12_modeleDonnees.md#stratégie-de-persistance)), y compris le rejet d'un mot de passe incorrect, la migration de schéma palier par palier (cf. [stratégie de migration, étape 7](./12_modeleDonnees.md#stratégie-de-migration-des-données), en vérifiant qu'elle ne se fonde jamais sur `meta.modifieLe` mais uniquement sur `versionSchema`, indépendamment de l'horloge système), le repli sur PBKDF2-SHA256 lorsque les paramètres de dérivation de clé de l'enveloppe ne correspondent à aucune version supportée, le nettoyage d'un fichier temporaire orphelin après une écriture interrompue, et le rejet explicite d'une sauvegarde lorsque le fichier cible est verrouillé par un autre processus (cf. [gestion des erreurs et cas limites, étape 8](./13_conceptionDetaillee.md#gestion-des-erreurs-et-cas-limites-au-niveau-technique)). La [Façade de commandes](./13_conceptionDetaillee.md#détail-des-modulescomposants-et-de-leurs-interfaces) n'est pas testée isolément : chaque commande qu'elle expose est exercée par les tests unitaires du module qu'elle route (connecteurs, Moteur de persistance) ainsi que par les [tests de bout en bout](#tests-de-bout-en-bout), qui couvrent explicitement les commandes IPC réellement invoquées par l'interface packagée.

Côté UI, l'[Orchestrateur de campagne et le Connecteur croisé](./13_conceptionDetaillee.md#détail-des-modulescomposants-et-de-leurs-interfaces) sont testés en Jest avec la Façade de commandes simulée (réponses des opérations Connecteur GitLab/Sonar à latence contrôlée) : respect de la concurrence configurée ([RG-017](./05_reglesGestion.md#audits-et-campagnes)), annulation propre laissant les projets non traités au statut « ignoré » y compris lorsqu'un appel est en vol au moment de l'annulation ([RG-018](./05_reglesGestion.md#audits-et-campagnes), cf. [gestion des erreurs et cas limites, étape 8](./13_conceptionDetaillee.md#gestion-des-erreurs-et-cas-limites-au-niveau-technique)), détection des variations aberrantes par rapport au dernier audit intégré du même projet ([RG-020](./05_reglesGestion.md#audits-et-campagnes)), et exactitude des calculs croisés (fraîcheur Sonar, activité sans qualité, IA et nouveau code) à partir de résultats GitLab/Sonar connus.

Le Store d'état applicatif et l'Index de recherche transversale ([détail des modules, étape 8](./13_conceptionDetaillee.md#détail-des-modulescomposants-et-de-leurs-interfaces)) sont couverts par les mêmes tests Jest : le Store d'état applicatif est testé sans dépendance externe (état local), et l'Index de recherche transversale est testé y compris pour le cas où une recherche est invoquée avant la fin de la construction de l'index, qui doit alors rester désactivée avec un indicateur de chargement explicite (cf. [gestion des erreurs et cas limites, étape 8](./13_conceptionDetaillee.md#gestion-des-erreurs-et-cas-limites-au-niveau-technique), [RNF-005](./07_exigencesNonFonctionnelles.md#performance)).

Conventions d'écriture : `cargo test` côté Rust, avec les tests d'un module regroupés dans un sous-module `#[cfg(test)]` au plus près du code testé ; un framework de test unitaire dédié côté Angular/TypeScript, retenu ci-après. Chaque test suit une structure arrange/act/assert et n'exerce qu'un seul comportement.

| choix technologique | justification |
|---|---|
| [Jest](https://jestjs.io/) pour les tests unitaires Angular/TypeScript | Exécution rapide et headless (sans navigateur réel), bonne prise en charge de TypeScript, écosystème de mocks intégré ; retenu de préférence au couple [Karma](https://karma-runner.github.io/)/[Jasmine](https://jasmine.github.io/) historiquement associé par défaut à Angular, plus lent car dépendant d'un navigateur réel pour chaque exécution |

## Tests des clients d'API et des services

### Tests automatisés, exécutés en intégration continue

Les Connecteurs GitLab et Sonar sont testés contre des réponses HTTP simulées (aucun appel à une instance réelle dans les tests exécutés en intégration continue), construites à partir de fixtures représentatives des réponses documentées en [Specification.md, section 5.5](../01_besoin/Specification.md#55-f05--audits-et-catalogue-des-indicateurs). Chaque catégorie d'anomalie typée définie en [RG-021](./05_reglesGestion.md#audits-et-campagnes) (authentification refusée, ref introuvable, instance injoignable, délai dépassé, réponse inattendue, droits insuffisants), ainsi que l'extension `depotVide` (dépôt GitLab sans commit, `GET /projects/{id}` sans `default_branch`, ajoutée le 2026-08-27), fait l'objet d'au moins un test simulant la réponse HTTP correspondante, afin de vérifier que le connecteur la classe correctement plutôt que de la laisser produire un comportement indéfini (cf. [gestion des erreurs techniques, étape 8](./13_conceptionDetaillee.md#gestion-des-erreurs-et-cas-limites-au-niveau-technique)). Pour `interrogerMembres`, la ventilation US-017 (rattachement de chaque membre à `direct` et `groupesInvites`) est testée sur un cas nominal — membre direct, membre d'un ou plusieurs groupes invités trié du plus précis vers la racine, membre hérité — et sur son absorption silencieuse d'une anomalie (statut 403 sur `GET /projects/{id}`, les membres non directs retombant en « hérités » sans faire échouer l'interrogation). Pour `interrogerDependances` (Maven, RG-050), la reconstruction de la chaîne des `<parent>` est testée sur un module situé à plusieurs niveaux de la racine sans `<relativePath>` (rattachement par coordonnées `groupId:artifactId`, `${x.version}` et `<dependencyManagement>` de la racine correctement hérités), sur la conservation du repli par `<relativePath>` quand le parent n'a pas d'identité explicite, et sur le report du chemin réel du manifeste dans `Dependance.manifeste`.

Le respect de la configuration proxy (`HTTP_PROXY`/`HTTPS_PROXY`/`NO_PROXY`, cf. [RNF-023](./07_exigencesNonFonctionnelles.md#portabilité-et-environnements-cibles)) est testé au niveau de la construction du client HTTP, sans nécessiter de proxy réel dans l'environnement de test.

### Tests d'intégration, hors intégration continue, contre des instances réelles

Les tests contre des réponses simulées ne garantissent pas, à eux seuls, la compatibilité des connecteurs avec le comportement réel des instances GitLab et Sonar. Des tests d'intégration distincts appellent donc réellement les instances mises à la disposition du développeur :
- ils sont marqués comme ignorés par défaut (`#[ignore]` côté Rust, mécanisme de tag équivalent côté Jest) et **jamais exécutés par le pipeline d'intégration continue**, faute de credentials et d'instances disponibles dans cet environnement ;
- ils sont déclenchés manuellement par le développeur, qui dispose seul des credentials et de l'accès réseau nécessaires ;
- conformément à la gestion des secrets définie à l'étape 10, les credentials utilisés proviennent exclusivement de variables d'environnement locales au moment de l'exécution, jamais écrits en dur dans le code de test ni committés ([RG-004](./05_reglesGestion.md#stockage-et-confidentialité-des-données)) ;
- leur exécution est recommandée avant toute montée de version majeure d'une dépendance HTTP, ou en cas de doute sur un changement de comportement d'une instance GitLab ou Sonar réelle.

## Tests de bout en bout

Décision révisée à la Phase 12 (`docs/03_plan/plan_13_developpement.md#phase-12--test-de-bout-en-bout-playwright-ng-serve`) : les tests de bout en bout exercent l'application en mode `ng serve` (interface Angular seule, sans cœur natif), la [Façade de commandes](./13_conceptionDetaillee.md#détail-des-modulescomposants-et-de-leurs-interfaces) étant intégralement bouchonnée côté TypeScript (`src/app/services/sansetat/commandes/bouchon/`) plutôt que les clients d'appel HTTP des Connecteurs Rust. Cette décision remplace le choix initialement acté ci-dessous (tauri-driver sur l'application packagée), non le complète : le compromis qui en résulte est assumé explicitement plutôt que passé sous silence.

| choix technologique | justification |
|---|---|
| ~~[tauri-driver](https://tauri.app/develop/tests/webdriver/) (protocole WebDriver)~~ — abandonné à la Phase 12 | Solution documentée par le projet Tauri pour piloter l'application packagée réelle ; nécessite un harnais WebDriver jamais mis en place (cf. Phase 13 différée), plus coûteuse à exploiter en local et en CI qu'un outil pilotant la seule vue web |
| [Playwright](https://playwright.dev/), contre `ng serve` | Retenu à la Phase 12 (arbitrage humain explicite) : exécution rapide et déterministe, sans dépendance à un harnais WebDriver externe, immédiatement exploitable en CI. **Compromis assumé** : n'exerce ni le pont IPC natif réel (commandes Tauri traversant réellement vers le cœur Rust), ni les dialogues système natifs (sélection de fichier), ni la Content Security Policy de l'application packagée — ces aspects restent un residu non couvert par les tests automatisés tant qu'aucun harnais tauri-driver n'est mis en place |

Pour rester rejouables de façon strictement déterministe, indépendamment de toute donnée aléatoire, les tests de bout en bout n'exercent que le bouchon TypeScript de la Façade de commandes (jamais une instance GitLab/Sonar réelle, jamais le connecteur HTTP réel) : les valeurs saisies par le test sont toujours fixes, jamais générées aléatoirement. Le seul aléa restant, hérité du bouchon Sonar (`± 10 %` sur violations/dette/couverture, cf. en-tête de `bouchon-commandes.utils.ts`), n'est pas supprimé (il sert aussi au test manuel en `ng serve`) : les assertions portant sur ces indicateurs utilisent des bornes tolérantes plutôt que des valeurs exactes. Les commandes d'interrogation GitLab/Sonar d'une campagne d'audit introduisent par ailleurs un délai artificiel fixe (jamais aléatoire), afin que le test exerce réellement l'indicateur de chargement et la progression de campagne plutôt qu'une résolution instantanée qui masquerait ces comportements.

Le périmètre des tests de bout en bout couvre désormais l'intégralité des écrans de l'application (parcours unique documenté par la Phase 12 du plan), et non les seules quatre séquences minimales initialement actées à l'étape 8 : [créer un nouveau fichier de données](./13_conceptionDetaillee.md#créer-un-nouveau-fichier-de-données-us-001), [réaliser une campagne d'audit et intégrer les résultats](./13_conceptionDetaillee.md#réaliser-une-campagne-daudit-et-intégrer-les-résultats-us-009-us-010-us-014), [qualifier un membre inconnu depuis une alerte](./13_conceptionDetaillee.md#qualifier-un-membre-inconnu-depuis-une-alerte-us-022) et [verrouiller et déverrouiller la session](./13_conceptionDetaillee.md#verrouiller-et-déverrouiller-la-session-us-026) — ces quatre séquences restent couvertes, désormais intégrées au parcours complet plutôt qu'isolées.

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
| Cœur natif — Connecteurs, Moteur de persistance, Façade de commandes | 80 % |
| UI — Orchestrateur de campagne, Connecteur croisé, Store d'état applicatif, Index de recherche transversale (logique applicative hors présentation) | 80 % |
| UI — écrans et composants de présentation | Aucun seuil chiffré de couverture en pourcentage de lignes ; le rapport effort/valeur d'un test unitaire de mise en page étant jugé défavorable, ces composants sont couverts principalement par les tests de bout en bout des parcours principaux |
| Code généré (bindings Tauri générés, fichiers de configuration) | Exclu de la mesure de couverture, n'étant pas du code métier propre au projet |

La couverture est mesurée par [cargo-llvm-cov](https://github.com/taiki-e/cargo-llvm-cov) côté Rust (basé sur l'instrumentation native du compilateur, plus précis que les solutions historiques comme `cargo-tarpaulin`) et par la couverture intégrée de [Jest](https://jestjs.io/docs/configuration#collectcoverage-boolean) (Istanbul) côté TypeScript ; l'intégration de ces mesures et de leurs seuils au pipeline d'intégration continue est détaillée en [mise en place du pipeline, étape 12](./18_pic.md#mise-en-place-du-pipeline). Les rapports HTML des deux mesures, dont le rapport de couverture par fonctions des composants graphiques ci-dessous, sont publiés sur GitHub Pages à chaque création d'une release (Phase 14, [plan_13_developpement.md#phase-14](../03_plan/plan_13_developpement.md#phase-14--intégration-continue-empaquetage-et-publication)), plutôt qu'en simple artefact de run éphémère.

Pour les composants graphiques (écrans et composants de présentation), l'indicateur suivi n'est pas le pourcentage de lignes couvertes mais le **nombre de méthodes ou fonctions jamais appelées** par l'ensemble des tests (unitaires et de bout en bout), tel que restitué par le rapport de couverture par fonctions de Jest/Istanbul. Une méthode jamais appelée signale soit un scénario ou un cas d'usage de l'application non exercé par les tests existants, soit du code mort à retirer : cet indicateur se veut plus révélateur de la complétude des scénarios de test que la seule proportion de lignes exécutées, un pourcentage de lignes élevé pouvant masquer des branches ou des méthodes entières jamais sollicitées.

Précision : un seuil `coverageThreshold` de Jest ciblé par motif de chemin sur un périmètre ne contenant encore aucun fichier réel fait échouer `jest --coverage` dès son exécution (« Coverage data for ... was not found »), y compris en l'absence de toute anomalie de couverture réelle. Un seuil par périmètre pré-configuré avant l'existence du code qu'il mesure n'est donc déclaré dans la configuration Jest que sous condition — activé automatiquement, sans intervention supplémentaire, dès qu'au moins un fichier réel apparaît sous le périmètre concerné — plutôt que sous une forme statique qui échouerait immédiatement sur un périmètre encore vide.

## Matrice de traçabilité

| module / composant ([étape 8](./13_conceptionDetaillee.md#détail-des-modulescomposants-et-de-leurs-interfaces)) | test(s) couvrant ou exclusion justifiée |
|---|---|
| Cœur natif — Connecteur GitLab | [Tests unitaires](#tests-unitaires) (client HTTP simulé) ; [tests des clients d'API et des services](#tests-des-clients-dapi-et-des-services) (anomalies typées, tests d'intégration hors CI) |
| Cœur natif — Connecteur Sonar | [Tests unitaires](#tests-unitaires) (client HTTP simulé) ; [tests des clients d'API et des services](#tests-des-clients-dapi-et-des-services) (anomalies typées, tests d'intégration hors CI) |
| Cœur natif — Moteur de persistance | [Tests unitaires](#tests-unitaires) (round-trip chiffrement, migration, cas limites de sauvegarde) ; [tests de charge et de performance](#tests-de-charge-et-de-performance) (temps de dérivation de clé) |
| Cœur natif — Façade de commandes | Exercée par les tests unitaires des modules routés et par les [tests de bout en bout](#tests-de-bout-en-bout) (commandes IPC), non testée isolément (cf. [Tests unitaires](#tests-unitaires)) |
| UI — Connecteur croisé | [Tests unitaires](#tests-unitaires) (exactitude des calculs croisés) |
| UI — Orchestrateur de campagne | [Tests unitaires](#tests-unitaires) (concurrence, annulation, détection des aberrations) |
| UI — Moteur de jugement | [Tests unitaires](#tests-unitaires) (priorité de couverture, seuil 90 %, cf. [Stratégie de couverture de code](#stratégie-de-couverture-de-code)) |
| UI — Écrans et navigation | [Tests de bout en bout](#tests-de-bout-en-bout) (parcours Playwright unique couvrant l'ensemble des écrans, Phase 12) ; couverture par fonctions pour le reste des scénarios (cf. [Stratégie de couverture de code](#stratégie-de-couverture-de-code)) |
| UI — Store d'état applicatif | [Tests unitaires](#tests-unitaires) (état local, sans dépendance externe) |
| UI — Index de recherche transversale | [Tests unitaires](#tests-unitaires) (recherche invoquée avant fin de construction de l'index) |

| cas limite technique ([étape 8](./13_conceptionDetaillee.md#gestion-des-erreurs-et-cas-limites-au-niveau-technique)) | test(s) couvrant ou exclusion justifiée |
|---|---|
| Écriture interrompue | [Tests unitaires](#tests-unitaires) (nettoyage d'un fichier temporaire orphelin) |
| Dérivation de clé incompatible | [Tests unitaires](#tests-unitaires) (repli sur PBKDF2-SHA256) |
| Délai réseau dépassé | [Tests automatisés, exécutés en intégration continue](#tests-automatisés-exécutés-en-intégration-continue) (catégorie d'anomalie « délai dépassé ») |
| Réponse HTTP inattendue | [Tests automatisés, exécutés en intégration continue](#tests-automatisés-exécutés-en-intégration-continue) (catégorie d'anomalie « réponse inattendue ») |
| Fichier de données verrouillé par un autre processus | [Tests unitaires](#tests-unitaires) (rejet explicite de la sauvegarde) |
| Horloge système incohérente | [Tests unitaires](#tests-unitaires) (migration fondée uniquement sur `versionSchema`) |
| Recherche transversale invoquée avant la fin de l'indexation | [Tests unitaires](#tests-unitaires) (Index de recherche transversale) |
| Annulation de campagne pendant un appel en vol | [Tests unitaires](#tests-unitaires) (Orchestrateur de campagne) |
| Ventilation des membres du dépôt indisponible (US-017 : `GET /projects/{id}` ou `GET /groups/{id}/members` en échec) | [Tests unitaires](#tests-unitaires) (Connecteur GitLab : anomalie absorbée, membres reclassés « hérités » ; migration `8` → `9` restituant les membres d'un audit antérieur en section « directs ») ; [Tests unitaires](#tests-unitaires) UI (`SqmFicheProjetComponent` : ventilation en trois sections, décompte par statut, dépliage à l'export PNG) |
| `pom.xml` parent d'un module multi-niveaux non résolu par `<relativePath>` (RG-050 : héritage `<properties>`/`<dependencyManagement>` de la racine) | [Tests unitaires](#tests-unitaires) (Connecteur GitLab : rattachement du `<parent>` par coordonnées quand le `<relativePath>` par défaut ne mène nulle part, repli conservé quand les coordonnées sont inconnues, chemin réel du manifeste porté par `Dependance.manifeste` dans un round-trip `interrogerDependances`) ; [Tests unitaires](#tests-unitaires) UI (`AgregationThemeFicheProjetUtils` : deux lignes conservées pour une même coordonnée en versions différentes) |

| exigence non fonctionnelle ([performance et scalabilité, étape 4](./07_exigencesNonFonctionnelles.md#performance)) | test(s) couvrant ou exclusion justifiée |
|---|---|
| [RNF-001](./07_exigencesNonFonctionnelles.md#performance) (synthèse affichée en moins de 2 secondes) | [Tests de charge et de performance](#tests-de-charge-et-de-performance), 1ᵉʳ point |
| [RNF-002](./07_exigencesNonFonctionnelles.md#performance) (dérivation de clé en quelques secondes au maximum) | [Tests de charge et de performance](#tests-de-charge-et-de-performance), 3ᵉ point |
| [RNF-003](./07_exigencesNonFonctionnelles.md#performance) (calcul local sous 500 ms par projet) | [Tests de charge et de performance](#tests-de-charge-et-de-performance), 1ᵉʳ point |
| [RNF-004](./07_exigencesNonFonctionnelles.md#performance) (concurrence par défaut de 4 projets) | [Tests de charge et de performance](#tests-de-charge-et-de-performance), 2ᵉ point |
| [RNF-005](./07_exigencesNonFonctionnelles.md#performance) (recherche transversale sous 1 seconde) | [Tests de charge et de performance](#tests-de-charge-et-de-performance), 1ᵉʳ point |
| [RNF-006](./07_exigencesNonFonctionnelles.md#scalabilité-et-montée-en-charge) (utilisabilité à l'échelle moyenne visée) | [Tests de charge et de performance](#tests-de-charge-et-de-performance), 1ᵉʳ et 4ᵉ points (jeu de données synthétique à cette échelle) |
| [RNF-007](./07_exigencesNonFonctionnelles.md#scalabilité-et-montée-en-charge) (purge/agrégation contenant la croissance du fichier) | [Tests de charge et de performance](#tests-de-charge-et-de-performance), 4ᵉ point |
| [RNF-008](./07_exigencesNonFonctionnelles.md#scalabilité-et-montée-en-charge) (dimensionnement mono-poste, aucune scalabilité horizontale requise) | Exclusion justifiée : exigence architecturale négative (absence de serveur), sans comportement observable à tester en dehors des tests déjà listés pour RNF-006/RNF-007, qui en sont la conséquence testable |
