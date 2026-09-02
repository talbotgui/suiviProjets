// Fichier généré avec l'assistance de l'IA (Claude Code), conformément à la mention d'origine requise par
// .claude/rules/01-usage-ia-et-conventions.md.
//
// Sélectionne les langages principaux d'un projet audité (RG-057) à partir de la ventilation Sonar
// `ncloc_language_distribution` (lignes de code par langage), déjà collectée par le Connecteur Sonar et persistée
// dans le résultat `sonar.ncloc` (`parLangage`). Fonction pure du Moteur de jugement, sans effet de bord, jamais
// persistée : `LangagePrincipal` est une vue calculée interne recalculée à chaque affichage, sur le modèle du
// statut d'obsolescence (RG-011). Aucune I/O, aucun import depuis `services/avecetat/`.

/**
 * Langage principal d'un projet, tel que restitué en icône sur la Fiche projet et l'écran Obsolescence (RG-057).
 * Vue calculée interne, jamais persistée.
 */
export interface LangagePrincipal {
  /**
   * Clé de langage telle que renvoyée par Sonar (`ncloc_language_distribution`), par exemple `java`, `ts`, `web`.
   */
  readonly cleSonar: string;

  /**
   * Part du langage dans le total des lignes de code du projet, en pourcentage entier (0 à 100), arrondi.
   */
  readonly pourcentage: number;
}

/**
 * Utilitaires de sélection des langages principaux d'un projet à partir de la ventilation Sonar par langage
 * (RG-057). Classe à membres statiques uniquement (règle « aucune fonction hors classe »).
 */
export class LangagesPrincipauxUtils {
  /**
   * Part minimale du total des lignes de code (borne incluse) pour qu'un second langage soit restitué (RG-057) :
   * un second langage pesant strictement moins de 10 % du total n'est pas affiché. Constante de présentation
   * nommée dans le code — décision arbitraire à valider par un humain (cf. rapport de développement) ; la norme
   * « aucun seuil codé en dur » vise les seuils de jugement lus depuis `parametres`/`referentiels`.
   */
  public static readonly SEUIL_SECOND_LANGAGE = 0.1;

  /**
   * Nombre maximal de langages restitués (RG-057). Constante de présentation nommée dans le code — décision
   * arbitraire à valider par un humain (cf. rapport de développement).
   */
  public static readonly NOMBRE_MAX_LANGAGES = 2;

  /**
   * Sélectionne les langages principaux d'un projet à partir de la ventilation Sonar `ncloc_language_distribution`
   * (RG-057). Les entrées de valeur nulle ou négative sont ignorées ; le tri est par lignes de code décroissantes
   * puis, à égalité stricte, par ordre alphabétique croissant de la clé Sonar (déterminisme du rendu et des
   * tests). Au plus {@link NOMBRE_MAX_LANGAGES} langages sont retenus ; le second est omis si sa part est
   * strictement inférieure à {@link SEUIL_SECOND_LANGAGE} du total. Une ventilation vide, entièrement nulle ou de
   * total nul produit une liste vide.
   * @param parLangage - Répartition brute `{ clé Sonar → lignes de code }` (`ResultatSonarNcloc.parLangage`).
   * @returns 0 à {@link NOMBRE_MAX_LANGAGES} entrées, la plus volumineuse d'abord.
   */
  public static selectionner(
    parLangage: Readonly<Record<string, number>>,
  ): readonly LangagePrincipal[] {
    // Départage par comparaison relationnelle brute des clés (jamais `localeCompare`, dont l'ordre dépend de la
    // locale de l'hôte) : le rendu et le test de bout en bout doivent rester rejouables à l'identique (RG-057).
    const entreesTriees: readonly (readonly [string, number])[] = Object.entries(parLangage)
      .filter(([, lignes]) => lignes > 0)
      .sort(([cleA, lignesA], [cleB, lignesB]) => {
        if (lignesA !== lignesB) {
          return lignesB - lignesA;
        }
        // Les clés d'un `Record` sont toujours distinctes : le cas d'égalité n'est pas atteignable ici.
        return cleA < cleB ? -1 : 1;
      });

    // Après le filtre `lignes > 0`, un total nul équivaut à une ventilation sans aucune entrée exploitable.
    const total: number = entreesTriees.reduce((somme, [, lignes]) => somme + lignes, 0);
    if (total === 0) {
      return [];
    }

    const langages: LangagePrincipal[] = [];
    entreesTriees
      .slice(0, LangagesPrincipauxUtils.NOMBRE_MAX_LANGAGES)
      .forEach(([cleSonar, lignes], index) => {
        if (index === 1 && lignes / total < LangagesPrincipauxUtils.SEUIL_SECOND_LANGAGE) {
          return;
        }
        langages.push({ cleSonar, pourcentage: Math.round((lignes / total) * 100) });
      });
    return langages;
  }
}
