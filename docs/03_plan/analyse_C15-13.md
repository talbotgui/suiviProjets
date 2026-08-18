# Analyse approfondie — C15-13 : lien direct depuis la Fiche projet vers les instances GitLab/Sonar réellement interrogées

> Document généré avec l'assistance de l'IA (Claude Code), conformément à la mention d'origine requise par `.claude/rules/01-usage-ia-et-conventions.md`. Cette analyse ne tranche aucune question : elle expose un comportement constaté par lecture directe du code, une vérification externe des formats d'URL GitLab/Sonar, et des options de solution argumentées, en vue d'un arbitrage humain.

## Sommaire

1. [Rappel du point](#1-rappel-du-point)
2. [Analyse](#2-analyse)
3. [Options de solution](#3-options-de-solution)
4. [Questions ouvertes nécessitant un arbitrage humain](#4-questions-ouvertes-nécessitant-un-arbitrage-humain)
5. [Proposition d'identifiants US/RG provisoires](#5-proposition-didentifiants-usrg-provisoires)

## 1. Rappel du point

Constat initial de recette (`docs/03_plan/plan_13_developpement.md`, tableau de la Phase 15, ligne `C15-13`) : « Aucun lien direct depuis la Fiche projet vers les instances GitLab/Sonar réellement interrogées (dépôt, projet Sonar) : l'utilisateur doit retrouver manuellement l'URL depuis l'écran Sources. »

Analyse préliminaire déjà consignée dans le plan : « Fonctionnalité mineure et autonome, prolongeant un motif déjà appliqué avec succès à la même Fiche projet pour les MR : l'URL cible se déduit probablement déjà de l'instance/identifiant externe de la source (mêmes champs déjà exploités pour construire les appels connecteurs). »

Statut actuel dans le plan : « À qualifier (préciser si Sonar dispose d'une URL de mesure directe, sinon lien vers le projet Sonar seul) ».

## 2. Analyse

### 2.1. Le motif déjà appliqué pour les MR n'est pas une construction d'URL, mais un passe-plat d'un champ fourni par l'API GitLab

Le lien déjà en place dans la Fiche projet vers une demande de fusion (`fiche-projet.component.html`, ligne 320) est :

```html
<a [href]="mr.webUrl" target="_blank" rel="noopener noreferrer" ...>
```

`mr.webUrl` provient directement du champ `web_url` renvoyé par l'API GitLab pour chaque merge request, capturé côté cœur natif dans `src-tauri/src/connecteurs/gitlab.rs` (ligne 858, structure de désérialisation ; ligne 917, `web_url: mr.web_url`) puis persisté tel quel dans `Resultat` (`src-tauri/src/modele/racine.rs`, ligne 474, `pub(crate) web_url: String`). L'application ne construit donc **aucune** URL pour les MR : elle réaffiche une valeur que GitLab calcule et fournit lui-même dans sa réponse JSON.

Ce constat nuance l'hypothèse préliminaire du plan (« l'URL cible se déduit probablement déjà de l'instance/identifiant externe de la source »). Ce n'est pas le mécanisme réel du cas MR. Cela ne rend cependant pas le point C15-13 plus difficile : cela signifie seulement que la source d'inspiration exacte à reproduire n'est pas « recalculer une URL à partir de champs de la source », mais « offrir un lien cliquable vers l'origine externe d'une donnée affichée », principe repris à l'identique en section 3 par une construction d'URL cette fois assumée côté application, faute d'un champ `web_url` équivalent fourni pour le dépôt/projet lui-même par les appels actuellement effectués par les connecteurs (aucun de ceux consultés — `lister_projets`, `interroger_branches`, mesures Sonar — ne conserve de champ d'URL web pour l'entité « dépôt »/« projet » elle-même, seulement pour les MR individuelles).

### 2.2. Champs disponibles sur le modèle `Source`/`Instance`, et leur accessibilité dans le contexte de la Fiche projet

Le modèle `Source` (`src/app/services/avecetat/etat/types-donnees.ts`, lignes 437-448, mirroir de la structure Rust) porte :

- `instanceId` : référence vers une `Instance` du groupe ;
- `type` : `TypeSource.DepotGitlab` ou `TypeSource.ProjetSonar` ;
- `idExterne` : identifiant externe côté instance, dont la nature diffère selon le type de source (cf. 2.3) ;
- `refAuditee` (optionnelle).

Le modèle `Instance` (`src/app/services/sansetat/commandes/types-facade.ts`, lignes 37-46) porte `type` (`TypeInstance.Gitlab` ou `TypeInstance.Sonar`, deux valeurs seulement — aucune distinction de sous-type SonarQube auto-hébergé/SonarCloud) et `urlBase`.

Ces deux structures sont déjà toutes deux disponibles au moment de la construction du modèle d'affichage de la Fiche projet : `fiche-projet.component.ts` reçoit le `Groupe` complet (donc `groupe.instances`) et le `Projet` complet (donc `projet.sources`) dans la méthode de construction (paramètre `groupe: Groupe`, ligne 653 et suivantes ; usage de `projet.sources.find(...)`, ligne 709). Résoudre `Source.instanceId` vers l'`Instance` correspondante puis vers son `urlBase` est donc réalisable **sans aucun appel réseau ni nouvelle commande de la Façade** : une simple recherche dans des collections déjà chargées en mémoire, au même titre que la résolution déjà faite aujourd'hui pour `refAuditeeSource`.

Fait notable et distinct du constat initial : aucun lien cliquable n'existe non plus, aujourd'hui, sur l'écran Administration des sources lui-même (`sources-admin.component.html`, ligne 88) — celui-ci affiche l'`idExterne` en texte brut (`<span class="sources-admin__id-externe texte-sm">{{ ligne.source.idExterne }}</span>`), sans lien, et sans afficher `urlBase` en regard. Le parcours de contournement décrit dans le constat (« retrouver manuellement l'URL depuis l'écran Sources ») suppose donc, en réalité, une reconstruction manuelle par l'utilisateur à partir de deux écrans distincts (Sources pour `idExterne`, Paramétrage/Instances pour `urlBase`), et non une simple copie d'une URL déjà affichée quelque part dans l'application.

### 2.3. Nature réelle de `idExterne` selon le type de source, vérifiée par lecture des connecteurs

**GitLab** (`src-tauri/src/connecteurs/gitlab.rs`) : `idExterne` est l'identifiant **numérique** du projet GitLab. Il provient de `lister_projets` (lignes 196-253), qui interroge `GET {urlBase}/api/v4/projects` et retient `projet.id.to_string()` (ligne 247) comme `id_externe`, en ne conservant que `path_with_namespace` comme libellé d'autocomplétion (`libelle`, non persisté sur la `Source`). Tous les appels d'audit (résolution de ref, commits, MR, membres) utilisent ensuite cet identifiant numérique dans l'URL d'API, par exemple ligne 203 et les usages de `id_externe` aux lignes 443 et suivantes. Le chemin encodé dans l'URL d'API GitLab (`/api/v4/projects/{id}`) est un identifiant technique interne à l'API, distinct du chemin utilisé par l'interface web de GitLab (`{urlBase}/{namespace}/{projet}`), qui n'est **pas** stocké sur la `Source`.

**Sonar** (`src-tauri/src/connecteurs/sonar.rs`) : `idExterne` est directement la **clé de projet** (« project key »), une chaîne au format `entreprise:api-facturation` observée dans les tests existants (ligne 1125, `assert_eq!(disponibles[0].id_externe, "entreprise:api-facturation")`). Cette clé est utilisée telle quelle comme paramètre `component`/`project` de tous les appels de mesure (`GET {urlBase}/api/measures/component`, ligne 124, paramètre `component` ligne 128) et de recherche de composants (ligne 473 et suivantes, `id_externe: composant.key`, ligne 519). Contrairement au cas GitLab, cette clé est **directement** la valeur attendue dans l'URL web de mesure Sonar (cf. 2.4) : aucune information supplémentaire n'est nécessaire pour construire un lien de mesure Sonar à partir des seuls champs déjà stockés sur la `Source`.

### 2.4. Formats d'URL web réellement navigables, vérifiés (recherche externe, format non présumé)

**GitLab — accès par identifiant numérique de projet.** La forme `{urlBase}/projects/{id}` est un comportement de redirection documenté de l'application web GitLab (constaté sur le forum officiel GitLab et sur le ticket GitLab `gitlab-org/gitlab#438195`, « Redirect to project subpage URL by project id ») : GitLab redirige cette URL vers l'URL complète du dépôt (`{urlBase}/{namespace}/{projet}`), à partir du seul identifiant numérique — exactement la donnée déjà stockée dans `idExterne` pour une source GitLab. Limite documentée par ce même ticket : la redirection ne fonctionne aujourd'hui que pour la page racine du projet, pas pour une sous-page (ex. un fichier ou une branche précise) — sans incidence ici puisque le besoin exprimé par C15-13 porte sur un lien vers le dépôt, pas vers une sous-ressource. Il s'agit d'un comportement de la couche web de l'application GitLab, non d'un point de contrat documenté au même titre que l'API REST v4 utilisée par ailleurs par les connecteurs : sa stabilité dans le temps n'est pas couverte par la même garantie de compatibilité descendante.

**Sonar — deux formats distincts selon SonarQube (auto-hébergé) ou SonarCloud.**

- SonarQube (auto-hébergé) : `{urlBase}/dashboard?id={idExterne}` est le format standard depuis la version 5.2 (remplaçant l'ancien `{urlBase}/dashboard/index/{idExterne}`) ; c'est également l'URL littéralement affichée par le Sonar Scanner en fin d'analyse (« you can browse … at »), ce qui en fait un format d'usage très stable et largement documenté par la communauté Sonar.
- SonarCloud : format distinct, `{urlBase}/project/overview?id={idExterne}` (vérifié par recherche externe). SonarCloud attache par ailleurs une notion d'organisation (« organization key ») à chaque projet, généralement présente dans les liens produits nativement par SonarCloud, alors qu'aucun champ `organisation`/`organization` n'existe aujourd'hui sur `Instance` ni sur `Source` dans le modèle de données de l'application (`TypeInstance` ne compte que deux valeurs, `Gitlab`/`Sonar`, sans sous-distinction SonarQube/SonarCloud — vérifié par lecture de `racine.rs` et `types-facade.ts`, et confirmé par l'absence de toute mention `sonarcloud`/`organization` dans `sonar.rs`, qui traite les deux façons d'héberger Sonar de façon strictement uniforme).

Ce dernier point est le seul volet technique réellement incertain de ce point de recette : contrairement à ce que suggérait le statut actuel du plan (« préciser si Sonar dispose d'une URL de mesure directe »), Sonar dispose bien d'une URL de mesure directe dans les deux cas — la difficulté n'est pas l'existence d'un tel lien, mais le choix du bon format selon que l'instance déclarée est un SonarQube auto-hébergé ou une organisation SonarCloud, distinction que le modèle de données actuel de l'application ne porte pas.

## 3. Options de solution

### Option 1 — Lien direct construit côté client, format unique SonarQube pour toute instance Sonar

**Principe.** Ajouter, dans la Fiche projet, pour chaque source affichée, un lien construit uniquement à partir de données déjà chargées (`Instance.urlBase` + `Source.idExterne`), sans appel réseau supplémentaire : `{urlBase}/projects/{idExterne}` pour une source GitLab, `{urlBase}/dashboard?id={idExterne}` pour une source Sonar, quelle que soit la nature réelle de l'instance (SonarQube ou SonarCloud).

**Avantages.** Aucun appel réseau ni nouvelle commande de la Façade, cohérent avec l'esprit du motif MR (donnée déjà en mémoire, restitution immédiate). Développement limité à l'Angular (fonction de construction pure, testable unitairement sans mock réseau). Couvre la totalité des cas d'usage aujourd'hui déclarés au sein du projet (auto-hébergé, très majoritairement utilisé d'après la configuration d'`Instance` observée dans les jeux de données de test du dépôt).

**Inconvénients.** Le lien Sonar produit est incorrect pour une instance SonarCloud (chemin `/dashboard?id=` invalide côté SonarCloud, qui attend `/project/overview?id=`) : risque de lien mort ou de redirection inattendue pour un groupe déclarant `urlBase = https://sonarcloud.io`. Le lien GitLab repose sur un comportement de redirection web non contractualisé au même titre que l'API REST.

**Impact code/documentation.** `fiche-projet.component.ts` (fonction pure de construction d'URL par type de source, aux côtés des fonctions de construction de liens déjà existantes comme `construireQueryParamsQualification`) et `.html` (ajout d'un lien par source — aucun bloc d'affichage des sources n'existe aujourd'hui dans ce gabarit d'écran, cf. commentaire de tête du fichier lignes 4-11, qui ne mentionne aucune section « sources » parmi les blocs déjà construits : son emplacement précis dans la mise en page est donc à concevoir, pas seulement à compléter). Nouvelle RG à documenter (cf. section 5). Aucune modification du cœur natif Rust ni du modèle de données.

### Option 2 — Lien direct avec distinction SonarCloud par détection de `urlBase`

**Principe.** Identique à l'option 1, mais avec une fonction de construction Sonar qui choisit le chemin `/project/overview?id=` lorsque `urlBase` correspond à `sonarcloud.io` (ou un sous-domaine), et `/dashboard?id=` sinon.

**Avantages.** Corrige le défaut principal de l'option 1 pour les deux façons connues et documentées d'héberger Sonar, sans nécessiter de nouveau champ sur le modèle de données ni de migration de données existantes.

**Inconvénients.** Introduit, pour la première fois dans le code de l'application, une distinction implicite SonarQube/SonarCloud fondée sur un nom d'hôte codé en dur, alors que le modèle de données (`TypeInstance`) traite volontairement les deux de façon uniforme depuis l'origine (aucune occurrence de `sonarcloud` dans `sonar.rs`) — rupture de ce principe de conception à valider explicitement plutôt qu'à introduire silencieusement dans un composant d'écran. Reste incomplet si une organisation SonarCloud attend un paramètre `organization` supplémentaire pour résoudre correctement le projet (paramètre non modélisé aujourd'hui) ; ce point n'a pas pu être confirmé de façon certaine par la présente analyse (résultats de recherche externe partiellement contradictoires sur le caractère strictement obligatoire ou non de ce paramètre dans l'URL, cf. section 4).

**Impact code/documentation.** Comme l'option 1, plus une fonction de détection dédiée (probablement dans une classe utilitaire statique existante ou nouvelle, cf. règle « aucune fonction hors classe »), et une justification explicite en commentaire de ce codage en dur du nom d'hôte SonarCloud, contraire à l'uniformité de traitement observée ailleurs dans le connecteur Sonar.

### Option 3 — Repli minimal : lien vers la page projet Sonar/dépôt GitLab uniquement si la construction directe est fiable, sinon aucun lien pour Sonar

**Principe.** Retenir l'option 1 pour GitLab (fiabilité suffisante, un seul format observé), mais différer tout lien direct pour Sonar tant que la distinction SonarQube/SonarCloud n'est pas explicitement arbitrée : afficher pour Sonar, en attendant, uniquement `urlBase` (page d'accueil de l'instance), sans tentative de deep-link vers le projet précis.

**Avantages.** Élimine tout risque de lien mort ou trompeur côté Sonar. Développement minimal et sans ambiguïté pour la partie GitLab, livrable indépendamment.

**Inconvénients.** N'apporte, côté Sonar, qu'un gain limité par rapport au comportement actuel (l'utilisateur devrait encore rechercher son projet manuellement une fois sur la page d'accueil de l'instance) — ne répond que partiellement au constat initial pour la moitié Sonar du point. Traite les deux natures de source de façon asymétrique, ce qui peut surprendre dans l'interface (un clic productif pour GitLab, un clic quasiment inutile pour Sonar).

**Impact code/documentation.** Comme l'option 1 pour la partie GitLab ; pour la partie Sonar, un lien vers `urlBase` seul (aucune fonction de construction par `idExterne`).

## 4. Questions ouvertes nécessitant un arbitrage humain

1. Le lien direct vers une source Sonar doit-il traiter SonarQube auto-hébergé et SonarCloud de façon uniforme (option 1, au prix d'un lien incorrect pour SonarCloud), avec une distinction explicite par détection d'hôte (option 2), ou par un repli sans deep-link tant que la question n'est pas tranchée (option 3) ? Cette question dépend directement de l'usage réel prévu de l'application : les instances Sonar effectivement déclarées ou envisagées à ce jour sont-elles exclusivement auto-hébergées, ou une instance SonarCloud est-elle également concernée ?
2. Si l'option 2 est retenue, le lien SonarCloud construit doit-il inclure un paramètre `organization`, et si oui, celui-ci doit-il être ajouté comme nouveau champ du modèle `Instance` (avec impact sur le formulaire de création d'instance et sur la persistance Rust), ou l'absence de ce paramètre dans l'URL est-elle acceptable en pratique (résolution du projet par sa seule clé, sans organisation, à confirmer par un essai réel sur une instance SonarCloud plutôt que par la présente analyse documentaire) ?
3. Le lien GitLab reposant sur un comportement de redirection web non contractualisé au même titre que l'API REST v4 (cf. 2.4), ce risque de rupture future est-il jugé acceptable au regard du gain d'ergonomie, ou une vérification/alerte doit-elle être envisagée si ce lien s'avère un jour ne plus fonctionner (par exemple, un simple message d'aide au survol indiquant qu'il s'agit d'un lien vers la page du dépôt, pour limiter la surprise en cas d'échec) ?
4. Ce point relève-t-il d'une simple mise à jour de `US-008` (gestion des sources, qui couvre déjà l'affichage/la saisie de `idExterne`/`urlBase`) plutôt que d'une nouvelle user story dédiée, sur le modèle déjà retenu par d'autres compléments mineurs et autonomes de cette même recette (ex. C15-06, rattaché à `US-042` nouvelle plutôt qu'à une US existante, à comparer avec le choix effectivement arbitré pour ce point voisin) ?
5. Le lien doit-il apparaître uniquement dans la Fiche projet (périmètre strict du constat C15-13), ou également sur l'écran Administration des sources, qui n'affiche aujourd'hui aucun lien cliquable ni `urlBase` en regard de chaque source (cf. 2.2) et souffre du même défaut d'ergonomie ?
6. Le point voisin C15-06 (copie rapide de référence de dépendance, déjà traité) a explicitement noté, dans son analyse de gabarit, que la lacune touchant C15-13 est la « seconde occurrence » d'un même besoin générique (« toute entité externe référencée est cliquable vers son origine »). L'arbitrage souhaite-t-il, à cette occasion, également acter une règle générale correspondante dans la charte d'ergonomie (`10_charteErgonomie.md`), comme le suggère le plan lui-même, ou traiter ce point strictement au périmètre de la Fiche projet sans généralisation immédiate ?

## 5. Proposition d'identifiants US/RG provisoires (mise à jour après arbitrage)

Arbitrage humain rendu le 2026-08-18 : **option 1 retenue** (format unique SonarQube pour toute instance Sonar, sans distinction SonarCloud), périmètre **étendu à l'écran Administration des sources**, lien GitLab assorti d'un **indice au survol** signalant son caractère non contractuel, et **règle générale actée** dans `10_charteErgonomie.md` (« toute entité externe référencée est cliquable vers son origine »).

Numérotation coordonnée avec les cinq autres points `C15-NN` de cette même phase pour éviter toute collision d'identifiant (cf. `docs/03_plan/analyse_C15-10.md` à `analyse_C15-12.md`, qui consomment déjà `RG-042` à `RG-044` dans l'ordre de traitement retenu) : le point de vigilance précédemment signalé dans cette section (collision avec `analyse_C15-11.md` sur `US-045`/`RG-042`) est donc levé.

Aucun nouvel `US-NNN` n'est nécessaire pour ce point : la gestion des sources relève déjà de `US-008` (« Gérer les sources d'un projet »), complétée d'un critère d'acceptation relatif à l'affichage d'un lien direct.

- **RG-045** (provisoire), rattachée à `US-008` existante, à ranger dans le domaine fonctionnel « Sources et connecteurs » de `05_reglesGestion.md` aux côtés de `RG-036` : documente le format de construction du lien direct (`{urlBase}/projects/{idExterne}` pour GitLab, `{urlBase}/dashboard?id={idExterne}` pour Sonar, avec mention explicite de la limite connue vis-à-vis de SonarCloud), son extension à l'écran Sources, et l'indice au survol du lien GitLab.

Cette numérotation reste une proposition provisoire à confirmer au moment de la qualification documentaire effective, qui devra également porter la nouvelle règle générale de `10_charteErgonomie.md`.
