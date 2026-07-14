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

*Ce chapitre précise la langue retenue pour la discussion et pour l'ensemble des documents produits, ainsi que le registre de langage attendu (professionnel, technique, sans familiarité).*

## Niveau de détail attendu dans les réponses

*Ce chapitre précise le niveau de détail attendu dans les réponses apportées au cours de la discussion : réponses directes, sans reformulation ni préambule inutile.*

## Règles de rédaction des documents Markdown

*Ce chapitre liste les règles de rédaction applicables à tous les documents Markdown produits dans les étapes suivantes : rédaction des paragraphes sur une seule ligne logique, interdiction des icônes et emojis sauf demande explicite, présence obligatoire d'un sommaire en tête de document.*

## Rappel des règles générales de collaboration

*Ce chapitre rappelle les règles générales valables pour toute la discussion : absence d'exécution de commande git par l'IA, commit humain de fin d'étape, validation explicite avant de passer à l'étape suivante, relecture en session dédiée, traçabilité des identifiants d'exigences d'une étape à l'autre.*

## Usage de l'IA au sens large

*Ce chapitre introduit les règles d'usage de l'IA au sens large, organisées selon quatre axes : délégation, description, discernement et diligence.*

### Délégation

#### Périmètre des tâches délégables à l'IA

*Ce chapitre précise les tâches pouvant être intégralement confiées à l'IA (rédaction de brouillons, génération de code, exploration), celles nécessitant une supervision humaine continue, et celles exclues de toute délégation.*

#### Actions à exécution strictement humaine

*Ce chapitre liste les opérations que l'IA ne doit jamais exécuter elle-même, notamment les commandes git, le déploiement, l'envoi de communications, la suppression de données, et plus généralement toute opération irréversible ou affectant des systèmes partagés.*

### Description

#### Formulation des demandes à l'IA

*Ce chapitre précise le niveau d'explicitation attendu dans les demandes adressées à l'IA (contexte, contraintes, critères d'acceptation) afin de limiter les approximations dans les réponses produites.*

#### Traçabilité des échanges significatifs

*Ce chapitre précise les modalités de consignation des prompts et décisions importantes, afin de pouvoir justifier a posteriori une production issue de l'IA ; il est notamment conseillé de mettre en place un script de traçabilité enregistrant automatiquement chaque prompt dans un fichier de log dédié à chaque développeur.*

#### Mention de l'origine des contenus

*Ce chapitre précise les modalités de signalement explicite des parties d'un document ou d'un code générées ou fortement assistées par IA.*

### Discernement

#### Fiabilité et limites connues de l'IA

*Ce chapitre rappelle que l'IA peut produire des approximations, des erreurs factuelles ou des incohérences, notamment sous forme d'hallucinations, en particulier sur des points chiffrés, réglementaires ou techniques précis.*

#### Points de vigilance spécifiques au projet

*Ce chapitre identifie les zones où une erreur de l'IA aurait le plus d'impact sur le projet, telles que les exigences métier, les choix d'architecture ou la sécurité, et qui appellent une vérification renforcée.*

#### Non-substitution du jugement métier

*Ce chapitre rappelle que l'IA propose des solutions mais que l'humain décide, et que les arbitrages fonctionnels ou d'architecture restent des décisions humaines.*

### Diligence

#### Relecture obligatoire du code généré

*Ce chapitre précise qu'aucune ligne de code produite par l'IA ne peut être intégrée sans avoir été relue et comprise par un humain au préalable.*

#### Vérification fonctionnelle avant validation

*Ce chapitre précise que la relecture visuelle du code ou du texte ne suffit pas et que le résultat doit être concrètement exécuté, testé ou vérifié avant d'être considéré comme acquis.*

#### Responsabilité humaine finale

*Ce chapitre rappelle que l'auteur humain reste seul responsable du contenu livré, quelle que soit la part de génération automatique par l'IA.*

#### Protection des informations sensibles

*Ce chapitre interdit la transmission à l'IA de données confidentielles, personnelles ou soumises à secret dans les prompts.*
