// Fichier généré avec l'assistance de l'IA (Claude Code), conformément à la mention d'origine requise par
// .claude/rules/01-usage-ia-et-conventions.md.
//
// Onglet « Purge des audits » de l'écran Paramétrage (US-025, Phase 7, incrément 4 ; RG-024, RG-025) : purge par
// densité (audits rapprochés de moins de sept jours) et purge par âge (au-delà de six mois, suppression ou
// agrégation mensuelle), toujours proposées avec prévisualisation du volume libéré, jamais automatiques (F19). Un
// unique discriminant d'action en attente (`'densite' | 'age' | null`) plutôt que deux indicateurs distincts, sur
// le même patron que `SqmReferentielsParametrageComponent` (une seule action possible à la fois).
//
// Décision arbitraire (à valider par un humain, cf. rapport de développement de cet incrément) : la sélection des
// audits à supprimer n'est jamais recalculée côté interface, ni transmise par elle à la commande d'exécution — ce
// composant se contente d'afficher le résumé renvoyé par les commandes natives de consultation
// (`previsualiserPurgeDensite`/`previsualiserPurgeAge`) et d'invoquer, après confirmation du mot de passe, la
// commande de mutation correspondante (`executerPurgeDensite`/`executerPurgeAge`), qui recalcule elle-même cette
// sélection à partir de la racine transmise (cf. commentaire d'en-tête de `persistance::purge` côté cœur natif).
import { Component, inject, signal, ChangeDetectionStrategy } from '@angular/core';
import type { WritableSignal } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { SqmConfirmationMotDePasseComponent } from '../../../composants/confirmation-mot-de-passe/confirmation-mot-de-passe.component';
import { DonneesApplicationService } from '../../../services/avecetat/etat/donnees-application.service';
import { NotificationService } from '../../../services/avecetat/etat/notification.service';
import { TailleFichierUtils } from '../../../services/sansetat/taille-fichier.utils';
import type {
  ErreurAdministration,
  ModePurgeAge,
  PrevisualisationPurge,
} from '../../../services/avecetat/etat/types-donnees';

/**
 * Action de purge actuellement en attente de ressaisie du mot de passe (RG-002), `null` si aucune.
 */
type ActionPurgeEnAttente = 'densite' | 'age' | null;

/**
 * Onglet « Purge des audits » : prévisualisation et exécution d'une purge par densité ou par âge des audits
 * anciens (US-025, RG-024, RG-025).
 */
@Component({
  selector: 'app-purge-parametrage',
  imports: [FormsModule, SqmConfirmationMotDePasseComponent],
  changeDetection: ChangeDetectionStrategy.OnPush,
  templateUrl: './purge-parametrage.component.html',
})
export class SqmPurgeParametrageComponent {
  private readonly donneesApplication: DonneesApplicationService =
    inject(DonneesApplicationService);
  private readonly notification: NotificationService = inject(NotificationService);

  /**
   * Résumé de la dernière prévisualisation de purge par densité, `null` si aucune n'a encore été demandée ou si la
   * racine a changé depuis (purge exécutée, ou par un autre onglet). Signal car mis à jour depuis la continuation
   * asynchrone d'un appel à une commande native, hors de toute planification automatique de détection de
   * changement en application zoneless (cf. commentaire d'en-tête de `cheminCreation` dans
   * `demarrage.component.ts`).
   */
  public readonly previsualisationDensite: WritableSignal<PrevisualisationPurge | null> =
    signal<PrevisualisationPurge | null>(null);

  /**
   * Résumé de la dernière prévisualisation de purge par âge, `null` si aucune n'a encore été demandée. Signal pour
   * le même motif que {@link previsualisationDensite}.
   */
  public readonly previsualisationAge: WritableSignal<PrevisualisationPurge | null> =
    signal<PrevisualisationPurge | null>(null);

  /**
   * Mode de purge par âge actuellement sélectionné (RG-025).
   */
  public modeAge: ModePurgeAge = 'suppression';

  /**
   * Action de purge en attente de ressaisie du mot de passe (RG-002). Signal pour le même motif que
   * {@link previsualisationDensite}.
   */
  public readonly actionEnAttenteMotDePasse: WritableSignal<ActionPurgeEnAttente> =
    signal<ActionPurgeEnAttente>(null);

  /**
   * Indique qu'un appel à une commande native est en cours, pour désactiver les actions concurrentes. Signal pour
   * le même motif que {@link previsualisationDensite}.
   */
  public readonly enCours: WritableSignal<boolean> = signal(false);

  /**
   * Prévisualise une purge par densité (RG-024).
   */
  public async previsualiserDensite(): Promise<void> {
    this.enCours.set(true);
    const resultat = await this.donneesApplication.previsualiserPurgeDensite();
    this.enCours.set(false);
    if (resultat.type === 'echec') {
      this.notification.erreur(this.libelleAnomalie(resultat.anomalie));
      return;
    }
    this.previsualisationDensite.set(resultat.previsualisation);
  }

  /**
   * Ouvre la ressaisie du mot de passe pour l'exécution de la purge par densité (RG-002), si une prévisualisation
   * concernant au moins un audit a été demandée au préalable.
   */
  public demanderExecutionDensite(): void {
    const previsualisation = this.previsualisationDensite();
    if (!previsualisation || previsualisation.nbAuditsSupprimes === 0) {
      return;
    }
    this.actionEnAttenteMotDePasse.set('densite');
  }

  /**
   * Exécute la purge par densité après confirmation du mot de passe (RG-002, RG-024).
   * @param motDePasse - Mot de passe du fichier ressaisi par l'utilisateur.
   */
  public async confirmerExecutionDensite(motDePasse: string): Promise<void> {
    this.enCours.set(true);
    const resultat = await this.donneesApplication.executerPurgeDensite(motDePasse);
    this.enCours.set(false);
    this.actionEnAttenteMotDePasse.set(null);
    if (resultat.type === 'echec') {
      this.notification.erreur(this.libelleAnomalie(resultat.anomalie));
      return;
    }
    this.previsualisationDensite.set(null);
    this.notification.succes('La purge par densité a été effectuée.');
  }

  /**
   * Prévisualise une purge par âge pour le mode actuellement sélectionné (RG-025).
   */
  public async previsualiserAge(): Promise<void> {
    this.enCours.set(true);
    const resultat = await this.donneesApplication.previsualiserPurgeAge(this.modeAge);
    this.enCours.set(false);
    if (resultat.type === 'echec') {
      this.notification.erreur(this.libelleAnomalie(resultat.anomalie));
      return;
    }
    this.previsualisationAge.set(resultat.previsualisation);
  }

  /**
   * Ouvre la ressaisie du mot de passe pour l'exécution de la purge par âge (RG-002), si une prévisualisation
   * concernant au moins un audit a été demandée au préalable pour le mode actuellement sélectionné.
   */
  public demanderExecutionAge(): void {
    const previsualisation = this.previsualisationAge();
    if (!previsualisation || previsualisation.nbAuditsSupprimes === 0) {
      return;
    }
    this.actionEnAttenteMotDePasse.set('age');
  }

  /**
   * Exécute la purge par âge, pour le mode actuellement sélectionné, après confirmation du mot de passe (RG-002,
   * RG-025).
   * @param motDePasse - Mot de passe du fichier ressaisi par l'utilisateur.
   */
  public async confirmerExecutionAge(motDePasse: string): Promise<void> {
    this.enCours.set(true);
    const resultat = await this.donneesApplication.executerPurgeAge(this.modeAge, motDePasse);
    this.enCours.set(false);
    this.actionEnAttenteMotDePasse.set(null);
    if (resultat.type === 'echec') {
      this.notification.erreur(this.libelleAnomalie(resultat.anomalie));
      return;
    }
    this.previsualisationAge.set(null);
    this.notification.succes('La purge par âge a été effectuée.');
  }

  /**
   * Invalide toute prévisualisation de purge par âge déjà affichée dès que l'utilisateur change de mode, pour ne
   * jamais laisser affiché un résumé qui ne correspond plus au mode sélectionné.
   * @param mode - Mode de purge par âge nouvellement sélectionné.
   */
  public changerModeAge(mode: ModePurgeAge): void {
    this.modeAge = mode;
    this.previsualisationAge.set(null);
  }

  /**
   * Annule la ressaisie du mot de passe en cours.
   */
  public annulerMotDePasse(): void {
    this.actionEnAttenteMotDePasse.set(null);
  }

  /**
   * Met en forme une taille en octets en mégaoctets, une décimale, registre français (virgule).
   * @param octets - Taille en octets.
   * @returns Le texte affichable (ex. `2,4 Mo`).
   */
  public formaterOctets(octets: number): string {
    return TailleFichierUtils.formaterMegaOctets(octets);
  }

  /**
   * Traduit une anomalie typée en message lisible par l'utilisateur, sans détail technique sensible.
   * @param anomalie - Anomalie remontée par la commande native.
   * @returns Le message à afficher.
   */
  private libelleAnomalie(anomalie: ErreurAdministration): string {
    switch (anomalie.type) {
      case 'modePurgeAgeInconnu':
        return "Ce mode de purge par âge n'est pas reconnu.";
      case 'fichierVerrouille':
        return 'Le fichier de données est verrouillé par un autre processus.';
      case 'motDePasseOuFichierInvalide':
        return 'Mot de passe incorrect.';
      case 'sessionVerrouillee':
        return 'La session est verrouillée : déverrouillez-la avant de sauvegarder.';
      case 'motDePasseSessionDivergent':
        return 'Le mot de passe saisi ne correspond pas à celui de la session en cours.';
      case 'cleSeuilIntrouvable':
      case 'typeReferentielInconnu':
      case 'motifDependanceDejaExistant':
      case 'libelleCategorieDependanceDejaExistant':
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
        return "Une erreur inattendue est survenue lors de l'opération.";
    }
  }
}
