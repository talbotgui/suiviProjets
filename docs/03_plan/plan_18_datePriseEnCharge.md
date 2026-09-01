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
- **stockée** comme attribut stable, recalculable à la demande, du projet (`premierCommitInterne` : `date`, `sha`, `emailAuteur`, `calculeLe`, `empreinteReferentiel`, `statut`), déjà présent dans le modèle ;
- **affichée** dans la Fiche projet (« Âge chez nous », déjà câblé) ;
- **utilisable** comme borne de comparaison sur l'écran Comparaison d'audits, à condition qu'un audit (régulier ou historique) porte exactement cette date.

Un membre interne **ayant quitté le projet** reste pris en compte pour cette datation : ses anciens commits sont des commits internes légitimes. Ce plan introduit à cet effet un attribut `partiLe` sur les règles de membre connu (cf. [Partie E](#8-partie-e--membres-internes-partis--attribut-partile)). L'exploitation de cet attribut pour l'**audit d'accès** (signaler qu'un parti figure encore dans les membres d'un dépôt) est un besoin distinct, renvoyé à un plan ultérieur (plan_19).

## 2. Décisions actées

### Décisions fonctionnelles (arbitrages utilisateur des 2026-09-01 et 2026-09-02)

1. **Déclenchement explicite uniquement.** Le déclencheur automatique « à la première liaison d'une source GitLab (repli : premier audit) » décrit par F17 est **abandonné**. Le calcul n'a lieu que sur action explicite : case à cocher du formulaire de campagne, ou bouton « recalculer » de la Fiche projet. `Specification.md` §5.17 (et sa ligne 143) est corrigé en conséquence.
2. **Sémantique de la case à cocher : « calculer si absent ou obsolète ».** Pour chaque projet sélectionné de la campagne, le calcul est effectué si, et seulement si, `premierCommitInterne` est absent, **ou** son `statut` n'est pas `determine`, **ou** l'empreinte du sous-ensemble `interne` des membres connus du groupe a changé depuis `calculeLe`. Les projets déjà à jour ne sont pas retouchés. Aucun mode « forcer le recalcul » n'est proposé au niveau de la campagne (le bouton unitaire de la Fiche projet, lui, force toujours le calcul — mais pas nécessairement l'écriture, cf. décision 6).
3. **Affichage : Fiche projet.** L'unique écran d'affichage est la Fiche projet (métadonnée « Âge chez nous », déjà en place). Aucun autre écran ne restitue la date en propre à ce stade, hormis le repère de la décision 4.
4. **Comparaison d'audits.** La comparaison « depuis la prise en charge » est possible uniquement si un audit du projet (régulier ou historique) porte une `date` **exactement égale** à `premierCommitInterne.date`. Dans ce cas, cet audit est marqué « (prise en charge) » dans les sélecteurs, et un raccourci « Depuis la prise en charge » le sélectionne comme borne gauche, le dernier audit régulier comme borne droite. Sinon, le raccourci est présenté désactivé avec une invite : à l'utilisateur de lancer une campagne historique ciblant cette date. L'application ne crée jamais elle-même l'audit historique correspondant.
5. **Borne de remontée : 50 pages.** La valeur `borneRecherchePremierCommitPages` par défaut reste `50` (déjà présente dans [`exemple-donnees.json`](../01_besoin/exemple-donnees.json#L1796) et le modèle `ParametresAudit`), soit au plus 50 × `TAILLE_PAGE_AUDIT` commits inspectés par source. Cette valeur sera éprouvée sur de vrais projets par l'utilisateur.
6. **Recalcul sans changement = aucune écriture (arbitrage du 2026-09-02).** Quand un recalcul (campagne ou bouton de la Fiche projet) produit un résultat **identique à la valeur stockée** (même `date` et même `statut`), aucune écriture n'a lieu : pas de ressaisie du mot de passe (RG-002), pas de sauvegarde chiffrée, pas de rotation des sauvegardes de sécurité (RG-003), pas d'entrée de journal (RG-023). La Fiche projet affiche une notification « date de prise en charge inchangée ».
7. **Une entrée de journal par projet effectivement modifié** à l'intégration du brouillon (cohérent avec RG-023 et RG-041) ; les projets recalculés sans changement (décision 6) n'en produisent pas.
8. **Carte « Options » dédiée.** La case à cocher est portée par une carte « Options » du formulaire de campagne (et non la carte « Date d'analyse »), prête à accueillir d'éventuelles options futures.
9. **Message d'aide sur la qualification.** Un message à côté de la case précise qu'elle n'est utile que si les membres du groupe sont, en grande partie, **qualifiés par courriel exact, alias courriel ou domaine** (une règle `interne` de type `username` sans `aliasEmail` reste invisible pour la datation, cf. §4.1).
10. **Membres internes partis : attribut orthogonal `partiLe`, pas de nouveau statut (arbitrage du 2026-09-02).** Le sujet « départ » est modélisé par un champ optionnel `partiLe: date` sur `MembreConnu`, indépendant de `statut` (l'axe interne / client / partenaire reste inchangé). **Périmètre de ce plan** : ajout du champ, saisie dans le formulaire d'administration des membres connus, validation, marqueur de liste, prise en compte transparente dans la datation, raccourci « Marquer comme parti » depuis la Fiche projet et colonne `partiLe` dans la saisie en masse (arbitrage du 2026-09-02, cf. §8.5 et §8.6). **Hors périmètre, renvoyé à plan_19** : l'exploitation « audit d'accès » — badge d'en-tête de la Fiche projet, mise en évidence de la ligne du membre concerné, décompte par section, nouvelle catégorie d'alerte de la famille RG-006, éventuel repère des commits postérieurs au départ — qui touche l'indicateur `gitlab.membres`, la logique de gravité et l'écran des alertes.
11. **`partiLe` exclu de l'empreinte du référentiel `interne` (arbitrage du 2026-09-02).** Marquer un interne comme parti ne périme pas le calcul de prise en charge : `empreinteReferentiel` porte sur `(critere, typeCritere, aliasEmail)` des règles `interne`, jamais sur `partiLe`.
12. **Priorités : US-058, US-059 et US-061 toutes « Should have » (arbitrage du 2026-09-02).**

### Décisions d'architecture

13. **Forme de `PremierCommitInterne` : `enum` discriminant (arbitrage du 2026-09-02).** `statut` devient le discriminant d'un `enum` interne-taggé (`#[serde(tag = "statut")]`), variante `Determine { date, sha, emailAuteur }` + variantes sans données. La forme sérialisée de la variante `Determine` est **identique** à la forme plate actuelle (jeu d'exemple, bouchon) : aucune transformation de données. **`VERSION_SCHEMA_COURANTE` est néanmoins incrémentée** et un palier de migration à transformation nulle est ajouté, conformément à la convention du projet pour tout changement de forme du schéma (révision du 2026-09-02, alignée sur `plan_17` chapitre 4 qui incrémente aussi) : la **valeur exacte n'est pas fixée par ce plan**, elle dépend de l'ordre d'intégration ; un test de non-régression de désérialisation de l'ancienne forme reste ajouté (cf. §9). La combinaison `enum` interne-taggé + champs frères (`calculeLe`, `empreinteReferentiel` hors enum) est à prototyper tôt (limites connues de `serde` sur `flatten` / `Content`).
14. **Statut `aucune_regle_interne` distinct de `aucun_membre_interne`.** Le premier signale « aucune règle de statut `interne` n'est définie pour le groupe » (invite à qualifier des membres) ; le second, « des règles existent, mais aucun commit correspondant n'a été trouvé dans la fenêtre remontée ». Libellés de Fiche projet différenciés (§6).
15. **Empreinte du référentiel `interne` : une seule implémentation, côté Rust (arbitrage Q1 du 2026-09-02).** Une commande dédiée `empreinteReferentielInterne(groupeId)` renvoie le condensé ; l'interface (pré-filtre de campagne, suggestion de la Fiche projet) l'appelle et compare des chaînes, sans jamais recalculer le SHA-256 en TypeScript. Pas de « sérialisation canonique répliquée des deux côtés », pas de jeu de vecteurs de parité inter-langages.
16. **Format de `premierCommitInterne.date` : date calendaire UTC `AAAA-MM-JJ`.** Le connecteur tronque `committed_date` (datetime ISO 8601 renvoyé par l'API) à sa date calendaire **en UTC**. C'est cette forme, identique à celle de `audit.date`, qui rend l'égalité stricte de la décision 4 fiable (RG-058, RG-059).
17. **Fonction de connecteur dédiée**, `rechercher_premier_commit_interne`, dans `src-tauri/src/connecteurs/gitlab.rs` : pagine `GET /repository/commits` **depuis la dernière page** ; l'API ne trie pas du plus ancien au plus récent, et **n'expose pas toujours `x-total-pages`** (omis au-delà d'environ 10 000 éléments). L'algorithme et son repli sont spécifiés au §4.1 (helper de lecture d'en-tête à écrire, aucun n'existant à ce jour).
18. **Module de coordination** côté cœur natif, `src-tauri/src/persistance/prise_en_charge.rs` : calcule l'empreinte, boucle sur les sources GitLab du projet, retient le **plus ancien** premier commit interne, construit la structure. **Aucune écriture disque** : il retourne la structure calculée, la persistance (conditionnelle, décision 6) étant faite par le flux appelant.
19. **Commande unitaire dans un nouveau module** `commandes/prise_en_charge.rs`, cohérent avec `persistance/prise_en_charge.rs`.
20. **La qualification résolue à l'affichage n'est pas modifiée.** Le statut d'un membre reste non stocké dans l'audit (F17). Le calcul du premier commit interne fige un résultat et une empreinte du référentiel `interne` au moment du calcul.
21. **Aucune donnée personnelle dans les journaux techniques.** Les commandes de la Façade journalisent début et fin ([norme 09](../../.claude/rules/09-normes-developpement.md#qualité-de-code)) ; le courriel d'auteur de commit n'est jamais journalisé (SHA et date seulement). `emailAuteur` et `partiLe` stockés sont des données personnelles (RGPD), couvertes par le chiffrement du fichier et exclues structurellement de l'export en clair (elles vivent dans `groupes`).

## 3. Périmètre et identifiants d'exigence proposés

Identifiants normatifs réellement consommés à la date de rédaction : jusqu'à `US-056` / `RG-056` (vérifié dans [`04_casUsage.md`](../02_documentation/04_casUsage.md) et [`05_reglesGestion.md`](../02_documentation/05_reglesGestion.md)). Plans non encore intégrés consommant des identifiants en parallèle : `plan_16` Étape 25 ; `plan_17` chapitre 3 (`US-057` / `RG-057`), chapitre 4 (`US-060` / `RG-060`), chapitre 5 (`US-062` / `RG-062`). La fenêtre libre pour `plan_18` est donc `US-058`, `US-059`, `US-061` et les `RG` de même numéro. Les numéros ci-dessous restent **à reconfirmer au moment de la qualification effective** ; en cas de collision, décaler l'ensemble de ce plan en bloc sans réintroduire de trou, sur le principe déjà appliqué en Étape 25 de `plan_16`.

| identifiant | intitulé | type |
|---|---|---|
| US-058 | Calculer, à la demande depuis une campagne ou la Fiche projet, la date de prise en charge d'un projet (premier commit interne) | Mutation — Should have |
| US-059 | Comparer un audit à l'état de prise en charge du projet sur l'écran Comparaison d'audits | Consultation — Should have |
| US-061 | Renseigner la date de départ (`partiLe`) d'un membre connu | Mutation — Should have |
| RG-058 | Règle de calcul de la date de prise en charge : source retenue, précédence d'auteur, format de date, borne de remontée et repli, statuts, empreinte du référentiel `interne`, stabilité et recalcul | règle de gestion |
| RG-059 | Sélection de l'audit « prise en charge » sur l'écran Comparaison d'audits (correspondance exacte de date, raccourci, invite en l'absence d'audit, périmètre réduit d'un audit historique) | règle de gestion |
| RG-061 | Attribut `partiLe` d'une règle de membre connu : portée, validation, effet nul sur la résolution de statut et sur la datation de la prise en charge, renvoi de l'audit d'accès à plan_19 | règle de gestion |

Contenu proposé de **RG-058** :

- la date de prise en charge d'un projet est la date calendaire **UTC** (format `AAAA-MM-JJ`, obtenue par troncature du `committed_date` renvoyé par l'API) du premier commit, sur l'une des sources de type GitLab du projet, dont le courriel d'auteur correspond à une règle de membre connu de statut `interne` du groupe ; la précédence de correspondance reprend [RG-007](../02_documentation/05_reglesGestion.md#membres-et-sécurité-des-accès) restreinte aux canaux disponibles sur un commit (courriel exact, alias courriel, domaine de courriel — le username n'est pas exposé par l'API des commits, donc une règle `interne` de type `username` sans `aliasEmail` est sans effet ici) ;
- lorsque plusieurs sources GitLab existent, la date retenue est **la plus ancienne** des dates de premier commit interne obtenues source par source ;
- une source non GitLab est ignorée ; une source dont le dépôt est vide (`depotVide`, [RG-021](../02_documentation/05_reglesGestion.md#audit-technique-et-anomalies)) est ignorée ; un projet sans aucune source GitLab exploitable produit le statut `non_applicable` ;
- la recherche parcourt `GET /repository/commits` depuis la page la plus ancienne accessible ; elle est bornée à `parametres.audit.borneRecherchePremierCommitPages` pages par source (défaut 50, valeur de repli de `exemple-donnees.json`, décision arbitraire à valider par un humain). Si l'API n'expose pas le nombre total de pages (dépôt volumineux) ou si la fenêtre bornée est épuisée sans correspondance, le statut est `indetermine_trop_de_commits` ;
- si la totalité des commits de la ref a pu être parcourue et qu'aucun commit interne n'est trouvé, le statut est `aucun_membre_interne` ; si aucune règle de statut `interne` n'existe pour le groupe, le statut est `aucune_regle_interne` (aucun appel réseau) ;
- au sein de la fenêtre parcourue, le commit retenu est celui de **date minimale** (et non le premier rencontré) : l'API ne garantit pas un tri strict par date sur toute la profondeur ;
- le résultat, une fois `determine`, est **stable** : il n'est **jamais recalculé automatiquement**. Il n'est recalculé que par le bouton « recalculer » de la Fiche projet (recalcul systématique) ou par la case à cocher du formulaire de campagne (recalcul conditionnel : si absent, statut non `determine`, ou empreinte changée). Un recalcul qui reproduit la valeur stockée (même `date` et même `statut`) **n'entraîne aucune écriture** (pas de RG-002, RG-003, RG-023, ni sauvegarde) ;
- l'empreinte `empreinteReferentiel` est le condensé SHA-256, préfixé `sha256:`, calculé **uniquement côté cœur natif** (commande `empreinteReferentielInterne`), sur une sérialisation stable et triée des règles de membre connu de statut `interne` du groupe (champs `critere`, `typeCritere`, `aliasEmail` — **jamais `partiLe`**) ; un changement d'empreinte déclenche une suggestion discrète de recalcul dans la Fiche projet ;
- les statuts possibles sont : `determine`, `aucune_regle_interne`, `aucun_membre_interne`, `indetermine_trop_de_commits`, `non_applicable`, `depot_vide` (ce dernier lorsque toutes les sources GitLab du projet ont un dépôt vide).

Contenu proposé de **RG-059** :

- cf. décision 4 pour le principe (correspondance exacte de date, raccourci, invite) ;
- lorsque l'audit servant de borne « prise en charge » est un audit historique ([RG-046](../02_documentation/05_reglesGestion.md#audit-technique-et-anomalies)), son périmètre d'indicateurs est structurellement réduit (ni `gitlab.membres`, ni `gitlab.taille_depot`, ni `croise.ia_nouveau_code`, ni métriques « nouveau code ») : le différentiel affiché présente ces indicateurs comme absents côté « prise en charge », ce qui est attendu et non une régression.

Contenu proposé de **RG-061** :

- une règle de membre connu porte un attribut optionnel `partiLe` (date ISO `AAAA-MM-JJ`) indiquant que la personne a quitté l'organisation / le périmètre à cette date ; absent = membre actif ;
- `partiLe` est **indépendant du `statut`** : la personne conserve son statut (`interne`, `client` ou `partenaire`) ; la résolution du statut d'un membre ou contributeur ([RG-006](../02_documentation/05_reglesGestion.md#membres-et-sécurité-des-accès) à [RG-008](../02_documentation/05_reglesGestion.md#membres-et-sécurité-des-accès)) n'est **pas** modifiée par `partiLe` ;
- `partiLe` est **interdit sur une règle de type `domaineEmail`** (un domaine ne « part » pas) : rejet à la saisie côté interface **et** revalidation côté cœur natif ; la date doit être valide et non postérieure au jour de saisie ;
- `partiLe` est **sans effet sur la datation de la prise en charge** (RG-058) et **n'entre pas dans `empreinteReferentiel`** : un membre de statut `interne` est pris en compte que `partiLe` soit renseigné ou non, et le marquer parti ne périme pas un calcul déjà `determine` ;
- l'exploitation de `partiLe` pour signaler un accès résiduel (membre parti figurant encore dans les membres d'un dépôt), la mise en évidence associée sur la Fiche projet et l'alerte correspondante sont **hors périmètre de ce plan** et relèvent de plan_19.

## 4. Partie A — Cœur natif : recherche du premier commit interne

### 4.1 Connecteur GitLab — `src-tauri/src/connecteurs/gitlab.rs`

**Réutiliser la struct existante.** [`ReponseCommit`](../../src-tauri/src/connecteurs/gitlab.rs#L636) porte **déjà** `id`, `committed_date`, `author_email: Option<String>`, `author_name: Option<String>` (comme l'exploite `interroger_contributeurs`). Aucune nouvelle struct de désérialisation n'est nécessaire.

**Lecture du nombre total de pages — helper à écrire.** Le code actuel de pagination (`recuperer_arborescence_recursive`, `gitlab.rs:481`) lit uniquement `x-next-page` (`entete_page_suivante`, `gitlab.rs:454`) ; **aucun utilitaire ne lit `x-total-pages`**. Il faut donc ajouter un petit helper `entete_total_pages(&Response) -> Option<u32>` (sur le modèle exact de `entete_page_suivante`). Point d'attention : l'API GitLab **omet `x-total` / `x-total-pages`** pour les listes dont le total dépasse ~10 000 éléments — cas explicitement dans la cible (« gros dépôts ») ; le helper renvoie alors `None` et l'algorithme bascule sur le repli ci-dessous.

Nouvelle fonction, `pub(crate) async fn rechercher_premier_commit_interne` :

- signature : `(&self, id_externe: &str, ref_auditee: Option<&str>, correspondance: &CorrespondanceInterne, borne_pages: u32) -> Result<ResultatPremierCommitInterne, ErreurConnecteur>` ;
- `CorrespondanceInterne` : structure de travail construite en Partie B à partir des règles `interne` du groupe (ensembles de courriels exacts / alias, ensemble de domaines), avec une méthode `fn correspond(&self, courriel: &str) -> bool` appliquant la précédence de RG-007 restreinte aux canaux d'un commit ;
- `ResultatPremierCommitInterne` : `enum { Trouve { date: String, sha: String, email_auteur: String }, AucunCommitInterne, TropDeCommits, DepotVide }` (`date` = date calendaire UTC `AAAA-MM-JJ`, cf. décision 16) ;
- algorithme :
  1. résoudre la ref effective via [`resoudre_ref_effective`](../../src-tauri/src/connecteurs/gitlab.rs#L742) ; `ErreurConnecteur::DepotVide` → `DepotVide` ;
  2. premier appel `GET /projects/{id}/repository/commits?ref_name={ref}&per_page={TAILLE_PAGE_AUDIT}&page=1`, lire `entete_total_pages` ;
  3. **cas nominal** (`Some(total_pages)`) : soit `depart = total_pages`, `arret = total_pages.saturating_sub(borne_pages) + 1` ; parcourir les pages de `depart` à `arret` décroissant ; `tronquee = arret > 1` ;
  4. **cas de repli** (`None` — en-tête absent, très gros dépôt) : parcourir **vers l'avant** depuis `page = 1`, en s'arrêtant après `borne_pages` pages lues ou à la première page vide ; `tronquee = true` si l'on s'est arrêté sur la borne sans avoir atteint une page vide. (Ce repli inspecte les commits **les plus récents** faute de pouvoir atteindre les plus anciens : il ne trouvera un commit interne que si l'auteur interne le plus ancien a aussi commité récemment — sinon `TropDeCommits`, ce qui est le comportement voulu : « non déterminé sur un dépôt trop volumineux ».) ;
  5. sur l'ensemble des commits parcourus, retenir **tous** ceux dont `author_email` (en minuscules) satisfait `correspondance.correspond(...)`, puis, s'il y en a, retourner `Trouve` pour celui de `committed_date` **minimale** (troncature UTC) — pas de retour anticipé, l'API ne trie pas strictement par date ;
  6. si aucun candidat et `tronquee` : `TropDeCommits` ; sinon `AucunCommitInterne`.
- gestion d'erreurs : même schéma que les autres fonctions de `gitlab.rs` (statuts `401 → AuthentificationRefusee`, `403 → DroitsInsuffisants`, `!is_success → ReponseInattendue`, `erreur_depuis_reqwest` pour le transport ; cf. `gitlab.rs:1100-1114`) ; un `author_email` absent n'est jamais une anomalie (commit ignoré) ; une ref figée (SHA/tag) reste acceptée — la recherche du premier commit garde son sens sur une ref figée, contrairement à un audit historique.

Contraintes transverses : aucune utilisation de `.unwrap()` / `.expect()`, `#![forbid(unsafe_code)]` déjà global, visibilité `pub(crate)` au plus, Rustdoc `///` sur tout élément public.

Tests `#[cfg(test)]` du module (client HTTP simulé, jamais d'appel réseau réel, sur le patron des tests existants de `gitlab.rs`) :

- premier commit interne trouvé sur une page intermédiaire, `x-total-pages` simulé sur 3 pages ;
- **ordre** : parmi plusieurs commits internes de la fenêtre renvoyés dans un ordre non chronologique par le bouchon, le commit retourné est celui de date minimale ;
- **troncature de date** : `committed_date = "2019-09-02T23:30:00.000Z"` → `date = "2019-09-02"` (UTC, pas de bascule de jour) ;
- correspondance par domaine de courriel et par alias, en plus du courriel exact ;
- `author_email` absent : commit ignoré sans erreur ;
- **cas nominal borné** : `total_pages` supérieur à la borne, aucune correspondance dans la fenêtre → `TropDeCommits` ;
- **cas de repli** : `x-total-pages` absent, aucune correspondance dans les `borne_pages` premières pages → `TropDeCommits` ; correspondance dans ces pages → `Trouve` ;
- parcours complet (`total_pages <= borne`) sans correspondance → `AucunCommitInterne` ;
- dépôt vide → `DepotVide` ;
- catégories d'anomalie RG-021 (authentification refusée, droits insuffisants, instance injoignable, délai dépassé, réponse inattendue) propagées.

### 4.2 Module de coordination — `src-tauri/src/persistance/prise_en_charge.rs`

En-tête de mention IA, documentation de module `//!` référençant US-058 et RG-058. Déclaration `pub(crate) mod prise_en_charge;` dans `src-tauri/src/persistance.rs`, en respectant l'ordre alphabétique.

Fonctions (Rustdoc `///`, visibilité `pub(crate)`) :

- `pub(crate) fn empreinte_referentiel_interne(groupe: &Groupe) -> String` : **seule implémentation du condensé** (décision 15). Filtrer `groupe.membres_connus` sur `statut == StatutMembre::Interne`, projeter `(critere, type_critere, alias_email)` (jamais `parti_le`), trier par ce triplet, sérialiser de façon stable (`serde_json::to_vec` d'un `Vec` de tuples déjà trié — pas de dépendance à l'ordre des champs d'une struct), condenser en SHA-256 (`sha2::Sha256`, déjà dépendance — cf. `persistance/kdf.rs`), retourner `format!("sha256:{:x}", condensat)`. Exposée à l'interface par la commande `empreinte_referentiel_interne` (§4.3) ;
- `fn construire_correspondance_interne(groupe: &Groupe) -> CorrespondanceInterne` : construit les ensembles de courriels exacts, d'alias et de domaines à partir des règles `interne`, **sans filtrer sur `parti_le`** ;
- `pub(crate) async fn calculer_prise_en_charge(projet: &Projet, groupe: &Groupe, resolveur_connecteur: ...) -> PremierCommitInterne` :
  1. `empreinte` = `empreinte_referentiel_interne(groupe)` ; `calcule_le` = date du jour (UTC) ; ces deux champs sont portés par **toutes** les variantes du résultat ;
  2. `correspondance` = `construire_correspondance_interne(groupe)` ; si aucune règle `interne` → `AucuneRegleInterne` (aucun appel réseau) ;
  3. filtrer `projet.sources` sur `TypeSource::Gitlab` ; si vide → `NonApplicable` ;
  4. pour chaque source GitLab, appeler `rechercher_premier_commit_interne` ; collecter les `Trouve`, compter les `DepotVide` et les `TropDeCommits` ;
  5. si au moins un `Trouve` → `Determine` avec la **date minimale** (et son SHA / courriel) ;
  6. sinon si toutes les sources GitLab sont `DepotVide` → `DepotVide` ;
  7. sinon si au moins une source a répondu `TropDeCommits` → `IndetermineTropDeCommits` ;
  8. sinon → `AucunMembreInterne`.
- `pub(crate) fn recalcul_necessaire(existant: Option<&PremierCommitInterne>, empreinte_courante: &str) -> bool` : `true` si `existant` est `None`, ou n'est pas la variante `Determine`, ou `existant.empreinte_referentiel != empreinte_courante`. Utilisée par la case à cocher (décision 2) ;
- `pub(crate) fn identique(a: &PremierCommitInterne, b: &PremierCommitInterne) -> bool` : compare `statut` **et** `date` (les autres champs — `calcule_le`, `empreinte_referentiel`, `sha` — sont ignorés) ; sert au « pas d'écriture si inchangé » (décision 6).

Tests `#[cfg(test)]` (connecteur simulé) : date minimale retenue parmi deux sources ; `AucuneRegleInterne` sans règle `interne` **et sans appel réseau** ; `NonApplicable` sans source GitLab ; `DepotVide` si toutes les sources vides ; `IndetermineTropDeCommits` si une source tronquée sans candidat ; `recalcul_necessaire` sensible au changement d'empreinte ; `identique` insensible à `calcule_le` / `empreinte_referentiel` ; un commit d'un interne dont la règle porte `partiLe` date bien la prise en charge.

### 4.3 Commandes de la Façade

Nouveau module de commande dédié `src-tauri/src/commandes/prise_en_charge.rs` (décision 19), cohérent avec `persistance/prise_en_charge.rs`, sur le gabarit de `commandes::purge::previsualiser_purge_densite` et **avec journalisation obligatoire de début / fin** pour chaque commande.

**`calculer_prise_en_charge_projet`** :

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

**`empreinte_referentiel_interne`** (décision 15, source unique de vérité pour l'interface) :

```rust
#[tauri::command]
pub(crate) fn empreinte_referentiel_interne(
    groupe_id: String,
    donnees: DonneesRacine,
) -> Result<String, ErreurFacade> {
    crate::journalisation::consigner_debut_commande("empreinteReferentielInterne");
    let resultat = { /* résolution du groupe, appel de persistance::prise_en_charge::empreinte_referentiel_interne */ };
    crate::journalisation::consigner_fin_commande("empreinteReferentielInterne");
    resultat
}
```

Ces commandes **ne persistent rien** : elles retournent la structure ou le condensé calculés. La persistance (écriture chiffrée, RG-003, RG-002) est déclenchée par le flux appelant côté interface — et **seulement si le résultat diffère de la valeur stockée** (`persistance::prise_en_charge::identique`, décision 6). Les credentials GitLab proviennent exclusivement de la mémoire volatile de session (`EtatSession`), jamais d'un paramètre.

Enregistrement des deux commandes dans `src-tauri/src/lib.rs` (`tauri::generate_handler!`).

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

Seconde méthode `public async empreinteReferentielInterne<TDonnees>(parametres: { groupeId: string; donnees: TDonnees }): Promise<string>` déléguant à `empreinte_referentiel_interne` — c'est la **seule** source d'empreinte côté interface (décision 15) : aucun calcul SHA-256 en TypeScript, aucune sérialisation canonique à maintenir en miroir.

Bouchon : `bouchon-*.utils.ts` renvoie un `PremierCommitInterne` déterministe à partir des données de démonstration (`donnees-racine-bouchon.ts` fournit déjà des valeurs `premierCommitInterne`), avec un délai artificiel fixe (cf. [normes de tests E2E](../../.claude/rules/11-normes-tests.md#tests-de-bout-en-bout)) pour exercer l'indicateur de chargement. Le bouchon d'`empreinteReferentielInterne` renvoie un condensé stable dérivé des règles `interne` de démonstration, qui change quand ces règles changent (pour exercer la suggestion de la Fiche projet).

### 5.2 Formulaire de constitution de campagne

[`constitution-campagne.component.html`](../../src/app/ecrans/audits/constitution-campagne/constitution-campagne.component.html) : nouvelle **carte « Options »** (décision 8), adjacente à la carte « Date d'analyse », portant la case à cocher décochée par défaut :

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

- un appel `empreinteReferentielInterne(groupeId)` (une fois par groupe, mis en cache le temps de la campagne) fournit l'empreinte courante ; le pré-filtre `recalculNecessaire(projet.premierCommitInterne, empreinteCourante)` — logique triviale de comparaison, **sans hash côté interface** — décide si le calcul est utile. S'il ne l'est pas → aucun appel, valeur existante conservée ;
- sinon, un appel `calculerPriseEnChargeProjet` est ajouté au pipeline du projet, **en dehors** du périmètre d'indicateurs d'audit (il n'alimente pas un `ResultatAudit`) ;
- le résultat n'est retenu dans la facette de brouillon `prisesEnCharge?: Record<projetId, PremierCommitInterne>` **que s'il diffère** de la valeur stockée (`statut` ou `date` différents) ; un résultat identique est ignoré (décision 6) ;
- **échec absorbé par projet** : une anomalie sur le calcul de prise en charge n'échoue jamais la campagne ni l'audit du projet (même principe que RG-046 / RG-021) ; l'anomalie est consignée dans le rapport d'anomalies du brouillon avec une catégorie claire.

### 5.4 Intégration du brouillon

Le flux d'intégration du brouillon (écran Brouillon → `DonneesApplicationService`) applique les entrées de `prisesEnCharge` du brouillon aux `Projet` correspondants **au même moment** que l'intégration des audits, dans la même sauvegarde chiffrée. Comme la facette ne contient que des résultats effectivement différents (§5.3), **chaque entrée appliquée** donne lieu à une entrée de journal ([RG-023](../02_documentation/05_reglesGestion.md#seuils-référentiels-et-historisation)) : « date de prise en charge du projet X : AAAA-MM-JJ (statut) » (décision 7).

Le rejet du brouillon abandonne aussi les `prisesEnCharge` (aucune application partielle).

## 6. Partie C — Fiche projet : affichage, recalcul et suggestion

[`fiche-projet.component.ts`](../../src/app/ecrans/fiche-projet/fiche-projet.component.ts) — la métadonnée « Âge chez nous » ([ligne 1106](../../src/app/ecrans/fiche-projet/fiche-projet.component.ts#L1106)) est déjà câblée sur `projet.premierCommitInterne`. Évolutions :

1. **Libellés de statut.** `construireAgeChezNousLabel` distingue les six statuts : `determine` → libellé actuel (`N ans (depuis AAAA-MM-JJ)`) ; `aucune_regle_interne` → « aucun membre interne qualifié pour ce groupe » ; `aucun_membre_interne` → « aucun commit interne trouvé » ; `indetermine_trop_de_commits` → « non déterminé (dépôt trop volumineux) » ; `non_applicable` → « — (aucune source GitLab) » ; `depot_vide` → « — (dépôt vide) » ; absent → « non calculée ».
2. **Bouton « recalculer ».** À côté de la métadonnée, un bouton discret déclenche `calculerPriseEnChargeProjet` pour ce seul projet (recalcul **systématique**, ignore le pré-filtre). Indicateur de chargement pendant l'appel. **Si le résultat est identique à la valeur stockée** (même `statut`, même `date`) : aucune écriture, notification « date de prise en charge inchangée » (décision 6). **Sinon** : confirmation de mot de passe (RG-002), sauvegarde, notification de succès. Erreur → `NotificationService.erreur`.
3. **Suggestion discrète sur empreinte périmée.** À l'ouverture de la fiche, un appel `empreinteReferentielInterne(groupeId)` fournit l'empreinte courante ; si elle diffère de `premierCommitInterne.empreinteReferentiel`, afficher une mention discrète « les membres internes ont changé depuis ce calcul » à côté du bouton (exigence F17). Aucun calcul de hash côté interface (décision 15).
4. **Export PNG.** La métadonnée fait déjà partie de la fiche exportée ; le bouton « recalculer » et la mention de suggestion sont masqués à l'export (comme les autres contrôles interactifs).

## 7. Partie D — Comparaison d'audits : repère « prise en charge »

[`comparaison-audits.component.ts`](../../src/app/ecrans/comparaison-audits/comparaison-audits.component.ts) — le calcul du différentiel (`DifferentielAuditsUtils`) **n'est pas modifié** : un audit « prise en charge » est un audit du projet comme un autre, simplement mis en évidence.

1. **Marquage dans les sélecteurs.** `construireOptions` ([ligne 440](../../src/app/ecrans/comparaison-audits/comparaison-audits.component.ts#L440)) : si `projet.premierCommitInterne?.statut === 'determine'` et qu'un audit porte `audit.date === premierCommitInterne.date`, suffixer son libellé « (prise en charge) » (cumulable avec « (historique) »).
2. **Nouveau raccourci `priseEnCharge`.** Ajouté à `RaccourciComparaisonAudits`. `resoudreRaccourci` : borne gauche = l'audit dont la date correspond exactement à la prise en charge ; borne droite = le dernier audit régulier. Le raccourci n'est proposé (bouton actif) que si cet audit existe.
3. **Invite en l'absence d'audit.** Si `premierCommitInterne.statut === 'determine'` mais qu'aucun audit ne porte cette date exacte, le bouton du raccourci est **désactivé** et accompagné d'un texte d'aide : « Aucun audit à la date de prise en charge (AAAA-MM-JJ). Lancez une campagne historique ciblant cette date pour rendre la comparaison possible. » avec lien vers le formulaire de constitution de campagne. L'application ne crée jamais l'audit historique automatiquement (décision 4).
4. **Rappel des annotations de l'intervalle** : inchangé (le volet existant couvre déjà tout intervalle entre deux dates d'audit).
5. **Audit historique partiel (RG-059, M8).** L'audit servant de borne « prise en charge » est le plus souvent un audit historique (RG-046), au périmètre d'indicateurs réduit. Le différentiel affichera donc `gitlab.membres`, `gitlab.taille_depot`, `croise.ia_nouveau_code` et les métriques « nouveau code » comme absents côté gauche : c'est attendu, pas une régression. Une phrase d'avertissement discrète est ajoutée au-dessus du différentiel quand la borne gauche est un audit historique sélectionné via ce raccourci.

## 8. Partie E — Membres internes partis : attribut `partiLe`

Périmètre de cette partie : ajouter le champ, permettre sa saisie, garantir qu'il n'altère rien d'existant. L'audit d'accès est renvoyé à plan_19 (décision 10).

### 8.1 Modèle

- `src-tauri/src/modele/racine.rs`, `struct MembreConnu` : nouveau champ `#[serde(default, skip_serializing_if = "Option::is_none")] pub(crate) parti_le: Option<String>` (date ISO `AAAA-MM-JJ`), avec Rustdoc référençant RG-061. Champ additif optionnel (un fichier antérieur sans le champ se désérialise en `None`). Ce plan **incrémente `VERSION_SCHEMA_COURANTE`** et ajoute **un seul** palier de migration à transformation nulle couvrant à la fois ce champ et le changement de forme de `PremierCommitInterne` (décision 13) ; la valeur exacte du palier et le nom de la fonction (`migration_N_vers_N+1`) sont fixés à l'implémentation selon l'ordre d'intégration vis-à-vis de `plan_17` chapitre 4, qui incrémente lui aussi — sans trou ni valeur codée d'avance dans l'un ou l'autre plan.
- `src/app/services/avecetat/etat/types-donnees.ts`, interface `MembreConnu` : `readonly partiLe?: string;`.
- `src/app/services/sansetat/jugement/statut-membre.utils.ts`, `RegleMembreConnu<TStatut>` : **inchangé** — vérifié, la résolution ne lit que `critere` / `typeCritere` / `statut` / `aliasEmail`. `partiLe` n'y entre pas ; un commentaire explicite le signale pour éviter qu'une relecture future croie à un oubli.

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
- **Signature à étendre (constat de relecture B3).** `qualifier_membre` (`src-tauri/src/commandes/administration.rs:76`), `persistance::administration::qualifier_membre` et `EntreeQualificationMembre` (chemin batch `qualifier_membres`) prennent des **champs à plat**, pas un objet `MembreConnu`. Ajouter un paramètre `parti_le: Option<String>` sur ces trois points, sur la Façade TS (`facade-administration.service.ts`) et sur le bouchon. Le nom `parti_le` / `partiLe` est une **décision de nommage arbitraire à valider par un humain** (par symétrie avec `alias_email` / la [convention de nommage](../../.claude/rules/09-normes-developpement.md#conventions-de-nommage)). Cela allonge une liste déjà sous dérogation `clippy::too_many_arguments` — acceptable, à confirmer en relecture.
- **Revalidation côté cœur natif** : date parsable, non future, absente si `type_critere == DomaineEmail` → sinon `ErreurFacade` typée ([norme sécurité, revalidation systématique](../../.claude/rules/10-normes-securite.md#entrées-et-sorties)).

### 8.3 Affichage — liste des règles d'administration

Ligne de règle (`membres-connus-admin__ligne`) : quand `regle.partiLe` est renseigné, ajouter après le `statut` une mention discrète `· parti le {{ regle.partiLe | date:'dd/MM/yyyy' }}` en texte atténué (classe `texte-discret texte-sm`). Aucune autre mise en forme (pas de couleur d'alerte : l'anomalie « a encore accès » se juge sur la Fiche projet, plan_19).

### 8.4 Prise en compte dans la datation

`construire_correspondance_interne` (§4.2) itère `groupe.membres_connus` filtrés sur `statut == StatutMembre::Interne` **sans filtrer sur `parti_le`** : un interne parti est donc naturellement inclus dans `CorrespondanceInterne`. L'empreinte `empreinteReferentiel` (§3, RG-058) reste calculée sur `(critere, type_critere, alias_email)` et **n'inclut pas `parti_le`** : marquer un interne comme parti ne périme pas le calcul de prise en charge (comportement voulu — la datation ne change pas).

### 8.5 Raccourci « Marquer comme parti » depuis la Fiche projet

Retenu dans ce plan (décision 10). Cohérent avec le lien « Qualifier ce membre » déjà présent sur la ligne d'un membre inconnu (`fiche-projet.component.html`, gabarit `ligneMembre`) : sur la ligne d'un membre `interne` **dont le statut est résolu contre une règle de type `username` ou `email`** (pas `domaineEmail`), un lien « Marquer comme parti » ouvrant l'écran d'administration pré-filtré sur cette règle, `partiLe` pré-rempli à la date du jour, laissé à ajuster puis à enregistrer. Réutilise le mécanisme de `queryParamsQualification` déjà en place. Aucune mise en évidence d'accès résiduel n'est ajoutée ici (plan_19).

### 8.6 Colonne `partiLe` dans la saisie en masse

Retenu dans ce plan (décision 10). La modale tabulaire de qualification en masse ([RG-041](../02_documentation/05_reglesGestion.md#membres-et-sécurité-des-accès), `saisie-masse-membres.utils.ts`) reçoit une colonne optionnelle `partiLe` : vide par défaut, validée par ligne selon les mêmes règles qu'au §8.2 (date valide, non future, refusée sur une ligne de critère `domaineEmail`). Le caractère strictement additif de RG-041 est préservé : une ligne dont le critère correspond à une règle existante reste rejetée, `partiLe` ne permet pas de « mettre à jour » une règle déjà enregistrée. La commande batch `qualifier_membres` transporte `parti_le` par entrée (cf. §8.2).

## 9. Impacts sur le modèle de données et migration

- Le champ `Projet.premierCommitInterne` existe déjà ([`racine.rs:404`](../../src-tauri/src/modele/racine.rs#L404), [`types-donnees.ts:340`](../../src/app/services/avecetat/etat/types-donnees.ts#L340)), optionnel avec `skip_serializing_if` : un fichier antérieur sans le champ se désérialise en « absent », sans traitement particulier.
- **Forme retenue (décision 13) : `statut` en `enum` interne-taggé.** `#[serde(tag = "statut", rename_all = "snake_case")]`, variante `Determine { date, sha, email_auteur }` + variantes sans données (`AucuneRegleInterne`, `AucunMembreInterne`, `IndetermineTropDeCommits`, `NonApplicable`, `DepotVide`). `calculeLe` et `empreinteReferentiel` restent hors de l'enum, toujours renseignés (via `#[serde(flatten)]` sur une struct englobante, ou une struct plate portant l'enum en `#[serde(flatten)]` — **à prototyper tôt**, `serde` ayant des limites connues sur `flatten` combiné à un enum interne-taggé).
- **Incrément de `VERSION_SCHEMA_COURANTE` (révision du 2026-09-02).** Aucune transformation de donnée n'est nécessaire (toutes les valeurs `premierCommitInterne` écrites à ce jour sont `statut: "determine"` avec données complètes, et la variante `Determine` sérialise à l'identique de la forme plate actuelle ; les autres statuts n'ont jamais été persistés ; le champ `partiLe` est additif). Conformément à la convention du projet pour tout changement de forme du schéma, `VERSION_SCHEMA_COURANTE` **est incrémentée** et **un seul** palier de migration à transformation nulle est ajouté à `ETAPES_MIGRATION_REELLES`, couvrant l'enum `PremierCommitInterne` et le champ `partiLe`. La **valeur exacte du palier n'est pas fixée par ce plan** (elle dépend de l'ordre d'intégration vis-à-vis de `plan_17` chapitre 4, qui incrémente aussi ; celui qui passe en second prend le palier suivant, sans trou). Un **test de non-régression de désérialisation** de l'ancienne forme plate est ajouté dans `persistance/` (charge un fragment JSON `{"statut":"determine","date":…,"sha":…,"emailAuteur":…,"calculeLe":…,"empreinteReferentiel":…}` et vérifie qu'il produit la variante `Determine` attendue).
- Le type TS `PremierCommitInterne` devient une union discriminée sur `statut` ; l'affichage de la Fiche projet et le jeu d'exemple `exemple-donnees.json` sont adaptés (les valeurs existantes, toutes `determine`, restent inchangées à l'octet près).
- **Structure de brouillon de campagne** : nouvelle propriété `prisesEnCharge?: Record<string, PremierCommitInterne>` (côté cœur natif et TS), optionnelle, absente = brouillon sans calcul de prise en charge. À décrire dans [`12_modeleDonnees.md`](../02_documentation/12_modeleDonnees.md).
- `parametres.audit.borneRecherchePremierCommitPages` : déjà dans le modèle (`Option<u32>`), valeur de repli 50 documentée au plus près de la constante ([norme 09](../../.claude/rules/09-normes-developpement.md#structure-et-nommage)) et signalée comme décision arbitraire à valider.
- **`MembreConnu.partiLe`** : nouveau champ optionnel `Option<String>` (date ISO), additif — absent = membre actif ; couvert par le même palier de migration à transformation nulle que l'enum `PremierCommitInterne` (cf. §8.1, pas de fonction de migration dédiée). Donnée personnelle : même traitement que les autres champs de `MembreConnu` (vit dans `groupes`, chiffré au repos, exclu de l'export en clair).

## 10. Impacts documentaires

| document | modification |
|---|---|
| [`01_besoin/Specification.md`](../01_besoin/Specification.md) §5.17 F17 **et ligne 143** | remplacer partout le déclencheur « à la première liaison d'une source GitLab (repli : premier audit) » par « à la demande : case à cocher du formulaire de campagne (décochée par défaut, recalcul conditionnel) et bouton “recalculer” de la Fiche projet » ; énoncer les **six** statuts ; préciser « plus ancienne date parmi les sources GitLab » et « date calendaire UTC » ; mentionner l'attribut `partiLe` (départ documenté d'un interne, sans effet sur la datation ; exploitation d'accès renvoyée à plan_19). La ligne 143 (« À la première liaison d'une source GitLab […] l'application calcule la date du premier commit interne ») est corrigée en même temps. |
| [`02_documentation/04_casUsage.md`](../02_documentation/04_casUsage.md) | ajouter US-058 (calcul à la demande depuis la campagne / la Fiche projet), US-059 (comparaison depuis la prise en charge), US-061 (renseigner `partiLe`) ; compléter les critères d'acceptation d'US-017 (Fiche projet : bouton recalculer, six libellés de statut, suggestion sur empreinte, recalcul inchangé sans écriture) et de l'US de constitution de campagne (case à cocher) |
| [`02_documentation/05_reglesGestion.md`](../02_documentation/05_reglesGestion.md) | ajouter RG-058, RG-059 et RG-061 (contenus §3) ; rattacher RG-058 aux écrans « Constitution de campagne », « Fiche projet », « Brouillon », RG-061 à « Administration (Membres connus) » ; référencer RG-006 à RG-008, RG-021, RG-023, RG-046 |
| [`02_documentation/12_modeleDonnees.md`](../02_documentation/12_modeleDonnees.md) | forme finale de `premierCommitInterne` (enum interne-taggé sur `statut`, six variantes) ; **`versionSchema` incrémentée + un palier de migration à transformation nulle** (valeur exacte non fixée, coordination `plan_17` chapitre 4) ; ajouter `brouillon.prisesEnCharge` ; ajouter `MembreConnu.partiLe` (optionnel, date) |
| [`02_documentation/13_conceptionDetaillee.md`](../02_documentation/13_conceptionDetaillee.md) | nouveau module `connecteurs/gitlab::rechercher_premier_commit_interne` (helper `entete_total_pages`, algorithme nominal + repli), module `persistance/prise_en_charge`, commandes `calculerPriseEnChargeProjet` et `empreinteReferentielInterne` ; séquence « Calculer la date de prise en charge » ; valeur `priseEnCharge` de `RaccourciComparaisonAudits` ; bouton « recalculer » de la Fiche projet ; champ `partiLe` et sa validation (UI + revalidation cœur natif) ; nouveau paramètre `parti_le` des commandes `qualifier_membre` / `qualifier_membres` |
| [`02_documentation/15_normesSecurite.md`](../02_documentation/15_normesSecurite.md) | rappeler que `emailAuteur` (donnée personnelle) n'est jamais journalisé et reste exclu de l'export en clair ; documenter la forme exacte de l'empreinte (préfixe `sha256:`, champs couverts `critere`/`typeCritere`/`aliasEmail`, tri, calcul cœur natif uniquement) ; `partiLe` = donnée personnelle supplémentaire, même traitement |
| [`02_documentation/09_maquettes.md`](../02_documentation/09_maquettes.md) | Fiche projet : métadonnée « Âge chez nous » enrichie (bouton, statuts) ; Administration Membres connus : champ « Parti le » ; modale de saisie en masse : colonne « Parti le » |
| [`02_documentation/08_arborescenceNavigation.md`](../02_documentation/08_arborescenceNavigation.md) | compléter la matrice écrans × US pour US-058 / US-059 / US-061 (Constitution de campagne, Fiche projet, Comparaison d'audits, Administration Membres connus) |
| [`02_documentation/16_normesTests.md`](../02_documentation/16_normesTests.md) | ajouter les cas de test de la Partie A (date minimale, borne nominale et repli sans en-tête, troncature de date, `aucune_regle_interne` / `aucun_membre_interne`, dépôt vide) à la matrice de traçabilité ; parcours E2E : cocher la case en campagne et vérifier l'affichage en Fiche projet |
| [`guide-utilisateur.md`](../guide-utilisateur.md) | courte section « Date de prise en charge » (à quoi elle sert, comment la calculer, pourquoi qualifier les membres d'abord) ; capture régénérée |

## 11. Impacts sur les tests

**Cœur natif (`cargo test`, seuil 80 %)** — cf. listes détaillées des §4.1 et §4.2. Points saillants :

- connecteur : cas nominal borné (`x-total-pages` présent), **cas de repli** (`x-total-pages` absent → parcours avant borné), date minimale retenue parmi plusieurs candidats non triés, troncature UTC de `committed_date`, correspondance courriel exact / alias / domaine, `author_email` absent ignoré, `TropDeCommits` dans les deux régimes, dépôt vide, catégories d'anomalie RG-021 ;
- module de coordination : date minimale parmi deux sources, `AucuneRegleInterne` **sans appel réseau**, `NonApplicable`, `AucunMembreInterne`, `DepotVide`, `IndetermineTropDeCommits`, `recalcul_necessaire` sensible à l'empreinte, `identique` insensible à `calcule_le` / `empreinte_referentiel` ;
- empreinte : stabilité (même ensemble de règles dans un ordre différent → même condensé), sensibilité (ajout / retrait d'une règle `interne` → condensé différent), invariance vis-à-vis des règles non `interne` **et de `partiLe`** ;
- désérialisation : un fragment `premierCommitInterne` de l'ancienne forme plate (`statut: "determine"`) produit la variante `Determine` (non-régression, décision 13) ;
- `partiLe` : désérialisation d'un `MembreConnu` avec / sans `partiLe` ; revalidation des commandes `qualifier_membre` / `qualifier_membres` (date invalide, date future, `partiLe` sur `DomaineEmail` → `ErreurFacade`) ; `construire_correspondance_interne` inclut un interne parti ; un commit d'un interne parti date bien la prise en charge.

**Interface (`npm test`, Jest)** :

- pré-filtre `recalculNecessaire` côté interface : comparaison triviale (`None` / statut ≠ `determine` / empreinte ≠) — **pas de test de parité de hash** (le condensé n'est plus calculé en TS) ;
- `constitution-campagne.component` : la case transmet l'option à l'orchestrateur ; décochée par défaut ;
- `fiche-projet.component` : les six libellés de statut ; recalcul **avec** changement → confirmation de mot de passe puis sauvegarde ; recalcul **sans** changement → notification « inchangée », aucune confirmation ni sauvegarde ; mention de suggestion visible seulement si `empreinteReferentielInterne` diffère ; contrôles masqués à l'export PNG (couverture par fonctions) ;
- `comparaison-audits.component` : marquage « (prise en charge) » sur l'audit de date correspondante ; raccourci actif seulement si l'audit existe ; invite + lien sinon ; avertissement « audit historique partiel » quand la borne gauche est historique ; différentiel inchangé ;
- `membres-connus-admin.component` : champ « Parti le » désactivé et vidé sur `domaineEmail` ; rejet d'une date future ; rejet sur règle domaine ; mention « parti le … » dans la ligne ; colonne « Parti le » de la modale de saisie en masse (validation par ligne) ;
- `statut-membre.utils` : un membre dont la règle porte `partiLe` conserve exactement le même statut résolu (non-régression explicite).

**E2E (`npm run test:e2e`, Playwright, bouchon TS)** : étendre le parcours unique — après la campagne, cocher la case « calculer la date de prise en charge », intégrer le brouillon, ouvrir la Fiche projet et vérifier « Âge chez nous », relancer le bouton « recalculer » et vérifier la notification « inchangée », puis ouvrir la Comparaison d'audits et vérifier le marquage / l'invite. Le bouchon fournit un `premierCommitInterne` déterministe avec délai artificiel.

**Matrice de traçabilité** : vérification croisée refaite (règle générale n°13) — chaque nouveau module / composant couvert par au moins un test ; RG-058, RG-059 et RG-061 reliées à au moins un test ; aucun impact sur les tests de charge (le calcul de prise en charge n'est pas une exigence de performance chiffrée, exclusion à noter).

## 12. Découpage en incréments

1. **Connecteur GitLab** : helper `entete_total_pages`, `rechercher_premier_commit_interne` (algorithme nominal + repli), `CorrespondanceInterne`, réutilisation de `ReponseCommit`, tests simulés (dont cas de repli et troncature de date). Aucun impact fonctionnel visible.
2. **Attribut `partiLe` et forme `enum` de `PremierCommitInterne`** : champ modèle (`MembreConnu.parti_le` / `partiLe`), refonte de `PremierCommitInterne` en `enum` interne-taggé (décision 13, prototypage `serde` préalable), **incrément de `VERSION_SCHEMA_COURANTE` + palier de migration unique à transformation nulle** (valeur fixée selon l'ordre d'intégration avec `plan_17` chapitre 4), test de non-régression de désérialisation de l'ancienne forme plate ; **paramètre `parti_le` des commandes `qualifier_membre` / `qualifier_membres`** (à valider en relecture, cf. §8.2), formulaire d'administration (saisie, désactivation sur `domaineEmail`, validation UI + revalidation cœur natif), marqueur de liste, colonne de saisie en masse, tests. Prérequis de l'inclusion dans `CorrespondanceInterne` (incrément 3).
3. **Module de coordination + commandes de Façade** : `persistance/prise_en_charge.rs` (`empreinte_referentiel_interne`, `calculer_prise_en_charge`, `recalcul_necessaire`, `identique`), commandes `calculer_prise_en_charge_projet` et `empreinte_referentiel_interne`, enregistrement `lib.rs`, journalisation début / fin, test « un interne parti date la prise en charge ».
4. **Façade TS + bouchon** : méthodes `calculerPriseEnChargeProjet` et `empreinteReferentielInterne` génériques, bouchons déterministes, pré-filtre `recalculNecessaire` côté interface (comparaison triviale, sans hash).
5. **Fiche projet** : six libellés de statut, bouton « recalculer » (écriture conditionnelle, décision 6), suggestion sur empreinte périmée via `empreinteReferentielInterne`. Premier incrément à valeur utilisateur visible (voie unitaire complète).
6. **Campagne** : carte « Options », case à cocher, propagation à l'orchestrateur, `brouillon.prisesEnCharge` (entrées différentes seulement), intégration / rejet du brouillon, une entrée de journal par projet modifié, dégradation par projet. Voie de masse complète.
7. **Comparaison d'audits** : marquage « (prise en charge) », raccourci `priseEnCharge`, invite en l'absence d'audit, avertissement « audit historique partiel » (US-059, RG-059).
8. **Documentation utilisateur + captures + revue croisée finale** de la matrice de traçabilité.

Chaque incrément : auto-revue + revue assistée par l'IA en contexte isolé, exécution / test réel avant validation, pas de passage à l'incrément suivant sans validation humaine explicite.

## 13. Vérification de bout en bout

Séquence de recette manuelle, sur `npm start` (bouchon TS) puis, pour la partie connecteur, sur une vraie instance GitLab via les tests d'intégration `#[ignore]` (`SQM_TEST_GITLAB_*`) :

1. groupe sans règle `interne` → case cochée en campagne → Fiche projet affiche « aucun membre interne qualifié pour ce groupe » (`aucune_regle_interne`), **aucun appel réseau** (journal) ;
2. qualifier un membre `interne` dont le domaine couvre l'auteur du plus ancien commit → recalculer depuis la Fiche projet → date attendue, statut `determine`, `calculeLe` = aujourd'hui, confirmation de mot de passe demandée puis sauvegarde ;
3. recliquer « recalculer » sans rien changer → notification « date de prise en charge inchangée », **aucune** confirmation de mot de passe, **aucune** entrée de journal (décision 6) ;
4. projet à deux sources GitLab d'âges différents → la date retenue est celle de la source la plus ancienne ;
5. projet sans source GitLab → « — (aucune source GitLab) » ;
6. modifier une règle `interne` → la Fiche projet affiche la suggestion « les membres internes ont changé » ; relancer une campagne avec la case cochée → seuls les projets non à jour sont recalculés, et parmi eux seuls ceux dont le résultat change produisent une entrée de journal ;
7. lancer une campagne historique ciblant exactement la date de prise en charge → l'audit produit apparaît « (prise en charge) » dans la Comparaison d'audits, le raccourci devient actif et sélectionne cet audit contre le dernier audit régulier ; un avertissement « audit historique partiel » s'affiche au-dessus du différentiel ;
8. sans cet audit → le raccourci est désactivé avec l'invite et le lien vers la constitution de campagne ;
9. export PNG de la Fiche projet → la métadonnée est présente, le bouton et la suggestion sont absents ;
10. renseigner `partiLe` sur la règle `interne` de l'auteur du plus ancien commit, à une date postérieure à ce commit → recalculer : la date **ne change pas** (donc pas d'écriture non plus) ; la ligne de la règle affiche « parti le … » en Administration ; aucune mise en évidence d'accès sur la Fiche projet (attendu — c'est plan_19) ;
11. tenter `partiLe` sur une règle `domaineEmail` → refus à la saisie et refus côté cœur natif ; tenter une date future → refus ;
12. **sur une vraie instance** (`SQM_TEST_GITLAB_*`) : un dépôt de plus de 10 000 commits sans en-tête `x-total-pages` → statut `indetermine_trop_de_commits` si l'auteur interne le plus ancien n'a pas commité récemment, `determine` sinon.

## 14. Points restant ouverts

1. **Plan_19 — audit d'accès des membres partis.** À créer : exploitation de `partiLe` pour signaler qu'un membre parti figure encore dans `GET /projects/:id/members/all` (badge d'en-tête de la Fiche projet, mise en évidence de la ligne, décompte par section, nouvelle catégorie d'alerte de la famille RG-006), et éventuel repère des commits postérieurs à `partiLe`. Touche l'indicateur `gitlab.membres`, la logique de gravité et l'écran des alertes — donc hors de ce plan.
2. **Prototypage de la forme `enum` interne-taggé + champs frères** (décision 13) : à faire dès l'incrément 3 ; s'il apparaît qu'aucune forme rétro-compatible n'est atteignable avec `serde`, revenir vers l'utilisateur (le palier de migration, déjà prévu, devrait alors porter une transformation réelle des données au lieu d'être à transformation nulle).
3. **Repli sur dépôt volumineux** (§4.1, cas `x-total-pages` absent) : le parcours avant borné n'inspecte que les commits récents. À valider sur de vrais gros dépôts que le comportement `indetermine_trop_de_commits` est acceptable, ou décider d'une stratégie de parcours arrière par `page = total estimé` (l'API accepte un numéro de page arbitraire et renvoie une page vide au-delà).
4. **Contributeurs non membres** : F17 mentionne la détection des « contributeurs non membres et non reconnus » ; hors périmètre de ce plan (qui ne traite que du premier commit `interne`), à confirmer.
5. **Numéros d'identifiants** : `US-058/059/061` et `RG-058/059/061` restent à figer au moment de la qualification, après recensement croisé avec `plan_16` Étape 25 et `plan_17` chapitres 3 à 5 (cf. §3).

Points tranchés les 2026-09-01 et 2026-09-02, reportés dans les décisions actées §2 : déclenchement explicite (1), recalcul « si absent ou obsolète » (2), affichage Fiche projet (3), comparaison sur audit de date exacte (4), borne 50 pages (5), pas d'écriture si recalcul inchangé (6), une entrée de journal par projet modifié (7), carte « Options » (8), message d'aide sur la qualification par courriel/domaine (9), attribut `partiLe` — pas de nouveau statut — avec raccourci Fiche projet et colonne de saisie en masse dans ce plan, audit d'accès renvoyé à plan_19 (10), `partiLe` hors empreinte (11), priorités Should pour US-058/059/061 (12), `enum` interne-taggé avec incrément de `versionSchema` et palier de migration à transformation nulle — valeur non fixée, coordonnée avec `plan_17` chapitre 4 — (13, révisé le 2026-09-02), statut `aucune_regle_interne` distinct (14), empreinte calculée uniquement côté Rust (15), format de date calendaire UTC (16), module `commandes/prise_en_charge.rs` (19), nom du fichier de plan conservé.
