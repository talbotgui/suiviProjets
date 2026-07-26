// Fichier généré avec l'assistance de l'IA (Claude Code), conformément à la mention d'origine requise par
// .claude/rules/01-usage-ia-et-conventions.md.
//
// Calcule le déclenchement du badge SONAR_KO (RG-013) à partir de l'écart entre la date du dernier commit et la
// date de la dernière analyse Sonar, confronté à la tolérance courante (`parametres.seuils.fraicheurSonar`,
// `ParametresJugementUtils.lireSeuilsFraicheurSonar`).
import type { SeuilsFraicheurSonar } from './parametres-jugement.utils';

const MILLISECONDES_PAR_JOUR = 24 * 60 * 60 * 1000;

/**
 *
 */
export class BadgeSonarKoUtils {
  /**
   * Calcule l'écart en jours pleins entre deux dates ISO 8601, sans tenir compte du signe (valeur absolue).
   * L'arrondi (plutôt qu'une troncature) évite qu'un simple décalage d'heure entre deux horodatages du même jour
   * calendaire ne produise un écart artificiellement supérieur d'un jour (décision arbitraire, à valider par un
   * humain, faute de précision du texte normatif sur ce point).
   * @param dateA - Première date ISO 8601.
   * @param dateB - Seconde date ISO 8601.
   * @returns L'écart en jours entre les deux dates, valeur absolue arrondie à l'entier le plus proche.
   */
  private static calculerEcartJours(dateA: string, dateB: string): number {
    const differenceMs = new Date(dateA).getTime() - new Date(dateB).getTime();
    return Math.round(Math.abs(differenceMs) / MILLISECONDES_PAR_JOUR);
  }

  /**
   * Calcule le déclenchement du badge SONAR_KO (RG-013) : déclenché si le projet n'a jamais été analysé par Sonar,
   * ou si l'écart entre la date du dernier commit et la date de la dernière analyse Sonar dépasse strictement la
   * tolérance courante. Cas limite documenté : un écart exactement égal à la tolérance ne déclenche PAS le badge
   * (comparaison stricte `>`), cohérent avec le libellé RG-013 (« dépasse la tolérance »).
   * @param dernierCommitLe - Date ISO 8601 du dernier commit constaté sur le dépôt.
   * @param derniereAnalyseSonarLe - Date ISO 8601 de la dernière analyse Sonar, `null` si le projet n'a jamais été
   * analysé.
   * @param seuils - Tolérance de fraîcheur Sonar courante (`parametres.seuils.fraicheurSonar`).
   * @returns Le résultat du calcul du badge SONAR_KO.
   */
  public static calculerBadgeSonarKo(
    dernierCommitLe: string,
    derniereAnalyseSonarLe: string | null,
    seuils: SeuilsFraicheurSonar,
  ): ResultatBadgeSonarKo {
    if (derniereAnalyseSonarLe === null) {
      return { declenche: true, ecartJours: null };
    }
    const ecartJours = BadgeSonarKoUtils.calculerEcartJours(
      dernierCommitLe,
      derniereAnalyseSonarLe,
    );
    return { declenche: ecartJours > seuils.toleranceJours, ecartJours };
  }
}

/**
 * Résultat du calcul du badge SONAR_KO (RG-013).
 */
export interface ResultatBadgeSonarKo {
  /** `true` si le badge SONAR_KO est déclenché (grise l'ensemble des métriques Sonar de l'audit concerné). */
  readonly declenche: boolean;
  /** Écart en jours entre le dernier commit et la dernière analyse Sonar, `null` si jamais analysé. */
  readonly ecartJours: number | null;
}
