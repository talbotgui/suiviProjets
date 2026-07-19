# Réexpression du besoin

## Sommaire

1. [Contexte et origine du besoin](#contexte-et-origine-du-besoin)
2. [Objectifs mesurables du projet](#objectifs-mesurables-du-projet)
3. [Utilisateurs cibles et profils/rôles](#utilisateurs-cibles-et-profilsrôles)
4. [Persona](#persona)
5. [Parties prenantes](#parties-prenantes)
6. [Périmètre](#périmètre)
7. [Contraintes connues](#contraintes-connues)
8. [Risques projet identifiés](#risques-projet-identifiés)
9. [Questions et arbitrages](#questions-et-arbitrages)

## Contexte et origine du besoin

Le besoin naît d'un usage personnel et solo : assurer le suivi de la qualimétrie et de l'obsolescence des dépendances d'un grand nombre de projets, répartis dans plusieurs groupes organisationnels, en s'appuyant sur les API de plusieurs instances GitLab et SonarQube. Aucun outillage existant ne permet aujourd'hui d'agréger ces informations, de les historiser et d'en tirer des alertes exploitables sans revue manuelle fastidieuse, projet par projet. L'application vise à combler ce manque, tout en respectant une contrainte forte : rester strictement locale, sans serveur ni base de données, avec des données chiffrées et des secrets jamais persistés (cf. [Specification.md, section 1](../01_besoin/Specification.md#1-introduction) et [section 2](../01_besoin/Specification.md#2-objectifs)).

## Objectifs mesurables du projet

| objectif | indicateur de mesure |
|---|---|
| Éliminer les angles morts de sécurité liés aux membres de dépôt non identifiés | Tout membre au statut `inconnu` est visible dès l'ouverture de l'application (alerte systématique, prioritaire sur tout autre signal) |
| Réduire le temps nécessaire pour obtenir une vue d'ensemble multi-groupes de la qualimétrie | Vue de synthèse consultable en moins de 5 minutes après une campagne d'audit, sans revue manuelle projet par projet |
| Garantir la confidentialité des données auditées et des credentials | 0 credential persisté sur disque ; fichier de données illisible sans le mot de passe |
| Permettre le pilotage effectif de l'usage de l'IA par projet | 100 % des projets à politique IA interdite couverts par la détection de marqueurs |

## Utilisateurs cibles et profils/rôles

| profil / rôle | description | besoins |
|---|---|---|
| Utilisateur unique | Personne qui charge ou crée le fichier de données, paramètre les référentiels et les seuils, déclenche les audits et consulte les synthèses et alertes. Rôle unique, cohérent avec une application mono-poste reposant sur un fichier local unique, sans distinction de droits | Vue d'ensemble rapide de l'état de ses projets, alerte immédiate sur les signaux de sécurité, historisation fiable dans le temps |

## Persona

| nom du persona | rôle représenté | objectifs et besoins | frustrations | contexte d'usage |
|---|---|---|---|---|
| Camille | Utilisateur unique — référent qualité et sécurité transverse sur plusieurs groupes de projets | Obtenir rapidement un état consolidé de la qualimétrie et de la sécurité de tous ses projets ; être alerté sans délai en cas de membre de dépôt non identifié ou d'usage non autorisé de l'IA ; comparer l'évolution des indicateurs dans le temps sans ressaisie | Doit aujourd'hui ouvrir chaque projet GitLab et Sonar individuellement pour reconstituer une vue d'ensemble ; perd du temps à requalifier manuellement les mêmes constats après un changement de seuil ; craint de laisser passer un signal de sécurité noyé dans le volume de projets | Consultation ponctuelle (par exemple mensuelle ou après une campagne d'audit), depuis un poste personnel, sans connexion permanente ni serveur partagé |

## Parties prenantes

| partie prenante | rôle dans le projet |
|---|---|
| Utilisateur unique (Camille) | Cumule les rôles de commanditaire, de développeur et d'utilisateur du projet ; seul décideur des arbitrages fonctionnels et techniques |

Aucune autre partie prenante n'est identifiée à ce stade : le projet est personnel et autoporté.

## Périmètre

### Inclus

- Suivi et historisation de la qualimétrie et de l'obsolescence des dépendances de projets répartis en groupes organisationnels, via les API GitLab et SonarQube (fonctionnalités F01 à F26 de [Specification.md, section 3](../01_besoin/Specification.md#3-résumé-des-fonctionnalités)).
- Détection et mise en avant prioritaire des membres de dépôt non identifiés (signal de sécurité).
- Détection de l'usage non autorisé de l'IA par croisement avec une politique par projet.
- Stockage exclusivement local dans un fichier chiffré, sans serveur ni base de données, avec gestion des credentials en mémoire volatile uniquement.
- Historisation, comparaison entre audits, visualisation graphique des tendances et export des synthèses.

### Exclu

- Toute version web ou serveur partagé, ainsi que toute synchronisation multi-poste automatique du fichier de données.
- Tout connecteur autre que GitLab et SonarQube dans une première version (pas de GitHub, Jira, Bitbucket ou autre outil qualité).
- Toute correction automatique des problèmes détectés : l'application détecte et restitue, elle n'agit jamais sur le code ou les dépôts audités.
- Toute notification push ou email automatique : la consultation reste à l'initiative de l'utilisateur.
- Toute gestion multi-utilisateurs concurrente sur un même fichier de données.

## Contraintes connues

| contrainte | description |
|---|---|
| Aucune contrainte formelle de délai ou de budget | Projet mené à titre personnel, à un rythme d'avancement libre, sans échéance imposée |
| Aucun existant à remplacer | Pas d'outil ou de solution existante à migrer ou intégrer |

## Risques projet identifiés

| risque | impact | probabilité | mesure de mitigation |
|---|---|---|---|
| Perte du mot de passe du fichier de données | Perte totale et définitive d'accès aux données historisées (absence de tout mécanisme de recouvrement, déduite de la chaîne cryptographique décrite dans [Specification.md, section 5.1](../01_besoin/Specification.md#51-f01--stockage-chiffré-local)) | Moyenne | Documenter clairement l'absence de recouvrement dans le guide utilisateur, et recommander l'usage d'un gestionnaire de mots de passe dédié tel que [KeePass](https://keepass.info/) (documentation : [https://keepass.info/help/index.html](https://keepass.info/help/index.html)) pour conserver durablement le mot de passe du fichier de données |
| Temps disponible pour un développement solo insuffisant face à l'ampleur du périmètre (F01 à F26) | Retard indéfini ou abandon du projet | Moyenne | Étapes de cadrage validées indépendamment les unes des autres, priorisation MoSCoW des cas d'usage à l'étape 3 |
| Évolution des contrats d'API GitLab ou Sonar | Rupture ponctuelle d'un ou plusieurs connecteurs | Faible à moyenne | Test de connectivité dédié (F24), anomalies typées et actions suggérées (F08) |
| Apparition de nouveaux outils IA non couverts par le référentiel de détection | Faux négatifs sur la politique IA | Moyenne | Référentiel de marqueurs IA paramétrable et évolutif (`reglesMarqueursIA`) |

## Questions et arbitrages

| question posée | réponse apportée |
|---|---|
| Quel est le contexte/déclencheur à l'origine de ce projet ? | Usage personnel et solo : suivi qualité d'un ensemble de projets sans outillage existant |
| Combien de profils utilisateurs distincts l'application doit-elle prendre en charge ? | Un rôle unique, sans distinction de droits |
| Existe-t-il d'autres parties prenantes au-delà de l'utilisateur ? | Aucune : projet personnel et autoporté |
| Quelles contraintes de délai, budget ou existant s'appliquent dès à présent ? | Aucune contrainte formelle |
| Les objectifs mesurables, le périmètre exclu et les risques proposés conviennent-ils ? | Validés, avec ajout d'une recommandation d'usage d'un gestionnaire de mots de passe (KeePass) en mitigation du risque de perte du mot de passe du fichier de données |
