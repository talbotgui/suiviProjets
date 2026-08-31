// Fichier généré avec l'assistance de l'IA (Claude Code), conformément à la mention d'origine requise par
// .claude/rules/01-usage-ia-et-conventions.md.
//
// Utilitaires de présentation d'une taille de fichier : mise en forme d'un nombre d'octets en mégaoctets (registre
// français) et ventilation en pourcentages entiers de somme garantie égale à 100 (méthode du plus fort reste).
// Partagé par l'onglet « Purge des audits » de l'écran Paramétrage (US-025) et l'onglet « Métriques » de l'écran
// Administration (US-055, RG-055). Classe à membres statiques uniquement (règle « aucune fonction hors classe »,
// cf. .claude/rules/09-normes-developpement.md).

/**
 * Cinq pourcentages entiers de la ventilation du poids du JSON en clair (RG-055), de somme exactement 100.
 */
export interface VentilationPourcentages {
  /** Part de `parametres` + `referentiels` + `vuesEnregistrees`, en pourcentage entier. */
  readonly parametrage: number;
  /** Part de `journal`, en pourcentage entier. */
  readonly journal: number;
  /** Part des enveloppes d'administration (hors audits), en pourcentage entier. */
  readonly administration: number;
  /** Part des audits (+ campagnes + brouillon), en pourcentage entier. */
  readonly audits: number;
  /** Part résiduelle, en pourcentage entier. */
  readonly autre: number;
}

/**
 * Utilitaires de présentation d'une taille de fichier.
 */
export class TailleFichierUtils {
  /**
   * Met en forme une taille en octets en mégaoctets, une décimale, registre français (virgule décimale).
   * @param octets - Taille en octets.
   * @returns Le texte affichable (ex. `2,4 Mo`).
   */
  public static formaterMegaOctets(octets: number): string {
    const megaOctets = octets / 1_000_000;
    return `${megaOctets.toFixed(1).replace('.', ',')} Mo`;
  }

  /**
   * Convertit cinq tailles brutes (octets) en cinq pourcentages entiers de somme exactement 100, par la méthode du
   * plus fort reste (*largest remainder*) : chaque part est d'abord tronquée à l'entier inférieur, puis les unités
   * manquantes pour atteindre 100 sont attribuées aux parts dont la fraction décimale est la plus élevée. Renvoie
   * cinq zéros si le total est nul ou négatif.
   * @param parametrage - Poids du poste « paramétrage » (octets).
   * @param journal - Poids du poste « journal » (octets).
   * @param administration - Poids du poste « administration » (octets).
   * @param audits - Poids du poste « audits » (octets).
   * @param autre - Poids du poste « autre » (octets).
   * @returns Les cinq pourcentages entiers, de somme 100 (ou cinq zéros si le total est nul).
   */
  public static ventilationPourcentages(
    parametrage: number,
    journal: number,
    administration: number,
    audits: number,
    autre: number,
  ): VentilationPourcentages {
    const brutes: readonly number[] = [parametrage, journal, administration, audits, autre];
    const total = brutes.reduce((cumul, valeur) => cumul + Math.max(0, valeur), 0);
    if (total <= 0) {
      return { parametrage: 0, journal: 0, administration: 0, audits: 0, autre: 0 };
    }

    const exacts = brutes.map((valeur) => (Math.max(0, valeur) / total) * 100);
    const planchers = exacts.map((valeur) => Math.floor(valeur));
    let reste = 100 - planchers.reduce((cumul, valeur) => cumul + valeur, 0);

    const parFractionDecroissante = exacts
      .map((valeur, index) => ({ index, fraction: valeur - Math.floor(valeur) }))
      .sort((a, b) => b.fraction - a.fraction);

    const pourcentages = [...planchers];
    for (const { index } of parFractionDecroissante) {
      if (reste <= 0) {
        break;
      }
      pourcentages[index] += 1;
      reste -= 1;
    }

    return {
      parametrage: pourcentages[0],
      journal: pourcentages[1],
      administration: pourcentages[2],
      audits: pourcentages[3],
      autre: pourcentages[4],
    };
  }
}
