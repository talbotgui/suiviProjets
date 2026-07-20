# Modalités d'usage de l'IA et conventions de rédaction

## Sommaire

1. [Langue et registre de la discussion et des documents](#langue-et-registre-de-la-discussion-et-des-documents)
2. [Niveau de détail attendu dans les réponses](#niveau-de-détail-attendu-dans-les-réponses)
3. [Règles de rédaction des documents Markdown](#règles-de-rédaction-des-documents-markdown)
4. [Rappel des règles générales de collaboration](#rappel-des-règles-générales-de-collaboration)
5. [Usage de l'IA au sens large](#usage-de-lia-au-sens-large)
   1. Délégation
      1. [Périmètre des tâches délégables à l'IA](#périmètre-des-tâches-délégables-à-lia)
      2. [Actions à exécution strictement humaine](#actions-à-exécution-strictement-humaine)
   2. Description
      1. [Formulation des demandes à l'IA](#formulation-des-demandes-à-lia)
      2. [Traçabilité des échanges significatifs](#traçabilité-des-échanges-significatifs)
      3. [Mention de l'origine des contenus](#mention-de-lorigine-des-contenus)
   3. Discernement
      1. [Fiabilité et limites connues de l'IA](#fiabilité-et-limites-connues-de-lia)
      2. [Points de vigilance spécifiques au projet](#points-de-vigilance-spécifiques-au-projet)
      3. [Non-substitution du jugement métier](#non-substitution-du-jugement-métier)
   4. Diligence
      1. [Relecture obligatoire du code généré](#relecture-obligatoire-du-code-généré)
      2. [Vérification fonctionnelle avant validation](#vérification-fonctionnelle-avant-validation)
      3. [Responsabilité humaine finale](#responsabilité-humaine-finale)
      4. [Protection des informations sensibles](#protection-des-informations-sensibles)

## Langue et registre de la discussion et des documents

La discussion et l'ensemble des documents produits dans le cadre de ce projet sont rédigés en français. Le registre employé est professionnel et technique, sans familiarité.

## Niveau de détail attendu dans les réponses

Les réponses apportées au cours de la discussion sont directes, sans reformulation du besoin ni préambule inutile. Elles vont à l'essentiel et évitent les résumés redondants en fin de réponse, sauf demande explicite contraire.

## Règles de rédaction des documents Markdown

Les règles suivantes s'appliquent à tous les documents Markdown produits dans les étapes suivantes :
- un paragraphe est écrit sur une seule ligne logique, sans retour à la ligne manuel au milieu d'un paragraphe ;
- l'usage des icônes et emojis est proscrit, sauf demande explicite ;
- chaque fichier Markdown commence par un sommaire (table des matières) listant les titres du document.

## Rappel des règles générales de collaboration

Ces règles, valables pour toute la discussion, sont rappelées ici pour mémoire :
- l'IA n'exécute jamais de commande git, quelle qu'elle soit ;
- chaque étape se termine par un commit exécuté humainement, marquant un point de retour arrière fiable ;
- le passage à l'étape N+1 n'a lieu qu'après validation humaine explicite de l'étape N ; une relecture seule n'y suffit pas ;
- la relecture de chaque étape a lieu dans un contexte isolé de celui du Codeur : nouvelle conversation, ou sous-agent dédié disposant de son propre contexte (par exemple l'outil Agent d'un assistant IA orchestrant un binôme Codeur/Relecteur), l'objectif étant d'éviter que les biais et angles morts du Codeur ne se propagent tels quels à la relecture ;
- chaque exigence fonctionnelle ou non fonctionnelle porte un identifiant stable, réutilisé sans être renommé dans toutes les étapes suivantes ;
- le répertoire `./docs/_modèles` fournit les modèles de structure et de format à respecter pour chaque document produit.

## Usage de l'IA au sens large

Au-delà de la production documentaire, l'usage de l'IA dans ce projet s'organise selon les quatre axes du cadre de référence [IA Fluency](./02_glossaire.md#termes-techniques) : délégation, description, discernement et diligence.

### Délégation

#### Périmètre des tâches délégables à l'IA

L'IA peut rédiger les documents de cadrage et produire du code, avec une supervision humaine continue : chaque étape intermédiaire fait l'objet d'un point de contrôle, en complément de la relecture systématique exigée avant toute intégration. Ce périmètre est réévalué si la nature des tâches à venir le justifie.

#### Actions à exécution strictement humaine

L'IA n'exécute jamais elle-même : les commandes git (cf. règles générales), le déploiement en production, l'envoi de communications externes, la suppression de données, et plus généralement toute opération irréversible ou affectant des systèmes partagés. Ces opérations restent de la seule responsabilité humaine, même lorsque l'IA a préparé ou proposé le contenu de l'action.

### Description

#### Formulation des demandes à l'IA

Les demandes adressées à l'IA précisent autant que possible le contexte, les contraintes et les critères d'acceptation attendus, afin de limiter les approximations dans les réponses produites. Lorsqu'une demande est ambiguë, l'IA pose les questions nécessaires avant de produire un contenu, plutôt que de formuler des hypothèses non vérifiées.

#### Traçabilité des échanges significatifs

L'historique des sessions et les commits Git constituent la trace de référence des échanges et décisions significatifs, complétée par la journalisation automatique des prompts définie au poste développeur ([étape 12](./17_posteDeveloppeur.md#traçabilité-des-échanges-avec-lia), hook Claude Code dédié). La mise en œuvre effective de cette journalisation est tracée dans le [plan de mise en place](../03_plan/plan_01_miseEnPlace.md#actions-issues-de-létape-1--modalités-dusage-de-lia-et-glossaire).

#### Mention de l'origine des contenus

Les documents et fichiers de code substantiellement générés ou fortement assistés par l'IA portent une mention explicite de cette origine : en en-tête ou à proximité du sommaire pour les documents, en commentaire d'en-tête de fichier pour le code, en complément de la mention systématique dans les messages de commit.

Deux précisions :
- un fichier reproduisant tel quel, sans aucune adaptation, la sortie brute d'un générateur officiel invoqué par l'IA (ex. `ng new`, `cargo init`, `tauri init`) est dispensé de cette mention, l'IA n'ayant fait qu'invoquer l'outil sans produire de contenu propre ; dès que ce fichier est adapté, complété ou corrigé au-delà de ce gabarit par défaut, la mention devient obligatoire ;
- un fichier dont le format ne supporte structurellement aucun commentaire (ex. JSON strict) est dispensé de la mention en en-tête de fichier, faute de pouvoir la porter ; la mention systématique dans le message de commit qui l'introduit reste alors seule obligatoire et suffisante.

### Discernement

#### Fiabilité et limites connues de l'IA

L'IA peut produire des approximations, des erreurs factuelles ou des incohérences, y compris sous forme d'hallucinations, en particulier sur des points chiffrés, réglementaires ou techniques précis. Toute affirmation de ce type doit être vérifiée avant d'être considérée comme acquise.

#### Points de vigilance spécifiques au projet

Quatre domaines appellent une relecture humaine renforcée dans ce projet :
- les règles de calcul des indicateurs qualité (statuts, seuils, couleurs), le principe fondamental du projet étant que le jugement est calculé à la volée à partir des constats bruts et n'est jamais stocké ;
- la sécurité et la confidentialité des données, notamment le fichier de données chiffré, la gestion des membres inconnus et les données personnelles des contributeurs et des projets audités ;
- l'architecture technique de l'application desktop, en particulier la frontière entre les différentes couches applicatives et la gestion d'état associée (choix d'architecture non encore figé à ce stade, cf. [étape 6](../00_init&prompt/00_promptInitial.md#étape-6--architecture-technique-et-choix-technologiques)) ;
- la conformité aux référentiels externes utilisés pour juger la vitalité, la taille, la couverture de tests ou les notes Sonar.

#### Non-substitution du jugement métier

L'IA propose des analyses et des solutions, mais les arbitrages fonctionnels, d'architecture ou de sécurité restent des décisions humaines.

### Diligence

#### Relecture obligatoire du code généré

Aucune ligne de code produite par l'IA n'est intégrée sans avoir été relue et comprise par un humain au préalable.

#### Vérification fonctionnelle avant validation

La relecture visuelle du code ou du texte ne suffit pas : le résultat doit être concrètement exécuté, testé ou vérifié avant d'être considéré comme acquis.

Cette vérification concrète s'applique également au compte-rendu du Codeur lui-même : toute affirmation décrivant un mécanisme ou une répartition de responsabilité entre deux modules (par exemple, qu'un comptage ou une décision est confié à tel composant plutôt qu'à un autre) est confirmée par une lecture directe du code réellement produit, jamais acceptée sur la seule foi du texte du rapport (ajouté le 2026-07-20 : à la relecture de la Phase 1, le compte-rendu du Codeur affirmait que le comptage des échecs consécutifs de déverrouillage était confié au Store d'état applicatif de l'interface, alors que ce mécanisme était en réalité absent du code correspondant).

#### Responsabilité humaine finale

L'auteur humain reste seul responsable du contenu livré, quelle que soit la part de génération automatique par l'IA.

#### Protection des informations sensibles

Aucune donnée confidentielle, personnelle ou soumise à secret n'est transmise à l'IA dans les prompts, notamment le contenu du fichier de données chiffré, les données personnelles des membres, ainsi que tout secret ou clé (cf. règles de refus déjà en place dans `.claude/settings.json` pour les fichiers `.pem` et `.key`). Le complément de ces règles pour le futur fichier de données chiffré est tracé dans le [plan de mise en place](../03_plan/plan_01_miseEnPlace.md#actions-issues-de-létape-1--modalités-dusage-de-lia-et-glossaire).
