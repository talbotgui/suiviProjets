// Fichier généré avec l'assistance de l'IA (Claude Code), conformément à la mention d'origine requise par
// .claude/rules/01-usage-ia-et-conventions.md.
//
// Types TypeScript mirroir de la racine du document JSON en clair (Phase 3, US-006, US-007, US-008 ; Phase 4,
// US-022 à US-024 ; Phase 6, incrément 1), alignés sur `src-tauri/src/modele/racine.rs`, tous deux sérialisés en
// `camelCase` côté Rust (`serde(rename_all = "camelCase")`). Réutilise `Instance`/`TypeInstance` et les 13
// interfaces `Resultat*` du catalogue figé (hors les 3 résultats croisés, calculés côté UI), déjà définies dans
// `services/sansetat/commandes/types-facade.ts`, plutôt que de les dupliquer (dépendance `avecetat` → `sansetat`
// autorisée par le découpage en couches du projet, cf.
// `docs/02_documentation/14_normesDeveloppement.md#structuration-du-code-et-découpage-en-couches`). Réutilise de
// même les 3 interfaces `ResultatCroise*`, déjà définies dans `services/avecetat/campagne/connecteur-croise.
// utils.ts` (Connecteur croisé) : dépendance `avecetat/etat` → `avecetat/campagne` sans cycle (`connecteur-croise.
// utils.ts` n'importe rien de `services/avecetat/etat/`), retenue plutôt qu'une duplication des 3 interfaces.
//
// Périmètre de la Phase 6, incrément 1 : `referentiels` et `parametres.seuils` sont désormais typés (mirroir
// strict de `Referentiels` côté cœur natif pour le premier, reprise exacte des clés confirmées dans
// `docs/01_besoin/exemple-donnees.json` pour le second), de même que `resultats` (union discriminée `Resultat`,
// 16 variantes) et `premierCommitInterne`/`traitementsAlertes`. Les autres sous-branches de `parametres`
// (`verrouillage`, `audit`, `proxy`, `sauvegarde`) restent en `unknown`, à l'identique de la décision de
// modélisation prise côté Rust (`serde_json::Value`, cf. commentaire d'en-tête de `modele/racine.rs`) : hors
// périmètre de cet incrément, non interprétées ici, seulement conservées telles quelles lors des mutations du
// Store afin de préserver un round-trip fidèle vers `sauvegarderFichier`. `MembreConnu` et `Annotation` sont
// typées intégralement depuis la Phase 4, `Campagne`/`Verdict`/`Brouillon`/`ResultatBrouillonProjet` le sont
// depuis la Phase 5 (incrément 2), leurs commandes de la Façade échangeant désormais ces types comme paramètres
// explicites. Les annotations de portée groupe restent hors périmètre (Phase 8).
//
// Périmètre de la Phase 7, incrément 1 : le contenu de `referentiels.reglesDependances`/`referentiels.
// reglesMarqueursIA` est désormais typé (élément par élément), nécessaire à `definirReferentiel` (upsert par
// identifiant, US-033). Réutilise `RegleDependance`/`RegleMarqueurIA`, structures déjà définies et exclusivement
// consommées en lecture par le Moteur de jugement (`services/sansetat/jugement/parametres-jugement.utils.ts` et
// `services/sansetat/commandes/types-facade.ts`), plutôt que de les redéfinir : ces deux types restent
// volontairement dépourvus d'identifiant (aucune fonction pure du Moteur de jugement n'en a besoin, seule la
// correspondance par motif compte). `EntreeReglesDependances`/`EntreeReglesMarqueursIA` ci-dessous les étendent
// du seul identifiant stable nécessaire à l'édition depuis l'écran de Paramétrage, sans toucher aux deux types
// du Moteur de jugement ni aux nombreux tests qui construisent déjà des valeurs de ces deux types sans
// identifiant (Phase 6). `VersionDependance.statut` reste une chaîne ouverte, non énumérée en dur (RG-022).
import type {
  Instance,
  RegleMarqueurIA,
  ResultatGitlabBranches,
  ResultatGitlabContributeurs,
  ResultatGitlabDependances,
  ResultatGitlabMarqueursIa,
  ResultatGitlabMembres,
  ResultatGitlabMergeRequests,
  ResultatGitlabTailleDepot,
  ResultatGitlabVitalite,
  ResultatSonarCouverture,
  ResultatSonarDette,
  ResultatSonarNcloc,
  ResultatSonarNotes,
  ResultatSonarViolations,
} from '../../sansetat/commandes/types-facade';
import type {
  ResultatCroiseActiviteSansQualite,
  ResultatCroiseFraicheurSonar,
  ResultatCroiseIaNouveauCode,
} from '../campagne/connecteur-croise.utils';
import type { RegleDependance } from '../../sansetat/jugement/parametres-jugement.utils';

/**
 * Résultat typé d'un audit, mirroir de `Resultat` côté cœur natif : union discriminée sur `type` (16 variantes du
 * catalogue figé, `docs/01_besoin/Specification.md#55-f05--audits-et-catalogue-des-indicateurs`), chaque variante
 * réutilisant l'interface de charge utile déjà définie (`types-facade.ts` pour les 13 résultats bruts obtenus par
 * appel API, `connecteur-croise.utils.ts` pour les 3 résultats croisés calculés côté UI). À traiter par un switch
 * exhaustif sur `type` plutôt que par un accès non sûr à un champ arbitraire (RG-011 : aucun verdict n'est jamais
 * porté par ces charges utiles, seulement des constats bruts).
 */
export type Resultat =
  | ({ readonly type: 'gitlab.dependances' } & ResultatGitlabDependances)
  | ({ readonly type: 'gitlab.branches' } & ResultatGitlabBranches)
  | ({ readonly type: 'gitlab.vitalite' } & ResultatGitlabVitalite)
  | ({ readonly type: 'gitlab.contributeurs' } & ResultatGitlabContributeurs)
  | ({ readonly type: 'gitlab.taille_depot' } & ResultatGitlabTailleDepot)
  | ({ readonly type: 'gitlab.merge_requests' } & ResultatGitlabMergeRequests)
  | ({ readonly type: 'gitlab.marqueurs_ia' } & ResultatGitlabMarqueursIa)
  | ({ readonly type: 'gitlab.membres' } & ResultatGitlabMembres)
  | ({ readonly type: 'sonar.violations' } & ResultatSonarViolations)
  | ({ readonly type: 'sonar.dette' } & ResultatSonarDette)
  | ({ readonly type: 'sonar.couverture' } & ResultatSonarCouverture)
  | ({ readonly type: 'sonar.notes' } & ResultatSonarNotes)
  | ({ readonly type: 'sonar.ncloc' } & ResultatSonarNcloc)
  | ({ readonly type: 'croise.fraicheur_sonar' } & ResultatCroiseFraicheurSonar)
  | ({ readonly type: 'croise.activite_sans_qualite' } & ResultatCroiseActiviteSansQualite)
  | ({ readonly type: 'croise.ia_nouveau_code' } & ResultatCroiseIaNouveauCode);

/**
 * Règle de dépendance persistée (`referentiels.reglesDependances[]`), `RegleDependance` du Moteur de jugement
 * complétée de l'identifiant stable requis par `definirReferentiel` (US-033) pour distinguer un ajout d'une
 * modification. Mirroir de l'entité `RegleDependance` de
 * `docs/02_documentation/12_modeleDonnees.md#entités-attributs-et-relations`.
 */
export interface EntreeReglesDependances extends RegleDependance {
  /** Identifiant UUID v4 de la règle, stable d'une édition à l'autre. */
  readonly id: string;
}

/**
 * Règle de détection de marqueur IA persistée (`referentiels.reglesMarqueursIA[]`), `RegleMarqueurIA` du Moteur
 * de jugement complétée de l'identifiant stable requis par `definirReferentiel` (US-033). Mirroir de l'entité
 * `RegleMarqueurIA` de `docs/02_documentation/12_modeleDonnees.md#entités-attributs-et-relations`.
 */
export interface EntreeReglesMarqueursIA extends RegleMarqueurIA {
  /** Identifiant UUID v4 de la règle, stable d'une édition à l'autre. */
  readonly id: string;
}

/**
 * Grilles de lecture partageables (référentiels), mirroir strict de `Referentiels` côté cœur natif.
 */
export interface Referentiels {
  /** Règles de dépendances (motif, versions, statuts d'obsolescence). */
  readonly reglesDependances: readonly EntreeReglesDependances[];
  /** Règles de détection des marqueurs d'outils IA (F18). */
  readonly reglesMarqueursIA: readonly EntreeReglesMarqueursIA[];
  /**
   * Motif d'expression régulière de nommage de branche, paramétrable (RG-030), consommé exclusivement à
   * l'affichage par le Moteur de jugement pour recalculer la conformité de nommage d'une branche
   * (`Resultat.GitlabBranches`), jamais stocké comme un constat.
   */
  readonly motifNommageBranches: string;
}

/**
 * Seuils de vitalité du dépôt (`parametres.seuils.vitalite`), mirroir de la clé homonyme de
 * `docs/01_besoin/exemple-donnees.json`.
 */
export interface SeuilsVitalite {
  /** Nombre de jours sans commit à partir duquel un dépôt est considéré mourant. */
  readonly mourantJours: number;
  /** Nombre de jours sans commit à partir duquel un dépôt est considéré mort. */
  readonly mortJours: number;
}

/**
 * Bornes de classe de taille du dépôt (`parametres.seuils.tailleDepot`), en octets.
 */
export interface SeuilsTailleDepot {
  /** Borne supérieure de la classe « S ». */
  readonly borneS: number;
  /** Borne supérieure de la classe « L ». */
  readonly borneL: number;
  /** Borne supérieure de la classe « XL ». */
  readonly borneXL: number;
}

/**
 * Seuils de couverture de tests Sonar (`parametres.seuils.couverture`), en pourcentage.
 */
export interface SeuilsCouverture {
  /** Seuil en-dessous duquel la couverture est jugée rouge. */
  readonly seuilRouge: number;
  /** Seuil en-dessous duquel la couverture est jugée orange (au-delà de {@link seuilRouge}). */
  readonly seuilOrange: number;
}

/**
 * Tolérance de fraîcheur Sonar (`parametres.seuils.fraicheurSonar`, RG-013).
 */
export interface SeuilsFraicheurSonar {
  /** Nombre de jours d'écart toléré entre le dernier commit et la dernière analyse Sonar avant badge SONAR_KO. */
  readonly toleranceJours: number;
}

/**
 * Seuils d'activité sans qualité (`parametres.seuils.activiteSansQualite`).
 */
export interface SeuilsActiviteSansQualite {
  /** Nombre minimal de commits sur la fenêtre glissante pour que le signal soit évaluable. */
  readonly minCommits: number;
  /** Nombre minimal de nouvelles violations Sonar pour déclencher le signal. */
  readonly minNouvellesViolations: number;
}

/**
 * Seuil de fraîcheur d'audit (`parametres.seuils.fraicheurAudit`).
 */
export interface SeuilsFraicheurAudit {
  /** Nombre de jours au-delà duquel un projet est considéré non audité depuis trop longtemps. */
  readonly ancienJours: number;
}

/**
 * Seuils des demandes de fusion ouvertes (`parametres.seuils.mrOuvertes`).
 */
export interface SeuilsMrOuvertes {
  /** Âge en jours à partir duquel une MR ouverte est jugée orange. */
  readonly ageOrangeJours: number;
  /** Âge en jours à partir duquel une MR ouverte est jugée rouge. */
  readonly ageRougeJours: number;
  /** Pourcentage de MR ouvertes en conflit à partir duquel le signal est jugé rouge. */
  readonly pourcentageConflitRouge: number;
}

/**
 * Seuils orange/rouge appliqués à un décompte de violations d'une sévérité donnée
 * (`parametres.seuils.couleursViolations.{bloquant,critique}`).
 */
export interface SeuilsCouleurViolations {
  /** Nombre de violations à partir duquel la sévérité concernée est jugée orange. */
  readonly seuilOrange: number;
  /** Nombre de violations à partir duquel la sévérité concernée est jugée rouge. */
  readonly seuilRouge: number;
}

/**
 * Seuils de couleur des violations bloquantes/critiques (`parametres.seuils.couleursViolations`).
 */
export interface SeuilsCouleursViolations {
  /** Seuils appliqués au décompte de violations bloquantes. */
  readonly bloquant: SeuilsCouleurViolations;
  /** Seuils appliqués au décompte de violations critiques. */
  readonly critique: SeuilsCouleurViolations;
}

/**
 * Seuil de matérialité du brouillon (`parametres.seuils.materialiteBrouillon`, RG-020, F09).
 */
export interface SeuilsMaterialiteBrouillon {
  /** Ratio de variation relative au-delà duquel un mouvement est signalé comme matériel. */
  readonly variationRelative: number;
}

/**
 * Grille de seuils du Moteur de jugement (`parametres.seuils`), mirroir des clés exactement confirmées dans
 * `docs/01_besoin/exemple-donnees.json` (les autres sous-branches de `parametres` restent en `unknown`, cf.
 * commentaire d'en-tête de ce fichier). Reste une valeur JSON générique côté cœur natif (`serde_json::Value`,
 * décision de modélisation actée dès la Phase 1) : ce typage est propre à l'interface, consommé par le futur
 * point unique de lecture défensive du Moteur de jugement (`ParametresJugementUtils`, incrément 2).
 */
export interface SeuilsJugement {
  /** Seuils de vitalité du dépôt. */
  readonly vitalite: SeuilsVitalite;
  /** Bornes de classe de taille du dépôt. */
  readonly tailleDepot: SeuilsTailleDepot;
  /** Seuils de couverture de tests Sonar. */
  readonly couverture: SeuilsCouverture;
  /** Tolérance de fraîcheur Sonar (RG-013). */
  readonly fraicheurSonar: SeuilsFraicheurSonar;
  /** Seuils d'activité sans qualité. */
  readonly activiteSansQualite: SeuilsActiviteSansQualite;
  /** Seuil de fraîcheur d'audit. */
  readonly fraicheurAudit: SeuilsFraicheurAudit;
  /** Seuils des demandes de fusion ouvertes. */
  readonly mrOuvertes: SeuilsMrOuvertes;
  /** Seuils de couleur des violations bloquantes/critiques. */
  readonly couleursViolations: SeuilsCouleursViolations;
  /** Seuil de matérialité du brouillon. */
  readonly materialiteBrouillon: SeuilsMaterialiteBrouillon;
}

/**
 * Réglages de verrouillage de session (US-026, RG-004, RG-005, RNF-014), mirroir de `Verrouillage` côté cœur
 * natif (`src-tauri/src/modele/racine.rs`). Typé à l'occasion du câblage de l'écran de Verrouillage (périmètre de
 * cette tâche) : jusqu'ici laissé en `unknown` bien que déjà typé côté cœur natif, faute d'un appelant côté
 * interface ayant besoin de lire ces valeurs.
 */
export interface Verrouillage {
  /** Délai d'inactivité, en minutes, avant verrouillage automatique de la session. */
  readonly delaiInactiviteMinutes: number;
  /** Nombre d'échecs consécutifs de déverrouillage avant fermeture complète du fichier. */
  readonly echecsAvantFermeture: number;
}

/**
 * Réglages d'exécution des campagnes d'audit (RNF-004), mirroir de `ParametresAudit` côté cœur natif. Typé
 * intégralement depuis la Phase 10, incrément 8 (US-034), à l'occasion de la construction de la zone « Réglages
 * applicatifs » de l'écran de Paramétrage.
 */
export interface ParametresAudit {
  /** Concurrence par défaut des appels d'audit. */
  readonly concurrence: number;
  /** Fenêtre en jours de calcul des contributeurs récents, si déjà fixée. */
  readonly fenetreContributeursJours?: number;
  /** Borne de pages de recherche du premier commit interne, si déjà fixée. */
  readonly borneRecherchePremierCommitPages?: number;
}

/**
 * Réglages de proxy sortant, mirroir de `Proxy` côté cœur natif. Typé depuis la Phase 10, incrément 8 (US-034).
 */
export interface Proxy {
  /** URL du proxy. */
  readonly url?: string;
  /** Chemin vers un fascicule de certificats d'autorité supplémentaire. */
  readonly cheminBundleCa?: string;
}

/**
 * Réglages de sauvegarde de sécurité (RG-003), mirroir de `Sauvegarde` côté cœur natif. Typé depuis la Phase 10,
 * incrément 8 (US-034).
 */
export interface Sauvegarde {
  /** Nombre de sauvegardes de sécurité horodatées conservées avant rotation. */
  readonly nombreSauvegardesSecurite: number;
}

/**
 * Seuils et réglages applicatifs (`parametres`), mirroir de `Parametres` côté cœur natif.
 */
export interface Parametres {
  /** Grille de seuils du Moteur de jugement. */
  readonly seuils: SeuilsJugement;
  /** Réglages de verrouillage de session (US-026). */
  readonly verrouillage: Verrouillage;
  /** Réglages d'exécution des campagnes d'audit (US-034). */
  readonly audit: ParametresAudit;
  /** Réglages de proxy sortant, absents si non configurés (US-034). */
  readonly proxy?: Proxy;
  /** Réglages de sauvegarde de sécurité (US-034). */
  readonly sauvegarde: Sauvegarde;
  /** Seuil de taille, en octets, déclenchant l'avertissement contextuel de purge à la sauvegarde (US-035). */
  readonly seuilAvertissementTailleOctets: number;
}

/**
 * Attribut immuable recalculable identifiant la date du premier commit interne d'un projet, mirroir de
 * `PremierCommitInterne` côté cœur natif.
 */
export interface PremierCommitInterne {
  /** Date du premier commit interne détecté. */
  readonly date: string;
  /** SHA (éventuellement abrégé) du commit. */
  readonly sha: string;
  /** Adresse courriel de l'auteur du commit. */
  readonly emailAuteur: string;
  /** Date à laquelle ce calcul a été effectué. */
  readonly calculeLe: string;
  /** Empreinte du référentiel de membres connus utilisé au moment du calcul. */
  readonly empreinteReferentiel: string;
  /** Statut du calcul (ex. `determine`). */
  readonly statut: string;
}

/**
 * Statut de traitement d'une alerte (RG-026), mirroir de `StatutTraitementAlerte` côté cœur natif.
 */
export enum StatutTraitementAlerte {
  /** Alerte vue mais non encore traitée. */
  Vue = 'vue',
  /** Alerte traitée. */
  Traitee = 'traitee',
}

/**
 * Statut vu/traité associé à une clé d'alerte stable (RG-026), mirroir de `TraitementAlerte` côté cœur natif.
 */
export interface TraitementAlerte {
  /** Identifiant UUID v4 de l'entrée. */
  readonly id: string;
  /** Clé stable de l'alerte (`typeAlerte|projetId|discriminant`). */
  readonly cleAlerte: string;
  /** Statut courant du traitement. */
  readonly statut: StatutTraitementAlerte;
  /** Commentaire libre optionnel. */
  readonly commentaire?: string;
  /** Horodatage de la dernière mise à jour du statut. */
  readonly horodatage: string;
}

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
 * Événement daté de portée groupe ou projet (US-019), mirroir de `Annotation` côté cœur natif, affiché en repère
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
  /** Date du premier commit interne, une fois calculée (consommé par la future Fiche projet, Phase 6). */
  readonly premierCommitInterne?: PremierCommitInterne;
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
 * Groupe, racine de la grappe principale (US-006, US-022, US-023), mirroir de `Groupe` côté cœur natif.
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
  /** Annotations de portée groupe (US-019), typées depuis la Phase 10, incrément 8. */
  readonly annotations: readonly Annotation[];
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
 * côté cœur natif. `resultats` (catalogue figé des types d'indicateurs, Phase 6, incrément 1) est désormais typé
 * par l'union discriminée {@link Resultat}.
 */
export interface Audit {
  /** Identifiant UUID v4 de l'audit. */
  readonly id: string;
  /** Date de réalisation de l'audit. */
  readonly date: string;
  /** Identifiant de la campagne qui a produit cet audit. */
  readonly campagneId: string;
  /** Résultats typés obtenus (catalogue figé, union discriminée sur `type`). */
  readonly resultats: readonly Resultat[];
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
 * Modèle de filtres nommé, propre à un écran, mirroir de `VueEnregistree` côté cœur natif (US-028, RG-027, Phase 9
 * incrément 1). `filtres` reste typé en `unknown` : sa structure concrète est propre à l'écran désigné par `ecran`
 * et interprétée par lui seul (cf. `VuesEnregistreesUtils`).
 */
export interface VueEnregistree {
  /** Identifiant UUID v4 de la vue enregistrée. */
  readonly id: string;
  /** Nom donné par l'utilisateur. */
  readonly nom: string;
  /** Identifiant stable de l'écran auquel s'applique la vue. */
  readonly ecran: string;
  /** Version du schéma de filtres, propre à l'écran concerné. */
  readonly versionFiltres: number;
  /** Indique si cette vue est la vue par défaut de son écran. */
  readonly parDefaut: boolean;
  /** Filtres, structure propre à l'écran concerné. */
  readonly filtres: unknown;
}

/**
 * Racine du document JSON en clair, mirroir de `DonneesRacine` côté cœur natif, telle que retournée par
 * `creerFichier`/`chargerFichier` et attendue par `sauvegarderFichier`. Les branches non interprétées par
 * l'interface (référentiels, paramètres, journal hors ajout) sont typées en `unknown`/tableau générique afin de
 * n'être jamais perdues lors d'une mutation du Store.
 */
export interface DonneesRacine {
  /** Version du schéma de données. */
  readonly versionSchema: number;
  /** Métadonnées de suivi du fichier. */
  readonly meta: Meta;
  /** Grappe principale de groupes. */
  readonly groupes: readonly Groupe[];
  /** Grilles de lecture partageables (Phase 6, incrément 1 : `motifNommageBranches` typé, cf. {@link Referentiels}). */
  readonly referentiels: Referentiels;
  /** Seuils et réglages applicatifs (Phase 6, incrément 1 : `seuils` typé, cf. {@link Parametres}). */
  readonly parametres: Parametres;
  /** Traces d'exécution des campagnes d'audit. */
  readonly campagnes: readonly Campagne[];
  /** Zone de validation courante, au plus une occurrence. */
  readonly brouillon: Brouillon | null;
  /** Statuts vu/traité par clé d'alerte stable (RG-026, Phase 6, incrément 1). */
  readonly traitementsAlertes: readonly TraitementAlerte[];
  /** Journal append-only des modifications de paramétrage (RG-023). */
  readonly journal: readonly EntreeJournal[];
  /** Modèles de filtres nommés (US-028, RG-027, Phase 9 incrément 1). */
  readonly vuesEnregistrees: readonly VueEnregistree[];
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
 * Catégorie d'anomalie remontée par `qualifierMembre`/`definirPolitiqueIA`/`supprimerMembreConnu` (Phase 4), par
 * `enregistrerBrouillon`/`integrerBrouillon`/`rejeterBrouillon` (Phase 5, incrément 2), par
 * `definirSeuil`/`definirReferentiel` (Phase 7, incrément 1) et par `definirVue`/`supprimerVue` (Phase 9,
 * incrément 1), mirroir de `ErreurFacade` côté cœur natif, étendu des seules catégories métier propres à ces
 * commandes ; les catégories techniques héritées des commandes de fichier de la Phase 1 y figurent également, ces
 * commandes pouvant en hériter via la sauvegarde qu'elles déclenchent.
 */
export type CategorieErreurAdministration =
  | 'groupeIntrouvable'
  | 'projetIntrouvable'
  | 'membreIntrouvable'
  | 'doublonUsernameMembreConnu'
  | 'conflitReglesMembreConnu'
  | 'brouillonDejaExistant'
  | 'aucunBrouillonCourant'
  | 'projetAbsentDuBrouillon'
  | 'cleSeuilIntrouvable'
  | 'typeReferentielInconnu'
  | 'entreeReferentielInvalide'
  | 'motifNommageBranchesInvalide'
  | 'reglageApplicatifInvalide'
  | 'entreeReferentielIntrouvable'
  | 'annotationIntrouvable'
  | 'annotationSystemeNonSupprimable'
  | 'modePurgeAgeInconnu'
  | 'vueIntrouvable'
  | 'fichierConfigurationIllisible'
  | 'formatConfigurationNonReconnu'
  | 'versionSchemaConfigurationSuperieure'
  | 'ligneDifferentielInconnue'
  | 'fichierIntrouvable'
  | 'motDePasseOuFichierInvalide'
  | 'formatNonReconnu'
  | 'versionSchemaSuperieure'
  | 'fichierVerrouille'
  | 'aucunFichierOuvert'
  | 'credentialInvalide'
  | 'sessionVerrouillee'
  | 'motDePasseSessionDivergent'
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

/**
 * Résultat typé d'un déverrouillage de session (`DonneesApplicationService.deverrouillerSession`, US-026) : à la
 * différence de {@link ResultatMutationAdministration}, la branche d'échec porte `fichierFerme`, `true` lorsque cet
 * échec a atteint `parametres.verrouillage.echecsAvantFermeture` et provoqué la fermeture complète du fichier
 * (`EtatSessionService.enregistrerEchecDeverrouillage`), pour permettre à l'écran de Verrouillage de distinguer un
 * nouvel essai possible d'un retour obligatoire à l'écran de Démarrage.
 */
export type ResultatDeverrouillage =
  | { readonly type: 'succes' }
  | {
      readonly type: 'echec';
      readonly anomalie: ErreurAdministration;
      readonly fichierFerme: boolean;
    };

/**
 * Résumé d'une prévisualisation ou d'une exécution de purge des audits anciens (US-025, Phase 7, incrément 4 ;
 * RG-024, RG-025), mirroir de `PrevisualisationPurge` côté cœur natif.
 */
export interface PrevisualisationPurge {
  /** Nombre d'audits concernés par la purge, tous projets confondus. */
  readonly nbAuditsSupprimes: number;
  /** Nombre de projets comportant au moins un audit concerné. */
  readonly nbProjetsConcernes: number;
  /** Taille compressée estimée du fichier de données avant la purge (octets). */
  readonly octetsAvant: number;
  /** Taille compressée estimée du fichier de données après la purge (octets). */
  readonly octetsApres: number;
}

/**
 * Résultat typé d'une prévisualisation de purge (`previsualiserPurgeDensite`/`previsualiserPurgeAge`), sur le
 * modèle de {@link ResultatQualificationMembre}.
 */
export type ResultatPrevisualisationPurge =
  | { readonly type: 'succes'; readonly previsualisation: PrevisualisationPurge }
  | { readonly type: 'echec'; readonly anomalie: ErreurAdministration };

/**
 * Mode de purge par âge (RG-025), transmis tel quel à `previsualiserPurgeAge`/`executerPurgeAge`.
 */
export type ModePurgeAge = 'suppression' | 'agregationMensuelle';

/**
 * Résumé d'une prévisualisation ou d'une exécution de purge du journal des modifications lui-même (US-036,
 * RG-034, Phase 10 incrément 8), mirroir de `PrevisualisationPurgeJournal` côté cœur natif.
 */
export interface PrevisualisationPurgeJournal {
  /** Nombre d'entrées du journal concernées par la purge. */
  readonly nbEntreesSupprimees: number;
  /** Taille compressée estimée du fichier de données avant la purge (octets). */
  readonly octetsAvant: number;
  /** Taille compressée estimée du fichier de données après la purge (octets). */
  readonly octetsApres: number;
}

/**
 * Résultat typé d'une prévisualisation de purge du journal (`previsualiserPurgeJournal`), sur le modèle de
 * {@link ResultatPrevisualisationPurge}.
 */
export type ResultatPrevisualisationPurgeJournal =
  | { readonly type: 'succes'; readonly previsualisation: PrevisualisationPurgeJournal }
  | { readonly type: 'echec'; readonly anomalie: ErreurAdministration };

/**
 * Catégorie d'une ligne du différentiel d'import de configuration partageable (US-030, RG-029), mirroir de
 * `CategorieLigneDifferentiel` côté cœur natif.
 */
export type CategorieLigneDifferentiel = 'ajout' | 'modification' | 'identique';

/**
 * Ligne du différentiel entre la configuration partageable actuelle et celle importée (US-030), mirroir de
 * `LigneDifferentielImport` côté cœur natif.
 */
export interface LigneDifferentielImport {
  /**
   * Chemin stable identifiant la valeur concernée (ex. `parametres.seuils.vitalite.mortJours`,
   * `referentiels.reglesDependances/d1`, `referentiels.motifNommageBranches`).
   */
  readonly chemin: string;
  /** Catégorie de la ligne. */
  readonly categorie: CategorieLigneDifferentiel;
  /** Valeur actuelle, absente si la ligne est un ajout. */
  readonly avant?: unknown;
  /** Valeur importée. */
  readonly apres: unknown;
}

/**
 * Ligne d'une entrée importée structurellement invalide (motif de nommage de branche syntaxiquement incorrect,
 * entrée de référentiel-liste dépourvue de ses champs obligatoires), mirroir de `LigneInvalideImport` côté cœur
 * natif : jamais proposée à l'acceptation, mais signalée explicitement à l'utilisateur (correction post-relecture,
 * Phase 9 incrément 3, arbitrage humain explicite).
 */
export interface LigneInvalideImport {
  /** Chemin stable de la ligne concernée, sur le même format que `LigneDifferentielImport.chemin`. */
  readonly chemin: string;
  /** Motif de l'invalidité, message technique (jamais un credential ni une donnée sensible). */
  readonly motif: string;
}

/**
 * Différentiel complet entre la configuration partageable actuelle et celle importée (US-029, US-030, RG-028,
 * RG-029), mirroir de `DifferentielImportConfiguration` côté cœur natif.
 */
export interface DifferentielImportConfiguration {
  /** Lignes du différentiel. */
  readonly lignes: readonly LigneDifferentielImport[];
  /** Lignes importées structurellement invalides, jamais proposées à l'acceptation. */
  readonly lignesInvalides: readonly LigneInvalideImport[];
}

/**
 * Résultat typé d'une prévisualisation d'import de configuration partageable
 * (`previsualiserImportConfiguration`), sur le modèle de {@link ResultatPrevisualisationPurge}.
 */
export type ResultatPrevisualisationImportConfiguration =
  | { readonly type: 'succes'; readonly differentiel: DifferentielImportConfiguration }
  | { readonly type: 'echec'; readonly anomalie: ErreurAdministration };
