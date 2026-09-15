<!-- Document rédigé avec l'assistance de l'IA (Claude Code), conformément à la mention d'origine requise par docs/02_documentation/01_modalitesUsageEtConventions.md. Plan de conception établi à partir d'une demande utilisateur explicite (2026-09-15) ; il précède la mise à jour des documents normatifs et tout développement, qui restent conditionnés à une validation humaine explicite. -->

# Conception — Sélection par groupe applicatif sur l'écran « Commits des membres » (amendement RG-060 / US-060)

## Statut du document

Ce document décrit une évolution de l'écran « Commits des membres » (US-060, RG-060, plan_17 chapitre 4) : remplacer la double sélection actuelle (groupe applicatif **et** référence libre d'un groupe GitLab distant) par une sélection unique du groupe applicatif, l'analyse portant alors sur les seuls membres connus déjà qualifiés `interne` de ce groupe.

Comme `plan_16_navigationFiltrageEtVues.md`, `plan_17_metriquesVolumetrie.md`, `plan_18_datePriseEnCharge.md`, `plan_19_auditAccesMembresPartis.md` et `plan_20_triMembresConnusEtDatesCalendaires.md`, ce fichier est une exception à la règle générale (les évolutions postérieures à la Phase 15 sont normalement tracées sous forme d'entrées « Étape N » du [rapport de développement](../04_rapports/rapportDeDeveloppement.md)) : son emplacement et son nom restent à ajuster si besoin.

Statut : ce plan précède la mise à jour des documents normatifs et tout développement, qui restent conditionnés à une validation humaine explicite. La méthode du projet s'applique : arbitrage humain, puis mise à jour des documents normatifs, puis développement, sans passage à l'étape suivante sans validation explicite de la précédente. **Aucune ligne de code n'a été modifiée à l'écriture de ce document.**

## Sommaire

1. [Objet](#1-objet)
2. [Décisions actées](#2-décisions-actées)
3. [Périmètre et identifiants d'exigence](#3-périmètre-et-identifiants-dexigence)
4. [Connecteur GitLab — résolution par username](#4-connecteur-gitlab--résolution-par-username)
5. [Commande de la Façade](#5-commande-de-la-façade)
6. [Types miroir côté interface](#6-types-miroir-côté-interface)
7. [Store d'orchestration `CommitsMembresService`](#7-store-dorchestration-commitsmembresservice)
8. [Moteur de jugement — retrait de la classification](#8-moteur-de-jugement--retrait-de-la-classification)
9. [Écran et bouchon](#9-écran-et-bouchon)
10. [Impacts sur le modèle de données et migration](#10-impacts-sur-le-modèle-de-données-et-migration)
11. [Impacts documentaires](#11-impacts-documentaires)
12. [Impacts sur les tests](#12-impacts-sur-les-tests)
13. [Découpage en incréments](#13-découpage-en-incréments)
14. [Vérification de bout en bout](#14-vérification-de-bout-en-bout)
15. [Points restant ouverts](#15-points-restant-ouverts)

## 1. Objet

L'écran « Commits des membres » exige aujourd'hui deux sélections indépendantes avant de lancer une analyse : un `Groupe` applicatif (limité à ceux déclarant une instance GitLab), et une référence libre, obligatoire, jamais persistée, désignant un groupe GitLab distant (`referenceGroupeGitlab`). Cette seconde saisie déclenche la récupération de **tout le roster** de ce groupe GitLab distant (`gitlab::lister_membres_groupe`) et de ses dépôts (`gitlab::lister_projets_groupe`), puis chaque compte du roster est classé Interne / Client / Partenaire / Inconnu contre les règles `membresConnus` du `Groupe` applicatif choisi.

L'utilisateur souhaite n'avoir plus qu'**une seule sélection en amont**, celle du `Groupe` applicatif, et faire porter l'analyse uniquement sur les membres **déjà déclarés `interne`** dans ce groupe — sans repasser par le roster d'un groupe GitLab distant ressaisi à chaque analyse. Cette évolution supprime une saisie manuelle redondante avec une donnée déjà connue de l'application (la liste des membres internes du groupe) et recentre l'écran sur son objet (suivre la régularité de poussée des développeurs internes déjà identifiés).

Deux clarifications ont été arbitrées par l'utilisateur préalablement à ce document (échange du 2026-09-15) :

- seuls les `MembreConnu` de statut `interne` qualifiés par un critère de type **nom d'utilisateur exact** (`username`) sont analysables individuellement — un critère `email` ou `domaineEmail` ne désigne aucun compte GitLab précis et ne peut pas être énuméré sans le roster que l'on supprime justement ; ces règles sont **exclues et signalées explicitement** à l'utilisateur, jamais silencieusement ;
- les membres `interne` mais partis (`partiLe` renseigné, RG-061) sont exclus de l'analyse.

## 2. Décisions actées

1. **Sélection unique : le `Groupe` applicatif.** Le champ `referenceGroupeGitlab` (texte libre, obligatoire) est supprimé de l'écran. Le comportement déjà en place lorsqu'un groupe déclare plusieurs instances GitLab (avertissement + utilisation de la première instance) est conservé sans changement.
2. **Périmètre analysable : `interne` × `username` × actif.** Les membres retenus sont exactement `groupe.membresConnus.filter(m => m.statut === 'interne' && m.typeCritere === 'username' && m.partiLe === undefined)`. Les règles `interne` de type `email` ou `domaineEmail` ne sont pas analysées ; leur nombre est signalé explicitement à l'écran (pas d'exclusion silencieuse). Les membres `interne` partis ne sont pas signalés distinctement de ce compteur (ils relèvent d'une autre logique, déjà documentée par RG-061 et instruite par `plan_19_auditAccesMembresPartis.md` pour l'angle « accès résiduel »).
3. **Résolution du compte GitLab par recherche exacte de username, un membre à la fois.** Pour chaque membre connu retenu, le compte GitLab réel est résolu par un appel `GET /users?username=<exact>` (recherche globale, hors périmètre d'un groupe GitLab). Un membre dont le username ne correspond à aucun compte actif est absorbé individuellement (notification, décompte), sans interrompre l'analyse des autres.
4. **Commande de la Façade fine, appelée en boucle, plutôt qu'une passe de préparation par lot.** La commande `preparerAnalyseCommitsMembres` disparaît : elle ne faisait que lister un roster désormais inutile. Elle est remplacée par une commande fine `interrogerMembreGitlabParUsername`, appelée par le Store à concurrence limitée pour chaque membre retenu, exactement comme `listerEvenementsPousseesMembre` l'est déjà. Ce choix évite d'introduire un type agrégé de résultats partiels (un par membre, succès ou échec) pour un bénéfice IPC nul par rapport à N appels fins déjà pratiqués pour l'étape suivante du pipeline.
5. **Nom de dépôt affiché : celui du `Projet` applicatif.** La correspondance entre l'identifiant numérique d'un dépôt GitLab et un nom lisible, utilisée pour la colonne « dépôt de la dernière poussée », n'est plus construite depuis un appel réseau listant les dépôts du groupe GitLab distant (`lister_projets_groupe`, supprimé) mais depuis `Projet.sources` (champ `idExterne`) des projets du `Groupe` applicatif sélectionné. Si un dépôt poussé ne correspond à aucune `Source` connue, l'identifiant brut reste affiché tel quel — comportement de repli déjà en place.
6. **Retrait de la classification devenue triviale.** Comme seuls des membres déjà `interne` sont désormais analysés, le statut affiché par ligne (`resoudreStatut` du Moteur de jugement `CadencePousseesUtils`, colonne et filtre « Statut » de l'écran) ne peut plus renvoyer qu'une valeur constante. Cette logique, son type `StatutDeveloppeur` et le paramètre `reglesMembresConnus` de `CadencePousseesUtils.analyser` sont retirés plutôt que conservés à titre de minimalisme : un paramètre et un champ qui ne peuvent renvoyer qu'une seule valeur sont un code sans valeur informative, contraire à la norme du projet contre l'abstraction ou le code superflus. `StatutMembreUtils` n'est pas touché : il reste utilisé ailleurs dans l'application (raccourci « Marquer comme parti », etc.), seul cet usage local disparaît.
7. **Aucun changement de schéma de données, aucune commande de gouvernance.** Cette évolution ne touche à aucun champ persisté : `referenceGroupeGitlab` n'a jamais été stocké, `MembreConnu`/`Groupe`/`Projet`/`Source` sont inchangés. Aucun palier de migration.

## 3. Périmètre et identifiants d'exigence

Cette évolution est un **amendement** de RG-060 et US-060 (redéfinition de la source des membres analysés, retrait de la classification par statut, ajout d'un signalement des règles non analysables) : elle ne crée aucune capacité indépendante des deux exigences existantes et ne nécessite donc pas de nouvel identifiant, sur le même principe que les Parties A à C de `plan_20_triMembresConnusEtDatesCalendaires.md`.

| exigence | nature de l'amendement |
|---|---|
| US-060 (Suivre la régularité de poussée des développeurs d'un groupe) | la source des développeurs analysés devient « les membres connus `interne` du groupe qualifiés par nom d'utilisateur, actifs », en lieu et place du roster d'un groupe GitLab distant saisi manuellement ; retrait du critère d'acceptation portant sur la classification interne / client / partenaire / inconnu affichée par ligne (devenue sans objet) ; ajout d'un critère d'acceptation sur le signalement explicite des règles `interne` non analysables (type `email` / `domaineEmail`) |
| RG-060 | remplacement de la description de la source (roster d'un groupe GitLab désigné par une référence libre) par « membres connus `interne`, qualifiés par `username`, actifs, du groupe applicatif sélectionné » ; retrait de la clause de classification par statut de rattachement ; ajout de la clause de signalement des règles non analysées ; précision sur l'origine du nom de dépôt affiché (`Projet.sources`, non plus un appel listant les dépôts d'un groupe GitLab distant) |

`RG-060` reste rattachée à `RG-006` à `RG-010` (résolution du statut, désormais utilisée en amont pour la seule sélection des membres à analyser, plus pour un affichage par ligne) et `RG-061` (source de `partiLe`, dont l'exclusion est reprise ici).

## 4. Connecteur GitLab — résolution par username

Fichier : `src-tauri/src/connecteurs/gitlab.rs`.

Nouvelle fonction `interroger_membre_par_username(url_base, credential, username, client) -> Result<Option<MembreGroupeGitlab>, ErreurConnecteur>`, positionnée à côté de `lister_evenements_poussees` :

- appel `GET /users?username=<exact>` (endpoint global, non scopé à un groupe ; GitLab filtre déjà en égalité stricte, pas de pagination nécessaire) ;
- réutilise telles quelles la structure de résultat `MembreGroupeGitlab` (`id`, `username`, `nom`, `courriel`), la structure de désérialisation `ReponseMembre`, `statut_reponse_ok` (mapping RG-021), `erreur_depuis_reqwest`, `url_api` et `ETATS_MEMBRE_NON_ACTIFS` ;
- `Ok(None)` — pas une erreur — si la recherche ne renvoie aucun compte, ou seulement des comptes dont l'état figure dans `ETATS_MEMBRE_NON_ACTIFS` : un username de membre connu sans compte GitLab actif correspondant est un cas métier légitime, distinct d'un échec réseau (401 / 403 / 404 / délai dépassé / instance injoignable / réponse inattendue, catégories RG-021 déjà couvertes par `statut_reponse_ok`/`erreur_depuis_reqwest`).

Suppressions consécutives, une fois la commande du §5 basculée (code mort, vérifié comme non utilisé ailleurs dans le dépôt) : `lister_membres_groupe`, `lister_projets_groupe`, `ProjetGroupeGitlab`, `reference_groupe_valide`, et les constantes de pagination propres à `lister_projets_groupe` (`MAX_PAGES_PROJETS` / `TAILLE_PAGE_PROJETS` ou noms équivalents).

## 5. Commande de la Façade

Fichier : `src-tauri/src/commandes/commits_membres.rs`.

Remplacement de `preparer_analyse_commits_membres` / `PreparationAnalyseCommitsMembres` par une commande fine :

```
interroger_membre_gitlab_par_username(instance: Instance, username: String, etat: State<'_, EtatSession>)
  -> Result<Option<MembreGroupeGitlab>, ErreurConnecteur>
```

appelée en boucle par le Store à concurrence limitée, sur le modèle exact de `lister_evenements_poussees_membre` (journalisation début / fin de commande conservée, `exiger_instance_gitlab` réutilisée). `lister_evenements_poussees_membre` n'est pas modifiée.

**Point à trancher en revue de code, sans impact fonctionnel** : le paramètre `cible` journalisé pour cette commande ne peut pas porter le `username` (donnée nominative — la commande voisine `lister_evenements_poussees_membre` journalise déjà l'identifiant numérique, jamais le login, précisément pour cette raison) ; il portera un marqueur de catégorie fixe non nominatif, au prix d'un diagnostic technique moins précis en cas d'échec isolé.

## 6. Types miroir côté interface

- `src/app/services/sansetat/commandes/types-facade.ts` et `src/app/services/avecetat/etat/types-donnees.ts` : suppression de `PreparationAnalyseCommitsMembres`, `ProjetGroupeGitlab` et de leur `Resultat*` associé (dupliqués dans les deux fichiers) ; ajout de `ResultatInterrogerMembreGitlabParUsername` (succès portant `MembreGroupeGitlab | null`, ou échec portant l'anomalie typée).
- `src/app/services/sansetat/commandes/facade-commits-membres.service.ts` : suppression de `preparerAnalyseCommitsMembres`, ajout de `interrogerMembreGitlabParUsername(instance, username)`.

## 7. Store d'orchestration `CommitsMembresService`

Fichier : `src/app/services/avecetat/commits-membres/commits-membres.service.ts`.

- `analyser(groupeApplicatifId)` : suppression du paramètre `groupeGitlab`.
- Dérivation locale, sans appel réseau, des membres analysables depuis `groupe.membresConnus` (filtre du §2, décision 2) ; comptage séparé des règles `interne` non analysables (`email` / `domaineEmail`) pour le signalement du §9.
- Boucle `mergeMap` à concurrence limitée sur les membres retenus : résolution GitLab par username puis, si résolu, événements de poussée — remplace la boucle actuelle portant sur le roster reçu de `preparerAnalyseCommitsMembres`.
- `cheminsDepotsParId` reconstruit sans appel réseau depuis `groupe.projets` / `Projet.sources` (§2, décision 5).
- Comportement « plusieurs instances GitLab » (avertissement, première instance utilisée) conservé sans changement.

## 8. Moteur de jugement — retrait de la classification

Fichier : `src/app/services/sansetat/jugement/cadence-poussees.utils.ts`.

Retrait du paramètre `reglesMembresConnus` de `analyser` et `construireLigne`, de la méthode privée `resoudreStatut`, du type exporté `StatutDeveloppeur`, et du champ `statut` de `LigneCadencePoussees` (§2, décision 6). Mise à jour de la documentation de tête de fichier et de la Rustdoc/JSDoc de `analyser`.

## 9. Écran et bouchon

- `commits-membres.component.ts` / `.html` : suppression de `referenceGroupeGitlab` et de son champ de formulaire ; répercussion du retrait du §8 (suppression de `FiltreStatut`, `filtreStatut`, colonne « Statut », `libelleStatut()`, branche `'statut'` de `ColonneTri`/`comparer()`) ; ajout d'un message visible, dans le même registre que le message existant « plusieurs instances GitLab », signalant le nombre de règles `interne` non analysées (§2, décision 2) ; mise à jour du message d'état initial (retrait de la mention de la référence GitLab).
- `bouchon-commits-membres.utils.ts` et son dispatcher : remplacement de `preparerAnalyse()` par une recherche `rechercherMembreParUsername(username)` dans le jeu de membres synthétiques existant, routée sur la nouvelle commande.

## 10. Impacts sur le modèle de données et migration

**Néant.** Aucune structure de donnée modifiée, aucun changement de forme du schéma, `VERSION_SCHEMA_COURANTE` inchangée, aucun palier de migration, aucune nouvelle donnée persistée. `referenceGroupeGitlab` n'a jamais été stocké ; l'évolution ne fait que changer la source et le mode de calcul d'un écran de consultation pure.

## 11. Impacts documentaires

| document | modification |
|---|---|
| [`02_documentation/05_reglesGestion.md`](../02_documentation/05_reglesGestion.md) | RG-060 : remplacer la description de la source (roster d'un groupe GitLab désigné par une référence libre) par « membres connus `interne`, qualifiés par `username`, actifs, du groupe applicatif sélectionné » ; retirer la clause de classification interne / client / partenaire / inconnu par ligne ; ajouter la clause de signalement des règles `interne` non analysables (`email` / `domaineEmail`) ; préciser l'origine du nom de dépôt affiché (`Projet.sources`) |
| [`02_documentation/04_casUsage.md`](../02_documentation/04_casUsage.md) | US-060 : mêmes ajustements de critères d'acceptation (source, retrait de la classification, ajout du signalement) |
| [`02_documentation/13_conceptionDetaillee.md`](../02_documentation/13_conceptionDetaillee.md) | mise à jour des signatures citées : Façade (`interrogerMembreGitlabParUsername` en lieu et place de `preparerAnalyseCommitsMembres`), Connecteur GitLab (`interroger_membre_par_username` en lieu et place de `lister_membres_groupe` / `lister_projets_groupe`), Moteur de jugement (arité réduite de `CadencePousseesUtils.analyser`, retrait de `StatutDeveloppeur`), Store (`analyser(groupeApplicatifId)`) |
| [`02_documentation/09_maquettes.md`](../02_documentation/09_maquettes.md) | section « Commits des membres » : retrait du champ « Groupe GitLab (chemin ou identifiant) » et de la colonne / du filtre « Statut » ; ajout de la ligne de signalement des règles non analysées |
| [`02_documentation/16_normesTests.md`](../02_documentation/16_normesTests.md) | mise à jour de la description de `CadencePousseesUtils` (retrait de la clause de classification) et des catégories de test citées pour cet écran |
| [`04_rapports/rapportDeDeveloppement.md`](../04_rapports/rapportDeDeveloppement.md) | nouvelle entrée « Étape N » à la réalisation |

Le tableau ci-dessus est la spécification à appliquer au premier incrément documentaire. Aucun de ces amendements n'est appliqué par avance : ils restent conditionnés à la validation d'ensemble de ce plan.

## 12. Impacts sur les tests

- **Cœur natif (`cargo test`)** : nouveaux tests de `interroger_membre_par_username` (résultat nominal, aucun résultat, compte inactif ignoré, chaque catégorie d'anomalie RG-021) ; suppression des tests devenus obsolètes de `lister_membres_groupe` / `lister_projets_groupe` / `reference_groupe_valide`.
- **Interface (`npm test`, Jest)** : `cadence-poussees.utils.spec.ts` (retrait des tests de classification, adaptation de l'arité de `analyser`) ; `commits-membres.service.spec.ts` (nouvelles fixtures `membresConnus` couvrant les quatre combinaisons statut/type de critère et le cas parti, absorption d'un membre non résolu ou en échec, absence de tout appel de listing de roster, `cheminsDepotsParId` dérivé de `Projet.sources`) ; `commits-membres.component.spec.ts` (retrait des tests sur le champ et le filtre supprimés, ajout du test de signalement) ; bouchon E2E adapté.
- **E2E (`npm run test:e2e`, Playwright)** : `parcours-complet.spec.ts` repose actuellement sur un `MembreConnu` `domaineEmail` et un `username`/`partenaire`, tous deux hors périmètre après cette évolution — à remplacer par des `MembreConnu` `interne`/`username` couvrant les profils synthétiques attendus par les assertions existantes ; ajouter une assertion sur le message de signalement des règles non analysées.
- Seuils de couverture inchangés dans leur valeur (Moteur de jugement 90 %, reste du cœur natif et Store 80 %).
- **Matrice de traçabilité** : vérification croisée refaite (règle générale n° 13) — le nouveau connecteur, la commande, le Store et l'écran restent couverts par au moins un test après retrait des tests obsolètes.

## 13. Découpage en incréments

1. **Documents normatifs** : amendements du §11. Validation humaine explicite avant tout code.
2. **Connecteur Rust** : `interroger_membre_par_username` et ses tests, sans toucher à l'existant.
3. **Commande de la Façade** : `interroger_membre_gitlab_par_username`, coexistant temporairement avec `preparer_analyse_commits_membres` ; tests Rust de la commande.
4. **Types et Façade côté interface** : ajout des nouveaux types et de la nouvelle méthode de façade, coexistence temporaire avec les anciens.
5. **Moteur de jugement et Store** : retrait de la classification (`CadencePousseesUtils`) et nouvelle dérivation/boucle du Store dans le même incrément, pour ne pas laisser d'appelant cassé entre les deux ; tests adaptés.
6. **Écran** : suppression du champ et de la colonne/filtre « Statut », ajout du signalement ; tests adaptés.
7. **Nettoyage** : suppression du code devenu mort (ancienne commande, ancien connecteur, anciens types, anciens tests) ; aucun changement de comportement observable.
8. **Bouchon E2E et test Playwright** : nouvelle méthode de bouchon, nouvelles fixtures `MembreConnu` du parcours complet.
9. **Revue croisée finale** : matrice de traçabilité, entrée « Étape N » du rapport de développement.

Chaque incrément : auto-revue et revue assistée par l'IA en contexte isolé, exécution/test réel avant validation, pas de passage à l'incrément suivant sans validation humaine explicite.

## 14. Vérification de bout en bout

Sur `npm run tauri dev` (ou `npm start` avec le bouchon TypeScript) :

1. sélectionner un groupe portant des `MembreConnu` `interne`/`username` actifs, un `interne`/`username` parti, un `interne`/`email` et un `interne`/`domaineEmail`, puis lancer une analyse : seuls les membres `interne`/`username` actifs apparaissent dans le tableau ;
2. le message de signalement indique le nombre de règles `interne` non analysées (email/domaine) ;
3. si le groupe déclare plusieurs instances GitLab, le message d'avertissement existant s'affiche toujours et seule la première instance est interrogée ;
4. le nom de dépôt affiché en dernière colonne correspond au `Projet.nom` applicatif pour un dépôt suivi, et à l'identifiant brut pour un dépôt hors périmètre ;
5. un membre `interne`/`username` dont le compte GitLab n'existe pas ou plus n'apparaît pas dans le tableau et ne bloque pas l'analyse des autres membres ;
6. la colonne et le filtre « Statut » n'existent plus dans l'interface.

## 15. Points restant ouverts

1. **Marqueur de journalisation de la nouvelle commande.** Le choix d'un marqueur fixe non nominatif plutôt que le `username` (§5) réduit la précision du diagnostic technique en cas d'échec isolé de résolution ; à confirmer en revue de code, sans impact fonctionnel.
2. **Non-signalement distinct des membres `interne`/`username` partis.** Seules les règles de type `email`/`domaineEmail` sont comptées dans le message de signalement (§2, décision 2) ; un compteur séparé pour les membres partis exclus resterait possible si l'usage le justifie — hors périmètre de ce plan.
3. **Recoupement avec `plan_19_auditAccesMembresPartis.md`.** Ce plan traite déjà, sous un autre angle (accès résiduel sur un dépôt), le croisement entre `partiLe` et l'activité GitLab d'un membre parti. Le point 7 des « points restant ouverts » de `plan_19` mentionne déjà l'écran « Commits des membres » comme prolongement possible (repérer qu'un membre parti pousse encore du code) : à réévaluer conjointement si les deux plans sont développés à des moments proches.
4. **Session concurrente.** Au moment de la rédaction de ce document, une session de développement distincte travaille en parallèle sur `plan_20_triMembresConnusEtDatesCalendaires.md`, qui touche également le modèle des membres connus et son écran d'administration. Avant tout développement de ce plan, vérifier l'état réel des fichiers partagés (`racine.rs`, `types-donnees.ts`, écrans d'administration des membres connus) plutôt que de supposer l'état décrit ici toujours à jour.
