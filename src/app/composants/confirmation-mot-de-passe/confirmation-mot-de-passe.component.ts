// Fichier généré avec l'assistance de l'IA (Claude Code), conformément à la mention d'origine requise par
// .claude/rules/01-usage-ia-et-conventions.md.
//
// Composant réutilisable de ressaisie du mot de passe du fichier avant une commande qui sauvegarde effectivement
// sur le disque (Phase 4, `qualifierMembre`, `definirPolitiqueIA`), sur le modèle du gabarit
// `SqmExempleReferenceComponent` et de `SqmConfirmationSuppressionComponent`. Le mot de passe du fichier n'est
// jamais mis en cache côté UI (RG-002, cf. `docs/02_documentation/15_normesSecurite.md#gestion-des-secrets-et-
// données-sensibles`) : il est réellement redemandé à chaque sauvegarde plutôt que réutilisé silencieusement, y
// compris pour deux sauvegardes consécutives au sein de la même session.
import { Component, input, output, signal } from '@angular/core';
import type { InputSignal, OutputEmitterRef, WritableSignal } from '@angular/core';
import { FormsModule } from '@angular/forms';

/**
 * Boîte de ressaisie réutilisable du mot de passe du fichier avant une sauvegarde effective (RG-002). N'est
 * affichée que si le composant appelant la rend visible (aucun état de visibilité interne).
 */
@Component({
  selector: 'app-confirmation-mot-de-passe',
  imports: [FormsModule],
  templateUrl: './confirmation-mot-de-passe.component.html',
  styleUrl: './confirmation-mot-de-passe.component.scss',
})
export class SqmConfirmationMotDePasseComponent {
  /**
   * Message expliquant à l'utilisateur pourquoi le mot de passe est redemandé, propre au contexte appelant.
   */
  public readonly message: InputSignal<string> = input.required<string>();

  /**
   * Émis avec le mot de passe saisi lorsque l'utilisateur confirme.
   */
  public readonly confirmee: OutputEmitterRef<string> = output<string>();

  /**
   * Émis lorsque l'utilisateur annule la saisie.
   */
  public readonly annulee: OutputEmitterRef<void> = output<void>();

  /**
   * Mot de passe actuellement saisi dans le formulaire.
   */
  public readonly motDePasse: WritableSignal<string> = signal('');

  /**
   * Gère la confirmation par l'utilisateur : n'émet rien si le champ est resté vide.
   */
  public confirmer(): void {
    const valeur = this.motDePasse();
    if (valeur.length === 0) {
      return;
    }
    this.confirmee.emit(valeur);
    this.motDePasse.set('');
  }

  /**
   * Gère l'annulation de la saisie par l'utilisateur.
   */
  public annuler(): void {
    this.motDePasse.set('');
    this.annulee.emit();
  }
}
