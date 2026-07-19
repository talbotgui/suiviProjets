// Fichier de référence exemplaire (gabarit) pour toute future classe utilitaire à membres statiques uniquement de
// ce projet (ex. fonctions pures du Moteur de jugement, cf. docs/02_documentation/14_normesDeveloppement.md).
// Cette classe n'est utilisée par aucun calcul réel : elle sert uniquement de modèle à reproduire. Généré avec
// l'assistance de l'IA (Claude Code), conformément à .claude/rules/01-usage-ia-et-conventions.md.
//
// Point de vigilance documenté (cf. norme citée ci-dessus, rubrique « Rigueur du typage — TypeScript ») : le
// regroupement de fonctions utilitaires en classes à membres statiques uniquement est une divergence assumée par
// rapport à la valeur par défaut recommandée par `@typescript-eslint/no-extraneous-class` (`allowStaticOnly:
// false`) ; elle est explicitement autorisée par la configuration ESLint du projet (`eslint.config.js`).

/**
 * Classe utilitaire de référence illustrant les conventions attendues pour toute classe utilitaire à membres
 * statiques uniquement du projet : aucune fonction déclarée hors classe, chaque méthode reste pure (résultat ne
 * dépendant que de ses paramètres, sans effet de bord), visibilité et type de retour explicites, documentation
 * JSDoc systématique.
 * Cette classe est un gabarit : elle n'est utilisée par aucun calcul réel de l'application.
 */
export class ExempleReferenceUtils {
  /**
   * Additionne deux nombres entiers, à titre d'exemple de fonction pure sans effet de bord.
   * @param a - Premier terme de l'addition.
   * @param b - Second terme de l'addition.
   * @returns La somme de `a` et `b`.
   */
  public static additionner(a: number, b: number): number {
    return a + b;
  }

  /**
   * Indique si une valeur atteint ou dépasse un seuil donné, à titre d'exemple de calcul de statut à partir d'un
   * seuil provenant en réalité toujours des référentiels/paramètres (jamais codé en dur, cf. RG-023).
   * @param valeur - Valeur constatée à comparer au seuil.
   * @param seuil - Seuil de référence, jamais codé en dur en conditions réelles.
   * @returns `true` si `valeur` est supérieure ou égale à `seuil`, `false` sinon.
   */
  public static atteintLeSeuil(valeur: number, seuil: number): boolean {
    return valeur >= seuil;
  }
}
