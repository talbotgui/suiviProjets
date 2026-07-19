# Modèle : chapitre du rapport de développement

## Sommaire

1. [Objet du modèle](#objet-du-modèle)
2. [Structure d'un chapitre](#structure-dun-chapitre)
3. [Contraintes de contenu](#contraintes-de-contenu)
4. [Exemple de chapitre](#exemple-de-chapitre)

## Objet du modèle

Ce modèle définit la structure attendue pour chaque chapitre de `./docs/04_rapports/rapportDeDeveloppement.md`, journal de bord narratif tenu à jour au fil des étapes du plan de développement, conformément à [00_promptDeveloppement.md](../00_init&prompt/00_promptDeveloppement.md#rapport-de-développement).

## Structure d'un chapitre

Un chapitre correspond à une étape du plan et porte le titre `## Étape N — [intitulé de l'étape]`, suivi de deux sous-sections `### Codeur` et `### Relecteur`, dans cet ordre.

## Contraintes de contenu

Aucun extrait de code, aucun nom de fichier, aucun nom de classe, de fonction ou de variable n'apparaît dans le rapport : le travail est décrit en langage naturel, au niveau fonctionnel et décisionnel uniquement.

Aucun emoji, conformément aux règles de rédaction Markdown du projet.

La sous-section Codeur décrit les actions réalisées, les décisions prises et leur motivation, ainsi que les doutes ou ambiguïtés rencontrés pendant l'implémentation.

La sous-section Relecteur décrit les actions de relecture réalisées, les corrections décidées et leur justification, les désaccords éventuels avec les choix du Codeur, et les doutes restants.

Chaque paragraphe est écrit sur une seule ligne logique, sans retour à la ligne manuel en son milieu.

## Exemple de chapitre

## Étape 1 — Socle de persistance et sécurité du fichier

### Codeur

La création, le chargement et le verrouillage du fichier de données chiffré ont été implémentés en s'appuyant sur les règles de gestion relatives au stockage et à la confidentialité des données. Le choix a été fait de dériver la clé de chiffrement à chaque déverrouillage plutôt que de la conserver au-delà de la session, afin de limiter la surface d'exposition en mémoire. Une ambiguïté a été relevée sur le comportement attendu en cas de fichier corrompu : la documentation ne précise pas si l'application doit proposer une réparation ou seulement un message d'erreur bloquant.

### Relecteur

Le comportement en cas de fichier corrompu a été tranché en faveur d'un message d'erreur bloquant, cette question relevant de la sécurité des données et non d'un confort d'usage à improviser localement. Aucun désaccord avec les autres choix du Codeur. Un doute subsiste sur le temps de dérivation de clé observé sur un poste bas de gamme, à revérifier lors des tests de charge dédiés.
