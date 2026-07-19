# Normes de développement

## Sommaire

1. [Structuration du code et découpage en couches](#structuration-du-code-et-découpage-en-couches)
2. [Conventions de nommage](#conventions-de-nommage)
3. [Stratégie de branches et de contribution Git](#stratégie-de-branches-et-de-contribution-git)
4. [Gestion des dépendances](#gestion-des-dépendances)
5. [Règles de qualité de code](#règles-de-qualité-de-code)
   1. [Rigueur du typage et de la documentation — <langage 1>](#rigueur-du-typage-et-de-la-documentation--langage-1)
   2. [Rigueur du typage et de la documentation — <langage 2>](#rigueur-du-typage-et-de-la-documentation--langage-2)
6. [Règles de revue de code](#règles-de-revue-de-code)

## Structuration du code et découpage en couches

*Ce chapitre décrit la structuration du code source et le découpage en couches applicatives, en cohérence avec l'architecture définie à l'étape 6. Il précise, le cas échéant, l'existence d'un fichier de référence exemplaire par pattern de fichier récurrent, conforme aux règles de la section Règles de qualité de code, servant de gabarit concret pour homogénéiser le code produit d'une génération à l'autre.*

## Conventions de nommage

*Ce chapitre définit les conventions de nommage applicables aux fichiers, composants, services et variables, ainsi que le contrôle outillé (analyse statique) qui les vérifie lorsqu'un tel contrôle existe.*

| élément | convention |
|---|---|
| | |

## Stratégie de branches et de contribution Git

*Ce chapitre décrit le workflow de branches retenu, la convention de messages de commit et les règles de revue des pull requests. Il précise le périmètre temporel d'application de ces conventions (commits de code applicatif) par rapport à l'historique déjà existant du dépôt, le cas échéant.*

## Gestion des dépendances

*Ce chapitre décrit les règles de gestion des dépendances du projet (mise à jour des librairies, veille des vulnérabilités) ainsi que la reproductibilité de l'environnement de compilation/exécution : versions figées du langage et de l'outillage (fichier de verrouillage de toolchain propre à l'écosystème utilisé), vérification stricte des verrous de dépendances à l'installation (poste développeur, hook, intégration continue).*

## Règles de qualité de code

*Ce chapitre décrit les règles de qualité de code attendues (lisibilité, complexité, duplication, outillage d'analyse statique) et précise l'articulation entre les contrôles locaux (hook, pre-commit) et les contrôles bloquants de l'intégration continue. Il mentionne les fichiers de configuration d'éditeur partagés et indépendants du poste (réglages de base communs à tout type de fichier, extensions recommandées), tenus à jour au fil des choix technologiques.*

### Rigueur du typage et de la documentation — <langage 1>

*Ce chapitre liste, langage par langage utilisé dans le projet, les règles de rigueur de typage et de documentation retenues (à partir des préférences exprimées en début d'étape), chacune accompagnée du contrôle outillé qui la vérifie. Toute règle demandée qui irait à l'encontre d'une recommandation par défaut de l'outillage retenu est signalée explicitement comme telle.*

| règle | contrôle outillé |
|---|---|
| | |

### Rigueur du typage et de la documentation — <langage 2>

*Un sous-chapitre par langage utilisé. Toute règle qui ne se transpose pas telle quelle d'un langage à l'autre (idiomes différents) est explicitée comme telle plutôt que traduite littéralement.*

| règle | contrôle outillé |
|---|---|
| | |

## Règles de revue de code

*Ce chapitre décrit le processus et les critères de revue de code applicables au projet.*
