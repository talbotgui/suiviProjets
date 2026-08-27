// Fichier généré avec l'assistance de l'IA (Claude Code), conformément à la mention d'origine requise par
// .claude/rules/01-usage-ia-et-conventions.md.
//
// Onglet « Sécurité » de l'écran Paramétrage (Phase 15, C15-03, US-041, RG-038) : changement du mot de passe du
// fichier de données en cours de session, jusqu'ici impossible sans recréer intégralement le fichier. Onglet dédié
// plutôt que noyé dans « Réglages applicatifs » (arbitrage utilisateur du 2026-08-17). Sur le même patron que
// `SqmReglagesApplicatifsParametrageComponent` : formulaire local (ici, nouveau mot de passe et confirmation), puis
// ressaisie de l'ancien mot de passe via `SqmConfirmationMotDePasseComponent` (RG-002) avant l'appel effectif à
// `DonneesApplicationService.changerMotDePasseFichier`. Réécriture immédiate du fichier et suppression des
// sauvegardes de sécurité existantes (RG-038) : décisions déjà actées côté cœur natif, non répétées ici.
import { Component, computed, inject, signal, ChangeDetectionStrategy } from '@angular/core';
import type { Signal, WritableSignal } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { SqmConfirmationMotDePasseComponent } from '../../../composants/confirmation-mot-de-passe/confirmation-mot-de-passe.component';
import { DonneesApplicationService } from '../../../services/avecetat/etat/donnees-application.service';
import {
  EtatFichier,
  EtatSessionService,
} from '../../../services/avecetat/etat/etat-session.service';
import { NotificationService } from '../../../services/avecetat/etat/notification.service';
import type { ErreurAdministration } from '../../../services/avecetat/etat/types-donnees';

/**
 * Onglet « Sécurité » : changement du mot de passe du fichier de données actuellement ouvert (US-041, RG-038).
 * L'action reste masquée tant qu'aucun fichier n'est chargé et déverrouillé (décision arbitrée le 2026-08-17,
 * cohérente avec la seule condition sous laquelle une commande de mutation de ce type est acceptée côté cœur natif,
 * cf. `verifier_avant_ecriture`).
 */
@Component({
  selector: 'app-securite-parametrage',
  imports: [FormsModule, SqmConfirmationMotDePasseComponent],
  changeDetection: ChangeDetectionStrategy.OnPush,
  templateUrl: './securite-parametrage.component.html',
})
export class SqmSecuriteParametrageComponent {
  private readonly donneesApplication: DonneesApplicationService =
    inject(DonneesApplicationService);
  private readonly etatSession: EtatSessionService = inject(EtatSessionService);
  private readonly notification: NotificationService = inject(NotificationService);

  /**
   * `true` tant qu'un fichier est chargé et déverrouillé : seule condition sous laquelle cet onglet propose son
   * action (masquée sinon, décision arbitrée le 2026-08-17).
   */
  public readonly fichierOuvert: Signal<boolean> = computed(
    () => this.etatSession.etatFichier() === EtatFichier.Ouvert,
  );

  /**
   * Nouveau mot de passe saisi par l'utilisateur.
   */
  public nouveauMotDePasseFormulaire = '';

  /**
   * Confirmation du nouveau mot de passe, doit correspondre exactement à {@link nouveauMotDePasseFormulaire}.
   */
  public confirmationNouveauMotDePasseFormulaire = '';

  /**
   * Message d'erreur de validation locale (champs vides ou divergents), `null` si aucune erreur en cours.
   */
  public messageErreur: string | null = null;

  /**
   * `true` dès la validation locale du formulaire, le temps de la ressaisie de l'ancien mot de passe (RG-002).
   */
  public readonly confirmationMotDePasseVisible: WritableSignal<boolean> = signal(false);

  /**
   * Indique qu'un appel à la commande native est en cours, pour désactiver les actions concurrentes.
   */
  public readonly enCours: WritableSignal<boolean> = signal(false);

  /**
   * Valide le formulaire (deux champs non vides et identiques) puis, si valide, ouvre la ressaisie de l'ancien mot
   * de passe (RG-002).
   */
  public demanderChangement(): void {
    if (this.nouveauMotDePasseFormulaire.trim().length === 0) {
      this.messageErreur = 'Le nouveau mot de passe ne peut pas être vide.';
      return;
    }
    if (this.nouveauMotDePasseFormulaire !== this.confirmationNouveauMotDePasseFormulaire) {
      this.messageErreur = 'Les deux mots de passe saisis ne correspondent pas.';
      return;
    }
    this.messageErreur = null;
    this.confirmationMotDePasseVisible.set(true);
  }

  /**
   * Change effectivement le mot de passe après confirmation de l'ancien (US-041, RG-002, RG-038).
   * @param ancienMotDePasse - Mot de passe actuel, ressaisi par l'utilisateur.
   */
  public async confirmerChangement(ancienMotDePasse: string): Promise<void> {
    this.enCours.set(true);
    const resultat = await this.donneesApplication.changerMotDePasseFichier(
      ancienMotDePasse,
      this.nouveauMotDePasseFormulaire,
    );
    this.enCours.set(false);
    this.confirmationMotDePasseVisible.set(false);

    if (resultat.type === 'echec') {
      this.notification.erreur(this.libelleAnomalie(resultat.anomalie));
      return;
    }
    this.nouveauMotDePasseFormulaire = '';
    this.confirmationNouveauMotDePasseFormulaire = '';
    this.notification.succes('Le mot de passe du fichier a été changé.');
  }

  /**
   * Annule la ressaisie de l'ancien mot de passe en cours.
   */
  public annulerMotDePasse(): void {
    this.confirmationMotDePasseVisible.set(false);
  }

  /**
   * Traduit une anomalie typée en message lisible par l'utilisateur, sans détail technique sensible.
   * @param anomalie - Anomalie remontée par la commande native.
   * @returns Le message à afficher.
   */
  private libelleAnomalie(anomalie: ErreurAdministration): string {
    switch (anomalie.type) {
      case 'nouveauMotDePasseInvalide':
        return 'Le nouveau mot de passe ne peut pas être vide.';
      case 'motDePasseOuFichierInvalide':
      case 'motDePasseSessionDivergent':
        return 'Le mot de passe actuel saisi est incorrect.';
      case 'fichierVerrouille':
        return 'Le fichier de données est verrouillé par un autre processus.';
      case 'sessionVerrouillee':
        return 'La session est verrouillée : déverrouillez-la avant de changer le mot de passe.';
      case 'groupeIntrouvable':
      case 'projetIntrouvable':
      case 'membreIntrouvable':
      case 'doublonUsernameMembreConnu':
      case 'conflitReglesMembreConnu':
      case 'brouillonDejaExistant':
      case 'aucunBrouillonCourant':
      case 'projetAbsentDuBrouillon':
      case 'cleSeuilIntrouvable':
      case 'typeReferentielInconnu':
      case 'motifDependanceDejaExistant':
      case 'libelleCategorieDependanceDejaExistant':
      case 'entreeReferentielInvalide':
      case 'entreeReferentielIntrouvable':
      case 'motifNommageBranchesInvalide':
      case 'reglageApplicatifInvalide':
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
      case 'annotationIntrouvable':
      case 'annotationSystemeNonSupprimable':
      case 'erreurInterne':
        return 'Une erreur inattendue est survenue lors du changement de mot de passe.';
    }
  }
}
