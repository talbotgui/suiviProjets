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
| Qualimétrie | Mesure de la qualité logicielle d'un projet (couverture de tests, dette technique, violations, notes Sonar, etc.), au sens large adopté dans ce projet pour désigner l'ensemble des indicateurs de qualité et d'obsolescence suivis. | 2 |
| Membre inconnu (statut `inconnu`) | Statut attribué par défaut à un membre de dépôt ou contributeur ne correspondant à aucune règle des membres connus du groupe ; signal de sécurité prioritaire devant rester visible en toutes circonstances (cf. [Specification.md, section 5.17](./01_besoin/Specification.md#517-f17--surveillance-des-membres-et-premier-commit-interne)). | 2 |
| Politique IA | Paramètre par projet (`iaAutorisee`) déterminant si l'usage d'outils d'intelligence artificielle est autorisé sur ce projet ; interdit par défaut (cf. [Specification.md, section 5.18](./01_besoin/Specification.md#518-f18--politique-ia)). | 2 |
| Groupe | Rassemble des projets en un ensemble ayant du sens organisationnel ; porte les instances, la liste des membres connus et les annotations de portée groupe (cf. [Specification.md, section 4](./01_besoin/Specification.md#4-glossaire)). | 3 |
| Projet | Unité logique de suivi contenant au moins un dépôt GitLab et pouvant rassembler d'autres sources (projets Sonar, autres dépôts). | 3 |
| Source | Élément fournissant la vérité auditable : un dépôt GitLab ou un projet Sonar rattaché à une instance. | 3 |
| Instance | Serveur GitLab ou Sonar (URL de base) référencé dans un groupe, dans lequel sont sélectionnées les sources des projets. | 3 |
| Audit | Action d'interroger les sources d'un ou plusieurs projets pour en extraire les indicateurs à la date du jour et en sauvegarder les résultats. | 3 |
| Campagne | Une exécution d'audit portant sur un périmètre de projets, laissant une trace (verdicts par projet) support de la reprise et du rapport d'anomalies. | 3 |
| Brouillon | Zone de transit des résultats d'une campagne avant validation et intégration à l'historique ; au plus un brouillon à la fois. | 3 |
| Résultat | Donnée structurée conservée d'un audit à l'autre, typée par un discriminant `type` (ex. `gitlab.dependances`, `sonar.notes`) ; ne contient jamais de verdict, seulement des constats bruts (cf. [RG-011](./05_reglesGestion.md#constat-jugement-et-politique-ia)). | 3 |
| Indicateur | Grandeur restituée à l'utilisateur, extraite d'un résultat directement ou par calcul contre les seuils et référentiels courants. | 3 |
| Référentiel | Grille de lecture partageable entre utilisateurs (règles de dépendances, règles de marqueurs IA), exportable en clair. | 3 |
| Membres connus | Donnée propre à un groupe, non partageable et jamais exportée en clair : règles d'identification des collaborateurs par username, email ou domaine (cf. [RG-006](./05_reglesGestion.md#membres-et-sécurité-des-accès) à [RG-008](./05_reglesGestion.md#membres-et-sécurité-des-accès)). | 3 |
| Alerte | Situation remontée par la liste de travail (membre inconnu, violation IA, SONAR_KO, projet mort, dépendance obsolète, etc.), identifiée par une clé stable pour le suivi de traitement. | 3 |
| Annotation | Repère daté posé sur un projet ou un groupe (migration, changement d'équipe, incident, activation IA, etc.), affiché sur les graphiques d'évolution. | 3 |
| Ref auditée (`refAuditee`) | Branche, tag ou SHA sur lequel portent les audits d'un dépôt GitLab ; par défaut la branche par défaut du dépôt. | 3 |
| SONAR_KO | Badge signalant que la dernière analyse Sonar est incohérente avec la date du dernier commit de la ref auditée, au-delà d'une tolérance paramétrable. | 3 |
| Vue enregistrée | Modèle nommé de filtres (groupes, projets, indicateurs, période, tri) réutilisable sur la synthèse, le grand graphique ou la liste de travail. | 3 |

## Termes techniques

Ce chapitre liste les termes techniques employés dans la discussion et les documents, avec leur définition et l'étape au cours de laquelle ils sont apparus.

| terme | définition | étape |
|---|---|---|
| [IA Fluency](./01_modalitesUsageEtConventions.md#usage-de-lia-au-sens-large) | Cadre de référence (4D Framework), défini par les professeurs Rick Dakan et Joseph Feller en collaboration avec Anthropic, structurant l'usage de l'IA selon quatre axes : délégation (quelles tâches confier à l'IA), description (comment formuler les demandes et tracer les échanges), discernement (évaluer la fiabilité des réponses) et diligence (relire, vérifier, assumer la responsabilité finale). Documentation de référence : [aifluencyframework.org](https://aifluencyframework.org/). | 1 |
| Credential | Identifiant d'accès (jeton, token) à une instance GitLab ou SonarQube, saisi en mémoire volatile et jamais persisté sur disque (cf. [Specification.md, section 5.2](./01_besoin/Specification.md#52-f02--gestion-des-credentials-et-assistant-de-création)). | 2 |

## Acronymes

Ce chapitre liste les acronymes employés dans la discussion et les documents, avec leur signification développée.

| aconyme | signification |
|---|---|
| IA | Intelligence Artificielle |
| MoSCoW | Méthode de priorisation Must have / Should have / Could have / Won't have, retenue pour prioriser les cas d'usage à partir de l'étape 3 |
| US | User Story (cas d'usage), identifiant `US-NNN` défini à l'étape 3 |
| RG | Règle de Gestion, identifiant `RG-NNN` défini à l'étape 3 |
| RNF | Exigence Non Fonctionnelle, identifiant `RNF-NNN` défini à l'étape 4 |
| WCAG | Web Content Accessibility Guidelines, référentiel international de critères d'accessibilité numérique (niveau AA retenu à l'étape 4, cf. [WCAG 2.1](https://www.w3.org/TR/WCAG21/), W3C) |
| RGPD | Règlement Général sur la Protection des Données, réglementation européenne encadrant le traitement des données à caractère personnel (cf. [Règlement (UE) 2016/679](https://eur-lex.europa.eu/eli/reg/2016/679/oj)) |
| CSP | Content Security Policy, mécanisme du navigateur limitant les sources de contenu exécutable pour réduire le risque d'injection (XSS) |
| SLA | Service Level Agreement, engagement contractuel de disponibilité d'un service ; non applicable à cette application locale et mono-poste |

## Journal des décisions

Ce chapitre trace les décisions structurantes prises au fil des étapes (choix d'architecture, de technologies, de conception, etc.) : décision retenue, alternatives envisagées, justification du choix, étape et date de la décision. Il est complété au fil des étapes suivantes dès qu'une décision structurante est prise.

| décision | alternatives envisagées | justification | étape | date |
|---|---|---|---|---|
| [Délégation IA étendue à la documentation et au code, avec supervision humaine continue à chaque étape intermédiaire](./01_modalitesUsageEtConventions.md#périmètre-des-tâches-délégables-à-lia) | Documentation uniquement ; documentation et code avec seule relecture finale | Projet mené par un développeur unique : la supervision continue permet de détecter tôt les dérives sans ralentir excessivement le flux de travail | 1 | 2026-07-14 |
| [Traçabilité des échanges assurée par l'historique des sessions et les commits Git ; script de journalisation dédié différé](./01_modalitesUsageEtConventions.md#traçabilité-des-échanges-significatifs) | Script de journalisation mis en place immédiatement ; absence de traçabilité formalisée | Un outillage dédié est jugé prématuré avant que les normes de développement (étape 9) et le poste développeur (étape 17) ne soient définis | 1 | 2026-07-14 |
| [Mention explicite de l'origine IA dans les documents et le code substantiellement générés, en complément des messages de commit](./01_modalitesUsageEtConventions.md#mention-de-lorigine-des-contenus) | Mention en commit uniquement ; aucune mention | Renforce la transparence sur la part de contenu généré, utile en cas de relecture ultérieure ou d'audit | 1 | 2026-07-14 |
| [Quatre domaines de vigilance renforcée retenus : calcul des indicateurs qualité, sécurité et confidentialité des données, architecture technique de l'application desktop, conformité aux référentiels externes](./01_modalitesUsageEtConventions.md#points-de-vigilance-spécifiques-au-projet) | Vigilance limitée à un sous-ensemble de ces domaines | Ces domaines concentrent le risque métier (jugement erroné), le risque de sécurité (données personnelles/membres) et le risque technique (architecture desktop, choix non encore figé) propres à ce projet | 1 | 2026-07-14 |
