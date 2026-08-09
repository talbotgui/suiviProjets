// Fichier généré avec l'assistance de l'IA (Claude Code), conformément à la mention d'origine requise par
// .claude/rules/01-usage-ia-et-conventions.md.
//
// Composant transverse « Badge / pastille » de la charte d'ergonomie (cf.
// docs/02_documentation/10_charteErgonomie.md#composants-dinterface-réutilisables) : associe une couleur sémantique
// et un libellé textuel explicite, jamais une couleur seule porteuse de sens (RNF-020, WCAG 2.1 AA). La couleur est
// un `Couleur` du Moteur de jugement (`services/sansetat/jugement/seuils-couleur.utils.ts`), jamais recalculée ici :
// ce composant ne fait que restituer un jugement déjà calculé.
import { Component, input, ChangeDetectionStrategy } from '@angular/core';
import type { InputSignal } from '@angular/core';
import type { Couleur } from '../../services/sansetat/jugement/seuils-couleur.utils';

/**
 * Pastille colorée doublée d'un libellé textuel explicite, réutilisée par tous les écrans de restitution pour
 * afficher un jugement calculé (statut, badge, classe). N'effectue elle-même aucun calcul de couleur : la couleur
 * et le libellé sont fournis tels quels par le composant appelant, déjà déterminés par le Moteur de jugement.
 */
@Component({
  selector: 'app-badge',
  templateUrl: './badge.component.html',
  changeDetection: ChangeDetectionStrategy.Eager,
  styleUrl: './badge.component.scss',
})
export class SqmBadgeComponent {
  /**
   * Couleur sémantique du badge, déjà calculée par le Moteur de jugement.
   */
  public readonly couleur: InputSignal<Couleur> = input.required<Couleur>();

  /**
   * Libellé textuel explicite associé à la couleur (jamais de couleur seule porteuse de sens, RNF-020).
   */
  public readonly libelle: InputSignal<string> = input.required<string>();
}
