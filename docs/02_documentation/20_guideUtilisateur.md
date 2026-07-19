# Guide utilisateur et aide en ligne

## Sommaire

1. [Objectif et périmètre du guide](#objectif-et-périmètre-du-guide)
2. [Guide par écran](#guide-par-écran)
3. [Questions fréquentes](#questions-fréquentes)

## Objectif et périmètre du guide

Ce guide s'adresse à Camille (cf. [persona, étape 2](./03_expressionBesoin.md#persona)), utilisateur unique de l'application, sans profil technique présupposé au-delà de la connaissance de ses propres groupes et projets GitLab/Sonar. Il couvre l'ensemble des écrans de l'[arborescence définie à l'étape 5](./08_arborescenceNavigation.md#arborescence-des-écrans) et vise à répondre aux questions d'usage courant, sans se substituer à la documentation technique destinée au développement (étapes 6 et suivantes).

## Guide par écran

| écran | mode d'emploi |
|---|---|
| Accueil | Objectif : créer ou reprendre un suivi. Actions : créer un nouveau fichier (un mot de passe solide est demandé, à conserver précieusement) ou charger un fichier existant. Point d'attention : le mot de passe n'est jamais récupérable ; sans lui, les données sont définitivement inaccessibles (cf. [risque identifié à l'étape 2](./03_expressionBesoin.md#risques-projet-identifiés)). |
| Gestion des credentials | Objectif : donner à l'application un accès temporaire aux instances GitLab/Sonar, sans jamais les enregistrer. Actions : saisir ou coller les credentials, utiliser l'assistant de création de token en lecture seule, tester chaque credential. Point d'attention : les credentials sont à ressaisir à chaque session et sont perdus au verrouillage. |
| Administration | Objectif : organiser les groupes, projets et sources suivis. Actions : créer/modifier/dupliquer un projet, rattacher des sources avec leur ref auditée, gérer la liste des membres connus d'un groupe, activer la politique IA d'un projet. Point d'attention : supprimer un groupe ou un projet supprime aussi son historique d'audits. |
| Constitution de campagne | Objectif : choisir précisément quoi auditer. Actions : sélectionner un périmètre (tout, un groupe, une sélection manuelle) ou utiliser un raccourci (échecs précédents, projets anciens). Point d'attention : la campagne ne peut être lancée que si un brouillon précédent a été traité. |
| Tableau de bord d'exécution | Objectif : suivre une campagne en cours. Actions : observer la progression, annuler proprement si nécessaire. Point d'attention : annuler ne perd pas les résultats déjà obtenus. |
| Brouillon et rapport d'anomalies | Objectif : valider les résultats d'une campagne avant qu'ils n'entrent dans l'historique. Actions : examiner les valeurs signalées comme aberrantes, intégrer tout ou partie, ou rejeter avec un motif. Point d'attention : tant que le brouillon n'est pas traité, aucune nouvelle campagne n'est possible. |
| Synthèse des audits | Objectif : obtenir en un coup d'œil l'état de tous les projets. Actions : filtrer par groupe ou indicateur, repérer les alertes membre inconnu (toujours en tête), exporter la vue en image. Point d'attention : un badge grisé (SONAR_KO) signale une incohérence entre le code et l'analyse Sonar, pas une absence de problème. |
| Synthèse graphique | Objectif : visualiser une tendance dans le temps. Actions : filtrer, zoomer, superposer plusieurs indicateurs, lire les annotations posées sur les événements marquants. Point d'attention : un changement de seuil requalifie rétroactivement les courbes, une explication est disponible via le journal. |
| Fiche projet | Objectif : tout savoir sur un projet précis. Actions : consulter les indicateurs par thème, qualifier un membre inconnu en deux clics, ouvrir la comparaison entre deux audits. Point d'attention : un membre inconnu ou une violation IA y est mis en évidence visuellement, à traiter en priorité. |
| Comparaison entre deux audits | Objectif : comprendre précisément ce qui a changé entre deux dates. Actions : choisir deux dates ou un raccourci, lire le différentiel en quatre volets. |
| Liste de travail | Objectif : traiter méthodiquement toutes les alertes actives. Actions : marquer une alerte vue ou traitée, avec commentaire. Point d'attention : une alerte traitée qui persiste au constat suivant réapparaît, avec la mention de son traitement antérieur. |
| Recherche transversale | Objectif : répondre rapidement à une question ponctuelle (« qui utilise encore cette dépendance ? »). Actions : rechercher, étendre à l'historique si besoin. |
| Paramétrage | Objectif : adapter les seuils et référentiels à son contexte. Actions : ajuster les seuils de couleur, éditer les référentiels de dépendances et de marqueurs IA, exporter ou importer une configuration, accéder au journal et à la purge. Point d'attention : l'export ne contient jamais les membres connus ni aucune autre donnée de groupe. |
| Verrouillage | Objectif : protéger les données en cas d'absence du poste. Actions : verrouiller manuellement, ou laisser le verrouillage automatique s'appliquer après inactivité. Point d'attention : le déverrouillage impose de resaisir les credentials. |

## Questions fréquentes

| question | réponse |
|---|---|
| J'ai oublié le mot de passe de mon fichier de données, comment le récupérer ? | Il n'existe aucun mécanisme de recouvrement, par conception : le chiffrement rendrait sinon les données vulnérables. Il est recommandé de conserver ce mot de passe dans un gestionnaire dédié tel que [KeePass](https://keepass.info/) (cf. [risque identifié à l'étape 2](./03_expressionBesoin.md#risques-projet-identifiés)). |
| Pourquoi un membre reste-t-il « inconnu » après que je l'ai qualifié ? | Vérifier que la règle créée correspond exactement au username ou à l'email observé sur l'audit ; en cas de règle contradictoire de même niveau, le statut retombe à « conflit de règles », traité comme inconnu (cf. [RG-008](./05_reglesGestion.md#membres-et-sécurité-des-accès)). |
| Que signifie le badge SONAR_KO sur un projet ? | La dernière analyse Sonar est trop ancienne par rapport au dernier commit ; les métriques Sonar affichées ne reflètent donc plus l'état réel du code et sont grisées jusqu'à ce qu'une analyse plus récente soit disponible. |
| Un projet où l'IA est interdite et sans marqueur détecté est-il garanti sans usage d'IA ? | Non : l'absence de marqueur prouve l'absence de configuration commitée, pas l'absence d'usage réel. Cette réserve est rappelée dans l'aide contextuelle de la fiche projet. |
| Puis-je utiliser l'application sur plusieurs postes ? | Oui, en transportant le fichier de données chiffré d'un poste à l'autre ; il n'existe en revanche pas de synchronisation automatique entre plusieurs postes utilisés en parallèle. |
| Que se passe-t-il si je ferme l'application pendant une campagne d'audit ? | Les résultats non encore intégrés sont perdus ; il est recommandé d'utiliser l'annulation propre plutôt que de fermer l'application brutalement. |
| Comment partager mes seuils et référentiels avec une autre installation ? | Utiliser l'export de configuration en clair depuis le paramétrage, puis l'import sur l'autre installation ; seules les données de groupe (dont les membres connus) restent propres à chaque installation. |
