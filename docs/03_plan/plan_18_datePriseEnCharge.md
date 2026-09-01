<!-- Document rédigé avec l'assistance de l'IA (Claude Code), conformément à la mention d'origine requise par docs/02_documentation/01_modalitesUsageEtConventions.md. Plan de conception établi à partir d'une demande utilisateur explicite (2026-09-01) ; il précède la mise à jour des documents normatifs et tout développement, qui restent conditionnés à une validation humaine explicite. -->

# Conception — Date de prise en charge d'un projet (achèvement de F17 « premier commit interne »)

## Statut du document

Ce document décrit l'achèvement de la fonctionnalité **F17 « premier commit interne »** de [Specification.md](../01_besoin/Specification.md#517-f17--surveillance-des-membres-et-premier-commit-interne) : la structure de données `PremierCommitInterne` existe déjà de bout en bout (cœur natif, interface, modèle de données, jeu d'exemple, affichage « Âge chez nous » de la Fiche projet, valeurs de démonstration du bouchon), mais **aucun calcul réel n'est implémenté** — tous les points de persistance forcent la valeur à absente, il n'existe ni fonction de pagination inverse du connecteur GitLab, ni commande de la Façade, ni déclenchement, ni US, ni RG, ni conception détaillée. Le présent plan comble ce manque.

Comme `plan_16_navigationFiltrageEtVues.md` et `plan_17_metriquesVolumetrie.md`, ce fichier est une exception à la règle générale (les évolutions postérieures à la Phase 15 sont normalement tracées sous forme d'entrées « Étape N » du [rapport de développement](../04_rapports/rapportDeDeveloppement.md)) : son emplacement et son nom restent à ajuster si besoin.

Statut : ce plan précède la mise à jour des documents normatifs et tout développement, qui restent conditionnés à une validation humaine explicite. La méthode du projet s'applique : arbitrage humain, puis mise à jour des documents normatifs, puis développement, sans passage à l'étape suivante sans validation explicite de la précédente.

## Sommaire

1. [Objet](#1-objet)
2. [Décisions actées](#2-décisions-actées)
3. [Périmètre et identifiants d'exigence proposés](#3-périmètre-et-identifiants-dexigence-proposés)
4. [Partie A — Cœur natif : recherche du premier commit interne](#4-partie-a--cœur-natif--recherche-du-premier-commit-interne)
5. [Partie B — Façade, orchestrateur de campagne et case à cocher](#5-partie-b--façade-orchestrateur-de-campagne-et-case-à-cocher)
6. [Partie C — Fiche projet : affichage, recalcul et suggestion](#6-partie-c--fiche-projet--affichage-recalcul-et-suggestion)
7. [Partie D — Comparaison d'audits : repère « prise en charge »](#7-partie-d--comparaison-daudits--repère--prise-en-charge-)
8. [Partie E — Membres internes partis : attribut `partiLe`](#8-partie-e--membres-internes-partis--attribut-partile)
9. [Impacts sur le modèle de données et migration](#9-impacts-sur-le-modèle-de-données-et-migration)
10. [Impacts documentaires](#10-impacts-documentaires)
11. [Impacts sur les tests](#11-impacts-sur-les-tests)
12. [Découpage en incréments](#12-découpage-en-incréments)
13. [Vérification de bout en bout](#13-vérification-de-bout-en-bout)
14. [Points restant ouverts](#14-points-restant-ouverts)

## 1. Objet

La **date de prise en charge** d'un projet est la date du **premier commit** dont l'auteur (identifié par courriel) correspond à une règle de statut `interne` des membres connus du groupe, sur **l'un des dépôts GitLab** rattachés au projet. Elle matérialise le moment où l'organisation a commencé à travailler sur le projet.

Elle est :

- **calculée à la demande**, jamais systématiquement à chaque audit : par une case à cocher (décochée par défaut) du formulaire de constitution de campagne, et par un bouton « recalculer » de la Fiche projet ;
- **stockée** comme attribut immuable recalculable du projet (`premierCommitInterne` : `date`, `sha`, `emailAuteur`, `calculeLe`, `empreinteReferentiel`, `statut`), déjà présent dans le modèle ;
- **affichée** dans la Fiche projet (« Âge chez nous », déjà câblé) ;
- **utilisable** comme borne de comparaison sur l'écran Comparaison d'audits, à condition qu'un audit (régulier ou historique) porte exactement cette date.

Un membre interne **ayant quitté le projet** reste pris en compte pour cette datation : ses anciens commits sont des commits internes légitimes. Ce plan introduit à cet effet un attribut `partiLe` sur les règles de membre connu (cf. [Partie E](#8-partie-e--membres-internes-partis--attribut-partile)). L'exploitation de cet attribut pour l'**audit d'accès** (signaler qu'un parti figure encore dans les membres d'un dépôt) est un besoin distinct, renvoyé à un plan ultérieur (plan_19).

## 2. Décisions actées

Décisions fonctionnelles, issues des questions posées à l'utilisateur le 2026-09-01 :

1. **Déclenchement explicite uniquement.** Le déclencheur automatique « à la première liaison d'une source GitLab (repli : premier audit) » décrit par F17 est **abandonné**. Le calcul n'a lieu que sur action explicite : case à cocher du formulaire de campagne, ou bouton « recalculer » de la Fiche projet. `Specification.md` §5.17 est corrigé en conséquence.
2. **Sémantique de la case à cocher : « calculer si absent ou obsolète ».** Pour chaque projet sélectionné de la campagne, le calcul est effectué si, et seulement si, `premierCommitInterne` est absent, **ou** son `statut` n'est pas `determine`, **ou** l'empreinte du sous-ensemble `interne` des membres connus du groupe a changé depuis `calculeLe`. Les projets déjà à jour ne sont pas retouchés. Aucun mode « forcer le recalcul » n'est proposé au niveau de la campagne (le bouton unitaire de la Fiche projet, lui, force toujours).
3. **Affichage : Fiche projet.** L'unique écran d'affichage est la Fiche projet (métadonnée « Âge chez nous », déjà en place). Aucun autre écran ne restitue la date en propre à ce stade, hormis le repère de la décision 4.
4. **Comparaison d'audits.** La comparaison « depuis la prise en charge » est possible uniquement si un audit du projet (régulier ou historique) porte une `date` **exactement égale** à `premierCommitInterne.date`. Dans ce cas, cet audit est marqué « (prise en charge) » dans les sélecteurs, et un raccourci « Depuis la prise en charge » le sélectionne comme borne gauche, le dernier audit régulier comme borne droite. Sinon, le raccourci est présenté désactivé avec une invite : à l'utilisateur de lancer une campagne historique ciblant cette date. L'application ne crée jamais elle-même l'audit historique correspondant.
5. **Borne de remontée : 50 pages.** La valeur `borneRecherchePremierCommitPages` par défaut reste `50` (déjà présente dans [`exemple-donnees.json`](../01_besoin/exemple-donnees.json#L1796) et le modèle `ParametresAudit`), soit au plus 50 × `TAILLE_PAGE_AUDIT` commits inspectés par source. Cette valeur sera éprouvée sur de vrais projets par l'utilisateur.

Décisions actées complémentaires (2026-09-02) :

10. **Forme de `PremierCommitInterne` : `enum` discriminant** (`#[serde(tag = "statut")]`, variante `Determine { date, sha, emailAuteur }` + variantes sans données), avec la migration de schéma associée — le coût de migration est jugé acceptable.
11. La commande unitaire vit dans un **nouveau module** `commandes/prise_en_charge.rs`.
12. La case à cocher est portée par une **carte « Options » dédiée** du formulaire de campagne (et non la carte « Date d'analyse »), prête à accueillir d'éventuelles options futures.
13. **Une entrée de journal par projet** recalculé à l'intégration du brouillon (cohérent avec RG-023 et RG-041).
14. Un **message** à côté de la case précise qu'elle n'est utile que si les membres du groupe sont tous, ou en grande partie, qualifiés.
15. **Membres internes partis : attribut orthogonal `partiLe` (décision du 2026-09-02), pas de nouveau statut.** Le sujet « départ » est modélisé par un champ optionnel `partiLe: date` sur `MembreConnu`, indépendant de `statut` (l'axe interne / client / partenaire reste inchangé). Ce plan couvre : l'ajout du champ, sa saisie dans le formulaire d'administration des membres connus, sa validation, son marqueur de liste, et sa prise en compte (transparente) dans la datation de la prise en charge. **L'exploitation « audit d'accès »** — badge d'en-tête de la Fiche projet, mise en évidence de la ligne du membre concerné, décompte par section, nouvelle catégorie d'alerte de la famille RG-006, éventuel repère des commits postérieurs au départ — est **renvoyée à plan_19** (ou à un chapitre dédié), car elle touche l'indicateur `gitlab.membres`, la logique de gravité et l'écran des alertes.

Décisions d'architecture :

6. **Une fonction de connecteur dédiée**, `rechercher_premier_commit_interne`, dans `src-tauri/src/connecteurs/gitlab.rs`, prend la ref auditée et l'ensemble des courriels / règles `interne` du groupe, pagine `GET /repository/commits` **depuis la dernière page** (l'API GitLab ne trie pas du plus ancien au plus récent ; l'en-tête `x-total-pages`, déjà exploité par [`recuperer_arborescence_recursive`](../../src-tauri/src/connecteurs/gitlab.rs#L451), donne le nombre de pages), et retourne le commit le plus ancien dont l'auteur correspond, ou un statut d'indétermination.
7. **Un module de coordination** côté cœur natif, `src-tauri/src/persistance/prise_en_charge.rs` (ou un module de commande dédié), calcule l'empreinte du référentiel `interne`, boucle sur les sources GitLab du projet, retient le **plus ancien** premier commit interne parmi elles, et construit la structure `PremierCommitInterne`. Ce module ne réalise **aucune** écriture disque : il retourne la structure calculée, la persistance étant faite par le flux appelant (orchestrateur de campagne → brouillon → intégration, ou commande unitaire de la Fiche projet → sauvegarde).
8. **La qualification résolue à l'affichage n'est pas modifiée.** Le statut d'un membre reste non stocké dans l'audit (F17). Le calcul du premier commit interne, lui, **fige** un résultat et une empreinte du référentiel `interne` au moment du calcul, exactement comme le prévoit déjà la structure de données.
9. **Aucune donnée personnelle dans les journaux techniques.** La nouvelle commande de la Façade journalise début et fin ([norme 09](../../.claude/rules/09-normes-developpement.md#qualité-de-code)) ; le courriel de l'auteur du commit n'est jamais journalisé (seuls le SHA et la date peuvent l'être). Le champ `emailAuteur` stocké est une donnée personnelle (RGPD) déjà couverte par le chiffrement du fichier et exclue structurellement de l'export en clair (elle vit dans `groupes`).

## 3. Périmètre et identifiants d'exigence proposés

Derniers identifiants consommés à la date de rédaction : `US-056`, `RG-056` dans les documents normatifs ; `plan_17` chapitres 3 et 4 (rédigés le 2026-09-01) proposent `US-057` / `RG-057` puis `US-060` (et RG associés) sans qu'ils soient encore intégrés. Les numéros ci-dessous sont donc **des propositions à reconfirmer au moment de la qualification effective** : plusieurs plans non encore intégrés consomment des identifiants en parallèle ; en cas de collision, décaler l'ensemble de ce plan en bloc sans réintroduire de trou, sur le principe déjà appliqué en Étape 25 de `plan_16`.

| identifiant | intitulé | type |
|---|---|---|
| US-058 | Calculer, à la demande depuis une campagne ou la Fiche projet, la date de prise en charge d'un projet (premier commit interne) | Mutation — Should have |
| US-059 | Comparer un audit à l'état de prise en charge du projet sur l'écran Comparaison d'audits | Consultation — Could have |
| US-061 | Renseigner la date de départ (`partiLe`) d'un membre connu | Mutation — Should have |
| RG-058 | Règle de calcul de la date de prise en charge : source retenue, précédence d'auteur, borne de remontée, statuts d'indétermination, empreinte du référentiel `interne`, immuabilité et recalcul | règle de gestion |
| RG-059 | Sélection de l'audit « prise en charge » sur l'écran Comparaison d'audits (correspondance exacte de date, raccourci, invite en l'absence d'audit) | règle de gestion |
| RG-060 | Attribut `partiLe` d'une règle de membre connu : portée, validation, effet nul sur la résolution de statut et sur la datation de la prise en charge, renvoi de l'audit d'accès à plan_19 | règle de gestion |

Contenu proposé de **RG-060** :

- une règle de membre connu porte un attribut optionnel `partiLe` (date ISO `AAAA-MM-JJ`) indiquant que la personne a quitté l'organisation / le périmètre à cette date ; absent = membre actif ;
- `partiLe` est **indépendant du `statut`** : la personne conserve son statut (`interne`, `client` ou `partenaire`) ; la résolution du statut d'un membre ou contributeur ([RG-006](../02_documentation/05_reglesGestion.md#membres-et-sécurité-des-accès) à [RG-008](../02_documentation/05_reglesGestion.md#membres-et-sécurité-des-accès)) n'est **pas** modifiée par `partiLe` ;
- `partiLe` est **interdit sur une règle de type `domaineEmail`** (un domaine ne « part » pas) : rejet à la saisie côté interface **et** revalidation côté cœur natif ; la date doit être valide et non postérieure au jour de saisie ;
- `partiLe` est **sans effet sur la datation de la prise en charge** (RG-058) : un membre de statut `interne` est pris en compte que `partiLe` soit renseigné ou non — ses anciens commits restent des commits internes ;
- l'exploitation de `partiLe` pour signaler un accès résiduel (membre parti figurant encore dans les membres d'un dépôt), la mise en évidence associée sur la Fiche projet et l'alerte correspondante sont **hors périmètre de ce plan** et relèvent de plan_19.

Contenu proposé de **RG-058** :

- la date de prise en charge d'un projet est la date du premier commit, sur l'une des sources de type GitLab du projet, dont le courriel d'auteur correspond à une règle de membre connu de statut `interne` du groupe ; la précédence de correspondance reprend [RG-007](../02_documentation/05_reglesGestion.md#membres-et-sécurité-des-accès) restreinte aux canaux disponibles sur un commit (courriel exact, alias courriel, domaine de courriel — le username n'est pas exposé par l'API des commits) ;
- lorsque plusieurs sources GitLab existent, la date retenue est **la plus ancienne** des dates de premier commit interne obtenues source par source ;
- une source non GitLab est ignorée ; une source dont le dépôt est vide (`depotVide`, [RG-021](../02_documentation/05_reglesGestion.md#audit-technique-et-anomalies)) est ignorée ; un projet sans aucune source GitLab exploitable produit le statut `non_applicable` ;
- la remontée est bornée à `parametres.audit.borneRecherchePremierCommitPages` pages de `GET /repository/commits` par source (défaut 50, valeur de repli de `exemple-donnees.json`, décision arbitraire à valider par un humain) ; au-delà sans correspondance, le statut est `indetermine_trop_de_commits` ;
- si la remontée est complète mais qu'aucun commit interne n'est trouvé, le statut est `aucun_membre_interne` ;
- le résultat, une fois `determine`, est **immuable** : il n'est jamais recalculé automatiquement. Il n'est recalculé que par le bouton « recalculer » de la Fiche projet (recalcul systématique) ou par la case à cocher du formulaire de campagne (recalcul conditionnel : uniquement si absent, statut non `determine`, ou empreinte changée) ;
- l'empreinte `empreinteReferentiel` est le condensé SHA-256, préfixé `sha256:`, de la sérialisation canonique (règles triées) du sous-ensemble des règles de membre connu de statut `interne` du groupe (champs `critere`, `typeCritere`, `aliasEmail`) ; un changement d'empreinte déclenche une suggestion discrète de recalcul dans la Fiche projet ;
- les statuts possibles sont : `determine`, `aucun_membre_interne`, `indetermine_trop_de_commits`, `non_applicable`, `depot_vide` (ce dernier lorsque toutes les sources GitLab du projet ont un dépôt vide).

Contenu proposé de **RG-059** : cf. décision actée n°4.

## 4. Partie A — Cœur natif : recherche du premier commit interne

### 4.1 Connecteur GitLab — `src-tauri/src/connecteurs/gitlab.rs`

Nouvelle réponse partielle, sur le modèle de [`ReponseCommit`](../../src-tauri/src/connecteurs/gitlab.rs#L636) (déjà présente, réduite à `id` et `committed_date`) : elle doit être étendue, ou doublée d'une variante, pour exposer le courriel d'auteur.

```rust
/// Réponse d'un commit de l'API GitLab, réduite aux champs exploités par la recherche du premier commit interne
/// (US-058, RG-058).
#[derive(Debug, Deserialize)]
struct ReponseCommitAuteur {
    /// SHA du commit.
    id: String,
    /// Date de committer, au format ISO 8601.
    committed_date: String,
    /// Courriel de l'auteur du commit (`author_email`), éventuellement absent sur des commits anciens.
    #[serde(default)]
    author_email: Option<String>,
}
```

Nouvelle fonction, `pub(crate) async fn rechercher_premier_commit_interne` :

- signature : `(&self, id_externe: &str, ref_auditee: Option<&str>, correspondance: &CorrespondanceInterne, borne_pages: u32) -> Result<ResultatPremierCommitInterne, ErreurConnecteur>` ;
- `CorrespondanceInterne` : structure de travail construite en Partie B à partir des règles `interne` du groupe (ensembles de courriels exacts / alias, ensemble de domaines), avec une méthode `fn correspond(&self, courriel: &str) -> bool` appliquant la précédence de RG-007 restreinte ;
- `ResultatPremierCommitInterne` : `enum { Trouve { date: String, sha: String, email_auteur: String }, AucunCommitInterne, TropDeCommits, DepotVide }` ;
- algorithme :
  1. résoudre la ref effective via [`resoudre_ref_effective`](../../src-tauri/src/connecteurs/gitlab.rs#L742) ; `ErreurConnecteur::DepotVide` → `DepotVide` ;
  2. premier appel `GET /projects/{id}/repository/commits?ref_name={ref}&per_page={TAILLE_PAGE_AUDIT}&page=1`, lire l'en-tête `x-total-pages` (`total_pages`) via le même utilitaire que `recuperer_arborescence_recursive` ;
  3. si `total_pages > borne_pages` : parcourir uniquement les pages de `total_pages` à `total_pages - borne_pages + 1` (les plus anciennes accessibles), sinon parcourir de `total_pages` à `1` ;
  4. pour chaque page, de la plus ancienne à la plus récente, itérer les commits **de la fin de la liste vers le début** (l'API renvoie le plus récent en premier) ; retourner `Trouve` au premier commit dont `author_email` (mis en minuscules) satisfait `correspondance.correspond(...)` ;
  5. si la remontée a été tronquée (étape 3, cas `>`) et qu'aucun commit interne n'a été trouvé : `TropDeCommits` ;
  6. sinon (remontée complète, rien trouvé) : `AucunCommitInterne`.
- gestion d'erreurs : réutiliser [`interpreter_statut_http`] / les catégories `ErreurConnecteur` déjà en place ; un `author_email` absent n'est jamais une anomalie (commit simplement ignoré).

Contraintes transverses : aucune utilisation de `.unwrap()` / `.expect()`, `#![forbid(unsafe_code)]` déjà global, visibilité `pub(crate)` au plus, Rustdoc `///` sur tout élément public.

Tests `#[cfg(test)]` du module (client HTTP simulé, jamais d'appel réseau réel, sur le patron des tests existants de `gitlab.rs`) :

- premier commit interne trouvé sur une page intermédiaire, avec pagination `x-total-pages` simulée sur 3 pages ;
- ordre : le commit retourné est bien le **plus ancien** correspondant, pas le premier rencontré lors du parcours ;
- correspondance par domaine de courriel et par alias, en plus du courriel exact ;
- `author_email` absent : commit ignoré sans erreur ;
- `total_pages` supérieur à la borne, aucune correspondance dans la fenêtre → `TropDeCommits` ;
- remontée complète sans correspondance → `AucunCommitInterne` ;
- dépôt vide → `DepotVide` ;
- catégories d'anomalie RG-021 (authentification refusée, droits insuffisants, instance injoignable, délai dépassé, réponse inattendue) propagées.

### 4.2 Module de coordination — `src-tauri/src/persistance/prise_en_charge.rs`

En-tête de mention IA, documentation de module `//!` référençant US-058 et RG-058. Déclaration `pub(crate) mod prise_en_charge;` dans `src-tauri/src/persistance.rs`, en respectant l'ordre alphabétique.

Fonctions (Rustdoc `///`, visibilité `pub(crate)`) :

- `fn empreinte_referentiel_interne(groupe: &Groupe) -> String` : filtrer `groupe.membres_connus` sur `statut == StatutMembre::Interne`, projeter `(critere, type_critere, alias_email)`, trier, sérialiser en JSON canonique, condenser en SHA-256 (`sha2::Sha256`, déjà dépendance du cœur natif — cf. `persistance/kdf.rs`), retourner `format!("sha256:{:x}", condensat)` ;
- `fn construire_correspondance_interne(groupe: &Groupe) -> CorrespondanceInterne` : construit les ensembles de courriels exacts, d'alias et de domaines à partir des règles `interne` ;
- `pub(crate) async fn calculer_prise_en_charge(projet: &Projet, groupe: &Groupe, resolveur_connecteur: ...) -> PremierCommitInterne` :
  1. `empreinte` = `empreinte_referentiel_interne(groupe)` ;
  2. `correspondance` = `construire_correspondance_interne(groupe)` ; si vide (aucune règle `interne`), retourner directement `statut: "aucun_membre_interne"` sans aucun appel réseau ;
  3. filtrer `projet.sources` sur `TypeSource::Gitlab` ; si vide → `statut: "non_applicable"` ;
  4. pour chaque source GitLab, appeler `rechercher_premier_commit_interne` ; collecter les `Trouve` ; retenir les cas `DepotVide` ;
  5. si au moins un `Trouve` : retenir la **date la plus ancienne** (et son SHA / courriel), `statut: "determine"` ;
  6. sinon si toutes les sources GitLab sont `DepotVide` → `statut: "depot_vide"` ;
  7. sinon si au moins une source a répondu `TropDeCommits` → `statut: "indetermine_trop_de_commits"` ;
  8. sinon → `statut: "aucun_membre_interne"` ;
  9. dans tous les cas, `calcule_le` = date du jour, `empreinte_referentiel` = `empreinte` ; `date` / `sha` / `email_auteur` ne sont portés que par la variante `Determine` de l'`enum` (cf. §9).
- `pub(crate) fn recalcul_necessaire(projet: &Projet, groupe: &Groupe) -> bool` : `true` si `projet.premier_commit_interne` est `None`, ou `statut != "determine"`, ou `empreinte_referentiel != empreinte_referentiel_interne(groupe)`. Utilisé par la case à cocher (décision actée n°2).

Tests `#[cfg(test)]` (connecteur simulé) : plus ancienne date retenue parmi deux sources, `non_applicable` sans source GitLab, `aucun_membre_interne` sans règle `interne`, `depot_vide` si toutes les sources vides, `recalcul_necessaire` sensible au changement d'empreinte.

### 4.3 Commande de la Façade

Nouveau module de commande dédié `src-tauri/src/commandes/prise_en_charge.rs` (décision actée n°11), cohérent avec `persistance/prise_en_charge.rs`, sur le gabarit de `commandes::purge::previsualiser_purge_densite` et **avec journalisation obligatoire de début / fin** :

```rust
#[tauri::command]
pub(crate) async fn calculer_prise_en_charge_projet(
    projet_id: String,
    donnees: DonneesRacine,
    etat: State<'_, EtatSession>,
) -> Result<PremierCommitInterne, ErreurFacade> {
    crate::journalisation::consigner_debut_commande("calculerPriseEnChargeProjet");
    let resultat = { /* résolution groupe+projet, credentials en mémoire via `etat`, appel connecteur */ };
    crate::journalisation::consigner_fin_commande("calculerPriseEnChargeProjet");
    resultat
}
```

Cette commande **ne persiste rien** : elle retourne la structure calculée. La persistance (écriture chiffrée, rotation des sauvegardes RG-003, ressaisie du mot de passe RG-002) est déclenchée par le flux appelant côté interface (bouton Fiche projet → commande de sauvegarde existante ; campagne → intégration du brouillon). Les credentials GitLab proviennent exclusivement de la mémoire volatile de session (`EtatSession`), jamais d'un paramètre.

Enregistrement dans `src-tauri/src/lib.rs` (`tauri::generate_handler!`).

## 5. Partie B — Façade, orchestrateur de campagne et case à cocher

### 5.1 Façade de commandes et bouchon TypeScript

`src/app/services/sansetat/commandes/` : nouvelle méthode `calculerPriseEnChargeProjet`, générique sur le type de racine pour ne pas importer de type de `services/avecetat/` ([norme 09, frontière unique](../../.claude/rules/09-normes-developpement.md#structure-et-nommage)) :

```ts
export interface ParametresCalculPriseEnCharge<TDonnees> {
  readonly projetId: string;
  readonly donnees: TDonnees;
}
```

`public async calculerPriseEnChargeProjet<TDonnees, TReponse>(parametres: ParametresCalculPriseEnCharge<TDonnees>): Promise<TReponse>` déléguant à `InvocationCommandeUtils.invoquer<TReponse>('calculer_prise_en_charge_projet', { ...parametres })`.

Bouchon : `bouchon-*.utils.ts` renvoie un `PremierCommitInterne` déterministe à partir des données de démonstration (`donnees-racine-bouchon.ts` fournit déjà des valeurs `premierCommitInterne`), avec un délai artificiel fixe (cf. [normes de tests E2E](../../.claude/rules/11-normes-tests.md#tests-de-bout-en-bout)) pour exercer l'indicateur de chargement.

### 5.2 Formulaire de constitution de campagne

[`constitution-campagne.component.html`](../../src/app/ecrans/audits/constitution-campagne/constitution-campagne.component.html) : nouvelle **carte « Options »** (décision actée n°12), adjacente à la carte « Date d'analyse », portant la case à cocher décochée par défaut :

```html
<label class="d-flex aligne-centre ecart-2 texte-sm">
  <input
    id="constitution-campagne-case-prise-en-charge"
    type="checkbox"
    [ngModel]="calculerPriseEnCharge()"
    (ngModelChange)="definirCalculerPriseEnCharge($event)"
    aria-describedby="constitution-campagne-prise-en-charge-aide"
  />
  Calculer la date de prise en charge des projets sélectionnés
</label>
<span id="constitution-campagne-prise-en-charge-aide" class="champ__aide">
  Recherche le premier commit d'un membre interne sur les dépôts GitLab. Cette option n'est utile
  que si les membres connus du groupe sont tous, ou en grande partie, qualifiés : à cocher après
  avoir fait ce travail de qualification. Sans effet sur les projets dont la date est déjà à jour.
</span>
```

`constitution-campagne.component.ts` : signal `calculerPriseEnCharge` (défaut `false`), transmis à `ConstitutionCampagne` (interface ligne 113 du service orchestrateur) puis à `lancerCampagne`.

### 5.3 Orchestrateur de campagne

[`orchestrateur-campagne.service.ts`](../../src/app/services/avecetat/campagne/orchestrateur-campagne.service.ts) : `lancerCampagne` / `auditerProjet` reçoivent un paramètre optionnel `calculerPriseEnCharge: boolean` (absent ou `false` = comportement strictement inchangé), sur le modèle exact du paramètre `dateCiblee` introduit par C15-14.

Quand `calculerPriseEnCharge` est vrai, pour chaque projet du périmètre :

- si le pré-filtre `recalcul_necessaire` (répliqué côté interface en utilitaire du Moteur de jugement, `services/sansetat/jugement/`, à partir de l'empreinte recalculée sur les règles `interne` du groupe) indique que le calcul est inutile → aucun appel, la valeur existante est conservée ;
- sinon, un appel supplémentaire `calculerPriseEnChargeProjet` est ajouté au pipeline du projet, **en dehors** du périmètre d'indicateurs d'audit (il n'alimente pas un `ResultatAudit`, il alimente une nouvelle facette du brouillon) ;
- le résultat est porté par le brouillon de campagne à côté des résultats d'audit : nouvelle propriété `prisesEnCharge?: Record<projetId, PremierCommitInterne>` de la structure de brouillon ;
- **échec absorbé par projet** : une anomalie sur le calcul de prise en charge n'échoue jamais la campagne ni l'audit du projet (même principe que RG-046 / RG-021, dégradation par source) ; l'anomalie est consignée dans le rapport d'anomalies du brouillon avec une catégorie claire.

L'utilitaire du pré-filtre côté interface doit rester cohérent avec la fonction Rust `recalcul_necessaire` : l'empreinte est recalculée des deux côtés selon **exactement la même** sérialisation canonique (à documenter dans un document normatif — cf. [précédent de la largeur du bloc KDF](../../.claude/rules/10-normes-securite.md#secrets-et-données-sensibles)).

### 5.4 Intégration du brouillon

Le flux d'intégration du brouillon (écran Brouillon → `DonneesApplicationService`) applique les `prisesEnCharge` du brouillon aux `Projet` correspondants **au même moment** que l'intégration des audits, dans la même sauvegarde chiffrée. Chaque application donne lieu à une entrée de journal ([RG-023](../02_documentation/05_reglesGestion.md#seuils-référentiels-et-historisation)) : « date de prise en charge calculée / recalculée pour le projet X : AAAA-MM-JJ (statut) ».

Le rejet du brouillon abandonne aussi les `prisesEnCharge` (aucune application partielle).

## 6. Partie C — Fiche projet : affichage, recalcul et suggestion

[`fiche-projet.component.ts`](../../src/app/ecrans/fiche-projet/fiche-projet.component.ts) — la métadonnée « Âge chez nous » ([ligne 1106](../../src/app/ecrans/fiche-projet/fiche-projet.component.ts#L1106)) est déjà câblée sur `projet.premierCommitInterne`. Évolutions :

1. **Libellés de statut.** `construireAgeChezNousLabel` distingue les statuts : `determine` → libellé actuel (`N ans (depuis AAAA-MM-JJ)`) ; `aucun_membre_interne` → « aucun commit interne trouvé » ; `indetermine_trop_de_commits` → « non déterminé (dépôt trop volumineux) » ; `non_applicable` → « — (aucune source GitLab) » ; `depot_vide` → « — (dépôt vide) » ; absent → « non calculée ».
2. **Bouton « recalculer ».** À côté de la métadonnée, un bouton discret déclenche `calculerPriseEnChargeProjet` pour ce seul projet (recalcul **systématique**, ignore le pré-filtre), suivi d'une confirmation de mot de passe (RG-002) et de la sauvegarde. Indicateur de chargement pendant l'appel. Notification de succès / échec via `NotificationService`.
3. **Suggestion discrète sur empreinte périmée.** Si `premierCommitInterne.empreinteReferentiel` diffère de l'empreinte courante des règles `interne` du groupe, afficher à côté du bouton une mention discrète « les membres internes ont changé depuis ce calcul » (exigence F17 : « suggéré discrètement quand l'empreinte a changé »). Le calcul de l'empreinte courante côté interface réutilise l'utilitaire de la Partie B.
4. **Export PNG.** La métadonnée fait déjà partie de la fiche exportée ; le bouton « recalculer » et la mention de suggestion sont masqués à l'export (comme les autres contrôles interactifs).

## 7. Partie D — Comparaison d'audits : repère « prise en charge »

[`comparaison-audits.component.ts`](../../src/app/ecrans/comparaison-audits/comparaison-audits.component.ts) — le calcul du différentiel (`DifferentielAuditsUtils`) **n'est pas modifié** : un audit « prise en charge » est un audit du projet comme un autre, simplement mis en évidence.

1. **Marquage dans les sélecteurs.** `construireOptions` ([ligne 440](../../src/app/ecrans/comparaison-audits/comparaison-audits.component.ts#L440)) : si `projet.premierCommitInterne?.statut === 'determine'` et qu'un audit porte `audit.date === premierCommitInterne.date`, suffixer son libellé « (prise en charge) » (cumulable avec « (historique) »).
2. **Nouveau raccourci `priseEnCharge`.** Ajouté à `RaccourciComparaisonAudits`. `resoudreRaccourci` : borne gauche = l'audit dont la date correspond exactement à la prise en charge ; borne droite = le dernier audit régulier. Le raccourci n'est proposé (bouton actif) que si cet audit existe.
3. **Invite en l'absence d'audit.** Si `premierCommitInterne.statut === 'determine'` mais qu'aucun audit ne porte cette date exacte, le bouton du raccourci est **désactivé** et accompagné d'un texte d'aide : « Aucun audit à la date de prise en charge (AAAA-MM-JJ). Lancez une campagne historique ciblant cette date pour rendre la comparaison possible. » avec lien vers le formulaire de constitution de campagne. L'application ne crée jamais l'audit historique automatiquement (décision actée n°4).
4. **Rappel des annotations de l'intervalle** : inchangé (le volet existant couvre déjà tout intervalle entre deux dates d'audit).

## 8. Partie E — Membres internes partis : attribut `partiLe`

Périmètre de cette partie : ajouter le champ, permettre sa saisie, garantir qu'il n'altère rien d'existant. L'audit d'accès est renvoyé à plan_19 (décision actée n°15).

### 8.1 Modèle

- `src-tauri/src/modele/racine.rs`, `struct MembreConnu` : nouveau champ `#[serde(default, skip_serializing_if = "Option::is_none")] pub(crate) parti_le: Option<String>` (date ISO `AAAA-MM-JJ`), avec Rustdoc référençant RG-060. Champ additif optionnel : **aucun incrément de `VERSION_SCHEMA_COURANTE` requis** pour lui seul (un fichier antérieur sans le champ se désérialise en `None`) — l'incrément de version reste porté uniquement par la refonte de `PremierCommitInterne` (décision actée n°10).
- `src/app/services/avecetat/etat/types-donnees.ts`, interface `MembreConnu` : `readonly partiLe?: string;`.
- `src/app/services/sansetat/jugement/statut-membre.utils.ts`, `RegleMembreConnu<TStatut>` : **inchangé** — `partiLe` n'entre pas dans la résolution de statut. À documenter par un commentaire explicite pour éviter qu'une relecture future croie à un oubli.

### 8.2 Saisie — formulaire d'administration des membres connus

[`membres-connus-admin.component.html`](../../src/app/ecrans/administration/groupes/membres-connus/membres-connus-admin.component.html) : nouveau champ après « Statut », avant « Libellé » :

```html
<label class="champ">
  Parti le
  <input
    id="membres-connus-admin-champ-parti-le"
    type="date"
    class="champ__controle"
    name="partiLe"
    [(ngModel)]="partiLe"
    [disabled]="typeCritere === 'domaineEmail'"
    [max]="dateAujourdhui"
    aria-describedby="membres-connus-admin-champ-parti-le-aide"
  />
  <span id="membres-connus-admin-champ-parti-le-aide" class="champ__aide">
    Facultatif : date à laquelle ce membre a quitté l'organisation. Renseignée, elle documente qu'il
    ne devrait plus figurer dans les membres des dépôts du projet. Sans objet pour une règle de type
    domaine. Ses anciens commits restent comptés pour la date de prise en charge.
  </span>
</label>
```

- `membres-connus-admin.component.ts` : signal / champ `partiLe` (chaîne vide = absent), `dateAujourdhui` pour le plafond, remise à vide si `typeCritere` bascule sur `domaineEmail`.
- Validation avant enregistrement (côté interface) : si renseignée, date valide et `<= dateAujourdhui` ; rejet si `typeCritere === 'domaineEmail'`. Message d'erreur dans le bloc `messageErreur` existant.
- Façade + commande de création / modification de membre connu (`facade-administration.service.ts` et le module de commande Rust correspondant) : le champ `partiLe` transite dans le `MembreConnu` complet, aucune signature nouvelle. **Revalidation côté cœur natif** : date parsable, non future, absente si `type_critere == DomaineEmail` → sinon `ErreurFacade` typée ([norme sécurité, revalidation systématique](../../.claude/rules/10-normes-securite.md#entrées-et-sorties)).
- Saisie en masse ([RG-041](../02_documentation/05_reglesGestion.md#membres-et-sécurité-des-accès)) : **hors périmètre** de ce plan (pas de colonne `partiLe` dans la modale tabulaire pour l'instant, à envisager plus tard).

### 8.3 Affichage — liste des règles d'administration

Ligne de règle (`membres-connus-admin__ligne`) : quand `regle.partiLe` est renseigné, ajouter après le `statut` une mention discrète `· parti le {{ regle.partiLe | date:'dd/MM/yyyy' }}` en texte atténué (classe `texte-discret texte-sm`). Aucune autre mise en forme (pas de couleur d'alerte : l'anomalie « a encore accès » se juge sur la Fiche projet, plan_19).

### 8.4 Prise en compte dans la datation

`construire_correspondance_interne` (§4.2) itère `groupe.membres_connus` filtrés sur `statut == StatutMembre::Interne` **sans filtrer sur `parti_le`** : un interne parti est donc naturellement inclus dans `CorrespondanceInterne`. L'empreinte `empreinteReferentiel` (§3, RG-058) reste calculée sur `(critere, type_critere, alias_email)` et **n'inclut pas `parti_le`** : marquer un interne comme parti ne périme pas le calcul de prise en charge (comportement voulu — la datation ne change pas).

### 8.5 Raccourci « Marquer comme parti » depuis la Fiche projet

Optionnel, cohérent avec le lien « Qualifier ce membre » déjà présent sur la ligne d'un membre inconnu : sur la ligne d'un membre `interne`, un lien « Marquer comme parti » ouvrant l'écran d'administration pré-filtré sur la règle correspondante, `partiLe` pré-rempli à la date du jour. À confirmer (peut aussi être versé dans plan_19 avec le reste de l'exploitation Fiche projet).

## 9. Impacts sur le modèle de données et migration

- Le champ `Projet.premierCommitInterne` existe déjà ([`racine.rs:404`](../../src-tauri/src/modele/racine.rs#L404), [`types-donnees.ts:340`](../../src/app/services/avecetat/etat/types-donnees.ts#L340)), optionnel avec `skip_serializing_if` : un fichier antérieur sans le champ se désérialise en « absent », sans traitement particulier.
- **Forme retenue (décision actée n°10) : `statut` en `enum` discriminant.** `#[serde(tag = "statut", rename_all = "snake_case")]` avec une variante `Determine { date, sha, email_auteur }` et des variantes sans données (`AucunMembreInterne`, `IndetermineTropDeCommits`, `NonApplicable`, `DepotVide`). Le typage interdit alors un statut incohérent (pas de `date` sur un statut d'indétermination). `calculeLe` et `empreinteReferentiel` restent hors de l'enum, toujours renseignés. Le type TS `PremierCommitInterne` devient une union discriminée sur `statut` ; l'affichage de la Fiche projet et le jeu d'exemple `exemple-donnees.json` sont adaptés.
- **Migration de schéma nécessaire** pour les fichiers portant déjà un `premierCommitInterne` de forme plate (jeu d'exemple, bouchon, fichiers de test) : incrément de `VERSION_SCHEMA_COURANTE` et fonction de migration dans [`persistance/migration.rs`](../../src-tauri/src/persistance/migration.rs) sur le patron des migrations existantes (un `premierCommitInterne` plat avec `statut: "determine"` → variante `Determine` ; tout autre `statut` plat → variante correspondante en supprimant `date`/`sha`/`emailAuteur`).
- **Structure de brouillon de campagne** : nouvelle propriété `prisesEnCharge?: Record<string, PremierCommitInterne>` (côté cœur natif et TS), optionnelle, absente = brouillon sans calcul de prise en charge. À décrire dans [`12_modeleDonnees.md`](../02_documentation/12_modeleDonnees.md).
- `parametres.audit.borneRecherchePremierCommitPages` : déjà dans le modèle (`Option<u32>`), valeur de repli 50 documentée au plus près de la constante ([norme 09](../../.claude/rules/09-normes-developpement.md#structure-et-nommage)) et signalée comme décision arbitraire à valider.
- **`MembreConnu.partiLe`** : nouveau champ optionnel `Option<String>` (date ISO), additif — absent = membre actif, aucune migration dédiée nécessaire (cf. §8.1). Donnée personnelle : même traitement que les autres champs de `MembreConnu` (vit dans `groupes`, chiffré au repos, exclu de l'export en clair).

## 10. Impacts documentaires

| document | modification |
|---|---|
| [`01_besoin/Specification.md`](../01_besoin/Specification.md) §5.17 F17 | remplacer le déclencheur « à la première liaison d'une source GitLab (repli : premier audit) » par « à la demande : case à cocher du formulaire de campagne (décochée par défaut, recalcul conditionnel) et bouton “recalculer” de la Fiche projet (recalcul systématique) » ; énoncer les cinq statuts ; préciser la règle « plus ancienne date parmi les sources GitLab » ; mentionner l'attribut `partiLe` des règles de membres connus (départ documenté d'un interne, sans effet sur la datation ; exploitation d'accès à venir dans plan_19) |
| [`02_documentation/04_casUsage.md`](../02_documentation/04_casUsage.md) | ajouter US-058 (Camille, calcul à la demande depuis la campagne / la Fiche projet), US-059 (comparaison depuis la prise en charge) et US-061 (renseigner `partiLe`) ; compléter les critères d'acceptation d'US-017 (Fiche projet : bouton recalculer, libellés de statut, suggestion sur empreinte) et de l'US de constitution de campagne (case à cocher) |
| [`02_documentation/05_reglesGestion.md`](../02_documentation/05_reglesGestion.md) | ajouter RG-058, RG-059 et RG-060 (contenus §3) ; rattacher RG-058 aux écrans « Constitution de campagne », « Fiche projet », « Brouillon », RG-060 à « Administration (Membres connus) » ; référencer RG-006 à RG-008, RG-021, RG-023, RG-046 |
| [`02_documentation/12_modeleDonnees.md`](../02_documentation/12_modeleDonnees.md) | forme finale de `premierCommitInterne` (enum discriminant sur `statut`) ; ajouter `brouillon.prisesEnCharge` ; ajouter `MembreConnu.partiLe` (optionnel, date) |
| [`02_documentation/13_conceptionDetaillee.md`](../02_documentation/13_conceptionDetaillee.md) | nouveau module `connecteurs/gitlab::rechercher_premier_commit_interne`, module `persistance/prise_en_charge`, commande `calculerPriseEnChargeProjet` ; séquence « Calculer la date de prise en charge » ; convention de sérialisation canonique de l'empreinte du référentiel `interne` ; champ `partiLe` et sa validation (UI + revalidation cœur natif) |
| [`02_documentation/15_normesSecurite.md`](../02_documentation/15_normesSecurite.md) | rappeler que `emailAuteur` (donnée personnelle) n'est jamais journalisé et reste exclu de l'export en clair ; documenter la forme exacte de l'empreinte (préfixe `sha256:`, champs couverts, tri) ; `partiLe` est une donnée personnelle supplémentaire, même traitement (chiffrement, exclusion de l'export en clair) |
| [`02_documentation/09_maquettes.md`](../02_documentation/09_maquettes.md) | Fiche projet : métadonnée « Âge chez nous » enrichie (bouton, statuts) ; Administration Membres connus : champ « Parti le » |
| [`02_documentation/16_normesTests.md`](../02_documentation/16_normesTests.md) | ajouter les cas de test de la Partie A (plus ancien commit, borne atteinte, aucun membre interne, dépôt vide) à la matrice de traçabilité ; parcours E2E : cocher la case en campagne et vérifier l'affichage en Fiche projet |
| [`guide-utilisateur.md`](../guide-utilisateur.md) | courte section « Date de prise en charge » (à quoi elle sert, comment la calculer, pourquoi qualifier les membres d'abord) ; capture régénérée |

## 11. Impacts sur les tests

**Cœur natif (`cargo test`, seuil 80 %)** — cf. listes des §4.1 et §4.2. Points saillants :

- connecteur : pagination `x-total-pages` simulée, ordre de retour (plus ancien), correspondance courriel exact / alias / domaine, `author_email` absent ignoré, borne atteinte → `TropDeCommits`, dépôt vide, catégories d'anomalie RG-021 ;
- module de coordination : plus ancienne date parmi deux sources, `non_applicable`, `aucun_membre_interne`, `depot_vide`, `recalcul_necessaire` sensible à l'empreinte ;
- empreinte : stabilité (même ensemble de règles dans un ordre différent → même empreinte), sensibilité (ajout / retrait d'une règle `interne` → empreinte différente), invariance vis-à-vis des règles non `interne`.

**Interface (`npm test`, Jest)** :

- utilitaire de pré-filtre `recalcul_necessaire` côté interface : parité avec la fonction Rust (mêmes entrées → même verdict) ;
- utilitaire d'empreinte côté interface : parité de sérialisation canonique avec le cœur natif (jeu de vecteurs partagé) ;
- `constitution-campagne.component` : la case transmet bien l'option à l'orchestrateur ; décochée par défaut ;
- `fiche-projet.component` : libellés des cinq statuts ; bouton recalculer déclenche la commande puis la confirmation de mot de passe ; mention de suggestion visible seulement si empreinte périmée ; contrôles masqués à l'export PNG (couverture par fonctions : aucune méthode de rendu jamais appelée) ;
- `comparaison-audits.component` : marquage « (prise en charge) » sur l'audit de date correspondante ; raccourci actif seulement si l'audit existe ; invite + lien sinon ; différentiel inchangé ;
- `membres-connus-admin.component` : champ « Parti le » désactivé et vidé quand `typeCritere === 'domaineEmail'` ; rejet d'une date future ; rejet sur règle domaine ; mention « parti le … » dans la ligne quand renseignée ;
- `statut-membre.utils` : un membre dont la règle porte `partiLe` conserve exactement le même statut résolu (test de non-régression explicite).

**Cœur natif — `partiLe`** : désérialisation d'un `MembreConnu` avec / sans `partiLe` ; revalidation de la commande de création / modification (date invalide, date future, `partiLe` sur `DomaineEmail` → `ErreurFacade`) ; `construire_correspondance_interne` inclut un interne parti ; un commit d'un interne parti date bien la prise en charge (test dédié dans `persistance/prise_en_charge.rs`).

**E2E (`npm run test:e2e`, Playwright, bouchon TS)** : étendre le parcours unique — après la campagne, cocher la case « calculer la date de prise en charge », intégrer le brouillon, ouvrir la Fiche projet et vérifier l'affichage « Âge chez nous », puis ouvrir la Comparaison d'audits et vérifier le marquage / l'invite. Le bouchon fournit un `premierCommitInterne` déterministe avec délai artificiel.

**Matrice de traçabilité** : vérification croisée refaite (règle générale n°13) — chaque nouveau module / composant couvert par au moins un test ; RG-058 et RG-059 reliées à au moins un test ; aucun impact sur les tests de charge (le calcul de prise en charge n'est pas une exigence de performance chiffrée, exclusion à noter).

## 12. Découpage en incréments

1. **Connecteur GitLab** : `rechercher_premier_commit_interne` + `ReponseCommitAuteur` + `CorrespondanceInterne` + tests simulés. Aucun impact fonctionnel visible.
2. **Attribut `partiLe`** : champ modèle (`MembreConnu.parti_le` / `partiLe`), formulaire d'administration des membres connus (saisie, désactivation sur `domaineEmail`, validation UI), revalidation côté commande Rust, marqueur de liste, tests. Cohérent avec l'inclusion dans `CorrespondanceInterne` de l'incrément 3.
3. **Module de coordination + commande de Façade** : `persistance/prise_en_charge.rs`, `calculer_prise_en_charge_projet`, enregistrement `lib.rs`, journalisation début / fin, tests (dont « un interne parti date la prise en charge »). Empreinte + sérialisation canonique documentées dans `13_conceptionDetaillee.md` / `15_normesSecurite.md`.
4. **Façade TS + bouchon + utilitaires d'interface** : méthode de Façade générique, bouchon déterministe, utilitaires `recalcul_necessaire` et empreinte côté interface avec vecteurs de parité.
5. **Fiche projet** : libellés de statut, bouton « recalculer » (confirmation mot de passe + sauvegarde), suggestion sur empreinte périmée. Premier incrément à valeur utilisateur visible (voie unitaire complète).
6. **Campagne** : carte « Options », case à cocher, propagation à l'orchestrateur, `brouillon.prisesEnCharge`, intégration / rejet du brouillon, journalisation par projet, dégradation par projet. Voie de masse complète.
7. **Comparaison d'audits** : marquage « (prise en charge) », raccourci `priseEnCharge`, invite en l'absence d'audit (US-059).
8. **Documentation utilisateur + captures + revue croisée finale** de la matrice de traçabilité.

Chaque incrément : auto-revue + revue assistée par l'IA en contexte isolé, exécution / test réel avant validation, pas de passage à l'incrément suivant sans validation humaine explicite.

## 13. Vérification de bout en bout

Séquence de recette manuelle, sur `npm start` (bouchon TS) puis, pour la partie connecteur, sur une vraie instance GitLab via les tests d'intégration `#[ignore]` (`SQM_TEST_GITLAB_*`) :

1. groupe sans règle `interne` → case cochée en campagne → Fiche projet affiche « aucun commit interne trouvé », aucun appel réseau superflu (journal) ;
2. qualifier un membre `interne` dont le domaine couvre l'auteur du plus ancien commit → recalculer depuis la Fiche projet → date attendue, statut `determine`, `calculeLe` = aujourd'hui ;
3. projet à deux sources GitLab d'âges différents → la date retenue est celle de la source la plus ancienne ;
4. projet sans source GitLab → « — (aucune source GitLab) » ;
5. modifier une règle `interne` → la Fiche projet affiche la suggestion « les membres internes ont changé » ; relancer une campagne avec la case cochée → le projet est recalculé, les projets déjà à jour ne le sont pas (journal) ;
6. lancer une campagne historique ciblant exactement la date de prise en charge → l'audit produit apparaît « (prise en charge) » dans la Comparaison d'audits, le raccourci « Depuis la prise en charge » devient actif et sélectionne cet audit contre le dernier audit régulier ;
7. sans cet audit → le raccourci est désactivé avec l'invite et le lien vers la constitution de campagne ;
8. export PNG de la Fiche projet → la métadonnée est présente, le bouton et la suggestion sont absents ;
9. renseigner `partiLe` sur la règle `interne` de l'auteur du plus ancien commit, à une date postérieure à ce commit → recalculer la prise en charge : la date **ne change pas** (le commit reste compté) ; la ligne de la règle affiche « parti le … » en Administration ; aucune mise en évidence d'accès sur la Fiche projet (attendu — c'est plan_19) ;
10. tenter `partiLe` sur une règle `domaineEmail` → refus à la saisie et refus côté cœur natif ; tenter une date future → refus.

## 14. Points restant ouverts

1. **Plan_19 — audit d'accès des membres partis.** À créer : exploitation de `partiLe` pour signaler qu'un membre parti figure encore dans `GET /projects/:id/members/all` (badge d'en-tête de la Fiche projet, mise en évidence de la ligne, décompte par section, nouvelle catégorie d'alerte de la famille RG-006), et éventuel repère des commits postérieurs à `partiLe`. Touche l'indicateur `gitlab.membres`, la logique de gravité et l'écran des alertes — donc hors de ce plan.
2. **Raccourci « Marquer comme parti » de la Fiche projet** (§8.5) : à confirmer ici ou à verser dans plan_19.
3. **Colonne `partiLe` dans la saisie en masse** (RG-041) : non retenue à ce stade, à réévaluer selon l'usage.
4. **Contributeurs non membres** : F17 mentionne la détection des « contributeurs non membres et non reconnus » ; hors périmètre de ce plan (qui ne traite que du premier commit `interne`), à confirmer.

Points tranchés les 2026-09-01 et 2026-09-02, reportés dans les décisions actées §2 : déclenchement explicite (n°1), case « si absent ou obsolète » (n°2), affichage Fiche projet (n°3), comparaison sur audit de date exacte (n°4), borne 50 pages (n°5), forme `enum` discriminant + migration (n°10), module `commandes/prise_en_charge.rs` (n°11), carte « Options » (n°12), une entrée de journal par projet (n°13), message d'aide sur la case (n°14), attribut `partiLe` plutôt qu'un nouveau statut, audit d'accès renvoyé à plan_19 (n°15), nom du fichier de plan conservé.
