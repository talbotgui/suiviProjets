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
import { Component, inject, signal, ChangeDetectionStrategy } from '@angular/core';
import type { WritableSignal } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { SqmConfirmationMotDePasseComponent } from '../../../composants/confirmation-mot-de-passe/confirmation-mot-de-passe.component';
import { DonneesApplicationService } from '../../../services/avecetat/etat/donnees-application.service';
import { NotificationService } from '../../../services/avecetat/etat/notification.service';
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
  changeDetection: ChangeDetectionStrategy.OnPush,
  templateUrl: './seuils-parametrage.component.html',
})
export class SqmSeuilsParametrageComponent {
  private readonly donneesApplication: DonneesApplicationService =
    inject(DonneesApplicationService);
  private readonly notification: NotificationService = inject(NotificationService);

  /**
   * Instantané des seuils chargés lors de la dernière (ré)initialisation du formulaire, utilisé pour détecter les
   * champs réellement modifiés ; `null` si aucun fichier n'est chargé.
   */
  private instantane: SeuilsJugement | null = null;

  /**
   * Dix-neuf seuils numériques du formulaire, portés par des signaux (plutôt que de simples propriétés) car
   * réaffectés en bloc par {@link reinitialiserDepuisRacine}, elle-même appelée depuis la continuation asynchrone
   * de {@link confirmerEnregistrement} (après la boucle de `await` sur `definirSeuil`), hors de toute planification
   * automatique de détection de changement dans une application zoneless (aucune dépendance `zone.js`, cf.
   * `app.config.ts`) : seule une écriture de signal est garantie de déclencher un nouveau rendu à ce moment-là, à
   * la différence d'une propriété mutée après un `await` (cf. correctif de référence,
   * `ecrans/demarrage/demarrage.component.ts`).
   */
  public readonly vitaliteMourantJours: WritableSignal<number> = signal(0);
  public readonly vitaliteMortJours: WritableSignal<number> = signal(0);
  public readonly tailleDepotBorneS: WritableSignal<number> = signal(0);
  public readonly tailleDepotBorneL: WritableSignal<number> = signal(0);
  public readonly tailleDepotBorneXL: WritableSignal<number> = signal(0);
  public readonly couvertureSeuilRouge: WritableSignal<number> = signal(0);
  public readonly couvertureSeuilOrange: WritableSignal<number> = signal(0);
  public readonly fraicheurSonarToleranceJours: WritableSignal<number> = signal(0);
  public readonly activiteSansQualiteMinCommits: WritableSignal<number> = signal(0);
  public readonly activiteSansQualiteMinNouvellesViolations: WritableSignal<number> = signal(0);
  public readonly fraicheurAuditAncienJours: WritableSignal<number> = signal(0);
  public readonly mrOuvertesAgeOrangeJours: WritableSignal<number> = signal(0);
  public readonly mrOuvertesAgeRougeJours: WritableSignal<number> = signal(0);
  public readonly mrOuvertesPourcentageConflitRouge: WritableSignal<number> = signal(0);
  public readonly couleursViolationsBloquantSeuilOrange: WritableSignal<number> = signal(0);
  public readonly couleursViolationsBloquantSeuilRouge: WritableSignal<number> = signal(0);
  public readonly couleursViolationsCritiqueSeuilOrange: WritableSignal<number> = signal(0);
  public readonly couleursViolationsCritiqueSeuilRouge: WritableSignal<number> = signal(0);
  public readonly materialiteBrouillonVariationRelative: WritableSignal<number> = signal(0);

  /**
   * Indique si la ressaisie du mot de passe du fichier est actuellement affichée (RG-002). Signal pour le même
   * motif que les seuils ci-dessus : basculé notamment depuis la continuation asynchrone de
   * {@link confirmerEnregistrement}.
   */
  public readonly actionEnAttenteMotDePasse: WritableSignal<boolean> = signal(false);

  /**
   * Indique qu'un appel à une commande native est en cours, pour désactiver les actions concurrentes. Signal pour
   * le même motif que ci-dessus.
   */
  public readonly enCours: WritableSignal<boolean> = signal(false);

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
    this.vitaliteMourantJours.set(seuils.vitalite.mourantJours);
    this.vitaliteMortJours.set(seuils.vitalite.mortJours);
    this.tailleDepotBorneS.set(seuils.tailleDepot.borneS);
    this.tailleDepotBorneL.set(seuils.tailleDepot.borneL);
    this.tailleDepotBorneXL.set(seuils.tailleDepot.borneXL);
    this.couvertureSeuilRouge.set(seuils.couverture.seuilRouge);
    this.couvertureSeuilOrange.set(seuils.couverture.seuilOrange);
    this.fraicheurSonarToleranceJours.set(seuils.fraicheurSonar.toleranceJours);
    this.activiteSansQualiteMinCommits.set(seuils.activiteSansQualite.minCommits);
    this.activiteSansQualiteMinNouvellesViolations.set(
      seuils.activiteSansQualite.minNouvellesViolations,
    );
    this.fraicheurAuditAncienJours.set(seuils.fraicheurAudit.ancienJours);
    this.mrOuvertesAgeOrangeJours.set(seuils.mrOuvertes.ageOrangeJours);
    this.mrOuvertesAgeRougeJours.set(seuils.mrOuvertes.ageRougeJours);
    this.mrOuvertesPourcentageConflitRouge.set(seuils.mrOuvertes.pourcentageConflitRouge);
    this.couleursViolationsBloquantSeuilOrange.set(seuils.couleursViolations.bloquant.seuilOrange);
    this.couleursViolationsBloquantSeuilRouge.set(seuils.couleursViolations.bloquant.seuilRouge);
    this.couleursViolationsCritiqueSeuilOrange.set(seuils.couleursViolations.critique.seuilOrange);
    this.couleursViolationsCritiqueSeuilRouge.set(seuils.couleursViolations.critique.seuilRouge);
    this.materialiteBrouillonVariationRelative.set(seuils.materialiteBrouillon.variationRelative);
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
        apres: this.vitaliteMourantJours(),
      },
      {
        cle: 'vitalite.mortJours',
        avant: instantane.vitalite.mortJours,
        apres: this.vitaliteMortJours(),
      },
      {
        cle: 'tailleDepot.borneS',
        avant: instantane.tailleDepot.borneS,
        apres: this.tailleDepotBorneS(),
      },
      {
        cle: 'tailleDepot.borneL',
        avant: instantane.tailleDepot.borneL,
        apres: this.tailleDepotBorneL(),
      },
      {
        cle: 'tailleDepot.borneXL',
        avant: instantane.tailleDepot.borneXL,
        apres: this.tailleDepotBorneXL(),
      },
      {
        cle: 'couverture.seuilRouge',
        avant: instantane.couverture.seuilRouge,
        apres: this.couvertureSeuilRouge(),
      },
      {
        cle: 'couverture.seuilOrange',
        avant: instantane.couverture.seuilOrange,
        apres: this.couvertureSeuilOrange(),
      },
      {
        cle: 'fraicheurSonar.toleranceJours',
        avant: instantane.fraicheurSonar.toleranceJours,
        apres: this.fraicheurSonarToleranceJours(),
      },
      {
        cle: 'activiteSansQualite.minCommits',
        avant: instantane.activiteSansQualite.minCommits,
        apres: this.activiteSansQualiteMinCommits(),
      },
      {
        cle: 'activiteSansQualite.minNouvellesViolations',
        avant: instantane.activiteSansQualite.minNouvellesViolations,
        apres: this.activiteSansQualiteMinNouvellesViolations(),
      },
      {
        cle: 'fraicheurAudit.ancienJours',
        avant: instantane.fraicheurAudit.ancienJours,
        apres: this.fraicheurAuditAncienJours(),
      },
      {
        cle: 'mrOuvertes.ageOrangeJours',
        avant: instantane.mrOuvertes.ageOrangeJours,
        apres: this.mrOuvertesAgeOrangeJours(),
      },
      {
        cle: 'mrOuvertes.ageRougeJours',
        avant: instantane.mrOuvertes.ageRougeJours,
        apres: this.mrOuvertesAgeRougeJours(),
      },
      {
        cle: 'mrOuvertes.pourcentageConflitRouge',
        avant: instantane.mrOuvertes.pourcentageConflitRouge,
        apres: this.mrOuvertesPourcentageConflitRouge(),
      },
      {
        cle: 'couleursViolations.bloquant.seuilOrange',
        avant: instantane.couleursViolations.bloquant.seuilOrange,
        apres: this.couleursViolationsBloquantSeuilOrange(),
      },
      {
        cle: 'couleursViolations.bloquant.seuilRouge',
        avant: instantane.couleursViolations.bloquant.seuilRouge,
        apres: this.couleursViolationsBloquantSeuilRouge(),
      },
      {
        cle: 'couleursViolations.critique.seuilOrange',
        avant: instantane.couleursViolations.critique.seuilOrange,
        apres: this.couleursViolationsCritiqueSeuilOrange(),
      },
      {
        cle: 'couleursViolations.critique.seuilRouge',
        avant: instantane.couleursViolations.critique.seuilRouge,
        apres: this.couleursViolationsCritiqueSeuilRouge(),
      },
      {
        cle: 'materialiteBrouillon.variationRelative',
        avant: instantane.materialiteBrouillon.variationRelative,
        apres: this.materialiteBrouillonVariationRelative(),
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
    if (this.champsModifies().length === 0) {
      return;
    }
    this.actionEnAttenteMotDePasse.set(true);
  }

  /**
   * Annule la ressaisie du mot de passe en cours.
   */
  public annulerMotDePasse(): void {
    this.actionEnAttenteMotDePasse.set(false);
  }

  /**
   * Enregistre séquentiellement chaque seuil modifié après confirmation du mot de passe (US-033, RG-002, RG-022,
   * RG-023) : s'arrête au premier échec sans tenter les seuils suivants, pour ne jamais masquer une anomalie
   * partielle derrière un succès apparent.
   * @param motDePasse - Mot de passe du fichier ressaisi par l'utilisateur.
   */
  public async confirmerEnregistrement(motDePasse: string): Promise<void> {
    const champs = this.champsModifies();
    this.enCours.set(true);
    for (const champ of champs) {
      const resultat = await this.donneesApplication.definirSeuil(
        champ.cle,
        champ.valeur,
        motDePasse,
      );
      if (resultat.type === 'echec') {
        this.enCours.set(false);
        this.actionEnAttenteMotDePasse.set(false);
        this.notification.erreur(this.libelleAnomalie(resultat.anomalie));
        this.reinitialiserDepuisRacine();
        return;
      }
    }
    this.enCours.set(false);
    this.actionEnAttenteMotDePasse.set(false);
    this.notification.succes('Les seuils modifiés ont été enregistrés.');
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
      case 'nouveauMotDePasseInvalide':
      case 'erreurInterne':
        return "Une erreur inattendue est survenue lors de l'enregistrement.";
    }
  }
}
