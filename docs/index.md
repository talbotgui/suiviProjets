# Suivi Qualimétrie

Application de bureau qui suit et surveille, dans le temps, la qualimétrie et l'obsolescence des dépendances d'un grand nombre de projets répartis dans plusieurs groupes organisationnels, à partir des API de plusieurs instances GitLab et SonarQube.

## Sommaire

1. [Qu'est-ce que c'est](#quest-ce-que-cest)
2. [Statut du projet](#statut-du-projet)
3. [Ce qui distingue ce projet](#ce-qui-distingue-ce-projet)
4. [Stack technique](#stack-technique)
5. [Pour aller plus loin](#pour-aller-plus-loin)

![Écran de synthèse des audits](assets/captures/synthese-audits.png)

## Qu'est-ce que c'est

Un outil de bureau, 100 % local, sans serveur ni base de données : les audits interrogent GitLab et SonarQube, en historisent les constats et restituent des synthèses, des graphiques d'évolution et des alertes, projet par projet et en tendance. Toutes les données vivent dans un unique fichier JSON compressé puis chiffré, chargé et sauvegardé explicitement par l'utilisatrice ou l'utilisateur sur son poste (cf. [Spécification, section 1.1](01_besoin/Specification.md#11-architecture-retenue)).

## Statut du projet

Projet personnel, développé seul, en cours de construction : aucun engagement de support ni de stabilité de version. Le développement est structuré en 15 phases documentées dans le [plan de développement](03_plan/plan_13_developpement.md) ; les 12 premières, qui couvrent l'intégralité des [cas d'usage fonctionnels](02_documentation/04_casUsage.md), sont closes, les phases suivantes (finition visuelle, intégration continue et publication, recette finale) sont en cours.

## Ce qui distingue ce projet

Quatre principes structurent l'ensemble de la conception (cf. [Spécification, section 1.2](01_besoin/Specification.md#12-principes-de-conception)) :

- **le constat est stocké, le jugement est calculé** — les audits enregistrent des données brutes ; toute classification (statut d'obsolescence, vitalité, statut d'un membre...) est recalculée à l'affichage à partir des seuils et référentiels courants, sans nécessiter de nouvel audit ;
- **interdiction par défaut** — l'usage de l'IA sur un projet est interdit sauf autorisation explicite, un membre non reconnu est `inconnu`, l'absence de champ vaut la valeur la plus restrictive ;
- **les secrets ne sont jamais persistés** — les credentials GitLab et Sonar vivent exclusivement en mémoire volatile, ressaisis à chaque session ;
- **français intégral** — code, documentation, modèle de données et discriminants de type sont en français, à l'exception des valeurs imposées par les API externes.

Quelques fonctionnalités phares parmi les [26 fonctionnalités documentées](01_besoin/Specification.md#3-résumé-des-fonctionnalités) : l'alerte **membre de dépôt inconnu**, qui court-circuite tous les autres seuils tant elle est prioritaire ; la détection de **marqueurs d'usage de l'IA** dans l'arborescence des dépôts, croisée avec la politique par projet ; la **comparaison entre deux audits** (indicateurs, dépendances, membres, marqueurs IA) ; le chiffrement du fichier de données par **Argon2id + AES-256-GCM**.

## Stack technique

Application [Tauri](https://tauri.app/) : le cœur natif en **Rust** assure les appels HTTP vers GitLab et Sonar (`reqwest`, hors CORS, proxy d'entreprise respecté) ainsi que la cryptographie et les accès disque (`argon2`, `aes-gcm`, `zstd`) ; l'interface en **Angular** (TypeScript, Signals, RxJS) restitue les synthèses et graphiques d'évolution (Chart.js) et propose des exports PNG (`html-to-image`). Détail complet dans [l'architecture technique](02_documentation/11_architectureTechnique.md).

## Pour aller plus loin

- [Guide utilisateur](guide-utilisateur.md) : prise en main pas à pas, écran par écran, captures de l'application à l'appui.
- [La méthode](methode.md) : comment ce projet est cadré et construit, en documentation-first assistée par IA.
- [La documentation](02_documentation/01_modalitesUsageEtConventions.md) : l'intégralité du besoin, de la documentation normative, des plans et des rapports, navigable depuis le menu.
- [Qualité et téléchargements](qualite.md) : couverture de code, documentation technique générée, statut d'intégration continue, exécutables.
- [Dépôt GitHub](https://github.com/talbotgui/suiviProjets), qui porte le code source, le `README.md` d'installation et les [Releases](https://github.com/talbotgui/suiviProjets/releases).
