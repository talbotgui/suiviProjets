// Fichier généré avec l'assistance de l'IA (Claude Code), conformément à la mention d'origine requise par
// .claude/rules/01-usage-ia-et-conventions.md.
//
// Calcule le statut IA d'un projet (RG-016) à partir de sa politique d'autorisation (`Projet.iaAutorisee`) et des
// marqueurs d'outils IA détectés par le connecteur (`ResultatGitlabMarqueursIa.marqueurs`).
/**
 *
 */
export class StatutIaUtils {
  /**
   * Calcule le statut IA d'un projet (RG-016) : un projet où l'IA est autorisée n'est jamais en violation, quel que
   * soit le nombre de marqueurs détectés (type `autorisee`) ; un projet où l'IA est interdite et sur lequel des
   * marqueurs sont détectés est en violation (type `violation`) ; un projet où l'IA est interdite et sur lequel
   * aucun marqueur n'est détecté est conforme, mais SOUS RÉSERVE explicite (type `conformeSousReserve`) : l'absence
   * de marqueur détecté ne prouve pas l'absence d'usage réel (RG-016). Cette réserve est portée par le discriminant
   * `type` du résultat lui-même plutôt que par un simple booléen `conforme: true` simplifié à l'affichage : aucun
   * texte de réserve n'est construit ici (préoccupation de restitution, propre à l'écran appelant et au composant
   * `explication-jugement`), seule la distinction structurelle entre les deux cas de conformité est de la
   * responsabilité de ce module.
   * @param iaAutorisee - Politique d'autorisation de l'IA du projet (`Projet.iaAutorisee`).
   * @param marqueursDetectes - Marqueurs d'outils IA détectés par le connecteur (`gitlab.marqueurs_ia`).
   * @returns Le statut IA calculé.
   */
  public static calculerStatutIA(
    iaAutorisee: boolean,
    marqueursDetectes: readonly MarqueurIaDetecte[],
  ): StatutIA {
    if (iaAutorisee) {
      return { type: 'autorisee', marqueursDetectes };
    }
    if (marqueursDetectes.length > 0) {
      return { type: 'violation', marqueursDetectes };
    }
    return { type: 'conformeSousReserve' };
  }
}

/**
 * Marqueur d'outil IA détecté, forme structurelle minimale consommée par ce module (mirroir structurel de
 * `Marqueur`, cf. `services/sansetat/commandes/types-facade.ts`).
 */
export interface MarqueurIaDetecte {
  /** Chemin de l'entrée détectée dans l'arborescence du dépôt. */
  readonly chemin: string;
  /** Nature de l'entrée détectée (`fichier` ou `repertoire`). */
  readonly nature: string;
  /** Outil IA associé au marqueur détecté. */
  readonly outil: string;
}

/**
 * Statut IA d'un projet (RG-016).
 */
export type StatutIA =
  | { readonly type: 'autorisee'; readonly marqueursDetectes: readonly MarqueurIaDetecte[] }
  | { readonly type: 'violation'; readonly marqueursDetectes: readonly MarqueurIaDetecte[] }
  | { readonly type: 'conformeSousReserve' };
