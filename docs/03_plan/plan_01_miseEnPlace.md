# Plan de mise en place

## Sommaire

1. [Objet du document](#objet-du-document)
2. [Actions issues de l'étape 1 — Modalités d'usage de l'IA et glossaire](#actions-issues-de-létape-1--modalités-dusage-de-lia-et-glossaire)

## Objet du document

Ce document trace, au fil des étapes de cadrage, les modifications techniques détectées durant les conversations et restant à réaliser après la rédaction des documents ([règle générale n°8](../00_init&prompt/00_promptInitial.md)). Chaque ligne précise l'action, le ou les fichiers concernés, l'étape d'origine, l'étape cible (lorsque le traitement est différé à une étape ultérieure connue) et le statut d'avancement.

## Actions issues de l'étape 1 — Modalités d'usage de l'IA et glossaire

| action | fichier(s) concerné(s) | étape d'origine | étape cible | statut |
|---|---|---|---|---|
| Créer le fichier de règle du thème « usage de l'IA et conventions de rédaction », reprenant à la fois les conventions de rédaction Markdown retenues et le périmètre de délégation, l'obligation de mention de l'origine IA et les points de vigilance spécifiques au projet — un seul fichier pour ce thème, conformément à l'étape 13 | [`.claude/rules/01-usage-ia-et-conventions.md`](../../.claude/rules/01-usage-ia-et-conventions.md), importé depuis [`CLAUDE.md`](../../CLAUDE.md) pour un chargement automatique effectif à chaque session | [1](../02_documentation/01_modalitesUsageEtConventions.md#usage-de-lia-au-sens-large) | 13 (génération des règles d'assistance IA) | fait |
| Compléter `./.claude/settings.json` pour interdire l'accès direct de l'IA au contenu du fichier de données applicatif chiffré, une fois son nom et son emplacement définis | `./.claude/settings.json` | [1](../02_documentation/01_modalitesUsageEtConventions.md#protection-des-informations-sensibles) | 7 (modèle de données) | résolu à l'étape 7 — sans objet : le fichier de données est créé par l'utilisateur final à un emplacement de son choix, hors du dépôt (cf. [Stratégie de persistance](../02_documentation/12_modeleDonnees.md#stratégie-de-persistance)) ; aucun chemin fixe du dépôt n'est concerné |
| Compléter `./.claude/settings.json` pour interdire la lecture des futurs jeux de données de test au format chiffré (extension `.sqm`, cf. [étape 7](../02_documentation/12_modeleDonnees.md#stratégie-de-persistance)), une fois de tels fichiers introduits comme fixtures dans le dépôt | `./.claude/settings.json` | [7](../02_documentation/12_modeleDonnees.md#stratégie-de-persistance) | 11 (normes de tests automatisés) | différé |
| Mettre en place le script de journalisation automatique des prompts significatifs : hook Claude Code `UserPromptSubmit` consignant chaque prompt dans `.claude/logs/prompts.log`, conception retenue à l'étape 12 (cf. [traçabilité des échanges avec l'IA](../02_documentation/17_posteDeveloppeur.md#traçabilité-des-échanges-avec-lia)) | `.claude/settings.json`, `.claude/logs/prompts.log` (à créer) | [1](../02_documentation/01_modalitesUsageEtConventions.md#traçabilité-des-échanges-significatifs) | démarrage effectif du développement | différé |
