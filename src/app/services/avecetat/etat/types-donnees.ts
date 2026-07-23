// Fichier généré avec l'assistance de l'IA (Claude Code), conformément à la mention d'origine requise par
// .claude/rules/01-usage-ia-et-conventions.md.
//
// Types TypeScript mirroir de la racine du document JSON en clair (Phase 3, US-006, US-007, US-008 ; Phase 4,
// US-022 à US-024), alignés sur `src-tauri/src/modele/racine.rs`, tous deux sérialisés en `camelCase` côté Rust
// (`serde(rename_all = "camelCase")`). Réutilise `Instance`/`TypeInstance`, déjà définis dans
// `services/sansetat/commandes/types-facade.ts`, plutôt que de les dupliquer (dépendance `avecetat` → `sansetat`
// autorisée par le découpage en couches du projet, cf.
// `docs/02_documentation/14_normesDeveloppement.md#structuration-du-code-et-découpage-en-couches`).
//
// Les branches dont le contenu détaillé relève d'une phase ultérieure (référentiels, seuils, journal hors ajout,
// vues enregistrées) sont typées de façon minimale ou en `unknown`, à l'identique de la décision de modélisation
// déjà prise côté Rust (`serde_json::Value`, cf. commentaire d'en-tête de `modele/racine.rs`) : elles ne sont
// jamais interprétées ici, seulement conservées telles quelles lors des mutations du Store afin de préserver un
// round-trip fidèle vers `sauvegarderFichier`. `MembreConnu` et `Annotation` sont typées intégralement depuis la
// Phase 4, `Campagne`/`Verdict`/`Brouillon`/`ResultatBrouillonProjet` le sont depuis la Phase 5 (incrément 2),
// leurs commandes de la Façade échangeant désormais ces types comme paramètres explicites. Le contenu détaillé
// d'un `Audit` (`resultats`, catalogue figé des indicateurs) reste en `unknown` : ces valeurs ne sont ni
// construites ni interprétées côté interface avant le Moteur de jugement (Phase 6), seulement transmises telles
// quelles par l'Orchestrateur de campagne (incrément ultérieur). Les annotations de portée groupe et le détail du
// calcul du premier commit interne restent hors périmètre (respectivement Phase 8 et Phase 5).
import type { Instance } from '../../sansetat/commandes/types-facade';

/**
 * Type de critère d'identification d'un membre connu (mirroir de `TypeCritere` côté cœur natif).
 */
export enum TypeCritereMembre {
  /** Identifiant de connexion (login) sur l'instance. */
  Username = 'username',
  /** Adresse électronique complète. */
  Email = 'email',
  /** Domaine d'adresse électronique. */
  DomaineEmail = 'domaineEmail',
}

/**
 * Statut de rattachement d'un membre connu (mirroir de `StatutMembre` côté cœur natif).
 */
export enum StatutMembre {
  /** Membre interne à l'organisation. */
  Interne = 'interne',
  /** Membre représentant un client. */
  Client = 'client',
  /** Membre représentant un partenaire/prestataire. */
  Partenaire = 'partenaire',
}

/**
 * Règle d'identification d'un collaborateur (US-022, US-023), mirroir de `MembreConnu` côté cœur natif : donnée du
 * groupe jamais exportée en clair (RG-006 à RG-008). Précédence de correspondance : username exact, puis email
 * exact, puis domaine email (RG-007).
 */
export interface MembreConnu {
  /** Identifiant UUID v4 du membre connu. */
  readonly id: string;
  /** Motif de reconnaissance (login, email ou domaine selon `typeCritere`). */
  readonly critere: string;
  /** Type du critère de reconnaissance. */
  readonly typeCritere: TypeCritereMembre;
  /** Statut associé (interne, client, partenaire). */
  readonly statut: StatutMembre;
  /** Libellé lisible optionnel. */
  readonly libelle?: string;
  /** Alias courriel optionnel. */
  readonly aliasEmail?: string;
}

/**
 * Événement daté de portée groupe ou projet (US-024), mirroir de `Annotation` côté cœur natif, affiché en repère
 * sur les graphiques d'évolution (hors périmètre de restitution de l'Administration, Phase 6).
 */
export interface Annotation {
  /** Identifiant UUID v4 de l'annotation. */
  readonly id: string;
  /** Date de l'événement. */
  readonly date: string;
  /** Libellé court de l'événement. */
  readonly libelle: string;
  /** Catégorie de l'événement. */
  readonly categorie: string;
  /** Description longue optionnelle. */
  readonly description?: string;
  /** Indique une annotation générée automatiquement par le système (ex. RG-015), jamais supprimable. */
  readonly systeme?: boolean;
}

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
 * Projet suivi au sein d'un groupe (US-007, US-024), mirroir de `Projet` côté cœur natif. La branche `audits` ne
 * relève pas de l'Administration (Phase 5) et reste hors périmètre : elle est conservée telle quelle.
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
  /**
   * Annotations de portée projet, dont l'annotation système créée automatiquement à l'autorisation de l'IA
   * (RG-015).
   */
  readonly annotations: readonly Annotation[];
  /** Historique des audits du projet. */
  readonly audits: readonly Audit[];
}

/**
 * Groupe, racine de la grappe principale (US-006, US-022, US-023), mirroir de `Groupe` côté cœur natif. Les
 * annotations de groupe (US-020) restent hors périmètre de l'Administration (Phase 8) et sont conservées telles
 * quelles.
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
  /** Membres connus du groupe (US-022, US-023), donnée jamais exportée en clair (RG-006 à RG-008). */
  readonly membresConnus: readonly MembreConnu[];
  /** Annotations de portée groupe (hors périmètre de l'Administration, Phase 8). */
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
 * Historique d'audit d'un projet : un ensemble de constats bruts obtenus à une date donnée, mirroir de `Audit`
 * côté cœur natif. `resultats` (catalogue figé des types d'indicateurs) reste en `unknown` : ni construit ni
 * interprété côté interface avant le Moteur de jugement (Phase 6).
 */
export interface Audit {
  /** Identifiant UUID v4 de l'audit. */
  readonly id: string;
  /** Date de réalisation de l'audit. */
  readonly date: string;
  /** Identifiant de la campagne qui a produit cet audit. */
  readonly campagneId: string;
  /** Résultats typés obtenus (catalogue figé, hors périmètre d'interprétation de l'interface avant la Phase 6). */
  readonly resultats: readonly unknown[];
}

/**
 * Statut d'exécution d'un projet au sein d'une campagne (mirroir de `StatutVerdict` côté cœur natif). `rejete`
 * n'est atteint qu'après traitement du brouillon (Phase 5, incrément 2), jamais à l'enregistrement initial de la
 * campagne.
 */
export type StatutVerdict = 'succes' | 'echec' | 'ignore' | 'rejete';

/**
 * Verdict d'exécution d'un projet au sein d'une campagne, mirroir de `Verdict` côté cœur natif.
 */
export interface Verdict {
  /** Identifiant du projet concerné. */
  readonly projetId: string;
  /** Statut d'exécution. */
  readonly statut: StatutVerdict;
  /** Durée d'exécution en millisecondes, si le projet a été traité. */
  readonly dureeMs?: number;
  /** Anomalies rencontrées, si le traitement a échoué (catalogue RG-021, non interprété ici). */
  readonly anomalies?: readonly unknown[];
  /** Motif de rejet, si le projet a été rejeté depuis le brouillon (Phase 5, incrément 2). */
  readonly motifRejet?: string;
}

/**
 * Trace d'exécution d'une campagne d'audit, mirroir de `Campagne` côté cœur natif.
 */
export interface Campagne {
  /** Identifiant UUID v4 de la campagne. */
  readonly id: string;
  /** Date de lancement de la campagne. */
  readonly date: string;
  /** Identifiants des projets du périmètre de la campagne. */
  readonly perimetre: readonly string[];
  /** Verdicts d'exécution par projet. */
  readonly verdicts: readonly Verdict[];
}

/**
 * Statut d'un résultat de brouillon au sein de la zone de validation courante, mirroir de `StatutResultatBrouillon`
 * côté cœur natif (Phase 5, incrément 2).
 */
export type StatutResultatBrouillon = 'enAttente' | 'integre' | 'rejete';

/**
 * Résultat en attente de validation pour un projet, au sein du brouillon courant, mirroir de
 * `ResultatBrouillonProjet` côté cœur natif.
 */
export interface ResultatBrouillonProjet {
  /** Identifiant du projet concerné. */
  readonly projetId: string;
  /** Audit produit, en attente d'intégration à l'historique du projet. */
  readonly audit: Audit;
  /** Statut du résultat au sein du brouillon. */
  readonly statut: StatutResultatBrouillon;
  /** Motif de rejet, si le résultat a été écarté. */
  readonly motifRejet?: string;
  /**
   * Variations aberrantes détectées par rapport au dernier audit intégré (RG-020, produites par
   * `OrchestrateurCampagneService`/`AberrationUtils` depuis la Phase 5, incrément 4 ; forme non typée ici,
   * cf. `services/avecetat/campagne/aberration.utils.ts`).
   */
  readonly aberrations?: readonly unknown[];
}

/**
 * Zone de validation courante des résultats d'une campagne, au plus une occurrence (nullable) à la racine,
 * mirroir de `Brouillon` côté cœur natif.
 */
export interface Brouillon {
  /** Identifiant de la campagne dont ce brouillon est issu. */
  readonly campagneId: string;
  /** Date de création du brouillon. */
  readonly creeLe: string;
  /** Résultats en attente de validation, par projet. */
  readonly resultatsParProjet: readonly ResultatBrouillonProjet[];
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
 * l'interface (référentiels, paramètres, journal hors ajout, vues enregistrées) sont typées en `unknown`/tableau
 * générique afin de n'être jamais perdues lors d'une mutation du Store.
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
  /** Traces d'exécution des campagnes d'audit. */
  readonly campagnes: readonly Campagne[];
  /** Zone de validation courante, au plus une occurrence. */
  readonly brouillon: Brouillon | null;
  /** Statuts vu/traité par clé d'alerte stable (hors périmètre de l'Administration, Phase 3). */
  readonly traitementsAlertes: readonly unknown[];
  /** Journal append-only des modifications de paramétrage (RG-023). */
  readonly journal: readonly EntreeJournal[];
  /** Modèles de filtres nommés (hors périmètre de l'Administration, Phase 3). */
  readonly vuesEnregistrees: readonly unknown[];
}

/**
 * Réponse de la commande native `qualifierMembre` (US-022, US-023), mirroir de `ReponseQualificationMembre` côté
 * cœur natif.
 */
export interface ReponseQualificationMembre {
  /** Racine des données mises à jour, à substituer intégralement à l'état courant du Store. */
  readonly donnees: DonneesRacine;
  /** Identifiants des règles de membres connus du groupe concerné actuellement en conflit (RG-008). */
  readonly membresEnConflit: readonly string[];
}

/**
 * Catégorie d'anomalie remontée par `qualifierMembre`/`definirPolitiqueIA`/`supprimerMembreConnu` (Phase 4) et par
 * `enregistrerBrouillon`/`integrerBrouillon`/`rejeterBrouillon` (Phase 5, incrément 2), mirroir de `ErreurFacade`
 * côté cœur natif, étendu des seules catégories métier propres à ces commandes ; les catégories techniques
 * héritées des commandes de fichier de la Phase 1 y figurent également, ces commandes pouvant en hériter via la
 * sauvegarde qu'elles déclenchent.
 */
export type CategorieErreurAdministration =
  | 'groupeIntrouvable'
  | 'projetIntrouvable'
  | 'membreIntrouvable'
  | 'doublonUsernameMembreConnu'
  | 'brouillonDejaExistant'
  | 'aucunBrouillonCourant'
  | 'projetAbsentDuBrouillon'
  | 'fichierIntrouvable'
  | 'motDePasseOuFichierInvalide'
  | 'formatNonReconnu'
  | 'versionSchemaSuperieure'
  | 'fichierVerrouille'
  | 'aucunFichierOuvert'
  | 'credentialInvalide'
  | 'erreurInterne';

/**
 * Anomalie typée d'une commande d'administration (Phase 4), mirroir de `ErreurFacade` côté cœur natif.
 */
export interface ErreurAdministration {
  /** Catégorie de l'anomalie. */
  readonly type: CategorieErreurAdministration;
}

/**
 * Résultat typé d'une qualification de membre connu, exposé par `DonneesApplicationService.qualifierMembre` :
 * union discriminée sur `type`, à traiter par un switch exhaustif plutôt que par la gestion d'un rejet de Promise
 * non typé.
 */
export type ResultatQualificationMembre =
  | { readonly type: 'succes'; readonly membresEnConflit: readonly string[] }
  | { readonly type: 'echec'; readonly anomalie: ErreurAdministration };

/**
 * Résultat typé d'une mutation d'administration sans donnée de retour propre (`definirPolitiqueIA`,
 * `supprimerMembreConnu`), sur le modèle de {@link ResultatQualificationMembre}.
 */
export type ResultatMutationAdministration =
  { readonly type: 'succes' } | { readonly type: 'echec'; readonly anomalie: ErreurAdministration };
