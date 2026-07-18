# Plan de mise en place

## Sommaire

1. [Objet du document](#objet-du-document)
2. [Actions issues de l'étape 10 — Normes de sécurité applicative](#actions-issues-de-létape-10--normes-de-sécurité-applicative)

## Objet du document

Ce document trace, au fil des étapes de cadrage, les modifications techniques détectées durant les conversations et restant à réaliser après la rédaction des documents ([règle générale n°8](./_modèles/00_promptInitial.md)). Chaque ligne précise l'action, le ou les fichiers concernés, l'étape d'origine, l'étape cible (lorsque le traitement est différé à une étape ultérieure connue) et le statut d'avancement.

## Actions issues de l'étape 10 — Normes de sécurité applicative

| action | fichier(s) concerné(s) | étape d'origine | étape cible | statut |
|---|---|---|---|---|
| Corriger `.gitignore` pour committer les lockfiles (`package-lock.json`) conformément à la décision de l'étape 9, et exclure explicitement les secrets (`*.pem`, `*.key`) et les futurs artefacts de build Rust (`/src-tauri/target/`) | `./.gitignore` | [10](./15_normesSecurite.md#gestion-des-secrets-et-données-sensibles) | — | fait |
| Configurer `cargo audit` et `npm audit` en intégration continue, avec blocage du pipeline sur vulnérabilité critique ou élevée | pipeline CI (à définir) | [10](./15_normesSecurite.md#analyse-des-dépendances-vulnérables) | 12 (intégration continue) — le pipeline n'existe pas encore à ce stade | différé |
| Créer le fichier d'exceptions versionné pour les vulnérabilités connues sans correctif disponible (justification et date de réévaluation) | à définir (ex. `audit-exceptions.json`) | [10](./15_normesSecurite.md#analyse-des-dépendances-vulnérables) | 12 (intégration continue) | différé |
| Documenter la présence et la justification de `.gitignore` (exclusions Angular/Rust/Node déjà en place, complémentaires aux exclusions de secrets déjà tracées ci-dessus) dans les normes de développement, à l'image du traitement déjà réservé à `.editorconfig` et `.vscode/extensions.json` ([14_normesDeveloppement.md](./14_normesDeveloppement.md#règles-de-qualité-de-code)) | `./.gitignore`, `./docs/14_normesDeveloppement.md` | 10 (élément déjà présent dans le dépôt, détecté en relecture, cf. [règle générale n°17](./_modèles/00_promptInitial.md)) | 12 (poste développeur) | à faire |
| Documenter la configuration GitHub Codespaces (`.devcontainer/devcontainer.json`), déjà présente dans le dépôt, dans le futur chapitre poste développeur | `./.devcontainer/devcontainer.json` | 10 (élément déjà présent dans le dépôt, détecté en relecture, cf. [règle générale n°17](./_modèles/00_promptInitial.md)) | 12 (poste développeur) | à faire |
| Confirmer ou remettre en cause le choix de licence logicielle déjà matérialisé par le fichier `LICENSE` (GNU GPLv3) déjà présent dans le dépôt, documenter ce choix en cohérence avec la stratégie de publication, et le tracer dans le journal des décisions | `./LICENSE`, `./docs/02_glossaire.md` (journal des décisions) | 10 (élément déjà présent dans le dépôt, détecté en relecture, cf. [règle générale n°17](./_modèles/00_promptInitial.md)) | 12 (stratégie de build, empaquetage et publication) | à faire |
