// Fichier de référence exemplaire (gabarit) pour tout futur composant Angular réutilisable de ce projet, conforme
// aux règles de rigueur de typage et de documentation (cf. docs/02_documentation/14_normesDeveloppement.md).
// Ce composant n'est utilisé par aucun écran réel : il sert uniquement de modèle à reproduire, notamment lors
// d'une génération de code assistée par IA. Généré avec l'assistance de l'IA (Claude Code), conformément à la
// mention d'origine requise par .claude/rules/01-usage-ia-et-conventions.md.
import {
  Component,
  ElementRef,
  Injector,
  afterNextRender,
  inject,
  input,
  output,
  signal,
  viewChild,
  ChangeDetectionStrategy,
} from '@angular/core';
import type { OutputEmitterRef, InputSignal, Signal, WritableSignal } from '@angular/core';

/**
 * Composant de référence illustrant les conventions attendues pour tout composant Angular réutilisable du projet :
 * visibilité explicite sur chaque membre, documentation JSDoc systématique, entrées et sorties typées via les
 * Signals Angular, aucune interpolation non échappée de contenu externe, patron de focus initial pour tout
 * formulaire conditionnellement affiché (cf. {@link ouvrirFormulaire}, C15-02).
 * Ce composant est un gabarit : il n'est utilisé par aucun écran réel de l'application.
 */
@Component({
  selector: 'app-exemple-reference',
  templateUrl: './exemple-reference.component.html',
  changeDetection: ChangeDetectionStrategy.OnPush,
  styleUrl: './exemple-reference.component.scss',
})
export class SqmExempleReferenceComponent {
  private readonly injector: Injector = inject(Injector);

  /**
   * Premier champ du formulaire conditionnellement affiché (cf. {@link formulaireVisible}), résolu une fois ce
   * champ effectivement rendu dans le DOM.
   */
  private readonly premierChampFormulaire: Signal<ElementRef<HTMLInputElement> | undefined> =
    viewChild<ElementRef<HTMLInputElement>>('premierChampFormulaire');

  /**
   * Libellé affiché par le composant, fourni obligatoirement par le composant appelant.
   */
  public readonly libelle: InputSignal<string> = input.required<string>();

  /**
   * Émis lorsque l'utilisateur active le composant (ex. clic), avec le libellé courant en donnée associée.
   */
  public readonly activation: OutputEmitterRef<string> = output<string>();

  /**
   * Indique si le formulaire secondaire, conditionnellement affiché (`@if`), est actuellement visible.
   */
  public readonly formulaireVisible: WritableSignal<boolean> = signal(false);

  /**
   * Gère l'activation du composant par l'utilisateur et émet l'événement `activation` correspondant.
   */
  public gererActivation(): void {
    this.activation.emit(this.libelle());
  }

  /**
   * Affiche le formulaire et pose le focus sur son premier champ dès son rendu effectif (C15-02) : un simple appel
   * à `.focus()` ici échouerait, le champ n'existant pas encore dans le DOM au moment de cet appel (`@if`
   * conditionnel n'ayant pas encore été réévalué) ; `afterNextRender` diffère l'appel après le rendu réel du DOM,
   * sans nécessiter un `effect()` qui devrait suivre {@link formulaireVisible} en continu pour le même résultat.
   */
  public ouvrirFormulaire(): void {
    this.formulaireVisible.set(true);
    afterNextRender(() => this.premierChampFormulaire()?.nativeElement.focus(), {
      injector: this.injector,
    });
  }
}
