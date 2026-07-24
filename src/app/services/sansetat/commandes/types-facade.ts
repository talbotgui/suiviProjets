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
// `interrogerDette`, `interrogerCouverture`, `interrogerNotes`, `interrogerNcloc`). `interrogerDependances` reste
// différée à un incrément ultérieur. `interrogerMarqueursIa` est livrée à l'incrément 7 (cf. plus bas).

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
 * Anomalie typée d'un test de connectivité (US-004) ou d'un audit (Phase 5), mirroir de `ErreurConnecteur` côté
 * cœur natif. Le champ `message` (Phase 5, incrément 6, F08/RG-021) porte un diagnostic technique structurel
 * (statut HTTP, texte d'erreur réseau ou de désérialisation) : il ne contient jamais de credential ni de jeton,
 * conformément à `docs/02_documentation/15_normesSecurite.md#journalisation-des-événements-sensibles`.
 */
export interface ErreurConnecteur {
  /** Catégorie de l'anomalie. */
  readonly type: CategorieErreurConnecteur;
  /** Message technique brut, destiné à un affichage repliable (F08). */
  readonly message: string;
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
 * Constat brut de `sonar.couverture` (mirroir de `ResultatSonarCouverture` côté cœur natif). `duplicationNouveauCode`
 * (`new_duplicated_lines_density`, Phase 5 incrément 7) est absent si Sonar ne retourne pas cette métrique pour le
 * projet (jamais analysé en incrémental, ou instance ne l'exposant pas) : consommé par
 * `ConnecteurCroiseUtils.calculerIaNouveauCode`, jamais par une anomalie.
 */
export interface ResultatSonarCouverture {
  readonly sourceId: string;
  readonly couverture: number;
  readonly couvertureNouveauCode: number;
  readonly duplicationNouveauCode?: number;
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

/**
 * Résultat typé de `FacadeCommandesService.interrogerDerniereAnalyse` (Phase 5, incrément 3) : date de la
 * dernière analyse Sonar d'un projet, `null` si celui-ci n'a jamais été analysé. Donnée intermédiaire consommée
 * par le Connecteur croisé (`ConnecteurCroiseUtils.calculerFraicheurSonar`), n'appartenant à aucune variante du
 * catalogue figé des résultats d'audit et donc jamais persistée seule, sur le modèle de
 * {@link ResultatInterrogationBranches}.
 */
export type ResultatInterrogationDerniereAnalyse =
  | { readonly type: 'succes'; readonly resultat: string | null }
  | { readonly type: 'echec'; readonly anomalie: ErreurConnecteur };

/**
 * Type de correspondance d'une règle de détection de marqueur IA (F18), mirroir de `TypeCorrespondanceMarqueur`
 * côté cœur natif : `exact` (égalité stricte du nom) ou `motif` (glob simple, seul `*` étant spécial).
 */
export type TypeCorrespondanceMarqueur = 'exact' | 'motif';

/**
 * Portée d'une règle de détection de marqueur IA (F18) : `racine` (uniquement à la racine du dépôt) ou `partout`
 * (à toute profondeur de l'arborescence).
 */
export type PorteeMarqueur = 'racine' | 'partout';

/**
 * Nature d'une entrée de l'arborescence ciblée par une règle de détection de marqueur IA (F18) : `fichier`
 * (`blob` côté API GitLab) ou `repertoire` (`tree`).
 */
export type NatureMarqueur = 'fichier' | 'repertoire';

/**
 * Règle de détection d'un marqueur d'outil IA (F18), élément de `referentiels.reglesMarqueursIA`, mirroir de
 * `RegleMarqueurIA` côté cœur natif. Transmise telle quelle en paramètre de `interrogerMarqueursIa` : le cœur
 * natif ne persiste jamais ce référentiel lui-même (`Referentiels.reglesMarqueursIA` reste une donnée générique
 * côté cœur natif, hors périmètre de l'Administration/Paramétrage, Phase 3/7), seule l'interface le détient.
 */
export interface RegleMarqueurIA {
  readonly motif: string;
  readonly typeCorrespondance: TypeCorrespondanceMarqueur;
  readonly portee: PorteeMarqueur;
  readonly nature: NatureMarqueur;
  readonly outil: string;
}

/**
 * Marqueur d'outil IA détecté dans l'arborescence (mirroir de `Marqueur` côté cœur natif).
 */
export interface Marqueur {
  readonly chemin: string;
  readonly nature: string;
  readonly outil: string;
}

/**
 * Constat brut de `gitlab.marqueurs_ia` (mirroir de `ResultatGitlabMarqueursIa` côté cœur natif, Phase 5
 * incrément 7).
 */
export interface ResultatGitlabMarqueursIa {
  readonly sourceId: string;
  readonly refEffective: string;
  readonly shaTete: string;
  readonly marqueurs: readonly Marqueur[];
}

/**
 * Résultat typé de `FacadeCommandesService.interrogerMarqueursIa` (US-009, F18, Phase 5 incrément 7), sur le
 * modèle de {@link ResultatInterrogationBranches}.
 */
export type ResultatInterrogationMarqueursIa =
  | { readonly type: 'succes'; readonly resultat: ResultatGitlabMarqueursIa }
  | { readonly type: 'echec'; readonly anomalie: ErreurConnecteur };
