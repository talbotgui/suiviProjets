// Fichier généré avec l'assistance de l'IA (Claude Code), conformément à la mention d'origine requise par
// .claude/rules/01-usage-ia-et-conventions.md.
//
// Types TypeScript mirroir des structures JSON échangées avec le cœur natif via la Façade de commandes (Phase 2,
// US-003, US-004 ; Phase 3, US-008 ; Phase 5, US-009), alignés sur `src-tauri/src/modele/racine.rs` (`Instance`,
// `TypeInstance`, `Resultat*`) et `src-tauri/src/connecteurs/commun.rs` (`VerdictConnectivite`, `ErreurConnecteur`),
// tous deux sérialisés en `camelCase` côté Rust (`serde(rename_all = "camelCase")`). `credentialAbsent` (Phase 3)
// est une extension propre à `interrogerBranches`, hors catalogue RG-021 d'origine.
//
// Périmètre de la Phase 5, incrément 1 : les dix charges utiles et résultats typés des opérations d'interrogation
// GitLab/Sonar ne nécessitant qu'un appel API déterministe (`interrogerVitalite`, `interrogerTailleDepot`,
// `interrogerContributeurs`, `interrogerMergeRequests`, `interrogerMembres`, `interrogerViolations`,
// `interrogerDette`, `interrogerCouverture`, `interrogerNotes`, `interrogerNcloc`). `interrogerDependances` et
// `interrogerMarqueursIa` restent différées à un incrément ultérieur.

/**
 * Type d'instance externe déclarée par un groupe (mirroir de `TypeInstance` côté cœur natif).
 */
export enum TypeInstance {
  /** Instance GitLab. */
  Gitlab = 'gitlab',
  /** Instance SonarQube. */
  Sonar = 'sonar',
}

/**
 * Instance GitLab ou Sonar déclarée au niveau d'un groupe (mirroir de `Instance` côté cœur natif), telle que
 * transmise en paramètre de `testerConnectivite`.
 */
export interface Instance {
  /** Identifiant UUID v4 de l'instance. */
  readonly id: string;
  /** Type de l'instance (`gitlab` ou `sonar`). */
  readonly type: TypeInstance;
  /** Nom usuel de l'instance. */
  readonly nom: string;
  /** URL de base de l'instance. */
  readonly urlBase: string;
}

/**
 * Catégorie d'anomalie pouvant survenir lors d'un appel à une instance GitLab ou Sonar (mirroir de
 * `ErreurConnecteur` côté cœur natif), alignée sur le catalogue figé RG-021 complété de `credentialAbsent`
 * (extension propre à `interrogerBranches`, Phase 3, hors catalogue RG-021 d'origine).
 */
export type CategorieErreurConnecteur =
  | 'authentificationRefusee'
  | 'refIntrouvable'
  | 'instanceInjoignable'
  | 'delaiDepasse'
  | 'reponseInattendue'
  | 'droitsInsuffisants'
  | 'credentialAbsent';

/**
 * Anomalie typée d'un test de connectivité (US-004), mirroir de `ErreurConnecteur` côté cœur natif.
 */
export interface ErreurConnecteur {
  /** Catégorie de l'anomalie. */
  readonly type: CategorieErreurConnecteur;
}

/**
 * Verdict d'un test de connectivité réussi (mirroir de `VerdictConnectivite` côté cœur natif).
 */
export interface VerdictConnectivite {
  /** `true` si le credential porte une portée excédant la portée minimale en lecture seule recommandée (US-004). */
  readonly porteeExcessive: boolean;
}

/**
 * Résultat typé d'un test de connectivité, exposé par `FacadeCommandesService.testerConnectivite` : union
 * discriminée sur `type`, à traiter par un switch exhaustif plutôt que par la gestion d'un rejet de Promise non
 * typé.
 */
export type ResultatTestConnectivite =
  | { readonly type: 'succes'; readonly verdict: VerdictConnectivite }
  | { readonly type: 'echec'; readonly anomalie: ErreurConnecteur };

/**
 * Résultat typé d'une interrogation des branches d'un dépôt GitLab, exposé par
 * `FacadeCommandesService.interrogerBranches` (US-008) : union discriminée sur `type`, sur le modèle de
 * {@link ResultatTestConnectivite}.
 */
export type ResultatInterrogationBranches =
  | { readonly type: 'succes'; readonly branches: readonly string[] }
  | { readonly type: 'echec'; readonly anomalie: ErreurConnecteur };

/**
 * Constat brut de `gitlab.vitalite` (mirroir de `ResultatGitlabVitalite` côté cœur natif).
 */
export interface ResultatGitlabVitalite {
  readonly sourceId: string;
  readonly refEffective: string;
  readonly shaTete: string;
  readonly dernierCommitLe: string;
}

/**
 * Résultat typé de `FacadeCommandesService.interrogerVitalite` (US-009), sur le modèle de
 * {@link ResultatInterrogationBranches}.
 */
export type ResultatInterrogationVitalite =
  | { readonly type: 'succes'; readonly resultat: ResultatGitlabVitalite }
  | { readonly type: 'echec'; readonly anomalie: ErreurConnecteur };

/**
 * Constat brut de `gitlab.taille_depot` (mirroir de `ResultatGitlabTailleDepot` côté cœur natif).
 */
export interface ResultatGitlabTailleDepot {
  readonly sourceId: string;
  readonly refEffective: string;
  readonly shaTete: string;
  readonly tailleOctets: number;
}

/**
 * Résultat typé de `FacadeCommandesService.interrogerTailleDepot` (US-009), sur le modèle de
 * {@link ResultatInterrogationBranches}.
 */
export type ResultatInterrogationTailleDepot =
  | { readonly type: 'succes'; readonly resultat: ResultatGitlabTailleDepot }
  | { readonly type: 'echec'; readonly anomalie: ErreurConnecteur };

/**
 * Contributeur distinct détecté sur la fenêtre glissante (mirroir de `Contributeur` côté cœur natif).
 */
export interface Contributeur {
  readonly email: string;
  readonly nom: string;
  readonly nombreCommits: number;
}

/**
 * Constat brut de `gitlab.contributeurs` (mirroir de `ResultatGitlabContributeurs` côté cœur natif).
 */
export interface ResultatGitlabContributeurs {
  readonly sourceId: string;
  readonly refEffective: string;
  readonly shaTete: string;
  readonly fenetreJours: number;
  readonly contributeurs: readonly Contributeur[];
}

/**
 * Résultat typé de `FacadeCommandesService.interrogerContributeurs` (US-009), sur le modèle de
 * {@link ResultatInterrogationBranches}.
 */
export type ResultatInterrogationContributeurs =
  | { readonly type: 'succes'; readonly resultat: ResultatGitlabContributeurs }
  | { readonly type: 'echec'; readonly anomalie: ErreurConnecteur };

/**
 * Demande de fusion ouverte (mirroir de `MergeRequestOuverte` côté cœur natif).
 */
export interface MergeRequestOuverte {
  readonly iid: number;
  readonly titre: string;
  readonly creeLe: string;
  readonly enConflit: boolean;
}

/**
 * Constat brut de `gitlab.merge_requests` (mirroir de `ResultatGitlabMergeRequests` côté cœur natif).
 */
export interface ResultatGitlabMergeRequests {
  readonly sourceId: string;
  readonly refEffective: string;
  readonly shaTete: string;
  readonly mrOuvertes: readonly MergeRequestOuverte[];
}

/**
 * Résultat typé de `FacadeCommandesService.interrogerMergeRequests` (US-009), sur le modèle de
 * {@link ResultatInterrogationBranches}.
 */
export type ResultatInterrogationMergeRequests =
  | { readonly type: 'succes'; readonly resultat: ResultatGitlabMergeRequests }
  | { readonly type: 'echec'; readonly anomalie: ErreurConnecteur };

/**
 * Membre du dépôt GitLab (mirroir de `MembreGitlab` côté cœur natif), distinct des membres connus (RG-006 à
 * RG-008).
 */
export interface MembreGitlab {
  readonly username: string;
  readonly nom: string;
  readonly niveauAcces: number;
  readonly herite: boolean;
  readonly emailPublic?: string;
}

/**
 * Constat brut de `gitlab.membres` (mirroir de `ResultatGitlabMembres` côté cœur natif).
 */
export interface ResultatGitlabMembres {
  readonly sourceId: string;
  readonly refEffective: string;
  readonly shaTete: string;
  readonly membres: readonly MembreGitlab[];
}

/**
 * Résultat typé de `FacadeCommandesService.interrogerMembres` (US-009), sur le modèle de
 * {@link ResultatInterrogationBranches}.
 */
export type ResultatInterrogationMembres =
  | { readonly type: 'succes'; readonly resultat: ResultatGitlabMembres }
  | { readonly type: 'echec'; readonly anomalie: ErreurConnecteur };

/**
 * Répartition des violations Sonar par sévérité (mirroir de `ParSeverite` côté cœur natif).
 */
export interface ParSeverite {
  readonly bloquant: number;
  readonly critique: number;
  readonly majeur: number;
  readonly mineur: number;
  readonly info: number;
}

/**
 * Constat brut de `sonar.violations` (mirroir de `ResultatSonarViolations` côté cœur natif).
 */
export interface ResultatSonarViolations {
  readonly sourceId: string;
  readonly parSeverite: ParSeverite;
  readonly nouvellesViolations: number;
}

/**
 * Résultat typé de `FacadeCommandesService.interrogerViolations` (US-009), sur le modèle de
 * {@link ResultatInterrogationBranches}.
 */
export type ResultatInterrogationViolations =
  | { readonly type: 'succes'; readonly resultat: ResultatSonarViolations }
  | { readonly type: 'echec'; readonly anomalie: ErreurConnecteur };

/**
 * Constat brut de `sonar.dette` (mirroir de `ResultatSonarDette` côté cœur natif).
 */
export interface ResultatSonarDette {
  readonly sourceId: string;
  readonly detteMinutes: number;
  readonly ratioDette: number;
}

/**
 * Résultat typé de `FacadeCommandesService.interrogerDette` (US-009), sur le modèle de
 * {@link ResultatInterrogationBranches}.
 */
export type ResultatInterrogationDette =
  | { readonly type: 'succes'; readonly resultat: ResultatSonarDette }
  | { readonly type: 'echec'; readonly anomalie: ErreurConnecteur };

/**
 * Constat brut de `sonar.couverture` (mirroir de `ResultatSonarCouverture` côté cœur natif).
 */
export interface ResultatSonarCouverture {
  readonly sourceId: string;
  readonly couverture: number;
  readonly couvertureNouveauCode: number;
}

/**
 * Résultat typé de `FacadeCommandesService.interrogerCouverture` (US-009), sur le modèle de
 * {@link ResultatInterrogationBranches}.
 */
export type ResultatInterrogationCouverture =
  | { readonly type: 'succes'; readonly resultat: ResultatSonarCouverture }
  | { readonly type: 'echec'; readonly anomalie: ErreurConnecteur };

/**
 * Constat brut de `sonar.notes` (mirroir de `ResultatSonarNotes` côté cœur natif) : notes A–E des quatre axes,
 * stockées en valeur numérique 1.0–5.0, la conversion en lettre colorée relevant du Moteur de jugement (RG-011).
 */
export interface ResultatSonarNotes {
  readonly sourceId: string;
  readonly fiabilite: number;
  readonly securite: number;
  readonly maintenabilite: number;
  readonly revueSecurite: number;
}

/**
 * Résultat typé de `FacadeCommandesService.interrogerNotes` (US-009), sur le modèle de
 * {@link ResultatInterrogationBranches}.
 */
export type ResultatInterrogationNotes =
  | { readonly type: 'succes'; readonly resultat: ResultatSonarNotes }
  | { readonly type: 'echec'; readonly anomalie: ErreurConnecteur };

/**
 * Constat brut de `sonar.ncloc` (mirroir de `ResultatSonarNcloc` côté cœur natif).
 */
export interface ResultatSonarNcloc {
  readonly sourceId: string;
  readonly ncloc: number;
  readonly parLangage: Readonly<Record<string, number>>;
}

/**
 * Résultat typé de `FacadeCommandesService.interrogerNcloc` (US-009), sur le modèle de
 * {@link ResultatInterrogationBranches}.
 */
export type ResultatInterrogationNcloc =
  | { readonly type: 'succes'; readonly resultat: ResultatSonarNcloc }
  | { readonly type: 'echec'; readonly anomalie: ErreurConnecteur };
