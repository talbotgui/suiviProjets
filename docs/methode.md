# La méthode

Sur ce dépôt, la méthode de construction est au moins aussi remarquable que l'application elle-même : un projet personnel, développé seul, mais entièrement cadré et développé en documentation-first assistée par IA, avec une traçabilité de bout en bout et une relecture systématique en contexte isolé.

## Sommaire

1. [Un cadrage en 15 étapes](#un-cadrage-en-15-étapes)
2. [Codeur puis Relecteur, en contexte isolé](#codeur-puis-relecteur-en-contexte-isolé)
3. [Traçabilité de bout en bout](#traçabilité-de-bout-en-bout)
4. [Des règles de collaboration explicites](#des-règles-de-collaboration-explicites)
5. [Des règles opérationnelles chargées automatiquement](#des-règles-opérationnelles-chargées-automatiquement)

## Un cadrage en 15 étapes

Avant la moindre ligne de code, l'ensemble de la conception a été cadré à travers une discussion structurée en 15 étapes, pilotée par [un prompt de cadrage réutilisable](00_init&prompt/00_promptInitial.md) capitalisant sur deux projets personnels précédents : modalités d'usage de l'IA et glossaire, réexpression du besoin, exigences fonctionnelles et non fonctionnelles, expérience utilisateur et maquettes, architecture technique, modèle de données, conception détaillée, normes de développement, de sécurité et de tests, environnements et intégration continue, génération des règles d'assistance IA, revue complète, puis plan de développement.

Chaque étape produit un ou plusieurs documents dans [`docs/02_documentation`](02_documentation/01_modalitesUsageEtConventions.md), relus dans une session dédiée (contexte isolé de celui de rédaction), puis validés explicitement par un humain avant de passer à la suivante — une relecture seule n'y suffit pas. Chaque étape se clôt par un commit humain, jamais exécuté par l'IA, qui marque un point de retour arrière fiable.

Le développement lui-même est ensuite dérivé **exclusivement** de cette documentation normative, jamais du dossier de besoin d'origine (à l'exception des feuilles de style, dérivées des maquettes) : la documentation fait foi, pas la mémoire de la conversation qui l'a produite.

## Codeur puis Relecteur, en contexte isolé

Le développement suit, incrément par incrément, [un second prompt dédié au binôme d'agents](00_init&prompt/00_promptDeveloppement.md) : un **Codeur** développe un incrément à partir de la documentation, puis un **Relecteur**, dans une session ou un sous-agent dédié sans accès au raisonnement du Codeur, relit uniquement le code final produit, la documentation et le compte-rendu — jamais la conversation qui a mené à ce code. Cette isolation est le point : elle évite que les biais et les angles morts du Codeur ne contaminent la relecture.

Chaque incrément est consigné dans le [rapport de développement](04_rapports/rapportDeDeveloppement.md), au format append-only : une entrée déjà écrite n'est jamais réécrite, même lorsqu'un doute qu'elle soulève est levé plus tard — la levée du doute est ajoutée à la suite, avec un renvoi explicite vers l'entrée d'origine. Cette convention a montré son utilité concrètement : une session de développement a par exemple attribué à tort, dans son propre compte-rendu, un comportement observé dans du code à une phase antérieure déjà close, alors qu'il provenait en réalité d'une session concurrente travaillant sur les mêmes fichiers au même moment — l'erreur, non corrigée dans l'entrée d'origine, a été explicitement tranchée dans une entrée ultérieure dédiée.

## Traçabilité de bout en bout

Chaque exigence, fonctionnelle (`US-NNN`) ou de gestion métier (`RG-NNN`), porte un identifiant stable, jamais renommé, réutilisé sans rupture depuis le [besoin](01_besoin/Specification.md) jusqu'à la [conception détaillée](02_documentation/13_conceptionDetaillee.md), aux [normes de tests](02_documentation/16_normesTests.md) et au [plan de développement](03_plan/plan_13_developpement.md). Les tableaux de synthèse et matrices de traçabilité (cas d'usage couverts par phase, règles de gestion associées à un cas d'usage, modules couverts par au moins un test) sont systématiquement recalculés depuis leur source à chaque modification, jamais maintenus séparément à la main, et vérifiés croisés dans les deux sens à chaque étape.

Quatre domaines font l'objet d'une vigilance renforcée systématique à chaque relecture : le calcul des indicateurs qualité, la sécurité et la confidentialité des données, l'architecture technique de l'application, la conformité aux référentiels externes (cf. [modalités d'usage de l'IA](02_documentation/01_modalitesUsageEtConventions.md#points-de-vigilance-spécifiques-au-projet)).

## Des règles de collaboration explicites

Certaines actions restent strictement du ressort humain, quelles que soient les circonstances : aucune commande de gestion de version n'est jamais exécutée par l'IA, aucun déploiement en production, aucune suppression de données, aucune opération irréversible ou affectant un système partagé, même préparée par l'IA. Les arbitrages fonctionnels, d'architecture ou de sécurité restent des décisions humaines ; l'IA propose, elle ne tranche pas. Une demande ambiguë appelle des questions avant toute production de contenu, jamais une hypothèse non vérifiée.

## Des règles opérationnelles chargées automatiquement

Une fois la documentation normative stabilisée (étape 12 du cadrage), chaque document est transposé en un fichier de règle opérationnel synthétique dans `.claude/rules/`, chargé automatiquement par l'assistant IA à chaque session de développement sans dépendre d'une relecture manuelle de l'ensemble de la documentation à chaque fois. Toute évolution ultérieure d'un document normatif source entraîne la mise à jour du fichier de règle correspondant, pour qu'aucune divergence ne s'installe entre la documentation de référence et les règles effectivement appliquées.
