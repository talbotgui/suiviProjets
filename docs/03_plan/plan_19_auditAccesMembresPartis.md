<!-- Document rédigé avec l'assistance de l'IA (Claude Code), conformément à la mention d'origine requise par docs/02_documentation/01_modalitesUsageEtConventions.md. Plan de conception établi à partir d'une demande utilisateur explicite (2026-09-10) ; il précède la mise à jour des documents normatifs et tout développement, qui restent conditionnés à une validation humaine explicite. -->

# Conception — Audit d'accès des membres partis (accès résiduel, achèvement de F17)

## Statut du document

Ce document décrit l'exploitation de l'attribut `partiLe` d'une règle de membre connu ([RG-061](../02_documentation/05_reglesGestion.md#membres-et-sécurité-des-accès)), posé par [plan_18_datePriseEnCharge.md](./plan_18_datePriseEnCharge.md), pour **signaler qu'une personne ayant quitté l'organisation figure encore parmi les membres d'un dépôt** au dernier audit régulier d'un projet. Ce besoin était explicitement renvoyé à un plan ultérieur par plan_18 ([§14, point 1](./plan_18_datePriseEnCharge.md), [RG-061](../02_documentation/05_reglesGestion.md#membres-et-sécurité-des-accès), [US-061](../02_documentation/04_casUsage.md#cas-dusage--user-stories)) et par le numéro `plan_19` laissé libre à cet effet ([plan_20, §1 du Statut du document](./plan_20_triMembresConnusEtDatesCalendaires.md)).

Le calcul de la date de prise en charge (premier commit interne) livré par plan_18 est le versant « depuis quand un interne travaille sur ce projet » de [F17](../01_besoin/Specification.md#517-f17--surveillance-des-membres-et-premier-commit-interne) ; le présent plan en est le versant « une personne partie a-t-elle encore accès », complémentaire de la détection de membre `inconnu` déjà en place ([RG-006](../02_documentation/05_reglesGestion.md#membres-et-sécurité-des-accès), [RG-009](../02_documentation/05_reglesGestion.md#membres-et-sécurité-des-accès), [RG-010](../02_documentation/05_reglesGestion.md#membres-et-sécurité-des-accès)).

Comme `plan_16_navigationFiltrageEtVues.md`, `plan_17_metriquesVolumetrie.md`, `plan_18_datePriseEnCharge.md` et `plan_20_triMembresConnusEtDatesCalendaires.md`, ce fichier est une exception à la règle générale (les évolutions postérieures à la Phase 15 sont normalement tracées sous forme d'entrées « Étape N » du [rapport de développement](../04_rapports/rapportDeDeveloppement.md)) : son emplacement et son nom restent à ajuster si besoin.

Statut : ce plan précède la mise à jour des documents normatifs et tout développement, qui restent conditionnés à une validation humaine explicite. La méthode du projet s'applique : arbitrage humain, puis mise à jour des documents normatifs, puis développement, sans passage à l'étape suivante sans validation explicite de la précédente.

## Sommaire

1. [Objet](#1-objet)
2. [Décisions actées](#2-décisions-actées)
3. [Périmètre et identifiants d'exigence proposés](#3-périmètre-et-identifiants-dexigence-proposés)
4. [Détection de l'accès résiduel](#4-détection-de-laccès-résiduel)
5. [Fiche projet — badge, mise en évidence et décompte](#5-fiche-projet--badge-mise-en-évidence-et-décompte)
6. [Liste de travail et Accueil — nouvelle cause d'alerte](#6-liste-de-travail-et-accueil--nouvelle-cause-dalerte)
7. [Impacts sur le modèle de données et migration](#7-impacts-sur-le-modèle-de-données-et-migration)
8. [Impacts documentaires](#8-impacts-documentaires)
9. [Impacts sur les tests](#9-impacts-sur-les-tests)
10. [Découpage en incréments](#10-découpage-en-incréments)
11. [Vérification de bout en bout](#11-vérification-de-bout-en-bout)
12. [Points restant ouverts](#12-points-restant-ouverts)

## 1. Objet

Quand une personne quitte l'organisation, son compte GitLab devrait perdre l'accès aux dépôts. En pratique, la révocation est parfois oubliée. L'application dispose désormais de la date de départ d'un membre connu (`partiLe`, [RG-061](../02_documentation/05_reglesGestion.md#membres-et-sécurité-des-accès)) et, à chaque audit, de la liste des membres de chaque dépôt (`gitlab.membres`, [F17](../01_besoin/Specification.md#517-f17--surveillance-des-membres-et-premier-commit-interne)). Le croisement des deux permet de signaler, sans aucun appel réseau nouveau, qu'un membre connu portant une date de départ figure encore parmi les membres exposés par le dernier audit régulier d'un projet — un **accès résiduel**.

Ce signal est distinct de la détection de membre `inconnu` : un membre parti reste `interne`, `client` ou `partenaire` (son statut n'est pas modifié par `partiLe`, [RG-061](../02_documentation/05_reglesGestion.md#membres-et-sécurité-des-accès)), il est donc aujourd'hui affiché sans aucune mise en garde. L'accès résiduel se matérialise :

- sur la **Fiche projet** ([F12](../01_besoin/Specification.md#512-f12--fiche-projet-écran-de-détail)) : un badge d'en-tête, la mise en évidence de la ligne du membre concerné dans la ventilation des membres du dépôt (US-017), et un décompte dans la barre de titre de la section repliable qui le contient ;
- sur la **Liste de travail** ([F15](../01_besoin/Specification.md#515-f15--liste-de-travail-et-suivi-des-alertes)) et l'encart « alertes non traitées » de l'**Accueil** ([F01](../01_besoin/Specification.md#51-f01--gestion-du-fichier-de-données), [US-005](../02_documentation/04_casUsage.md#cas-dusage--user-stories)) : une nouvelle catégorie de cause d'alerte, avec le cycle de traitement vu / traité déjà en place ([RG-026](../02_documentation/05_reglesGestion.md#vues-alertes-export-et-import)).

Le présent plan ne traite que l'accès résiduel constaté via la liste des membres du dépôt. Les deux prolongements naturels — repérer les **commits** d'un membre postérieurs à son départ, et exploiter le canal « auteurs de commits » pour signaler les **contributeurs non membres et non reconnus** ([F17](../01_besoin/Specification.md#517-f17--surveillance-des-membres-et-premier-commit-interne)) — sont **hors périmètre** (décision 1), faute d'être calculables sans nouvel appel réseau ; ils sont recensés en [§12](#12-points-restant-ouverts).

## 2. Décisions actées

Décisions prises par l'utilisateur le 2026-09-10, préalablement à la rédaction de ce plan.

1. **Périmètre : accès résiduel seul.** Le plan se limite au croisement `partiLe` × membres du dépôt du dernier audit régulier. Aucun appel réseau nouveau, aucune commande de Façade, aucune modification du cœur natif : tout est calculé à l'affichage à partir de l'état déjà chargé en mémoire, comme le sont déjà le statut de rattachement d'un membre ([RG-006](../02_documentation/05_reglesGestion.md#membres-et-sécurité-des-accès)) et le statut d'obsolescence ([RG-011](../02_documentation/05_reglesGestion.md#constat-jugement-et-politique-ia)). Les commits postérieurs au départ et les contributeurs non membres restent hors périmètre.

2. **Signalement seul, sans court-circuit des seuils.** Contrairement à un membre `inconnu` ([RG-009](../02_documentation/05_reglesGestion.md#membres-et-sécurité-des-accès)), un accès résiduel **ne court-circuite pas** les seuils de couleur : le verdict et la couleur du projet sur la Synthèse des audits ne changent pas, l'écran de Synthèse des audits n'est pas concerné. Le signalement se fait sur la Fiche projet (mise en évidence), la Liste de travail et l'encart d'alertes de l'Accueil.

3. **Déclenchement dès `partiLe` renseigné.** L'alerte est levée dès qu'un membre connu portant `partiLe` figure dans les membres du dernier audit régulier du projet, **quelle que soit la date de cet audit** : il n'est pas exigé que la date de l'audit soit postérieure à `partiLe`. Le dernier audit est le meilleur état connu de la composition du dépôt ; rien n'indique que l'accès a été révoqué depuis, et une date de départ future n'est pas possible (`partiLe` est refusé dans le futur, [RG-061](../02_documentation/05_reglesGestion.md#membres-et-sécurité-des-accès)).

4. **Gravité : barème RG-010.** La gravité de l'alerte d'accès résiduel suit la même règle que celle d'un membre `inconnu` ([RG-010](../02_documentation/05_reglesGestion.md#membres-et-sécurité-des-accès)) : niveau d'accès GitLab effectif supérieur ou égal à 40 (rôle « Maintainer » et au-delà) — gravité **élevée** ; en deçà — gravité **modérée**. La fonction `StatutMembreUtils.calculerGraviteAlerteMembreInconnu` est réutilisée telle quelle (elle ne dépend que du niveau d'accès, son nom est simplement générique de son usage).

5. **Statuts concernés : `interne`, `client`, `partenaire` (proposition à valider).** `partiLe` est interdit sur une règle de type `domaineEmail` mais autorisé sur toute règle nominative (`username` ou `email`) quel que soit le statut ([RG-061](../02_documentation/05_reglesGestion.md#membres-et-sécurité-des-accès)). Un prestataire (`client`, `partenaire`) dont la mission est terminée et qui conserve un accès est un risque au moins équivalent à celui d'un salarié parti. Le plan retient donc les trois statuts. Un membre résolu `inconnu` ou `conflit` ne peut par construction pas porter `partiLe` (aucune règle ne l'a résolu) et relève de la détection existante.

6. **Aucun identifiant nouveau côté cœur natif, aucune donnée persistée nouvelle.** Le cycle de traitement de l'alerte (vu / traité) réutilise la commande `qualifierAlerte` et l'historique `traitementsAlertes` existants ([RG-026](../02_documentation/05_reglesGestion.md#vues-alertes-export-et-import)) : `cleAlerte` est un texte libre au format `typeAlerte|projetId|discriminant`, aucune liste de causes n'est validée côté cœur natif. Nouveau préfixe de clé : `membreParti|{projetId}|{username}`.

7. **Résolution par le même mécanisme que RG-006 à RG-008.** Le rattachement d'un membre du dépôt à une règle nominative se fait via `StatutMembreUtils.resoudreRegleNominative` (déjà utilisé par le raccourci « Marquer comme parti » de plan_18) : précédence `username` exact puis `email` exact, la règle `domaineEmail` étant hors sujet ici. Une règle `email` n'est résolue que si le jeton GitLab expose l'adresse du membre (email public ou jeton d'administration) — même limite que celle déjà connue et documentée pour [RG-006](../02_documentation/05_reglesGestion.md#membres-et-sécurité-des-accès) et [RG-060](../02_documentation/05_reglesGestion.md#membres-et-sécurité-des-accès), rappelée en [§12](#12-points-restant-ouverts).

8. **Mise en forme de `partiLe` à l'affichage.** La date `partiLe` (calendaire `AAAA-MM-JJ`) affichée dans la mention de mise en évidence est mise en forme sans conversion de fuseau, conformément à la règle posée par [plan_20](./plan_20_triMembresConnusEtDatesCalendaires.md) (§4, décision 4 de ce plan) : via `DateCalendaireUtils.formaterFr` si plan_20 est intégré avant, sinon par un découpage de chaîne local à factoriser ensuite (cf. [§12](#12-points-restant-ouverts)).

## 3. Périmètre et identifiants d'exigence proposés

Derniers identifiants **intégrés** aux documents normatifs à la date de rédaction : `US-062`, `RG-062` (plan_17 chapitre 5). `plan_20_triMembresConnusEtDatesCalendaires.md`, **non intégré**, réserve `US-063` à `US-065` et `RG-063` à `RG-065`.

Allocation proposée pour ce plan : **`US-066` / `RG-066`**, à reconfirmer au moment de la qualification effective. Si `plan_20` est intégré autrement ou si une autre session consomme des identifiants entre-temps, décaler l'ensemble en bloc sans réintroduire de trou, sur le principe déjà appliqué à l'Étape 25 et pour plan_17 chapitres 2 à 5.

| exigence | intitulé proposé | priorité |
|---|---|---|
| US-066 | Repérer qu'un membre parti (`partiLe`) figure encore parmi les membres d'un dépôt : badge et mise en évidence sur la Fiche projet, cause d'alerte sur la Liste de travail et l'Accueil | Should have |
| RG-066 | Règle de détection et de restitution de l'accès résiduel : croisement `partiLe` × `gitlab.membres` du dernier audit régulier, statuts `interne` / `client` / `partenaire`, gravité selon [RG-010](../02_documentation/05_reglesGestion.md#membres-et-sécurité-des-accès), signalement sans court-circuit des seuils, cycle de traitement [RG-026](../02_documentation/05_reglesGestion.md#vues-alertes-export-et-import) | — |

`RG-066` s'articule avec `RG-061` (source de `partiLe`), `RG-006` à `RG-010` (résolution du statut et gravité), `RG-026` (cycle de traitement des alertes) et `RG-009` (dont il se distingue explicitement : pas de court-circuit des seuils).

## 4. Détection de l'accès résiduel

### 4.1 Donnée d'entrée

Pour un projet donné :

- le **dernier audit régulier** (`DernierAuditRegulierUtils.dernierAuditRegulier(projet.audits)`), déjà utilisé par la Fiche projet, la Liste de travail et l'Accueil pour la détection `membreInconnu` ;
- les résultats `gitlab.membres` de cet audit (un par source GitLab ; un projet à plusieurs dépôts en produit plusieurs, cf. `AgregationThemeFicheProjetUtils.regrouper` côté Fiche projet et l'itération par résultat côté Liste de travail / Accueil) ;
- les règles de membres connus du groupe de rattachement du projet (`groupe.membresConnus`), qui portent désormais `partiLe`.

Aucune autre donnée, aucun appel réseau.

### 4.2 Règle de détection

Un membre `m` de `gitlab.membres` est en **accès résiduel** si et seulement si :

1. `StatutMembreUtils.resoudreRegleNominative({ username: m.username, email: m.emailPublic }, membresConnus)` renvoie une règle `r` (résolution nominative aboutie) ;
2. `r.statut` est `interne`, `client` ou `partenaire` (toujours vrai si `r` est renvoyée : une résolution nominative ne renvoie une règle que pour un membre `connu`) ;
3. `r.partiLe` est renseigné.

La date de l'audit n'entre pas dans la condition (décision 3). Le niveau d'accès `m.niveauAcces` détermine la gravité (décision 4) mais pas le déclenchement.

### 4.3 Utilitaire pur

Nouveau fichier `src/app/services/sansetat/jugement/acces-residuel.utils.ts` — classe à membres statiques `AccesResiduelUtils` (norme « aucune fonction hors classe ») :

- `estAccesResiduel(membre: { username: string; emailPublic?: string; niveauAcces: number }, membresConnus): { partiLe: string; statut: StatutMembre; gravite: GraviteAlerteMembreInconnu } | undefined` — applique la règle 4.2 et, le cas échéant, renvoie la date de départ, le statut de rattachement et la gravité calculée ; `undefined` sinon.

Cet utilitaire est consommé identiquement par la Fiche projet (§5), la Liste de travail et l'Accueil (§6), garantissant une règle unique. Il n'importe rien de `services/avecetat/` (type structurel pour `membresConnus`, à l'image de `PriseEnChargeUtils` introduit par plan_18).

Spec `acces-residuel.utils.spec.ts` : membre parti présent (résolu par `username`) ; membre parti présent résolu par `email` quand `emailPublic` est fourni ; règle `email` non résolue quand `emailPublic` absent ; règle `username` sans `partiLe` — non détecté ; règle `domaineEmail` (jamais de `partiLe`) — non détecté ; membre `inconnu` — non détecté ; gravité élevée pour `niveauAcces >= 40`, modérée en deçà ; les trois statuts `interne` / `client` / `partenaire`.

## 5. Fiche projet — badge, mise en évidence et décompte

### 5.1 `src/app/ecrans/fiche-projet/fiche-projet.component.ts`

**`LigneMembre`** (interface locale, `fiche-projet.component.ts`) — nouveaux champs :

- `accesResiduel: boolean` — `true` si `AccesResiduelUtils.estAccesResiduel` aboutit pour ce membre ;
- `partiLe: string | undefined` — la date de départ de la règle résolvante, présente uniquement si `accesResiduel` ;
- `graviteAccesResiduel: GraviteAlerteMembreInconnu | undefined` — la gravité calculée, présente uniquement si `accesResiduel`.

`construireLigneMembre` appelle `AccesResiduelUtils.estAccesResiduel` et renseigne ces trois champs. La méthode privée existante `calculerCritereMarquerParti` (raccourci « Marquer comme parti » de plan_18) reste inchangée : elle ne concerne qu'un membre `interne` **non** déjà marqué parti, exactement le cas complémentaire de celui traité ici.

**En-tête.** `DonneesFicheProjet` reçoit `accesResiduelDetecte: boolean` (`membres.some((m) => m.accesResiduel)`), à côté de `membreInconnuDetecte` et `sonarKo`. Un badge d'en-tête « accès résiduel » est ajouté à la suite des badges IA / SONAR_KO / membre inconnu, en `app-badge` de couleur d'avertissement (jamais rouge : décision 2, ce n'est pas un incident bloquant), libellé court « accès non révoqué » et libellé d'accessibilité explicite « une personne ayant quitté l'organisation figure encore parmi les membres d'un dépôt ». Ce badge est **inclus** dans l'export PNG (au contraire des contrôles de recalcul de plan_18, mais comme les badges IA / SONAR_KO / membre inconnu, qui font partie de l'état du projet).

**Ventilation des membres (US-017).** `SectionMembresSimple` et `SectionMembresGroupes` reçoivent `nbAccesResiduel: number` (nombre de membres de la section en accès résiduel, membres distincts pour la section « groupes invités » comme pour `decompteParStatut`). La barre de titre de la section affiche, après le décompte par statut, une mention distincte « N accès non révoqué(s) » quand `nbAccesResiduel > 0` — élément d'avertissement (fond atténué + libellé), jamais une couleur seule ([RNF-020](../02_documentation/07_exigencesNonFonctionnelles.md#accessibilité-et-ergonomie)). `nbAccesResiduel` est calculé dans `construireSectionsMembres` par `membres.filter((m) => m.accesResiduel).length` sur le sous-ensemble de chaque section. Le décompte n'est **pas** fusionné dans `decompteParStatut` : `partiLe` est indépendant du statut ([RG-061](../02_documentation/05_reglesGestion.md#membres-et-sécurité-des-accès)), un membre parti reste compté dans son statut d'origine.

### 5.2 `fiche-projet.component.html` et `.scss`

Dans la liste des membres d'une section : une ligne dont `membre.accesResiduel` est vrai porte une classe de mise en évidence (bordure gauche d'avertissement, cohérente avec la mise en évidence d'un membre `inconnu` déjà présente mais visuellement distincte) et une mention en texte atténué « parti le JJ/MM/AAAA — accès non révoqué (gravité modérée / élevée) », la date mise en forme selon la décision 8. Aucune action n'est proposée sur cette ligne (la révocation de l'accès se fait dans GitLab, hors de l'application) ; le raccourci « Marquer comme parti » n'apparaît pas ici puisque la règle porte déjà `partiLe`.

### 5.3 Spec

`fiche-projet.component.spec.ts` étendu : badge d'en-tête présent quand un membre parti est présent, absent sinon ; mise en évidence de la ligne et mention de date ; `nbAccesResiduel` dans la barre de titre de chaque type de section ; export PNG incluant le badge ; non-régression du raccourci « Marquer comme parti » (toujours proposé pour un `interne` sans `partiLe`, jamais pour un membre en accès résiduel).

## 6. Liste de travail et Accueil — nouvelle cause d'alerte

### 6.1 Liste de travail — `src/app/ecrans/liste-travail/liste-travail.component.ts`

- Constante `PREFIXE_CLE_MEMBRE_PARTI = 'membreParti|'`, à côté de `PREFIXE_CLE_MEMBRE_INCONNU`.
- Nouvelle méthode privée `construireCausesMembreParti(...)`, calquée sur `construireCausesMembreInconnu` : pour chaque projet, dernier audit régulier, chaque résultat `gitlab.membres`, chaque membre pour lequel `AccesResiduelUtils.estAccesResiduel` aboutit — une `LigneAlerteTravail` de clé `membreParti|{projetId}|{username}`, libellé « Membre parti « {username} » encore présent ({niveauAccesLabel}) », gravité issue de `estAccesResiduel`, `detecteeDepuis` / `traiteeLe` résolus depuis `traitementsAlertes` comme pour `membreInconnu`.
- Les causes des deux familles sont concaténées avant agrégation. Le tri (`comparerLignesAlerte`) place `membreParti` juste après `membreInconnu` et avant les éventuelles futures familles : le prédicat de priorité passe de « `membreInconnu` d'abord » à « `membreInconnu` puis `membreParti` puis le reste » ; à gravité et famille égales, tri par libellé conservé.
- Le filtre groupe / projet mutualisé, la recherche plein texte et le cycle de qualification (`qualifierAlerte`) s'appliquent sans modification (la clé est un discriminant opaque pour ces mécanismes).
- Note de vigilance `@for` / `track` (NG0955, déjà rencontrée sur cet écran) : la clé `membreParti|{projetId}|{username}` est unique par construction ; vérifier qu'aucune ligne `membreInconnu` et `membreParti` ne peut entrer en collision (préfixes distincts, aucun risque).

### 6.2 Accueil — `src/app/ecrans/accueil/accueil.component.ts`

- Nouvelle méthode privée `causesMembreParti()`, calquée sur `causesMembreInconnu()`, produisant des `CauseAlerteActive` de clé `membreParti|{projetId}|{username}`.
- Ces causes sont ajoutées à la liste passée à `AlertesAccueilUtils.agreger`, dans l'ordre : `membreInconnu` puis `membreParti`. Le plafond d'affichage de l'encart (trois causes aujourd'hui pour `membreInconnu`) s'applique à l'ensemble agrégé ; le décompte total (« et N autres ») les inclut.
- `membrePartiDetecte()` / `nombreProjetsAvecMembreParti()` sur le modèle des méthodes homonymes `membreInconnu`, si l'encart distingue les familles ; sinon un simple ajout au décompte global.

### 6.3 Specs

`liste-travail.component.spec.ts` : détection d'un membre parti présent (une ligne, bonne gravité selon le niveau d'accès) ; disparition de la ligne quand la règle perd `partiLe`, quand le membre disparaît du dernier audit, ou quand il n'existe pas d'audit régulier ; coexistence `membreInconnu` + `membreParti` sur le même projet et ordre de tri ; cycle vu / traité et réapparition d'une alerte traitée dont la cause persiste ([RG-026](../02_documentation/05_reglesGestion.md#vues-alertes-export-et-import)). `accueil.component.spec.ts` : cause `membreParti` remontée dans l'encart, décompte, plafond d'affichage.

## 7. Impacts sur le modèle de données et migration

**Néant.** Aucune structure de données modifiée, aucun changement de forme du schéma, `VERSION_SCHEMA_COURANTE` inchangée, aucun palier de migration, aucune commande de Façade nouvelle, aucune modification du cœur natif Rust.

`partiLe` existe déjà sur `MembreConnu` (Rust) et `DonneesMembreConnu` / `MembreConnu` (TypeScript) depuis plan_18. L'accès résiduel est un calcul d'affichage pur, au même titre que le statut de rattachement d'un membre ([RG-006](../02_documentation/05_reglesGestion.md#membres-et-sécurité-des-accès)) et le statut d'obsolescence ([RG-011](../02_documentation/05_reglesGestion.md#constat-jugement-et-politique-ia)) : il n'est jamais stocké dans l'audit, il est recalculé à chaque consultation, si bien que renseigner ou retirer `partiLe` sur une règle requalifie tout l'historique.

Le cycle de traitement de l'alerte réutilise la commande `qualifierAlerte` et l'historique `traitementsAlertes` de la racine, déjà en place ([RG-026](../02_documentation/05_reglesGestion.md#vues-alertes-export-et-import)), sans changement de signature.

## 8. Impacts documentaires

| document | modification |
|---|---|
| [`01_besoin/Specification.md`](../01_besoin/Specification.md) §5.17 (F17) | remplacer le renvoi « L'exploitation « audit d'accès » … est hors périmètre et renvoyée à plan_19 » par la description effective : un membre connu portant une date de départ (`partiLe`) qui figure encore parmi les membres d'un dépôt au dernier audit régulier est signalé comme **accès résiduel** — badge et mise en évidence sur la Fiche projet, cause d'alerte sur la Liste de travail et l'Accueil, gravité modulée par le niveau d'accès ([RG-010](./05_reglesGestion.md#membres-et-sécurité-des-accès)), **sans court-circuit des seuils de couleur** (à la différence d'un membre `inconnu`) ; préciser que les commits postérieurs au départ et les contributeurs non membres restent hors périmètre |
| [`01_besoin/Specification.md`](../01_besoin/Specification.md) tableau des fonctionnalités (ligne F17) | compléter l'intitulé : « Croisement membres/contributeurs avec la liste des membres connus du groupe, alerte `inconnu`, **signalement d'un accès résiduel d'un membre parti** » |
| [`02_documentation/04_casUsage.md`](../02_documentation/04_casUsage.md) | **ajouter US-066** (persona de consultation, priorité Should have ; critères d'acceptation = badge et mise en évidence sur la Fiche projet, décompte par section, cause d'alerte sur la Liste de travail et l'Accueil, gravité selon [RG-010](./05_reglesGestion.md#membres-et-sécurité-des-accès), pas de changement de couleur sur la Synthèse des audits, cycle vu/traité) ; compléter US-017 (Fiche projet : mise en évidence d'un accès résiduel, badge d'en-tête, décompte par section), US-005 et US-020 (nouvelle cause d'alerte sur l'Accueil et la Liste de travail) ; retirer d'US-061 la phrase « L'exploitation « audit d'accès » … est hors périmètre et renvoyée à plan_19 » et y renvoyer vers [RG-066](./05_reglesGestion.md#membres-et-sécurité-des-accès) ; compléter la ligne « Éliminer les angles morts de sécurité liés aux membres non identifiés » de la matrice objectifs → US avec US-066 ; mettre à jour la matrice de couverture écrans × US |
| [`02_documentation/05_reglesGestion.md`](../02_documentation/05_reglesGestion.md) | **ajouter RG-066** (croisement `partiLe` × `gitlab.membres` du dernier audit régulier ; statuts `interne` / `client` / `partenaire` ; résolution nominative `username` puis `email` par le mécanisme de [RG-007](./05_reglesGestion.md#membres-et-sécurité-des-accès) ; déclenchement dès `partiLe` renseigné, indépendamment de la date de l'audit ; gravité selon [RG-010](./05_reglesGestion.md#membres-et-sécurité-des-accès) ; **pas de court-circuit des seuils**, à la différence de [RG-009](./05_reglesGestion.md#membres-et-sécurité-des-accès) ; restitution sur Fiche projet — badge d'en-tête, mise en évidence de ligne, décompte par section — et sur Liste de travail / Accueil ; cycle de traitement [RG-026](./05_reglesGestion.md#vues-alertes-export-et-import) via une clé `membreParti|{projetId}|{username}` ; calcul d'affichage jamais persisté) ; compléter la dernière phrase de [RG-061](./05_reglesGestion.md#membres-et-sécurité-des-accès) (« L'exploitation de `partiLe` pour signaler un accès résiduel … relèvent de plan_19 » → « … est réalisée par [RG-066](#membres-et-sécurité-des-accès) ») ; compléter les lignes « Fiche projet », « Liste de travail » et « Écran d'accueil » de la matrice écran → RG avec RG-066 ; ajouter RG-066 à la matrice RG → US (US-066) |
| [`02_documentation/08_arborescenceNavigation.md`](../02_documentation/08_arborescenceNavigation.md) | Fiche projet, Liste de travail et Accueil : mentionner le signalement d'un accès résiduel si cette granularité y figure ; matrices écrans × US pour US-066 |
| [`02_documentation/09_maquettes.md`](../02_documentation/09_maquettes.md) | Fiche projet : ajouter le badge d'en-tête « accès non révoqué » (à la suite des badges IA / SONAR_KO / membre inconnu, couleur d'avertissement, présent à l'export PNG), la mise en évidence d'une ligne de membre en accès résiduel (bordure d'avertissement + mention « parti le JJ/MM/AAAA — accès non révoqué (gravité …) »), et la mention « N accès non révoqué(s) » dans la barre de titre d'une section de la ventilation des membres ; Liste de travail : ajouter la catégorie d'alerte « Membre parti encore présent » (gravité, libellé) ; Accueil : mentionner la nouvelle cause dans l'encart d'alertes non traitées |
| [`02_documentation/10_charteErgonomie.md`](../02_documentation/10_charteErgonomie.md) | si les composants réutilisables y sont listés : la mise en évidence « accès résiduel » et la mention de décompte sont des éléments d'avertissement (fond / bordure atténués + libellé), jamais une couleur seule porteuse de sens ([RNF-020](../02_documentation/07_exigencesNonFonctionnelles.md#accessibilité-et-ergonomie)) ; distinctes visuellement de la mise en évidence d'un membre `inconnu` |
| [`02_documentation/13_conceptionDetaillee.md`](../02_documentation/13_conceptionDetaillee.md) | nouvel utilitaire pur `AccesResiduelUtils` (`services/sansetat/jugement/acces-residuel.utils.ts`) du Moteur de jugement ; champs `accesResiduel` / `partiLe` / `graviteAccesResiduel` de `LigneMembre`, `accesResiduelDetecte` de `DonneesFicheProjet`, `nbAccesResiduel` des sections de ventilation (`fiche-projet.component.ts`) ; `PREFIXE_CLE_MEMBRE_PARTI` et `construireCausesMembreParti` (`liste-travail.component.ts`), `causesMembreParti` (`accueil.component.ts`) ; réutilisation de `qualifierAlerte` / `traitementsAlertes` sans changement ; matrice module → US pour US-066 / RG-066 ; mention explicite « aucune commande de Façade, aucun changement du cœur natif, aucun changement de schéma » |
| [`02_documentation/16_normesTests.md`](../02_documentation/16_normesTests.md) | ajouter à la matrice de traçabilité : `AccesResiduelUtils` (cas nominal `username`, cas `email` selon disponibilité de l'adresse, règle sans `partiLe`, `domaineEmail`, `inconnu`, barème de gravité, trois statuts) ; Fiche projet (badge d'en-tête, mise en évidence de ligne, décompte de section, export PNG) ; Liste de travail et Accueil (détection, disparition de la cause, coexistence avec `membreInconnu`, ordre de tri, cycle [RG-026](../02_documentation/05_reglesGestion.md#vues-alertes-export-et-import)) ; contrôle E2E facultatif (§11) ; exclusion des tests de charge (calcul d'affichage `O(membres)` par projet, négligeable, aucune exigence de performance chiffrée propre) |
| [`03_plan/plan_18_datePriseEnCharge.md`](./plan_18_datePriseEnCharge.md) §14 | marquer le point 1 (« Plan_19 — audit d'accès des membres partis ») comme traité par le présent plan |
| [`guide-utilisateur.md`](../guide-utilisateur.md) | section relative aux membres et à la sécurité des accès : ajouter un paragraphe « Repérer un accès non révoqué » — quand une règle de membre connu porte une date de départ et que la personne figure encore parmi les membres d'un dépôt au dernier audit, la Fiche projet l'indique (badge et surlignage), et une alerte apparaît sur la Liste de travail et l'Accueil ; la révocation effective se fait dans GitLab ; préciser que ce signal ne modifie pas la couleur du projet dans la Synthèse des audits ; vérifier qu'aucune capture existante ne devient trompeuse |
| [`04_rapports/rapportDeDeveloppement.md`](../04_rapports/rapportDeDeveloppement.md) | nouvelle entrée « Étape N » à la réalisation |

Le tableau ci-dessus est la spécification à appliquer à l'incrément 1. Aucun de ces amendements n'est appliqué par avance : ils restent conditionnés à la validation d'ensemble du plan.

## 9. Impacts sur les tests

- **Interface (`npm test`, Jest)** : `acces-residuel.utils.spec.ts` (nouveau, §4.3) ; `fiche-projet.component.spec.ts` étendu (badge d'en-tête, mise en évidence de ligne, mention de date, `nbAccesResiduel` par type de section, export PNG, non-régression du raccourci « Marquer comme parti ») ; `liste-travail.component.spec.ts` étendu (détection, disparition, coexistence et ordre avec `membreInconnu`, cycle [RG-026](../02_documentation/05_reglesGestion.md#vues-alertes-export-et-import)) ; `accueil.component.spec.ts` étendu (cause remontée, décompte, plafond).
- **Cœur natif (`cargo test`)** : aucun impact (aucune modification Rust). À vérifier en revue : la suite existante reste verte, `partiLe` continue de n'entrer ni dans le calcul de prise en charge ni dans l'empreinte du référentiel `interne` ([RG-058](../02_documentation/05_reglesGestion.md#membres-et-sécurité-des-accès), [RG-061](../02_documentation/05_reglesGestion.md#membres-et-sécurité-des-accès)).
- **Bouchon** : le jeu de démonstration TypeScript (`donnees-racine-bouchon.ts` et les résultats d'audit bouchonnés) doit porter au moins un membre connu de statut `interne` avec `partiLe` dont le `username` figure dans les membres du dernier audit d'un projet, et un membre de statut `client` avec `partiLe` présent sur un autre projet, avec des niveaux d'accès de part et d'autre du seuil 40, pour exercer les deux gravités et le parcours E2E. Aucun nouveau bouchon de commande (aucune commande nouvelle).
- **E2E (`npm run test:e2e`, Playwright)** : contrôle facultatif — sur un projet du jeu de démonstration comportant un membre parti encore présent, vérifier le badge d'en-tête de la Fiche projet, la présence de l'alerte sur la Liste de travail, la qualifier « traitée » et vérifier son passage en section traitée ; à inclure selon le coût sur le parcours unique.
- **Matrice de traçabilité** : vérification croisée refaite (règle générale n°13) — `AccesResiduelUtils`, la restitution Fiche projet et la cause d'alerte Liste de travail / Accueil couvertes par au moins un test ; tests de charge exclus avec justification (calcul d'affichage négligeable, pas d'exigence chiffrée propre) ; réciproquement, chaque nouveau périmètre est décrit par un paragraphe de stratégie ci-dessus.

## 10. Découpage en incréments

1. **Documents normatifs** : tous les amendements du tableau [§8](#8-impacts-documentaires), dont les numéros `US-066` / `RG-066` (à figer en croisant avec l'état d'intégration de `plan_20`). Validation humaine explicite avant tout code.
2. **Détection et Fiche projet** : `AccesResiduelUtils` + spec ; champs de `LigneMembre`, `accesResiduelDetecte` de `DonneesFicheProjet`, `nbAccesResiduel` des sections ; badge d'en-tête, mise en évidence de ligne, décompte de section ; mise en forme calendaire de `partiLe` (décision 8) ; jeu de démonstration du bouchon ; tests interface. Premier incrément à valeur utilisateur visible.
3. **Liste de travail** : `PREFIXE_CLE_MEMBRE_PARTI`, `construireCausesMembreParti`, concaténation et ordre de tri, libellé, filtre et cycle de qualification réutilisés ; tests.
4. **Accueil** : `causesMembreParti`, intégration à l'agrégation de l'encart, décompte ; tests.
5. **Revue croisée finale** : matrice de traçabilité, vérification qu'aucune capture du guide utilisateur n'est prise en défaut, contrôle E2E facultatif (§11) ; entrée « Étape N » du rapport de développement.

Chaque incrément : auto-revue + revue assistée par l'IA en contexte isolé ([domaines de vigilance renforcée](../../.claude/rules/01-usage-ia-et-conventions.md#discernement) : sécurité et confidentialité des données), exécution / test réel avant validation, pas de passage à l'incrément suivant sans validation humaine explicite.

## 11. Vérification de bout en bout

Sur `npm start` (bouchon TypeScript) :

1. dans le jeu de démonstration, un projet a un dernier audit régulier exposant un membre dont le `username` correspond à une règle `interne` du groupe portant `partiLe` → sa Fiche projet affiche le badge d'en-tête « accès non révoqué », la ligne du membre est surlignée avec la mention « parti le JJ/MM/AAAA — accès non révoqué (gravité …) », et la barre de titre de la section (directs / groupe invité / hérités) qui le contient indique « 1 accès non révoqué » ;
2. le niveau d'accès de ce membre étant supérieur ou égal à 40 (Maintainer) → la gravité affichée est « élevée » ; sur un autre projet, un membre parti au niveau Reporter → gravité « modérée » ;
3. export PNG de la Fiche projet → le badge d'en-tête et le surlignage sont présents sur l'image ;
4. la couleur et le verdict du projet sur la Synthèse des audits sont **inchangés** par rapport à l'état sans membre parti (décision 2) ;
5. ouvrir la Liste de travail → une alerte « Membre parti « … » encore présent (…) » figure, à la bonne gravité, juste après les éventuelles alertes « Membre inconnu » du même projet ; le filtre groupe / projet et la recherche plein texte la retrouvent ;
6. qualifier l'alerte « vue » puis « traitée » → elle passe en section traitée ; retirer puis remettre `partiLe` sur la règle (Administration) et recharger la Liste de travail → l'alerte réapparaît comme cause persistante, avec la mention de traitement antérieur ([RG-026](../02_documentation/05_reglesGestion.md#vues-alertes-export-et-import)) ;
7. ouvrir l'Accueil → l'encart « alertes non traitées » mentionne la cause « membre parti » (dans la limite du plafond d'affichage), le décompte total la comptabilise ;
8. sur la règle du membre parti, retirer `partiLe` et enregistrer → le badge, le surlignage, la mention de section et l'alerte disparaissent partout après rechargement ; remettre une règle de type `domaineEmail` (qui ne peut pas porter `partiLe`) → aucun signalement ;
9. sur un projet dont le membre parti **ne figure pas** dans le dernier audit régulier (ou qui n'a jamais été audité) → aucun badge, aucune alerte ;
10. un membre parti de statut `client` encore présent sur un dépôt → mêmes signalements que pour un `interne` parti (décision 5).

## 12. Points restant ouverts

1. **Commits postérieurs au départ.** Repérer les commits d'un membre datés après son `partiLe` est un signal fort d'usage d'un compte qui aurait dû être désactivé, mais il exige un appel réseau borné (pagination de `repository/commits`, à la manière du calcul de premier commit interne de plan_18) : hors périmètre de ce plan (décision 1), à instruire séparément — probablement comme une action « vérifier » à la demande sur la Fiche projet, non persistée, réutilisant l'infrastructure `persistance::prise_en_charge` / `connecteurs::gitlab`.
2. **Contributeurs non membres et non reconnus.** [F17](../01_besoin/Specification.md#517-f17--surveillance-des-membres-et-premier-commit-interne) mentionne la détection, via le canal « auteurs de commits » (identifiés par courriel), des contributeurs qui ne sont ni membres du dépôt ni résolus par une règle connue. Le constat `gitlab.contributeurs` (contributeurs distincts sur la fenêtre glissante : `email`, `nom`, `nombreCommits`) est déjà présent dans l'audit : ce croisement est donc **largement calculable à l'affichage** (résoudre chaque `Contributeur.email` contre `membresConnus`, signaler ceux résolus `inconnu` et absents de `gitlab.membres`). Il reste hors périmètre de ce plan (décision 1, pour ne pas mélanger deux signaux distincts) mais constitue le prolongement le plus immédiat, sans appel réseau nouveau : à instruire en priorité après ce plan, éventuellement dans le même document.
3. **Enrichissement automatique de `aliasEmail`.** Renseigner automatiquement le courriel des membres identifiés par login (API des membres GitLab avec jeton d'administration, ou corrélation avec `author_email` des commits) débloquerait à la fois la datation de prise en charge ([RG-058](../02_documentation/05_reglesGestion.md#membres-et-sécurité-des-accès)) et la résolution `email` de la détection d'accès résiduel (décision 7). Déjà recensé par [plan_20, §15 point 1](./plan_20_triMembresConnusEtDatesCalendaires.md) ; reste hors périmètre, à rapprocher des points 1 et 2.
4. **Limite de résolution par règle `email`.** Un membre parti dont la règle est de type `email` n'est détecté que si le jeton GitLab expose son adresse (email public ou jeton d'administration) — même limite que [RG-006](../02_documentation/05_reglesGestion.md#membres-et-sécurité-des-accès) et [RG-060](../02_documentation/05_reglesGestion.md#membres-et-sécurité-des-accès). En pratique, une personne interne est presque toujours aussi couverte par une règle `username` ; à documenter, sans traitement particulier.
5. **Dépendance à `DateCalendaireUtils` (plan_20).** La mise en forme de `partiLe` à l'affichage (décision 8) est idéalement portée par `DateCalendaireUtils`, introduit par plan_20 mais non encore intégré. Si plan_19 est développé avant plan_20, prévoir un découpage de chaîne local, à factoriser lors de l'intégration de plan_20 ; l'ordre d'intégration des deux plans est à arbitrer.
6. **Écran « Comparaison entre deux audits ».** Cet écran restitue un différentiel, pas un état courant : il n'est pas retenu ici pour le signalement d'accès résiduel. À confirmer — un rappel discret « ce membre est parti » sur les lignes de membres du différentiel serait possible mais n'apporte pas d'information de sécurité actionnable.
7. **Écran « Commits des membres ».** Le roster y est déjà classé par statut de rattachement ([RG-060](../02_documentation/05_reglesGestion.md#membres-et-sécurité-des-accès)). Matérialiser `partiLe` sur les lignes de ce tableau (un membre parti qui pousse encore du code) recoupe le point 1 ; hors périmètre, à réévaluer avec lui.
8. **Numéros d'identifiants.** `US-066` / `RG-066` sont proposés sous réserve de l'état d'intégration de `plan_20` (qui réserve `US-063` à `US-065`) ; à figer à l'incrément 1, sans réintroduire de trou.
9. **Filtre « masquer les membres partis ».** Ce plan n'ajoute aucun filtre. Un besoin de filtrer ou d'isoler les accès résiduels (sur la Liste de travail, ou dans la ventilation des membres de la Fiche projet) est plausible à l'usage ; hors périmètre, à réévaluer.
