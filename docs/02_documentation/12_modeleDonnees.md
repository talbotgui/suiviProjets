# Modèle de données

## Sommaire

1. [Entités, attributs et relations](#entités-attributs-et-relations)
2. [Invariants et règles de cohérence](#invariants-et-règles-de-cohérence)
3. [Stratégie de persistance](#stratégie-de-persistance)
4. [Stratégie de migration des données](#stratégie-de-migration-des-données)
5. [Stratégie de sauvegarde et de restauration](#stratégie-de-sauvegarde-et-de-restauration)
6. [Gouvernance et propriété des données](#gouvernance-et-propriété-des-données)
7. [Règles de validation des données](#règles-de-validation-des-données)
8. [Matrice de traçabilité](#matrice-de-traçabilité)

Ce modèle de données reprend et formalise la structure déjà posée par le dossier de besoin ([Specification.md, section 6.1](../01_besoin/Specification.md#61-vue-densemble) à [section 6.4](../01_besoin/Specification.md#64-fichiers-livrés-avec-cette-spécification), et [exemple-donnees.json](../01_besoin/exemple-donnees.json)) ; le fichier `schema-donnees.schema.json` mentionné en [section 6.4](../01_besoin/Specification.md#64-fichiers-livrés-avec-cette-spécification) de la spécification n'a pas été livré avec le dossier source. En son absence, ce document sert de référence structurelle à ce stade ; un schéma JSON formel pourra être dérivé de ce modèle en conception détaillée (étape 8) si besoin d'une validation automatisée.

## Entités, attributs et relations

| entité | attributs | relations |
|---|---|---|
| Racine (Données) | `versionSchema` (entier), `meta` (`creeLe`, `modifieLe`, `application`) | Racine unique de l'arbre ; contient `groupes[]`, `referentiels`, `parametres`, `campagnes[]`, `brouillon`, `traitementsAlertes[]`, `journal[]`, `vuesEnregistrees[]` |
| Groupe | `id` (UUID), `nom`, `description`, `indicateursDesactives[]` | 1 Groupe → n Instance, n MembreConnu, n Annotation (portée groupe), n Projet |
| Instance | `id`, `type` (`gitlab` \| `sonar`), `nom`, `urlBase` | Appartient à un Groupe ; référencée par les Source des projets du groupe |
| MembreConnu | `id`, `critere`, `typeCritere` (`username` \| `email` \| `domaineEmail`), `statut` (`interne` \| `client` \| `partenaire`), `libelle` (optionnel), `aliasEmail` (optionnel) | Appartient à un Groupe ; donnée personnelle jamais exportée en clair (cf. [RG-006](./05_reglesGestion.md#membres-et-sécurité-des-accès) à [RG-008](./05_reglesGestion.md#membres-et-sécurité-des-accès)) |
| Projet | `id`, `nom`, `description`, `iaAutorisee` (booléen), `iaAutoriseeDepuis` (optionnel), `premierCommitInterne` (objet imbriqué : `date`, `sha`, `emailAuteur`, `calculeLe`, `empreinteReferentiel`, `statut`) | Appartient à un Groupe ; 1 Projet → n Source, n Annotation (portée projet), n Audit |
| Source | `id`, `instanceId`, `type` (`depotGitlab` \| `projetSonar`), `idExterne`, `refAuditee` (optionnelle) | Appartient à un Projet ; référence une Instance du même groupe |
| Annotation | `id`, `date`, `libelle`, `categorie`, `description` (optionnelle) | Portée Groupe ou Projet ; repère daté affiché sur les graphiques d'évolution |
| Audit | `id`, `date`, `campagneId` | Appartient à un Projet ; 1 Audit → n Résultat ; référence la Campagne qui l'a produit |
| Résultat | `type` (discriminant `origine.nature`), `sourceId` (selon type), `refEffective`/`shaTete` (résultats issus de GitLab), attributs propres au type | Appartient à un Audit ; le catalogue figé des types et de leurs attributs est documenté en [Specification.md, section 5.5](../01_besoin/Specification.md#55-f05--audits-et-catalogue-des-indicateurs) ; ne contient jamais de verdict calculé ([RG-011](./05_reglesGestion.md#constat-jugement-et-politique-ia)) |
| RegleDependance | `id`, `motif`, `versions[]` (`motifVersion`, `statut`), `categorie` (optionnel, `id` d'une CategorieDependance, US-049) | Élément des Référentiels (branche `referentiels.reglesDependances`, partageable, exportée en clair) ; une règle de motif `java`, catégorie `exec`, est amorcée par défaut à la création du fichier et insérée lors de la migration de schéma `5` → `6` si absente (US-050 : elle qualifie la version de Java relevée par le Connecteur GitLab dans les `pom.xml`, exposée comme une dépendance de référence `java`) ; le `statut` d'une borne reste un champ libre (RG-022), mais sa casse est normalisée vers l'une des quatre valeurs canoniques (`obsolete`, `maintenu`, `aJourM1`, `aJourM3`) quand elle n'en diffère que par la casse — à la saisie et lors du palier de migration `6` → `7` (RG-043, Phase 16) |
| RegleMarqueurIA | `id`, `motif`, `typeCorrespondance`, `portee`, `nature`, `outil` | Élément des Référentiels (branche `referentiels.reglesMarqueursIA`, partageable, exportée en clair) |
| CategorieDependance | `id`, `libelle`, `sigle` (trois lettres au plus) | Élément des Référentiels (branche `referentiels.categoriesDependances`, partageable, exportée en clair) ; liste administrable initialisée par défaut à `exec`, `os`, `fmkBack`, `fmkFront` (US-048) ; une RegleDependance peut porter l'`id` d'une de ces catégories via son attribut optionnel `categorie` (US-049), consommé par le Moteur de jugement pour l'écran Obsolescence (US-051) |
| MotifNommageBranches | `motif` (chaîne, expression régulière) | Attribut scalaire des Référentiels (branche `referentiels.motifNommageBranches`, partageable, exportée en clair) ; à la différence de RegleDependance/RegleMarqueurIA/CategorieDependance, ce n'est pas une liste d'entités mais une valeur unique, initialisée par défaut à la convention Gitflow (cf. [RG-030](./05_reglesGestion.md#seuils-référentiels-et-historisation)) |
| Paramètres | `seuils` (vitalité, taille de dépôt, couverture, fraîcheur Sonar, activité sans qualité, fraîcheur d'audit, MR ouvertes, couleurs de violations, matérialité du brouillon), `verrouillage`, `audit` (concurrence, fenêtres), `proxy`, `sauvegarde` (nombre de sauvegardes de sécurité) | Occurrence unique à la racine ; seule la sous-branche `seuils` est exportée en clair |
| Campagne | `id`, `date`, `perimetre[]` (identifiants de Projet), `verdicts[]` (`projetId`, `statut`, `dureeMs` optionnel, `anomalies[]` optionnel) | Référence les Projet de son périmètre |
| Brouillon | `campagneId`, `creeLe`, `resultatsParProjet[]` (`projetId`, `audit`, `statut`, `motifRejet` optionnel, `aberrations[]` optionnel) | Occurrence unique et nullable à la racine ; référence la Campagne dont il est issu |
| TraitementAlerte | `id`, `cleAlerte`, `statut` (`vue` \| `traitee`), `commentaire` (optionnel), `horodatage` | Indépendant des Audit ; clé stable de suivi (cf. [RG-026](./05_reglesGestion.md#vues-alertes-export-et-import)) |
| EntréeJournal | `id`, `horodatage`, `objet`, `avant`, `apres`, `origine`, `detailOrigine` (optionnel) | Append-only ; référence librement un objet de n'importe quelle autre entité par son chemin |
| VueEnregistrée | `id`, `nom`, `ecran`, `versionFiltres`, `parDefaut` (booléen), `filtres` | Donnée de travail personnelle, non exportée. Depuis le palier de schéma `9` → `10` (2026-08-30), la forme de `filtres` est uniforme pour tous les écrans — `{ groupeId: string \| null, projetIds: string[] \| null }` (`null` = tous) — et `versionFiltres` vaut `1` pour tous les écrans ; le cœur natif ne l'interprète pas (typée `unknown` côté Rust), seule l'interface le fait. Le périmètre couvre quatre écrans : Synthèse des audits, Synthèse graphique, Obsolescence, Liste de travail ([RG-027](./05_reglesGestion.md#vues-alertes-export-et-import) amendée, [RG-053](./05_reglesGestion.md#navigation-transverse-et-filtrage-mutualisé), [RG-054](./05_reglesGestion.md#vues-alertes-export-et-import)) |

## Invariants et règles de cohérence

- Toute entité identifiée porte un UUID v4 généré à la création et jamais réutilisé ni modifié (cf. [Specification.md, section 6.2](../01_besoin/Specification.md#62-règles-transverses)).
- Un Résultat n'existe que rattaché à un Audit ; son champ `type` détermine le schéma de ses attributs et appartient au catalogue figé documenté dans le dossier de besoin.
- Aucun Résultat ne contient de champ de statut ou de verdict calculé : seuls des constats bruts y figurent ([RG-011](./05_reglesGestion.md#constat-jugement-et-politique-ia)). En particulier, un Résultat `gitlab.branches` ne stocke que le nom de chaque branche (et les autres constats bruts associés) : sa conformité de nommage n'y figure jamais, elle est calculée à l'affichage par confrontation avec `referentiels.motifNommageBranches` courant ([RG-030](./05_reglesGestion.md#seuils-référentiels-et-historisation)).
- `referentiels.motifNommageBranches` n'est jamais vide : une valeur par défaut représentant la convention Gitflow est appliquée à la création du fichier de données et ne peut être vidée, seulement remplacée par un autre motif.
- Une Source référence une Instance appartenant au même Groupe que son Projet.
- L'absence de `refAuditee` sur une Source n'est pas une valeur ambiguë : elle signifie explicitement « branche par défaut du dépôt », résolue à chaque audit et jamais figée en avance.
- Au sein d'un même Groupe, deux `MembreConnu` de `typeCritere` `username` ne peuvent porter le même `critere` (doublon bloqué à la saisie, cf. [RG-008](./05_reglesGestion.md#membres-et-sécurité-des-accès)).
- Au plus une occurrence de `Brouillon` existe simultanément à la racine (nullable) ; une nouvelle Campagne ne peut être créée tant que le Brouillon courant n'est pas vidé ([RG-019](./05_reglesGestion.md#audits-et-campagnes)).
- La `cleAlerte` d'un TraitementAlerte suit le motif `type_alerte|projetId|discriminant` et reste stable indépendamment des audits successifs.
- `iaAutorisee` vaut `false` par défaut si le champ est absent ; `iaAutoriseeDepuis` n'est renseigné que si `iaAutorisee` est ou a été `true` ([RG-014](./05_reglesGestion.md#constat-jugement-et-politique-ia), [RG-015](./05_reglesGestion.md#constat-jugement-et-politique-ia)).
- `versionSchema` de la racine est un entier strictement croissant, incrémenté à chaque évolution structurelle du modèle.
- Les `Audit` intégrés à l'historique d'un Projet ne sont supprimés ou agrégés que par une purge explicitement déclenchée par l'utilisateur, jamais automatiquement ([RG-024](./05_reglesGestion.md#seuils-référentiels-et-historisation), [RG-025](./05_reglesGestion.md#seuils-référentiels-et-historisation)).

## Stratégie de persistance

Les données vivent exclusivement dans un fichier unique, choisi par l'utilisateur (nom et emplacement libres sur son poste) ; l'application propose par défaut l'extension `.sqm` (Suivi QualiMétrie) à la création, librement renommable. La racine JSON est sérialisée, compressée ([zstd](https://github.com/facebook/zstd)) puis chiffrée (Argon2id pour la dérivation de clé, AES-256-GCM pour le chiffrement authentifié), selon la chaîne cryptographique retenue à [l'étape 6](./11_architectureTechnique.md#choix-technologiques-structurants) ([RNF-012](./07_exigencesNonFonctionnelles.md#sécurité)). Il n'existe ni base de données ni stockage partiel : le fichier est réécrit intégralement à chaque sauvegarde ; l'écriture est réalisée de façon atomique (écriture dans un fichier temporaire puis renommage) afin d'éviter toute corruption en cas d'interruption pendant l'écriture.

Structures de transfert calculées, jamais persistées : sur le modèle de `PrevisualisationPurge`/`PrevisualisationPurgeJournal` (US-025, US-036), le plan_17 chapitre 1 (US-055) introduit `MetriquesVolumetrie` et `VentilationJsonClair`, calculées à la volée par la commande de consultation `calculerMetriquesVolumetrie` à partir de l'état déjà en mémoire et des métadonnées du fichier sur disque. Elles n'ajoutent aucune donnée persistée, n'introduisent aucun palier de migration et laissent `versionSchema` inchangé (`10`). De même, la ventilation des dépendances par écosystème du plan_17 chapitre 2 (US-056, RG-056) est un pur calcul d'affichage — aucune structure persistée ni de transfert n'est ajoutée, l'écosystème étant déduit du nom du manifeste au rendu.

## Stratégie de migration des données

`versionSchema` est incrémenté à chaque évolution structurelle du modèle. Au chargement d'un fichier dont `versionSchema` est inférieur à la version courante de l'application, une séquence de fonctions de migration est appliquée successivement, palier par palier, jusqu'à la version courante. Un fichier dont `versionSchema` est supérieur à la version courante de l'application (créé par une version plus récente) est refusé explicitement plutôt que migré de façon hasardeuse.

Le palier `9` → `10` (2026-08-30, [plan_16](../03_plan/plan_16_navigationFiltrageEtVues.md#impacts-sur-le-modèle-de-données-et-migration)) uniformise la forme de `filtres` de chaque `VueEnregistrée` : pour chaque entrée, `filtres` est réécrit en `{ groupeId: <filtres.groupeId ou null>, projetIds: <filtres.projetIds ou null> }` (tout autre champ éventuellement présent, notamment l'`indicateur` des vues Synthèse des audits, est abandonné) et `versionFiltres` est fixé à `1`. Cette transformation est générique : le cœur natif n'a pas besoin de connaître la forme de filtres de chaque écran, la cible étant identique pour tous. En conséquence, une vue enregistrée dans une version antérieure du schéma est migrée vers la forme courante, non plus ignorée avec avertissement comme prévu initialement (cf. F22, [Specification.md, section 5.22](../01_besoin/Specification.md#522-f22--modèles-de-vues-enregistrées) ; [RG-027](./05_reglesGestion.md#vues-alertes-export-et-import) amendée). Conséquence fonctionnelle assumée : une vue « Synthèse des audits » antérieure perd le filtre d'indicateur qu'elle portait, mais conserve sa sélection de groupe. Le format de l'enveloppe chiffrée (paramètres cryptographiques) est versionné indépendamment de `versionSchema` et migré séparément (cf. [Specification.md, section 6.3](../01_besoin/Specification.md#63-enveloppe-chiffrée)).

## Stratégie de sauvegarde et de restauration

Avant tout écrasement du fichier de données, une sauvegarde de sécurité horodatée de l'ancien fichier est conservée, dans la limite d'un nombre paramétrable (`parametres.sauvegarde.nombreSauvegardesSecurite`, cf. [RG-003](./05_reglesGestion.md#stockage-et-confidentialité-des-données), qui ne fixe pas de valeur chiffrée) ; la valeur par défaut retenue est 5, déduite de l'exemple fourni dans [exemple-donnees.json](../01_besoin/exemple-donnees.json). Les sauvegardes sont stockées à proximité du fichier principal, sous un nom suffixé par un horodatage, chiffrées à l'identique du fichier courant. La restauration s'effectue en chargeant une sauvegarde antérieure depuis l'écran d'accueil comme n'importe quel fichier de données, sans écran dédié : le principe de fichier unique portable rend cette opération suffisante. La copie de sécurité du fichier vers un support externe (clé USB, service de stockage personnel) reste de la responsabilité de l'utilisateur, aucune sauvegarde distante automatique n'étant prévue (hors périmètre, cf. [étape 2](./03_expressionBesoin.md#périmètre)).

## Gouvernance et propriété des données

| entité | propriétaire | responsabilité |
|---|---|---|
| Groupe, Instance, MembreConnu, Annotation (portée groupe) | Camille (utilisateur unique) | Création, mise à jour et suppression via l'administration ; les membres connus ne sont jamais partagés hors de l'application |
| Projet, Source, Annotation (portée projet) | Camille | Idem, cycle de vie lié à celui du Groupe parent |
| Audit, Résultat, Campagne, Brouillon | UI (orchestrateur de campagne), écrits sur disque par le cœur natif (moteur de persistance) | Produits automatiquement lors d'une campagne ; intégrés ou rejetés par Camille depuis le brouillon, jamais modifiés manuellement après intégration à l'historique |
| Référentiels (`reglesDependances`, `reglesMarqueursIA`, `categoriesDependances`, `motifNommageBranches`), Paramètres (`seuils`) | Camille | Édités depuis le paramétrage ; seule portion du modèle destinée au partage entre installations (export en clair) |
| TraitementAlerte, VueEnregistrée | Camille | Données de travail personnelles, jamais exportées |
| EntréeJournal | Cœur natif | Écriture automatique en append-only à chaque modification d'une donnée de jugement ; lecture seule pour Camille |

## Règles de validation des données

| règle de validation | donnée concernée |
|---|---|
| L'identifiant est un UUID v4 valide, généré à la création, jamais modifié par la suite | Toutes les entités identifiées |
| Le couple (`typeCritere`, `critere`) est unique au sein d'un Groupe lorsque `typeCritere` vaut `username` | MembreConnu |
| `refAuditee`, lorsqu'elle est renseignée, doit correspondre à une branche, un tag ou un SHA existant sur la source au moment de l'audit, sinon une anomalie est produite (cf. [RG-021](./05_reglesGestion.md#audits-et-campagnes)) | Source |
| `iaAutoriseeDepuis` n'est renseigné que si `iaAutorisee` est ou a été `true` | Projet |
| Le champ `type` d'un Résultat appartient au catalogue figé documenté ([Specification.md, section 5.5](../01_besoin/Specification.md#55-f05--audits-et-catalogue-des-indicateurs)) | Résultat |
| Un Résultat ne comporte aucun champ de statut ou de verdict calculé | Résultat |
| `cleAlerte` respecte le motif `type_alerte|projetId|discriminant` | TraitementAlerte |
| `versionFiltres` est un entier positif correspondant à un schéma de filtres connu ; depuis le palier `9` → `10`, la valeur attendue est la constante partagée unique `1`, la forme de `filtres` étant commune à tous les écrans (`{ groupeId, projetIds }`) | VueEnregistrée |
| L'export en clair ne contient que `parametres.seuils` et `referentiels` | Contrôle transverse à l'export de configuration |
| `referentiels.motifNommageBranches` est une expression régulière syntaxiquement valide, jamais vide (valeur par défaut Gitflow appliquée à la création du fichier) | Référentiels |

## Matrice de traçabilité

| entité | règle de gestion |
|---|---|
| Groupe, Projet | [RG-006](./05_reglesGestion.md#membres-et-sécurité-des-accès), [RG-014](./05_reglesGestion.md#constat-jugement-et-politique-ia) |
| MembreConnu | [RG-006](./05_reglesGestion.md#membres-et-sécurité-des-accès), [RG-007](./05_reglesGestion.md#membres-et-sécurité-des-accès), [RG-008](./05_reglesGestion.md#membres-et-sécurité-des-accès) |
| Résultat | [RG-011](./05_reglesGestion.md#constat-jugement-et-politique-ia), [RG-013](./05_reglesGestion.md#constat-jugement-et-politique-ia) |
| Projet (`iaAutorisee`) | [RG-014](./05_reglesGestion.md#constat-jugement-et-politique-ia), [RG-015](./05_reglesGestion.md#constat-jugement-et-politique-ia), [RG-016](./05_reglesGestion.md#constat-jugement-et-politique-ia), [RG-023](./05_reglesGestion.md#seuils-référentiels-et-historisation) |
| Campagne | [RG-017](./05_reglesGestion.md#audits-et-campagnes), [RG-018](./05_reglesGestion.md#audits-et-campagnes), [RG-021](./05_reglesGestion.md#audits-et-campagnes) |
| Brouillon | [RG-019](./05_reglesGestion.md#audits-et-campagnes), [RG-020](./05_reglesGestion.md#audits-et-campagnes) |
| Audit | [RG-024](./05_reglesGestion.md#seuils-référentiels-et-historisation), [RG-025](./05_reglesGestion.md#seuils-référentiels-et-historisation) |
| Référentiels, Paramètres (seuils) | [RG-012](./05_reglesGestion.md#constat-jugement-et-politique-ia), [RG-022](./05_reglesGestion.md#seuils-référentiels-et-historisation), [RG-023](./05_reglesGestion.md#seuils-référentiels-et-historisation), [RG-030](./05_reglesGestion.md#seuils-référentiels-et-historisation) |
| EntréeJournal | [RG-023](./05_reglesGestion.md#seuils-référentiels-et-historisation) |
| TraitementAlerte | [RG-026](./05_reglesGestion.md#vues-alertes-export-et-import) |
| VueEnregistrée | [RG-027](./05_reglesGestion.md#vues-alertes-export-et-import), [RG-053](./05_reglesGestion.md#navigation-transverse-et-filtrage-mutualisé), [RG-054](./05_reglesGestion.md#vues-alertes-export-et-import) |
| Export (Référentiels + Paramètres.seuils uniquement) | [RG-028](./05_reglesGestion.md#vues-alertes-export-et-import), [RG-029](./05_reglesGestion.md#vues-alertes-export-et-import) |
