// Fichier généré avec l'assistance de l'IA (Claude Code), conformément à la mention d'origine requise par
// .claude/rules/01-usage-ia-et-conventions.md.
//
// Écran Fiche projet (US-017, Phase 6 incrément 5), écran le plus riche de la phase (cf.
// `docs/02_documentation/09_maquettes.md#fiche-projet`) : en-tête (fil d'ariane, badges IA/SONAR_KO/membre
// inconnu), métadonnées (âge chez nous, dernier audit, dernière campagne, taille/classe), encart d'anomalie
// technique si la dernière campagne a échoué (état particulier, `09_maquettes.md#états-particuliers` : « indicateurs
// de la campagne précédente conservés », jamais un écran vide), colonne gauche (Sonar grisé si SONAR_KO avec
// légende explicative, dépendances, MR ouvertes), colonne droite (membres avec lien de qualification vers Membres
// connus, marqueurs IA, annotations/journal en lecture seule), actions (Comparaison entre deux audits — US-018,
// construite à l'incrément suivant, cf. `ecrans/comparaison-audits/` —, export PNG).
//
// Route `fiche-projet/:projetId` (`app.routes.ts`), paramètre lié directement à l'`input()` {@link projetId} via
// `withComponentInputBinding()` (`app.config.ts`).
//
// Évolution C15-14 (audit historique à date passée, US-046, RG-046) : le dernier audit restitué par défaut
// (`dernierAuditLabel` et l'ensemble des indicateurs affichés) ignore désormais systématiquement les audits
// historiques (`typeAudit: 'historique'`), jamais simplement `.at(-1)` ; un nouvel encart dédié
// (`fiche-projet__audits-historiques`) liste séparément les audits historiques du projet, le cas échéant.
//
// Évolution plan_17 chapitre 3 (US-057, RG-057) : une ligne discrète « Langages principaux » en icônes Sonar
// (`SqmIconeLangageComponent`) est insérée au-dessus de la section « Dépendances », alimentée par la ventilation
// `sonar.ncloc.parLangage` du dernier audit régulier via `LangagesPrincipauxUtils.selectionner` ; elle est grisée
// avec le bloc Sonar (`sonarKo`, RG-013) et absente quand la ventilation par langage est indisponible.
import {
  Component,
  ElementRef,
  Injector,
  afterNextRender,
  computed,
  inject,
  input,
  signal,
  viewChild,
  ChangeDetectionStrategy,
} from '@angular/core';
import type { InputSignal, Signal, WritableSignal } from '@angular/core';
import { NgTemplateOutlet } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { RouterLink } from '@angular/router';
import type { Params } from '@angular/router';
import { toPng } from 'html-to-image';
import { SqmBadgeComponent } from '../../composants/badge/badge.component';
import { SqmBoutonCopieComponent } from '../../composants/bouton-copie/bouton-copie.component';
import { SqmConfirmationMotDePasseComponent } from '../../composants/confirmation-mot-de-passe/confirmation-mot-de-passe.component';
import { SqmConfirmationSuppressionComponent } from '../../composants/confirmation-suppression/confirmation-suppression.component';
import { SqmExplicationJugementComponent } from '../../composants/explication-jugement/explication-jugement.component';
import { SqmIconeLangageComponent } from '../../composants/icone-langage/icone-langage.component';
import { SqmModaleSaisieMasseComponent } from '../../composants/modale-saisie-masse/modale-saisie-masse.component';
import type {
  ErreurLigneSaisieMasse,
  ResultatTraitementSaisieMasse,
  StrategieTraitementSaisieMasse,
} from '../../composants/modale-saisie-masse/modale-saisie-masse.component';
import { RapportAnomaliesUtils } from '../../services/avecetat/campagne/rapport-anomalies.utils';
import type { AnomalieResolue } from '../../services/avecetat/campagne/rapport-anomalies.utils';
import type { ResultatCroiseFraicheurSonar } from '../../services/avecetat/campagne/connecteur-croise.utils';
import type { DonneesMembreConnu } from '../../services/avecetat/etat/donnees-application.service';
import { DonneesApplicationService } from '../../services/avecetat/etat/donnees-application.service';
import { NotificationService } from '../../services/avecetat/etat/notification.service';
import { StatutMembre, TypeCritereMembre } from '../../services/avecetat/etat/types-donnees';
import type {
  Annotation,
  Audit,
  EntreeJournal,
  EntreeReglesDependances,
  Groupe,
  Projet,
  Resultat,
  Source,
} from '../../services/avecetat/etat/types-donnees';
import { TypeSource } from '../../services/avecetat/etat/types-donnees';
import { ErreurConnecteurUtils } from '../../services/sansetat/commandes/erreur-connecteur.utils';
import type {
  Dependance,
  Instance,
  Marqueur,
  MembreGitlab,
  MergeRequestOuverte,
} from '../../services/sansetat/commandes/types-facade';
import { AgregationThemeFicheProjetUtils } from '../../services/sansetat/jugement/agregation-theme-fiche-projet.utils';
import { DernierAuditRegulierUtils } from '../../services/sansetat/jugement/dernier-audit-regulier.utils';
import { BadgeSonarKoUtils } from '../../services/sansetat/jugement/badge-sonar-ko.utils';
import { ClasseTailleUtils } from '../../services/sansetat/jugement/classe-taille.utils';
import { DerniereCampagneUtils } from '../../services/sansetat/jugement/derniere-campagne.utils';
import { EcosystemeDependanceUtils } from '../../services/sansetat/jugement/ecosysteme-dependance.utils';
import type { EcosystemeDependance } from '../../services/sansetat/jugement/ecosysteme-dependance.utils';
import { ExportImageUtils } from '../../services/sansetat/jugement/export-image.utils';
import { LangagesPrincipauxUtils } from '../../services/sansetat/jugement/langages-principaux.utils';
import type { LangagePrincipal } from '../../services/sansetat/jugement/langages-principaux.utils';
import { LienExterneSourceUtils } from '../../services/sansetat/jugement/lien-externe-source.utils';
import { NoteSonarUtils } from '../../services/sansetat/jugement/note-sonar.utils';
import type { ResultatNoteSonar } from '../../services/sansetat/jugement/note-sonar.utils';
import {
  ParametresJugementUtils,
  type LectureDefensive,
  type SeuilsCouleursViolations,
  type SeuilsCouverture,
  type SeuilsFraicheurSonar,
  type SeuilsMrOuvertes,
  type SeuilsTailleDepot,
} from '../../services/sansetat/jugement/parametres-jugement.utils';
import { SaisieMasseDependancesUtils } from '../../services/sansetat/jugement/saisie-masse-dependances.utils';
import { SaisieMasseMembresUtils } from '../../services/sansetat/jugement/saisie-masse-membres.utils';
import type {
  StatutMembreSaisieMasse,
  TypeCritereMembreSaisieMasse,
} from '../../services/sansetat/jugement/saisie-masse-membres.utils';
import {
  SeuilsCouleurUtils,
  type Couleur,
} from '../../services/sansetat/jugement/seuils-couleur.utils';
import { StatutIaUtils } from '../../services/sansetat/jugement/statut-ia.utils';
import { StatutMembreUtils } from '../../services/sansetat/jugement/statut-membre.utils';
import type {
  GraviteAlerteMembreInconnu,
  ResolutionStatutMembre,
} from '../../services/sansetat/jugement/statut-membre.utils';
import { StatutObsolescenceUtils } from '../../services/sansetat/jugement/statut-obsolescence.utils';
import type { ResultatObsolescence } from '../../services/sansetat/jugement/statut-obsolescence.utils';

const MILLISECONDES_PAR_JOUR = 24 * 60 * 60 * 1000;

/**
 * Origine consignée au journal des modifications (RG-023) pour toute qualification de membre issue de la saisie
 * en masse depuis cet écran (US-044, RG-041) : décision arbitraire de ce développement (à valider par un humain),
 * faute de convention documentée pour ce libellé — distincte de `'Administration'` (constante propre à
 * `SqmMembresConnusAdminComponent`), pour ne jamais laisser croire dans le journal qu'une qualification en masse
 * réalisée depuis la Fiche projet provient du sous-onglet Membres connus.
 */
const ORIGINE_SAISIE_MASSE_MEMBRES = 'Saisie en masse (Fiche projet)';

/**
 * Étiquette d'un jugement calculé (libellé + couleur sémantique, absente si non calculable, RG-022 : jamais de
 * couleur inventée en l'absence de seuil), sur le modèle de `LigneSyntheseAudit` (`synthese-audits.component.ts`).
 */
interface EtiquetteCouleur {
  /** Libellé affiché. */
  readonly label: string;
  /** Couleur sémantique, absente si non calculable. */
  readonly couleur?: Couleur;
}

/**
 * Étiquette du statut IA d'un projet (RG-016), portant explicitement la réserve « absence de preuve ≠ preuve
 * d'absence » comme un texte affiché, jamais un simple badge « conforme » opaque.
 */
interface EtiquetteStatutIa {
  /** Libellé du badge affiché. */
  readonly label: string;
  /** Couleur sémantique du badge. */
  readonly couleur: Couleur;
  /**
   * Texte de réserve affiché sous le badge, présent uniquement pour le cas `conformeSousReserve` (RG-016) :
   * l'absence de marqueur détecté ne prouve pas l'absence d'usage réel de l'IA.
   */
  readonly reserve: string | undefined;
}

/**
 * Ligne d'affichage d'une dépendance (colonne gauche), avec son statut d'obsolescence déjà résolu (RG-011 : jamais
 * stocké, toujours recalculé à l'affichage par `StatutObsolescenceUtils`).
 */
interface LigneDependance {
  /** Référence de la dépendance. */
  readonly reference: string;
  /** Version constatée. */
  readonly version: string;
  /** Chemin du manifeste d'où provient cette dépendance. */
  readonly manifeste: string;
  /** Étiquette du statut d'obsolescence calculé. */
  readonly statut: EtiquetteCouleur;
  /**
   * `true` si cette dépendance n'est couverte par aucune règle du référentiel des dépendances, pour afficher le
   * lien de création d'une règle pré-remplie (cf. {@link SqmFicheProjetComponent.queryParamsReferentielDependance}).
   */
  readonly nonReference: boolean;
}

/**
 * Décompte des dépendances d'une section d'écosystème (US-056) portant un même statut d'obsolescence, affiché dans
 * la barre de titre de la section repliable. Les statuts sans aucune occurrence ne produisent aucune entrée
 * (strictement le modèle de {@link DecompteStatutMembres}).
 */
interface DecompteStatutDependances {
  /** Libellé du statut d'obsolescence (`obsolète`, `maintenu`, `à jour (M1)`, `à jour (M3)`, `non référencé`). */
  readonly label: string;
  /** Couleur sémantique du statut, absente si non calculable (RG-022). */
  readonly couleur?: Couleur;
  /** Nombre de dépendances de la section portant ce statut (toujours strictement positif). */
  readonly nombre: number;
}

/**
 * Section repliable d'un écosystème de dépendances (Maven, NPM, Autres) sur la Fiche projet (US-056) : reprend le
 * modèle des sections repliables de membres (US-017). Seules les sections non vides sont produites.
 */
interface SectionDependances {
  /** Écosystème d'appartenance de la section. */
  readonly ecosysteme: EcosystemeDependance;
  /** Libellé affiché de la section (« Maven », « NPM », « Autres »). */
  readonly titre: string;
  /** Dépendances de la section, dans l'ordre de parsing des manifestes (inchangé). */
  readonly dependances: readonly LigneDependance[];
  /** Nombre de dépendances de la section (identique à `dependances.length`, exposé pour la barre de titre). */
  readonly total: number;
  /** Décompte par statut d'obsolescence affiché dans la barre de titre (statuts à zéro omis). */
  readonly decompteParStatut: readonly DecompteStatutDependances[];
}

/**
 * Ligne d'affichage d'un audit historique à date passée (C15-14, US-046, RG-046), encart dédié distinct de l'audit
 * régulier restitué par défaut ({@link DonneesFicheProjet.dernierAuditLabel}) : `dateCibleeLabel` est la date
 * effectivement analysée (demandée par l'utilisateur), `dateExecutionLabel` l'horodatage réel de la campagne qui
 * l'a produit (`Audit.dateExecution`), toujours postérieur ou égal à `dateCibleeLabel`.
 */
interface LigneAuditHistorique {
  /** Identifiant de l'audit historique. */
  readonly id: string;
  /** Libellé de la date ciblée effectivement analysée (`Audit.date`). */
  readonly dateCibleeLabel: string;
  /** Libellé de l'horodatage réel de la campagne (`Audit.dateExecution`), `—` si absent (donnée non attendue). */
  readonly dateExecutionLabel: string;
}

/**
 * Ligne d'affichage d'une demande de fusion ouverte (colonne gauche).
 */
interface LigneMr {
  /** Identifiant interne de la demande de fusion. */
  readonly iid: number;
  /** Titre de la demande de fusion. */
  readonly titre: string;
  /** Libellé de l'ancienneté de la demande de fusion. */
  readonly ageLabel: string;
  /** `true` si la demande de fusion est en conflit. */
  readonly enConflit: boolean;
  /** Adresse de la demande de fusion sur l'instance GitLab d'origine. */
  readonly webUrl: string;
}

/**
 * Ligne d'affichage du lien direct vers une source GitLab/Sonar réellement interrogée (US-008, RG-045, C15-13),
 * construit à partir des seuls champs déjà chargés en mémoire (`Instance.urlBase`, `Source.idExterne`), sans aucun
 * appel réseau ni nouvelle commande de la Façade — cf. {@link LienExterneSourceUtils}.
 */
interface LigneSourceExterne {
  /** Libellé affiché (« Dépôt GitLab » ou « Projet Sonar »). */
  readonly label: string;
  /** Lien direct construit. */
  readonly url: string;
  /**
   * Indice au survol signalant le caractère non contractuel du lien (RG-045), présent uniquement pour une source
   * GitLab : le lien Sonar repose sur un format d'usage stable et documenté, sans réserve équivalente à afficher.
   */
  readonly avertissementNonContractuel: string | undefined;
}

/**
 * Ligne d'affichage d'un membre du dépôt (colonne droite), avec son statut de rattachement déjà résolu (RG-006 à
 * RG-010).
 */
interface LigneMembre {
  /** Identifiant de connexion du membre. */
  readonly username: string;
  /** Nom lisible du membre. */
  readonly nom: string;
  /** Libellé du niveau d'accès GitLab du membre. */
  readonly niveauAccesLabel: string;
  /** Étiquette du statut de rattachement calculé. */
  readonly statut: EtiquetteCouleur;
  /** `true` si le membre est de statut `inconnu` ou `conflit` (RG-006 à RG-009). */
  readonly inconnu: boolean;
  /** Gravité de l'alerte associée (RG-010), présente uniquement si {@link inconnu}. */
  readonly graviteAlerte: GraviteAlerteMembreInconnu | undefined;
  /**
   * Critère par défaut proposé pour pré-remplir le formulaire de création d'une règle de membre connu (lien
   * « Qualifier ce membre »), présent uniquement pour un membre réellement `inconnu` : un membre en `conflit` doit
   * plutôt être orienté vers la liste des règles existantes du groupe (cf. gabarit), aucune création n'étant
   * pertinente par défaut dans ce cas.
   */
  readonly critereParDefautQualification:
    { readonly type: TypeCritereMembre; readonly valeur: string } | undefined;
  /** `true` si le membre est nominativement membre direct du dépôt (US-017, première section). */
  readonly direct: boolean;
  /**
   * Chemins complets des groupes invités au projet dont ce membre relève (US-017, deuxième section), triés du plus
   * précis vers la racine ; vide si le membre ne relève d'aucun groupe invité.
   */
  readonly groupesInvites: readonly string[];
}

/**
 * Décompte des membres d'une section de la ventilation (US-017) portant un même statut de rattachement, affiché
 * dans la barre de titre de la section repliable. Les statuts sans aucun membre ne produisent aucune entrée.
 */
interface DecompteStatutMembres {
  /** Libellé du statut de rattachement (`interne`, `client`, `partenaire`, `inconnu`, `conflit de règles`). */
  readonly label: string;
  /** Couleur sémantique du statut, absente si non calculable (RG-022). */
  readonly couleur?: Couleur;
  /** Nombre de membres de la section portant ce statut (toujours strictement positif). */
  readonly nombre: number;
}

/**
 * Un groupe invité au projet et ses membres (US-017, deuxième section repliable) : le chemin complet du groupe est
 * mentionné une seule fois, au-dessus de la liste de ses membres.
 */
interface GroupeInviteMembres {
  /** Chemin complet du groupe invité (`group_full_path`). */
  readonly cheminGroupe: string;
  /** Membres du dépôt relevant de ce groupe invité, triés par nom (cf. {@link SqmFicheProjetComponent}). */
  readonly membres: readonly LigneMembre[];
}

/**
 * Section repliable de la ventilation des membres portant une liste plate (US-017, sections « directs » et
 * « hérités de l'arborescence »).
 */
interface SectionMembresSimple {
  /** Membres de la section, triés par nom. */
  readonly membres: readonly LigneMembre[];
  /** Nombre de membres distincts de la section (identique à `membres.length`, exposé pour la barre de titre). */
  readonly total: number;
  /** Décompte par statut affiché dans la barre de titre (statuts à zéro omis). */
  readonly decompteParStatut: readonly DecompteStatutMembres[];
}

/**
 * Section repliable de la ventilation des membres regroupant les membres par groupe invité (US-017, deuxième
 * section).
 */
interface SectionMembresGroupes {
  /** Groupes invités au projet et leurs membres, triés du chemin le plus précis vers la racine. */
  readonly groupes: readonly GroupeInviteMembres[];
  /**
   * Nombre de membres **distincts** relevant d'au moins un groupe invité (un membre rattaché à deux groupes
   * invités n'est compté qu'une fois ici, bien qu'il apparaisse sous chacun de ces groupes).
   */
  readonly total: number;
  /** Décompte par statut affiché dans la barre de titre, sur l'ensemble distinct des membres (statuts à zéro omis). */
  readonly decompteParStatut: readonly DecompteStatutMembres[];
}

/**
 * Ventilation des membres du dépôt en trois sections repliables (US-017, colonne droite de la Fiche projet) :
 * nominatifs directs, membres des groupes invités au projet, membres hérités de l'arborescence. Un même membre peut
 * figurer dans plusieurs sections (ex. direct **et** membre d'un groupe invité).
 */
interface SectionsMembres {
  /** Première section : membres nominatifs directs du dépôt. */
  readonly directs: SectionMembresSimple;
  /** Deuxième section : membres des groupes invités au projet, regroupés par groupe. */
  readonly groupesInvites: SectionMembresGroupes;
  /** Troisième section : membres hérités de l'arborescence du projet (ni directs, ni d'un groupe invité). */
  readonly herites: SectionMembresSimple;
}

/**
 * Anomalie technique affichée dans l'encart (cf. {@link AnomalieTechnique}), vocabulaire français résolu depuis la
 * catégorie typée RG-021 (`ErreurConnecteurUtils`).
 */
interface AnomalieAffichee {
  /** Libellé lisible de la catégorie de l'anomalie. */
  readonly libelleCategorie: string;
  /** Message technique brut, destiné à un affichage repliable. */
  readonly message: string;
  /** Action suggérée en langage clair. */
  readonly actionSuggeree: string;
}

/**
 * Encart d'anomalie technique (état particulier, `docs/02_documentation/09_maquettes.md#états-particuliers` :
 * « Dernière campagne en échec : encart d'anomalie technique affiché en tête, indicateurs de la campagne précédente
 * conservés »).
 */
interface AnomalieTechnique {
  /** Libellé de la date de la campagne en échec. */
  readonly dateCampagneLabel: string;
  /** Anomalies résolues de ce projet pour cette campagne, tableau vide si aucune n'a pu être résolue. */
  readonly anomalies: readonly AnomalieAffichee[];
}

/**
 * Données complètes de la Fiche projet, calculées une fois par rendu (cf. {@link EtatFicheProjet}).
 */
interface DonneesFicheProjet {
  /** Identifiant du groupe de rattachement. */
  readonly groupeId: string;
  /** Nom du groupe de rattachement (fil d'ariane). */
  readonly nomGroupe: string;
  /** Identifiant du projet. */
  readonly projetId: string;
  /** Nom du projet (fil d'ariane). */
  readonly nomProjet: string;
  /** Description du projet. */
  readonly description: string;
  /** Ref auditée du dépôt GitLab rattaché, libellé de repli si aucune source GitLab n'est rattachée. */
  readonly refAuditeeLabel: string;
  /** Liens directs vers les instances GitLab/Sonar réellement interrogées (US-008, RG-045, C15-13). */
  readonly sourcesExternes: readonly LigneSourceExterne[];
  /** Étiquette du statut IA (RG-016). */
  readonly statutIa: EtiquetteStatutIa;
  /** `true` si le badge SONAR_KO est déclenché (RG-013), toujours faux si {@link pasDeSonar}. */
  readonly sonarKo: boolean;
  /** `true` si au moins un membre du dépôt est de statut `inconnu`/`conflit` (RG-006 à RG-009). */
  readonly membreInconnuDetecte: boolean;
  /** Libellé de l'âge du projet chez nous (`Projet.premierCommitInterne`). */
  readonly ageChezNousLabel: string;
  /**
   * Libellé de la date du dernier audit **régulier** intégré (C15-14, US-046, RG-046 : un audit historique n'est
   * jamais sélectionné ici, cf. {@link auditsHistoriques} pour l'encart dédié), libellé de repli si jamais audité.
   */
  readonly dernierAuditLabel: string;
  /**
   * Audits historiques à date passée du projet (C15-14, US-046, RG-046), triés du plus récent au plus ancien
   * (date ciblée), tableau vide si aucun.
   */
  readonly auditsHistoriques: readonly LigneAuditHistorique[];
  /** Libellé de la dernière campagne ayant concerné ce projet, libellé de repli si aucune. */
  readonly derniereCampagneLabel: string;
  /** `true` si la dernière campagne s'est soldée par un échec pour ce projet (pilote {@link anomalieTechnique}). */
  readonly campagneEnEchec: boolean;
  /** Libellé de la taille et de la classe de taille du dépôt. */
  readonly tailleLabel: string;
  /** Encart d'anomalie technique, présent uniquement si {@link campagneEnEchec}. */
  readonly anomalieTechnique: AnomalieTechnique | undefined;
  /** `true` si aucun constat Sonar consommé par cet écran n'a été produit par le dernier audit intégré. */
  readonly pasDeSonar: boolean;
  /**
   * Texte de légende explicite du grisage Sonar (RG-013), présent uniquement si {@link sonarKo} :
   * `docs/02_documentation/09_maquettes.md#états-particuliers` (« bloc Indicateurs Sonar grisé avec légende
   * explicative de l'écart »).
   */
  readonly legendeSonarKo: string | undefined;
  /** Étiquette de couverture de tests, absente si non calculable ou {@link pasDeSonar}. */
  readonly couverture: EtiquetteCouleur | undefined;
  /** Notes A–E des quatre axes Sonar, tableau vide si non calculable ou {@link pasDeSonar}. */
  readonly notes: readonly ResultatNoteSonar[];
  /** Étiquette de décompte de violations bloquantes, absente si non calculable ou {@link pasDeSonar}. */
  readonly violationBloquant: EtiquetteCouleur | undefined;
  /** Étiquette de décompte de violations critiques, absente si non calculable ou {@link pasDeSonar}. */
  readonly violationCritique: EtiquetteCouleur | undefined;
  /** `true` si un constat `gitlab.dependances` a été produit par le dernier audit intégré. */
  readonly dependancesDisponibles: boolean;
  /** Dépendances déclarées, avec leur statut d'obsolescence déjà résolu (liste plate, ordre de parsing). */
  readonly dependances: readonly LigneDependance[];
  /**
   * Ventilation des dépendances en sections repliables par écosystème (US-056), dérivée de {@link dependances} ;
   * seules les sections non vides sont présentes, dans l'ordre Maven, NPM, Autres.
   */
  readonly sectionsDependances: readonly SectionDependances[];
  /**
   * Langages principaux du projet (RG-057), sélectionnés à partir de la ventilation Sonar `ncloc_language_distribution`
   * du dernier audit régulier retenu. Liste vide si la ventilation par langage est indisponible (aucun audit,
   * audit historique, audit antérieur à la collecte). Restitués en icônes au-dessus des dépendances, grisés
   * comme le bloc Sonar quand {@link sonarKo}.
   */
  readonly langagesPrincipaux: readonly LangagePrincipal[];
  /** Étiquette résumée des demandes de fusion ouvertes (nombre, conflits). */
  readonly mrResume: EtiquetteCouleur | undefined;
  /** Demandes de fusion ouvertes constatées, détaillées ligne par ligne. */
  readonly mrOuvertes: readonly LigneMr[];
  /**
   * Membres du dépôt constatés, liste à plat dédoublonnée par nom d'utilisateur (union de toutes les provenances),
   * avec leur statut de rattachement déjà résolu — support des traitements transverses (badge « membre inconnu »,
   * lien de saisie en masse, pré-remplissage de la modale).
   */
  readonly membres: readonly LigneMembre[];
  /** Ventilation des membres du dépôt en trois sections repliables (US-017). */
  readonly sectionsMembres: SectionsMembres;
  /** Marqueurs d'outils IA détectés dans l'arborescence par le dernier audit intégré. */
  readonly marqueursIa: readonly Marqueur[];
  /** Annotations du projet (US-019, Phase 8), triées de la plus récente à la plus ancienne. */
  readonly annotations: readonly Annotation[];
  /**
   * Entrées du journal des modifications (RG-023) concernant spécifiquement ce projet (`objet` préfixé par
   * `projet:{id}.`, décision arbitraire à valider par un humain, cf. rapport de développement de cet incrément),
   * triées de la plus récente à la plus ancienne.
   */
  readonly journal: readonly EntreeJournal[];
  /** Valeur brute de `parametres.seuils`, transmise aux déclencheurs d'explication du calcul (RG-022). */
  readonly seuilsBruts: unknown;
  /** Valeur brute de `referentiels`, transmise aux déclencheurs d'explication du calcul (RG-022). */
  readonly referentielsBruts: unknown;
}

/**
 * État global de l'écran, distinguant l'absence de fichier chargé, un projet introuvable (route invalide ou projet
 * supprimé depuis) et le cas nominal (jamais un écran vide silencieux).
 */
type EtatFicheProjet =
  | { readonly type: 'aucunFichier' }
  | { readonly type: 'projetIntrouvable' }
  | { readonly type: 'trouve'; readonly donnees: DonneesFicheProjet };

/**
 * Niveaux d'accès GitLab et leur libellé lisible (échelle standard, déjà réutilisée par `StatutMembreUtils.
 * calculerGraviteAlerteMembreInconnu`, RG-010).
 */
const LIBELLES_NIVEAU_ACCES: Readonly<Record<number, string>> = {
  10: 'Invité',
  20: 'Lecteur',
  30: 'Développeur',
  40: 'Mainteneur',
  50: 'Propriétaire',
};

/**
 * Écran Fiche projet (US-017) : en-tête, métadonnées, encart d'anomalie technique, colonnes Sonar/dépendances/MR et
 * membres/IA/annotations, actions (Comparaison, export PNG).
 */
@Component({
  selector: 'app-fiche-projet',
  imports: [
    RouterLink,
    FormsModule,
    NgTemplateOutlet,
    SqmBadgeComponent,
    SqmBoutonCopieComponent,
    SqmExplicationJugementComponent,
    SqmIconeLangageComponent,
    SqmConfirmationMotDePasseComponent,
    SqmConfirmationSuppressionComponent,
    SqmModaleSaisieMasseComponent,
  ],
  templateUrl: './fiche-projet.component.html',
  changeDetection: ChangeDetectionStrategy.OnPush,
  styleUrl: './fiche-projet.component.scss',
})
export class SqmFicheProjetComponent {
  /**
   * Seuil strict de dépendances « non référencées » au-delà duquel le lien contextuel « Créer des règles en
   * masse » est proposé (RG-040) : valeur figée en dur par décision d'arbitrage humaine du 2026-08-18 (cf. plan de
   * développement C15-07), volontairement pas un réglage applicatif.
   */
  private static readonly SEUIL_LIEN_SAISIE_MASSE_DEPENDANCES = 5;

  /**
   * Seuil strict de membres au statut `inconnu` au-delà duquel le lien contextuel « Créer des règles en masse »
   * est proposé (RG-041) : valeur figée en dur par décision d'arbitrage humaine du 2026-08-18 (cf. plan de
   * développement C15-08), volontairement pas un réglage applicatif — même décision que
   * {@link SEUIL_LIEN_SAISIE_MASSE_DEPENDANCES}.
   */
  private static readonly SEUIL_LIEN_SAISIE_MASSE_MEMBRES = 5;

  /**
   * Indice au survol du lien direct vers un dépôt GitLab (RG-045, C15-13) : ce lien repose sur un comportement de
   * redirection de l'application web GitLab à partir du seul identifiant numérique de projet, non contractualisé
   * au même titre que l'API REST v4 utilisée par ailleurs par les connecteurs (cf. `docs/03_plan/analyse_C15-13.
   * md#24-formats-durl-web-réellement-navigables-vérifiés-recherche-externe-format-non-présumé`).
   */
  private static readonly INDICE_LIEN_GITLAB_NON_CONTRACTUEL =
    "Lien déduit de l'identifiant du dépôt GitLab (redirection de l'application web GitLab) : ce mécanisme n'est pas garanti dans le temps au même titre qu'un appel d'API.";

  private readonly donneesApplication: DonneesApplicationService =
    inject(DonneesApplicationService);
  private readonly notification: NotificationService = inject(NotificationService);
  private readonly injector: Injector = inject(Injector);

  /**
   * Identifiant du projet affiché, lié au segment de route `fiche-projet/:projetId` (`withComponentInputBinding()`,
   * `app.config.ts`).
   */
  public readonly projetId: InputSignal<string> = input.required<string>();

  /**
   * Élément conteneur exporté en PNG (pattern déjà établi par `SqmSyntheseAuditsComponent`, incrément 4).
   */
  private readonly conteneurExport = viewChild<ElementRef<HTMLElement>>('conteneurExport');

  /**
   * Premier champ du formulaire de création d'annotation, résolu une fois ce champ effectivement rendu dans le DOM
   * (cf. {@link ouvrirCreationAnnotation}, C15-02).
   */
  private readonly premierChampAnnotation: Signal<ElementRef<HTMLInputElement> | undefined> =
    viewChild<ElementRef<HTMLInputElement>>('premierChampAnnotation');

  /**
   * État complet de l'écran, recalculé à chaque changement de {@link projetId} ou de la racine courante.
   */
  public readonly etat: Signal<EtatFicheProjet> = computed(() => this.calculerEtat());

  /**
   * Indique si le formulaire de création d'une annotation (US-019, portée projet) est actuellement affiché.
   */
  public readonly formulaireAnnotationVisible: WritableSignal<boolean> = signal(false);

  /**
   * Date saisie dans le formulaire de création d'annotation, initialisée à la date du jour à l'ouverture.
   */
  public dateAnnotation = '';

  /**
   * Libellé saisi dans le formulaire de création d'annotation.
   */
  public libelleAnnotation = '';

  /**
   * Catégorie saisie dans le formulaire de création d'annotation.
   */
  public categorieAnnotation = '';

  /**
   * Description optionnelle saisie dans le formulaire de création d'annotation.
   */
  public descriptionAnnotation = '';

  /**
   * Indique si la ressaisie du mot de passe (RG-002) est en cours d'affichage pour la création d'annotation.
   */
  public readonly attenteMotDePasseAnnotation: WritableSignal<boolean> = signal(false);

  /**
   * Message d'erreur de la dernière création d'annotation tentée, `null` si aucune erreur en cours.
   */
  public messageErreurAnnotation: string | null = null;

  /**
   * Indique qu'une création d'annotation est en cours, pour désactiver les actions concurrentes. Porté par un
   * signal (plutôt qu'une simple propriété) : mis à jour depuis la continuation asynchrone de
   * {@link confirmerCreationAnnotation}/{@link confirmerSuppressionAnnotationMotDePasse}, hors de toute
   * planification automatique de détection de changement en application zoneless (cf. `cheminCreation` dans
   * `demarrage.component.ts`).
   */
  public readonly enCoursAnnotation: WritableSignal<boolean> = signal(false);

  /**
   * Ouvre le formulaire de création d'une annotation de portée projet (US-019), date du jour pré-remplie.
   */
  public ouvrirCreationAnnotation(): void {
    this.dateAnnotation = new Date().toISOString().slice(0, 10);
    this.libelleAnnotation = '';
    this.categorieAnnotation = '';
    this.descriptionAnnotation = '';
    this.messageErreurAnnotation = null;
    this.formulaireAnnotationVisible.set(true);
    afterNextRender(() => this.premierChampAnnotation()?.nativeElement.focus(), {
      injector: this.injector,
    });
  }

  /**
   * Referme le formulaire de création d'annotation sans enregistrer.
   */
  public fermerCreationAnnotation(): void {
    this.formulaireAnnotationVisible.set(false);
  }

  /**
   * Valide le formulaire puis, si valide, ouvre la ressaisie du mot de passe avant la création effective (RG-002).
   */
  public demanderCreationAnnotation(): void {
    if (this.libelleAnnotation.trim().length === 0 || this.dateAnnotation.trim().length === 0) {
      this.messageErreurAnnotation = 'La date et le libellé sont obligatoires.';
      return;
    }
    this.messageErreurAnnotation = null;
    this.attenteMotDePasseAnnotation.set(true);
  }

  /**
   * Crée l'annotation après confirmation du mot de passe (US-019, RG-002).
   * @param motDePasse - Mot de passe du fichier ressaisi par l'utilisateur.
   */
  public async confirmerCreationAnnotation(motDePasse: string): Promise<void> {
    const etatCourant = this.etat();
    this.attenteMotDePasseAnnotation.set(false);
    if (etatCourant.type !== 'trouve') {
      return;
    }

    this.enCoursAnnotation.set(true);
    const resultat = await this.donneesApplication.creerAnnotation(
      etatCourant.donnees.groupeId,
      etatCourant.donnees.projetId,
      {
        date: this.dateAnnotation.trim(),
        libelle: this.libelleAnnotation.trim(),
        categorie: this.categorieAnnotation.trim(),
        description:
          this.descriptionAnnotation.trim().length > 0
            ? this.descriptionAnnotation.trim()
            : undefined,
      },
      motDePasse,
    );
    this.enCoursAnnotation.set(false);

    if (resultat.type === 'echec') {
      this.notification.erreur('Une erreur inattendue est survenue lors de la création.');
      return;
    }
    this.formulaireAnnotationVisible.set(false);
    this.notification.succes("L'annotation a été créée.");
  }

  /**
   * Annule la ressaisie du mot de passe en cours pour la création d'annotation.
   */
  public annulerMotDePasseAnnotation(): void {
    this.attenteMotDePasseAnnotation.set(false);
  }

  /**
   * Identifiant de l'annotation dont la suppression est en cours de confirmation (US-019, RG-033, Phase 10
   * incrément 8, C10-04), `null` si aucune n'est en cours.
   */
  public readonly annotationASupprimerId: WritableSignal<string | null> = signal(null);

  /**
   * Indique si la ressaisie du mot de passe (RG-002) est en cours d'affichage pour la suppression d'annotation.
   */
  public readonly attenteMotDePasseSuppressionAnnotation: WritableSignal<boolean> = signal(false);

  /**
   * Demande la confirmation de suppression d'une annotation de portée projet.
   * @param annotationId - Identifiant de l'annotation à supprimer.
   */
  public demanderSuppressionAnnotation(annotationId: string): void {
    this.annotationASupprimerId.set(annotationId);
  }

  /**
   * Confirme la suppression désignée par {@link demanderSuppressionAnnotation} : ouvre la ressaisie du mot de
   * passe avant la suppression effective (RG-002).
   */
  public confirmerSuppressionAnnotation(): void {
    this.attenteMotDePasseSuppressionAnnotation.set(true);
  }

  /**
   * Annule la suppression d'annotation demandée.
   */
  public annulerSuppressionAnnotation(): void {
    this.annotationASupprimerId.set(null);
  }

  /**
   * Supprime l'annotation après confirmation du mot de passe (US-019, RG-002, RG-033).
   * @param motDePasse - Mot de passe du fichier ressaisi par l'utilisateur.
   */
  public async confirmerSuppressionAnnotationMotDePasse(motDePasse: string): Promise<void> {
    const etatCourant = this.etat();
    const annotationId = this.annotationASupprimerId();
    this.attenteMotDePasseSuppressionAnnotation.set(false);
    if (etatCourant.type !== 'trouve' || !annotationId) {
      this.annotationASupprimerId.set(null);
      return;
    }

    this.enCoursAnnotation.set(true);
    const resultat = await this.donneesApplication.supprimerAnnotation(
      etatCourant.donnees.groupeId,
      etatCourant.donnees.projetId,
      annotationId,
      motDePasse,
    );
    this.enCoursAnnotation.set(false);
    this.annotationASupprimerId.set(null);

    if (resultat.type === 'echec') {
      this.notification.erreur('Une erreur inattendue est survenue lors de la suppression.');
    }
  }

  /**
   * Exporte la fiche courante (bandeau/encart d'anomalie technique inclus, même conteneur que le reste de l'écran)
   * en image PNG et déclenche son téléchargement.
   */
  public async exporterPng(): Promise<void> {
    const conteneur = this.conteneurExport()?.nativeElement;
    const etatCourant = this.etat();
    if (conteneur === undefined || etatCourant.type !== 'trouve') {
      return;
    }
    // US-017 (sections de membres) et US-056 (sections de dépendances par écosystème) : ces sections repliables
    // sont fermées par défaut mais doivent toujours apparaître dépliées dans l'export PNG (décision fonctionnelle
    // validée par un humain). Dépliage impératif le temps de la capture, état de repli de chaque section restauré
    // ensuite pour ne pas modifier ce que voit l'utilisateur à l'écran.
    const sectionsRepliables = [
      ...conteneur.querySelectorAll<HTMLDetailsElement>(
        '.fiche-projet__section-membres, .fiche-projet__section-dependances',
      ),
    ];
    const replisInitiaux = sectionsRepliables.map((section) => section.open);
    sectionsRepliables.forEach((section) => (section.open = true));
    try {
      const dataUrl = await toPng(conteneur);
      this.declencherTelechargementPng(dataUrl, etatCourant.donnees.nomProjet);
    } finally {
      sectionsRepliables.forEach(
        (section, index) => (section.open = replisInitiaux[index] ?? false),
      );
    }
  }

  /**
   * Déclenche le téléchargement d'une image PNG encodée en URL de données, puis confirme l'export à l'utilisateur
   * (RG-047, C15-15) : le nom de fichier suggéré est connu du code (il le construit lui-même), mais l'emplacement
   * réel d'enregistrement reste hors de portée de l'application (mécanisme d'ancre de téléchargement, cf. analyse
   * `docs/03_plan/analyse_C15-15.md#23-emplacement-de-sauvegarde`) — la formulation reste donc volontairement
   * générique sur ce point, sans chemin absolu.
   * @param dataUrl - URL de données PNG produite par `toPng`.
   * @param nomProjet - Nom du projet affiché (`DonneesFicheProjet.nomProjet`), inséré normalisé dans le nom de
   * fichier suggéré (RG-047 : sans nom de groupe, décision arbitraire).
   */
  private declencherTelechargementPng(dataUrl: string, nomProjet: string): void {
    const nomFichier = `fiche-projet-${ExportImageUtils.normaliserNomProjet(nomProjet)}-${ExportImageUtils.construireHorodatage(new Date())}.png`;
    const lien = document.createElement('a');
    lien.href = dataUrl;
    lien.download = nomFichier;
    lien.click();
    this.notification.succes(
      `L'image ${nomFichier} a été téléchargée dans le dossier de téléchargements de votre navigateur/système.`,
    );
  }

  /**
   * Calcule l'état complet de l'écran (cf. {@link EtatFicheProjet}).
   * @returns L'état calculé.
   */
  private calculerEtat(): EtatFicheProjet {
    const racine = this.donneesApplication.racine();
    if (racine === null) {
      return { type: 'aucunFichier' };
    }
    const trouve = this.trouverGroupeEtProjet(racine.groupes, this.projetId());
    if (trouve === undefined) {
      return { type: 'projetIntrouvable' };
    }
    return {
      type: 'trouve',
      donnees: this.construireDonnees(
        trouve.groupe,
        trouve.projet,
        racine.campagnes,
        racine.journal,
        racine.parametres.seuils,
        racine.referentiels,
        new Date(),
      ),
    };
  }

  /**
   * Retrouve le groupe et le projet correspondant à l'identifiant demandé, tous groupes confondus (la route ne
   * porte que `projetId`, pas `groupeId`).
   * @param groupes - Groupes actuellement chargés.
   * @param projetId - Identifiant du projet recherché.
   * @returns Le groupe et le projet trouvés, `undefined` si aucun projet ne porte cet identifiant.
   */
  private trouverGroupeEtProjet(
    groupes: readonly Groupe[],
    projetId: string,
  ): { readonly groupe: Groupe; readonly projet: Projet } | undefined {
    for (const groupe of groupes) {
      const projet = groupe.projets.find((candidat) => candidat.id === projetId);
      if (projet !== undefined) {
        return { groupe, projet };
      }
    }
    return undefined;
  }

  /**
   * Construit les données complètes de la Fiche projet pour un projet trouvé.
   * @param groupe - Groupe de rattachement du projet.
   * @param projet - Projet concerné.
   * @param campagnes - Traces d'exécution des campagnes (`DonneesRacine.campagnes`).
   * @param journal - Journal complet des modifications (`DonneesRacine.journal`, RG-023).
   * @param seuilsBruts - Valeur brute de `parametres.seuils`.
   * @param referentielsBruts - Valeur brute de `referentiels`.
   * @param maintenant - Date de référence pour les calculs d'ancienneté (permet des tests déterministes).
   * @returns Les données complètes de la Fiche projet.
   */
  private construireDonnees(
    groupe: Groupe,
    projet: Projet,
    campagnes: Parameters<typeof DerniereCampagneUtils.trouverDerniereCampagnePourProjet>[0],
    journal: readonly EntreeJournal[],
    seuilsBruts: unknown,
    referentielsBruts: unknown,
    maintenant: Date,
  ): DonneesFicheProjet {
    const derniereCampagne = DerniereCampagneUtils.trouverDerniereCampagnePourProjet(
      campagnes,
      projet.id,
    );
    const campagneEnEchec = derniereCampagne?.verdict.statut === 'echec';

    // C15-14, US-046, RG-046 : le dernier audit **régulier** est sélectionné ici, jamais simplement `.at(-1)`, pour
    // ne pas remplacer silencieusement la restitution principale par un audit historique à date passée — ce
    // dernier reste restitué séparément (cf. {@link construireAuditsHistoriques}). Filtre centralisé dans
    // `DernierAuditRegulierUtils`.
    const dernierAudit = DernierAuditRegulierUtils.dernierAuditRegulier(projet.audits);
    const themes = AgregationThemeFicheProjetUtils.regrouper(dernierAudit?.resultats ?? []);

    const seuilsFraicheurSonar = ParametresJugementUtils.lireSeuilsFraicheurSonar(seuilsBruts);
    const seuilsCouverture = ParametresJugementUtils.lireSeuilsCouverture(seuilsBruts);
    const seuilsCouleursViolations =
      ParametresJugementUtils.lireSeuilsCouleursViolations(seuilsBruts);
    const seuilsTailleDepot = ParametresJugementUtils.lireSeuilsTailleDepot(seuilsBruts);
    const seuilsMrOuvertes = ParametresJugementUtils.lireSeuilsMrOuvertes(seuilsBruts);
    const reglesDependances = ParametresJugementUtils.lireReglesDependances(referentielsBruts);

    const resultatFraicheurSonar =
      dernierAudit === undefined
        ? undefined
        : this.trouverResultat(dernierAudit.resultats, 'croise.fraicheur_sonar');
    const resultatTailleDepot =
      dernierAudit === undefined
        ? undefined
        : this.trouverResultat(dernierAudit.resultats, 'gitlab.taille_depot');
    // RG-057 : la ventilation Sonar par langage du dernier audit régulier alimente la ligne « Langages principaux ».
    // `trouverResultat` opère sur le type `Resultat` complet, dont `sonar.ncloc` fait partie (contrairement au type
    // restreint de `AgregationThemeFicheProjetUtils`).
    const resultatNcloc =
      dernierAudit === undefined
        ? undefined
        : this.trouverResultat(dernierAudit.resultats, 'sonar.ncloc');
    // `trouverTousResultats`, pas `trouverResultat` : un projet à plusieurs sources GitLab (ex. un dépôt back et un
    // dépôt front) produit un résultat `gitlab.merge_requests` par source dans `Audit.resultats` — ne retenir que le
    // premier en perdrait silencieusement les MR des sources suivantes (corrige R15-06, Phase 15, recette du
    // 2026-08-16, aux côtés de `AgregationThemeFicheProjetUtils.regrouper` pour les dépendances/membres/marqueurs).
    // Les MR de deux dépôts distincts ne pouvant se recouvrir (chaque `webUrl` reste unique), une simple
    // concaténation suffit ici, sans fusion par clé métier comme pour les dépendances/membres.
    const mrOuvertesToutesSources = (dernierAudit === undefined ? [] : dernierAudit.resultats)
      .filter(
        (resultat): resultat is Extract<Resultat, { type: 'gitlab.merge_requests' }> =>
          resultat.type === 'gitlab.merge_requests',
      )
      .flatMap((resultat) => resultat.mrOuvertes);

    const sonarKo = !themes.pasDeSonar
      ? this.calculerSonarKo(resultatFraicheurSonar, seuilsFraicheurSonar)
      : false;

    // Tri alphabétique (R15-03, Phase 15, recette du 2026-08-16) : sur le nom affiché, jamais sur le nom
    // d'utilisateur technique, cohérent avec le libellé effectivement lu par l'utilisateur.
    const membres = themes.membres
      .map((membre) => this.construireLigneMembre(membre, groupe.membresConnus))
      .sort((a, b) => a.nom.localeCompare(b.nom));
    const sectionsMembres = this.construireSectionsMembres(membres);

    const lignesDependances = themes.dependances.map((dependance) =>
      this.construireLigneDependance(dependance, reglesDependances),
    );

    const refAuditeeSource = projet.sources.find(
      (source) => source.type === TypeSource.DepotGitlab,
    );

    return {
      groupeId: groupe.id,
      nomGroupe: groupe.nom,
      projetId: projet.id,
      nomProjet: projet.nom,
      description: projet.description,
      refAuditeeLabel: refAuditeeSource?.refAuditee ?? 'branche par défaut du dépôt',
      sourcesExternes: this.construireSourcesExternes(projet.sources, groupe.instances),
      statutIa: this.construireEtiquetteStatutIa(projet.iaAutorisee, themes.marqueursIa),
      sonarKo,
      membreInconnuDetecte: membres.some((membre) => membre.inconnu),
      ageChezNousLabel: this.construireAgeChezNousLabel(projet.premierCommitInterne, maintenant),
      dernierAuditLabel:
        dernierAudit === undefined ? 'jamais audité' : this.formaterDateCourte(dernierAudit.date),
      auditsHistoriques: this.construireAuditsHistoriques(projet.audits),
      derniereCampagneLabel:
        derniereCampagne === undefined
          ? 'aucune campagne'
          : `${this.formaterDateCourte(derniereCampagne.campagne.date)} (${derniereCampagne.verdict.statut})`,
      campagneEnEchec,
      tailleLabel: this.construireTailleLabel(resultatTailleDepot, seuilsTailleDepot),
      anomalieTechnique: campagneEnEchec
        ? this.construireAnomalieTechnique(derniereCampagne, projet, groupe)
        : undefined,
      pasDeSonar: themes.pasDeSonar,
      legendeSonarKo: sonarKo
        ? this.construireLegendeSonarKo(resultatFraicheurSonar, seuilsFraicheurSonar)
        : undefined,
      couverture: themes.pasDeSonar
        ? undefined
        : this.construireEtiquetteCouverture(
            themes.sonar?.couverture?.couverture,
            seuilsCouverture,
          ),
      notes:
        themes.pasDeSonar || themes.sonar?.notes === undefined
          ? []
          : this.construireNotes(themes.sonar.notes),
      violationBloquant:
        themes.pasDeSonar || themes.sonar?.violations === undefined
          ? undefined
          : this.construireEtiquetteViolation(
              themes.sonar.violations.parSeverite.bloquant,
              seuilsCouleursViolations,
              'bloquant',
            ),
      violationCritique:
        themes.pasDeSonar || themes.sonar?.violations === undefined
          ? undefined
          : this.construireEtiquetteViolation(
              themes.sonar.violations.parSeverite.critique,
              seuilsCouleursViolations,
              'critique',
            ),
      dependancesDisponibles: themes.dependancesDisponibles,
      dependances: lignesDependances,
      sectionsDependances: this.construireSectionsDependances(lignesDependances),
      langagesPrincipaux: LangagesPrincipauxUtils.selectionner(resultatNcloc?.parLangage ?? {}),
      mrResume: this.construireResumeMr(mrOuvertesToutesSources, seuilsMrOuvertes, maintenant),
      mrOuvertes: mrOuvertesToutesSources.map((mr) => this.construireLigneMr(mr, maintenant)),
      membres,
      sectionsMembres,
      marqueursIa: themes.marqueursIa,
      annotations: [...projet.annotations].sort((a, b) => (a.date < b.date ? 1 : -1)),
      journal: this.filtrerJournalProjet(journal, projet.id),
      seuilsBruts,
      referentielsBruts,
    };
  }

  /**
   * Construit les liens directs vers les instances GitLab/Sonar réellement interrogées par les sources du projet
   * (US-008, RG-045, C15-13), à partir des seuls champs déjà chargés en mémoire (`Instance.urlBase`,
   * `Source.idExterne`), sans aucun appel réseau ni nouvelle commande de la Façade. Une source dont l'instance de
   * rattachement est introuvable (donnée mal formée) est silencieusement ignorée plutôt que de produire un lien
   * cassé.
   * @param sources - Sources rattachées au projet (`Projet.sources`).
   * @param instances - Instances déclarées par le groupe de rattachement (`Groupe.instances`).
   * @returns Les liens directs construits, dans l'ordre des sources.
   */
  private construireSourcesExternes(
    sources: readonly Source[],
    instances: readonly Instance[],
  ): readonly LigneSourceExterne[] {
    return sources.flatMap((source): readonly LigneSourceExterne[] => {
      const instance = instances.find((candidate) => candidate.id === source.instanceId);
      if (instance === undefined) {
        return [];
      }
      if (source.type === TypeSource.DepotGitlab) {
        const ligne: LigneSourceExterne = {
          label: 'Dépôt GitLab',
          url: LienExterneSourceUtils.construireLienGitlab(instance.urlBase, source.idExterne),
          avertissementNonContractuel: SqmFicheProjetComponent.INDICE_LIEN_GITLAB_NON_CONTRACTUEL,
        };
        return [ligne];
      }
      const ligne: LigneSourceExterne = {
        label: 'Projet Sonar',
        url: LienExterneSourceUtils.construireLienSonar(instance.urlBase, source.idExterne),
        avertissementNonContractuel: undefined,
      };
      return [ligne];
    });
  }

  /**
   * Retrouve, dans une liste de résultats typés, l'unique résultat portant le discriminant `type` demandé (sur le
   * modèle de `SqmSyntheseAuditsComponent.trouverResultat`) : nécessaire ici pour les trois variantes non couvertes
   * par `AgregationThemeFicheProjetUtils` (MR ouvertes, taille du dépôt, fraîcheur Sonar croisée), qui incluent la
   * variante `croise.fraicheur_sonar` propre à `services/avecetat/` (non importable depuis `services/sansetat/`).
   * @param resultats - Résultats du dernier audit intégré.
   * @param type - Discriminant `type` recherché.
   * @returns Le résultat trouvé, `undefined` si absent de cet audit.
   */
  private trouverResultat<TType extends Resultat['type']>(
    resultats: readonly Resultat[],
    type: TType,
  ): Extract<Resultat, { type: TType }> | undefined {
    return resultats.find(
      (resultat): resultat is Extract<Resultat, { type: TType }> => resultat.type === type,
    );
  }

  /**
   * Calcule le nombre de jours pleins écoulés depuis une date ISO 8601, jamais négatif.
   * @param dateIso - Date ISO 8601 de référence.
   * @param maintenant - Date courante.
   * @returns Le nombre de jours écoulés.
   */
  private joursDepuis(dateIso: string, maintenant: Date): number {
    const diffMs = maintenant.getTime() - new Date(dateIso).getTime();
    return Math.max(0, Math.floor(diffMs / MILLISECONDES_PAR_JOUR));
  }

  /**
   * Met en forme une date ISO 8601 en libellé court `AAAA-MM-JJ` (sur le modèle de `SqmSyntheseAuditsComponent.
   * formaterDate`, cohérence visuelle entre écrans).
   * @param dateIso - Date ISO 8601 à mettre en forme.
   * @returns Le libellé court correspondant.
   */
  private formaterDateCourte(dateIso: string): string {
    const date = new Date(dateIso);
    const deuxChiffres = (valeur: number): string => valeur.toString().padStart(2, '0');
    return `${date.getFullYear()}-${deuxChiffres(date.getMonth() + 1)}-${deuxChiffres(date.getDate())}`;
  }

  /**
   * Construit l'encart des audits historiques à date passée du projet (C15-14, US-046, RG-046), triés du plus
   * récent au plus ancien (date ciblée), sur le même principe de tri que {@link Annotation} ({@link
   * construireDonnees}).
   * @param audits - Historique complet des audits du projet (`Projet.audits`).
   * @returns Les lignes d'affichage des audits historiques, tableau vide si aucun.
   */
  private construireAuditsHistoriques(audits: readonly Audit[]): readonly LigneAuditHistorique[] {
    return audits
      .filter((audit) => audit.typeAudit === 'historique')
      .sort((a, b) => (a.date < b.date ? 1 : -1))
      .map((audit) => ({
        id: audit.id,
        dateCibleeLabel: this.formaterDateCourte(audit.date),
        // `dateExecution` est toujours renseignée pour un audit historique (cf. commentaire de `Audit.
        // dateExecution` dans `types-donnees.ts`) ; le libellé de repli ne couvre qu'une donnée malformée d'un
        // fichier externe (RG-021), jamais un cas nominal.
        dateExecutionLabel:
          audit.dateExecution === undefined ? '—' : this.formaterDateCourte(audit.dateExecution),
      }));
  }

  /**
   * Construit le libellé de l'âge du projet chez nous (`Projet.premierCommitInterne`).
   * @param premierCommitInterne - Date du premier commit interne, absente si non encore calculée.
   * @param maintenant - Date de référence pour le calcul d'ancienneté.
   * @returns Le libellé calculé, libellé de repli explicite si non calculable.
   */
  private construireAgeChezNousLabel(
    premierCommitInterne: Projet['premierCommitInterne'],
    maintenant: Date,
  ): string {
    if (premierCommitInterne === undefined) {
      return 'non déterminé';
    }
    const jours = this.joursDepuis(premierCommitInterne.date, maintenant);
    const annees = Math.floor(jours / 365);
    const ancienneteLabel = annees > 0 ? `${annees} an${annees > 1 ? 's' : ''}` : `${jours} j`;
    return `${ancienneteLabel} (depuis ${this.formaterDateCourte(premierCommitInterne.date)})`;
  }

  /**
   * Construit le libellé de taille et de classe de taille du dépôt.
   * @param resultat - Constat brut `gitlab.taille_depot`, absent si non calculable.
   * @param seuils - Bornes de classe de taille courantes.
   * @returns Le libellé calculé, `—` si non calculable.
   */
  private construireTailleLabel(
    resultat: { readonly tailleOctets: number } | undefined,
    seuils: LectureDefensive<SeuilsTailleDepot>,
  ): string {
    if (resultat === undefined || seuils.type === 'absent') {
      return '—';
    }
    const classe = ClasseTailleUtils.calculerClasseTaille(resultat.tailleOctets, seuils.valeur);
    const megaOctets = (resultat.tailleOctets / 1_000_000).toFixed(1);
    return `${classe} (${megaOctets} Mo)`;
  }

  /**
   * Calcule le déclenchement du badge SONAR_KO (RG-013) à partir du constat croisé de fraîcheur Sonar.
   * @param resultat - Constat brut `croise.fraicheur_sonar`, absent si non produit par ce dernier audit.
   * @param seuils - Tolérance de fraîcheur Sonar courante.
   * @returns `true` si le badge SONAR_KO est déclenché.
   */
  private calculerSonarKo(
    resultat: ResultatCroiseFraicheurSonar | undefined,
    seuils: LectureDefensive<SeuilsFraicheurSonar>,
  ): boolean {
    if (resultat?.dernierCommitLe === undefined || seuils.type === 'absent') {
      return false;
    }
    const derniereAnalyseLe = resultat.aucuneAnalyse ? null : (resultat.derniereAnalyseLe ?? null);
    return BadgeSonarKoUtils.calculerBadgeSonarKo(
      resultat.dernierCommitLe,
      derniereAnalyseLe,
      seuils.valeur,
    ).declenche;
  }

  /**
   * Construit la légende explicative du grisage Sonar (RG-013, état particulier « SONAR_KO actif »,
   * `docs/02_documentation/09_maquettes.md#états-particuliers`) : jamais un grisage silencieux.
   * @param resultat - Constat brut `croise.fraicheur_sonar`, absent si non produit par ce dernier audit.
   * @param seuils - Tolérance de fraîcheur Sonar courante.
   * @returns Le texte de légende à afficher.
   */
  private construireLegendeSonarKo(
    resultat: ResultatCroiseFraicheurSonar | undefined,
    seuils: LectureDefensive<SeuilsFraicheurSonar>,
  ): string {
    if (
      resultat === undefined ||
      resultat.aucuneAnalyse ||
      resultat.derniereAnalyseLe === undefined
    ) {
      return "Indicateurs Sonar grisés : ce projet n'a jamais été analysé par Sonar, ces indicateurs ne reflètent donc aucun état réel.";
    }
    if (resultat.dernierCommitLe === undefined) {
      return 'Indicateurs Sonar grisés : écart de fraîcheur constaté avec le dernier commit.';
    }
    const ecartJours = Math.round(
      Math.abs(
        new Date(resultat.dernierCommitLe).getTime() -
          new Date(resultat.derniereAnalyseLe).getTime(),
      ) / MILLISECONDES_PAR_JOUR,
    );
    const toleranceLabel =
      seuils.type === 'valeur' ? `${seuils.valeur.toleranceJours} j` : 'la tolérance paramétrée';
    return `Indicateurs Sonar grisés : dernière analyse Sonar il y a ${ecartJours} j, au-delà de ${toleranceLabel} — ils peuvent ne plus refléter l'état réel du code.`;
  }

  /**
   * Construit l'étiquette de couverture de tests.
   * @param couverture - Pourcentage de couverture constaté, absent si non calculable.
   * @param seuils - Seuils de couverture courants.
   * @returns L'étiquette calculée, absente si {@link couverture} est absent.
   */
  private construireEtiquetteCouverture(
    couverture: number | undefined,
    seuils: LectureDefensive<SeuilsCouverture>,
  ): EtiquetteCouleur | undefined {
    if (couverture === undefined) {
      return undefined;
    }
    const label = `${couverture.toFixed(1)} %`;
    if (seuils.type === 'absent') {
      return { label };
    }
    return {
      label,
      couleur: SeuilsCouleurUtils.calculerCouleurCouverture(
        couverture,
        seuils.valeur.seuilRouge,
        seuils.valeur.seuilOrange,
      ),
    };
  }

  /**
   * Calcule les quatre notes A–E Sonar (fiabilité, sécurité, maintenabilité, revue sécurité).
   * @param resultat - Constat brut `sonar.notes`.
   * @param resultat.fiabilite - Note de fiabilité (1.0–5.0).
   * @param resultat.securite - Note de sécurité (1.0–5.0).
   * @param resultat.maintenabilite - Note de maintenabilité (1.0–5.0).
   * @param resultat.revueSecurite - Note de revue de sécurité (1.0–5.0).
   * @returns Les quatre notes calculées, dans l'ordre fiabilité/sécurité/maintenabilité/revue sécurité.
   */
  private construireNotes(resultat: {
    readonly fiabilite: number;
    readonly securite: number;
    readonly maintenabilite: number;
    readonly revueSecurite: number;
  }): readonly ResultatNoteSonar[] {
    return [
      resultat.fiabilite,
      resultat.securite,
      resultat.maintenabilite,
      resultat.revueSecurite,
    ].map((valeur): ResultatNoteSonar => NoteSonarUtils.calculerNoteLettre(valeur));
  }

  /**
   * Construit l'étiquette d'un décompte de violations d'une sévérité donnée.
   * @param nombre - Nombre de violations constaté.
   * @param seuils - Seuils de couleur des violations bloquantes/critiques courants.
   * @param severite - Sévérité concernée.
   * @returns L'étiquette calculée.
   */
  private construireEtiquetteViolation(
    nombre: number,
    seuils: LectureDefensive<SeuilsCouleursViolations>,
    severite: 'bloquant' | 'critique',
  ): EtiquetteCouleur {
    if (seuils.type === 'absent') {
      return { label: String(nombre) };
    }
    const seuilsSeverite = seuils.valeur[severite];
    return {
      label: String(nombre),
      couleur: SeuilsCouleurUtils.calculerCouleurViolations(
        nombre,
        seuilsSeverite.seuilOrange,
        seuilsSeverite.seuilRouge,
      ),
    };
  }

  /**
   * Construit le libellé et la couleur du statut d'obsolescence d'une dépendance (RG-011 : jamais stocké, toujours
   * recalculé à l'affichage). Décision arbitraire (à valider par un humain, cf. rapport de développement de cet
   * incrément) : convention de couleur reprise des trois valeurs illustrées par `docs/01_besoin/exemple-donnees.
   * json` (`obsolete`, `maintenu`, `aJourM1`/`aJourM3`) — `referentiels.reglesDependances[].versions[].statut`
   * restant un texte libre non énuméré par le modèle de données (RG-022), toute autre valeur est affichée telle
   * quelle sans couleur plutôt que de risquer un jugement erroné sur une convention inconnue.
   * @param dependance - Dépendance constatée.
   * @param regles - Règles de dépendances courantes (`referentiels.reglesDependances`).
   * @returns Les données de la ligne d'affichage.
   */
  private construireLigneDependance(
    dependance: Dependance,
    regles: LectureDefensive<
      Parameters<typeof StatutObsolescenceUtils.calculerStatutObsolescence>[1]
    >,
  ): LigneDependance {
    const resultat: ResultatObsolescence =
      regles.type === 'absent'
        ? { type: 'nonReference' }
        : StatutObsolescenceUtils.calculerStatutObsolescence(dependance, regles.valeur);
    return {
      reference: dependance.reference,
      version: dependance.version,
      manifeste: dependance.manifeste,
      statut: this.libelleEtCouleurObsolescence(resultat),
      nonReference: resultat.type === 'nonReference',
    };
  }

  /**
   * Traduit un statut d'obsolescence calculé en étiquette affichable (cf. {@link construireLigneDependance}).
   * @param resultat - Statut d'obsolescence calculé.
   * @returns L'étiquette à afficher.
   */
  private libelleEtCouleurObsolescence(resultat: ResultatObsolescence): EtiquetteCouleur {
    if (resultat.type === 'nonReference') {
      return { label: 'non référencé' };
    }
    switch (resultat.statut) {
      case 'obsolete':
        return { label: 'obsolète', couleur: 'rouge' };
      case 'maintenu':
        return { label: 'maintenu', couleur: 'vert' };
      case 'aJourM1':
        return { label: 'à jour (M1)', couleur: 'vert' };
      case 'aJourM3':
        return { label: 'à jour (M3)', couleur: 'vert' };
      default:
        return { label: resultat.statut };
    }
  }

  /**
   * Ordre d'affichage des statuts d'obsolescence dans le décompte de barre de titre des sections de dépendances
   * (US-056), sur le modèle de {@link ORDRE_STATUTS_DECOMPTE} pour les membres. Les libellés reprennent ceux
   * produits par {@link libelleEtCouleurObsolescence} ; un libellé hors liste (statut libre, RG-022) est trié en
   * fin.
   */
  private static readonly ORDRE_STATUTS_DEPENDANCE_DECOMPTE: readonly string[] = [
    'obsolète',
    'maintenu',
    'à jour (M1)',
    'à jour (M3)',
    'non référencé',
  ];

  /**
   * Ventile une liste plate de dépendances en sections repliables par écosystème (US-056, RG-056), dans l'ordre
   * `EcosystemeDependanceUtils.ORDRE` (Maven, NPM, Autres). Seules les sections non vides sont produites ; l'ordre
   * des dépendances au sein d'une section (ordre de parsing des manifestes) est conservé.
   * @param lignes - Dépendances déjà mappées en lignes d'affichage.
   * @returns Les sections non vides, dans l'ordre d'affichage.
   */
  private construireSectionsDependances(
    lignes: readonly LigneDependance[],
  ): readonly SectionDependances[] {
    const sections: SectionDependances[] = [];
    for (const ecosysteme of EcosystemeDependanceUtils.ORDRE) {
      const dependances = lignes.filter(
        (ligne) => EcosystemeDependanceUtils.classifier(ligne) === ecosysteme,
      );
      if (dependances.length === 0) {
        continue;
      }
      sections.push({
        ecosysteme,
        titre: EcosystemeDependanceUtils.titre(ecosysteme),
        dependances,
        total: dependances.length,
        decompteParStatut: this.construireDecompteStatutDependances(dependances),
      });
    }
    return sections;
  }

  /**
   * Construit le décompte des dépendances d'une section par statut d'obsolescence (US-056), pour affichage dans la
   * barre de titre de la section repliable. Les statuts sans aucune occurrence ne produisent aucune entrée ; les
   * entrées sont ordonnées selon {@link ORDRE_STATUTS_DEPENDANCE_DECOMPTE}. Corps calqué sur
   * {@link construireDecompteStatutMembres}.
   * @param lignes - Dépendances de la section.
   * @returns Le décompte par statut, statuts à zéro omis.
   */
  private construireDecompteStatutDependances(
    lignes: readonly LigneDependance[],
  ): readonly DecompteStatutDependances[] {
    const parLabel = new Map<string, DecompteStatutDependances>();
    for (const ligne of lignes) {
      const existant = parLabel.get(ligne.statut.label);
      if (existant === undefined) {
        parLabel.set(ligne.statut.label, {
          label: ligne.statut.label,
          couleur: ligne.statut.couleur,
          nombre: 1,
        });
      } else {
        parLabel.set(ligne.statut.label, { ...existant, nombre: existant.nombre + 1 });
      }
    }
    return [...parLabel.values()].sort(
      (a, b) =>
        SqmFicheProjetComponent.rangStatutDependanceDecompte(a.label) -
        SqmFicheProjetComponent.rangStatutDependanceDecompte(b.label),
    );
  }

  /**
   * Rang d'un libellé de statut d'obsolescence dans {@link ORDRE_STATUTS_DEPENDANCE_DECOMPTE} ; un libellé absent
   * de la liste (statut libre, RG-022) est trié en fin plutôt que de faire échouer le tri.
   * @param label - Libellé de statut à classer.
   * @returns Le rang de tri.
   */
  private static rangStatutDependanceDecompte(label: string): number {
    const rang = SqmFicheProjetComponent.ORDRE_STATUTS_DEPENDANCE_DECOMPTE.indexOf(label);
    return rang === -1 ? SqmFicheProjetComponent.ORDRE_STATUTS_DEPENDANCE_DECOMPTE.length : rang;
  }

  /**
   * Construit l'étiquette résumée des demandes de fusion ouvertes (nombre, conflits), sur le modèle de
   * `SqmSyntheseAuditsComponent.calculerEtiquetteMr`.
   * @param mrOuvertes - Demandes de fusion ouvertes constatées.
   * @param seuils - Seuils des demandes de fusion ouvertes courants.
   * @param maintenant - Date de référence pour le calcul d'ancienneté.
   * @returns L'étiquette calculée, `undefined` si aucune MR ouverte n'est constatée.
   */
  private construireResumeMr(
    mrOuvertes: readonly MergeRequestOuverte[],
    seuils: LectureDefensive<SeuilsMrOuvertes>,
    maintenant: Date,
  ): EtiquetteCouleur | undefined {
    if (mrOuvertes.length === 0) {
      return undefined;
    }
    const nombreConflits = mrOuvertes.filter((mr) => mr.enConflit).length;
    const label =
      nombreConflits > 0
        ? `${mrOuvertes.length} · ${nombreConflits} conflit${nombreConflits > 1 ? 's' : ''}`
        : `${mrOuvertes.length} · ok`;
    if (seuils.type === 'absent') {
      return { label };
    }
    const ageMaxJours = Math.max(
      ...mrOuvertes.map((mr) => this.joursDepuis(mr.creeLe, maintenant)),
    );
    const pourcentageConflit = (nombreConflits / mrOuvertes.length) * 100;
    const couleurAge = SeuilsCouleurUtils.calculerCouleurAgeMrOuverte(
      ageMaxJours,
      seuils.valeur.ageOrangeJours,
      seuils.valeur.ageRougeJours,
    );
    const couleurConflit = SeuilsCouleurUtils.calculerCouleurConflitMrOuvertes(
      pourcentageConflit,
      seuils.valeur.pourcentageConflitRouge,
    );
    // `bleu` n'appartient pas à ce dégradé de gravité (statut IA dédié, R10-03) et n'est jamais produit par
    // `calculerCouleurAgeMrOuverte`/`calculerCouleurConflitMrOuvertes` ; requis seulement par l'exhaustivité de
    // `Couleur`.
    const couleurs: Readonly<Record<Couleur, number>> = { vert: 0, orange: 1, rouge: 2, bleu: -1 };
    const couleur = couleurs[couleurAge] >= couleurs[couleurConflit] ? couleurAge : couleurConflit;
    return { label, couleur };
  }

  /**
   * Construit la ligne d'affichage d'une demande de fusion ouverte.
   * @param mr - Demande de fusion ouverte constatée.
   * @param maintenant - Date de référence pour le calcul d'ancienneté.
   * @returns La ligne d'affichage construite.
   */
  private construireLigneMr(mr: MergeRequestOuverte, maintenant: Date): LigneMr {
    return {
      iid: mr.iid,
      titre: mr.titre,
      ageLabel: `${this.joursDepuis(mr.creeLe, maintenant)} j`,
      enConflit: mr.enConflit,
      webUrl: mr.webUrl,
    };
  }

  /**
   * Construit la ligne d'affichage d'un membre du dépôt, avec son statut de rattachement résolu (RG-006 à RG-010).
   * @param membre - Membre du dépôt constaté.
   * @param membresConnus - Règles de membres connus du groupe de rattachement.
   * @returns La ligne d'affichage construite.
   */
  private construireLigneMembre(
    membre: MembreGitlab,
    membresConnus: Groupe['membresConnus'],
  ): LigneMembre {
    const resolution = StatutMembreUtils.calculerStatutMembre(
      { username: membre.username, email: membre.emailPublic },
      membresConnus,
    );
    const inconnu = resolution.type === 'inconnu' || resolution.type === 'conflit';
    return {
      username: membre.username,
      nom: membre.nom,
      niveauAccesLabel: LIBELLES_NIVEAU_ACCES[membre.niveauAcces] ?? `niveau ${membre.niveauAcces}`,
      statut: this.libelleEtCouleurStatutMembre(resolution),
      inconnu,
      graviteAlerte: inconnu
        ? StatutMembreUtils.calculerGraviteAlerteMembreInconnu(membre.niveauAcces)
        : undefined,
      critereParDefautQualification:
        resolution.type === 'inconnu'
          ? this.calculerCritereParDefautQualification(membre)
          : undefined,
      direct: membre.direct,
      groupesInvites: membre.groupesInvites,
    };
  }

  /**
   * Ventile les membres du dépôt (liste à plat déjà triée par nom, US-017) en trois sections repliables : membres
   * nominatifs directs, membres des groupes invités au projet (regroupés par groupe, du chemin le plus précis vers
   * la racine), membres hérités de l'arborescence (ni directs, ni rattachés à un groupe invité résolu). Un même
   * membre peut relever de plusieurs sections (ex. direct **et** membre d'un groupe invité) : il est alors compté et
   * affiché dans chacune.
   * @param membres - Lignes d'affichage des membres du dépôt, dédoublonnées par nom d'utilisateur et triées par nom.
   * @returns La ventilation en trois sections.
   */
  private construireSectionsMembres(membres: readonly LigneMembre[]): SectionsMembres {
    const directs = membres.filter((membre) => membre.direct);

    const cheminsGroupes = [...new Set(membres.flatMap((membre) => membre.groupesInvites))].sort(
      (a, b) => SqmFicheProjetComponent.comparerCheminsGroupes(a, b),
    );
    const groupes: readonly GroupeInviteMembres[] = cheminsGroupes.map((chemin) => ({
      cheminGroupe: chemin,
      membres: membres.filter((membre) => membre.groupesInvites.includes(chemin)),
    }));
    const membresInvitesDistincts = membres.filter((membre) => membre.groupesInvites.length > 0);

    const herites = membres.filter(
      (membre) => !membre.direct && membre.groupesInvites.length === 0,
    );

    return {
      directs: {
        membres: directs,
        total: directs.length,
        decompteParStatut: this.construireDecompteStatutMembres(directs),
      },
      groupesInvites: {
        groupes,
        total: membresInvitesDistincts.length,
        decompteParStatut: this.construireDecompteStatutMembres(membresInvitesDistincts),
      },
      herites: {
        membres: herites,
        total: herites.length,
        decompteParStatut: this.construireDecompteStatutMembres(herites),
      },
    };
  }

  /**
   * Ordre d'affichage canonique des statuts de rattachement dans les décomptes de barre de titre (US-017), aligné
   * sur l'ordre de résolution des règles de membres connus (RG-006 à RG-009) : internes d'abord, cas d'alerte
   * (`inconnu`, `conflit de règles`) en fin.
   */
  private static readonly ORDRE_STATUTS_DECOMPTE: readonly string[] = [
    'interne',
    'client',
    'partenaire',
    'inconnu',
    'conflit de règles',
  ];

  /**
   * Construit le décompte des membres d'une section par statut de rattachement (US-017), pour affichage dans la
   * barre de titre de la section repliable. Les statuts sans aucun membre ne produisent aucune entrée ; les entrées
   * sont ordonnées selon {@link ORDRE_STATUTS_DECOMPTE}.
   * @param membres - Membres de la section.
   * @returns Le décompte par statut, statuts à zéro omis.
   */
  private construireDecompteStatutMembres(
    membres: readonly LigneMembre[],
  ): readonly DecompteStatutMembres[] {
    const parLabel = new Map<string, DecompteStatutMembres>();
    for (const membre of membres) {
      const existant = parLabel.get(membre.statut.label);
      if (existant === undefined) {
        parLabel.set(membre.statut.label, {
          label: membre.statut.label,
          couleur: membre.statut.couleur,
          nombre: 1,
        });
      } else {
        parLabel.set(membre.statut.label, { ...existant, nombre: existant.nombre + 1 });
      }
    }
    return [...parLabel.values()].sort(
      (a, b) =>
        SqmFicheProjetComponent.rangStatutDecompte(a.label) -
        SqmFicheProjetComponent.rangStatutDecompte(b.label),
    );
  }

  /**
   * Rang d'un libellé de statut dans {@link ORDRE_STATUTS_DECOMPTE} ; un libellé absent de la liste (jamais attendu)
   * est trié en fin plutôt que de faire échouer le tri.
   * @param label - Libellé de statut à classer.
   * @returns Le rang de tri.
   */
  private static rangStatutDecompte(label: string): number {
    const rang = SqmFicheProjetComponent.ORDRE_STATUTS_DECOMPTE.indexOf(label);
    return rang === -1 ? SqmFicheProjetComponent.ORDRE_STATUTS_DECOMPTE.length : rang;
  }

  /**
   * Compare deux chemins complets de groupe invité pour un tri du plus précis (le plus de segments) vers la racine,
   * avec départage alphabétique à profondeur égale (US-017).
   * @param a - Premier chemin complet.
   * @param b - Second chemin complet.
   * @returns Un ordre négatif, nul ou positif au sens de `Array.prototype.sort`.
   */
  private static comparerCheminsGroupes(a: string, b: string): number {
    const profondeur = b.split('/').length - a.split('/').length;
    return profondeur !== 0 ? profondeur : a.localeCompare(b);
  }

  /**
   * Calcule le critère par défaut à proposer pour qualifier un membre inconnu (lien « Qualifier ce membre ») :
   * domaine de son email public s'il en dispose (partie suivant le premier `@`), sinon son username.
   * @param membre - Membre du dépôt constaté.
   * @returns Le critère par défaut et son type.
   */
  private calculerCritereParDefautQualification(membre: MembreGitlab): {
    type: TypeCritereMembre;
    valeur: string;
  } {
    const email = membre.emailPublic;
    const indexArobase = email ? email.indexOf('@') : -1;
    if (email !== undefined && indexArobase >= 0) {
      return { type: TypeCritereMembre.DomaineEmail, valeur: email.slice(indexArobase + 1) };
    }
    return { type: TypeCritereMembre.Username, valeur: membre.username };
  }

  /**
   * Construit les paramètres de requête du lien « Qualifier ce membre », qui ouvre l'écran Administration
   * directement sur le sous-onglet Membres connus du groupe de rattachement, avec le formulaire de création
   * pré-rempli si {@link LigneMembre.critereParDefautQualification} est présent (membre `inconnu`) ou avec la
   * seule liste des règles existantes sinon (membre en `conflit`, cf. commentaire de ce champ).
   * @param groupeId - Identifiant du groupe de rattachement du projet affiché.
   * @param membre - Ligne d'affichage du membre concerné.
   * @returns Les paramètres de requête à transmettre à `routerLink`.
   */
  public queryParamsQualification(groupeId: string, membre: LigneMembre): Params {
    if (membre.critereParDefautQualification === undefined) {
      return { groupeId };
    }
    return {
      groupeId,
      typeCritere: membre.critereParDefautQualification.type,
      critere: membre.critereParDefautQualification.valeur,
    };
  }

  /**
   * Construit les paramètres de requête du lien « Créer une règle », affiché pour chaque dépendance « non
   * référencée » (cf. {@link LigneDependance.nonReference}), qui ouvre l'écran Paramétrage directement sur le
   * formulaire de création d'une règle du référentiel des dépendances, pré-rempli avec le motif (référence exacte
   * de la dépendance) et la version constatée, sur le même patron que {@link queryParamsQualification}.
   * @param dependance - Ligne d'affichage de la dépendance non référencée concernée.
   * @returns Les paramètres de requête à transmettre à `routerLink`.
   */
  public queryParamsReferentielDependance(dependance: LigneDependance): Params {
    return { motifDependance: dependance.reference, versionDependance: dependance.version };
  }

  // --- Saisie en masse de règles de dépendances (US-043, RG-040, C15-07) ---

  /**
   * Compte les dépendances du projet actuellement affiché au statut « non référencé » (cf.
   * {@link LigneDependance.nonReference}), sans dédoublonnage : chaque ligne du tableau des dépendances compte
   * pour une unité, y compris deux occurrences de la même référence issues de deux manifestes distincts.
   * Décision arbitraire assumée, relevée en relecture isolée du 2026-08-18 et confirmée par un humain plutôt que
   * corrigée : ce compte brut peut donc dépasser le seuil de déclenchement du lien « Créer des règles en masse »
   * alors que le pré-remplissage de la modale ({@link texteInitialSaisieMasseDependances}) affiche moins de lignes,
   * celui-ci dédoublonnant par couple (référence, version). Comportement jugé acceptable : aucune perte de donnée,
   * cas limite rare, RG-040 ne précisant pas explicitement le mode de comptage attendu.
   * @param dependances - Lignes d'affichage des dépendances du projet.
   * @returns Le nombre de dépendances non référencées.
   */
  public nombreDependancesNonReferencees(dependances: readonly LigneDependance[]): number {
    return dependances.filter((dependance) => dependance.nonReference).length;
  }

  /**
   * Construit l'infobulle de la ligne « Langages principaux » (US-057) : chaque langage et sa part en pourcentage.
   * @param langages - Langages principaux du projet, déjà sélectionnés par `LangagesPrincipauxUtils`.
   * @returns Le résumé « clé (N %), clé (N %) », ou une chaîne vide si la liste est vide.
   */
  public resumeLangages(langages: readonly LangagePrincipal[]): string {
    return langages.map((langage) => `${langage.cleSonar} (${langage.pourcentage} %)`).join(', ');
  }

  /**
   * Indique si le lien contextuel « Créer des règles en masse » doit être affiché (RG-040 : dès plus de cinq
   * dépendances « non référencé »).
   * @param dependances - Lignes d'affichage des dépendances du projet.
   * @returns `true` si le lien doit être affiché.
   */
  public afficherLienSaisieMasseDependances(dependances: readonly LigneDependance[]): boolean {
    return (
      this.nombreDependancesNonReferencees(dependances) >
      SqmFicheProjetComponent.SEUIL_LIEN_SAISIE_MASSE_DEPENDANCES
    );
  }

  /**
   * Visibilité de la modale de saisie en masse de règles de dépendances.
   */
  public readonly modaleSaisieMasseDependancesVisible: WritableSignal<boolean> = signal(false);

  /**
   * Exemple de prompt IA proposé à la copie par le bouton d'aide de la modale de saisie en masse de règles de
   * dépendances (US-043), décrivant la grammaire réellement acceptée par {@link SaisieMasseDependancesUtils}. Simple
   * réexposition de la constante du module de jugement pour la liaison de gabarit.
   */
  public readonly exemplePromptSaisieMasseDependances: string =
    SaisieMasseDependancesUtils.EXEMPLE_PROMPT_IA;

  /**
   * Ouvre la modale de saisie en masse de règles de dépendances.
   */
  public ouvrirSaisieMasseDependances(): void {
    this.modaleSaisieMasseDependancesVisible.set(true);
  }

  /**
   * Referme la modale de saisie en masse de règles de dépendances, sans effet sur les règles déjà enregistrées.
   */
  public fermerSaisieMasseDependances(): void {
    this.modaleSaisieMasseDependancesVisible.set(false);
  }

  /**
   * Construit le texte pré-rempli de la modale de saisie en masse de règles de dépendances, à partir des
   * dépendances non référencées actuellement constatées sur le projet affiché : une ligne par couple
   * (référence, version) distinct, statut laissé vide pour saisie explicite par l'utilisateur, version débarrassée
   * de son éventuel préfixe de plage semver npm (cf. {@link retirerPrefixeSemver}). Chaque ligne de version est
   * immédiatement suivie d'une seconde ligne de même motif portant la borne de repli `*=obsolete` : rend visible et
   * modifiable dans le texte pré-rempli le même complément automatique que {@link SaisieMasseDependancesUtils}
   * ajouterait sinon silencieusement en fin d'analyse si le groupe n'en porte encore aucune (RG-044, US-045),
   * cohérent avec le pré-remplissage déjà retenu par le formulaire unitaire de l'écran de Paramétrage pour la même
   * borne de repli. Toute dépendance dont la référence ou la version contient « { » (motif de manifeste non
   * résolu, ex. `${project.version}`) est écartée du pré-remplissage : elle ne fournit pas de motif de règle
   * exploitable.
   * @param dependances - Lignes d'affichage des dépendances du projet.
   * @returns Le texte pré-rempli, deux lignes par dépendance non référencée distincte (version nettoyée, puis
   * borne `*=obsolete`), au format `motif;motifVersion=statut` de la grammaire retenue par
   * {@link SaisieMasseDependancesUtils}.
   */
  public texteInitialSaisieMasseDependances(dependances: readonly LigneDependance[]): string {
    const clesVues = new Set<string>();
    const lignes: string[] = [];
    for (const dependance of dependances) {
      if (!dependance.nonReference) {
        continue;
      }
      const version = this.retirerPrefixeSemver(dependance.version);
      // Une référence ou une version contenant « { » provient d'un motif de manifeste non résolu (ex. propriété
      // Maven `${project.version}`, interpolation non substituée) : jamais un identifiant ou une borne de version
      // exploitable comme motif de règle de dépendances. La ligne correspondante est écartée du pré-remplissage
      // plutôt que de proposer une règle ingérable à l'utilisateur.
      if (dependance.reference.includes('{') || version.includes('{')) {
        continue;
      }
      const cle = `${dependance.reference};${version}`;
      if (clesVues.has(cle)) {
        continue;
      }
      clesVues.add(cle);
      lignes.push(`${dependance.reference};${version}=`);
      lignes.push(`${dependance.reference};*=obsolete`);
    }
    return lignes.join('\n');
  }

  /**
   * Retire un préfixe de plage semver npm (`^`/`~`) éventuellement présent en tête d'une version de dépendance
   * constatée, pour ne jamais pré-remplir une borne de règle de dépendances avec un opérateur de plage : la
   * grammaire de {@link SaisieMasseDependancesUtils} (comme le formulaire unitaire
   * `SqmReferentielsParametrageComponent.analyserVersions`) n'attend qu'un motif de version exact ou à jokers
   * (`*`), jamais un caractère de plage npm.
   * @param version - Version brute constatée, potentiellement préfixée de `^` ou `~`.
   * @returns La version sans son préfixe de plage éventuel.
   */
  private retirerPrefixeSemver(version: string): string {
    return version.replace(/^[\^~]/, '');
  }

  /**
   * Stratégie de traitement injectée dans la modale de saisie en masse de règles de dépendances (US-043, RG-040) :
   * analyse et regroupe le texte collé via {@link SaisieMasseDependancesUtils.analyser} (rejet des lignes
   * malformées ou en conflit avec une règle déjà existante, sans bloquer les autres lignes valides), puis enregistre
   * l'ensemble des règles regroupées résultantes par UN SEUL appel à la commande native batch `definirReferentiels`
   * (jamais un appel par motif regroupé, correction de performance du 2026-08-24 : une sauvegarde disque unique
   * pour tout le lot plutôt qu'une par groupe créé), chaque groupe effectivement enregistré produisant néanmoins sa
   * propre entrée de journal (RG-023). En cas d'échec sur un groupe, les groupes déjà enregistrés avec succès le
   * restent (jamais re-soumis) : seules les lignes originales du ou des groupes en échec sont restituées dans le
   * texte restant, pour correction ou nouvelle tentative par l'utilisateur (RG-040).
   * @param texte - Texte collé courant de la modale.
   * @param motDePasse - Mot de passe du fichier ressaisi par l'utilisateur pour cette soumission (RG-002).
   * @returns Le résultat du traitement, consommé par la modale pour mettre à jour son affichage.
   */
  public readonly traiterSaisieMasseDependances: StrategieTraitementSaisieMasse = async (
    texte: string,
    motDePasse: string,
  ): Promise<ResultatTraitementSaisieMasse> => {
    const motifsExistants = (
      this.donneesApplication.racine()?.referentiels.reglesDependances ?? []
    ).map((regle) => regle.motif);
    const analyse = SaisieMasseDependancesUtils.analyser(texte, motifsExistants);

    const erreurs: ErreurLigneSaisieMasse[] = [...analyse.erreurs];
    const lignesEnEchec: string[] = [];
    let nombreReussies = 0;

    if (analyse.groupes.length > 0) {
      const entrees: EntreeReglesDependances[] = analyse.groupes.map((groupe) => ({
        id: crypto.randomUUID(),
        motif: groupe.motif,
        versions: groupe.versions,
      }));
      // Un seul appel batch pour l'ensemble des groupes (US-043, RG-040) : une seule sauvegarde effective du
      // fichier, contre une par groupe créé jusqu'ici. `donneesApplication.definirReferentiels` ne propage jamais
      // l'échec d'une entrée individuelle : `reussites` reflète, dans le même ordre que `entrees`/`analyse.groupes`,
      // le résultat réel de chaque groupe (échec partiel possible, RG-040 point 5, jamais de rollback des groupes
      // déjà réussis du même lot). `resultat.type === 'echec'` ne couvre qu'un échec technique global de l'appel
      // (ex. mot de passe invalide) : dans ce cas, tous les groupes de ce lot sont traités comme en échec, cohérent
      // avec le comportement antérieur (chaque appel indépendant échouait alors identiquement).
      const resultat = await this.donneesApplication.definirReferentiels(
        'reglesDependances',
        entrees,
        motDePasse,
      );
      const reussites =
        resultat.type === 'succes' ? resultat.reussites : analyse.groupes.map(() => false);

      analyse.groupes.forEach((groupe, index) => {
        if (reussites[index]) {
          nombreReussies += 1;
        } else {
          for (const ligne of groupe.lignesOriginales) {
            erreurs.push({
              ligne,
              message: 'Une erreur inattendue est survenue lors de l’enregistrement.',
            });
            lignesEnEchec.push(ligne);
          }
        }
      });
    }

    if (nombreReussies > 0) {
      this.notification.succes(
        `${nombreReussies} règle${nombreReussies > 1 ? 's' : ''} de dépendances enregistrée${nombreReussies > 1 ? 's' : ''}.`,
      );
    }

    const texteRestant = [...analyse.erreurs.map((erreur) => erreur.ligne), ...lignesEnEchec].join(
      '\n',
    );
    return { texteRestant, erreurs, nombreReussies };
  };

  /**
   * Gère le résultat d'une tentative de traitement de la modale de saisie en masse de règles de dépendances :
   * referme la modale uniquement si la soumission a été intégralement enregistrée avec succès (aucune erreur
   * restante), la laisse ouverte sinon (erreurs déjà reflétées par l'affichage interne de la modale).
   * @param resultat - Résultat du traitement, émis par la modale.
   */
  public gererResultatSaisieMasseDependances(resultat: ResultatTraitementSaisieMasse): void {
    if (resultat.erreurs.length === 0) {
      this.fermerSaisieMasseDependances();
    }
  }

  // --- Saisie en masse de qualifications de membres connus (US-044, RG-041, C15-08) ---

  /**
   * Compte les membres du projet actuellement affiché strictement au statut `inconnu` (RG-041), à l'exclusion des
   * membres en `conflit` (statut distinct, RG-008) : décision d'interprétation de ce développement (à valider par
   * un humain), faute de précision documentaire tranchant explicitement ce point — `LigneMembre.
   * critereParDefautQualification` n'est renseigné que pour une résolution `inconnu` (cf.
   * {@link construireLigneMembre}), jamais pour une résolution `conflit`, ce qui en fait un indicateur fiable de ce
   * dénombrement sans recalculer la résolution de statut. Ce compte est également sans dédoublonnage, comme pour
   * {@link nombreDependancesNonReferencees} : décision arbitraire assumée, relevée en relecture isolée du
   * 2026-08-18 et confirmée par un humain plutôt que corrigée, le seuil pouvant donc dépasser le nombre de lignes
   * réellement pré-remplies par {@link texteInitialSaisieMasseMembres} (dédoublonnage par couple critère/type).
   * @param membres - Lignes d'affichage des membres du projet.
   * @returns Le nombre de membres strictement `inconnu`.
   */
  public nombreMembresInconnus(membres: readonly LigneMembre[]): number {
    return membres.filter((membre) => membre.critereParDefautQualification !== undefined).length;
  }

  /**
   * Indique si le lien contextuel « Créer des règles en masse » doit être affiché (RG-041 : dès plus de cinq
   * membres au statut `inconnu`).
   * @param membres - Lignes d'affichage des membres du projet.
   * @returns `true` si le lien doit être affiché.
   */
  public afficherLienSaisieMasseMembres(membres: readonly LigneMembre[]): boolean {
    return (
      this.nombreMembresInconnus(membres) > SqmFicheProjetComponent.SEUIL_LIEN_SAISIE_MASSE_MEMBRES
    );
  }

  /**
   * Visibilité de la modale de saisie en masse de qualifications de membres.
   */
  public readonly modaleSaisieMasseMembresVisible: WritableSignal<boolean> = signal(false);

  /**
   * Ouvre la modale de saisie en masse de qualifications de membres.
   */
  public ouvrirSaisieMasseMembres(): void {
    this.modaleSaisieMasseMembresVisible.set(true);
  }

  /**
   * Referme la modale de saisie en masse de qualifications de membres, sans effet sur les règles déjà enregistrées.
   */
  public fermerSaisieMasseMembres(): void {
    this.modaleSaisieMasseMembresVisible.set(false);
  }

  /**
   * Construit le texte pré-rempli de la modale de saisie en masse de membres, à partir des membres strictement
   * `inconnu` actuellement constatés sur le projet affiché : une ligne par critère par défaut distinct (cf.
   * {@link calculerCritereParDefautQualification}), statut laissé vide pour saisie explicite par l'utilisateur
   * (RG-041, point 3). Décision arbitraire de ce développement (à valider par un humain, faute de précision
   * documentaire sur le pré-remplissage exact attendu) : même patron que
   * {@link texteInitialSaisieMasseDependances}, cohérent avec le critère par défaut déjà proposé par le lien
   * unitaire « Qualifier ce membre » (cf. {@link queryParamsQualification}).
   * @param membres - Lignes d'affichage des membres du projet.
   * @returns Le texte pré-rempli, une ligne par critère par défaut distinct, au format `critere;typeCritere=` de
   * la grammaire retenue par {@link SaisieMasseMembresUtils}.
   */
  public texteInitialSaisieMasseMembres(membres: readonly LigneMembre[]): string {
    const lignes = new Set<string>();
    for (const membre of membres) {
      const critereParDefaut = membre.critereParDefautQualification;
      if (critereParDefaut !== undefined) {
        lignes.add(`${critereParDefaut.valeur};${critereParDefaut.type}=`);
      }
    }
    return Array.from(lignes).join('\n');
  }

  /**
   * Convertit le type de critère littéral produit par {@link SaisieMasseMembresUtils} en valeur de l'enum
   * `TypeCritereMembre` attendue par `DonneesApplicationService.qualifierMembre` (cf. commentaire d'en-tête de
   * `saisie-masse-membres.utils.ts` sur l'absence de dépendance de `services/sansetat/` vers `services/avecetat/`) :
   * switch exhaustif plutôt qu'une assertion `as` non justifiée.
   * @param typeCritere - Type de critère littéral analysé.
   * @returns La valeur d'enum correspondante.
   */
  private convertirTypeCritereSaisieMasse(
    typeCritere: TypeCritereMembreSaisieMasse,
  ): TypeCritereMembre {
    switch (typeCritere) {
      case 'username':
        return TypeCritereMembre.Username;
      case 'email':
        return TypeCritereMembre.Email;
      case 'domaineEmail':
        return TypeCritereMembre.DomaineEmail;
    }
  }

  /**
   * Convertit le statut littéral produit par {@link SaisieMasseMembresUtils} en valeur de l'enum `StatutMembre`
   * attendue par `DonneesApplicationService.qualifierMembre` (cf. {@link convertirTypeCritereSaisieMasse}).
   * @param statut - Statut littéral analysé.
   * @returns La valeur d'enum correspondante.
   */
  private convertirStatutSaisieMasse(statut: StatutMembreSaisieMasse): StatutMembre {
    switch (statut) {
      case 'interne':
        return StatutMembre.Interne;
      case 'client':
        return StatutMembre.Client;
      case 'partenaire':
        return StatutMembre.Partenaire;
    }
  }

  /**
   * Stratégie de traitement injectée dans la modale de saisie en masse de qualifications de membres (US-044,
   * RG-041) : analyse le texte collé via {@link SaisieMasseMembresUtils.analyser} (rejet des lignes malformées, de
   * type de critère ou de statut non reconnu, en conflit avec une règle déjà existante du groupe ou en doublon
   * interne au lot, sans bloquer les autres lignes valides), puis enregistre l'ensemble des qualifications valides
   * par UN SEUL appel à la commande native batch `qualifierMembres` (jamais un appel par ligne, correction de
   * performance du 2026-08-24 : une sauvegarde disque unique pour tout le lot plutôt qu'une par ligne saisie). Le
   * champ `membreId` n'est jamais transmis (toujours `undefined`) : il ne s'agit ici que de créations, jamais de
   * modifications d'une règle existante (rejetées en amont par {@link SaisieMasseMembresUtils.analyser}), et
   * l'identifiant d'une règle nouvellement créée est généré côté cœur natif, jamais côté interface (asymétrie avec
   * `definirReferentiel`, documentée dans `referentiels-parametrage.component.ts`, vérifiée dans le code de
   * `DonneesApplicationService.qualifierMembre` avant ce développement). Chaque ligne effectivement enregistrée
   * produit néanmoins sa propre entrée de journal (RG-023). En cas d'échec sur une ligne, les lignes déjà
   * enregistrées avec succès le restent (jamais re-soumises) : seule la ligne originale en échec est restituée dans
   * le texte restant, pour correction ou nouvelle tentative par l'utilisateur (RG-041, point 5).
   * @param texte - Texte collé courant de la modale.
   * @param motDePasse - Mot de passe du fichier ressaisi par l'utilisateur pour cette soumission (RG-002, une seule
   * ressaisie pour tout le lot).
   * @returns Le résultat du traitement, consommé par la modale pour mettre à jour son affichage.
   */
  public readonly traiterSaisieMasseMembres: StrategieTraitementSaisieMasse = async (
    texte: string,
    motDePasse: string,
  ): Promise<ResultatTraitementSaisieMasse> => {
    const etatCourant = this.etat();
    if (etatCourant.type !== 'trouve') {
      return { texteRestant: texte, erreurs: [], nombreReussies: 0 };
    }
    const groupeId = etatCourant.donnees.groupeId;
    const groupe = this.donneesApplication
      .racine()
      ?.groupes.find((candidat) => candidat.id === groupeId);
    const reglesExistantes = (groupe?.membresConnus ?? []).map((regle) => ({
      critere: regle.critere,
      typeCritere: regle.typeCritere,
    }));
    const analyse = SaisieMasseMembresUtils.analyser(texte, reglesExistantes);

    const erreurs: ErreurLigneSaisieMasse[] = [...analyse.erreurs];
    const lignesEnEchec: string[] = [];
    let nombreReussies = 0;

    if (analyse.entrees.length > 0) {
      const entrees: DonneesMembreConnu[] = analyse.entrees.map((entree) => ({
        membreId: undefined,
        critere: entree.critere,
        typeCritere: this.convertirTypeCritereSaisieMasse(entree.typeCritere),
        statut: this.convertirStatutSaisieMasse(entree.statut),
      }));
      // Un seul appel batch pour l'ensemble des lignes (US-044, RG-041) : une seule sauvegarde effective du
      // fichier, contre une par ligne saisie jusqu'ici. `donneesApplication.qualifierMembres` ne propage jamais
      // l'échec d'une entrée individuelle : `reussites` reflète, dans le même ordre que `entrees`/`analyse.entrees`,
      // le résultat réel de chaque ligne (échec partiel possible, RG-041 point 5, jamais de rollback des lignes
      // déjà réussies du même lot). `resultat.type === 'echec'` ne couvre qu'un échec technique global de l'appel
      // (ex. mot de passe invalide) : dans ce cas, toutes les lignes de ce lot sont traitées comme en échec, cohérent
      // avec le comportement antérieur (chaque appel indépendant échouait alors identiquement).
      const resultat = await this.donneesApplication.qualifierMembres(
        groupeId,
        entrees,
        ORIGINE_SAISIE_MASSE_MEMBRES,
        motDePasse,
      );
      const reussites =
        resultat.type === 'succes' ? resultat.reussites : analyse.entrees.map(() => false);

      analyse.entrees.forEach((entree, index) => {
        if (reussites[index]) {
          nombreReussies += 1;
        } else {
          erreurs.push({
            ligne: entree.ligneOriginale,
            message: 'Une erreur inattendue est survenue lors de l’enregistrement.',
          });
          lignesEnEchec.push(entree.ligneOriginale);
        }
      });
    }

    if (nombreReussies > 0) {
      this.notification.succes(
        `${nombreReussies} membre${nombreReussies > 1 ? 's' : ''} qualifié${nombreReussies > 1 ? 's' : ''}.`,
      );
    }

    const texteRestant = [...analyse.erreurs.map((erreur) => erreur.ligne), ...lignesEnEchec].join(
      '\n',
    );
    return { texteRestant, erreurs, nombreReussies };
  };

  /**
   * Gère le résultat d'une tentative de traitement de la modale de saisie en masse de qualifications de membres :
   * referme la modale uniquement si la soumission a été intégralement enregistrée avec succès (aucune erreur
   * restante), la laisse ouverte sinon (erreurs déjà reflétées par l'affichage interne de la modale).
   * @param resultat - Résultat du traitement, émis par la modale.
   */
  public gererResultatSaisieMasseMembres(resultat: ResultatTraitementSaisieMasse): void {
    if (resultat.erreurs.length === 0) {
      this.fermerSaisieMasseMembres();
    }
  }

  /**
   * Traduit une résolution de statut de rattachement en étiquette affichable (cf. {@link construireLigneMembre}).
   * @param resolution - Résolution du statut de rattachement calculée.
   * @returns L'étiquette à afficher.
   */
  private libelleEtCouleurStatutMembre(
    resolution: ResolutionStatutMembre<StatutMembre>,
  ): EtiquetteCouleur {
    if (resolution.type === 'inconnu') {
      return { label: 'inconnu', couleur: 'rouge' };
    }
    if (resolution.type === 'conflit') {
      return { label: 'conflit de règles', couleur: 'rouge' };
    }
    switch (resolution.statut) {
      case StatutMembre.Interne:
        return { label: 'interne', couleur: 'vert' };
      case StatutMembre.Client:
        return { label: 'client', couleur: 'vert' };
      case StatutMembre.Partenaire:
        return { label: 'partenaire', couleur: 'vert' };
    }
  }

  /**
   * Construit l'étiquette du statut IA du projet (RG-016), avec la réserve « absence de preuve ≠ preuve d'absence »
   * affichée explicitement pour le cas `conformeSousReserve` (jamais un simple badge « conforme » opaque). Couleur
   * BLEU dédiée (R10-03), harmonisée avec l'écran Synthèse des audits, qui affichait auparavant la même couleur
   * verte que le statut `autorisee` — incohérence corrigée par l'ajout d'une quatrième couleur transverse au
   * composant Badge, appliquée identiquement sur les deux écrans plutôt que l'orange retenu initialement ici.
   * @param iaAutorisee - Politique d'autorisation de l'IA du projet.
   * @param marqueurs - Marqueurs d'outils IA détectés par le dernier audit intégré.
   * @returns L'étiquette calculée.
   */
  private construireEtiquetteStatutIa(
    iaAutorisee: boolean,
    marqueurs: readonly Marqueur[],
  ): EtiquetteStatutIa {
    const statut = StatutIaUtils.calculerStatutIA(iaAutorisee, marqueurs);
    switch (statut.type) {
      case 'autorisee': {
        const outils = Array.from(new Set(statut.marqueursDetectes.map((m) => m.outil)));
        return {
          label: outils.length > 0 ? `IA autorisée · ${outils.join(', ')}` : 'IA autorisée',
          couleur: 'vert',
          reserve: undefined,
        };
      }
      case 'violation': {
        const outils = Array.from(new Set(statut.marqueursDetectes.map((m) => m.outil)));
        return {
          label: `IA interdite · violation (${outils.join(', ')})`,
          couleur: 'rouge',
          reserve: undefined,
        };
      }
      case 'conformeSousReserve':
        return {
          label: 'IA interdite · conforme sous réserve',
          couleur: 'bleu',
          reserve:
            "Aucun marqueur d'outil IA détecté par le dernier audit, mais l'absence de preuve ne prouve pas l'absence d'usage réel.",
        };
    }
  }

  /**
   * Construit l'encart d'anomalie technique (état particulier, cf. commentaire d'en-tête de
   * {@link DonneesFicheProjet.anomalieTechnique}), en réutilisant `RapportAnomaliesUtils` (Phase 5 incrément 6,
   * écran Brouillon) plutôt que de reconstruire la résolution d'anomalie ici.
   * @param derniereCampagne - Dernière campagne en échec pour ce projet.
   * @param projet - Projet concerné.
   * @param groupe - Groupe de rattachement, transmis pour la résolution de l'instance de chaque anomalie.
   * @returns L'encart construit.
   */
  private construireAnomalieTechnique(
    derniereCampagne: NonNullable<
      ReturnType<typeof DerniereCampagneUtils.trouverDerniereCampagnePourProjet>
    >,
    projet: Projet,
    groupe: Groupe,
  ): AnomalieTechnique {
    const anomaliesResolues: readonly AnomalieResolue[] =
      RapportAnomaliesUtils.resoudreAnomaliesProjet(
        projet.id,
        projet.nom,
        derniereCampagne.verdict.anomalies,
        [groupe],
      );
    return {
      dateCampagneLabel: this.formaterDateCourte(derniereCampagne.campagne.date),
      anomalies: anomaliesResolues.map((anomalie): AnomalieAffichee => ({
        libelleCategorie: ErreurConnecteurUtils.libelleCategorie(anomalie.categorie),
        message: anomalie.message,
        actionSuggeree: ErreurConnecteurUtils.actionSuggeree(anomalie.categorie),
      })),
    };
  }

  /**
   * Filtre le journal des modifications (RG-023) aux seules entrées concernant spécifiquement ce projet, triées de
   * la plus récente à la plus ancienne. Décision arbitraire (à valider par un humain, cf. rapport de développement
   * de cet incrément) : convention `objet` retenue par `DonneesApplicationService` pour une mutation de portée
   * projet (`projet:{id}.champ`, ex. `projet:d000….iaAutorisee`, cf. `docs/01_besoin/exemple-donnees.json`).
   * @param journal - Journal complet des modifications.
   * @param projetId - Identifiant du projet concerné.
   * @returns Les entrées concernant ce projet, triées de la plus récente à la plus ancienne.
   */
  private filtrerJournalProjet(
    journal: readonly EntreeJournal[],
    projetId: string,
  ): readonly EntreeJournal[] {
    const prefixe = `projet:${projetId}.`;
    return journal
      .filter((entree) => entree.objet.startsWith(prefixe))
      .sort((a, b) => (a.horodatage < b.horodatage ? 1 : -1));
  }

  /**
   * Met en forme une valeur `unknown` du journal (`EntreeJournal.avant`/`apres`) en texte affichable, sans accès
   * non sûr à cette valeur.
   * @param valeur - Valeur à mettre en forme.
   * @returns Le texte affichable.
   */
  public formaterValeurJournal(valeur: unknown): string {
    if (valeur === undefined) {
      return '—';
    }
    return JSON.stringify(valeur) ?? 'indéfini';
  }
}
