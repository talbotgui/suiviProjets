// Fichier généré avec l'assistance de l'IA (Claude Code), conformément à la mention d'origine requise par
// .claude/rules/01-usage-ia-et-conventions.md.
//
// Construction mutualisée du nom de fichier suggéré lors de l'export PNG d'un écran (US-047/RG-047, C15-15,
// arbitrage humain du 2026-08-18) : normalisation d'un nom de projet en fragment de nom de fichier valide
// (`SqmFicheProjetComponent`, `SqmComparaisonAuditsComponent`, seuls écrans du gabarit d'export PNG rattachés à un
// unique projet) et construction d'un horodatage complet `AAAA-MM-JJ_HH-mm-ss` (les quatre écrans du gabarit,
// `SqmSyntheseAuditsComponent`/`SqmSyntheseGraphiqueComponent` inclus, qui conservent en revanche leur préfixe
// générique sans nom d'entité).
//
// Suppression des diacritiques : reprise à l'identique du patron déjà établi par `IndexRechercheUtils.
// replierAccents` (`services/avecetat/recherche/index-recherche.utils.ts`, ligne ~333, décomposition Unicode NFD
// puis filtrage des marques diacritiques combinantes U+0300–U+036F), dupliquée ici plutôt qu'importée : ce module
// relève du Moteur de jugement (`services/sansetat/jugement/`), qui ne dépend jamais de `services/avecetat/`
// (`docs/02_documentation/14_normesDeveloppement.md#structuration-du-code-et-découpage-en-couches`).

/**
 * Utilitaires purs de construction du nom de fichier suggéré lors de l'export PNG d'un écran (US-047/RG-047).
 */
export class ExportImageUtils {
  /** Borne inférieure (incluse) du bloc Unicode des marques diacritiques combinantes (U+0300). */
  private static readonly DEBUT_MARQUES_DIACRITIQUES = 0x0300;

  /** Borne supérieure (incluse) du bloc Unicode des marques diacritiques combinantes (U+036F). */
  private static readonly FIN_MARQUES_DIACRITIQUES = 0x036f;

  /**
   * Caractères interdits ou déconseillés dans un nom de fichier multiplateforme (`/ \ : * ? " < > |`), ainsi que
   * tout espace : remplacés par le séparateur neutre {@link SEPARATEUR}.
   */
  private static readonly CARACTERES_A_REMPLACER = /[/\\:*?"<>|\s]+/g;

  /** Séparateur neutre de repli pour tout caractère interdit/déconseillé ou espace. */
  private static readonly SEPARATEUR = '-';

  /** Longueur maximale du nom de projet normalisé inséré dans le nom de fichier (décision arbitraire, C15-15). */
  private static readonly LONGUEUR_MAX_NOM_PROJET = 50;

  /**
   * Mot générique de repli lorsque le nom de projet normalisé ne contient plus aucun caractère alphanumérique
   * valide (décision arbitraire, C15-15).
   */
  private static readonly NOM_PROJET_REPLI = 'projet';

  /**
   * Replie les accents d'une chaîne (décomposition Unicode NFD, qui sépare chaque lettre accentuée en une lettre de
   * base suivie d'une marque diacritique combinante, puis suppression de ces seules marques). Reprise à l'identique
   * du patron de `IndexRechercheUtils.replierAccents` (cf. commentaire d'en-tête de ce fichier).
   * @param valeur - Chaîne à traiter.
   * @returns La chaîne sans accents.
   */
  private static replierAccents(valeur: string): string {
    return Array.from(valeur.normalize('NFD'))
      .filter((caractere) => {
        const codePoint = caractere.codePointAt(0) ?? 0;
        return (
          codePoint < ExportImageUtils.DEBUT_MARQUES_DIACRITIQUES ||
          codePoint > ExportImageUtils.FIN_MARQUES_DIACRITIQUES
        );
      })
      .join('');
  }

  /**
   * Complète un nombre à deux chiffres par un zéro non significatif si nécessaire.
   * @param valeur - Nombre à mettre en forme.
   * @returns Le nombre mis en forme sur deux chiffres au moins.
   */
  private static deuxChiffres(valeur: number): string {
    return valeur.toString().padStart(2, '0');
  }

  /**
   * Normalise un nom de projet en fragment de nom de fichier valide et lisible (RG-047) : suppression des
   * diacritiques, remplacement des caractères interdits/déconseillés et des espaces par un tiret, réduction des
   * tirets consécutifs à un seul, suppression des tirets en début/fin de chaîne, troncature à
   * {@link LONGUEUR_MAX_NOM_PROJET} caractères. Repli sur {@link NOM_PROJET_REPLI} si le résultat ne contient plus
   * aucun caractère alphanumérique (ex. nom de projet entièrement composé de symboles).
   * @param nomProjet - Nom de projet à normaliser (`Projet.nom`).
   * @returns Le fragment de nom de fichier normalisé, jamais vide.
   */
  public static normaliserNomProjet(nomProjet: string): string {
    const sansAccents = ExportImageUtils.replierAccents(nomProjet);
    const normalise = sansAccents
      .replace(ExportImageUtils.CARACTERES_A_REMPLACER, ExportImageUtils.SEPARATEUR)
      .replace(/-+/g, ExportImageUtils.SEPARATEUR)
      .replace(/^-+|-+$/g, '');

    if (!/[0-9A-Za-z]/.test(normalise)) {
      return ExportImageUtils.NOM_PROJET_REPLI;
    }

    return normalise.slice(0, ExportImageUtils.LONGUEUR_MAX_NOM_PROJET).replace(/-+$/g, '');
  }

  /**
   * Construit un horodatage complet `AAAA-MM-JJ_HH-mm-ss`, zéro-paddé, à partir d'une date (RG-047) : remplace
   * l'expression `new Date().toISOString().slice(0, 10)` précédemment dupliquée à l'identique dans les quatre
   * écrans du gabarit d'export PNG, qui ne portait que la date calendaire et exposait donc à un écrasement silencieux
   * de nom en cas de second export du même écran le même jour.
   * @param date - Date de référence (permet des tests déterministes).
   * @returns L'horodatage complet correspondant.
   */
  public static construireHorodatage(date: Date): string {
    return (
      `${date.getFullYear()}-${ExportImageUtils.deuxChiffres(date.getMonth() + 1)}-` +
      `${ExportImageUtils.deuxChiffres(date.getDate())}_${ExportImageUtils.deuxChiffres(date.getHours())}-` +
      `${ExportImageUtils.deuxChiffres(date.getMinutes())}-${ExportImageUtils.deuxChiffres(date.getSeconds())}`
    );
  }
}
