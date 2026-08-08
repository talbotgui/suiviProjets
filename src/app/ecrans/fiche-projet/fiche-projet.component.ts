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
import { Component, ElementRef, computed, inject, input, signal, viewChild } from '@angular/core';
import type { InputSignal, Signal, WritableSignal } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { RouterLink } from '@angular/router';
import { toPng } from 'html-to-image';
import { SqmBadgeComponent } from '../../composants/badge/badge.component';
import { SqmConfirmationMotDePasseComponent } from '../../composants/confirmation-mot-de-passe/confirmation-mot-de-passe.component';
import { SqmConfirmationSuppressionComponent } from '../../composants/confirmation-suppression/confirmation-suppression.component';
import { SqmExplicationJugementComponent } from '../../composants/explication-jugement/explication-jugement.component';
import { RapportAnomaliesUtils } from '../../services/avecetat/campagne/rapport-anomalies.utils';
import type { AnomalieResolue } from '../../services/avecetat/campagne/rapport-anomalies.utils';
import type { ResultatCroiseFraicheurSonar } from '../../services/avecetat/campagne/connecteur-croise.utils';
import { DonneesApplicationService } from '../../services/avecetat/etat/donnees-application.service';
import { NotificationService } from '../../services/avecetat/etat/notification.service';
import { StatutMembre } from '../../services/avecetat/etat/types-donnees';
import type {
  Annotation,
  EntreeJournal,
  Groupe,
  Projet,
  Resultat,
} from '../../services/avecetat/etat/types-donnees';
import { TypeSource } from '../../services/avecetat/etat/types-donnees';
import { ErreurConnecteurUtils } from '../../services/sansetat/commandes/erreur-connecteur.utils';
import type {
  Dependance,
  Marqueur,
  MembreGitlab,
  MergeRequestOuverte,
} from '../../services/sansetat/commandes/types-facade';
import { AgregationThemeFicheProjetUtils } from '../../services/sansetat/jugement/agregation-theme-fiche-projet.utils';
import { BadgeSonarKoUtils } from '../../services/sansetat/jugement/badge-sonar-ko.utils';
import { ClasseTailleUtils } from '../../services/sansetat/jugement/classe-taille.utils';
import { DerniereCampagneUtils } from '../../services/sansetat/jugement/derniere-campagne.utils';
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
  /** Étiquette du statut IA (RG-016). */
  readonly statutIa: EtiquetteStatutIa;
  /** `true` si le badge SONAR_KO est déclenché (RG-013), toujours faux si {@link pasDeSonar}. */
  readonly sonarKo: boolean;
  /** `true` si au moins un membre du dépôt est de statut `inconnu`/`conflit` (RG-006 à RG-009). */
  readonly membreInconnuDetecte: boolean;
  /** Libellé de l'âge du projet chez nous (`Projet.premierCommitInterne`). */
  readonly ageChezNousLabel: string;
  /** Libellé de la date du dernier audit intégré, libellé de repli si jamais audité. */
  readonly dernierAuditLabel: string;
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
  /** Dépendances déclarées, avec leur statut d'obsolescence déjà résolu. */
  readonly dependances: readonly LigneDependance[];
  /** Étiquette résumée des demandes de fusion ouvertes (nombre, conflits). */
  readonly mrResume: EtiquetteCouleur | undefined;
  /** Demandes de fusion ouvertes constatées, détaillées ligne par ligne. */
  readonly mrOuvertes: readonly LigneMr[];
  /** Membres du dépôt constatés, avec leur statut de rattachement déjà résolu. */
  readonly membres: readonly LigneMembre[];
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
    SqmBadgeComponent,
    SqmExplicationJugementComponent,
    SqmConfirmationMotDePasseComponent,
    SqmConfirmationSuppressionComponent,
  ],
  templateUrl: './fiche-projet.component.html',
  styleUrl: './fiche-projet.component.scss',
})
export class SqmFicheProjetComponent {
  private readonly donneesApplication: DonneesApplicationService =
    inject(DonneesApplicationService);
  private readonly notification: NotificationService = inject(NotificationService);

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
   * Indique qu'une création d'annotation est en cours, pour désactiver les actions concurrentes.
   */
  public enCoursAnnotation = false;

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

    this.enCoursAnnotation = true;
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
    this.enCoursAnnotation = false;

    if (resultat.type === 'echec') {
      this.notification.erreur('Une erreur inattendue est survenue lors de la création.');
      return;
    }
    this.formulaireAnnotationVisible.set(false);
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

    this.enCoursAnnotation = true;
    const resultat = await this.donneesApplication.supprimerAnnotation(
      etatCourant.donnees.groupeId,
      etatCourant.donnees.projetId,
      annotationId,
      motDePasse,
    );
    this.enCoursAnnotation = false;
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
    if (conteneur === undefined) {
      return;
    }
    const dataUrl = await toPng(conteneur);
    this.declencherTelechargementPng(dataUrl);
  }

  /**
   * Déclenche le téléchargement d'une image PNG encodée en URL de données.
   * @param dataUrl - URL de données PNG produite par `toPng`.
   */
  private declencherTelechargementPng(dataUrl: string): void {
    const lien = document.createElement('a');
    lien.href = dataUrl;
    lien.download = `fiche-projet-${new Date().toISOString().slice(0, 10)}.png`;
    lien.click();
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

    const dernierAudit = projet.audits.at(-1);
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
    const resultatMr =
      dernierAudit === undefined
        ? undefined
        : this.trouverResultat(dernierAudit.resultats, 'gitlab.merge_requests');

    const sonarKo = !themes.pasDeSonar
      ? this.calculerSonarKo(resultatFraicheurSonar, seuilsFraicheurSonar)
      : false;

    const membres = themes.membres.map((membre) =>
      this.construireLigneMembre(membre, groupe.membresConnus),
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
      statutIa: this.construireEtiquetteStatutIa(projet.iaAutorisee, themes.marqueursIa),
      sonarKo,
      membreInconnuDetecte: membres.some((membre) => membre.inconnu),
      ageChezNousLabel: this.construireAgeChezNousLabel(projet.premierCommitInterne, maintenant),
      dernierAuditLabel:
        dernierAudit === undefined ? 'jamais audité' : this.formaterDateCourte(dernierAudit.date),
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
      dependances: themes.dependances.map((dependance) =>
        this.construireLigneDependance(dependance, reglesDependances),
      ),
      mrResume: this.construireResumeMr(resultatMr?.mrOuvertes ?? [], seuilsMrOuvertes, maintenant),
      mrOuvertes: (resultatMr?.mrOuvertes ?? []).map((mr) =>
        this.construireLigneMr(mr, maintenant),
      ),
      membres,
      marqueursIa: themes.marqueursIa,
      annotations: [...projet.annotations].sort((a, b) => (a.date < b.date ? 1 : -1)),
      journal: this.filtrerJournalProjet(journal, projet.id),
      seuilsBruts,
      referentielsBruts,
    };
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
    };
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
