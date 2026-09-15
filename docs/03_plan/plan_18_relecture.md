<!-- Document rédigé avec l'assistance de l'IA (Claude Code), conformément à la mention d'origine requise par docs/02_documentation/01_modalitesUsageEtConventions.md. Relecture conduite en contexte isolé (session dédiée, sans le contexte du Codeur), à la demande explicite de l'utilisateur (2026-09-07). Ce document liste des constats de relecture ; aucun n'est tranché, chaque point reste une décision humaine. -->

# Relecture du plan_18 — Date de prise en charge (achèvement de F17)

## Statut du document

Relecture de l'intégralité de la livraison `plan_18_datePriseEnCharge.md` : documents normatifs (commit `e34ad08`), code et tests Rust puis TypeScript (commits `c58be9e` et `b7bfbda`), et test de bout en bout.

Ce document recense les erreurs, avertissements et questions relevés à la relecture. Chaque constat porte un identifiant stable (`R18-E-NN` erreur, `R18-W-NN` avertissement, `R18-Q-NN` question).

**Suivi des corrections (2026-09-07).** À la demande de l'utilisateur, ces constats ont été corrigés dans la foulée : voir l'[Étape 38 du rapport de développement](../04_rapports/rapportDeDeveloppement.md#étape-38--plan_18-date-de-prise-en-charge--relecture-isolée-et-corrections) pour le détail des corrections appliquées, constat par constat. Décisions utilisateur du 2026-09-07 sur les trois points laissés ouverts : `R18-W-06` — en échec total d'audit, **aucun calcul de prise en charge n'est lancé** (le résultat serait perdu de toute façon) ; `R18-W-03(a)` — le masquage inter-canaux non reproduit est un **écart acceptable** ; `R18-Q-10` — régénération des captures **planifiée à l'incrément 8**.

## Sommaire

1. [Périmètre et méthode](#1-périmètre-et-méthode)
2. [Vérifications outillées](#2-vérifications-outillées)
3. [Erreurs](#3-erreurs)
4. [Avertissements](#4-avertissements)
5. [Questions et doutes](#5-questions-et-doutes)
6. [Points vérifiés conformes](#6-points-vérifiés-conformes)
7. [Suites proposées](#7-suites-proposées)

## 1. Périmètre et méthode

Commits relus : `e34ad08` (docs), `c58be9e` (« increments 1 à 5 »), `b7bfbda` (« increment 6-8 relus »). Le commit `7cd4e0c` (« mise à jour documentaire de relicats ») a été intégré entre les docs et le code du plan_18 : il relève de l'Étape 37 (clôture des Phases 13/14/15, abandon de l'updater Tauri), sans rapport avec le plan_18, et n'est pas couvert par cette relecture.

Méthode : lecture directe du code produit (jamais la seule foi des commentaires ou du rapport), confrontation systématique au texte du plan et aux documents normatifs mis à jour, exécution des vérifications outillées ci-dessous. Attention renforcée portée aux quatre domaines de vigilance (calcul d'indicateur, sécurité et confidentialité des données, architecture, conformité aux référentiels).

## 2. Vérifications outillées

Rejouées avec succès dans l'environnement de relecture :

- `cargo check --locked --all-targets` : succès ;
- `cargo clippy --locked --all-targets -- -D warnings` : succès, aucun avertissement ;
- `npm run typecheck` (`tsc --noEmit` sur `tsconfig.spec.json`) : succès ;
- `cargo test --lib` ciblé sur `persistance::prise_en_charge` : 13 tests, tous verts.

Non rejouées intégralement dans cette session (coût), mais annoncées vertes par le rapport de développement et cohérentes avec la lecture du code : suite `cargo test` complète, suite `jest` complète, `npm run lint`, `prettier --check`.

## 3. Erreurs

### R18-E-01 — Le parcours E2E n'a pas été étendu, alors que la documentation l'affirme

`16_normesTests.md` (section « Tests de bout en bout ») affirme : « Le parcours unique est complété par le plan_18 ([US-058]) : après la campagne, cocher la case « Calculer la date de prise en charge », intégrer le brouillon, ouvrir la Fiche projet et vérifier « Âge chez nous », relancer le bouton « recalculer » [...] puis ouvrir la Comparaison entre deux audits [...] ». La matrice de traçabilité du même document liste, pour la ligne plan_18, « [Tests de bout en bout] (étape de campagne + Fiche projet + Comparaison) ».

Or `e2e/parcours-complet.spec.ts` et `e2e/donnees-test.ts` n'ont pas été modifiés par le plan_18 (dernier commit les touchant : `c02cf6c`, plan_17 chapitre 3). L'incrément 8 du plan (« Documentation utilisateur + captures + revue croisée finale ») n'a donc pas livré son volet E2E. Le délai artificiel `DELAI_CALCUL_PRISE_EN_CHARGE_MS = 800` du bouchon, justifié dans le code par le besoin d'« exercer l'indicateur de chargement en `ng serve` », n'est en pratique exercé par aucun test de bout en bout.

Décision attendue : soit livrer l'extension du parcours E2E conformément au plan §11 et §12 (incrément 8), soit corriger `16_normesTests.md` (texte et matrice de traçabilité) pour ne pas affirmer une couverture inexistante. La règle générale n°13 (vérification croisée du document de tests) impose l'un ou l'autre.

### R18-E-02 — Le test d'intégration `#[ignore]` GitLab annoncé n'existe pas

`16_normesTests.md` (section « Tests d'intégration hors intégration continue ») ajoute : « un test d'intégration `#[ignore]` dédié exerce `rechercher_premier_commit_interne` contre une vraie instance (`SQM_TEST_GITLAB_*`), notamment sur un dépôt de plus de 10 000 commits sans en-tête `x-total-pages` (vérification du repli en parcours avant borné et du statut `indetermine_trop_de_commits` attendu), la valeur par défaut de `borneRecherchePremierCommitPages` (50) étant éprouvée à cette occasion ».

`src-tauri/src/connecteurs/tests_integration_reelle.rs` n'a pas été modifié par le plan_18 et ne contient aucun test exerçant `rechercher_premier_commit_interne`. Le point ouvert §14.3 du plan (« valider sur de vrais gros dépôts que le comportement `indetermine_trop_de_commits` est acceptable ») reste donc non instrumenté.

Décision attendue : ajouter le test `#[ignore]`, ou retirer l'affirmation de `16_normesTests.md`.

### R18-E-03 — Tests de la coordination Rust décrits mais déplacés côté TypeScript sans mise à jour du document de tests

`16_normesTests.md` (section « Tests unitaires », paragraphe cœur natif) décrit toujours, pour le module `persistance::prise_en_charge`, des tests de `recalcul_necessaire` (« sensible au changement d'empreinte ») et `identique` (« insensible à `calcule_le` / `empreinte_referentiel` »). La matrice de traçabilité les reprend sous « Tests unitaires Rust ».

Ces deux fonctions n'ont pas été implémentées dans le module Rust : elles ont été portées côté interface (`PriseEnChargeUtils`, `src/app/services/sansetat/jugement/prise-en-charge.utils.ts`), avec leurs tests dans `prise-en-charge.utils.spec.ts` — choix cohérent avec la décision §5.3 du plan (« logique triviale de comparaison, sans hash côté interface ») et documenté par un commentaire de bloc dans `prise_en_charge.rs`. Le comportement est donc bien testé, mais pas là où `16_normesTests.md` l'affirme.

Décision attendue : aligner `16_normesTests.md` (texte du paragraphe cœur natif et matrice de traçabilité) sur l'emplacement réel des tests. Constat de méthode : c'est le troisième point où le document de tests décrit une couverture qui n'existe pas à l'endroit indiqué (cf. R18-E-01, R18-E-02) — la vérification croisée règle n°13 mérite une passe complète sur ce fichier.

## 4. Avertissements

### R18-W-01 — Deux représentations hétérogènes de l'entrée de journal `premierCommitInterne`

Le chemin « bouton Recalculer de la Fiche projet » (`DonneesApplicationService.enregistrerPriseEnChargeProjet`) consigne `avant` / `apres` sous forme de descripteur textuel construit par `descripteurPriseEnCharge` : `« 2021-03-15 (determine) »`, `« — (statut) »` ou `« — »` ; origine `Administration`.

Le chemin « intégration du brouillon de campagne » (`persistance::audit::integrer_brouillon`) consigne `serde_json::to_value(&premier_commit_interne)`, c'est-à-dire l'objet JSON complet ; origine `Campagne`.

Le champ `objet` est identique dans les deux cas (`groupes/{groupeId}/projets/{projetId}/premierCommitInterne`). Les autres entrées de journal du cœur natif utilisent la forme `Value` JSON (`qualifier_membre` sérialise `&membre_qualifie`) : c'est le chemin TypeScript qui est l'exception. Un lecteur du journal verra des entrées hétérogènes pour la même donnée.

Décision attendue : uniformiser les deux chemins (JSON des deux côtés, aligné sur la convention Rust existante, semble le plus simple).

### R18-W-02 — `empreinte_referentiel_interne` ne normalise ni la casse ni les espaces des critères

`CorrespondanceInterne::correspond` compare les courriels en minuscules et sans espaces de bordure, mais `empreinte_referentiel_interne` projette `membre.critere` et `membre.alias_email` bruts avant tri et condensation. Deux règles fonctionnellement équivalentes ne différant que par la casse (`Corp.FR` / `corp.fr`) produisent des empreintes distinctes.

Conséquence : après une simple retouche de casse d'une règle `interne`, la Fiche projet affiche « les membres internes ont changé » et le pré-filtre de campagne relance le calcul ; le résultat étant identique, `PriseEnChargeUtils.identique` conclut « inchangé » et aucune écriture n'a lieu. Impact fonctionnel donc limité, mais l'incohérence entre les deux fonctions du même module (normalisation ici, pas là) mérite d'être tranchée. RG-058 exige une « sérialisation stable et triée » sans imposer la normalisation.

### R18-W-03 — `construire_correspondance_interne` : masquage inter-canaux non reproduit et normalisation asymétrique

Deux points sur la construction de la table de correspondance (`persistance::prise_en_charge`) :

- **(a)** L'en-tête du module documente explicitement que le masquage inter-canaux (un courriel exact de statut non `interne` masquant une règle de domaine `interne` qui le couvrirait) n'est pas reproduit. **Résolu (2026-09-07, décision utilisateur) : écart acceptable** — une règle de domaine `interne` désigne délibérément ce domaine comme interne pour la datation ; l'en-tête du module a été mis à jour en ce sens (plus de « à trancher »).
- **(b)** L'exclusion « même canal » normalise les domaines des deux côtés (`trim`, `@` de tête, minuscules) mais pas les courriels exacts : `courriels_non_internes` et la comparaison utilisent `membre.critere.as_str()` brut. Une règle `client` `Bob@Corp.fr` ne masquerait donc pas une règle `interne` `bob@corp.fr`. Traitement incohérent entre les deux canaux.

### R18-W-04 — `Brouillon.prises_en_charge` : palier de migration `10` → `11` décrit de façon incomplète

Le commit `b7bfbda` ajoute un troisième changement de forme du schéma sous la version `11` : le champ `Brouillon.prises_en_charge: Option<HashMap<String, PremierCommitInterne>>`. Ni `12_modeleDonnees.md` (paragraphe du palier `10` → `11`), ni la Rustdoc de `migration_10_vers_11`, ni l'en-tête de `migration.rs` ne l'énumèrent : ils ne citent que l'union `PremierCommitInterne` et le champ `MembreConnu.partiLe`.

Le champ est additif (`Option`, `serde(default)`, `skip_serializing_if`) et un brouillon est transitoire : aucun risque fonctionnel. Mais la description du palier est incomplète (elle prétend couvrir « les deux changements de forme » alors qu'il y en a trois).

### R18-W-05 — `construireAgeChezNousLabel` : `switch` sans garde d'exhaustivité, contrairement au reste du plan

> **Résolu comme non-constat (2026-09-07).** La règle ESLint `switch-exhaustiveness-check` (`error`, CI-bloquante) signale déjà toute variante future non couverte par un `switch` sur discriminant. Le commentaire trompeur de `orchestrateur-campagne.service.ts` (qui invoquait une « erreur de compilation ») a été corrigé pour citer cette règle. Aucun `default: assertNever` à ajouter.


`OrchestrateurCampagneService.calculerPriseEnChargeSiNecessaire` porte un commentaire « switch exhaustif [...] corrigé en relecture : un `if`/ternaire laissait une future variante [...] tomber silencieusement dans `undefined` ». Le même souci n'a pas été appliqué à `SqmFicheProjetComponent.construireAgeChezNousLabel` (switch sur les six variantes de `statut`) ni à `recalculerPriseEnCharge` (switch sur `inchange` / `echec` / `change`) : aucun `default` ni assertion d'exhaustivité. L'ajout d'un septième statut ne serait signalé que par `noImplicitReturns` (un chemin renverrait `undefined`), pas par une erreur de compilation ciblée. Rigueur inégale vis-à-vis de la norme 09 (« switch exhaustif sur le discriminant `type` d'un Résultat »).

### R18-W-06 — Perte silencieuse des calculs de prise en charge d'une campagne en échec total

`persistance::audit::enregistrer_brouillon` : lorsqu'une campagne ne produit aucun `resultats_par_projet` (échec total des audits), aucun brouillon n'est créé, et les entrées de `prises_en_charge` calculées pour ces projets sont abandonnées.

> **Résolu (2026-09-07, décision utilisateur).** Corrigé à la source : `OrchestrateurCampagneService.auditerProjet` ne lance plus aucun calcul de prise en charge pour un projet dont l'audit n'a produit aucun résultat — le résultat serait perdu de toute façon, et le parcours de pagination GitLab est épargné. Le traitement défensif côté cœur natif (`Brouillon.prises_en_charge` orpheline) est conservé mais n'est plus alimenté par le flux de campagne.

### R18-W-07 — Type d'erreur de `calculer_prise_en_charge_projet` : écart au pseudo-code du plan non tracé dans la conception détaillée

Le pseudo-code du plan §4.3 écrit `Result<PremierCommitInterne, ErreurFacade>` pour les deux commandes. L'implémentation retient `ErreurConnecteur` pour `calculer_prise_en_charge_projet` (alignement sur `commandes::audit`) et `ErreurFacade` pour `empreinte_referentiel_interne`. Écart signalé dans le rapport de développement, mais `13_conceptionDetaillee.md` reste muet sur le type d'erreur (il ne mentionne que la signature `(projetId, donnees, etat)` et le type de retour `PremierCommitInterne`). À confirmer comme décision d'architecture assumée.

### R18-W-08 — Validation « date non future » : référentiels de temps divergents interface / cœur natif

La validation `partiLe` compare :

- côté interface (`membres-connus-admin.component.ts`, `saisie-masse-membres.utils.ts`) à `Date.now()` ou à `new Date().toISOString().slice(0, 10)` (jour, en UTC pour le second, mélange local/UTC selon le chemin) ;
- côté cœur natif (`valider_parti_le`) au jour UTC dérivé de `horodatage`.

Cas limite : un utilisateur à fuseau très oriental, en fin de journée locale, peut saisir une date que l'interface accepte et que le cœur natif rejette (ou l'inverse). Impact marginal (message d'erreur cohérent, `ErreurFacade::DateDepartInvalide` correctement remontée), mais la règle « non postérieure au jour de saisie » n'est pas appliquée sur la même base de temps aux deux étages.

### R18-W-09 — Affichage `partiLe` via `DatePipe` sur une chaîne ISO date-seule

`membres-connus-admin.component.html` : `{{ regle.partiLe | date: 'dd/MM/yyyy' }}`. Le `DatePipe` d'Angular interprète une chaîne `AAAA-MM-JJ` (sans heure) en UTC et la restitue dans le fuseau local du poste : affichage possible de `29/06/2025` pour une valeur stockée `2025-06-30` sur un poste à offset négatif. `09_maquettes.md` reprend la même forme (`JJ/MM/AAAA`). Cosmétique, mais visible.

**Correction erronée (2026-09-07, commit `d97d3c9`) et remplacement (2026-09-15).** La correction effectivement apportée à ce constat a ajouté le paramètre de fuseau `:'UTC'` au `DatePipe` (`date:'dd/MM/yyyy':'UTC'`), sur la fausse hypothèse que cela imposerait une lecture UTC de la chaîne d'entrée. En réalité, `DatePipe` avait déjà construit l'instant via les accesseurs **locaux** du poste (`isoStringToDate` d'Angular, groupe de capture du fuseau absent de la chaîne) ; le paramètre `:'UTC'` ne fait que reconvertir cet instant local vers UTC à l'affichage, ce qui **inverse** le sens du décalage décrit ci-dessus (désormais visible sur un poste à l'**est** d'UTC, telle la France, plutôt qu'à l'ouest) : `31/08/2026` affiché pour une valeur stockée `2026-09-01`. La relecture ayant eu lieu en conteneur réglé sur UTC, ce défaut inverse n'y était pas visible. Cette correction est remplacée par [plan_20](./plan_20_triMembresConnusEtDatesCalendaires.md) Partie B (utilitaire pur `DateCalendaireUtils.formaterFr`, sans passer par `Date` ni `DatePipe`) : R18-W-09 est donc à considérer comme une correction **erronée**, non comme un constat clos.

### R18-W-10 — `02_documentation/05_reglesGestion.md` : discontinuité `RG-058` → `RG-061` sans note, `RG-059` dans une autre section

Dans la table « Membres et sécurité des accès », l'enchaînement est `RG-041`, `RG-058`, `RG-061` ; `RG-059` figure dans la section « Constat, jugement et politique IA » (défendable : elle porte sur l'écran de comparaison), et `RG-060` n'existe pas. `04_casUsage.md` explique explicitement que `US-060` est tenu libre pour plan_17 chapitre 4 ; `05_reglesGestion.md` n'a pas la note équivalente pour `RG-060`. Un lecteur de la table voit un trou de numérotation sans explication. Ajouter une note d'une ligne.

## 5. Questions et doutes

### R18-Q-01 — RG-058 : « format identique à `audit.date` » est trompeur

RG-058 et la décision 16 du plan écrivent que `premierCommitInterne.date` est « au même format que `audit.date` ». En réalité, `Audit.date` d'un audit **régulier** est un horodatage ISO complet (`new Date().toISOString()`, `orchestrateur-campagne.service.ts:755`) ; seul un audit **historique** porte `AAAA-MM-JJ` (`dateCiblee`). La comparaison stricte de chaînes de `comparaison-audits.component.ts` (`audit.date === datePriseEnCharge`) ne peut donc matcher qu'un audit historique — comportement voulu et correctement documenté dans `InfoPriseEnCharge`, mais la formulation de RG-058 laisse croire qu'un audit régulier produit le jour même de la prise en charge pourrait correspondre. Préciser « au format d'un audit historique ».

### R18-Q-02 — Anomalies de prise en charge en campagne : catégorie `reponseInattendue` générique

`OrchestrateurCampagneService.calculerPriseEnChargeSiNecessaire` consigne les anomalies avec `anomalie: { type: 'reponseInattendue', message }`, pour l'échec de résolution d'empreinte (`priseEnCharge.empreinte`) comme pour toute anomalie de connecteur réelle (`priseEnCharge.calcul`). La catégorie d'origine de l'anomalie connecteur (authentification, droits, délai...) est perdue ; `messageErreurConnecteur` n'en restitue qu'un libellé. Plan §5.3 et RG-021 demandent « une catégorie claire ». Est-ce suffisant, ou faut-il une catégorie d'extension dédiée (façon `depotVide`, `credentialAbsent`) pour la famille « prise en charge » ?

### R18-Q-03 — `rechercher_premier_commit_interne`, cas nominal : page 1 téléchargée puis jetée

Quand `x-total-pages` est présent et que la fenêtre bornée ne remonte pas jusqu'à la page 1 (`arret > 1`), la page 1 est tout de même récupérée (pour lire l'en-tête), puis ses commits sont ignorés. Un commit interne présent uniquement dans les pages récentes non parcourues produit `TropDeCommits`. Conforme à RG-058 (« fenêtre bornée épuisée sans correspondance → `indetermine_trop_de_commits` »), mais on écarte de l'information déjà en mémoire. Choix délibéré (ne retenir que la fenêtre la plus ancienne, cohérente entre les deux régimes) — à confirmer.

### R18-Q-04 — Lien « Marquer comme parti » : canal `email` tributaire de `emailPublic`

`calculerCritereMarquerParti` résout la règle nominative via `{ username: membre.username, email: membre.emailPublic }`. L'API GitLab n'expose `emailPublic` que rarement. En pratique le lien n'apparaîtra donc que pour des membres résolus par `username`. Le cas paraît cohérent (si le membre a été résolu `interne` par une règle `email`, c'est que son courriel était connu), mais RG-061 et `08_arborescenceNavigation.md` annoncent « username ou email » sans réserve. Confirmer que la couverture réelle est acceptable.

### R18-Q-05 — `empreinte_referentiel_interne` : `unwrap_or_default` masque un échec de sérialisation

`serde_json::to_vec(&triplets).unwrap_or_default()` : en cas d'échec (jugé impossible pour un `Vec` de tuples de chaînes), l'empreinte devient `sha256:` du vecteur d'octets vide — valeur identique pour tout groupe. `unwrap_or_default` respecte l'interdiction de `.unwrap()`, mais transforme un bug improbable en collision silencieuse d'empreintes plutôt qu'en erreur visible. Le commentaire le reconnaît. Acceptable en l'état ?

### R18-Q-06 — Origine de journal `« Campagne »` : reconnue par l'écran Journal ?

`integrer_brouillon` consigne l'entrée de prise en charge avec `origine: "Campagne"`. Les origines déjà en usage sont `Administration` et `qualificationDepuisAlerte`. Vérifier que l'écran Journal (filtre/affichage par origine) traite correctement cette nouvelle valeur.

### R18-Q-07 — Nouveau paramètre de requête `partiLe` : transit sur trois niveaux de composants

Le lien « Marquer comme parti » ajoute un paramètre de requête `partiLe`, relayé par `input()` à travers `SqmAdministrationComponent` → `SqmGroupesAdminComponent` → `SqmMembresConnusAdminComponent` (`withComponentInputBinding()`). `08_arborescenceNavigation.md` affirme que ce lien « ne crée pas de quatrième niveau de navigation ». Le typecheck passe et le mécanisme est identique à celui de `critere` / `typeCritere` déjà en place ; simple confirmation que rien dans la configuration de route ne filtre ce paramètre supplémentaire.

### R18-Q-08 — Lien « Marquer comme parti » masqué si la règle porte déjà `partiLe`

`calculerCritereMarquerParti` renvoie `undefined` lorsque `regleNominative.partiLe !== undefined`. Comportement raisonnable (rien à faire si la personne est déjà marquée partie), mais ni le plan §8.5 ni RG-061 ne le mentionnent. Confirmer comme choix voulu (et éventuellement le documenter).

### R18-Q-09 — Bouchon TypeScript : trois des six statuts jamais produits

`BouchonAdministrationUtils.calculerPriseEnChargeProjet` ne renvoie que `aucune_regle_interne`, `non_applicable` et `determine`. `aucun_membre_interne`, `indetermine_trop_de_commits` et `depot_vide` ne sont jamais produits en `ng serve`. Un futur test E2E (cf. R18-E-01) ou une recette manuelle ne pourrait pas exercer ces trois libellés de la Fiche projet. Suffisant pour la recette manuelle ?

### R18-Q-10 — `guide-utilisateur.md` : capture non régénérée

Le plan §10 demande pour `guide-utilisateur.md` une « capture régénérée ». `docs/assets/captures/fiche-projet.png` et `constitution-campagne.png` n'ont pas été régénérées (dernier commit : `b792308`). Le bouton « Recalculer » et la carte « Options » n'apparaissent donc pas dans les illustrations du guide. La régénération est une procédure manuelle hors pipeline (`17_posteDeveloppeur.md`) : à planifier comme reste-à-faire de l'incrément 8.

## 6. Points vérifiés conformes

Contrôlés par lecture directe du code produit et jugés conformes au plan et aux normes :

- **Forme `serde` de `PremierCommitInterne`** : `#[serde(flatten)]` d'un `enum` interne-taggé (`#[serde(tag = "statut", rename_all = "snake_case")]`) dans une struct portant `calculeLe` / `empreinteReferentiel` ; round-trip prouvé identique à la forme plate historique pour la variante `Determine` (tests `racine.rs` et `migration.rs`). Le point ouvert §14.2 du plan (prototypage `serde`) est levé.
- **Palier de migration `10` → `11`** : transformation nulle, testé en round-trip avec un fragment de l'ancienne forme plate et deux règles `MembreConnu` (avec / sans `partiLe`).
- **`rechercher_premier_commit_interne`** : algorithme nominal (fenêtre la plus ancienne) et repli (parcours avant borné sans `x-total-pages`) ; retenue du commit de `committed_date` minimale ; troncature UTC (`tronquer_date_utc`, testée sur horodatage à offset) ; `author_email` absent ignoré ; propagation des anomalies 401 / 403 / 5xx / délai. Quinze tests `wiremock`.
- **`calculer_prise_en_charge`** : ordre des décisions RG-058 respecté (aucune règle interne sans appel réseau → non applicable → déterminé date minimale → dépôt vide → indéterminé → aucun membre interne) ; connecteur injecté (`Pin<Box<dyn Future + Send>>`), aucune écriture disque ; onze tests.
- **Frontière de couches** : `commandes/prise_en_charge.rs` prend les credentials exclusivement dans `EtatSession` ; la Façade TS (`FacadeAdministrationService`) reste générique sur le type de racine (aucun import de `services/avecetat/`) ; `PriseEnChargeUtils` consomme une forme structurelle minimale sans importer `PremierCommitInterne`.
- **Journalisation des commandes** : `calculer_prise_en_charge_projet` et `empreinte_referentiel_interne` journalisent début et fin ; le courriel d'auteur n'est jamais journalisé (SHA et date via `consigner_resultat_connecteur`).
- **Décision 6 (« pas d'écriture si inchangé »)** : `PriseEnChargeUtils.identique` (statut + date uniquement) est appliqué sur les deux voies (bouton Fiche projet, orchestrateur de campagne) ; la racine en mémoire n'est substituée qu'après écriture disque réussie.
- **Cycle de vie du brouillon** : `Brouillon.prises_en_charge` correctement ciblé par sélection (`entrees_ciblees` assoupli pour une entrée orpheline), extrait par `extraire_prises_en_charge_ciblees`, appliqué avec une entrée de journal par projet à l'intégration, abandonné au rejet, brouillon non purgé tant qu'une prise en charge orpheline subsiste — chaque cas couvert par un test dédié (dont des corrections de relecture explicites).
- **Empreinte hors `partiLe`** : vérifié dans `empreinte_referentiel_interne` (Rust et bouchon) et testé (`empreinte_invariante_vis_a_vis_de_parti_le_et_des_regles_non_internes`).
- **Revalidation `partiLe` côté cœur natif** : `valider_parti_le` (interdite sur `DomaineEmail`, date `AAAA-MM-JJ` valide, non future) appelée avant toute mutation ; `ErreurAdministration::DateDepartInvalide` → `ErreurFacade::DateDepartInvalide` → catégorie TS `dateDepartInvalide` (neuf `switch` exhaustifs mis à jour) ; ligne invalide en saisie de masse rejetée sans bloquer les autres.
- **Export PNG de la Fiche projet** : bouton « Recalculer », suggestion et modale de mot de passe portent `fiche-projet__hors-capture`, exclue par le `filter` de `toPng` (mécanisme d'exclusion introduit par cet incrément).
- **`resoudreRegleNominative`** : précédences 1 et 2 seulement (jamais le domaine), conflit de même niveau → `undefined`, restitution de l'objet règle d'origine (générique sur `TRegle`).
- **Build, analyse statique et typage** : `cargo check`/`clippy -D warnings`/`tsc` verts (cf. §2).

## 7. Suites proposées

Ordre suggéré pour l'arbitrage humain puis les corrections :

1. Trancher les erreurs `R18-E-01` à `R18-E-03` : décider livraison E2E + test d'intégration, ou correction de `16_normesTests.md` ; dans tous les cas, refaire une passe complète de vérification croisée (règle n°13) sur `16_normesTests.md`.
2. Trancher les décisions fonctionnelles en attente : `R18-W-03(a)` (masquage inter-canaux), `R18-W-06` (perte des prises en charge d'une campagne en échec total), `R18-Q-04` (couverture du lien « Marquer comme parti »).
3. Corriger les incohérences sans ambiguïté : `R18-W-01` (format de journal unifié), `R18-W-02` et `R18-W-03(b)` (normalisation des critères dans l'empreinte et l'exclusion même-canal), `R18-W-04` (description du palier de migration), `R18-W-05` (gardes d'exhaustivité), `R18-Q-01` (formulation de RG-058).
4. Traiter les points mineurs et cosmétiques : `R18-W-08` à `R18-W-10`, `R18-Q-05` à `R18-Q-10`.
5. Régénérer les captures du guide utilisateur (`R18-Q-10`) et clore l'incrément 8.
