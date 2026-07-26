// Fichier généré avec l'assistance de l'IA (Claude Code), conformément à la mention d'origine requise par
// .claude/rules/01-usage-ia-et-conventions.md.
//
// Calcule la conformité de nommage d'une branche (RG-030) par recalcul systématique depuis `Branche.nom` et le
// motif courant `referentiels.motifNommageBranches` (`ParametresJugementUtils.lireMotifNommageBranches`), jamais
// depuis un champ persisté (ce champ n'existe d'ailleurs plus, cf. incrément de rattrapage de la Phase 5 précédant
// la Phase 6).
/**
 *
 */
export class NommageBrancheUtils {
  /**
   * Calcule la conformité de nommage d'une branche (RG-030) : confronte `nomBranche` au motif d'expression
   * régulière courant `referentiels.motifNommageBranches`. Le motif étant une donnée paramétrable par
   * l'utilisateur (écran de paramétrage, Phase 7), sa compilation en expression régulière est protégée : un motif
   * syntaxiquement invalide restitue un type `motifInvalide` distinct plutôt que de lever une exception non
   * maîtrisée jusqu'à l'écran appelant. Cas limite documenté : un motif vide (`''`) est une expression régulière
   * valide qui correspond à tout nom de branche (`nonConforme` n'est alors jamais atteint) — comportement de bord
   * assumé, à valider par un humain.
   * @param nomBranche - Nom de la branche constatée (`Branche.nom`).
   * @param motifNommageBranches - Motif d'expression régulière courant (`referentiels.motifNommageBranches`).
   * @returns Le résultat du calcul de conformité de nommage.
   */
  public static calculerNommageBranche(
    nomBranche: string,
    motifNommageBranches: string,
  ): ResultatNommageBranche {
    let expression: RegExp;
    try {
      expression = new RegExp(motifNommageBranches);
    } catch {
      return { type: 'motifInvalide' };
    }
    return expression.test(nomBranche) ? { type: 'conforme' } : { type: 'nonConforme' };
  }
}

/**
 * Résultat du calcul de conformité de nommage d'une branche (RG-030).
 */
export type ResultatNommageBranche =
  | { readonly type: 'conforme' }
  | { readonly type: 'nonConforme' }
  | { readonly type: 'motifInvalide' };
