// Fichier généré avec l'assistance de l'IA (Claude Code), conformément à la mention d'origine requise par
// .claude/rules/01-usage-ia-et-conventions.md.
//
// Tri alphabétique insensible à la casse (RG applicable aux listes déroulantes de groupes/projets de tous les
// formulaires) : sensibilité `accent` de `localeCompare`, qui ignore la casse tout en respectant les distinctions
// d'accentuation propres au tri alphabétique français.

/**
 * Élément triable par ce module : tout objet porteur d'un champ `nom` textuel.
 */
export interface ElementNomme {
  /** Nom affiché de l'élément, utilisé comme clé de tri. */
  readonly nom: string;
}

/**
 * Fonctions de tri alphabétique insensible à la casse, réutilisables aussi bien sur des éléments nommés
 * ({@link comparerParNom}/{@link trierParNom}) que sur deux textes isolés ({@link comparerTextes}, ex. un champ
 * autre que `nom`, comme `nomProjet` de la Synthèse des audits).
 */
export class TriAlphabetiqueUtils {
  /**
   * Compare deux textes par ordre alphabétique insensible à la casse (sensibilité `accent` de `localeCompare`,
   * cf. commentaire d'en-tête de ce fichier).
   * @param a - Premier texte à comparer.
   * @param b - Second texte à comparer.
   * @returns Résultat de comparaison au sens de `Array.prototype.sort`.
   */
  public static comparerTextes(a: string, b: string): number {
    return a.localeCompare(b, undefined, { sensitivity: 'accent' });
  }

  /**
   * Compare deux éléments nommés par ordre alphabétique insensible à la casse.
   * @param a - Premier élément à comparer.
   * @param b - Second élément à comparer.
   * @returns Résultat de comparaison au sens de `Array.prototype.sort`.
   */
  public static comparerParNom<T extends ElementNomme>(a: T, b: T): number {
    return TriAlphabetiqueUtils.comparerTextes(a.nom, b.nom);
  }

  /**
   * Retourne une copie triée par nom (ordre alphabétique insensible à la casse) d'une liste d'éléments nommés,
   * sans muter le tableau d'origine.
   * @param elements - Éléments à trier.
   * @returns Nouveau tableau trié.
   */
  public static trierParNom<T extends ElementNomme>(elements: readonly T[]): readonly T[] {
    return elements.slice().sort((a, b) => TriAlphabetiqueUtils.comparerParNom(a, b));
  }
}
