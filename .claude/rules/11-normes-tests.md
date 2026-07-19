# Normes de tests automatisés

Synthèse actionnable de [16_normesTests.md](../../docs/02_documentation/16_normesTests.md). En cas de doute, le document source fait foi ; toute évolution de ce document entraîne la mise à jour de ce fichier.

## Tests unitaires

- Le Moteur de jugement (fonctions pures) est la priorité de couverture (seuil 90 %) : chaque fonction de calcul d'indicateur testée contre des constats et seuils/référentiels connus, y compris les cas limites ([source](../../docs/02_documentation/16_normesTests.md#tests-unitaires)).
- Connecteurs GitLab/Sonar et Moteur de persistance testés unitairement sans appel réseau/disque réel (client HTTP simulé) ; seuil 80 % pour le reste du cœur natif.
- La Façade de commandes n'est jamais testée isolément (couverte par les tests des modules routés + E2E).
- Framework : `cargo test` (Rust), [Jest](https://jestjs.io/) (Angular/TypeScript, jamais Karma/Jasmine) ; commandes d'exécution en local : [12-poste-developpeur.md#commandes](./12-poste-developpeur.md#commandes).

## Tests des clients d'API

- En CI : uniquement des réponses HTTP simulées, jamais un appel réel ; chaque catégorie d'anomalie RG-021 (auth refusée, ref introuvable, instance injoignable, délai dépassé, réponse inattendue, droits insuffisants) testée explicitement ([source](../../docs/02_documentation/16_normesTests.md#tests-automatisés-exécutés-en-intégration-continue)).
- Tests d'intégration contre de vraies instances GitLab/Sonar : marqués `#[ignore]`/tag équivalent, **jamais exécutés en CI**, déclenchés manuellement, credentials via variables d'environnement locales uniquement, jamais en dur ([source](../../docs/02_documentation/16_normesTests.md#tests-dintégration-hors-intégration-continue-contre-des-instances-réelles)).

## Tests de bout en bout

- [tauri-driver](https://tauri.app/develop/tests/webdriver/) (WebDriver) sur l'application packagée réelle, jamais un outil limité à la vue web seule.
- Toujours avec les clients HTTP des connecteurs bouchonnés, jamais contre une vraie instance (rejouabilité déterministe) ([source](../../docs/02_documentation/16_normesTests.md#tests-de-bout-en-bout)).
- Périmètre minimal : créer un fichier de données, réaliser une campagne et intégrer les résultats, qualifier un membre inconnu, verrouiller/déverrouiller la session.

## Tests de charge et de performance

- Pas de test « utilisateurs concurrents » (application locale sans serveur) : la charge testée est la volumétrie de données et la concurrence des appels d'audit ([source](../../docs/02_documentation/16_normesTests.md#tests-de-charge-et-de-performance)).
- Jeu de données synthétique à l'échelle RNF-006 : temps de rendu/calcul comparés aux seuils RNF-001 (synthèse < 2 s), RNF-003 (calcul local < 500 ms/projet), RNF-005 (recherche transversale < 1 s).
- Campagne simulée à connecteurs bouchonnés (latence contrôlée) : vérifie le respect de la concurrence par défaut (RNF-004, 4 projets simultanés) et la régularité des événements de progression.
- Dérivation de clé (Argon2id) mesurée au chargement/sauvegarde et comparée au seuil RNF-002 (quelques secondes maximum).
- Purge par densité puis par âge exécutées à l'échelle RNF-006, pour vérifier que la croissance du fichier de données reste contenue (RNF-007).

## Recette et tests d'acceptation utilisateur

- Pas de recette formelle avec un tiers (utilisateur unique) : checklist manuelle rejouée avant toute mise à disposition d'une version, sur un jeu de données réaliste, en couvrant les parcours utilisateurs principaux et alternatifs de l'étape 5 ([source](../../docs/02_documentation/16_normesTests.md#recette-et-tests-dacceptation-utilisateur)).
- Attention particulière portée aux domaines de vigilance renforcée ([01-usage-ia-et-conventions.md#discernement](./01-usage-ia-et-conventions.md#discernement)) : calcul des indicateurs, sécurité/confidentialité des données, conformité aux référentiels externes.

## Données de test et couverture

- Jeux de données de test exclusivement synthétiques/fictifs, jamais de donnée réelle de production ([source](../../docs/02_documentation/16_normesTests.md#gestion-des-données-de-test)).
- Composants graphiques (UI de présentation) : pas de seuil de couverture par lignes ; suivre le **nombre de méthodes jamais appelées** (couverture par fonctions Jest/Istanbul) comme signal de scénario non couvert ([source](../../docs/02_documentation/16_normesTests.md#stratégie-de-couverture-de-code)).
- Mesure : [cargo-llvm-cov](https://github.com/taiki-e/cargo-llvm-cov) (Rust), couverture Istanbul intégrée à Jest (TypeScript).

## Matrice de traçabilité

- Chaque module/composant de l'étape 8 et chaque cas limite technique doit être couvert par au moins un test, ou explicitement exclu avec justification ; réciproquement, chaque périmètre cité dans la stratégie de couverture de code est décrit par au moins un paragraphe de stratégie de test ci-dessus ([source](../../docs/02_documentation/16_normesTests.md#matrice-de-traçabilité)).
- Chaque exigence non fonctionnelle de performance/scalabilité de l'étape 4 est reliée à au moins un test de charge ci-dessus, ou explicitement exclue avec justification (ex. RNF-008, exigence architecturale négative).
- Cette vérification croisée est refaite à chaque modification de l'un des documents concernés (règle générale n°13 du [prompt de cadrage](../../docs/00_init&prompt/00_promptInitial.md#règles-générales-valables-pour-toute-la-discussion)).
