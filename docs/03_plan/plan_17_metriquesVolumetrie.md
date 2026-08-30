<!-- Document rédigé avec l'assistance de l'IA (Claude Code), conformément à la mention d'origine requise par docs/02_documentation/01_modalitesUsageEtConventions.md. Plan de conception établi à partir d'une demande utilisateur explicite (2026-08-30) ; il précède la mise à jour des documents normatifs et tout développement, qui restent conditionnés à une validation humaine explicite. -->

# Conception — Onglet Métriques de l'écran Administration et volumétrie du fichier de données

## Statut du document

Ce document est structuré en chapitres. Le **chapitre 1** (volumétrie du fichier de données, onglet Métriques de l'écran Administration) et le **chapitre 2** (ventilation des dépendances par écosystème sur la Fiche projet et la Comparaison d'audits, rédigé le 2026-08-30) sont indépendants et traitent des sujets distincts. Le sommaire et la numérotation accueillent le chapitre 2 sans renumérotation du chapitre 1.

Le regroupement de deux sujets sans lien direct dans un même document résulte d'une demande explicite ; le titre et le nom de fichier du document restent à ajuster si besoin (cf. paragraphe suivant).

Comme `plan_16_navigationFiltrageEtVues.md`, ce fichier est une exception à la règle générale (les évolutions postérieures à la Phase 15 sont normalement tracées sous forme d'entrées « Étape N » du [rapport de développement](../04_rapports/rapportDeDeveloppement.md)) : son emplacement et son nom restent à ajuster si besoin.

## Sommaire

- [Chapitre 1 — Onglet « Métriques » de volumétrie du fichier (US-055 / RG-055)](#chapitre-1--onglet--métriques--de-volumétrie-du-fichier-us-055--rg-055)
  1. [Objet et statut](#1-objet-et-statut)
  2. [Décisions actées](#2-décisions-actées)
  3. [Périmètre et identifiants d'exigence proposés](#3-périmètre-et-identifiants-dexigence-proposés)
  4. [Partie A — Cœur natif : calcul de volumétrie](#4-partie-a--cœur-natif--calcul-de-volumétrie)
  5. [Partie B — Façade, Store, utilitaire et interface](#5-partie-b--façade-store-utilitaire-et-interface)
  6. [Impacts sur le modèle de données et migration](#6-impacts-sur-le-modèle-de-données-et-migration)
  7. [Impacts documentaires](#7-impacts-documentaires)
  8. [Impacts sur les tests](#8-impacts-sur-les-tests)
  9. [Découpage en incréments](#9-découpage-en-incréments)
  10. [Vérification de bout en bout](#10-vérification-de-bout-en-bout)
  11. [Points restant ouverts](#11-points-restant-ouverts)
- [Chapitre 2 — Ventilation des dépendances par écosystème sur la Fiche projet et la Comparaison d'audits (US-056 / RG-056)](#chapitre-2--ventilation-des-dépendances-par-écosystème-sur-la-fiche-projet-et-la-comparaison-daudits-us-056--rg-056)
  1. [Objet et statut](#1-objet-et-statut-1)
  2. [Décisions actées](#2-décisions-actées-1)
  3. [Périmètre et identifiants d'exigence proposés](#3-périmètre-et-identifiants-dexigence-proposés-1)
  4. [Partie A — Utilitaire de classification d'écosystème](#4-partie-a--utilitaire-de-classification-décosystème)
  5. [Partie B — Fiche projet (F12)](#5-partie-b--fiche-projet-f12)
  6. [Partie C — Comparaison d'audits (F13)](#6-partie-c--comparaison-daudits-f13)
  7. [Impacts sur le modèle de données et migration](#7-impacts-sur-le-modèle-de-données-et-migration-1)
  8. [Impacts documentaires](#8-impacts-documentaires-1)
  9. [Impacts sur les tests](#9-impacts-sur-les-tests-1)
  10. [Découpage en incréments](#10-découpage-en-incréments-1)
  11. [Vérification de bout en bout](#11-vérification-de-bout-en-bout)
  12. [Points restant ouverts](#12-points-restant-ouverts)

# Chapitre 1 — Onglet « Métriques » de volumétrie du fichier (US-055 / RG-055)

## 1. Objet et statut

Ce chapitre décrit l'ajout, à l'écran **Administration**, d'un quatrième onglet **Métriques**, en lecture seule, présentant la volumétrie du fichier de données ouvert.

L'onglet affiche :

- des compteurs : nombre de groupes, de projets, d'audits, de règles de membre (`membresConnus`), de règles de dépendance (`referentiels.reglesDependances`) ;
- le poids **total du fichier sur disque** (compressé puis chiffré) ;
- le poids **total du JSON en clair** (sérialisation de la racine avant compression et chiffrement) ;
- la **ventilation en pourcentage** du JSON en clair sur cinq postes dont la somme fait exactement 100 % : `paramétrage` (`parametres` + `referentiels` + `vuesEnregistrees`), `journal` (`journal`), `administration` (contenu de `groupes[]` hors audits : projets, sources, membres connus, annotations, instances, indicateurs désactivés), `audits` (`groupes[].projets[].audits[]` + `campagnes` + `brouillon`), et `autre` (reste : `meta`, `traitementsAlertes`, `versionSchema` et surcoût structurel du JSON).

L'onglet ne réalise aucune mutation : il ne sauvegarde pas le fichier et ne redemande jamais le mot de passe ([RG-002](../02_documentation/05_reglesGestion.md#stockage-et-confidentialité-des-données) n'est pas déclenchée).

Aucune commande native ne fournit aujourd'hui la taille du fichier de données ni celle de sa sérialisation JSON. Les seules mesures approchantes existantes sont l'estimation `JSON.stringify(racine).length` de `shell.component.ts` (comparée au seuil de RG-032) et les champs `octetsAvant`/`octetsApres` (taille compressée) renvoyés par les prévisualisations de purge de `persistance/purge.rs`.

Statut : ce plan précède la mise à jour des documents normatifs et tout développement, qui restent conditionnés à une validation humaine explicite. La méthode du projet s'applique : arbitrage humain, puis mise à jour des documents normatifs, puis développement, sans passage à l'étape suivante sans validation explicite de la précédente.

## 2. Décisions actées

Décisions fonctionnelles, issues des questions posées à l'utilisateur le 2026-08-30 :

- le poste `paramétrage` regroupe `parametres`, `referentiels` et `vuesEnregistrees` ; le `journal` constitue un poste distinct ;
- le poste `administration` exclut les audits ;
- le poste `audits` inclut les campagnes et le brouillon de campagne en cours ;
- un cinquième poste `autre` est affiché explicitement afin que la somme des cinq postes fasse exactement 100 %.

Décisions d'architecture :

1. Une seule commande native, `calculer_metriques_volumetrie(chemin, donnees)`, calcule toutes les tailles. L'accès au disque est réservé au cœur natif et la sérialisation JSON doit être identique à celle réellement persistée. Les cinq compteurs, eux, restent calculés côté interface dans le composant, par dérivation du signal `racine()` (coût négligeable, réactivité immédiate, cohérence avec l'état en mémoire courant). Compteurs et tailles ne sont pas mélangés dans une même commande asynchrone.
2. Le type de retour expose des octets bruts. Les pourcentages sont calculés côté interface par la méthode du plus fort reste (*largest remainder*), qui garantit une somme d'exactement 100.
3. Le poste `administration` est obtenu par différence : pour chaque groupe, `taille(groupe) − taille(groupe.projets)`, auquel s'ajoute, pour chaque projet, `taille(projet) − taille(projet.audits)` (soustraction saturée). Le poste `autre` est ensuite le reste : `tailleJsonClair − paramétrage − journal − administration − audits`. Le surcoût structurel du JSON (noms de clés, accolades, enveloppes de tableaux `groupes` et `campagnes`, `meta`, `versionSchema`) tombe ainsi mécaniquement dans `autre`, et la somme des cinq postes vaut exactement `tailleJsonClairOctets`.
4. Le paramètre `chemin` est optionnel : un fichier jamais sauvegardé, ou un échec de lecture des métadonnées du fichier, produit `tailleDisqueOctets` à `null`. L'interface affiche alors « — non sauvegardé » et précise, dans tous les cas, que la taille sur disque reflète la dernière sauvegarde et non l'état en mémoire courant.
5. Le sous-composant déclenche l'appel natif à sa construction, puisqu'il n'est instancié qu'à l'activation de l'onglet (bloc `@switch` / `@case` de la coquille). Il porte des signaux `enCours` et `metriques` ; toute erreur est routée vers `NotificationService.erreur`.

## 3. Périmètre et identifiants d'exigence proposés

Derniers identifiants consommés à la date de rédaction : `US-054`, `RG-054`. Allocation proposée, à reconfirmer au moment de la qualification effective (une autre session peut consommer des identifiants entre-temps ; en ce cas, décaler l'ensemble en bloc sans réintroduire de trou, sur le principe déjà appliqué en Étape 25).

| identifiant | intitulé | type |
|---|---|---|
| US-055 | Consulter la volumétrie du fichier de données (compteurs, poids disque, poids JSON en clair, ventilation en cinq postes) | Consultation — Could have |
| RG-055 | Composition des compteurs et de la ventilation en cinq postes de l'onglet Métriques | règle de gestion |

## 4. Partie A — Cœur natif : calcul de volumétrie

### Nouveau module `src-tauri/src/persistance/volumetrie.rs`

En-tête de commentaire de mention IA, puis documentation de module `//!` référençant US-055 et RG-055 et décrivant l'algorithme (calcul par sous-arbre, différence pour `administration`, reste pour `autre`). Déclaration `pub(crate) mod volumetrie;` dans `src-tauri/src/persistance.rs`, en respectant l'ordre alphabétique des modules (avant `vues`).

Structures, chacune avec Rustdoc `///`, visibilité `pub(crate)`, `#[derive(Debug, Clone, Serialize, PartialEq)]` et `#[serde(rename_all = "camelCase")]`, sur le modèle exact de `PrevisualisationPurge` :

- `MetriquesVolumetrie { taille_disque_octets: Option<u64>, taille_json_clair_octets: u64, ventilation: VentilationJsonClair }` ;
- `VentilationJsonClair { parametrage_octets: u64, journal_octets: u64, administration_octets: u64, audits_octets: u64, autre_octets: u64 }`.

Fonctions :

- `fn taille_json<T: serde::Serialize>(valeur: &T) -> u64` : `serde_json::to_vec(valeur)` (jamais la variante *pretty*, pour rester cohérent avec `moteur::chiffrer_et_ecrire`), longueur en octets, `0` en cas d'échec de sérialisation (non atteignable en pratique pour une racine valide, garde défensive alignée sur `taille_compressee`) ;
- `pub(crate) fn calculer_metriques(donnees: &DonneesRacine, chemin: Option<&std::path::Path>) -> MetriquesVolumetrie`, appliquant les décisions 3 et 4, en soustraction saturée (`saturating_sub`) partout. La taille disque est `chemin.and_then(|c| std::fs::metadata(c).ok()).map(|m| m.len())`.

Tests `#[cfg(test)]`, sur le patron des tests de `persistance/purge.rs` (racine construite via `DonneesRacine::nouvelle(...)` peuplée d'un `Groupe`, d'un `Projet` et d'un `Audit`) :

- `taille_json_clair_octets > 0` sur une racine non vide ;
- `parametrage_octets + journal_octets + administration_octets + audits_octets + autre_octets == taille_json_clair_octets` (invariant central) ;
- `administration_octets` augmente lorsqu'on ajoute un `MembreConnu` à un groupe ;
- `taille_disque_octets` vaut `None` quand `chemin` est `None`, et `Some(n)` quand `chemin` désigne un fichier réel (fichier temporaire créé et nettoyé par le test).

### Commande de la Façade dans `src-tauri/src/commandes/administration.rs`

Module existant de l'écran Administration. Nouvelle commande, sur le gabarit exact de `commandes::purge::previsualiser_purge_densite` :

```rust
#[tauri::command]
pub(crate) fn calculer_metriques_volumetrie(
    chemin: Option<String>,
    donnees: DonneesRacine,
) -> Result<MetriquesVolumetrie, ErreurFacade> {
    crate::journalisation::consigner_debut_commande("calculerMetriquesVolumetrie");
    let resultat = (|| -> Result<MetriquesVolumetrie, ErreurFacade> {
        let chemin_ref = chemin.as_deref().map(std::path::Path::new);
        Ok(volumetrie::calculer_metriques(&donnees, chemin_ref))
    })();
    crate::journalisation::consigner_fin_commande("calculerMetriquesVolumetrie");
    resultat
}
```

Le type de retour reste un `Result<_, ErreurFacade>` même si le calcul ne peut pas échouer, pour rester homogène avec les autres commandes et ne pas introduire de cas particulier de désérialisation côté interface. La commande ne prend pas de `State<EtatSession>`, ne demande pas de mot de passe et n'écrit aucune entrée de journal (commande de consultation pure) ; la journalisation technique de début et de fin reste néanmoins obligatoire ([norme de développement](../../.claude/rules/09-normes-developpement.md#qualité-de-code)).

### Enregistrement

`src-tauri/src/lib.rs` : ajouter `commandes::administration::calculer_metriques_volumetrie` au `tauri::generate_handler!`.

Contraintes transverses : aucune utilisation de `.unwrap()` / `.expect()`, `#![forbid(unsafe_code)]` déjà global, visibilité la plus restrictive possible, Rustdoc sur tout élément public.

## 5. Partie B — Façade, Store, utilitaire et interface

### Façade de commandes et bouchon TypeScript

`src/app/services/sansetat/commandes/facade-administration.service.ts` : nouvelle interface générique, sur le modèle de `ParametresQualificationMembre<TDonnees>`, ne référençant aucun type de `services/avecetat/` :

```ts
export interface ParametresCalculMetriquesVolumetrie<TDonnees> {
  readonly chemin: string | null;
  readonly donnees: TDonnees;
}
```

et méthode `public async calculerMetriquesVolumetrie<TDonnees, TReponse>(parametres: ParametresCalculMetriquesVolumetrie<TDonnees>): Promise<TReponse>` déléguant à `InvocationCommandeUtils.invoquer<TReponse>('calculer_metriques_volumetrie', { ...parametres })`. En-tête du fichier mis à jour (mention US-055).

`src/app/services/sansetat/commandes/bouchon/bouchon-administration.utils.ts` et son spec : ajouter `'calculer_metriques_volumetrie'` au `Set` des commandes reconnues et un cas dans `resoudre(...)` renvoyant un `MetriquesVolumetrie` plausible dont la somme des cinq postes vaut exactement `JSON.stringify(donnees).length` ; ajuster le décompte de commandes dans le commentaire d'en-tête et dans le spec. Cette entrée est indispensable : sans elle, l'onglet échoue sous `ng serve` et casse le parcours de bout en bout Playwright, qui n'exerce que le bouchon TypeScript.

### Types et Store d'état applicatif

`src/app/services/avecetat/etat/types-donnees.ts`, à proximité de `PrevisualisationPurge` :

```ts
export interface VentilationJsonClair {
  readonly parametrageOctets: number;
  readonly journalOctets: number;
  readonly administrationOctets: number;
  readonly auditsOctets: number;
  readonly autreOctets: number;
}
export interface MetriquesVolumetrie {
  readonly tailleDisqueOctets: number | null;
  readonly tailleJsonClairOctets: number;
  readonly ventilation: VentilationJsonClair;
}
export type ResultatMetriquesVolumetrie =
  | { readonly type: 'succes'; readonly metriques: MetriquesVolumetrie }
  | { readonly type: 'echec'; readonly anomalie: ErreurAdministration };
```

`src/app/services/avecetat/etat/donnees-application.service.ts` : nouvelle méthode `public async calculerMetriquesVolumetrie(): Promise<ResultatMetriquesVolumetrie>`, avec JSDoc. Elle lit la racine courante (`this.racineActuelle()`) et le chemin du fichier via `this.etatSession.cheminFichier()` — signal nullable, à ne pas router par `cheminFichierActuel()` qui lève quand aucun fichier n'est ouvert —, délègue à `FacadeAdministrationService.calculerMetriquesVolumetrie<DonneesRacine, MetriquesVolumetrie>`, et renvoie un Résultat discriminé (`try/catch` mappé par `anomalieAdministration`).

### Utilitaire de formatage partagé

Aucune classe utilitaire de formatage d'octets n'existe : `formaterOctets` n'est présent qu'en méthode privée de `purge-parametrage.component.ts`.

Nouveau fichier `src/app/services/sansetat/taille-fichier.utils.ts`, classe `TailleFichierUtils` à membres statiques uniquement (règle « aucune fonction hors classe »), en-tête de mention IA :

- `public static formaterMegaOctets(octets: number): string` : corps repris de `purge-parametrage.component.ts` (`(octets / 1_000_000).toFixed(1).replace('.', ',') + ' Mo'`) ;
- `public static ventilationPourcentages(parametrage: number, journal: number, administration: number, audits: number, autre: number): { parametrage: number; journal: number; administration: number; audits: number; autre: number }` : méthode pure, calcul des cinq pourcentages par la méthode du plus fort reste, somme garantie de 100 (tous à `0` si le total est nul). Signature en cinq scalaires pour n'imposer aucun import depuis `services/avecetat/`.

Spec `taille-fichier.utils.spec.ts` : format (virgule décimale française, une décimale) et somme des pourcentages égale à 100 sur plusieurs jeux, dont des cas d'arrondi défavorables et le total nul.

`src/app/ecrans/parametrage/purge/purge-parametrage.component.ts` : le corps de `formaterOctets` délègue désormais à `TailleFichierUtils.formaterMegaOctets` ; la méthode publique et le template restent inchangés.

### Composant de l'onglet

Nouveau répertoire `src/app/ecrans/administration/metriques/` :

- `metriques-admin.component.ts` — classe `SqmMetriquesAdminComponent`, `selector: 'app-metriques-admin'`, `changeDetection: ChangeDetectionStrategy.OnPush`, composant standalone, en-tête de mention IA (patron des autres sous-composants de l'écran).
  - Dépendances : `inject(DonneesApplicationService)`, `inject(NotificationService)`.
  - Signaux : `metriques: WritableSignal<MetriquesVolumetrie | null>` initialisé à `null`, `enCours: WritableSignal<boolean>` initialisé à `false`.
  - Compteurs, chacun avec JSDoc et type de retour explicite, dérivés de `donneesApplication.groupes()` et `donneesApplication.racine()` sur le patron de `accueil.component.ts` : `nombreGroupes()`, `nombreProjets()`, `nombreAudits()`, `nombreReglesMembre()`, `nombreReglesDependance()`.
  - `constructor()` : `void this.charger();`.
  - `public async charger(): Promise<void>` : `enCours.set(true)`, `await this.donneesApplication.calculerMetriquesVolumetrie()`, `enCours.set(false)` ; si le Résultat est un échec, `notification.erreur(...)` et `metriques()` reste `null` ; sinon `metriques.set(resultat.metriques)`.
  - `public formaterMegaOctets(octets: number): string` et `public pourcentagesDe(ventilation: VentilationJsonClair): { ... }` déléguant à `TailleFichierUtils` ; l'appel reste derrière un `@if (metriques(); as m)` du template pour ne recourir à aucune assertion `!`.
  - Tout `switch` de libellé de poste est exhaustif sur `type PosteVentilation = 'parametrage' | 'journal' | 'administration' | 'audits' | 'autre'`.
- `metriques-admin.component.html` : bloc de compteurs (tuiles ou liste de définitions, classes utilitaires existantes) ; `@if (enCours()) { <indicateur de chargement> } @else if (metriques(); as m) { ... } @else { <message d'indisponibilité> }` ; poids disque avec branche « — non sauvegardé » et mention « reflète la dernière sauvegarde, pas l'état en mémoire » ; poids JSON en clair avec mention « état en mémoire courant » ; ventilation présentée en tableau de cinq lignes (poste, octets, pourcentage) alimenté par `pourcentagesDe(m.ventilation)`.
- `metriques-admin.component.spec.ts` (Jest) : `jest.mock('@tauri-apps/api/core', () => ({ invoke: jest.fn(), isTauri: jest.fn(() => true) }))` ; classe `DonneesDeTest` à membres statiques construisant une racine peuplée (groupes, projets, audits, membres connus, règles de dépendance) ; `TestBed` avec `imports: [SqmMetriquesAdminComponent]`, injection de `DonneesApplicationService` et `EtatSessionService`, `donneesApplication.chargerRacine(DonneesDeTest.racine())` ; `invokeSimule.mockResolvedValue({...})` ; assertions sur les compteurs, sur `metriques()` renseigné après `await composant.charger()`, sur la somme des pourcentages égale à 100, et sur la branche d'échec (`invokeSimule.mockRejectedValue(...)` → `NotificationService.erreur` appelé, `metriques()` toujours `null`).
- `metriques-admin.component.scss` uniquement si une barre empilée est finalement retenue à la place du tableau.

### Branchement de l'onglet dans la coquille

- `src/app/ecrans/administration/administration.component.ts` : `type OngletAdministration = 'groupes' | 'projets' | 'sources' | 'metriques'` ; import de `SqmMetriquesAdminComponent` et ajout au tableau `imports` du décorateur ; commentaire d'en-tête et JSDoc de classe mis à jour (« quatre onglets », mention US-055).
- `src/app/ecrans/administration/administration.component.html` : nouveau bouton `id="administration-onglet-metriques"`, classe `administration__onglet bouton bouton--discret`, `[class.administration__onglet--actif]="ongletActif === 'metriques'"`, `(click)="selectionnerOnglet('metriques')"`, libellé « Métriques » ; nouveau `@case ('metriques') { <app-metriques-admin /> }`. Le SCSS existant (`.administration__onglet--actif`) couvre déjà le nouvel onglet.
- `src/app/ecrans/administration/administration.component.spec.ts` : ajouter `'metriques'` à la liste du `it.each([...] as const)` de sélection d'onglet et un `it("affiche l'onglet Métriques", ...)` restant au niveau `selectionnerOnglet('metriques')` puis `expect(composant.ongletActif).toBe('metriques')` — les tests existants de ce spec n'appellent jamais `detectChanges()` ; rendre le `@case` imposerait de mocker `@tauri-apps/api/core` et d'amorcer une racine, car le constructeur du sous-composant invoque la commande native.

## 6. Impacts sur le modèle de données et migration

Aucun. Les métriques sont calculées à la volée à partir de l'état déjà en mémoire ; aucune donnée persistée n'est ajoutée, `versionSchema` reste à `10`, aucun palier de migration n'est introduit. `MetriquesVolumetrie` et `VentilationJsonClair` sont des structures de transfert calculées, non persistées, miroir strict entre TypeScript (`types-donnees.ts`) et Rust (`persistance::volumetrie`), sérialisées en `camelCase`.

## 7. Impacts documentaires

| document | nature de la mise à jour |
|---|---|
| [`04_casUsage.md`](../02_documentation/04_casUsage.md) | Nouvelle ligne US-055 : persona Camille, type Consultation, priorité Could have ; critères d'acceptation = les cinq compteurs, le poids du fichier chiffré sur disque (état de la dernière sauvegarde), le poids du JSON en clair, la ventilation en cinq postes de somme 100 %, le caractère lecture seule (aucune mutation, aucune ressaisie de mot de passe) ; RG associée RG-055. Mise à jour de la matrice de couverture (rattachement à l'objectif mesurable de vue d'ensemble / maîtrise du fichier de données). |
| [`05_reglesGestion.md`](../02_documentation/05_reglesGestion.md) | Nouvelle RG-055, rattachée à l'écran Administration, déclenchée à l'ouverture de l'onglet Métriques : définition des cinq compteurs, source de la taille disque (`std::fs::metadata` du fichier ouvert, donc état de la dernière sauvegarde), taille du JSON en clair (sérialisation `serde_json` de la racine en mémoire), composition exacte des cinq postes de ventilation, règle « le reste est affecté au poste *autre* pour une somme de 100 % », caractère lecture seule. Complément de la ligne « Administration » de la description sommaire des écrans et des matrices de traçabilité RG × US. |
| [`08_arborescenceNavigation.md`](../02_documentation/08_arborescenceNavigation.md) | Ajout de l'onglet `Métriques` sous `Administration` dans l'arborescence ; ajout de `US-055` à la ligne `Administration` de la matrice écrans / user stories. |
| [`09_maquettes.md`](../02_documentation/09_maquettes.md) | Section `### Administration` : description de l'onglet — bloc de cinq compteurs, deux valeurs de poids avec mention de fraîcheur, tableau de cinq lignes (poste, octets, pourcentage) pour la ventilation, état « — non sauvegardé », indicateur de chargement pendant l'appel natif. |
| [`12_modeleDonnees.md`](../02_documentation/12_modeleDonnees.md) | Note à proximité de la description de `PrevisualisationPurge` : `MetriquesVolumetrie` / `VentilationJsonClair` sont des structures calculées non persistées ; aucun palier de migration ; `versionSchema` inchangé. |
| [`13_conceptionDetaillee.md`](../02_documentation/13_conceptionDetaillee.md) | Ajout de `calculerMetriquesVolumetrie` à l'inventaire des commandes de la Façade (entrée `{ chemin: string \| null, donnees: DonneesRacine }`, sortie `MetriquesVolumetrie`, consultation pure, journalisation technique début/fin obligatoire, sans `State`, sans mot de passe, sans entrée de journal) ; description de l'algorithme de `persistance::volumetrie::calculer_metriques` ; ajout de `SqmMetriquesAdminComponent` à l'inventaire des composants de l'écran Administration (quatre onglets). |
| [`16_normesTests.md`](../02_documentation/16_normesTests.md) | Le module `persistance::volumetrie` relève du périmètre « Moteur de persistance » (seuil de couverture 80 %, testé sans I/O réseau, avec un fichier temporaire pour la branche taille disque) ; `SqmMetriquesAdminComponent` relève des composants de présentation (suivi du nombre de méthodes jamais appelées, plus une étape ajoutée au parcours de bout en bout). |

La vérification croisée de traçabilité (règle générale n° 13) est refaite après ces mises à jour.

## 8. Impacts sur les tests

- Tests unitaires Rust : nouveau module `persistance::volumetrie` (cf. Partie A) ; non-régression de `cargo test`.
- Tests unitaires Jest : `taille-fichier.utils.spec.ts`, `metriques-admin.component.spec.ts` et `bouchon-administration.utils.spec.ts` sont créés ou complétés ; `administration.component.spec.ts`, `purge-parametrage.component.spec.ts` et `facade-administration.service.spec.ts` sont mis à jour.
- Test de bout en bout Playwright (`e2e/parcours-complet.spec.ts`) : nouvelle étape après « 6. Administration > Projets » — activation de `#administration-onglet-metriques`, attente de l'affichage, assertion sur un compteur non nul et sur une valeur de poids (fournies par le bouchon TypeScript). Capture d'écran si le parcours en produit une par écran.
- Tests de charge : sans objet (lecture d'un état déjà en mémoire, sérialisation ponctuelle, aucune boucle de volumétrie nouvelle).

## 9. Découpage en incréments

Chaque incrément est développé par un Codeur puis relu par un Relecteur en contexte isolé, et validé par un humain avant le suivant.

1. **Documents normatifs** (section 7) : livrés et validés avant tout code ; confirmation que `US-055` et `RG-055` sont libres au moment de la qualification.
2. **Cœur natif** (Partie A) : `persistance/volumetrie.rs`, commande dans `commandes/administration.rs`, enregistrement dans `lib.rs`, tests Rust. Fige le contrat `MetriquesVolumetrie` en `camelCase`.
3. **Façade TypeScript, bouchon et Store** (Partie B, sous-sections « Façade de commandes et bouchon TypeScript » et « Types et Store d'état applicatif »).
4. **Utilitaire de formatage** : `taille-fichier.utils.ts` et bascule de `purge-parametrage.component.ts`. Indépendant des incréments 2 et 3, requis par l'incrément 5.
5. **Composant et onglet** (Partie B, sous-sections « Composant de l'onglet » et « Branchement de l'onglet dans la coquille »).
6. **Bout en bout et vérification** : étape Playwright et passe de vérification complète (section 10).

```
Inc.1 ─┐
Inc.2 ─┼─→ Inc.3 ─→ Inc.5 ─→ Inc.6
       │   Inc.4 ──────↑   (indépendant de 2 et 3, requis par 5)
```

## 10. Vérification de bout en bout

1. `cd src-tauri && cargo test` : module `persistance::volumetrie` et non-régression.
2. `cd src-tauri && cargo clippy --all-targets -- -D warnings`.
3. Couverture Rust (cible `cargo llvm-cov` du projet) au moins 80 % sur `persistance/volumetrie.rs`.
4. `npm run lint` puis `npm run typecheck` : français, JSDoc, visibilité et types de retour explicites, absence de `any`, `switch` exhaustif, absence d'assertion `!` / `as` injustifiée, Promises explicitement gérées.
5. `npm test` : nouveaux specs et specs mis à jour (section 8).
6. `npm run build` puis `cd src-tauri && cargo build --locked`.
7. `npm start` : ouverture de **Administration › Métriques** — compteurs cohérents avec le jeu de démonstration du bouchon, deux valeurs de poids affichées, ventilation totalisant 100 %, état « — non sauvegardé » observable.
8. `npm run test:e2e` : parcours complet incluant la nouvelle étape.

## 11. Points restant ouverts

- Placement exact de RG-055 dans `05_reglesGestion.md` : section « Seuils, référentiels et historisation » ou section propre à l'écran Administration — à trancher à l'incrément 1.
- Forme visuelle de la ventilation : tableau de cinq lignes ou barre empilée à 100 % — à figer avec la maquette de l'incrément 1 ; par défaut, tableau (plus simple, sans SCSS dédié).
- Priorité « Could have » de US-055 à confirmer par un humain.

# Chapitre 2 — Ventilation des dépendances par écosystème sur la Fiche projet et la Comparaison d'audits (US-056 / RG-056)

## 1. Objet et statut

Ce chapitre décrit la réorganisation de la restitution des dépendances d'un projet audité, sur deux écrans.

- **Fiche projet** (`fiche-projet/:projetId`, F12), section « Dépendances » : aujourd'hui un tableau plat `Référence / Version / Manifeste / Statut` (`src/app/ecrans/fiche-projet/fiche-projet.component.html:261`), sans tri ni regroupement.
- **Comparaison d'audits** (`comparaison-audits/:projetId`, F13), volet « Dépendances » : aujourd'hui un tableau de différentiel à sept colonnes avec trois `@for` successifs (`ajouts`, `retraits`, `modifications`, `src/app/ecrans/comparaison-audits/comparaison-audits.component.html:169`).

La restitution reprend le modèle déjà éprouvé pour la ventilation des membres du dépôt sur la Fiche projet (US-017) : sections repliables natives `<details>`/`<summary>`, fermées par défaut, dont la barre de titre porte un libellé, le total entre parenthèses, puis un badge par statut présent — les statuts sans aucune occurrence ne produisant aucune entrée (`fiche-projet.component.ts`, `construireDecompteStatutMembres`, documentation « statuts à zéro omis »).

La dépendance ne porte aucune information d'écosystème : le type `Dependance = { reference, version, manifeste }` (`src/app/services/sansetat/commandes/types-facade.ts:167`, miroir Rust `src-tauri/src/modele/racine.rs:522`) n'expose que le chemin du manifeste. L'écosystème est donc déduit du nom de fichier du manifeste, à l'identique de la liste blanche du parseur natif `NOMS_MANIFESTES_RECONNUS = ["pom.xml", "package.json", "build.gradle"]` (`src-tauri/src/connecteurs/gitlab.rs:1780`).

Aucune commande native, aucun changement de modèle de données ni de schéma : le regroupement est un pur calcul d'affichage, au même titre que le statut d'obsolescence ([RG-011](../02_documentation/05_reglesGestion.md#constat-jugement-et-politique-ia), jamais stocké, recalculé à l'affichage par `StatutObsolescenceUtils`).

Statut : ce chapitre précède la mise à jour des documents normatifs et tout développement, qui restent conditionnés à une validation humaine explicite. La méthode du projet s'applique : arbitrage humain, puis mise à jour des documents normatifs, puis développement, sans passage à l'étape suivante sans validation explicite de la précédente.

## 2. Décisions actées

Décisions fonctionnelles, issues des questions posées à l'utilisateur le 2026-08-30 :

- écrans concernés : Fiche projet **et** Comparaison d'audits ;
- ventilation par écosystème, déduite du nom de fichier du manifeste : `pom.xml` et `build.gradle`, ainsi que la pseudo-dépendance de référence `java` (version du runtime Java, cf. `obsolescence.component.ts`, indicateur `estJava`), sont rattachés à la section **« Maven »** ; `package.json` à la section **« NPM »** ; tout manifeste non reconnu à la section **« Autres »**, affichée uniquement si elle contient au moins une dépendance ;
- repli : toutes les sections fermées par défaut (`<details>` sans attribut `open`) ;
- barre de titre : `Maven (N)` / `NPM (N)` — `N` étant le total de dépendances de la section —, puis un badge par statut présent, statut à zéro omis, strictement le modèle des membres.

Décisions d'architecture :

1. Un utilitaire de classification unique et testé (`EcosystemeDependanceUtils`), sans état, partagé par les deux écrans, plutôt qu'une duplication de logique de nom de fichier. Il est placé sous `services/sansetat/jugement/` (calcul d'affichage pur, aucune I/O, aucun import depuis `services/avecetat/`).
2. Aucune nouvelle structure persistée ni de transfert : les types de section (`SectionDependances`, `DecompteStatutDependances`) sont des vues internes aux composants, déclarées localement comme le sont déjà `LigneDependance`, `SectionMembresSimple`, `DecompteStatutMembres`.
3. La liste plate `donnees.dependances` de la Fiche projet est conservée telle quelle : elle alimente la saisie en masse de règles (`afficherLienSaisieMasseDependances`, `texteInitialSaisieMasseDependances`, `nombreDependancesNonReferencees`). Les sections sont un champ supplémentaire dérivé de cette même liste.
4. L'export PNG des deux écrans déplie impérativement les sections de dépendances le temps de la capture puis restaure l'état de repli, exactement comme `SqmFicheProjetComponent.exporterPng` le fait déjà pour les sections de membres (décision fonctionnelle US-017 validée par un humain : les sections repliées à l'écran apparaissent dépliées dans l'export).

## 3. Périmètre et identifiants d'exigence proposés

Derniers identifiants consommés à la date de rédaction (après le chapitre 1) : `US-055`, `RG-055`. Allocation proposée, à reconfirmer au moment de la qualification effective (une autre session peut consommer des identifiants entre-temps ; en ce cas, décaler l'ensemble en bloc sans réintroduire de trou, sur le principe déjà appliqué en Étape 25).

| identifiant | intitulé | type |
|---|---|---|
| US-056 | Consulter les dépendances d'un projet ventilées par écosystème (Maven, NPM, Autres) en sections repliables, sur la Fiche projet et la Comparaison d'audits | Consultation — Should have |
| RG-056 | Déduction de l'écosystème d'une dépendance à partir du nom du manifeste ; composition des sections repliables et du décompte de barre de titre (occurrences à zéro omises) ; section « Autres » affichée seulement si non vide | règle de gestion |

RG-056 s'articule avec RG-011 (statut recalculé à l'affichage), RG-022 (jamais de couleur inventée sans seuil) et US-017 (modèle des sections repliables de membres, réutilisé).

## 4. Partie A — Utilitaire de classification d'écosystème

### Nouveau fichier `src/app/services/sansetat/jugement/ecosysteme-dependance.utils.ts`

En-tête de commentaire de mention IA. Classe `EcosystemeDependanceUtils` à membres statiques uniquement (règle « aucune fonction hors classe »), JSDoc sur la classe et chaque membre, types de retour explicites, visibilité explicite.

```ts
export type EcosystemeDependance = 'maven' | 'npm' | 'autres';

export class EcosystemeDependanceUtils {
  /** Écosystèmes dans l'ordre d'affichage des sections. */
  public static readonly ORDRE: readonly EcosystemeDependance[] = ['maven', 'npm', 'autres'];

  /**
   * Déduit l'écosystème d'une dépendance du nom de fichier de son manifeste (RG-056), aligné sur
   * `NOMS_MANIFESTES_RECONNUS` du parseur natif (`src-tauri/src/connecteurs/gitlab.rs`). La
   * pseudo-dépendance de référence `java` (runtime) est rattachée à Maven.
   */
  public static classifier(
    dependance: { readonly reference: string; readonly manifeste: string },
  ): EcosystemeDependance;

  /** Libellé affiché de la section d'un écosystème : « Maven », « NPM », « Autres ». */
  public static titre(ecosysteme: EcosystemeDependance): string;
}
```

Règles de `classifier` : `reference === 'java'` renvoie `'maven'` ; sinon le dernier segment du `manifeste` (après le dernier `/`) : `pom.xml` ou `build.gradle` renvoie `'maven'`, `package.json` renvoie `'npm'`, tout autre renvoie `'autres'`.

### Spec `ecosysteme-dependance.utils.spec.ts`

Cas couverts : `pom.xml`, `module-a/pom.xml`, `build.gradle`, `sous/module/build.gradle`, `package.json`, `front/package.json`, `reference: 'java'` quel que soit le manifeste, manifeste inconnu (`Cargo.toml`, `go.mod`, chaîne vide) renvoyant `'autres'` ; `ORDRE` et `titre` sur les trois valeurs. Le Moteur de jugement étant la priorité de couverture (seuil 90 %), chaque branche est exercée.

## 5. Partie B — Fiche projet (F12)

### `src/app/ecrans/fiche-projet/fiche-projet.component.ts`

Nouveaux types locaux, calqués sur `DecompteStatutMembres` et `SectionMembresSimple` :

- `DecompteStatutDependances { label: string; couleur?: Couleur; nombre: number }` ;
- `SectionDependances { ecosysteme: EcosystemeDependance; titre: string; dependances: readonly LigneDependance[]; total: number; decompteParStatut: readonly DecompteStatutDependances[] }`.

`DonneesFicheProjet` : ajout de `sectionsDependances: readonly SectionDependances[]` ; `dependances: readonly LigneDependance[]` est conservé inchangé.

Nouvelles méthodes privées :

- `construireSectionsDependances(lignes: readonly LigneDependance[]): readonly SectionDependances[]` : regroupe `lignes` par `EcosystemeDependanceUtils.classifier`, dans l'ordre `EcosystemeDependanceUtils.ORDRE` ; ne produit que les sections non vides (cf. section 12, point à trancher) ; `total = section.dependances.length` ; `decompteParStatut` via `construireDecompteStatutDependances` ;
- `construireDecompteStatutDependances(lignes: readonly LigneDependance[]): readonly DecompteStatutDependances[]` : même corps que `construireDecompteStatutMembres` (`Map` indexée par `statut.label`, entrées à zéro jamais créées) ; tri selon un tableau statique `ORDRE_STATUTS_DEPENDANCE_DECOMPTE = ['obsolète', 'maintenu', 'à jour (M1)', 'à jour (M3)', 'non référencé']` (libellés produits par `libelleEtCouleurObsolescence`), un libellé hors liste étant trié en fin, sur le modèle de `rangStatutDecompte`.

Construction de `DonneesFicheProjet` : ajout de `sectionsDependances: this.construireSectionsDependances(...)` à partir de la liste de `LigneDependance` déjà mappée.

`exporterPng()` : le sélecteur de dépliage impératif passe à `'.fiche-projet__section-membres, .fiche-projet__section-dependances'` ; le commentaire est étendu (US-017 et US-056).

### `fiche-projet.component.html`

Section « Dépendances » : seul le bloc `@else` du cas « dépendances présentes » (le tableau `<table>` enveloppé dans `<div class="deborde-auto">`) est remplacé. Les états alternatifs (`Aucune donnée de dépendances…`, `Aucune dépendance déclarée…`) et le bouton de saisie en masse sont inchangés. Le `<caption>` et le composant `<app-explication-jugement cle="reglesDependances">` sont remontés une seule fois au-dessus de la boucle.

```html
@else {
  <p class="fiche-projet__table-caption poids-demi-gras exterieur-bas-1">
    Dépendances déclarées
    <app-explication-jugement cle="reglesDependances" [referentielsBruts]="donnees.referentielsBruts" />
  </p>
  @for (section of donnees.sectionsDependances; track section.ecosysteme) {
    <details class="fiche-projet__section-dependances">
      <summary class="fiche-projet__section-dependances-resume texte-sm">
        <span class="poids-demi-gras">{{ section.titre }}</span> ({{ section.total }})
        @for (decompte of section.decompteParStatut; track decompte.label) {
          <app-badge [couleur]="decompte.couleur ?? 'rouge'"
                     [libelle]="decompte.nombre + ' ' + decompte.label" />
        }
      </summary>
      <div class="deborde-auto">
        <table class="fiche-projet__table tableau">
          <!-- thead identique : Référence / Version / Manifeste / Statut -->
          <tbody>
            @for (dependance of section.dependances;
                  track dependance.reference + dependance.version + dependance.manifeste) {
              <!-- <tr> repris tel quel de l'existant : app-bouton-copie sur la référence,
                   badge de statut, lien « Créer une règle » si dependance.nonReference -->
            }
          </tbody>
        </table>
      </div>
    </details>
  }
}
```

### `fiche-projet.component.scss`

Ajout, en miroir de `.fiche-projet__section-membres` et `.fiche-projet__section-membres-resume`, des classes `.fiche-projet__section-dependances` et `.fiche-projet__section-dependances-resume` (bordure, rayon, remplissage, `margin-top` sur l'adjacence, `summary` en `display: flex; flex-wrap: wrap; align-items: center; gap`). Commentaire renvoyant à US-017 et US-056. Mutualisation des deux blocs sous un sélecteur commun si le rendu est strictement identique.

## 6. Partie C — Comparaison d'audits (F13)

Le volet « Dépendances » restitue un différentiel (`DifferentielAuditsUtils`), pas une liste simple : un décompte « par statut » n'a pas de sens direct sur un différentiel. Adaptation retenue : décompte par type d'évolution (`Ajout`, `Retrait`, `Changement de statut`), avec la même règle « compteur à zéro omis » (cf. section 12).

### `comparaison-audits.component.ts`

- Nouveau type local `SectionDependancesDiff { ecosysteme: EcosystemeDependance; titre: string; ajouts: readonly LigneDependanceAffiche[]; retraits: readonly LigneDependanceAffiche[]; modifications: readonly LigneDependanceAffiche[]; total: number; decompteParEvolution: readonly { label: string; couleur: Couleur; nombre: number }[] }`.
- Méthode `construireSectionsDependancesDiff(...)` : ventile les trois listes de `LigneDependanceAffiche` (qui portent déjà `reference` et `manifeste`) par `EcosystemeDependanceUtils.classifier`, dans l'ordre `ORDRE` ; ne produit que les sections non vides ; `total = ajouts + retraits + modifications` ; `decompteParEvolution` omet les types à zéro (couleurs proposées : `Ajout` en bleu, `Retrait` en rouge, `Changement de statut` en orange).
- `DonneesComparaisonAudits.dependances` : ajout de `sections: readonly SectionDependancesDiff[]` (les listes `ajouts` / `retraits` / `modifications` restent exposées si d'autres lectures en dépendent, sinon elles sont remplacées).
- `exporterPng()` : ajout du dépliage impératif des `.comparaison-audits__section-dependances` puis restauration, sur le modèle de `SqmFicheProjetComponent.exporterPng` (l'`exporterPng` actuel de cet écran ne manipule aucun `<details>`).

### `comparaison-audits.component.html`

Volet « Dépendances » : le garde global (`Aucune évolution des dépendances entre les deux audits comparés.`) est conservé lorsque les trois listes sont vides ; sinon, dans le `@else`, une boucle sur `donnees.dependances.sections` produit un `<details class="comparaison-audits__section-dependances">` par écosystème, avec un `<summary>` (titre et badges de décompte par évolution) suivi du tableau de différentiel existant à sept colonnes, filtré sur `section.ajouts` / `section.retraits` / `section.modifications`.

### `comparaison-audits.component.scss`

Classes `.comparaison-audits__section-dependances` et `.comparaison-audits__section-dependances-resume` en miroir de la Fiche projet.

## 7. Impacts sur le modèle de données et migration

Aucun. Aucune structure persistée ni de transfert n'est ajoutée ; `versionSchema` reste à `10` ; aucune commande native ; aucun palier de migration. Le regroupement est calculé à l'affichage à partir de l'état déjà en mémoire, comme le statut d'obsolescence (RG-011).

## 8. Impacts documentaires

| document | nature de la mise à jour |
|---|---|
| [`04_casUsage.md`](../02_documentation/04_casUsage.md) | Nouvelle ligne US-056 : persona de consultation, priorité Should have ; critères d'acceptation = dépendances de la Fiche projet et du volet Dépendances de la Comparaison d'audits présentées en sections repliables Maven / NPM (/ Autres si non vide), fermées par défaut, décompte par statut (Fiche projet) ou par type d'évolution (Comparaison) dans la barre de titre, compteur à zéro jamais affiché ; RG associée RG-056. Mise à jour de la matrice de couverture. |
| [`05_reglesGestion.md`](../02_documentation/05_reglesGestion.md) | Nouvelle RG-056 : déduction de l'écosystème par nom de manifeste (`pom.xml` / `build.gradle` et référence `java` vers Maven ; `package.json` vers NPM ; autre vers Autres), alignée sur `NOMS_MANIFESTES_RECONNUS` ; composition des sections repliables et du décompte de barre de titre (occurrences à zéro omises) ; section « Autres » rendue seulement si non vide. Articulation avec RG-011, RG-022, US-017. Complément des matrices de traçabilité RG × US. |
| [`08_arborescenceNavigation.md`](../02_documentation/08_arborescenceNavigation.md) | Ajout de `US-056` aux lignes `Fiche projet` et `Comparaison d'audits` de la matrice écrans / user stories. |
| [`09_maquettes.md`](../02_documentation/09_maquettes.md) | Sections `### Fiche projet` et `### Comparaison d'audits` : décrire la restitution des dépendances en `<details>` par écosystème, barre de titre `Maven (N)` et badges, repli par défaut, dépliage imposé dans l'export PNG. |
| [`13_conceptionDetaillee.md`](../02_documentation/13_conceptionDetaillee.md) | Ligne « UI — Moteur de jugement » : ajout de `EcosystemeDependanceUtils` (classification d'affichage pure). Description de la restitution ventilée des dépendances sur F12 et F13, dérivée du manifeste, sans commande native ni changement de modèle. |
| [`16_normesTests.md`](../02_documentation/16_normesTests.md) | `ecosysteme-dependance.utils` relève du Moteur de jugement (fonctions pures, seuil 90 %) ; les deux composants relèvent des composants de présentation (suivi du nombre de méthodes jamais appelées) ; une assertion est ajoutée au parcours de bout en bout (présence des sections sur la Fiche projet). |
| [`guide-utilisateur.md`](../guide-utilisateur.md) | Paragraphe Fiche projet et paragraphe Comparaison d'audits : mentionner la présentation des dépendances en sections repliables Maven / NPM (/ Autres). Vérifier si les captures `docs/assets/captures/` de ces deux écrans doivent être régénérées (hors pipeline, script Playwright local) — à signaler, non bloquant. |
| [`04_rapports/rapportDeDeveloppement.md`](../04_rapports/rapportDeDeveloppement.md) | Consigner les décisions arbitraires à valider par un humain : rattachement de `build.gradle`, de la référence `java` et des manifestes inconnus ; décompte « par type d'évolution » sur la Comparaison d'audits ; rendu des seules sections non vides. |

La vérification croisée de traçabilité (règle générale n° 13) est refaite après ces mises à jour.

## 9. Impacts sur les tests

- Tests unitaires Jest, nouveaux specs : `ecosysteme-dependance.utils.spec.ts`.
- `fiche-projet.component.spec.ts` : nouveau `describe('ventilation des dépendances par écosystème (US-056)')`, sur le modèle du `describe` existant pour la ventilation des membres :
  - sections rendues fermées par défaut (`HTMLDetailsElement.open === false`) ;
  - titres `Maven (n)` / `NPM (n)` ; un badge par statut ; aucun badge pour un statut absent ;
  - `build.gradle` et `reference: 'java'` classés dans « Maven » ; `package.json` dans « NPM » ;
  - manifeste inconnu : section « Autres » présente ; absente sinon ;
  - l'export PNG déplie les sections de dépendances puis restaure leur état (adapter le test d'export existant s'il inspecte les `<details>`) ;
  - non-régression des tests de saisie en masse de règles de dépendances (qui passent par les méthodes du composant et par `donnees.dependances`, pas par le DOM du tableau).
- `comparaison-audits.component.spec.ts` : `describe` équivalent pour le volet Dépendances (ventilation, titres, décompte par évolution, sections vides non rendues, garde global conservé, export PNG).
- Test de bout en bout Playwright (`e2e/parcours-complet.spec.ts`) : à l'étape Fiche projet, assertion sur la présence d'au moins une section `.fiche-projet__section-dependances` et sur son repli initial.
- Rust : aucun impact (`cargo test` inchangé).
- Hooks locaux Prettier / ESLint / `npm run typecheck` en fin de chaque tour d'édition.

## 10. Découpage en incréments

Chaque incrément est développé par un Codeur puis relu par un Relecteur en contexte isolé, et validé par un humain avant le suivant.

1. **Documents normatifs** (section 8) : livrés et validés avant tout code ; confirmation que `US-056` et `RG-056` sont libres au moment de la qualification.
2. **Utilitaire de classification** (Partie A) : `ecosysteme-dependance.utils.ts` et son spec. Indépendant, requis par les incréments 3 et 4.
3. **Fiche projet** (Partie B) : types, `construireSectionsDependances`, `construireDecompteStatutDependances`, template, SCSS, `exporterPng`, specs.
4. **Comparaison d'audits** (Partie C) : `construireSectionsDependancesDiff`, template, SCSS, `exporterPng`, specs.
5. **Bout en bout et vérification** : étape Playwright et passe de vérification complète (section 11).

```
Inc.1 ─┐
Inc.2 ─┼─→ Inc.3 ─┐
       │   Inc.4 ─┼─→ Inc.5
```

## 11. Vérification de bout en bout

1. `npm run lint` puis `npm run typecheck` : français, JSDoc, visibilité et types de retour explicites, aucun `any`, `switch` exhaustif sur les discriminants, aucune assertion `!` / `as` injustifiée, Promises explicitement gérées.
2. `npm test` : nouveaux specs et specs mis à jour (section 9).
3. `npm run build`.
4. `npm start` (front seul, façade bouchonnée) :
   - Fiche projet d'un projet du jeu de démonstration ayant des dépendances Maven **et** npm : deux sections « Maven (n) » / « NPM (n) » fermées, badges de statut cohérents (aucun « 0 … »), dépliage au clic, table interne inchangée (copie de la référence, lien « Créer une règle » pour une dépendance non référencée) ;
   - bouton « Exporter en PNG » : les sections de dépendances apparaissent dépliées dans l'image et restent fermées à l'écran après l'export ;
   - Comparaison d'audits sur ce projet : volet Dépendances ventilé par écosystème, titres et badges par type d'évolution, sections vides absentes, message global inchangé quand aucune évolution ;
   - cas « Autres » : via un audit de test comportant une dépendance de manifeste non reconnu, vérifier l'apparition puis la disparition de la section « Autres ».
5. `npm run test:e2e` : parcours complet incluant la nouvelle assertion Fiche projet.

## 12. Points restant ouverts

- **Sections vides** : ce chapitre retient de ne rendre que les sections non vides (Maven ou NPM absente si le projet n'a pas de dépendance de cet écosystème), ce qui s'écarte du modèle des membres (trois sections toujours rendues, avec un corps « Aucun membre… »). À trancher par un humain : rendu conditionnel (retenu) ou Maven et NPM toujours affichées avec un corps « Aucune dépendance déclarée pour cet écosystème ».
- **Comparaison d'audits, décompte de la barre de titre** : décompte par type d'évolution (`Ajout` / `Retrait` / `Changement de statut`) retenu faute de sens d'un décompte « par statut » sur un différentiel. À confirmer ; alternative : décompte par statut d'obsolescence « après ».
- **Ordre des dépendances dans une section** : l'ordre actuel (ordre de parsing des manifestes) est conservé. Un tri par sévérité de statut puis par référence est possible mais non demandé — à confirmer.
- **Titre et nom de fichier du document `plan_17`** : ce chapitre 2 traite un sujet distinct du chapitre 1 (volumétrie). À ajuster (point déjà ouvert au Statut du document).
- Priorité « Should have » de US-056 à confirmer par un humain.
