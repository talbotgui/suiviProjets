// Fichier généré avec l'assistance de l'IA (Claude Code), conformément à la mention d'origine requise par
// .claude/rules/01-usage-ia-et-conventions.md.
//
// Détection des valeurs aberrantes d'un brouillon de campagne (RG-020, Phase 5, incrément 4), par comparaison avec
// le dernier audit intégré du même projet (`docs/01_besoin/Specification.md#59-f09--brouillon-daudit-et-
// validation-avant-intégration` : « taille ×10, ncloc divisé par deux, couverture 60 % → 0 % — symptômes d'une
// mauvaise ref ou d'un projet Sonar réassigné »).
//
// Décision arbitraire (cf. rapport de développement de cette phase, session de clarification validée par
// l'utilisateur) : seuls les 3 indicateurs explicitement documentés sont couverts. Chaque règle est dérivée de
// l'unique seuil déjà paramétrable existant, `parametres.seuils.materialiteBrouillon.variationRelative` (m = 0,1
// dans `docs/01_besoin/exemple-donnees.json`), sans nouvelle clé de paramétrage : seule la *forme* de chaque règle
// est codée ici, la valeur numérique qu'elle consomme (m) reste lue depuis le paramétrage par l'appelant
// (`OrchestrateurCampagneService`).
//   - `gitlab.taille_depot` : ratio nouvelle/ancienne valeur ≥ 1/m ou ≤ m (×10 / ÷10 avec m=0,1, conforme à
//     l'exemple de la Spec).
//   - `sonar.ncloc` : ratio ≥ 1/(5m) ou ≤ 5m (×2 / ÷2 avec m=0,1, conforme à l'exemple « divisé par deux »).
//   - `sonar.couverture` : nouvelle valeur ≤ m × ancienne valeur (perte d'au moins 90 %, conforme à l'exemple
//     « 60 % → 0 % ») ; pas de borne haute, non documentée.
// Aucun jugement de gravité n'est calculé (RG-011) : seul le constat brut (indicateur, ancienne valeur, nouvelle
// valeur) est produit, à charge du Moteur de jugement (Phase 6) d'en tirer un message affiché.

/**
 * Constat brut d'une variation aberrante détectée pour un indicateur d'un projet (RG-020), mirroir de la forme
 * attendue par `Brouillon.resultatsParProjet[].aberrations` côté cœur natif (`Vec<Value>`, volontairement non typé
 * avant le Moteur de jugement, Phase 6).
 */
export interface Aberration {
  /** Indicateur du catalogue figé concerné par la variation aberrante. */
  readonly indicateur: 'gitlab.taille_depot' | 'sonar.ncloc' | 'sonar.couverture';
  /** Valeur constatée lors du dernier audit intégré du projet. */
  readonly ancienneValeur: number;
  /** Valeur constatée lors du nouvel audit, en attente de validation dans le brouillon. */
  readonly nouvelleValeur: number;
}

/**
 * Valeurs des 3 indicateurs couverts par RG-020, extraites par l'appelant d'un audit (ancien ou nouveau) ;
 * absente si l'indicateur correspondant n'a pas pu être obtenu pour cet audit.
 */
export interface ValeursComparablesAberration {
  /** Taille du dépôt en octets (`gitlab.taille_depot.tailleOctets`). */
  readonly tailleOctets?: number;
  /** Volume de code (`sonar.ncloc.ncloc`). */
  readonly ncloc?: number;
  /** Couverture de tests (`sonar.couverture.couverture`). */
  readonly couverture?: number;
}

/**
 * Détection des valeurs aberrantes d'un projet (RG-020) : classe utilitaire à membres statiques uniquement, sur le
 * gabarit `ExempleReferenceUtils`. Chaque méthode reste pure, sans effet de bord.
 */
export class AberrationUtils {
  /**
   * Détecte les variations aberrantes d'un projet, par comparaison entre les valeurs du dernier audit intégré et
   * celles du nouvel audit en attente de validation (RG-020).
   * @param ancien - Valeurs extraites du dernier audit intégré du projet, absentes si aucun audit n'a encore été
   * intégré (premier audit du projet : aucune comparaison possible).
   * @param nouveau - Valeurs extraites du nouvel audit en attente de validation.
   * @param variationRelative - Seuil de matérialité paramétrable (`parametres.seuils.materialiteBrouillon.
   * variationRelative`), seule valeur numérique consommée par les 3 règles ci-dessus.
   * @returns Les variations aberrantes détectées, tableau vide si aucune.
   */
  public static detecterAberrations(
    ancien: ValeursComparablesAberration | undefined,
    nouveau: ValeursComparablesAberration,
    variationRelative: number,
  ): readonly Aberration[] {
    const aberrations: readonly (Aberration | undefined)[] = [
      this.evaluerRatio(
        'gitlab.taille_depot',
        ancien?.tailleOctets,
        nouveau.tailleOctets,
        1 / variationRelative,
        variationRelative,
      ),
      this.evaluerRatio(
        'sonar.ncloc',
        ancien?.ncloc,
        nouveau.ncloc,
        1 / (5 * variationRelative),
        5 * variationRelative,
      ),
      this.evaluerCouverture(ancien?.couverture, nouveau.couverture, variationRelative),
    ];
    return aberrations.filter((aberration): aberration is Aberration => aberration !== undefined);
  }

  /**
   * Évalue une règle d'aberration fondée sur un ratio nouvelle/ancienne valeur, commune à `gitlab.taille_depot` et
   * `sonar.ncloc`. Ignore silencieusement la comparaison si l'une des deux valeurs est absente, ou si l'ancienne
   * valeur est nulle ou négative (ratio non significatif).
   * @param indicateur - Indicateur concerné.
   * @param ancienneValeur - Valeur du dernier audit intégré, absente si non obtenue ou premier audit.
   * @param nouvelleValeur - Valeur du nouvel audit, absente si non obtenue.
   * @param borneHaute - Ratio à partir duquel une hausse est jugée aberrante.
   * @param borneBasse - Ratio en dessous duquel une baisse est jugée aberrante.
   * @returns Le constat d'aberration si le ratio franchit l'une des deux bornes, `undefined` sinon.
   */
  private static evaluerRatio(
    indicateur: 'gitlab.taille_depot' | 'sonar.ncloc',
    ancienneValeur: number | undefined,
    nouvelleValeur: number | undefined,
    borneHaute: number,
    borneBasse: number,
  ): Aberration | undefined {
    if (ancienneValeur === undefined || nouvelleValeur === undefined || ancienneValeur <= 0) {
      return undefined;
    }
    const ratio = nouvelleValeur / ancienneValeur;
    if (ratio >= borneHaute || ratio <= borneBasse) {
      return { indicateur, ancienneValeur, nouvelleValeur };
    }
    return undefined;
  }

  /**
   * Évalue la règle d'aberration propre à `sonar.couverture` (perte d'au moins `1 - variationRelative` de la
   * couverture). Ignore silencieusement la comparaison si l'une des deux valeurs est absente, ou si l'ancienne
   * valeur est nulle ou négative (rien à perdre : une couverture déjà nulle qui le reste n'est pas une aberration).
   * @param ancienneValeur - Couverture du dernier audit intégré, absente si non obtenue ou premier audit.
   * @param nouvelleValeur - Couverture du nouvel audit, absente si non obtenue.
   * @param variationRelative - Seuil de matérialité paramétrable.
   * @returns Le constat d'aberration si la nouvelle valeur s'effondre, `undefined` sinon.
   */
  private static evaluerCouverture(
    ancienneValeur: number | undefined,
    nouvelleValeur: number | undefined,
    variationRelative: number,
  ): Aberration | undefined {
    if (ancienneValeur === undefined || nouvelleValeur === undefined || ancienneValeur <= 0) {
      return undefined;
    }
    if (nouvelleValeur <= variationRelative * ancienneValeur) {
      return { indicateur: 'sonar.couverture', ancienneValeur, nouvelleValeur };
    }
    return undefined;
  }
}
