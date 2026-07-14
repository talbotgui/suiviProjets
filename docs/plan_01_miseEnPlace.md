# Plan de mise en place

## Sommaire

1. [Objet du document](#objet-du-document)
2. [Actions issues de l'étape 1 — Modalités d'usage de l'IA et glossaire](#actions-issues-de-létape-1--modalités-dusage-de-lia-et-glossaire)

## Objet du document

Ce document trace, au fil des étapes de cadrage, les modifications techniques détectées durant les conversations et restant à réaliser après la rédaction des documents ([règle générale n°8](./_modèles/00_promptInitial.md)). Chaque ligne précise l'action, le ou les fichiers concernés, l'étape d'origine, l'étape cible (lorsque le traitement est différé à une étape ultérieure connue) et le statut d'avancement.

## Actions issues de l'étape 1 — Modalités d'usage de l'IA et glossaire

| action | fichier(s) concerné(s) | étape d'origine | étape cible | statut |
|---|---|---|---|---|
| Créer un fichier de règle reprenant les conventions de rédaction Markdown retenues (sommaire obligatoire, paragraphe sur une seule ligne logique, emojis proscrits sauf demande explicite), pour rappel automatique lors de la rédaction de tout document | `./.claude/rules/conventions-redaction.md` | [1](./01_modalitesUsageEtConventions.md#règles-de-rédaction-des-documents-markdown) | — | à faire |
| Créer un fichier de règle reprenant le périmètre de délégation retenu (documentation + code, supervision continue), l'obligation de mention de l'origine IA dans les documents et le code substantiellement générés, et les points de vigilance spécifiques au projet (calcul des indicateurs, sécurité/confidentialité des données, architecture Tauri/Rust/Angular, conformité aux référentiels externes) | `./.claude/rules/usage-ia.md` | [1](./01_modalitesUsageEtConventions.md#usage-de-lia-au-sens-large) | — | à faire |
| Compléter `./.claude/settings.json` pour interdire l'accès direct de l'IA au contenu du fichier de données applicatif chiffré, une fois son nom et son emplacement définis | `./.claude/settings.json` | [1](./01_modalitesUsageEtConventions.md#protection-des-informations-sensibles) | 7 (modèle de données) | différé |
| Mettre en place un script de journalisation automatique des prompts significatifs (traçabilité des échanges) | à définir (script + répertoire de logs) | [1](./01_modalitesUsageEtConventions.md#traçabilité-des-échanges-significatifs) | 9 (normes de développement) ou 17 (poste développeur) | différé |
