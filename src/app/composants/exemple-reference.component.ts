// Fichier de référence exemplaire (gabarit) pour tout futur composant Angular réutilisable de ce projet, conforme
// aux règles de rigueur de typage et de documentation (cf. docs/02_documentation/14_normesDeveloppement.md).
// Ce composant n'est utilisé par aucun écran réel : il sert uniquement de modèle à reproduire, notamment lors
// d'une génération de code assistée par IA. Généré avec l'assistance de l'IA (Claude Code), conformément à la
// mention d'origine requise par .claude/rules/01-usage-ia-et-conventions.md.
import { Component, input, output } from '@angular/core';
import type { OutputEmitterRef, InputSignal } from '@angular/core';

/**
 * Composant de référence illustrant les conventions attendues pour tout composant Angular réutilisable du projet :
 * visibilité explicite sur chaque membre, documentation JSDoc systématique, entrées et sorties typées via les
 * Signals Angular, aucune interpolation non échappée de contenu externe.
 * Ce composant est un gabarit : il n'est utilisé par aucun écran réel de l'application.
 */
@Component({
  selector: 'app-exemple-reference',
  templateUrl: './exemple-reference.component.html',
  styleUrl: './exemple-reference.component.scss',
})
export class SqmExempleReferenceComponent {
  /**
   * Libellé affiché par le composant, fourni obligatoirement par le composant appelant.
   */
  public readonly libelle: InputSignal<string> = input.required<string>();

  /**
   * Émis lorsque l'utilisateur active le composant (ex. clic), avec le libellé courant en donnée associée.
   */
  public readonly activation: OutputEmitterRef<string> = output<string>();

  /**
   * Gère l'activation du composant par l'utilisateur et émet l'événement `activation` correspondant.
   */
  public gererActivation(): void {
    this.activation.emit(this.libelle());
  }
}
