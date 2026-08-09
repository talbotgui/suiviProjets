// Fichier généré avec l'assistance de l'IA (Claude Code), conformément à la mention d'origine requise par
// .claude/rules/01-usage-ia-et-conventions.md.
//
// Indicateur de chargement transverse (Phase 11, R11-04) : monté une seule fois par le Shell
// (`shell.component.html`), affiché tant qu'au moins un appel de commande est en cours
// (`IndicateurChargementUtils.actif`). Aucun état interne, source unique de vérité dans `IndicateurChargementUtils`,
// sur le même modèle que `SqmNotificationComponent`.
import { Component, ChangeDetectionStrategy } from '@angular/core';
import type { Signal } from '@angular/core';
import { IndicateurChargementUtils } from '../../services/sansetat/commandes/indicateur-chargement.utils';

/**
 * Barre de progression indéterminée, affichée en haut de l'écran tant qu'un appel de commande est en cours.
 */
@Component({
  selector: 'app-indicateur-chargement',
  templateUrl: './indicateur-chargement.component.html',
  changeDetection: ChangeDetectionStrategy.Eager,
  styleUrl: './indicateur-chargement.component.scss',
})
export class SqmIndicateurChargementComponent {
  /**
   * `true` si au moins un appel de commande est actuellement en cours.
   */
  public readonly actif: Signal<boolean> = IndicateurChargementUtils.actif;
}
