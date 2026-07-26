// Fichier généré avec l'assistance de l'IA (Claude Code), conformément à la mention d'origine requise par
// .claude/rules/01-usage-ia-et-conventions.md.
//
// Calcule la classe de taille d'un dépôt (S/M/L/XL) à partir des bornes `parametres.seuils.tailleDepot`
// (`ParametresJugementUtils.lireSeuilsTailleDepot`).
import type { SeuilsTailleDepot } from './parametres-jugement.utils';

/**
 *
 */
export class ClasseTailleUtils {
  /**
   * Calcule la classe de taille d'un dépôt à partir de sa taille en octets et des bornes courantes de
   * `parametres.seuils.tailleDepot`. Cas limite documenté : une taille exactement égale à une borne appartient à
   * la classe inférieure (comparaison `<=`), symétrique de la convention retenue par
   * `ExempleReferenceUtils.atteintLeSeuil` (`>=`) — décision arbitraire, à valider par un humain, faute de précision
   * du texte normatif sur le comportement de bord.
   * @param tailleOctets - Taille constatée du dépôt, en octets.
   * @param bornes - Bornes de classe courantes (`parametres.seuils.tailleDepot`).
   * @returns La classe de taille du dépôt.
   */
  public static calculerClasseTaille(
    tailleOctets: number,
    bornes: SeuilsTailleDepot,
  ): ClasseTailleDepot {
    if (tailleOctets <= bornes.borneS) {
      return 'S';
    }
    if (tailleOctets <= bornes.borneL) {
      return 'M';
    }
    if (tailleOctets <= bornes.borneXL) {
      return 'L';
    }
    return 'XL';
  }
}

/**
 * Classe de taille d'un dépôt.
 */
export type ClasseTailleDepot = 'S' | 'M' | 'L' | 'XL';
