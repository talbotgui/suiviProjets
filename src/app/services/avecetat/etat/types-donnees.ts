// Fichier généré avec l'assistance de l'IA (Claude Code), conformément à la mention d'origine requise par
// .claude/rules/01-usage-ia-et-conventions.md.
//
// Types TypeScript mirroir de la racine du document JSON en clair (Phase 3, US-006, US-007, US-008), alignés sur
// `src-tauri/src/modele/racine.rs`, tous deux sérialisés en `camelCase` côté Rust (`serde(rename_all = "camelCase")`).
// Réutilise `Instance`/`TypeInstance`, déjà définis dans `services/sansetat/commandes/types-facade.ts`, plutôt que
// de les dupliquer (dépendance `avecetat` → `sansetat` autorisée par le découpage en couches du projet, cf.
// `docs/02_documentation/14_normesDeveloppement.md#structuration-du-code-et-découpage-en-couches`).
//
// Les branches dont le contenu détaillé relève d'une phase ultérieure (référentiels, seuils, campagnes, brouillon,
// journal, vues enregistrées, membres connus, annotations, audits) sont typées de façon minimale ou en `unknown`,
// à l'identique de la décision de modélisation déjà prise côté Rust (`serde_json::Value`, cf. commentaire d'en-tête
// de `modele/racine.rs`) : elles ne sont jamais interprétées ici, seulement conservées telles quelles lors des
// mutations du Store afin de préserver un round-trip fidèle vers `sauvegarderFichier`.
import type { Instance } from '../../sansetat/commandes/types-facade';

/**
 * Type d'une source rattachée à un projet (mirroir de `TypeSource` côté cœur natif).
 */
export enum TypeSource {
  /** Dépôt GitLab. */
  DepotGitlab = 'depotGitlab',
  /** Projet SonarQube. */
  ProjetSonar = 'projetSonar',
}

/**
 * Source (dépôt GitLab ou projet Sonar) rattachée à un projet (US-008), mirroir de `Source` côté cœur natif.
 */
export interface Source {
  /** Identifiant UUID v4 de la source. */
  readonly id: string;
  /** Identifiant de l'instance de rattachement (doit appartenir au même groupe que le projet). */
  readonly instanceId: string;
  /** Type de la source. */
  readonly type: TypeSource;
  /** Identifiant externe (identifiant de projet côté instance). */
  readonly idExterne: string;
  /** Ref auditée (branche, tag ou SHA) ; absente = branche par défaut du dépôt, résolue à chaque audit. */
  readonly refAuditee?: string;
}

/**
 * Projet suivi au sein d'un groupe (US-007), mirroir de `Projet` côté cœur natif. Les branches `annotations` et
 * `audits` ne sont pas interprétées par l'Administration (Phase 3) : elles sont conservées telles quelles.
 */
export interface Projet {
  /** Identifiant UUID v4 du projet. */
  readonly id: string;
  /** Nom du projet. */
  readonly nom: string;
  /** Description du projet. */
  readonly description: string;
  /** Autorisation d'usage de l'IA sur ce projet, faux par défaut (RG-014). */
  readonly iaAutorisee: boolean;
  /** Date d'autorisation de l'IA, renseignée uniquement si `iaAutorisee` est ou a été vraie (RG-015). */
  readonly iaAutoriseeDepuis?: string;
  /** Date du premier commit interne, une fois calculée (hors périmètre de l'Administration). */
  readonly premierCommitInterne?: unknown;
  /** Sources rattachées au projet. */
  readonly sources: readonly Source[];
  /** Annotations de portée projet (hors périmètre de l'Administration, Phase 3). */
  readonly annotations: readonly unknown[];
  /** Historique des audits du projet (hors périmètre de l'Administration, Phase 3). */
  readonly audits: readonly unknown[];
}

/**
 * Groupe, racine de la grappe principale (US-006), mirroir de `Groupe` côté cœur natif. Les membres connus et
 * annotations de groupe ne sont pas interprétés par l'Administration (Phase 3, différé à la Phase 4) : ils sont
 * conservés tels quels.
 */
export interface Groupe {
  /** Identifiant UUID v4 du groupe. */
  readonly id: string;
  /** Nom du groupe. */
  readonly nom: string;
  /** Description du groupe. */
  readonly description: string;
  /** Instances GitLab/Sonar déclarées pour ce groupe. */
  readonly instances: readonly Instance[];
  /** Membres connus du groupe (hors périmètre de l'Administration, Phase 4). */
  readonly membresConnus: readonly unknown[];
  /** Annotations de portée groupe (hors périmètre de l'Administration, Phase 3). */
  readonly annotations: readonly unknown[];
  /** Types d'indicateurs désactivés pour ce groupe (hors périmètre de l'Administration, Phase 3). */
  readonly indicateursDesactives: readonly string[];
  /** Projets rattachés au groupe. */
  readonly projets: readonly Projet[];
}

/**
 * Entrée append-only du journal des modifications de paramétrage (RG-023), mirroir de `EntreeJournal` côté cœur
 * natif.
 */
export interface EntreeJournal {
  /** Identifiant UUID v4 de l'entrée. */
  readonly id: string;
  /** Horodatage de la modification (ISO 8601). */
  readonly horodatage: string;
  /** Chemin de l'objet modifié. */
  readonly objet: string;
  /** Valeur avant modification. */
  readonly avant: unknown;
  /** Valeur après modification. */
  readonly apres: unknown;
  /** Origine de la modification (saisie manuelle, import de configuration, qualification depuis une alerte…). */
  readonly origine: string;
  /** Détail complémentaire sur l'origine, optionnel. */
  readonly detailOrigine?: string;
}

/**
 * Métadonnées de suivi de la racine du document, mirroir de `Meta` côté cœur natif.
 */
export interface Meta {
  /** Date de création du fichier (ISO 8601). */
  readonly creeLe: string;
  /** Date de dernière modification du fichier (ISO 8601). */
  readonly modifieLe: string;
  /** Identifiant de l'application et de sa version ayant produit le fichier. */
  readonly application: string;
}

/**
 * Racine du document JSON en clair, mirroir de `DonneesRacine` côté cœur natif, telle que retournée par
 * `creerFichier`/`chargerFichier` et attendue par `sauvegarderFichier`. Les branches non interprétées par
 * l'Administration (référentiels, paramètres, campagnes, brouillon, journal hors ajout, vues enregistrées) sont
 * typées en `unknown`/tableau générique afin de n'être jamais perdues lors d'une mutation du Store.
 */
export interface DonneesRacine {
  /** Version du schéma de données. */
  readonly versionSchema: number;
  /** Métadonnées de suivi du fichier. */
  readonly meta: Meta;
  /** Grappe principale de groupes. */
  readonly groupes: readonly Groupe[];
  /** Grilles de lecture partageables (hors périmètre de l'Administration, Phase 3). */
  readonly referentiels: unknown;
  /** Seuils et réglages applicatifs (hors périmètre de l'Administration, Phase 3). */
  readonly parametres: unknown;
  /** Traces d'exécution des campagnes d'audit (hors périmètre de l'Administration, Phase 3). */
  readonly campagnes: readonly unknown[];
  /** Zone de validation courante, au plus une occurrence (hors périmètre de l'Administration, Phase 3). */
  readonly brouillon: unknown;
  /** Statuts vu/traité par clé d'alerte stable (hors périmètre de l'Administration, Phase 3). */
  readonly traitementsAlertes: readonly unknown[];
  /** Journal append-only des modifications de paramétrage (RG-023). */
  readonly journal: readonly EntreeJournal[];
  /** Modèles de filtres nommés (hors périmètre de l'Administration, Phase 3). */
  readonly vuesEnregistrees: readonly unknown[];
}
