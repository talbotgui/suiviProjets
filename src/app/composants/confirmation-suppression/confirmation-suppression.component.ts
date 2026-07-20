// Fichier généré avec l'assistance de l'IA (Claude Code), conformément à la mention d'origine requise par
// .claude/rules/01-usage-ia-et-conventions.md.
//
// Composant réutilisable de confirmation avant une suppression irréversible (US-006, US-007 : « la suppression
// est confirmée et rappelle la perte de l'historique d'audits associé »), sur le modèle du gabarit
// `SqmExempleReferenceComponent`.
import { Component, input, output } from '@angular/core';
import type { InputSignal, OutputEmitterRef } from '@angular/core';

/**
 * Boîte de confirmation réutilisable avant une action de suppression, affichant un message d'avertissement et
 * deux actions (confirmer/annuler). N'est affichée que si le composant appelant la rend visible (aucun état de
 * visibilité interne).
 */
@Component({
  selector: 'app-confirmation-suppression',
  templateUrl: './confirmation-suppression.component.html',
  styleUrl: './confirmation-suppression.component.scss',
})
export class SqmConfirmationSuppressionComponent {
  /**
   * Message d'avertissement affiché, propre au contexte de suppression (ex. rappel de la perte de l'historique
   * d'audits associé à un groupe ou un projet).
   */
  public readonly message: InputSignal<string> = input.required<string>();

  /**
   * Libellé du bouton de confirmation, personnalisable par l'appelant.
   */
  public readonly libelleConfirmation: InputSignal<string> = input<string>('Supprimer');

  /**
   * Émis lorsque l'utilisateur confirme la suppression.
   */
  public readonly confirmee: OutputEmitterRef<void> = output<void>();

  /**
   * Émis lorsque l'utilisateur annule la suppression.
   */
  public readonly annulee: OutputEmitterRef<void> = output<void>();

  /**
   * Gère la confirmation de la suppression par l'utilisateur.
   */
  public confirmer(): void {
    this.confirmee.emit();
  }

  /**
   * Gère l'annulation de la suppression par l'utilisateur.
   */
  public annuler(): void {
    this.annulee.emit();
  }
}
