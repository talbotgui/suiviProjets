# Exigences non fonctionnelles

## Sommaire

1. [Convention d'identifiant](#convention-didentifiant)
2. [Performance](#performance)
3. [Scalabilité et montée en charge](#scalabilité-et-montée-en-charge)
4. [Disponibilité et tolérance aux pannes](#disponibilité-et-tolérance-aux-pannes)
5. [Sécurité](#sécurité)
6. [Accessibilité](#accessibilité)
7. [Portabilité et environnements cibles](#portabilité-et-environnements-cibles)
8. [Internationalisation et localisation](#internationalisation-et-localisation)
9. [Contraintes réglementaires et légales](#contraintes-réglementaires-et-légales)
10. [Matrice de traçabilité](#matrice-de-traçabilité)

## Convention d'identifiant

Chaque exigence non fonctionnelle porte un identifiant stable de la forme `RNF-NNN` (numérotation séquentielle sur trois chiffres), attribué à la création et jamais renommé. Cet identifiant est réutilisé sans changement dans les étapes suivantes (conception, tests, etc.).

## Performance

| identifiant | exigence | valeur cible |
|---|---|---|
| RNF-001 | Temps d'affichage de la synthèse des audits après ouverture du fichier de données | Moins de 2 secondes, à l'échelle de volumétrie visée (cf. [RNF-006](#scalabilité-et-montée-en-charge)) |
| RNF-002 | Temps de dérivation de clé (Argon2id, mémoire ≥ 64 Mo, 3 itérations, cf. [Specification.md, section 5.1](./01_besoin/Specification.md#51-f01--stockage-chiffré-local)) au chargement et à la sauvegarde du fichier | Quelques secondes au maximum ; ponctuel et acceptable au regard du gain de sécurité |
| RNF-003 | Temps de calcul local des indicateurs (jugement calculé à l'affichage) par projet, hors latence des appels réseau externes | Moins de 500 millisecondes par projet |
| RNF-004 | Concurrence par défaut des appels lors d'une campagne d'audit (cf. [RG-017](./05_reglesGestion.md#audits-et-campagnes)) | 4 projets simultanés, valeur paramétrable, pour ménager les instances GitLab/Sonar et le proxy d'entreprise |
| RNF-005 | Temps de réponse de la recherche transversale | Résultats affichés en moins d'une seconde, grâce à un index construit en mémoire à l'ouverture du fichier |

## Scalabilité et montée en charge

| identifiant | exigence |
|---|---|
| RNF-006 | L'application reste pleinement utilisable (temps de rendu et de calcul conformes à la section Performance) jusqu'à une échelle moyenne : quelques dizaines de groupes, quelques centaines de projets au total, plusieurs années d'historique d'audits par projet |
| RNF-007 | La purge et l'agrégation des audits anciens (cf. [RG-024](./05_reglesGestion.md#seuils-référentiels-et-historisation), [RG-025](./05_reglesGestion.md#seuils-référentiels-et-historisation)) permettent de contenir la croissance du fichier de données dans le temps sans perte de la tendance longue |
| RNF-008 | Le dimensionnement de l'application repose exclusivement sur les ressources du poste utilisateur (mono-poste, sans serveur ni base de données partagée) ; aucune scalabilité horizontale n'est requise |

## Disponibilité et tolérance aux pannes

| identifiant | exigence |
|---|---|
| RNF-009 | L'application étant locale et mono-poste, sa disponibilité dépend uniquement de celle du poste utilisateur ; aucun engagement de disponibilité de service (SLA) n'est applicable |
| RNF-010 | Une panne ou une indisponibilité d'une instance GitLab ou Sonar externe n'interrompt jamais une campagne d'audit : les échecs sont isolés par projet et par source (anomalies typées, cf. [RG-021](./05_reglesGestion.md#audits-et-campagnes)) et la campagne se poursuit sur le reste du périmètre |
| RNF-011 | Le fichier de données chiffré sur disque reste la seule source de vérité récupérable en cas d'incident applicatif (fermeture forcée, panne) ; les sauvegardes de sécurité horodatées (cf. [RG-003](./05_reglesGestion.md#stockage-et-confidentialité-des-données)) permettent de restaurer une version antérieure |

## Sécurité

| identifiant | exigence |
|---|---|
| RNF-012 | Le fichier de données est chiffré au repos par Argon2id (dérivation de clé) puis AES-256-GCM (chiffrement authentifié), avec sel et IV aléatoires régénérés à chaque sauvegarde (cf. [Specification.md, section 5.1](./01_besoin/Specification.md#51-f01--stockage-chiffré-local)) |
| RNF-013 | Aucun credential n'est jamais persisté sur disque ni dans un stockage navigateur ; il vit exclusivement en mémoire volatile pour la durée de la session (cf. [RG-004](./05_reglesGestion.md#stockage-et-confidentialité-des-données)) |
| RNF-014 | La session se verrouille automatiquement après un délai d'inactivité paramétrable (défaut 15 minutes, cf. [Specification.md, section 5.20](./01_besoin/Specification.md#520-f20--verrouillage-de-session)) ou sur action manuelle, avec effacement immédiat de la clé dérivée et des credentials en mémoire (cf. [RG-005](./05_reglesGestion.md#stockage-et-confidentialité-des-données)) |
| RNF-015 | Une Content Security Policy stricte est appliquée (sans `unsafe-inline` ni `eval`) et aucune injection HTML dynamique n'est permise, pour limiter le risque de vol de credentials via une XSS |
| RNF-016 | Les dépendances du projet sont verrouillées (fichier de lock) et auditées en intégration continue, quel que soit l'écosystème de dépendances confirmé à l'étape 6 (détail à l'étape 10 — normes de sécurité applicative, et à l'étape 12 — intégration continue) |
| RNF-017 | L'export en clair de la configuration exclut structurellement toute donnée personnelle ou sensible (membres connus, campagnes, brouillon, journal, vues enregistrées, cf. [RG-028](./05_reglesGestion.md#vues-alertes-export-et-import)) ; volet spécifique aux données personnelles détaillé en [RNF-027](#contraintes-réglementaires-et-légales) |
| RNF-018 | L'application ne comporte pas de mécanisme d'authentification ou d'autorisation applicatif dédié, le profil utilisateur étant unique et sans notion de compte ; la protection des données repose sur le mot de passe de déchiffrement du fichier et sur le verrouillage de session |

## Accessibilité

| identifiant | exigence |
|---|---|
| RNF-019 | L'interface respecte les critères de conformité [WCAG 2.1](https://www.w3.org/TR/WCAG21/) niveau AA : contrastes suffisants, navigation clavier complète, structure sémantique, alternatives textuelles, focus visible |
| RNF-020 | Les codes de couleur porteurs de sens (seuils verts/oranges/rouges, alerte membre inconnu, badges de statut) sont systématiquement doublés d'un libellé textuel ou d'un pictogramme, afin de rester perceptibles indépendamment de la perception des couleurs |

## Portabilité et environnements cibles

| identifiant | exigence |
|---|---|
| RNF-021 | L'application est distribuée comme application de bureau native, packagée pour Windows, macOS et Linux, quelle que soit la pile technique confirmée à l'étape 6 (Tauri mentionné à titre indicatif dans le dossier source, cf. [Specification.md, section 1.1](./01_besoin/Specification.md#11-architecture-retenue)) |
| RNF-022 | Le fichier de données chiffré est portable indépendamment du système d'exploitation et de la machine (format d'enveloppe versionné, cf. [Specification.md, section 6.3](./01_besoin/Specification.md#63-enveloppe-chiffrée)), permettant son transfert d'un poste à l'autre |
| RNF-023 | Les accès réseau respectent la configuration proxy éventuelle du poste (`HTTP_PROXY`/`HTTPS_PROXY`/`NO_PROXY`) et prennent en charge un bundle d'autorité de certification interne pour l'inspection TLS |

## Internationalisation et localisation

| identifiant | exigence |
|---|---|
| RNF-024 | L'intégralité de l'interface, de la documentation, du modèle de données, du code source (variables, fonctions, commandes) et des discriminants de type est rédigée en français, sous réserve de l'exception applicable aux valeurs imposées par les API externes ([RNF-025](#internationalisation-et-localisation)) ; aucune autre langue n'est prise en charge dans le périmètre actuel |
| RNF-025 | Les valeurs imposées par les API externes (clés de métriques Sonar, champs GitLab) restent en anglais dans la seule couche connecteur et sont traduites en français à la frontière avec le reste de l'application |
| RNF-026 | Les dates et durées affichées suivent les conventions françaises (format JJ/MM/AAAA, durées explicites) ; aucune prise en charge multi-locale n'est requise à ce stade |
| RNF-029 | Tous les libellés sont centralisés dans l'application pour faciliter leur évolution. L'arborescence et la clef de chaque libellé est dédiée à un écran (pas de mutualisation d'un libellé utilisé dans deux écrans différents). Les libellés des zones/composants communs (menu, entête, ...) font l'objet d'une arborescence/clef dédiée. |

## Contraintes réglementaires et légales

Les données relatives aux membres et contributeurs des projets audités (username, nom, email, statut) constituent des données à caractère personnel au sens du [RGPD](https://eur-lex.europa.eu/eli/reg/2016/679/oj), dans la mesure où elles permettent d'identifier des personnes physiques.

| identifiant | exigence |
|---|---|
| RNF-027 | Les données personnelles des membres et contributeurs sont minimisées par les règles de reconnaissance par domaine (cf. [RG-007](./05_reglesGestion.md#membres-et-sécurité-des-accès)), protégées au repos par le chiffrement du fichier ([RNF-012](#sécurité)), et structurellement exclues de tout export en clair ([RG-028](./05_reglesGestion.md#vues-alertes-export-et-import), mécanisme déjà posé de façon générique par [RNF-017](#sécurité)) |
| RNF-028 | Aucune donnée personnelle n'est transmise à un tiers ou à un service externe autre que les instances GitLab et Sonar déjà utilisées dans le cadre de l'activité professionnelle de l'utilisateur |

La qualification juridique précise du traitement (responsable de traitement, base légale, éventuelle exemption pour usage strictement personnel) relève d'une analyse humaine et n'est pas tranchée par ce document ; il s'agit d'un point de vigilance renforcée déjà acté à l'étape 1 (cf. [Points de vigilance spécifiques au projet](./01_modalitesUsageEtConventions.md#points-de-vigilance-spécifiques-au-projet)).

## Matrice de traçabilité

| exigence non fonctionnelle | objectif / cas d'usage concerné |
|---|---|
| RNF-001, RNF-003, RNF-005 | [Réduire le temps nécessaire pour obtenir une vue d'ensemble multi-groupes](./03_expressionBesoin.md#objectifs-mesurables-du-projet) ; US-015, US-016, US-021 |
| RNF-002, RNF-012, RNF-013, RNF-014, RNF-015, RNF-016, RNF-017, RNF-018 | [Garantir la confidentialité des données auditées et des credentials](./03_expressionBesoin.md#objectifs-mesurables-du-projet) ; US-001, US-002, US-003, US-004, US-026 |
| RNF-004 | US-009, US-010, US-012 |
| RNF-006, RNF-007, RNF-008 | US-025 ; échelle de volumétrie retenue à l'étape 4 |
| RNF-009, RNF-010, RNF-011 | US-010, US-011, US-013 |
| RNF-019, RNF-020 | Ensemble des écrans de restitution (Synthèse des audits, Fiche projet, Liste de travail) |
| RNF-021, RNF-022, RNF-023 | Contrainte d'architecture desktop ([Specification.md, section 1.1](./01_besoin/Specification.md#11-architecture-retenue)) |
| RNF-024, RNF-025, RNF-026, RNF-029 | Principe « Français intégral » ([Specification.md, section 1.2](./01_besoin/Specification.md#12-principes-de-conception)) |
| RNF-027, RNF-028 | [Éliminer les angles morts de sécurité liés aux membres non identifiés](./03_expressionBesoin.md#objectifs-mesurables-du-projet) ; US-022, US-023 |
