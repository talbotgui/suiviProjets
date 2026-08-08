// Fichier généré avec l'assistance de l'IA (Claude Code), conformément à la mention d'origine requise par
// .claude/rules/01-usage-ia-et-conventions.md.
//
// Composant transverse « Bandeau d'alerte pleine largeur » de la charte d'ergonomie (cf.
// docs/02_documentation/10_charteErgonomie.md#composants-dinterface-réutilisables), pour tout signal prioritaire
// qui doit rester visible au-dessus du contenu qu'il concerne, y compris après filtrage : membre inconnu (RG-009,
// bandeau local à un écran), et depuis C11-04 (Phase 11), credential manquant pour une instance utilisée par le
// fichier ouvert (RG-037, bandeau global instancié par `composants/shell/`, sous l'entête, sur tout écran).
// Généralisation actée par arbitrage humain explicite plutôt qu'un second composant dédié dupliquant ce même
// gabarit (cf. C11-04, rapport de développement de cet incrément). Sur le modèle du gabarit
// `SqmExempleReferenceComponent` : n'est affiché que si le composant appelant le rend visible (aucun état de
// visibilité interne, aucun mécanisme de fermeture définitive qui permettrait de le masquer malgré ces signaux).
import { Component, input, output } from '@angular/core';
import type { InputSignal, OutputEmitterRef } from '@angular/core';

/**
 * Bandeau pleine largeur pour un signal prioritaire (RG-009 : un membre au statut `inconnu` est toujours signalé,
 * quel que soit l'état des filtres/tris de l'écran courant). Le composant appelant est seul responsable de le
 * garder monté tant que le signal reste actif : ce composant ne porte aucune logique de masquage.
 */
@Component({
  selector: 'app-bandeau-alerte',
  templateUrl: './bandeau-alerte.component.html',
  styleUrl: './bandeau-alerte.component.scss',
})
export class SqmBandeauAlerteComponent {
  /**
   * Message d'alerte affiché, propre au contexte appelant (ex. décompte de membres inconnus sur le périmètre
   * courant).
   */
  public readonly message: InputSignal<string> = input.required<string>();

  /**
   * Libellé du bouton d'action optionnel (ex. « Voir le détail »), absent si aucune action n'est proposée par le
   * composant appelant.
   */
  public readonly libelleAction: InputSignal<string | undefined> = input<string | undefined>(
    undefined,
  );

  /**
   * Émis lorsque l'utilisateur active l'action optionnelle du bandeau.
   */
  public readonly action: OutputEmitterRef<void> = output<void>();

  /**
   * Gère l'activation de l'action optionnelle par l'utilisateur.
   */
  public declencherAction(): void {
    this.action.emit();
  }
}
