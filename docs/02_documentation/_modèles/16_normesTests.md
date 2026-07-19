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

*Ce chapitre décrit les normes applicables aux tests unitaires : périmètre, conventions d'écriture, isolation des dépendances.*

## Tests des clients d'API et des services

*Ce chapitre décrit les normes applicables aux tests des clients d'API et des services de l'application, distinguées selon leur exécution ou non en intégration continue.*

### Tests automatisés, exécutés en intégration continue

*Ce chapitre décrit les tests des clients d'API et des services exécutés systématiquement en intégration continue, contre des réponses HTTP simulées (aucun appel réseau réel), avec le détail des catégories d'anomalie testées explicitement.*

### Tests d'intégration, hors intégration continue, contre des instances réelles

*Ce chapitre décrit les tests d'intégration appelant réellement les instances externes mises à disposition du développeur : déclenchement manuel exclusivement, jamais exécutés en intégration continue, credentials fournis via des variables d'environnement locales jamais en dur.*

## Tests de bout en bout

*Ce chapitre décrit les normes applicables aux tests de bout en bout (E2E).*

## Tests de charge et de performance

*Ce chapitre décrit les normes applicables aux tests de charge et de performance, en cohérence avec les exigences de performance et de scalabilité définies à l'étape 4.*

## Gestion des données de test

*Ce chapitre décrit la gestion des données utilisées pour les tests : constitution des jeux de données, anonymisation des données sensibles.*

## Recette et tests d'acceptation utilisateur

*Ce chapitre décrit les modalités de recette et de tests d'acceptation utilisateur (UAT) menés avec les utilisateurs métier avant mise en production.*

## Stratégie de couverture de code

*Ce chapitre décrit la stratégie de couverture de code visée : seuils visés, périmètre couvert et non couvert, et justification des exclusions.*

| périmètre | seuil visé |
|---|---|
| | |

## Matrice de traçabilité

*Ce chapitre relie chaque module/composant de l'étape 8, chaque cas limite technique de l'étape 8 et chaque exigence non fonctionnelle de performance/scalabilité de l'étape 4 au(x) test(s) qui le couvre(nt), ou à son exclusion justifiée (règle générale n°13) : une ligne existe pour chaque module, chaque cas limite et chaque exigence non fonctionnelle concernée, pas uniquement pour les modules. Chaque périmètre cité dans la stratégie de couverture de code ci-dessus est par ailleurs vérifié comme étant décrit par au moins un paragraphe de stratégie de test dans les chapitres précédents de ce document.*

| élément couvert (module / cas limite / exigence non fonctionnelle) | test(s) correspondant(s) |
|---|---|
| | |
