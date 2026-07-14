# Glossaire et journal des décisions

## Sommaire

1. [Termes métier](#termes-métier)
2. [Termes techniques](#termes-techniques)
3. [Acronymes](#acronymes)
4. [Journal des décisions](#journal-des-décisions)

## Termes métier

Ce chapitre liste les termes métier employés dans la discussion et les documents, avec leur définition et l'étape au cours de laquelle ils sont apparus. Il est complété au fil des étapes suivantes dès qu'un nouveau terme ambigu apparaît.

| terme | définition | étape |
|---|---|---|
| | | |

## Termes techniques

Ce chapitre liste les termes techniques employés dans la discussion et les documents, avec leur définition et l'étape au cours de laquelle ils sont apparus.

| terme | définition | étape |
|---|---|---|
| [IA Fluency](./01_modalitesUsageEtConventions.md#usage-de-lia-au-sens-large) | Cadre de référence (4D Framework), défini par les professeurs Rick Dakan et Joseph Feller en collaboration avec Anthropic, structurant l'usage de l'IA selon quatre axes : délégation (quelles tâches confier à l'IA), description (comment formuler les demandes et tracer les échanges), discernement (évaluer la fiabilité des réponses) et diligence (relire, vérifier, assumer la responsabilité finale). Documentation de référence : [aifluencyframework.org](https://aifluencyframework.org/). | 1 |

## Acronymes

Ce chapitre liste les acronymes employés dans la discussion et les documents, avec leur signification développée.

| aconyme | signification |
|---|---|
| IA | Intelligence Artificielle |

## Journal des décisions

Ce chapitre trace les décisions structurantes prises au fil des étapes (choix d'architecture, de technologies, de conception, etc.) : décision retenue, alternatives envisagées, justification du choix, étape et date de la décision. Il est complété au fil des étapes suivantes dès qu'une décision structurante est prise.

| décision | alternatives envisagées | justification | étape | date |
|---|---|---|---|---|
| [Délégation IA étendue à la documentation et au code, avec supervision humaine continue à chaque étape intermédiaire](./01_modalitesUsageEtConventions.md#périmètre-des-tâches-délégables-à-lia) | Documentation uniquement ; documentation et code avec seule relecture finale | Projet mené par un développeur unique : la supervision continue permet de détecter tôt les dérives sans ralentir excessivement le flux de travail | 1 | 2026-07-14 |
| [Traçabilité des échanges assurée par l'historique des sessions et les commits Git ; script de journalisation dédié différé](./01_modalitesUsageEtConventions.md#traçabilité-des-échanges-significatifs) | Script de journalisation mis en place immédiatement ; absence de traçabilité formalisée | Un outillage dédié est jugé prématuré avant que les normes de développement (étape 9) et le poste développeur (étape 17) ne soient définis | 1 | 2026-07-14 |
| [Mention explicite de l'origine IA dans les documents et le code substantiellement générés, en complément des messages de commit](./01_modalitesUsageEtConventions.md#mention-de-lorigine-des-contenus) | Mention en commit uniquement ; aucune mention | Renforce la transparence sur la part de contenu généré, utile en cas de relecture ultérieure ou d'audit | 1 | 2026-07-14 |
| [Quatre domaines de vigilance renforcée retenus : calcul des indicateurs qualité, sécurité et confidentialité des données, architecture Tauri/Rust/Angular, conformité aux référentiels externes](./01_modalitesUsageEtConventions.md#points-de-vigilance-spécifiques-au-projet) | Vigilance limitée à un sous-ensemble de ces domaines | Ces domaines concentrent le risque métier (jugement erroné), le risque de sécurité (données personnelles/membres) et le risque technique (architecture desktop hybride) propres à ce projet | 1 | 2026-07-14 |
