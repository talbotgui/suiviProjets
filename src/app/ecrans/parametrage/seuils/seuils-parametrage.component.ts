// Fichier généré avec l'assistance de l'IA (Claude Code), conformément à la mention d'origine requise par
// .claude/rules/01-usage-ia-et-conventions.md.
//
// Section « Seuils de couleur » de l'onglet Seuils et référentiels de l'écran Paramétrage (US-033, Phase 7,
// incrément 2 ; RG-022, RG-023). Édite les dix-neuf valeurs numériques de `parametres.seuils` (`SeuilsJugement`,
// `services/avecetat/etat/types-donnees.ts`) au sein d'un formulaire unique.
//
// Décision arbitraire (à valider par un humain, cf. rapport de développement de cet incrément) : plutôt qu'une
// ressaisie du mot de passe du fichier par seuil individuel (RG-002), une unique confirmation de mot de passe est
// demandée pour l'ensemble des seuils modifiés au sein de ce formulaire ; la commande native `definirSeuil` est
// ensuite invoquée séquentiellement, une fois par seuil réellement modifié (comparaison à l'instantané chargé),
// en réutilisant cette même saisie. Aucune règle ni maquette haute-fidélité n'impose ni n'exclut ce regroupement.
import { Component, inject } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { SqmConfirmationMotDePasseComponent } from '../../../composants/confirmation-mot-de-passe/confirmation-mot-de-passe.component';
import { DonneesApplicationService } from '../../../services/avecetat/etat/donnees-application.service';
import type {
  ErreurAdministration,
  SeuilsJugement,
} from '../../../services/avecetat/etat/types-donnees';

/**
 * Une modification de seuil détectée par comparaison à l'instantané chargé, prête à être transmise à
 * `definirSeuil`.
 */
interface ChampSeuilModifie {
  /** Chemin pointé de la clé au sein de `parametres.seuils` (ex. `vitalite.mortJours`). */
  readonly cle: string;
  /** Nouvelle valeur numérique. */
  readonly valeur: number;
}

/**
 * Section « Seuils de couleur » : formulaire unique des dix-neuf seuils numériques de `parametres.seuils`
 * (US-033), avec détection des champs réellement modifiés et une unique ressaisie du mot de passe du fichier pour
 * l'ensemble de l'enregistrement (RG-002, RG-022, RG-023).
 */
@Component({
  selector: 'app-seuils-parametrage',
  imports: [FormsModule, SqmConfirmationMotDePasseComponent],
  templateUrl: './seuils-parametrage.component.html',
  styleUrl: './seuils-parametrage.component.scss',
})
export class SqmSeuilsParametrageComponent {
  private readonly donneesApplication: DonneesApplicationService =
    inject(DonneesApplicationService);

  /**
   * Instantané des seuils chargés lors de la dernière (ré)initialisation du formulaire, utilisé pour détecter les
   * champs réellement modifiés ; `null` si aucun fichier n'est chargé.
   */
  private instantane: SeuilsJugement | null = null;

  public vitaliteMourantJours = 0;
  public vitaliteMortJours = 0;
  public tailleDepotBorneS = 0;
  public tailleDepotBorneL = 0;
  public tailleDepotBorneXL = 0;
  public couvertureSeuilRouge = 0;
  public couvertureSeuilOrange = 0;
  public fraicheurSonarToleranceJours = 0;
  public activiteSansQualiteMinCommits = 0;
  public activiteSansQualiteMinNouvellesViolations = 0;
  public fraicheurAuditAncienJours = 0;
  public mrOuvertesAgeOrangeJours = 0;
  public mrOuvertesAgeRougeJours = 0;
  public mrOuvertesPourcentageConflitRouge = 0;
  public couleursViolationsBloquantSeuilOrange = 0;
  public couleursViolationsBloquantSeuilRouge = 0;
  public couleursViolationsCritiqueSeuilOrange = 0;
  public couleursViolationsCritiqueSeuilRouge = 0;
  public materialiteBrouillonVariationRelative = 0;

  /**
   * Message d'erreur de validation ou de rejet par le cœur natif, `null` si aucune erreur en cours.
   */
  public messageErreur: string | null = null;

  /**
   * Message de confirmation de succès, discret et non bloquant (charte d'ergonomie), `null` si aucun enregistrement
   * récent.
   */
  public messageSucces: string | null = null;

  /**
   * Indique si la ressaisie du mot de passe du fichier est actuellement affichée (RG-002).
   */
  public actionEnAttenteMotDePasse = false;

  /**
   * Indique qu'un appel à une commande native est en cours, pour désactiver les actions concurrentes.
   */
  public enCours = false;

  /**
   * Construit la section en initialisant le formulaire depuis les seuils actuellement chargés, `null` si aucun
   * fichier n'est chargé.
   */
  public constructor() {
    this.reinitialiserDepuisRacine();
  }

  /**
   * Indique si un fichier est actuellement chargé (condition d'affichage du formulaire).
   * @returns `true` si des seuils sont disponibles.
   */
  public fichierCharge(): boolean {
    return this.instantane !== null;
  }

  /**
   * (Ré)initialise le formulaire et l'instantané de comparaison depuis la racine actuellement chargée.
   */
  private reinitialiserDepuisRacine(): void {
    const seuils = this.donneesApplication.racine()?.parametres.seuils ?? null;
    this.instantane = seuils;
    if (seuils === null) {
      return;
    }
    this.vitaliteMourantJours = seuils.vitalite.mourantJours;
    this.vitaliteMortJours = seuils.vitalite.mortJours;
    this.tailleDepotBorneS = seuils.tailleDepot.borneS;
    this.tailleDepotBorneL = seuils.tailleDepot.borneL;
    this.tailleDepotBorneXL = seuils.tailleDepot.borneXL;
    this.couvertureSeuilRouge = seuils.couverture.seuilRouge;
    this.couvertureSeuilOrange = seuils.couverture.seuilOrange;
    this.fraicheurSonarToleranceJours = seuils.fraicheurSonar.toleranceJours;
    this.activiteSansQualiteMinCommits = seuils.activiteSansQualite.minCommits;
    this.activiteSansQualiteMinNouvellesViolations =
      seuils.activiteSansQualite.minNouvellesViolations;
    this.fraicheurAuditAncienJours = seuils.fraicheurAudit.ancienJours;
    this.mrOuvertesAgeOrangeJours = seuils.mrOuvertes.ageOrangeJours;
    this.mrOuvertesAgeRougeJours = seuils.mrOuvertes.ageRougeJours;
    this.mrOuvertesPourcentageConflitRouge = seuils.mrOuvertes.pourcentageConflitRouge;
    this.couleursViolationsBloquantSeuilOrange = seuils.couleursViolations.bloquant.seuilOrange;
    this.couleursViolationsBloquantSeuilRouge = seuils.couleursViolations.bloquant.seuilRouge;
    this.couleursViolationsCritiqueSeuilOrange = seuils.couleursViolations.critique.seuilOrange;
    this.couleursViolationsCritiqueSeuilRouge = seuils.couleursViolations.critique.seuilRouge;
    this.materialiteBrouillonVariationRelative = seuils.materialiteBrouillon.variationRelative;
  }

  /**
   * Compare chaque seuil du formulaire à l'instantané chargé.
   * @returns La liste des seuils réellement modifiés, prêts à être transmis à `definirSeuil`.
   */
  private champsModifies(): readonly ChampSeuilModifie[] {
    const instantane = this.instantane;
    if (instantane === null) {
      return [];
    }
    const candidats: readonly {
      readonly cle: string;
      readonly avant: number;
      readonly apres: number;
    }[] = [
      {
        cle: 'vitalite.mourantJours',
        avant: instantane.vitalite.mourantJours,
        apres: this.vitaliteMourantJours,
      },
      {
        cle: 'vitalite.mortJours',
        avant: instantane.vitalite.mortJours,
        apres: this.vitaliteMortJours,
      },
      {
        cle: 'tailleDepot.borneS',
        avant: instantane.tailleDepot.borneS,
        apres: this.tailleDepotBorneS,
      },
      {
        cle: 'tailleDepot.borneL',
        avant: instantane.tailleDepot.borneL,
        apres: this.tailleDepotBorneL,
      },
      {
        cle: 'tailleDepot.borneXL',
        avant: instantane.tailleDepot.borneXL,
        apres: this.tailleDepotBorneXL,
      },
      {
        cle: 'couverture.seuilRouge',
        avant: instantane.couverture.seuilRouge,
        apres: this.couvertureSeuilRouge,
      },
      {
        cle: 'couverture.seuilOrange',
        avant: instantane.couverture.seuilOrange,
        apres: this.couvertureSeuilOrange,
      },
      {
        cle: 'fraicheurSonar.toleranceJours',
        avant: instantane.fraicheurSonar.toleranceJours,
        apres: this.fraicheurSonarToleranceJours,
      },
      {
        cle: 'activiteSansQualite.minCommits',
        avant: instantane.activiteSansQualite.minCommits,
        apres: this.activiteSansQualiteMinCommits,
      },
      {
        cle: 'activiteSansQualite.minNouvellesViolations',
        avant: instantane.activiteSansQualite.minNouvellesViolations,
        apres: this.activiteSansQualiteMinNouvellesViolations,
      },
      {
        cle: 'fraicheurAudit.ancienJours',
        avant: instantane.fraicheurAudit.ancienJours,
        apres: this.fraicheurAuditAncienJours,
      },
      {
        cle: 'mrOuvertes.ageOrangeJours',
        avant: instantane.mrOuvertes.ageOrangeJours,
        apres: this.mrOuvertesAgeOrangeJours,
      },
      {
        cle: 'mrOuvertes.ageRougeJours',
        avant: instantane.mrOuvertes.ageRougeJours,
        apres: this.mrOuvertesAgeRougeJours,
      },
      {
        cle: 'mrOuvertes.pourcentageConflitRouge',
        avant: instantane.mrOuvertes.pourcentageConflitRouge,
        apres: this.mrOuvertesPourcentageConflitRouge,
      },
      {
        cle: 'couleursViolations.bloquant.seuilOrange',
        avant: instantane.couleursViolations.bloquant.seuilOrange,
        apres: this.couleursViolationsBloquantSeuilOrange,
      },
      {
        cle: 'couleursViolations.bloquant.seuilRouge',
        avant: instantane.couleursViolations.bloquant.seuilRouge,
        apres: this.couleursViolationsBloquantSeuilRouge,
      },
      {
        cle: 'couleursViolations.critique.seuilOrange',
        avant: instantane.couleursViolations.critique.seuilOrange,
        apres: this.couleursViolationsCritiqueSeuilOrange,
      },
      {
        cle: 'couleursViolations.critique.seuilRouge',
        avant: instantane.couleursViolations.critique.seuilRouge,
        apres: this.couleursViolationsCritiqueSeuilRouge,
      },
      {
        cle: 'materialiteBrouillon.variationRelative',
        avant: instantane.materialiteBrouillon.variationRelative,
        apres: this.materialiteBrouillonVariationRelative,
      },
    ];
    return candidats
      .filter((candidat) => candidat.avant !== candidat.apres)
      .map((candidat) => ({ cle: candidat.cle, valeur: candidat.apres }));
  }

  /**
   * Nombre de seuils actuellement modifiés par rapport à l'instantané chargé.
   * @returns Le nombre de champs modifiés.
   */
  public nombreDeModifications(): number {
    return this.champsModifies().length;
  }

  /**
   * Ouvre la ressaisie du mot de passe si au moins un seuil a été modifié (RG-002).
   */
  public demanderEnregistrement(): void {
    this.messageSucces = null;
    if (this.champsModifies().length === 0) {
      return;
    }
    this.messageErreur = null;
    this.actionEnAttenteMotDePasse = true;
  }

  /**
   * Annule la ressaisie du mot de passe en cours.
   */
  public annulerMotDePasse(): void {
    this.actionEnAttenteMotDePasse = false;
  }

  /**
   * Enregistre séquentiellement chaque seuil modifié après confirmation du mot de passe (US-033, RG-002, RG-022,
   * RG-023) : s'arrête au premier échec sans tenter les seuils suivants, pour ne jamais masquer une anomalie
   * partielle derrière un succès apparent.
   * @param motDePasse - Mot de passe du fichier ressaisi par l'utilisateur.
   */
  public async confirmerEnregistrement(motDePasse: string): Promise<void> {
    const champs = this.champsModifies();
    this.enCours = true;
    for (const champ of champs) {
      const resultat = await this.donneesApplication.definirSeuil(
        champ.cle,
        champ.valeur,
        motDePasse,
      );
      if (resultat.type === 'echec') {
        this.enCours = false;
        this.actionEnAttenteMotDePasse = false;
        this.messageErreur = this.libelleAnomalie(resultat.anomalie);
        this.reinitialiserDepuisRacine();
        return;
      }
    }
    this.enCours = false;
    this.actionEnAttenteMotDePasse = false;
    this.messageSucces = 'Les seuils modifiés ont été enregistrés.';
    this.reinitialiserDepuisRacine();
  }

  /**
   * Traduit une anomalie typée en message lisible par l'utilisateur, sans détail technique sensible.
   * @param anomalie - Anomalie remontée par la commande native.
   * @returns Le message à afficher.
   */
  private libelleAnomalie(anomalie: ErreurAdministration): string {
    switch (anomalie.type) {
      case 'cleSeuilIntrouvable':
        return "Ce seuil n'est pas reconnu par le fichier de données ouvert.";
      case 'fichierVerrouille':
        return 'Le fichier de données est verrouillé par un autre processus.';
      case 'motDePasseOuFichierInvalide':
        return 'Mot de passe incorrect.';
      case 'sessionVerrouillee':
        return 'La session est verrouillée : déverrouillez-la avant de sauvegarder.';
      case 'motDePasseSessionDivergent':
        return 'Le mot de passe saisi ne correspond pas à celui de la session en cours.';
      case 'typeReferentielInconnu':
      case 'entreeReferentielInvalide':
      case 'motifNommageBranchesInvalide':
      case 'groupeIntrouvable':
      case 'projetIntrouvable':
      case 'membreIntrouvable':
      case 'doublonUsernameMembreConnu':
      case 'conflitReglesMembreConnu':
      case 'brouillonDejaExistant':
      case 'aucunBrouillonCourant':
      case 'projetAbsentDuBrouillon':
      case 'fichierIntrouvable':
      case 'formatNonReconnu':
      case 'versionSchemaSuperieure':
      case 'aucunFichierOuvert':
      case 'credentialInvalide':
      case 'modePurgeAgeInconnu':
      case 'fichierConfigurationIllisible':
      case 'formatConfigurationNonReconnu':
      case 'versionSchemaConfigurationSuperieure':
      case 'ligneDifferentielInconnue':
      case 'vueIntrouvable':
      case 'reglageApplicatifInvalide':
      case 'entreeReferentielIntrouvable':
      case 'annotationIntrouvable':
      case 'annotationSystemeNonSupprimable':
      case 'erreurInterne':
        return "Une erreur inattendue est survenue lors de l'enregistrement.";
    }
  }
}
