// Fichier généré avec l'assistance de l'IA (Claude Code), conformément à la mention d'origine requise par
// .claude/rules/01-usage-ia-et-conventions.md.
//
// Types TypeScript mirroir des structures JSON échangées avec le cœur natif via la Façade de commandes (Phase 2,
// US-003, US-004 ; Phase 3, US-008), alignés sur `src-tauri/src/modele/racine.rs` (`Instance`, `TypeInstance`) et
// `src-tauri/src/connecteurs/commun.rs` (`VerdictConnectivite`, `ErreurConnecteur`), tous deux sérialisés en
// `camelCase` côté Rust (`serde(rename_all = "camelCase")`). `credentialAbsent` (Phase 3) est une extension
// propre à `interrogerBranches`, hors catalogue RG-021 d'origine.

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
 * Catégorie d'anomalie d'un test de connectivité (mirroir de `ErreurConnecteur` côté cœur natif), sous-ensemble des
 * catégories fixes de RG-021 pertinent pour ce test (pas de « ref introuvable »).
 */
export type CategorieErreurConnecteur =
  | 'authentificationRefusee'
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
