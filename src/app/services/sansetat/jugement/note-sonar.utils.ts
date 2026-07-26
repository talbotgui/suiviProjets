// Fichier généré avec l'assistance de l'IA (Claude Code), conformément à la mention d'origine requise par
// .claude/rules/01-usage-ia-et-conventions.md.
//
// Convertit une note Sonar numérique (`sonar.notes.{fiabilite,securite,maintenabilite,revueSecurite}`, valeur
// 1.0–5.0) en lettre colorée A–E, conformément à `docs/01_besoin/Specification.md#55-f05--audits-et-catalogue-des-
// indicateurs` (« Notes A–E des quatre axes, stockées séparément → Lettres colorées A=vert … E=rouge ») et au
// commentaire de `ResultatSonarNotes` (`services/sansetat/commandes/types-facade.ts` : « stockées en valeur
// numérique 1.0–5.0, la conversion en lettre colorée relevant du Moteur de jugement (RG-011) »).
//
// Décision arbitraire (à valider par un humain, cf. rapport de développement de cet incrément) : module non nommé
// explicitement par le plan de la Phase 6 (seul `badge-audit-ancien.utils.ts` y est cité pour cet incrément), mais
// nécessaire à la couverture de la colonne « Notes Sonar » de l'écran Synthèse des audits (US-015). La répartition
// retenue entre les cinq couleurs A–E, faute de mapping chiffré fourni par un texte normatif au-delà du gradient
// littéral « A=vert … E=rouge », reprend exactement l'exemple illustré par la maquette de référence (`docs/01_besoin/
// Suivi Qualimetrie.dc.html`, fonction `buildSyntheseRows` : notes B systématiquement vertes, C orange, D rouge) :
// A et B vertes, C orange, D et E rouges.
import type { Couleur } from './seuils-couleur.utils';

/**
 * Lettres du barème Sonar, dans l'ordre croissant de gravité (index 0 = note 1.0 = A).
 */
const LETTRES_NOTE_SONAR: readonly string[] = ['A', 'B', 'C', 'D', 'E'];

/**
 *
 */
export class NoteSonarUtils {
  /**
   * Convertit une note Sonar numérique (1.0–5.0) en lettre colorée A–E (cf. commentaire d'en-tête). Une valeur hors
   * bornes ou non entière est arrondie puis bornée à l'intervalle `[1, 5]` plutôt que de produire une lettre
   * invalide, cette robustesse étant nécessaire dès lors que la note est lue comme une donnée JSON générique
   * (`ParametresJugementUtils` n'intervenant pas ici : `sonar.notes` appartient au catalogue figé des résultats,
   * déjà typé strictement en nombre depuis la Phase 6 incrément 1, mais sans garantie qu'un document historique ou
   * édité à la main respecte les bornes 1.0–5.0).
   * @param valeur - Note Sonar numérique constatée (`sonar.notes.fiabilite`/`securite`/`maintenabilite`/
   * `revueSecurite`).
   * @returns La lettre et la couleur correspondantes.
   */
  public static calculerNoteLettre(valeur: number): ResultatNoteSonar {
    const indice = Math.min(Math.max(Math.round(valeur), 1), 5) - 1;
    const lettre = LETTRES_NOTE_SONAR[indice];
    return { lettre, couleur: NoteSonarUtils.calculerCouleur(lettre) };
  }

  /**
   * Détermine la couleur sémantique associée à une lettre A–E (cf. commentaire d'en-tête : A/B vertes, C orange,
   * D/E rouges).
   * @param lettre - Lettre du barème Sonar (A–E).
   * @returns La couleur sémantique correspondante.
   */
  private static calculerCouleur(lettre: string): Couleur {
    if (lettre === 'A' || lettre === 'B') {
      return 'vert';
    }
    if (lettre === 'C') {
      return 'orange';
    }
    return 'rouge';
  }
}

/**
 * Résultat du calcul de lettre colorée d'une note Sonar.
 */
export interface ResultatNoteSonar {
  /** Lettre du barème Sonar (A–E). */
  readonly lettre: string;
  /** Couleur sémantique associée à cette lettre. */
  readonly couleur: Couleur;
}
