# Modèle : ajout d'une règle dans .claude/rules

## Sommaire

1. [Objet du modèle](#objet-du-modèle)
2. [Emplacement de la règle](#emplacement-de-la-règle)
3. [Format d'un ajout](#format-dun-ajout)
4. [Correspondance entre fichiers de synthèse et documents source](#correspondance-entre-fichiers-de-synthèse-et-documents-source)

## Objet du modèle

Ce modèle définit le format à respecter lorsqu'une nouvelle règle ou une précision de règle existante est déduite d'une étape de développement, conformément au rôle de Relecteur défini dans [00_promptDeveloppement.md](../00_init&prompt/00_promptDeveloppement.md).

## Emplacement de la règle

Toute règle ajoutée ou précisée est portée à la fois dans le fichier de synthèse `.claude/rules/*.md` concerné et dans le document source correspondant sous `./docs/02_documentation`, selon la table de correspondance ci-dessous. Une règle qui ne figure que dans l'un des deux fichiers est considérée comme un ajout non terminé.

## Format d'un ajout

Chaque ajout dans un fichier de synthèse est une puce autonome, formulée ainsi : `- [Énoncé de la règle, forme déclarative courte] (ajouté le AAAA-MM-JJ : [justification en une phrase, reliée à l'étape ou au constat qui l'a motivé]).`

Le document source correspondant reçoit la même règle, rédigée dans le style du reste du document (paragraphe ou puce selon le contexte local), avec la même date et la même justification reportées dans le paragraphe ou la note qui l'introduit.

## Correspondance entre fichiers de synthèse et documents source

| Fichier de synthèse | Document source qui fait foi |
|---|---|
| `.claude/rules/01-usage-ia-et-conventions.md` | `docs/02_documentation/01_modalitesUsageEtConventions.md` |
| `.claude/rules/09-normes-developpement.md` | `docs/02_documentation/14_normesDeveloppement.md` |
| `.claude/rules/10-normes-securite.md` | `docs/02_documentation/15_normesSecurite.md` |
| `.claude/rules/11-normes-tests.md` | `docs/02_documentation/16_normesTests.md` |
| `.claude/rules/12-poste-developpeur.md` | `docs/02_documentation/17_posteDeveloppeur.md` |
