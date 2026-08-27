// Fichier généré avec l'assistance de l'IA (Claude Code), conformément à la mention d'origine requise par
// .claude/rules/01-usage-ia-et-conventions.md.
//
// Superposition de Verrouillage (US-026, RG-004, RG-005), montée par `SqmShellComponent` uniquement lorsque
// `EtatSessionService.etatFichier()` vaut `Verrouille`, sur le même modèle que `SqmRechercheTransversaleComponent`
// (`08_arborescenceNavigation.md` : « se superpose à l'écran courant... sans le démonter »). Réutilise
// `SqmConfirmationMotDePasseComponent` pour le champ de mot de passe (bouton « Annuler » et touche Échap sans
// effet ici au-delà de vider le champ saisi — `(annulee)` volontairement non lié —, la superposition restant
// affichée tant que la session n'est pas déverrouillée ou le fichier fermé : aucune action d'annulation légitime
// sur un écran de verrouillage).
import { Component, inject, signal, ChangeDetectionStrategy } from '@angular/core';
import type { Signal, WritableSignal } from '@angular/core';
import { Router } from '@angular/router';
import { SqmConfirmationMotDePasseComponent } from '../confirmation-mot-de-passe/confirmation-mot-de-passe.component';
import { DonneesApplicationService } from '../../services/avecetat/etat/donnees-application.service';
import { EtatSessionService } from '../../services/avecetat/etat/etat-session.service';

/**
 * Superposition de Verrouillage : masque l'écran courant, redemande le mot de passe du fichier (US-026) et affiche
 * le nombre d'échecs consécutifs restants avant fermeture automatique du fichier.
 */
@Component({
  selector: 'app-verrouillage',
  imports: [SqmConfirmationMotDePasseComponent],
  templateUrl: './verrouillage.component.html',
  changeDetection: ChangeDetectionStrategy.OnPush,
  styleUrl: './verrouillage.component.scss',
})
export class SqmVerrouillageComponent {
  private readonly donneesApplication: DonneesApplicationService =
    inject(DonneesApplicationService);
  private readonly etatSession: EtatSessionService = inject(EtatSessionService);
  private readonly router: Router = inject(Router);

  /**
   * Nombre d'échecs consécutifs de déverrouillage déjà enregistrés depuis le dernier déverrouillage réussi.
   */
  public readonly echecsDeverrouillage: Signal<number> = this.etatSession.echecsDeverrouillage;

  /**
   * Message d'erreur affiché après un échec de déverrouillage, `null` si aucun échec n'a encore été rejoué. Signal
   * (plutôt qu'une simple propriété) car mis à jour depuis la continuation asynchrone de {@link deverrouiller},
   * sans déclenchement automatique de rendu en zoneless (cf. `cheminCreation` de `demarrage.component.ts`).
   */
  public readonly messageErreur: WritableSignal<string | null> = signal<string | null>(null);

  /**
   * Nombre d'essais restants avant fermeture automatique du fichier, `null` si le seuil paramétré n'est pas
   * connu (aucun fichier chargé, ce qui ne devrait pas survenir tant que cette superposition est affichée).
   * @returns Le nombre d'essais restants, ou `null`.
   */
  public essaisRestants(): number | null {
    const seuil = this.donneesApplication.racine()?.parametres.verrouillage.echecsAvantFermeture;
    if (seuil === undefined) {
      return null;
    }
    return Math.max(seuil - this.echecsDeverrouillage(), 0);
  }

  /**
   * Traite la confirmation du mot de passe saisi (US-026) : déverrouille la session en cas de succès (la
   * superposition se démonte alors d'elle-même, `EtatSessionService.etatFichier()` repassant à `Ouvert`), ou
   * affiche un message d'erreur et navigue vers l'écran de Démarrage si la fermeture automatique du fichier a été
   * déclenchée par cet échec (`parametres.verrouillage.echecsAvantFermeture` atteint).
   * @param motDePasse - Mot de passe saisi par l'utilisateur.
   */
  public async deverrouiller(motDePasse: string): Promise<void> {
    const resultat = await this.donneesApplication.deverrouillerSession(motDePasse);
    if (resultat.type === 'succes') {
      this.messageErreur.set(null);
      return;
    }
    if (resultat.fichierFerme) {
      void this.router.navigateByUrl('/demarrage');
      return;
    }
    this.messageErreur.set('Mot de passe incorrect.');
  }
}
