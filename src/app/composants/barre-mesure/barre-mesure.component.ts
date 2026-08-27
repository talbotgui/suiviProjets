// Fichier généré avec l'assistance de l'IA (Claude Code), conformément à la mention d'origine requise par
// .claude/rules/01-usage-ia-et-conventions.md.
//
// Composant transverse « Barre de mesure » de l'écran Obsolescence (US-051) : une ligne compacte associant un sigle
// de trois lettres, une barre horizontale sur rail sombre dont la longueur encode la valeur, et la valeur numérique
// alignée à droite. La valeur numérique est TOUJOURS affichée (jamais la seule longueur/teinte porteuse de sens,
// RNF-020) ; une valeur absente est rendue par un tiret et une barre vide. N'effectue aucun calcul d'indicateur :
// la valeur, son maximum et la teinte lui sont fournis tels quels par l'écran appelant.
import { Component, computed, input, ChangeDetectionStrategy } from '@angular/core';
import type { InputSignal, Signal } from '@angular/core';

/**
 * Ligne « sigle + barre + valeur » réutilisable, sans logique métier.
 */
@Component({
  selector: 'app-barre-mesure',
  templateUrl: './barre-mesure.component.html',
  changeDetection: ChangeDetectionStrategy.OnPush,
  styleUrl: './barre-mesure.component.scss',
})
export class SqmBarreMesureComponent {
  /** Sigle de trois lettres au plus identifiant l'indicateur (colonne compacte). */
  public readonly sigle: InputSignal<string> = input.required<string>();

  /** Valeur de l'indicateur, ou `null` si aucune valeur n'est disponible pour ce projet et cette catégorie. */
  public readonly valeur: InputSignal<number | null> = input.required<number | null>();

  /** Valeur maximale de l'indicateur (bornes de la barre) ; `0` produit une barre vide. */
  public readonly valeurMax: InputSignal<number> = input.required<number>();

  /** Couleur CSS de la barre (teinte propre à l'indicateur, constante d'une vue à l'autre). */
  public readonly couleur: InputSignal<string> = input.required<string>();

  /**
   * Largeur de la barre, en pourcentage du rail, bornée à `[0, 100]`.
   * @returns Le pourcentage de remplissage.
   */
  public readonly pourcentage: Signal<number> = computed(() => {
    const valeur = this.valeur();
    const max = this.valeurMax();
    if (valeur === null || max <= 0) {
      return 0;
    }
    return Math.max(0, Math.min(100, (valeur / max) * 100));
  });

  /**
   * Texte de la valeur affichée à droite de la barre.
   * @returns La valeur formatée, ou un tiret si elle est absente.
   */
  public readonly valeurAffichee: Signal<string> = computed(() => {
    const valeur = this.valeur();
    return valeur === null ? '—' : String(valeur);
  });
}
