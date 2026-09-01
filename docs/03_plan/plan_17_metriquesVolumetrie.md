<!-- Document rédigé avec l'assistance de l'IA (Claude Code), conformément à la mention d'origine requise par docs/02_documentation/01_modalitesUsageEtConventions.md. Plan de conception établi à partir d'une demande utilisateur explicite (2026-08-30) ; il précède la mise à jour des documents normatifs et tout développement, qui restent conditionnés à une validation humaine explicite. -->

# Conception — Onglet Métriques de l'écran Administration et volumétrie du fichier de données

## Statut du document

Ce document est structuré en chapitres. Le **chapitre 1** (volumétrie du fichier de données, onglet Métriques de l'écran Administration), le **chapitre 2** (ventilation des dépendances par écosystème sur la Fiche projet et la Comparaison d'audits, rédigé le 2026-08-30), le **chapitre 3** (langages principaux d'un projet, sous forme d'icônes Sonar, sur la Fiche projet et l'écran Obsolescence, rédigé le 2026-09-01) et le **chapitre 4** (régularité des poussées de code des développeurs d'un groupe, écran dédié, rédigé le 2026-09-01) et le **chapitre 5** (repères de montée de version du serveur Sonar sur les graphiques d'évolution, avec masquage des repères par catégorie, rédigé le 2026-09-01) sont indépendants et traitent des sujets distincts. Le sommaire et la numérotation accueillent les chapitres successifs sans renumérotation des précédents.

Le regroupement de plusieurs sujets sans lien direct dans un même document résulte d'une demande explicite ; le titre et le nom de fichier du document restent à ajuster si besoin (cf. paragraphe suivant).

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
- [Chapitre 3 — Langages principaux d'un projet (icônes Sonar) sur la Fiche projet et l'écran Obsolescence (US-057 / RG-057)](#chapitre-3--langages-principaux-dun-projet-icônes-sonar-sur-la-fiche-projet-et-lécran-obsolescence-us-057--rg-057)
  1. [Objet et statut](#1-objet-et-statut-2)
  2. [Décisions actées](#2-décisions-actées-2)
  3. [Périmètre et identifiants d'exigence proposés](#3-périmètre-et-identifiants-dexigence-proposés-2)
  4. [Partie A — Utilitaire de sélection des langages principaux](#4-partie-a--utilitaire-de-sélection-des-langages-principaux)
  5. [Partie B — Composant d'icône de langage partagé](#5-partie-b--composant-dicône-de-langage-partagé)
  6. [Partie C — Fiche projet (F12)](#6-partie-c--fiche-projet-f12-1)
  7. [Partie D — Écran Obsolescence](#7-partie-d--écran-obsolescence)
  8. [Impacts sur le modèle de données et migration](#8-impacts-sur-le-modèle-de-données-et-migration-2)
  9. [Impacts documentaires](#9-impacts-documentaires-2)
  10. [Impacts sur les tests](#10-impacts-sur-les-tests-2)
  11. [Découpage en incréments](#11-découpage-en-incréments-2)
  12. [Vérification de bout en bout](#12-vérification-de-bout-en-bout-1)
  13. [Points restant ouverts](#13-points-restant-ouverts)
- [Chapitre 4 — Régularité des poussées de code des développeurs d'un groupe (US-060 / RG-060)](#chapitre-4--régularité-des-poussées-de-code-des-développeurs-dun-groupe-us-060--rg-060)
  1. [Objet et statut](#1-objet-et-statut-3)
  2. [Décisions actées](#2-décisions-actées-3)
  3. [Périmètre et identifiants d'exigence proposés](#3-périmètre-et-identifiants-dexigence-proposés-3)
  4. [Partie A — Cœur natif : connecteur GitLab et commandes](#4-partie-a--cœur-natif--connecteur-gitlab-et-commandes)
  5. [Partie B — Façade, Store d'orchestration et Moteur de jugement](#5-partie-b--façade-store-dorchestration-et-moteur-de-jugement)
  6. [Partie C — Écran dédié de régularité des poussées](#6-partie-c--écran-dédié-de-régularité-des-poussées)
  7. [Partie D — Seuils paramétrables (Réglages applicatifs)](#7-partie-d--seuils-paramétrables-réglages-applicatifs)
  8. [Impacts sur le modèle de données et migration](#8-impacts-sur-le-modèle-de-données-et-migration-3)
  9. [Impacts documentaires](#9-impacts-documentaires-3)
  10. [Impacts sur les tests](#10-impacts-sur-les-tests-3)
  11. [Découpage en incréments](#11-découpage-en-incréments-3)
  12. [Vérification de bout en bout](#12-vérification-de-bout-en-bout-3)
  13. [Points restant ouverts](#13-points-restant-ouverts-3)
- [Chapitre 5 — Repères de montée de version Sonar sur les graphiques d'évolution (US-061 / RG-061)](#chapitre-5--repères-de-montée-de-version-sonar-sur-les-graphiques-dévolution-us-061--rg-061)
  1. [Objet et statut](#1-objet-et-statut-4)
  2. [Décisions actées](#2-décisions-actées-4)
  3. [Périmètre et identifiants d'exigence proposés](#3-périmètre-et-identifiants-dexigence-proposés-4)
  4. [Partie A — Cœur natif : connecteur Sonar et persistance des repères](#4-partie-a--cœur-natif--connecteur-sonar-et-persistance-des-repères)
  5. [Partie B — Façade, orchestrateur de campagne et intégration du brouillon](#5-partie-b--façade-orchestrateur-de-campagne-et-intégration-du-brouillon)
  6. [Partie C — Graphique d'évolution et Synthèse graphique](#6-partie-c--graphique-dévolution-et-synthèse-graphique)
  7. [Impacts sur le modèle de données et migration](#7-impacts-sur-le-modèle-de-données-et-migration-4)
  8. [Impacts documentaires](#8-impacts-documentaires-4)
  9. [Impacts sur les tests](#9-impacts-sur-les-tests-4)
  10. [Découpage en incréments](#10-découpage-en-incréments-4)
  11. [Vérification de bout en bout](#11-vérification-de-bout-en-bout-4)
  12. [Points restant ouverts](#12-points-restant-ouverts-4)

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

# Chapitre 3 — Langages principaux d'un projet (icônes Sonar) sur la Fiche projet et l'écran Obsolescence (US-057 / RG-057)

## 1. Objet et statut

Ce chapitre décrit l'ajout d'une restitution des **deux langages principaux** d'un projet audité, d'après Sonar, sous forme d'icônes.

- **Fiche projet** (`fiche-projet/:projetId`, F12) : une ligne discrète « Langages principaux » avec une à deux icônes, insérée **au-dessus** de la section « Dépendances » (`src/app/ecrans/fiche-projet/fiche-projet.component.html`, entre la fin du bloc « Indicateurs Sonar » et le `<h2>Dépendances</h2>`).
- **Écran Obsolescence** (`/obsolescence`, US-051) : les mêmes langages, en icônes plus petites, en fin de la ligne portant le nom du projet sur chaque tuile de la grille.

La donnée est **déjà collectée et déjà persistée**. Le connecteur Sonar interroge `ncloc_language_distribution` en même temps que `ncloc` (`src-tauri/src/connecteurs/sonar.rs`, `interroger_ncloc`) et la répartit par langage via `parser_repartition_langages` dans `ResultatSonarNcloc.par_langage: HashMap<String, u64>` (lignes de code par langage). Ce champ traverse la Façade (`ResultatSonarNcloc.parLangage`, `types-facade.ts`), et l'Orchestrateur de campagne le sérialise tel quel dans chaque `Audit.resultats` au sein du résultat de type `sonar.ncloc` (`{ type: tag, ...resultat }`, `orchestrateur-campagne.service.ts`). Le type persisté `Resultat` de `types-donnees.ts` inclut déjà `parLangage`.

Conséquence : **aucune commande native, aucun champ persisté nouveau, aucune migration**. Tout audit régulier réalisé depuis l'ajout de `par_langage` au connecteur porte déjà la ventilation. L'évolution est entièrement de la présentation, plus une fonction pure de sélection.

Sonar n'expose la ventilation par langage qu'en **lignes de code** (`ncloc_language_distribution`) via `measures/component` ; il n'existe pas de métrique « fichiers par langage ». Le tri se fait donc par lignes de code, sans alternative.

Limite connue, sans traitement particulier : un audit historique (C15-14, `date_ciblee` renseigné) porte toujours `par_langage` vide par conception (cf. Rustdoc de `interroger_ncloc` : « `par_langage` reste alors toujours vide, par convention ») ; un audit antérieur à l'ajout de `par_langage` au connecteur ne porte pas la donnée non plus. Dans les deux cas, aucune icône n'est affichée (liste vide, ligne ou zone d'icônes absente). Sur la Fiche projet, la restitution principale s'appuie déjà sur le **dernier audit régulier** (`DernierAuditRegulierUtils`, jamais un audit historique), ce qui limite le cas au seul historique des audits antérieurs à la fonctionnalité.

Statut : ce chapitre précède la mise à jour des documents normatifs et tout développement, qui restent conditionnés à une validation humaine explicite. La méthode du projet s'applique : arbitrage humain, puis mise à jour des documents normatifs, puis développement, sans passage à l'étape suivante sans validation explicite de la précédente.

## 2. Décisions actées

Décisions fonctionnelles, issues des questions posées à l'utilisateur le 2026-09-01 :

- jeu d'icônes : **Devicon** (licence MIT) ;
- Fiche projet : ligne « Langages principaux » placée **au-dessus** de la section « Dépendances » ;
- au plus **deux** langages sont affichés ; **si le second langage représente strictement moins de 10 % des lignes de code totales du projet, il n'est pas affiché** (une seule icône). Ce seuil est une **constante nommée dans le code**, pas une entrée de `parametres` ;
- si Sonar est en échec (RG-013 : bloc « Indicateurs Sonar » grisé sur la Fiche projet), la ligne des langages est **grisée** au même titre que le bloc Sonar ;
- Obsolescence : icônes plus petites, en fin de la ligne du nom du projet sur la tuile ;
- l'évolution constitue ce chapitre 3 du `plan_17`.

Décisions d'architecture :

1. La sélection des langages principaux est une **fonction pure du Moteur de jugement** (`src/app/services/sansetat/jugement/langages-principaux.utils.ts`), sans effet de bord, testée au seuil 90 %. Le départage entre deux langages à nombre de lignes égal est **déterministe** : ordre alphabétique de la clé Sonar. Sans quoi le rendu et le test de bout en bout ne seraient pas rejouables.
2. Le seuil des 10 % et le plafond de 2 sont des **constantes exportées** du module utilitaire (`SEUIL_SECOND_LANGAGE = 0.1`, `NOMBRE_MAX_LANGAGES = 2`), documentées en commentaire comme **décisions arbitraires à valider par un humain** et consignées comme telles dans le rapport de développement (la norme « aucun seuil codé en dur » vise les seuils de jugement lus depuis `parametres`/`referentiels` ; ici il s'agit de paramètres de présentation, tranchés comme constantes par décision humaine explicite).
3. L'affichage d'une icône est confié à un **composant partagé** `SqmIconeLangageComponent` (`src/app/composants/icone-langage/`), standalone, `OnPush`, réutilisé par la Fiche projet et par l'Obsolescence. Il porte une clé de langage Sonar et une taille (`'md' | 'sm'`). Il rend un `<img>` référençant un fichier SVG local ; toute clé Sonar non reconnue produit un **repli textuel** (petite puce portant le libellé), jamais une absence silencieuse ni un échec.
4. Les icônes sont un **sous-ensemble de fichiers SVG Devicon** versionnés sous `public/langages/`, copiés tels quels à la racine du bundle par la configuration `public/` d'Angular (déjà utilisée pour `public/favicon.ico`). La CSP de l'application autorise déjà `img-src 'self' data:` (`src-tauri/tauri.conf.json`) : aucune ressource externe, aucun `[innerHTML]`, aucune injection HTML dynamique (norme de sécurité). Un fichier `public/langages/LICENCE-devicon.txt` porte le texte de licence MIT et l'attribution. La correspondance clé Sonar → nom de fichier est une **table statique** du composant.
   - Alternatives écartées : SVG inline via un composant `@switch` (verbeux ; `[innerHTML]` interdit sans revue) ; data-URI base64 dans un module TS (fichier volumineux). L'approche `<img src="langages/…svg">` est la plus simple et conforme.
5. Accessibilité : `alt` = nom complet du langage (« Java ») ; `title` = nom (option : nom + pourcentage). Aucune information portée par la seule couleur (le libellé est toujours dans `alt`/`title`).
6. Aucune structure persistée ni de transfert. `LangagePrincipal` (`{ cleSonar, pourcentage }`) est une **vue calculée interne**, déclarée dans l'utilitaire, sur le modèle du statut d'obsolescence (RG-011, jamais stocké, recalculé à l'affichage).

## 3. Périmètre et identifiants d'exigence proposés

Derniers identifiants consommés à la date de rédaction (après les chapitres 1 et 2) : `US-056`, `RG-056`. Allocation proposée, à reconfirmer au moment de la qualification effective (une autre session peut consommer des identifiants entre-temps ; en ce cas, décaler l'ensemble en bloc sans réintroduire de trou, sur le principe déjà appliqué en Étape 25).

| identifiant | intitulé | type |
|---|---|---|
| US-057 | Identifier les deux langages principaux d'un projet audité (icônes Sonar) sur la Fiche projet et l'écran Obsolescence | Consultation — Could have |
| RG-057 | Sélection des langages principaux d'un projet : tri par lignes de code Sonar décroissantes (`ncloc_language_distribution`), départage par ordre alphabétique de la clé, au plus deux langages, second langage omis si sa part est strictement inférieure à 10 % du total ; ligne grisée quand l'état Sonar est en échec (alignée sur RG-013) ; aucune icône quand la ventilation est indisponible (audit historique, audit antérieur à la collecte de `ncloc_language_distribution`) | règle de gestion |

RG-057 s'articule avec US-009 / RG-009 (constat brut `sonar.ncloc`), RG-013 (grisage des indicateurs Sonar périmés), RG-046 (audit historique) et RG-011 (jugement recalculé à l'affichage, jamais persisté).

## 4. Partie A — Utilitaire de sélection des langages principaux

### Nouveau fichier `src/app/services/sansetat/jugement/langages-principaux.utils.ts`

En-tête de commentaire de mention IA. Classe `LangagesPrincipauxUtils` à membres statiques uniquement (règle « aucune fonction hors classe »), JSDoc sur la classe et chaque membre, types de retour et visibilité explicites.

```ts
export interface LangagePrincipal {
  /** Clé de langage telle que renvoyée par Sonar (`ncloc_language_distribution`), ex. `java`, `ts`. */
  readonly cleSonar: string;
  /** Part du langage dans le total des lignes de code du projet, en pourcentage entier (0–100). */
  readonly pourcentage: number;
}

export class LangagesPrincipauxUtils {
  /**
   * Part minimale du total (lignes de code) pour qu'un second langage soit restitué (RG-057).
   * Décision arbitraire à valider par un humain (cf. rapport de développement).
   */
  public static readonly SEUIL_SECOND_LANGAGE = 0.1;

  /** Nombre maximal de langages restitués (RG-057). Décision arbitraire à valider par un humain. */
  public static readonly NOMBRE_MAX_LANGAGES = 2;

  /**
   * Sélectionne les langages principaux d'un projet à partir de la ventilation Sonar
   * `ncloc_language_distribution` (RG-057). Tri par lignes de code décroissantes, départage par
   * ordre alphabétique de la clé Sonar (déterminisme). Le second langage est omis si sa part est
   * strictement inférieure à {@link SEUIL_SECOND_LANGAGE} du total. Ventilation vide, entrées
   * toutes nulles ou total nul : liste vide.
   * @param parLangage - Répartition brute `{ clé Sonar → lignes de code }` (`ResultatSonarNcloc.parLangage`).
   * @returns 0 à {@link NOMBRE_MAX_LANGAGES} entrées, la plus volumineuse d'abord.
   */
  public static selectionner(
    parLangage: Readonly<Record<string, number>>,
  ): readonly LangagePrincipal[];
}
```

Corps de `selectionner` : filtrer les entrées de valeur `<= 0` (le bouchon porte des `js: 0`) ; `total` = somme des valeurs restantes ; si `total === 0`, retourner `[]` ; trier par valeur décroissante puis, à égalité, par `cleSonar` croissante ; retenir la première entrée ; retenir la seconde uniquement si `valeur2 / total >= SEUIL_SECOND_LANGAGE` ; `pourcentage = Math.round((valeur / total) * 100)`. Aucune mutation de l'entrée.

### Spec `langages-principaux.utils.spec.ts`

Cas couverts (chaque branche exercée, seuil 90 %) : objet vide → `[]` ; toutes valeurs à `0` → `[]` ; un seul langage → une entrée à `100` ; deux langages à 70/30 → deux entrées, ordre décroissant, pourcentages `70` et `30` ; second langage à 9 % → une seule entrée ; second langage à exactement 10 % → deux entrées (`>=`) ; trois langages 60/30/10 → deux entrées (plafond) ; égalité stricte de lignes entre deux langages → départage alphabétique stable ; entrées nulles ignorées sans fausser le total (`{ java: 900, xml: 100, js: 0 }` → total 1000, `xml` à 10 % affiché).

## 5. Partie B — Composant d'icône de langage partagé

### Nouveau répertoire `src/app/composants/icone-langage/`

- `icone-langage.component.ts` — classe `SqmIconeLangageComponent`, `selector: 'app-icone-langage'`, standalone, `changeDetection: ChangeDetectionStrategy.OnPush`, en-tête de mention IA.
  - `@Input({ required: true }) public cleSonar!: string;`
  - `@Input() public taille: 'md' | 'sm' = 'md';`
  - `private static readonly CORRESPONDANCE: Readonly<Record<string, { readonly fichier: string; readonly libelle: string }>>` : table clé Sonar (minuscule) → nom de fichier SVG (sans extension) sous `public/langages/` et libellé affiché. Entrées initiales : `java`, `js`→`javascript`, `ts`→`typescript`, `cs`→`csharp`, `py`→`python`, `go`, `kotlin`, `scala`, `ruby`, `php`, `swift`, `c`, `cpp`, `objc`, `web`→`html`, `css`, `scss`, `xml`, `yaml`, `json`, `docker`, `terraform`, `plsql`/`tsql`→`sql`. Chaque entrée référencée en commentaire vers RG-057.
  - `protected entree(): { readonly fichier: string; readonly libelle: string } | null` — `SqmIconeLangageComponent.CORRESPONDANCE[this.cleSonar.toLowerCase()] ?? null`.
  - `protected libelle(): string` — libellé de la table si connue, sinon `this.cleSonar` tel quel.
  - `protected source(): string | null` — `entree` connue → `'langages/' + fichier + '.svg'` (chemin relatif servi depuis la racine du bundle), sinon `null`.
  - `protected repli(): string` — libellé tronqué (3–4 caractères, majuscules) pour la puce.
- `icone-langage.component.html` (aucune assertion `!`, narrowing par `@if (… ; as …)`):

```html
@if (source(); as src) {
  <img
    class="icone-langage"
    [class.icone-langage--sm]="taille === 'sm'"
    [src]="src"
    [alt]="libelle()"
    [attr.title]="libelle()"
  />
} @else {
  <span
    class="icone-langage icone-langage--repli"
    [class.icone-langage--sm]="taille === 'sm'"
    [attr.title]="libelle()"
    [attr.aria-label]="libelle()"
    >{{ repli() }}</span
  >
}
```

- `icone-langage.component.scss` : dimensions (`md` ≈ 20 px, `sm` ≈ 12 px), `object-fit: contain`, `flex-shrink: 0` ; puce de repli (fond neutre des classes utilitaires existantes, `texte-xs`, `text-transform: uppercase`, même gabarit carré que l'icône).
- `icone-langage.component.spec.ts` (Jest) : clé mappée (`java`, `ts`) → `<img>` avec `src` `langages/…svg` et `alt` attendus ; casse ignorée (`'JAVA'`) ; clé inconnue (`web` est mappée ; tester `secrets`, `autre`, chaîne vide) → puce de repli portant le libellé, pas de `<img>` ; `taille='sm'` → classe `icone-langage--sm` sur l'élément rendu. Suivi du nombre de méthodes jamais appelées (composant de présentation).

### Assets

- `public/langages/*.svg` : sous-ensemble Devicon (variantes colorées « original » / « plain », lisibles en thèmes clair et sombre). Liste minimale = langages du jeu de démonstration du bouchon + langages JVM / JS / Python courants ; liste exacte figée à l'incrément.
- `public/langages/LICENCE-devicon.txt` : texte MIT + attribution (le fichier n'est pas un fichier de code, la mention d'origine IA ne s'y applique pas ; il s'agit d'une licence tierce reproduite telle quelle).
- Vérifier que `*.svg` sous `public/` est bien copié tel quel par `ng build` (comportement par défaut du dossier `public/`) et **n'est pas** happé par le hook local Prettier/ESLint ni par `prettier --check` (sinon, l'ajouter au périmètre du hook ou à `.prettierignore`/exclusion ESLint — cf. règle de qualité de code du 2026-07-19 sur le périmètre du hook et l'alignement `.prettierignore`).

## 6. Partie C — Fiche projet (F12)

### `src/app/ecrans/fiche-projet/fiche-projet.component.ts`

- `DonneesFicheProjet` : ajout de `readonly langagesPrincipaux: readonly LangagePrincipal[]` (liste vide si la ventilation est indisponible).
- Dans `construireDonnees`, après le calcul de `themes` et de `sonarKo` : `const resultatNcloc = dernierAudit === undefined ? undefined : this.trouverResultat(dernierAudit.resultats, 'sonar.ncloc');` puis, dans la construction de l'objet retourné, `langagesPrincipaux: LangagesPrincipauxUtils.selectionner(resultatNcloc?.parLangage ?? {})`.
  - Vérifier que `'sonar.ncloc'` est accepté par `this.trouverResultat` (il opère sur le type `Resultat` complet — `sonar.ncloc` en fait partie, contrairement au type restreint `ResultatThemeFicheProjet` de `AgregationThemeFicheProjetUtils`).
- Le grisage réutilise le `sonarKo` déjà calculé — aucune logique nouvelle.
- Import de `SqmIconeLangageComponent` et de `LangagesPrincipauxUtils` ; en-tête et JSDoc de classe complétés (mention US-057).

### `fiche-projet.component.html`

Insertion entre la fermeture du bloc `@else` de « Indicateurs Sonar » et le `<h2 …>Dépendances</h2>` :

```html
@if (donnees.langagesPrincipaux.length > 0) {
  <p
    id="fiche-projet-langages-principaux"
    class="fiche-projet__langages d-flex aligne-centre ecart-2 texte-sm"
    [class.fiche-projet__langages--grise]="donnees.sonarKo"
  >
    <span>Langages principaux</span>
    @for (langage of donnees.langagesPrincipaux; track langage.cleSonar) {
      <app-icone-langage [cleSonar]="langage.cleSonar" />
    }
  </p>
}
```

Ligne discrète, sans `<h2>` (à confirmer avec la maquette). Pour afficher le pourcentage au survol, ajouter un `@Input() infobulle?: string` optionnel au composant, alimenté ici par `langage.cleSonar + ' (' + langage.pourcentage + ' %)'`, ou porter un `title` sur le `<p>`.

### `fiche-projet.component.scss`

`.fiche-projet__langages` (alignement horizontal, `gap`, `flex-wrap`) ; `.fiche-projet__langages--grise` mutualise la déclaration d'opacité/filtre déjà portée par `.fiche-projet__bloc-sonar--grise` (sélecteur commun plutôt que duplication).

### `fiche-projet.component.spec.ts`

Nouveau `describe('langages principaux (US-057)')` : audit régulier avec `parLangage` à deux langages tous deux > 10 % → deux `app-icone-langage` sous `#fiche-projet-langages-principaux` ; second langage à 5 % → une seule icône ; `pasDeSonar` ou audit sans résultat `sonar.ncloc` → ligne absente ; `sonarKo` vrai → classe `--grise` présente sur la ligne ; l'affichage des audits historiques restitués séparément (`construireAuditsHistoriques`) n'est pas affecté.

## 7. Partie D — Écran Obsolescence

### `src/app/ecrans/obsolescence/obsolescence.component.ts`

- `LigneObsolescence` : ajout de `readonly langagesPrincipaux: readonly LangagePrincipal[]`.
- Nouvelle méthode statique privée `extraireParLangage(audit: Audit): Readonly<Record<string, number>>` : `find` du résultat de type `sonar.ncloc` dans `audit.resultats` (type-guard par discriminant, sans `as`), renvoie `parLangage` ou `{}`.
- Dans `lignesTousProjets`, après résolution de l'`audit` retenu : `langagesPrincipaux: audit === undefined ? [] : LangagesPrincipauxUtils.selectionner(SqmObsolescenceComponent.extraireParLangage(audit))`.
- `TuileObsolescence` : ajout de `readonly langagesPrincipaux: readonly LangagePrincipal[]` ; le `computed` `tuiles()` le recopie depuis la ligne source.
- `construireInfobulle` : ajouter, quand la liste est non vide, une ligne `Langages : Java, TypeScript` (libellés issus de la table de correspondance du composant — extraire la table dans un petit utilitaire partagé si l'infobulle doit afficher le libellé complet plutôt que la clé Sonar ; sinon afficher la clé).
- Import de `SqmIconeLangageComponent` et de `LangagesPrincipauxUtils`.

### `obsolescence.component.html`

Après le `<span class="obsolescence__nom-projet …">{{ tuile.nomProjet }}</span>` de la tuile :

```html
@if (tuile.langagesPrincipaux.length > 0) {
  <span class="obsolescence__langages d-flex aligne-centre ecart-1">
    @for (langage of tuile.langagesPrincipaux; track langage.cleSonar) {
      <app-icone-langage [cleSonar]="langage.cleSonar" taille="sm" />
    }
  </span>
}
```

### `obsolescence.component.scss`

`.obsolescence__langages` : poussé en fin de ligne (le conteneur du nom passe en `justify-content: space-between`, ou `margin-left: auto` sur la zone d'icônes), icônes 12 px, `flex-shrink: 0`. Le nom du projet garde la priorité d'espace ; sur nom long, la zone d'icônes peut repasser sous le nom (`flex-wrap`), jamais tronquer le nom.

### `obsolescence.component.spec.ts`

Ligne/tuile portant `langagesPrincipaux` d'après le `sonar.ncloc` de l'audit retenu ; projet « jamais audité » → liste vide, aucune `.obsolescence__langages` rendue ; infobulle enrichie de la ligne « Langages : … » quand la liste est non vide.

## 8. Impacts sur le modèle de données et migration

Aucun. `parLangage` existe déjà dans le résultat persisté `sonar.ncloc` (`ResultatSonarNcloc`, miroir TypeScript/Rust) ; `versionSchema` reste inchangé ; aucun palier de migration ; aucune commande native ; aucune structure de transfert. `LangagePrincipal` est une vue calculée non persistée.

## 9. Impacts documentaires

| document | nature de la mise à jour |
|---|---|
| [`04_casUsage.md`](../02_documentation/04_casUsage.md) | Nouvelle ligne US-057 : persona Camille, type Consultation, priorité Could have ; critères d'acceptation = une à deux icônes de langage sur la Fiche projet au-dessus des dépendances et en fin de ligne du nom de projet sur les tuiles de l'écran Obsolescence, sélection des langages selon RG-057, grisage aligné sur l'état Sonar KO, absence d'icône si la ventilation par langage est indisponible ; RG associée RG-057. Mise à jour de la matrice de couverture. |
| [`05_reglesGestion.md`](../02_documentation/05_reglesGestion.md) | Nouvelle RG-057 : source `ncloc_language_distribution` (déjà collectée par le Connecteur Sonar, `sonar.ncloc.parLangage`, lignes de code par langage) ; tri décroissant, départage alphabétique de la clé, au plus deux langages, second omis sous 10 % du total ; grisage aligné sur RG-013 ; aucune icône si la ventilation est vide (audit historique C15-14, audit antérieur). Articulation avec US-009/RG-009, RG-011, RG-013, RG-046. Complément des matrices de traçabilité RG × US. |
| [`08_arborescenceNavigation.md`](../02_documentation/08_arborescenceNavigation.md) | Ajout de `US-057` aux lignes `Fiche projet` et `Obsolescence` de la matrice écrans / user stories. |
| [`09_maquettes.md`](../02_documentation/09_maquettes.md) | Section `### Fiche projet` : ligne « Langages principaux » (une à deux icônes) au-dessus de la section Dépendances, grisée quand les indicateurs Sonar le sont. Section `### Obsolescence` : icônes de langage réduites en fin de ligne du nom de projet sur la tuile, infobulle enrichie. |
| [`13_conceptionDetaillee.md`](../02_documentation/13_conceptionDetaillee.md) | Ligne « UI — Moteur de jugement » : ajout de `LangagesPrincipauxUtils` (fonction pure de sélection). Inventaire des composants partagés : ajout de `SqmIconeLangageComponent`. Note explicite : `ncloc_language_distribution` est déjà interrogée par `sonar::interroger_ncloc` et persistée dans `sonar.ncloc` ; cette évolution n'ajoute aucune commande de la Façade. |
| [`15_normesSecurite.md`](../02_documentation/15_normesSecurite.md) | Bref rappel : les icônes de langage sont servies localement depuis `public/langages/` (`img-src 'self'` déjà en place), aucune ressource externe, aucune injection HTML dynamique (`<img src>`, jamais `[innerHTML]`). |
| [`16_normesTests.md`](../02_documentation/16_normesTests.md) | `langages-principaux.utils` relève du Moteur de jugement (fonctions pures, seuil 90 %) ; `SqmIconeLangageComponent` relève des composants de présentation (suivi du nombre de méthodes jamais appelées) ; une étape/assertion est ajoutée au parcours de bout en bout. |
| [`guide-utilisateur.md`](../guide-utilisateur.md) | Paragraphes Fiche projet et Obsolescence : mentionner l'affichage des langages principaux. Vérifier si les captures `docs/assets/captures/` de ces écrans doivent être régénérées (hors pipeline, script Playwright local) — à signaler, non bloquant. |
| [`04_rapports/rapportDeDeveloppement.md`](../04_rapports/rapportDeDeveloppement.md) | Consigner les décisions arbitraires à valider par un humain : seuil de 10 % pour le second langage, plafond de 2, choix de Devicon et de sa licence, table de correspondance clé Sonar → icône, repli textuel pour une clé non mappée. |

La vérification croisée de traçabilité (règle générale n° 13) est refaite après ces mises à jour.

## 10. Impacts sur les tests

- Tests unitaires Jest, nouveaux specs : `langages-principaux.utils.spec.ts`, `icone-langage.component.spec.ts`.
- Tests unitaires Jest mis à jour : `fiche-projet.component.spec.ts`, `obsolescence.component.spec.ts`.
- Bouchon TypeScript : `donnees-racine-bouchon.ts` et `donnees-bouchon.ts` — retirer les `js: 0` (le filtre les gère, mais autant nettoyer le jeu) ; s'assurer qu'au moins un projet du jeu de démonstration porte une ventilation à deux langages tous deux au-dessus de 10 % (deux icônes, pour l'E2E et les captures) et qu'un autre porte un second langage sous 10 % (une seule icône). `interroger_ncloc` du bouchon n'est pas randomisée : valeurs fixes.
- Test de bout en bout Playwright (`e2e/parcours-complet.spec.ts`) : à l'étape Fiche projet, assertion sur la présence d'au moins une `app-icone-langage` dans `#fiche-projet-langages-principaux` ; à l'étape Obsolescence, assertion sur au moins une `.obsolescence__langages` dans une tuile.
- Rust : aucun impact. `parser_repartition_langages` et ses tests restent inchangés (`cargo test` non affecté).
- Tests de charge : sans objet (sélection d'au plus deux entrées d'une table déjà en mémoire).

## 11. Découpage en incréments

Chaque incrément est développé par un Codeur puis relu par un Relecteur en contexte isolé, et validé par un humain avant le suivant.

1. **Documents normatifs** (section 9) : livrés et validés avant tout code ; confirmation que `US-057` et `RG-057` sont libres au moment de la qualification.
2. **Utilitaire de sélection** (Partie A) : `langages-principaux.utils.ts` et son spec. Indépendant, requis par les incréments 4 et 5.
3. **Composant d'icône et assets** (Partie B) : `SqmIconeLangageComponent`, sous-ensemble Devicon sous `public/langages/`, fichier de licence, spec. Indépendant, requis par les incréments 4 et 5.
4. **Fiche projet** (Partie C) : type, extraction du `sonar.ncloc`, template, SCSS, spec.
5. **Obsolescence** (Partie D) : type, extraction, `tuiles()`, infobulle, template, SCSS, spec.
6. **Bouchon, bout en bout et vérification** : ajustement du jeu de démonstration, étapes Playwright, passe de vérification complète (section 12).

```
Inc.1 ─┐
Inc.2 ─┼─→ Inc.4 ─┐
Inc.3 ─┘   Inc.5 ─┼─→ Inc.6
```

## 12. Vérification de bout en bout

1. `npm run lint` puis `npm run typecheck` : français, JSDoc, visibilité et types de retour explicites, aucun `any`, `switch` exhaustif, aucune assertion `!` / `as` injustifiée, Promises explicitement gérées.
2. `npm test` : nouveaux specs et specs mis à jour (section 10).
3. `npm run build` puis `cd src-tauri && cargo build --locked` : assets `public/langages/` embarqués dans le bundle.
4. `npm start` (front seul, façade bouchonnée) :
   - Fiche projet d'un projet à deux langages majeurs : deux icônes au-dessus de « Dépendances », infobulle au survol, ligne grisée si Sonar est en échec ;
   - Fiche projet d'un projet dont le second langage est sous 10 % : une seule icône ;
   - Fiche projet d'un projet sans source Sonar : pas de ligne « Langages principaux » ;
   - Obsolescence : icônes `sm` en fin de ligne des tuiles, infobulle enrichie, rendu correct sur un nom de projet long (nom non tronqué).
5. `npm run test:e2e` : parcours complet incluant les nouvelles assertions.

## 13. Points restant ouverts

- Forme sur la Fiche projet : ligne discrète « Langages principaux : [icône][icône] » (retenu) ou sous-titre `<h3>` dédié — à figer avec la maquette de l'incrément 1.
- Afficher le pourcentage dans l'infobulle de l'icône (recommandé) ou seulement le nom du langage.
- Repli d'une clé Sonar non mappée : puce portant le libellé court (retenu) ou icône générique « code ».
- Sous-ensemble exact de langages Devicon à versionner sous `public/langages/` — à figer à l'incrément 3 (au minimum les langages du jeu de démonstration + JVM / JS / Python courants).
- Clé Sonar `web` (fichiers HTML/JS/CSS mêlés d'un projet front) : rattachée à l'icône HTML (retenu) ou repli — à confirmer.
- Marques : les logos de langages fournis par Devicon sont des marques tierces ; leur usage relève du domaine de vigilance renforcée « conformité aux référentiels externes » et doit être validé par un humain.
- Infobulle de tuile Obsolescence : afficher le libellé complet du langage suppose de partager la table de correspondance du composant (petit utilitaire dédié) ou d'afficher la clé Sonar brute — à trancher à l'incrément 5.
- Priorité « Could have » de US-057 à confirmer par un humain.

# Chapitre 4 — Régularité des poussées de code des développeurs d'un groupe (US-060 / RG-060)

## 1. Objet et statut

Ce chapitre décrit l'ajout d'un **écran dédié** permettant de vérifier que les développeurs d'un groupe poussent leur code régulièrement sur GitLab, et de repérer, à l'inverse, une inactivité prolongée annonçant un risque de perte de travail non partagé en cas d'absence.

L'écran restitue, pour chaque développeur du groupe analysé, sur une **fenêtre glissante** de quatre semaines par défaut, un **tableau de tri** (une ligne par développeur) portant : la date et l'heure de sa dernière poussée, le dépôt concerné, le nombre de jours ouvrés écoulés depuis, le nombre de poussées et de commits sur la fenêtre, sa cadence médiane de poussée, l'écart entre le silence courant et cette cadence, la part de ses poussées faites en soirée, et un score de risque composite. Le tableau se trie et se filtre entièrement côté interface, sans nouvel appel réseau.

Vocabulaire : conformément à la demande, l'objet d'analyse est **la date et l'heure des poussées** effectivement enregistrées par GitLab ; les commits restés locaux, non poussés, sont hors de portée et l'écran l'explicite. L'« équipe » de la demande correspond à un **groupe applicatif** (`Groupe` du modèle), qui porte déjà son ou ses instances GitLab et ses membres connus.

Périmètre d'une analyse (décision actée n° 2) : un groupe applicatif à la fois, choisi dans un sélecteur en tête d'écran.

Source des horodatages (décision actée n° 1) : les **événements de poussée par membre** (`GET /users/:id/events?action=pushed`), un appel paginé par développeur, indépendamment du nombre de dépôts. L'horodatage retenu est donc l'heure de poussée (`created_at` de l'événement), non l'`authored_date` du commit ; l'identité est l'utilisateur GitLab qui a poussé, ce qui évite toute résolution d'adresse électronique.

Persistance (décision actée n° 3) : le résultat d'une analyse vit **en mémoire de session uniquement**. Aucune donnée d'activité nominative n'est écrite dans le fichier de données. Ce choix relève du domaine de vigilance renforcée « sécurité et confidentialité des données » : les indicateurs produits sont nominatifs et décrivent le rythme de travail de personnes ; leur exploitation a une dimension RH et, selon le contexte, d'information du personnel, qui reste une décision humaine hors périmètre de cet écran.

Statut : ce chapitre précède la mise à jour des documents normatifs et tout développement, qui restent conditionnés à une validation humaine explicite. La méthode du projet s'applique : arbitrage humain, puis mise à jour des documents normatifs, puis développement, sans passage à l'étape suivante sans validation explicite de la précédente.

## 2. Décisions actées

Décisions fonctionnelles, issues des questions posées à l'utilisateur le 2026-09-01 :

1. **Source et mode d'appel** : événements de poussée récupérés par membre (`GET /users/:id/events?action=pushed&after=…`), un appel paginé par développeur ; couvre toutes les branches, identité GitLab fiable, horodatage = heure de poussée.
2. **Périmètre** : un groupe applicatif à la fois (sélecteur en tête d'écran).
3. **Persistance** : résultat en mémoire de session seulement, recalculé à la demande par un bouton « Analyser » ; le tri, le filtrage et toute modification des seuils ne relancent aucun appel réseau.
4. **Volet « commits du soir »** : traité par le seul indicateur de créneau horaire (part des poussées faites dans une plage de soirée paramétrable), sans appel supplémentaire ; le taux d'échec de pipeline est explicitement hors périmètre de ce chapitre.
5. **Visualisation** : tableau de tri (visualisation 1 de l'étude de besoin), à l'exclusion des autres formes proposées (nuage de points, repli par équipe).
6. **Seuils modifiables par l'utilisateur** : fenêtre d'analyse, seuil absolu de jours ouvrés sans poussée, multiplicateur d'écart à la cadence, bornes de la plage de soirée, fuseau horaire de référence, liste de comptes exclus — tous portés par `parametres.cadenceCommits` et édités depuis l'onglet « Réglages applicatifs » du Paramétrage.

Décisions d'architecture :

1. Le **calcul des indicateurs** (dernière poussée, jours ouvrés depuis, cadence médiane, écart à la cadence, coefficient de variation des intervalles, part en soirée, score de risque, statut du membre) est une **fonction pure du Moteur de jugement** (`src/app/services/sansetat/jugement/cadence-poussees.utils.ts`), sans effet de bord, testée au seuil 90 %. Elle prend en entrée l'activité brute déjà récupérée, les seuils courants et l'instant de référence ; elle est réévaluée à chaque changement de seuil sans nouvel appel réseau.
2. Le **cœur natif ne calcule aucun indicateur** : il se limite à la récupération réseau (identité du roster, événements de poussée, correspondance identifiant de dépôt → chemin) et renvoie des données brutes normalisées. Il applique le découpage en couches habituel : connecteur dans `connecteurs/gitlab.rs`, commandes dans un module dédié de la Façade.
3. L'**orchestration multi-appels** (une passe de préparation, puis une boucle sur les membres à concurrence limitée, avec progression réactive) est portée par un **Store d'état applicatif** dédié (`services/avecetat/regularite/`), sur le modèle explicite de `OrchestrateurCampagneService` (progression tenue dans le Store, boucle côté interface à concurrence `parametres.audit.concurrence`).
4. Le **roster** (liste des développeurs à analyser) est obtenu, quand une **référence de groupe GitLab** est fournie, par `GET /groups/:ref/members/all` (paginé, deux à quatre appels pour une centaine de personnes) ; à défaut, par résolution individuelle des règles de membres connus de type `username` et `email` du groupe applicatif (`GET /users?username=` / `GET /users?search=`, un appel par règle). Les règles de type `domaineEmail`, non énumérables via l'API, ne produisent aucun membre dans ce second mode. La référence de groupe GitLab est saisie sur l'écran et conservée en mémoire de session (cf. section 13).
5. Chaque membre du roster est **classé** (interne, client, partenaire, inconnu) par `StatutMembreUtils` contre les membres connus du groupe, exactement comme la ventilation des membres du dépôt (US-017), via son paramètre de type générique `RegleMembreConnu<TStatut>` (aucun import de `services/avecetat/` depuis le Moteur de jugement). Le filtre par défaut du tableau n'affiche que les membres **internes**.
6. Aucune structure persistée ni de transfert n'est ajoutée au fichier de données pour le résultat : `ActivitePousseesDeveloppeur`, `LigneCadencePoussees` et consorts sont des vues calculées internes. Seul `parametres.cadenceCommits` est un ajout persisté (section 8).
7. **Plafond d'appels** : chaque boucle de pagination est bornée par une constante `MAX_PAGES_EVENEMENTS_POUSSEE` (sur le modèle de `MAX_PAGES_CONTRIBUTEURS` du connecteur), documentée comme borne de sécurité arbitraire dans le rapport de développement ; un membre très actif voit ses poussées les plus anciennes tronquées plutôt que de générer un nombre d'appels non borné.

## 3. Périmètre et identifiants d'exigence proposés

Chaîne des identifiants à la date de rédaction : documents normatifs à `US-056` / `RG-056` ; `plan_17` chapitre 3 propose `US-057` / `RG-057` (non intégrés) ; `plan_18` propose `US-058` / `US-059` / `RG-058` / `RG-059` (non intégrés). Allocation proposée ci-dessous, **à reconfirmer au moment de la qualification effective** ; en cas de consommation concurrente, décaler l'ensemble en bloc sans réintroduire de trou (principe déjà appliqué en Étape 25 de `plan_16`).

| identifiant | intitulé | type |
|---|---|---|
| US-060 | Consulter la régularité des poussées de code des développeurs d'un groupe sur une fenêtre glissante (écran dédié, tableau de tri, seuils paramétrables) | Consultation — Should have |
| RG-060 | Calcul des indicateurs de régularité de poussée : source (événements de poussée par membre du roster), fenêtre glissante, définition de chaque indicateur (dernière poussée, jours ouvrés depuis, nombre de poussées et de commits, cadence médiane, écart à la cadence, coefficient de variation des intervalles, part en soirée), seuils paramétrables, score de risque composite, classement par ce score, périmètre des membres retenus et classification par les membres connus | règle de gestion |

RG-060 s'articule avec RG-006 à RG-010 (statut d'un membre connu, réutilisé), RG-017 (concurrence des appels, réutilisée), RG-021 (catégories d'anomalie des clients d'API, appliquées aux nouveaux appels) et RG-031 (réglages applicatifs de session, étendus par les nouveaux seuils).

L'édition des seuils étend les critères d'acceptation de **US-034** (réglages applicatifs de session) et **US-040** (moment de prise en compte d'une modification de paramétrage).

## 4. Partie A — Cœur natif : connecteur GitLab et commandes

### Connecteur `src-tauri/src/connecteurs/gitlab.rs`

Trois fonctions `pub(crate) async`, chacune sur le patron des fonctions existantes (gestion des statuts 401 / 403 / non-2xx en `ErreurConnecteur::{AuthentificationRefusee, DroitsInsuffisants, ReponseInattendue}`, erreur réseau mappée par `erreur_depuis_reqwest`, pagination `per_page=100` bornée) :

- `lister_membres_groupe(url_base, credential, groupe_ref, client) -> Result<Vec<MembreGroupeGitlab>, ErreurConnecteur>` : `GET /groups/{ref}/members/all`, paginé jusqu'à épuisement ou `MAX_PAGES_CONTRIBUTEURS`, sur le modèle de `recuperer_usernames_membres_groupe` (dont la structure de réponse `ReponseMembre` est étendue pour capter `id`, `name` et `state`) ; `groupe_ref` encodé via l'utilitaire d'encodage de segment déjà employé pour les refs. Ne retient que les membres `state == "active"`. `MembreGroupeGitlab { id: u64, username: String, nom: String }`.
- `lister_projets_groupe(url_base, credential, groupe_ref, client) -> Result<Vec<ProjetGroupeGitlab>, ErreurConnecteur>` : `GET /groups/{ref}/projects?simple=true&include_subgroups=true&per_page=100`, paginé ; `ProjetGroupeGitlab { id: u64, chemin: String }` (`path_with_namespace`). Sert à afficher un nom de dépôt lisible dans le tableau ; un identifiant de dépôt hors périmètre du groupe reste affiché tel quel.
- `lister_evenements_poussees(url_base, credential, utilisateur_id, apres_date, client) -> Result<Vec<EvenementPoussee>, ErreurConnecteur>` : `GET /users/{id}/events?action=pushed&after={apres_date}&per_page=100&sort=asc`, paginé jusqu'à épuisement ou `MAX_PAGES_EVENEMENTS_POUSSEE`. `apres_date` au format `YYYY-MM-DD` fixé à la veille du début de fenêtre (le paramètre `after` de GitLab est exclusif et à granularité de jour) ; le filtrage fin sur l'instant exact de début de fenêtre est fait côté interface. Ignore les événements dont `push_data.action == "removed"` ou `push_data.commit_count == 0` (suppression de branche). `EvenementPoussee { horodatage: String, projet_id: u64, ref_poussee: String, nombre_commits: u32 }` (depuis `created_at` et `push_data.{ref, commit_count}`).

Constante `const MAX_PAGES_EVENEMENTS_POUSSEE: u32 = 10;` avec Rustdoc renvoyant à `MAX_PAGES_CONTRIBUTEURS` et au rapport de développement (borne arbitraire).

Tests `#[cfg(test)]` du connecteur (client HTTP simulé, jamais d'appel réseau réel — cf. norme de tests) : pour chacune des trois fonctions, une réponse nominale multi-pages et une réponse par catégorie d'anomalie RG-021 (401, 403, 5xx, corps non désérialisable, délai dépassé, instance injoignable) ; pour `lister_evenements_poussees`, l'exclusion des événements `removed` / `commit_count == 0` et l'arrêt à `MAX_PAGES_EVENEMENTS_POUSSEE`.

### Commandes de la Façade — nouveau module `src-tauri/src/commandes/regularite_poussees.rs`

Déclaration `pub(crate) mod regularite_poussees;` dans `src-tauri/src/commandes.rs` (ordre alphabétique). En-tête de mention IA, documentation de module `//!` référençant US-060 et RG-060.

Deux commandes, chacune journalisant début et fin (`consigner_debut_commande` / `consigner_fin_commande`, obligatoire même sans écriture disque — cf. norme de développement) et un appel de connecteur (`consigner_appel_connecteur` / `consigner_resultat_connecteur`) :

- `preparer_analyse_regularite(instance: Instance, groupe_gitlab: Option<String>, membres_connus: Vec<MembreConnu>, etat: State<'_, EtatSession>) -> Result<PreparationAnalyseRegularite, ErreurConnecteur>` : résout le credential mémorisé de l'instance (helper `credential_instance`, extrait de `commandes/audit.rs` vers un module partagé `commandes/commun.rs`) ; si `groupe_gitlab` est renseigné, appelle `lister_membres_groupe` puis `lister_projets_groupe` ; sinon, résout les règles `username` / `email` de `membres_connus` via `GET /users` (nouvelle fonction `resoudre_utilisateurs` du connecteur, un appel par règle, borné). Retourne `PreparationAnalyseRegularite { membres: Vec<MembreGroupeGitlab>, projets: Vec<ProjetGroupeGitlab> }`.
- `lister_evenements_poussees_membre(instance: Instance, utilisateur_id: u64, apres_date: String, etat: State<'_, EtatSession>) -> Result<Vec<EvenementPoussee>, ErreurConnecteur>` : délègue à `connecteurs::gitlab::lister_evenements_poussees`. Commande volontairement fine, appelée en boucle par le Store à concurrence limitée, pour une progression réactive et une journalisation par membre.

Les deux commandes rejettent une instance de type Sonar (`ErreurConnecteur::ReponseInattendue`, défense en profondeur, comme les commandes d'audit GitLab existantes).

### Enregistrement

`src-tauri/src/lib.rs` : ajouter `commandes::regularite_poussees::preparer_analyse_regularite` et `commandes::regularite_poussees::lister_evenements_poussees_membre` au `tauri::generate_handler!`.

Contraintes transverses : aucun `.unwrap()` / `.expect()`, `#![forbid(unsafe_code)]` déjà global, visibilité la plus restrictive, Rustdoc sur tout élément public, credential transmis en en-tête `PRIVATE-TOKEN` uniquement (jamais en paramètre d'URL — norme de sécurité), aucune donnée sensible journalisée.

## 5. Partie B — Façade, Store d'orchestration et Moteur de jugement

### Façade de commandes et bouchon TypeScript

`src/app/services/sansetat/commandes/facade-commandes.service.ts` (ou une façade dédiée `facade-regularite.service.ts` si la taille le justifie) : deux méthodes `public async`, type de retour explicite, JSDoc, sur le modèle de `interrogerContributeurs` :

- `preparerAnalyseRegularite(parametres): Promise<PreparationAnalyseRegularite>` déléguant à `invoke('preparer_analyse_regularite', …)` ;
- `listerEvenementsPousseesMembre(parametres): Promise<readonly EvenementPoussee[]>` déléguant à `invoke('lister_evenements_poussees_membre', …)`.

Les paramètres d'entrée référençant `Instance` et `MembreConnu` (types possédés par un Store `avecetat/etat/`) restent **génériques** (`<TInstance, TMembreConnu>`), conformément à la règle de frontière unique de la Façade de commandes.

`src/app/services/sansetat/commandes/bouchon/` : nouveau `bouchon-regularite.utils.ts` et son spec ; enregistrement des deux commandes dans le `Set` de `bouchon-commandes.utils.ts`. Jeu de démonstration **déterministe** (valeurs fixes, jamais aléatoires — norme E2E) : un groupe d'au moins quatre développeurs synthétiques — un régulier (poussées quotidiennes), un silencieux depuis une dizaine de jours ouvrés, un « du soir » (poussées concentrées après 19 h), un irrégulier (rafales puis silence) — et deux à trois dépôts. Un délai artificiel fixe sur `lister_evenements_poussees_membre` permet d'exercer réellement l'indicateur de progression.

### Types et Store d'orchestration — `src/app/services/avecetat/regularite/`

`regularite-poussees.types.ts` : `EvenementPoussee`, `PreparationAnalyseRegularite`, `ActivitePousseesDeveloppeur { membre: { id: number; username: string; nom: string }; evenements: readonly EvenementPoussee[] }`, `LigneCadencePoussees` (cf. util ci-dessous), toutes en `readonly`, miroir strict des structures Rust en `camelCase`.

`regularite-poussees.service.ts` : Store stateful, `@Injectable({ providedIn: 'root' })`, JSDoc.

- Signaux privés puis exposés en lecture seule : `enCours: boolean`, `progression: { traites: number; total: number } | null`, `instantAnalyse: Date | null`, `groupeGitlabSaisi: string`, `activiteBrute: readonly ActivitePousseesDeveloppeur[] | null`, `cheminsDepotsParId: ReadonlyMap<number, string>`.
- `public async analyser(groupeApplicatifId: string, groupeGitlab: string): Promise<void>` : résout l'instance GitLab du groupe applicatif via `DonneesApplicationService` ; appelle `preparerAnalyseRegularite` ; puis boucle sur les membres avec une concurrence égale à `parametres.audit.concurrence` (réutilisation du même utilitaire de pool que `OrchestrateurCampagneService`), en appelant `listerEvenementsPousseesMembre` et en mettant à jour `progression` après chaque membre ; agrège dans `activiteBrute` et fixe `instantAnalyse`. Toute erreur d'un membre est consignée via `NotificationService` et n'interrompt pas la boucle ; une erreur de préparation interrompt l'analyse. `enCours` encadre l'ensemble.
- `public readonly lignes: Signal<readonly LigneCadencePoussees[]>` : `computed` appelant `CadencePousseesUtils.analyser(this.activiteBrute() ?? [], seuils, this.cheminsDepotsParId(), reglesMembresConnus, maintenant)` où `seuils` provient de `donneesApplication.racine()?.parametres.cadenceCommits` (repli sur les valeurs par défaut) et `reglesMembresConnus` est la projection générique des membres connus du groupe. Recalcul automatique à tout changement de seuil, **sans** relancer `analyser`.
- `public reinitialiser(): void` : vide l'état (changement de groupe sélectionné).

### Moteur de jugement — `src/app/services/sansetat/jugement/cadence-poussees.utils.ts`

En-tête de mention IA. Classe `CadencePousseesUtils` à membres statiques uniquement, JSDoc sur la classe et chaque membre, types de retour et visibilité explicites, aucune fonction hors classe, aucun `any`.

```ts
export interface SeuilsCadencePoussees {
  readonly fenetreJours: number;
  readonly seuilJoursOuvresSansPoussee: number;
  readonly multiplicateurEcartCadence: number;
  readonly heureDebutSoiree: number;
  readonly heureFinSoiree: number;
  readonly fuseauHoraire: string;
  readonly comptesExclus: readonly string[];
}

export type StatutDeveloppeur = 'interne' | 'client' | 'partenaire' | 'inconnu';
export type AlerteCadence = 'inactivite' | 'irregularite' | 'soiree';

export interface LigneCadencePoussees {
  readonly username: string;
  readonly nom: string;
  readonly statut: StatutDeveloppeur;
  readonly dernierePousseeIso: string | null;
  readonly depotDernierePoussee: string | null;
  readonly joursOuvresDepuisDernierePoussee: number | null;
  readonly nombrePoussees: number;
  readonly nombreCommits: number;
  readonly cadenceMedianeHeures: number | null;
  readonly ecartCadence: number | null;
  readonly partSoiree: number | null;
  readonly scoreRisque: number;
  readonly alertes: readonly AlerteCadence[];
  readonly donneesInsuffisantes: boolean;
}
```

- `public static analyser(activite, seuils, cheminsDepotsParId, reglesMembresConnus, maintenantIso): readonly LigneCadencePoussees[]` : une ligne par développeur non exclu (`seuils.comptesExclus`), filtrée à la fenêtre `[maintenant − fenetreJours ; maintenant]`, triée par `scoreRisque` décroissant.
- Méthodes privées pures : `joursOuvresEntre(depuisIso, jusquaIso)` (lundi-vendredi, jours fériés ignorés — cf. section 13), `medianeIntervallesHeures(horodatagesTries)`, `coefficientVariation(intervalles)`, `partCreneauSoiree(evenements, seuils)` — conversion de chaque `created_at` dans `seuils.fuseauHoraire` via `Intl.DateTimeFormat(seuils.fuseauHoraire, { hour: 'numeric', hour12: false })` (déterministe, fuseau passé explicitement, gère l'heure d'été), plage traitée avec repli circulaire quand `heureDebutSoiree > heureFinSoiree` ; `scoreComposite(...)` — somme pondérée normalisée des trois signaux (inactivité rapportée à `seuilJoursOuvresSansPoussee`, écart à la cadence rapporté à `multiplicateurEcartCadence`, part en soirée), pondérations `0,5 / 0,3 / 0,2` en constantes de classe documentées comme décision arbitraire à valider par un humain (cf. section 13).
- `donneesInsuffisantes` vrai (et `cadenceMedianeHeures` / `ecartCadence` / `coefficientVariation` à `null`) quand le développeur a strictement moins de deux poussées sur la fenêtre.
- Le statut vient de `StatutMembreUtils` (import interne au Moteur de jugement, aucun accès `avecetat/`).

### Spec `cadence-poussees.utils.spec.ts`

Chaque branche exercée (seuil 90 %) : fenêtre vide → aucune ligne ; un seul développeur régulier → cadence et écart cohérents ; développeur à une seule poussée → `donneesInsuffisantes` ; jours ouvrés (week-end sauté, même jour → 0, vendredi → lundi → 1) ; médiane sur 0 / 1 / 2 / n intervalles ; coefficient de variation nul pour des intervalles identiques ; part en soirée avec plage circulaire (19 h → 7 h) et deux fuseaux distincts, dont un cas d'heure d'été ; `comptesExclus` retire la ligne ; score composite monotone (silence plus long ⇒ score plus élevé, toutes choses égales) ; tri décroissant stable ; classification interne / client / partenaire / inconnu contre des règles de membres connus.

## 6. Partie C — Écran dédié de régularité des poussées

### Route et branchement dans la coquille

- Nouveau répertoire `src/app/ecrans/regularite-poussees/`.
- Route `/regularite-poussees` (avec `withHashLocation()` déjà en place) ajoutée à la configuration de routage, `SqmRegularitePousseesComponent` en `loadComponent`.
- Nouvelle entrée de la sidebar. L'ordre de la sidebar est « unique et fixe » et relève d'une décision humaine (cf. `08_arborescenceNavigation.md`) : placement proposé **après Obsolescence, avant Liste de travail** ; libellé proposé « Régularité des poussées » (cf. section 13).

### `regularite-poussees.component.ts`

- Classe `SqmRegularitePousseesComponent`, `selector: 'app-regularite-poussees'`, standalone, `ChangeDetectionStrategy.OnPush`, en-tête de mention IA.
- Dépendances : `inject(RegularitePousseesService)`, `inject(DonneesApplicationService)`, `inject(NotificationService)`.
- Signaux de saisie : `groupeSelectionneId: WritableSignal<string | null>`, `referenceGroupeGitlab: WritableSignal<string>` (miroir de `store.groupeGitlabSaisi`).
- Signaux de tri et de filtrage, tous locaux (aucun appel réseau) : `colonneTri`, `sensTri` (défaut : score de risque décroissant), `filtreStatut` (défaut : `'interne'`), `filtreTexte`, `seulementAlertes`.
- `computed` `lignesAffichees()` : applique filtres puis tri à `store.lignes()`. Le changement d'un de ces signaux **ne déclenche jamais** `store.analyser`.
- Compteurs d'en-tête dérivés (`nombreDeveloppeurs()`, `nombreEnAlerte()`), avec JSDoc et type de retour explicite.
- `public groupesAnalysables()` : groupes du fichier possédant au moins une instance GitLab.
- `public async lancerAnalyse(): Promise<void>` : garde sur `groupeSelectionneId` non nul et `referenceGroupeGitlab` non vide ; délègue à `store.analyser(...)`.
- `public trierPar(colonne): void`, `public reinitialiserFiltres(): void`.
- Tout `switch` sur `StatutDeveloppeur` ou `AlerteCadence` est exhaustif.

### `regularite-poussees.component.html`

- Bandeau supérieur : sélecteur de groupe (`groupesAnalysables()`), champ texte « Groupe GitLab (chemin ou identifiant) », bouton « Analyser », horodatage de la dernière analyse (« Analyse du … »), rappel « Les commits non poussés ne sont pas visibles ».
- `@if (store.enCours()) { <indicateur de chargement + progression traites/total> }`.
- `@else if (store.instantAnalyse(); as instant) { <barre de filtres> <table> }` :
  - barre de filtres : statut (défaut interne), recherche texte, case « seulement les lignes en alerte », lien « Ajuster les seuils » vers Paramétrage › Réglages applicatifs.
  - tableau trié : colonnes **Développeur**, **Statut**, **Dernière poussée** (date et heure locales), **Dépôt**, **Jours ouvrés depuis**, **Poussées / commits (fenêtre)**, **Cadence médiane**, **Écart à la cadence**, **Part en soirée**, **Score de risque**. En-têtes cliquables (tri). Cellules colorées par rapport aux seuils (classes utilitaires existantes, aucune couleur codée en dur), badge d'alerte par ligne. Ligne « données insuffisantes » quand `donneesInsuffisantes`.
  - une frise compacte des horodatages de poussée sur la fenêtre (un repère par poussée) peut être insérée en cellule de fin de ligne (cf. section 13).
- `@else { <état initial : « Sélectionnez un groupe puis lancez une analyse. » > }`.

### `regularite-poussees.component.scss`

Mise en forme du tableau (en-têtes collants, débordement horizontal `deborde-auto`, indicateur de colonne triée), badges d'alerte, frise compacte. Aucune règle de couleur métier codée ici : la coloration des cellules s'appuie sur les classes de statut existantes.

### `regularite-poussees.component.spec.ts` (Jest)

`jest.mock('@tauri-apps/api/core', …)` ; Store alimenté par une `activiteBrute` de test. Assertions : le tri et le filtrage modifient `lignesAffichees()` **sans** appeler `invoke` ; changement d'un seuil (`parametres.cadenceCommits`) recolore / réordonne le tableau sans nouvel `invoke` ; filtre statut par défaut = interne ; état initial et état de progression ; bouton « Analyser » désactivé tant que groupe ou référence GitLab manquent. Suivi du nombre de méthodes jamais appelées (composant de présentation).

## 7. Partie D — Seuils paramétrables (Réglages applicatifs)

### Modèle et commande

`src-tauri/src/modele/racine.rs` : nouvelle structure `CadenceCommits`, `#[derive(Debug, Clone, Serialize, Deserialize, PartialEq)]`, `#[serde(rename_all = "camelCase")]`, avec `impl Default` :

| champ | type | défaut | rôle |
|---|---|---|---|
| `fenetre_jours` | `u32` | `28` | largeur de la fenêtre glissante |
| `seuil_jours_ouvres_sans_poussee` | `u32` | `3` | seuil absolu d'alerte d'inactivité |
| `multiplicateur_ecart_cadence` | `f64` | `2.0` | facteur au-delà duquel le silence courant est jugé anormal par rapport à la cadence médiane personnelle |
| `heure_debut_soiree` | `u8` | `19` | borne basse de la plage de soirée (heure locale) |
| `heure_fin_soiree` | `u8` | `7` | borne haute de la plage de soirée (repli circulaire) |
| `fuseau_horaire` | `String` | `"Europe/Paris"` | fuseau IANA de conversion des horodatages pour la plage de soirée et les jours ouvrés |
| `comptes_exclus` | `Vec<String>` | `[]` | identifiants de connexion exclus (robots, comptes de service) |

Champ `#[serde(default)]` `cadence_commits: CadenceCommits` ajouté à `Parametres`. Toutes ces valeurs par défaut sont des **décisions arbitraires** (aucun texte normatif ni `docs/01_besoin/exemple-donnees.json` ne les fixe) : documentées en commentaire au plus près de `Default` et signalées comme telles dans le rapport de développement.

`src-tauri/src/commandes/parametrage.rs` : nouvelle commande `definir_parametres_cadence_commits(...)` sur le gabarit exact de `definir_concurrence_audit` — validation de forme (fenêtre 7–90 jours, seuil ≥ 1, multiplicateur ≥ 1, heures 0–23, `fuseau_horaire` non vide), écriture dans `parametres.cadence_commits`, entrée de journal des modifications, journalisation technique début / fin. Enregistrement dans `lib.rs`.

### Interface

`src/app/services/avecetat/etat/types-donnees.ts` : `CadenceCommits` miroir en `camelCase`.

`src/app/services/avecetat/etat/donnees-application.service.ts` : `public async definirParametresCadenceCommits(parametres: CadenceCommits): Promise<ResultatDefinitionParametre>` avec JSDoc, sur le modèle de `definirConcurrenceAudit`.

`src/app/ecrans/parametrage/reglages-applicatifs/reglages-applicatifs-parametrage.component.ts` et son template : nouvelle section « Régularité des poussées », formulaire des sept réglages, validation miroir de la validation native, message de portée « s'applique au prochain calcul de l'écran Régularité des poussées » (US-040). `src/app/services/sansetat/commandes/bouchon/bouchon-parametrage.utils.ts` : cas de la nouvelle commande.

## 8. Impacts sur le modèle de données et migration

Ajout du sous-objet `parametres.cadenceCommits` (`#[serde(default)]` + `impl Default`) : un fichier antérieur récupère les valeurs par défaut, aucune transformation de donnée nécessaire. Conformément à la convention du projet (cf. `migration_4_vers_5`, qui a introduit un palier de transformation nulle pour un simple ajout de champs à `#[serde(default)]`), un nouveau palier `migration_10_vers_11` (transformation nulle, bump de `versionSchema` de `10` à `11`) est ajouté à `ETAPES_MIGRATION_REELLES`, et `VERSION_SCHEMA_COURANTE` passe à `11`. À **coordonner avec `plan_18`** s'il introduit lui aussi un palier : un seul incrément consomme le palier `11`, l'autre prend `12`, sans trou.

Le résultat d'une analyse n'est jamais persisté (`ActivitePousseesDeveloppeur`, `LigneCadencePoussees` : vues calculées en mémoire). `CadenceCommits` est la seule structure persistée ajoutée ; elle est exportée en clair avec le reste de `parametres` par l'export de configuration partageable (aucune donnée nominative : uniquement des seuils et une liste de comptes exclus).

## 9. Impacts documentaires

| document | nature de la mise à jour |
|---|---|
| [`04_casUsage.md`](../02_documentation/04_casUsage.md) | Nouvelle ligne US-060 : persona Camille, type Consultation, priorité Should have ; critères d'acceptation = tableau par développeur d'un groupe sur fenêtre glissante, indicateurs de dernière poussée / jours ouvrés depuis / cadence médiane / écart à la cadence / part en soirée / score de risque, tri et filtrage sans nouvel appel réseau, seuils modifiables depuis le Paramétrage, résultat non persisté, rappel de la non-visibilité des commits locaux ; RG associée RG-060. Compléter les critères d'acceptation d'US-034 (nouveaux réglages) et d'US-040 (message de portée « au prochain calcul »). Mise à jour de la matrice de couverture. |
| [`05_reglesGestion.md`](../02_documentation/05_reglesGestion.md) | Nouvelle RG-060 : source (événements de poussée par membre du roster ; roster = membres du groupe GitLab, ou résolution des règles de membres connus `username` / `email`), fenêtre glissante paramétrable, définition exacte de chaque indicateur, jours ouvrés (lundi-vendredi, jours fériés ignorés), plage de soirée à repli circulaire dans un fuseau paramétrable, score de risque composite et pondérations, classement par ce score, filtre par défaut sur les membres internes, classification par les membres connus (RG-006 à RG-010), concurrence des appels (RG-017), catégories d'anomalie (RG-021), résultat jamais persisté. Articulation avec RG-031 (nouveaux réglages applicatifs). Complément des matrices de traçabilité RG × US. |
| [`08_arborescenceNavigation.md`](../02_documentation/08_arborescenceNavigation.md) | Ajout de l'écran « Régularité des poussées » dans l'arborescence et dans l'ordre de la sidebar (placement à valider par un humain) ; nouvelle ligne dans la matrice écrans / user stories avec US-060 ; règle de navigation : accès depuis la sidebar uniquement, lien contextuel « Ajuster les seuils » vers Paramétrage. |
| [`09_maquettes.md`](../02_documentation/09_maquettes.md) | Nouvelle section « ### Régularité des poussées » : bandeau (sélecteur de groupe, champ Groupe GitLab, bouton Analyser, horodatage), indicateur de progression, barre de filtres, tableau trié à dix colonnes avec cellules colorées et badges d'alerte, frise compacte des horodatages, états initial et « analyse en cours ». Section « ### Paramétrage » : nouvelle zone « Régularité des poussées » de l'onglet Réglages applicatifs. |
| [`12_modeleDonnees.md`](../02_documentation/12_modeleDonnees.md) | Description de `parametres.cadenceCommits` (sept champs, valeurs par défaut, décision arbitraire) ; palier `migration_10_vers_11` et passage de `versionSchema` à `11` (coordination `plan_18`) ; note que le résultat d'analyse de régularité est une vue calculée non persistée. |
| [`13_conceptionDetaillee.md`](../02_documentation/13_conceptionDetaillee.md) | Inventaire des commandes de la Façade : `preparerAnalyseRegularite` et `listerEvenementsPousseesMembre` (entrées / sorties, consultation pure, journalisation début / fin, rejet d'une instance Sonar) et `definirParametresCadenceCommits`. Connecteur GitLab : `lister_membres_groupe`, `lister_projets_groupe`, `lister_evenements_poussees`, `resoudre_utilisateurs`. Ligne « UI — Moteur de jugement » : ajout de `CadencePousseesUtils` (fonction pure). Nouveau Store `RegularitePousseesService` (orchestration multi-appels à concurrence limitée, sur le modèle de l'Orchestrateur de campagne). Nouvel écran `SqmRegularitePousseesComponent`. |
| [`15_normesSecurite.md`](../02_documentation/15_normesSecurite.md) | Rappel : les indicateurs de régularité sont nominatifs et vivent en mémoire de session uniquement ; aucun écrit disque, aucune télémétrie, aucun envoi distant ; credential transmis en en-tête `PRIVATE-TOKEN`. Note de vigilance : l'exploitation d'indicateurs de rythme de travail individuels a une dimension RH / d'information du personnel qui relève d'une décision humaine, hors périmètre applicatif. |
| [`16_normesTests.md`](../02_documentation/16_normesTests.md) | `cadence-poussees.utils` relève du Moteur de jugement (fonctions pures, seuil 90 %) ; les trois fonctions de connecteur relèvent des clients d'API (réponses HTTP simulées, chaque catégorie RG-021 testée, jamais d'appel réel en CI) ; `SqmRegularitePousseesComponent` relève des composants de présentation (suivi du nombre de méthodes jamais appelées) ; une étape est ajoutée au parcours de bout en bout ; un scénario de charge est ajouté (analyse simulée à ~100 membres, concurrence RNF-004, rendu du tableau sous RNF-001). |
| [`17_posteDeveloppeur.md`](../02_documentation/17_posteDeveloppeur.md) | Mention, si un test d'intégration réel est ajouté (hors CI), des variables `SQM_TEST_GITLAB_*` déjà définies ; sinon, aucune nouvelle variable. |
| [`guide-utilisateur.md`](../guide-utilisateur.md) | Nouveau paragraphe « Régularité des poussées » : objet de l'écran, lecture du tableau, réglage des seuils, limite (commits non poussés invisibles). Capture `docs/assets/captures/` à générer hors pipeline — à signaler, non bloquant. |
| [`04_rapports/rapportDeDeveloppement.md`](../04_rapports/rapportDeDeveloppement.md) | Consigner les décisions arbitraires à valider par un humain : fenêtre de 28 jours, seuil de 3 jours ouvrés, multiplicateur 2, plage 19 h – 7 h, fuseau « Europe/Paris », pondérations du score composite (0,5 / 0,3 / 0,2), bornes `MAX_PAGES_EVENEMENTS_POUSSEE` et `MAX_PAGES_PROJETS`, choix du roster (groupe GitLab puis repli sur les membres connus), jours fériés ignorés dans le calcul des jours ouvrés, attribution d'une poussée au pousseur et non aux auteurs des commits qu'elle contient. |

La vérification croisée de traçabilité (règle générale n° 13) est refaite après ces mises à jour : chaque nouveau module / composant couvert par au moins un test ; RG-060 reliée à au moins un test unitaire et au parcours de bout en bout ; le scénario de charge relié à RNF-004 et RNF-001.

## 10. Impacts sur les tests

- Tests unitaires Rust : connecteur (`lister_membres_groupe`, `lister_projets_groupe`, `lister_evenements_poussees`, `resoudre_utilisateurs`) avec client HTTP simulé, chaque catégorie RG-021 et la pagination bornée ; `CadenceCommits::default` et la validation de `definir_parametres_cadence_commits` ; non-régression de `cargo test` et du chaînage de migration (nouveau palier `10 → 11`).
- Tests unitaires Jest, nouveaux specs : `cadence-poussees.utils.spec.ts` (seuil 90 %), `regularite-poussees.service.spec.ts` (orchestration, concurrence, progression, erreur partielle, recalcul sur changement de seuil sans ré-appel), `regularite-poussees.component.spec.ts` (tri / filtrage sans `invoke`, colonnes, états), `bouchon-regularite.utils.spec.ts`.
- Tests unitaires Jest mis à jour : `reglages-applicatifs-parametrage.component.spec.ts` (nouvelle section et validation), `bouchon-parametrage.utils.spec.ts`, `bouchon-commandes.utils.spec.ts` (décompte de commandes reconnues), le spec de routage / sidebar de la coquille.
- Test de bout en bout Playwright (`e2e/parcours-complet.spec.ts`) : nouvelle étape après un écran existant — navigation vers « Régularité des poussées », sélection d'un groupe, saisie de la référence de groupe GitLab bouchonnée, clic « Analyser », attente du tableau, clic sur un en-tête de colonne (le tri s'applique, aucun nouvel appel), assertion sur au moins une ligne en alerte et sur le développeur « silencieux » du jeu de démonstration. Capture d'écran si le parcours en produit une par écran.
- Tests de charge : nouveau scénario — bouchon à latence contrôlée simulant ~100 membres, vérification du respect de la concurrence par défaut (RNF-004) et de la régularité de la progression, puis rendu du tableau trié comparé au seuil RNF-001 (< 2 s) une fois l'activité reçue.
- Hooks locaux Prettier / ESLint / `npm run typecheck` en fin de chaque tour d'édition ; `cargo fmt` / Clippy côté Rust.

## 11. Découpage en incréments

Chaque incrément est développé par un Codeur puis relu par un Relecteur en contexte isolé, et validé par un humain avant le suivant.

1. **Documents normatifs** (section 9) : livrés et validés avant tout code ; confirmation que `US-060` et `RG-060` sont libres au moment de la qualification, et coordination du palier de migration avec `plan_18`.
2. **Cœur natif — connecteur et commandes d'analyse** (Partie A) : trois fonctions de connecteur, module `commandes/regularite_poussees.rs`, extraction de `credential_instance` vers `commandes/commun.rs`, enregistrement, tests Rust. Fige le contrat des structures brutes en `camelCase`.
3. **Paramètre `parametres.cadenceCommits`** (Partie D) : modèle et `Default`, palier `migration_10_vers_11`, commande `definir_parametres_cadence_commits`, méthode du Store d'état, section de l'onglet Réglages applicatifs, bouchon parametrage, tests. Indépendant de l'incrément 2.
4. **Façade TypeScript, bouchon et Store d'orchestration** (Partie B, hors Moteur de jugement) : méthodes de façade, `bouchon-regularite.utils.ts`, `RegularitePousseesService`, types miroir.
5. **Moteur de jugement** (Partie B) : `cadence-poussees.utils.ts` et son spec. Indépendant, requis par l'incrément 6.
6. **Écran dédié** (Partie C) : composant, template, SCSS, route, entrée de sidebar, spec.
7. **Bout en bout, charge et vérification** : étape Playwright, scénario de charge, passe de vérification complète (section 12).

```
Inc.1 ─┐
Inc.2 ─┼─→ Inc.4 ─┐
Inc.3 ─┘   Inc.5 ─┼─→ Inc.6 ─→ Inc.7
```

## 12. Vérification de bout en bout

1. `cd src-tauri && cargo test` : connecteur, validation de commande, chaînage de migration `10 → 11`.
2. `cd src-tauri && cargo clippy --all-targets -- -D warnings`.
3. Couverture Rust au moins 80 % sur les nouvelles fonctions de connecteur et le module de commandes.
4. `npm run lint` puis `npm run typecheck` : français, JSDoc, visibilité et types de retour explicites, aucun `any`, `switch` exhaustif sur les discriminants, aucune assertion `!` / `as` injustifiée, Promises explicitement gérées.
5. `npm test` : nouveaux specs et specs mis à jour (section 10), dont l'absence de ré-appel sur tri / filtrage / changement de seuil.
6. `npm run build` puis `cd src-tauri && cargo build --locked`.
7. `npm start` (front seul, façade bouchonnée) : ouverture de **Régularité des poussées**, sélection d'un groupe du jeu de démonstration, saisie de la référence de groupe GitLab bouchonnée, « Analyser » — progression visible, tableau peuplé, développeur « silencieux » en tête après tri par score, tri d'une autre colonne sans rechargement, ajustement d'un seuil dans **Paramétrage › Réglages applicatifs** puis retour : le tableau se recolore et se réordonne sans nouvel appel.
8. `npm run test:e2e` : parcours complet incluant la nouvelle étape.

## 13. Points restant ouverts

- **Source du roster** : membres du groupe GitLab via `GET /groups/:ref/members/all` (retenu, le moins d'appels) avec repli sur la résolution des règles de membres connus `username` / `email` ; les règles `domaineEmail` restent non énumérables. Opportunité de **persister une référence de groupe GitLab** sur le modèle (`Groupe.referenceGroupeGitlab`, nouveau champ, palier de migration) plutôt qu'une saisie de session — à trancher par un humain.
- **Placement et libellé de l'écran** dans la sidebar : ordre « unique et fixe » = décision humaine ; proposition « après Obsolescence », libellé « Régularité des poussées ».
- **Pondérations du score composite** : constantes de code (retenu) ou trois champs supplémentaires de `parametres.cadenceCommits`.
- **Fuseau horaire** : un `parametres.cadenceCommits.fuseauHoraire` unique pour toute analyse (retenu) ou un fuseau par groupe applicatif.
- **Frise des horodatages par ligne** : incluse en cellule de fin de ligne (proposé) ou lien « détail » ouvrant une frise en modale.
- **Jours fériés** ignorés dans le calcul des jours ouvrés (retenu, documenté) : aucun calendrier de jours fériés, pour ne pas coder en dur un calendrier national.
- **Jeton non membre de certains projets** : les événements de poussée non visibles par le jeton sont silencieusement absents ; faut-il afficher un avertissement « couverture partielle » quand le roster contient des membres sans aucun événement visible ? — à trancher.
- **Attribution** : une poussée faite par un mainteneur et contenant des commits d'autres auteurs est comptée au pousseur ; acceptable pour l'objectif de détection de perte de travail — à acter.
- **Historique GitLab** : profondeur réelle des événements conservés par l'instance à vérifier (Community Edition auto-hébergée) ; une fenêtre de quatre semaines est normalement largement couverte.
- **Priorité « Should have »** de US-060 à confirmer par un humain.
- **Titre et nom de fichier de `plan_17`** : ce chapitre 4 ajoute un troisième sujet distinct au document (point déjà ouvert au Statut du document).

# Chapitre 5 — Repères de montée de version Sonar sur les graphiques d'évolution (US-061 / RG-061)

## 1. Objet et statut

Ce chapitre décrit la détection des **montées de version du serveur Sonar** et leur matérialisation en **repères verticaux** sur le graphique d'évolution de l'écran **Synthèse graphique**, ainsi que l'ajout d'un **masquage des repères verticaux par catégorie** sur ce même graphique.

Les indicateurs de qualimétrie évoluent, parfois fortement, lors des montées de version de Sonar (nouvelles règles activées par défaut, révision des seuils de notation, changement de moteur d'analyse). Sonar horodate lui-même ces montées et les affiche en repère sur ses propres graphiques d'activité. L'objectif est de rendre cette information visible dans l'application, pour qu'une rupture de série due à l'outillage ne soit pas lue comme une régression ou un progrès réels : ce sujet relève des domaines de vigilance renforcée « calcul des indicateurs qualité » et « conformité aux référentiels externes » ([01-usage-ia-et-conventions.md#discernement](../../.claude/rules/01-usage-ia-et-conventions.md#discernement)).

Disponibilité côté API : le point `GET /api/project_analyses/search` renvoie, pour chaque analyse, un tableau `events` dont la catégorie `SQ_UPGRADE` correspond exactement à une montée de version du serveur ; il est filtrable par `category=SQ_UPGRADE`. Ce point d'API est déjà mobilisé par `sonar::interroger_derniere_analyse` (`src-tauri/src/connecteurs/sonar.rs`), qui n'en lit aujourd'hui que le champ `date` de la dernière analyse.

État actuel côté interface : `SqmGraphiqueEvolutionComponent` (`src/app/composants/graphique-evolution/graphique-evolution.component.ts`) sait déjà tracer des repères verticaux étiquetés (`LigneVerticaleGraphique`, `chartjs-plugin-annotation`) selon trois catégories (`annotation`, `changementSeuil`, `premierAuditRegulier`), mais ces repères ne sont pas masquables. Seul l'écran Synthèse graphique (`src/app/ecrans/synthese-graphique/synthese-graphique.component.ts`) consomme le graphique avec des repères ; la Fiche projet et la Comparaison d'audits listent les annotations en texte uniquement.

État actuel côté modèle : la structure `Annotation` (`src-tauri/src/modele/racine.rs`) porte déjà un champ `systeme: Option<bool>` (« générée automatiquement par le système plutôt que saisie manuellement »), utilisé pour l'annotation système `politiqueIA` (`persistance/administration.rs`) et protégé contre la suppression manuelle (`persistance/alertes.rs`). Les annotations de portée projet (`Projet.annotations`) alimentent déjà les repères de la Synthèse graphique.

Statut : ce chapitre précède la mise à jour des documents normatifs et tout développement, qui restent conditionnés à une validation humaine explicite. La méthode du projet s'applique : arbitrage humain, puis mise à jour des documents normatifs, puis développement, sans passage à l'étape suivante sans validation explicite de la précédente.

## 2. Décisions actées

Décisions fonctionnelles, issues des questions posées à l'utilisateur le 2026-09-01 :

1. **Périmètre strictement limité aux montées de version du serveur Sonar** (événements `SQ_UPGRADE`). Les changements de profil qualité (`QUALITY_PROFILE`), de portail qualité (`QUALITY_GATE`) et de version de projet (`VERSION`) ne sont pas remontés, bien que le même appel les exposerait au même coût.
2. **Masquage des repères verticaux par catégorie** : la Synthèse graphique offre un panneau avec une case à cocher par catégorie de repère présente (annotation manuelle, changement de seuil, premier audit régulier, montée de version Sonar). L'état est de session, non mémorisé. Cette bascule bénéficie à toutes les catégories, pas seulement à la nouvelle.
3. **Dédoublonnage** : (a) au stockage, un ré-audit ne recrée jamais une annotation déjà posée (upsert idempotent par identifiant dérivé stable) ; (b) à l'affichage, une même montée de version affichée pour plusieurs projets d'une même instance ne produit qu'un seul repère vertical (regroupement par version, date la plus ancienne retenue).

Décisions d'architecture :

1. Le cœur natif se limite au réseau : nouvelle fonction de connecteur `sonar::interroger_montees_version` (liste de couples version/date) et nouvelle commande fine `interroger_montees_version_sonar`, sur le patron exact de `interroger_derniere_analyse` (même gestion des statuts 401 / 403 / autres, même pagination bornée). Aucun calcul d'indicateur.
2. Aucune nouvelle structure persistée : un repère est une `Annotation` de portée projet, `systeme: Some(true)`, `categorie: "monteeVersionSonar"`. `versionSchema` inchangé, aucun palier de migration (le précédent `politiqueIA` a introduit des annotations système persistées sans palier).
3. La génération est intégrée à la campagne : l'orchestrateur appelle la nouvelle commande une fois par source Sonar, dans la boucle qui appelle déjà `interrogerDerniereAnalyse`, et accumule une carte `projetId → montées`. Cette carte est transmise à `enregistrerBrouillon` — commande qui sauvegarde déjà le fichier —, qui upsert les annotations système avant d'écrire. Aucun nouvel orchestrateur, aucun champ ajouté au brouillon persisté.
4. Idempotence et dédoublonnage au stockage par identifiant dérivé : `id = "montee-version-sonar-" + empreinte(version)`, unique au sein des annotations du projet ; une annotation de cet identifiant déjà présente n'est pas recréée. La date provient de l'événement Sonar (date de l'analyse ayant suivi la montée), stable d'un audit à l'autre.
5. Dédoublonnage à l'affichage dans `synthese-graphique.lignesVerticales` : les annotations `monteeVersionSonar` de tous les projets retenus sont regroupées par version dans un `Map` dédié, une seule `LigneVerticaleGraphique` par version, à la date la plus ancienne.
6. Le composant `SqmGraphiqueEvolutionComponent` porte le panneau de bascule par catégorie, à côté de la légende des séries, sur le modèle de son mécanisme interne `seriesMasquees` ; état de session (`WritableSignal`), non mémorisé, aligné sur `filtreIndicateur` de la Synthèse graphique.
7. Mode audit historique (C15-14) : les montées de version sont des faits datés indépendants de la date d'audit ; `interroger_montees_version` renvoie la liste complète quel que soit `date_ciblee`, et les annotations sont posées normalement.

## 3. Périmètre et identifiants d'exigence proposés

Chaîne des identifiants à la date de rédaction : documents normatifs à `US-056` / `RG-056` ; `plan_17` chapitre 3 propose `US-057` / `RG-057` (non intégrés) ; `plan_18` propose `US-058` / `US-059` / `RG-058` / `RG-059` (non intégrés) ; `plan_17` chapitre 4 propose `US-060` / `RG-060` (non intégrés). Allocation proposée ci-dessous, **à reconfirmer au moment de la qualification effective** ; en cas de consommation concurrente, décaler l'ensemble en bloc sans réintroduire de trou (principe déjà appliqué en Étape 25 de `plan_16`).

| identifiant | intitulé | type |
|---|---|---|
| US-061 | Visualiser les montées de version du serveur Sonar en repères verticaux sur le graphique d'évolution, et masquer les repères par catégorie | Consultation — Could have |
| RG-061 | Détection des montées de version Sonar (événements `SQ_UPGRADE` de `project_analyses/search`), matérialisation en annotation système de portée projet (catégorie `monteeVersionSonar`), idempotence par identifiant dérivé, dédoublonnage inter-projets à l'affichage, masquage des repères verticaux par catégorie | règle de gestion |

RG-061 s'articule avec US-019 / RG-023 (annotations et journalisation, réutilisées), RG-021 (catégories d'anomalie des clients d'API, appliquées au nouvel appel), RG-046 (repère vertical du premier audit régulier, même mécanisme) et RG-017 (concurrence des appels de campagne, réutilisée).

## 4. Partie A — Cœur natif : connecteur Sonar et persistance des repères

### Connecteur `src-tauri/src/connecteurs/sonar.rs`

Nouvelle structure `MonteeVersionSonar { version: String, date: String }`, `#[derive(Debug, Clone, Serialize, Deserialize, PartialEq)]`, `#[serde(rename_all = "camelCase")]`, Rustdoc `///`, visibilité `pub(crate)`.

Structures de désérialisation privées : la réponse du point d'API est captée avec, sur chaque analyse, `date` et `events: Vec<EvenementAnalyse>` où `EvenementAnalyse { category: String, name: String }` (`#[serde(default)]` sur `events`).

`pub(crate) async fn interroger_montees_version(url_base, credential, id_externe, client) -> Result<Vec<MonteeVersionSonar>, ErreurConnecteur>` : `GET /api/project_analyses/search` avec `project={id_externe}`, `category=SQ_UPGRADE`, `ps=500`, paginé (`p`) jusqu'à épuisement ou `MAX_PAGES_ANALYSES_HISTORIQUE` (constante existante réutilisée). Gestion des statuts : 401 → `ErreurConnecteur::AuthentificationRefusee`, 403 → `ErreurConnecteur::DroitsInsuffisants`, tout autre non-2xx → `ErreurConnecteur::ReponseInattendue`, erreur réseau via `erreur_depuis_reqwest` — strictement le patron de `interroger_derniere_analyse`. Pour chaque analyse, chaque `event` de `category == "SQ_UPGRADE"` produit un `MonteeVersionSonar { version: event.name, date: analyse.date }`. Résultat trié par date croissante et dédoublonné sur `version` (première date conservée). Un projet sans aucun événement de ce type renvoie `Ok(vec![])`, ce n'est pas une erreur.

Réserve explicite, alignée sur l'en-tête de module (déjà posée pour `search_history`) : la valeur exacte du filtre `category=SQ_UPGRADE` et la forme de `event.name` (numéro de version brut) n'ont pas été vérifiées contre une instance réelle ; une instance ne produisant pas cet événement (version antérieure à son introduction, SonarCloud sans notion de version serveur) renvoie simplement une liste vide.

Tests `#[cfg(test)]` (client HTTP simulé, jamais d'appel réel — [norme de tests](../../.claude/rules/11-normes-tests.md#tests-des-clients-dapi)) : réponse nominale multi-pages à deux montées ; filtrage des événements non `SQ_UPGRADE` (profil qualité, version de projet ignorés) ; dédoublonnage sur `version` ; réponse vide → `Ok(vec![])` ; une réponse par catégorie d'anomalie RG-021 (401, 403, 5xx, corps non désérialisable, délai dépassé, instance injoignable).

### Commande fine dans `src-tauri/src/commandes/audit.rs`

Nouvelle commande `interroger_montees_version_sonar(instance, id_externe, etat)`, renvoyant un Résultat typé succès / anomalie sur le modèle de `interroger_derniere_analyse` : résolution du credential mémorisé de l'instance, journalisation technique début / fin (`consigner_debut_commande` / `consigner_fin_commande`, obligatoire) et journalisation de l'appel connecteur, rejet d'une instance non-Sonar (`ReponseInattendue`, défense en profondeur comme les commandes Sonar existantes). Enregistrement dans `src-tauri/src/lib.rs` (`tauri::generate_handler!`).

### Persistance des repères — `src-tauri/src/persistance/alertes.rs`

Constante `CATEGORIE_ANNOTATION_MONTEE_VERSION_SONAR: &str = "monteeVersionSonar"` (à rapprocher ou dupliquer de `CATEGORIE_ANNOTATION_POLITIQUE_IA`, qui vit dans `persistance/administration.rs` — cohérence à trancher à l'incrément).

Nouvelle structure de transfert `MonteeVersionSonarProjet { projet_id: String, montees: Vec<MonteeVersionSonar> }`, `#[serde(rename_all = "camelCase")]`, miroir TypeScript.

`pub(crate) fn synchroniser_annotations_montee_version(donnees: &mut DonneesRacine, montees_par_projet: &[MonteeVersionSonarProjet], horodatage: &str) -> Vec<String>` : pour chaque projet et chaque montée, calcule `id = format!("montee-version-sonar-{}", empreinte(&montee.version))` (`empreinte` : minuscules, caractères non alphanumériques remplacés par `-` — suffisant pour un numéro de version) ; si le projet ne porte aucune annotation de cet `id`, y pousse `Annotation { id, date: montee.date, libelle: format!("Sonar {}", montee.version), categorie: CATEGORIE_ANNOTATION_MONTEE_VERSION_SONAR.to_string(), description: None, systeme: Some(true) }` et journalise la création (`EntreeJournal`, `origine` dédiée) ; sinon ne fait rien (idempotence, dédoublonnage au stockage). Retourne la liste des identifiants créés, pour le compte-rendu de campagne.

### Commande `enregistrer_brouillon` étendue — `src-tauri/src/commandes/audit.rs`

La commande `enregistrer_brouillon` (dont la signature est déjà « étendue par rapport à la conception détaillée », précédent documenté dans son Rustdoc) reçoit un paramètre supplémentaire `montees_version_sonar_par_projet: Vec<MonteeVersionSonarProjet>` et, dans son bloc de traitement, appelle `alertes::synchroniser_annotations_montee_version(&mut donnees, &montees_version_sonar_par_projet, &horodatage)` avant `moteur::sauvegarder_fichier`. La fonction de persistance `audit::enregistrer_brouillon` (résultats du brouillon) reste inchangée. Une carte vide (aucune source Sonar dans le périmètre) est un cas neutre.

Tests `#[cfg(test)]` de `synchroniser_annotations_montee_version` : création au premier passage ; second passage identique → aucune annotation ajoutée, aucune entrée de journal ; ajout d'une nouvelle version → une seule annotation ajoutée ; portée strictement par projet ; l'annotation créée porte `systeme: Some(true)` et reste donc non supprimable par `supprimer_annotation` (test croisé existant à compléter).

Contraintes transverses : aucun `.unwrap()` / `.expect()`, `#![forbid(unsafe_code)]` déjà global, visibilité la plus restrictive, Rustdoc sur tout élément public, credential transmis en en-tête (`bearer_auth`) uniquement, aucune donnée sensible journalisée (un numéro de version Sonar n'en est pas une).

## 5. Partie B — Façade, orchestrateur de campagne et intégration du brouillon

### Façade de commandes et bouchon TypeScript

`src/app/services/sansetat/commandes/facade-commandes.service.ts` : méthode `public async interrogerMonteesVersionSonar(...): Promise<ResultatMonteesVersionSonar>` sur le modèle de `interrogerDerniereAnalyse`, déléguant à `invoke('interroger_montees_version_sonar', …)` ; le paramètre `instance` reste **générique** (`<TInstance>`), conformément à la règle de frontière unique de la Façade de commandes. Types miroir `MonteeVersionSonar` et `MonteeVersionSonarProjet` dans `types-facade.ts` (`readonly`, `camelCase`).

`enregistrerBrouillon` (façade et `DonneesApplicationService`) : nouveau paramètre `monteesVersionSonarParProjet: readonly MonteeVersionSonarProjet[]`.

`src/app/services/sansetat/commandes/bouchon/` : le bouchon de `interroger_montees_version_sonar` renvoie, pour au moins un projet du jeu de démonstration, une montée fixe (`{ version: '10.4', date: <date fixe antérieure au premier audit du jeu> }`), et **la même version pour deux projets d'une même instance** (assertion de dédoublonnage E2E) ; le bouchon de `enregistrer_brouillon` accepte et applique le nouveau paramètre (upsert dans la racine bouchonnée). Décompte de commandes reconnues ajusté dans le commentaire d'en-tête et le spec correspondant. Un délai artificiel fixe, comme pour les autres commandes Sonar du bouchon, exerce l'indicateur de progression.

### Orchestrateur de campagne — `src/app/services/avecetat/campagne/orchestrateur-campagne.service.ts`

Dans la boucle par source Sonar (à côté de l'appel `interrogerDerniereAnalyse`), un appel `interrogerMonteesVersionSonar(instance, source.idExterne)`. En cas de succès, les montées sont accumulées dans une `Map<string, MonteeVersionSonar[]>` indexée par `projetId` (fusion si un projet porte plusieurs sources Sonar, dédoublonnage sur `version`). En cas d'échec, une anomalie est poussée sous une clé de pseudo-indicateur `sonar.montees_version` et la campagne se poursuit (jamais bloquante). L'appel est ignoré si la source Sonar est elle-même injoignable (une anomalie déjà enregistrée pour un autre indicateur de la même source).

À la fin du parcours, la carte est convertie en `MonteeVersionSonarProjet[]` et passée à la méthode d'enregistrement du brouillon → `DonneesApplicationService.enregistrerBrouillon`.

Décision retenue : pas de pseudo-indicateur désactivable dédié dans `groupe.indicateursDesactives` (l'appel est peu coûteux et sans effet de bord visible) ; un tel interrupteur reste un point ouvert (section 12).

### Écriture des repères — pas de commande `creerAnnotation`

Les repères ne sont **pas** posés via `creerAnnotation` : ils le sont par `synchroniser_annotations_montee_version` au sein de `enregistrerBrouillon`. La Fiche projet et la Comparaison d'audits, qui listent déjà `projet.annotations` en texte (catégorie affichée), montreront les nouvelles annotations `monteeVersionSonar` sans modification ; leur `systeme` étant vrai, aucun bouton de suppression n'apparaît (`@if (!annotation.systeme)` déjà en place sur la Fiche projet).

## 6. Partie C — Graphique d'évolution et Synthèse graphique

### `src/app/composants/graphique-evolution/graphique-evolution.component.ts`

- `CategorieLigneVerticale` : ajout de `'monteeVersionSonar'`. `STYLE_LIGNE_VERTICALE` : entrée `monteeVersionSonar: { couleur: '#7c3aed', tirets: [4, 3] }` (violet tireté, décision arbitraire d'ergonomie à valider par un humain, cohérente avec l'absence des couleurs sémantiques vert / orange / rouge du Moteur de jugement, RG-022). JSDoc de `CategorieLigneVerticale` mise à jour.
- Nouveau `Record` `LIBELLE_CATEGORIE_LIGNE_VERTICALE: Readonly<Record<CategorieLigneVerticale, string>>` (« Annotations », « Changements de seuil », « Premier audit régulier », « Montées de version Sonar ») pour les libellés du panneau de bascule.
- Signal de session `categoriesLignesMasquees: WritableSignal<ReadonlySet<CategorieLigneVerticale>>` initialisé vide, sur le modèle de `seriesMasquees` ; méthode publique `basculerCategorieLigne(categorie: CategorieLigneVerticale): void` avec JSDoc et type de retour explicite.
- `categoriesLignesPresentes: Signal<readonly CategorieLigneVerticale[]>` : `computed` dérivé de `lignesVerticales()` (ordre stable défini par un tableau statique), pour n'afficher une case que si la catégorie est effectivement présente.
- La construction des annotations `chart.js` filtre les lignes dont la catégorie appartient à `categoriesLignesMasquees()` ; l'effet réactif existant se redéclenche déjà sur tout signal lu dans la construction.
- Tout `switch` sur `CategorieLigneVerticale` est rendu exhaustif (nouvelle valeur).

### `graphique-evolution.component.html` / `.scss`

Panneau de bascule à côté de la légende des séries : un `@for (categorie of categoriesLignesPresentes(); track categorie)` produisant une case à cocher (`checked` = catégorie non masquée, `(change)="basculerCategorieLigne(categorie)"`) libellée par `LIBELLE_CATEGORIE_LIGNE_VERTICALE`, avec une puce de couleur reprise de `STYLE_LIGNE_VERTICALE`. Aucune couleur métier codée dans le SCSS.

### `src/app/ecrans/synthese-graphique/synthese-graphique.component.ts`

`lignesVerticales` (`computed`) : après la boucle qui mappe `projet.annotations` en catégorie `'annotation'`, les annotations `categorie === 'monteeVersionSonar'` sont détournées vers un `Map<string, LigneVerticaleGraphique>` dédié, indexé par le libellé de version, conservant la date la plus ancienne, catégorie `'monteeVersionSonar'`. Ce dédoublonnage inter-projets (décision 3b) évite N repères superposés quand N projets d'une même instance sont affichés. Les valeurs de ce `Map` sont concaténées au retour, comme les autres repères.

`exporterPng()` : inchangé — le panneau de bascule et les repères font partie du conteneur exporté ; un repère masqué reste masqué à l'export (cohérent avec le comportement « ce qui est à l'écran », comme pour les séries masquées).

### Specs

- `graphique-evolution.component.spec.ts` : la nouvelle catégorie reçoit son style ; `basculerCategorieLigne` masque puis réaffiche les repères de la catégorie (assertion sur les annotations `chart.js` construites) ; `categoriesLignesPresentes()` ne liste que les catégories réellement fournies.
- `synthese-graphique.component.spec.ts` : deux projets d'une même instance portant chacun une annotation `monteeVersionSonar` de version « 10.4 » ne produisent qu'une seule `LigneVerticaleGraphique`, datée de la plus ancienne des deux ; une annotation manuelle reste en catégorie `'annotation'`.

## 7. Impacts sur le modèle de données et migration

Aucun palier de migration. Les repères sont des `Annotation` (structure existante) de portée projet, `systeme: Some(true)`, persistées dans `groupes[].projets[].annotations` comme les annotations manuelles et les annotations système `politiqueIA` (introduites sans palier). `versionSchema` reste inchangé (valeur portée par les chapitres 4 / `plan_18` selon leur ordre d'intégration ; ce chapitre n'y touche pas et n'introduit aucune coordination de palier).

`MonteeVersionSonar` et `MonteeVersionSonarProjet` sont des structures de transfert calculées (résultat de connecteur, argument de commande), non persistées, miroir strict TypeScript / Rust en `camelCase`.

Le champ `categorie` d'une `Annotation` reste une chaîne libre (aucune énumération native ne le contraint) : la valeur `"monteeVersionSonar"` est fixée par une constante documentée. À vérifier qu'aucune validation de forme côté interface ou cœur natif ne restreint cet ensemble.

## 8. Impacts documentaires

| document | nature de la mise à jour |
|---|---|
| [`04_casUsage.md`](../02_documentation/04_casUsage.md) | Nouvelle ligne US-061 : persona Camille, type Consultation, priorité Could have ; critères d'acceptation = repères verticaux violets de montée de version Sonar sur le graphique de la Synthèse graphique, alimentés par les campagnes, un repère par version (dédoublonné entre projets d'une instance), panneau de masquage des repères par catégorie (état de session), repères également listés en texte sur la Fiche projet et la Comparaison d'audits via les annotations système ; RG associée RG-061. Mise à jour de la matrice de couverture. |
| [`05_reglesGestion.md`](../02_documentation/05_reglesGestion.md) | Nouvelle RG-061 : source (`project_analyses/search`, événements `SQ_UPGRADE`), matérialisation en annotation système de portée projet catégorie `monteeVersionSonar`, libellé « Sonar » suivi du numéro de version, date = analyse ayant suivi la montée, idempotence par identifiant dérivé de la version, dédoublonnage inter-projets à l'affichage par version (date la plus ancienne retenue), masquage des repères verticaux par catégorie (état de session), collecte y compris en audit historique. Articulation avec RG-023, RG-021, RG-046, RG-017. Complément des matrices de traçabilité RG × US. |
| [`08_arborescenceNavigation.md`](../02_documentation/08_arborescenceNavigation.md) | Ajout de `US-061` à la ligne `Synthèse graphique` (et, pour l'affichage texte, aux lignes `Fiche projet` et `Comparaison d'audits`) de la matrice écrans / user stories. |
| [`09_maquettes.md`](../02_documentation/09_maquettes.md) | Section `### Synthèse graphique` : repère vertical violet tireté étiqueté « Sonar 10.4 » ; panneau de cases à cocher « Afficher les repères » (une par catégorie présente) à côté de la légende des séries. |
| [`13_conceptionDetaillee.md`](../02_documentation/13_conceptionDetaillee.md) | Nouvelle fonction de connecteur `sonar::interroger_montees_version` ; nouvelle commande `interrogerMonteesVersionSonar` (entrée / sortie, consultation pure, journalisation début / fin, rejet d'une instance non-Sonar) ; signature étendue de `enregistrerBrouillon` (paramètre `monteesVersionSonarParProjet`) ; `persistance::alertes::synchroniser_annotations_montee_version` ; catégorie de repère `monteeVersionSonar` et panneau de masquage par catégorie de `SqmGraphiqueEvolutionComponent`. |
| [`15_normesSecurite.md`](../02_documentation/15_normesSecurite.md) | Rappel bref : `project_analyses/search` requiert la seule permission « Browse » déjà exigée par les autres appels Sonar (portée lecture seule), aucun secret nouveau, le numéro de version Sonar est affiché via l'interpolation Angular (jamais `[innerHTML]`), aucune ressource externe. |
| [`16_normesTests.md`](../02_documentation/16_normesTests.md) | `sonar::interroger_montees_version` relève des clients d'API (réponses HTTP simulées, chaque catégorie RG-021, jamais d'appel réel en CI) ; `synchroniser_annotations_montee_version` relève du Moteur de persistance (seuil 80 %) ; `SqmGraphiqueEvolutionComponent` et `SqmSyntheseGraphiqueComponent` relèvent des composants de présentation (suivi du nombre de méthodes jamais appelées) ; une étape est ajoutée au parcours de bout en bout. |
| [`guide-utilisateur.md`](../guide-utilisateur.md) | Paragraphe Synthèse graphique : mention des repères de montée de version Sonar et du masquage des repères par catégorie. Capture `docs/assets/captures/` éventuelle à régénérer hors pipeline — à signaler, non bloquant. |
| [`04_rapports/rapportDeDeveloppement.md`](../04_rapports/rapportDeDeveloppement.md) | Consigner les décisions arbitraires à valider par un humain : couleur et tirets du repère `monteeVersionSonar`, schéma d'identifiant dérivé, absence de pseudo-indicateur désactivable dédié, libellé « Sonar » suivi du numéro de version, dédoublonnage inter-projets par version. |

La vérification croisée de traçabilité (règle générale n° 13) est refaite après ces mises à jour.

## 9. Impacts sur les tests

- Tests unitaires Rust : `sonar::interroger_montees_version` (client HTTP simulé, chaque catégorie RG-021, dédoublonnage, réponse vide) ; `persistance::alertes::synchroniser_annotations_montee_version` (création, idempotence, nouvelle version, portée projet, non-régression du test « annotation système non supprimable ») ; `enregistrer_brouillon` avec carte non vide ; non-régression de `cargo test`.
- Tests unitaires Jest, nouveaux ou complétés : `facade-commandes.service.spec.ts`, `orchestrateur-campagne.service.spec.ts` (accumulation de la carte, transmission à `enregistrerBrouillon`, anomalie non bloquante), `graphique-evolution.component.spec.ts`, `synthese-graphique.component.spec.ts`, bouchons (`interroger_montees_version_sonar`, `enregistrer_brouillon`, décompte de commandes reconnues).
- Test de bout en bout Playwright (`e2e/parcours-complet.spec.ts`) : après la campagne du parcours, à l'étape Synthèse graphique — assertion sur la présence d'un repère `monteeVersionSonar` (fourni par le bouchon), décochage de sa case dans le panneau de bascule → le repère disparaît, recochage → il réapparaît ; le dédoublonnage est couvert si deux projets bouchonnés partagent la version.
- Tests de charge : sans objet (un appel filtré léger de plus par source Sonar ; rendu de quelques repères supplémentaires).

## 10. Découpage en incréments

Chaque incrément est développé par un Codeur puis relu par un Relecteur en contexte isolé, et validé par un humain avant le suivant.

1. **Documents normatifs** (section 8) : livrés et validés avant tout code ; confirmation que `US-061` et `RG-061` sont libres au moment de la qualification.
2. **Cœur natif** (Partie A) : `sonar::interroger_montees_version`, commande fine `interroger_montees_version_sonar`, `synchroniser_annotations_montee_version`, extension de `enregistrer_brouillon`, enregistrement dans `lib.rs`, tests Rust. Fige le contrat `MonteeVersionSonar` / `MonteeVersionSonarProjet` en `camelCase`.
3. **Façade TypeScript, bouchon et orchestrateur** (Partie B) : méthode de façade, types miroir, bouchons, accumulation dans l'orchestrateur, transmission à `enregistrerBrouillon`.
4. **Composant de graphique** (Partie C) : nouvelle catégorie, style, panneau de bascule par catégorie, specs. Indépendant des incréments 2 et 3, requis par l'incrément 5.
5. **Synthèse graphique** (Partie C) : détournement et dédoublonnage des annotations `monteeVersionSonar` en repères, specs.
6. **Bout en bout et vérification** : étape Playwright, passe de vérification complète (section 11).

```
Inc.1 ─┐
Inc.2 ─┼─→ Inc.3 ─→ Inc.5 ─→ Inc.6
       │   Inc.4 ──────↑   (indépendant de 2 et 3, requis par 5)
```

## 11. Vérification de bout en bout

1. `cd src-tauri && cargo test` : connecteur, persistance d'annotations, non-régression.
2. `cd src-tauri && cargo clippy --all-targets -- -D warnings`.
3. Couverture Rust au moins 80 % sur les nouvelles fonctions de connecteur et de persistance.
4. `npm run lint` puis `npm run typecheck` : français, JSDoc, visibilité et types de retour explicites, aucun `any`, `switch` exhaustif sur `CategorieLigneVerticale`, aucune assertion `!` / `as` injustifiée, Promises explicitement gérées.
5. `npm test` : nouveaux specs et specs mis à jour (section 9).
6. `npm run build` puis `cd src-tauri && cargo build --locked`.
7. `npm start` (front seul, façade bouchonnée) : lancer une campagne sur un groupe du jeu de démonstration comportant une source Sonar, intégrer le brouillon, ouvrir **Synthèse graphique** — repère vertical violet « Sonar 10.4 », un seul repère même en affichant plusieurs projets de l'instance, décochage puis recochage de la case « Montées de version Sonar » du panneau, annotation `monteeVersionSonar` visible en texte sur la Fiche projet sans bouton de suppression.
8. `npm run test:e2e` : parcours complet incluant la nouvelle étape.

## 12. Points restant ouverts

- **Pseudo-indicateur désactivable** `sonar.montees_version` dans `groupe.indicateursDesactives` : non retenu (appel léger et sans effet de bord) ; à confirmer qu'aucun interrupteur n'est souhaité.
- **Transport de la carte des montées** : argument de `enregistrerBrouillon` avec upsert immédiat à la sauvegarde du brouillon (retenu, aucun palier) vs upsert à `integrerBrouillon` (repères non posés si le brouillon est rejeté) vs champ persisté du brouillon (survivrait à une fermeture entre le run et l'intégration, mais impose un palier de migration).
- **Suppression manuelle** d'une annotation système `monteeVersionSonar` erronée : conserver l'interdiction générale et se reposer sur le masquage par catégorie (retenu) vs autoriser une exception pour cette seule catégorie.
- **Source secondaire** `api/server/version` relevée par campagne et comparée d'une campagne à l'autre (couvrirait les instances trop anciennes pour `SQ_UPGRADE` et SonarCloud) : hors périmètre au vu de la décision « se limiter à la montée de version » ; à confirmer qu'on n'en veut pas.
- **Persistance du choix de masquage par catégorie** : session uniquement (retenu, aligné sur `filtreIndicateur`) vs mémorisation dans une vue enregistrée (US-028, RG-027).
- **Placement du panneau de bascule** : dans `SqmGraphiqueEvolutionComponent` près de la légende (retenu) vs dans la barre de filtres de la Synthèse graphique.
- **Valeur exacte du filtre** `category=SQ_UPGRADE` et forme de `event.name` : à vérifier contre une instance réelle (même réserve que l'en-tête du module `sonar.rs`) ; repli si la catégorie est absente = liste vide, pas d'erreur.
- **Dédoublonnage inter-projets** par `version` seule en gardant la date la plus ancienne (retenu) vs par `(version, jour)` : à confirmer.
- **Couleur et tirets** du repère `monteeVersionSonar` : `#7c3aed` tireté proposé, à figer avec la maquette de l'incrément 1.
- **Priorité « Could have »** de US-061 à confirmer par un humain.
- **Titre et nom de fichier de `plan_17`** : ce chapitre 5 ajoute un sujet distinct supplémentaire au document (point déjà ouvert au Statut du document).
