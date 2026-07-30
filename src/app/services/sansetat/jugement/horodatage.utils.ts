// Fichier généré avec l'assistance de l'IA (Claude Code), conformément à la mention d'origine requise par
// .claude/rules/01-usage-ia-et-conventions.md.
//
// Mise en forme partagée d'un horodatage ISO 8601 (Phase 10, incrément 6, R10-13) : `formaterHorodatage` était
// dupliquée à l'identique dans `SqmShellComponent` et `SqmAccueilComponent` (libellé court `JJ/MM HH:mm`, sur le
// modèle de la maquette de référence, barre supérieure : « sauvegardé 08/07 17:45 »), et redéfinie sous le même nom
// avec un format différent (`AAAA-MM-JJ`, repli `—` si absent) dans `SqmListeTravailComponent`.
//
// Décision arbitraire de placement (à valider par un humain, cf. rapport de développement de cet incrément) : ce
// module ne calcule aucun indicateur/statut/badge et n'est donc pas, à proprement parler, du Moteur de jugement au
// sens strict du reste de ce dossier (cf. `services/sansetat/jugement/README.md`) ; il est néanmoins placé ici plutôt
// que dans un nouveau sous-dossier dédié, faute d'un tel bucket « constantes/fonctions partagées transverses »
// existant à ce jour dans la structure documentée (`docs/02_documentation/14_normesDeveloppement.md#structuration-
// du-code-et-découpage-en-couches` : seuls `jugement`/`commandes` sont énumérés sous `services/sansetat/`), et sur
// le modèle déjà établi de `changement-seuil.utils.ts` (colocation pragmatique d'un utilitaire consommé par des
// écrans de restitution, sans lecture de `parametres`/`referentiels`).
//
// Portée volontairement limitée aux trois consommateurs déjà identifiés par R10-13 : la duplication très proche
// (même format `AAAA-MM-JJ`) constatée par ailleurs dans `SqmFicheProjetComponent.formaterDateCourte`,
// `SqmComparaisonAuditsComponent.formaterDateCourte` et `SqmGraphiqueEvolutionComponent.formaterDateCourte` (nom de
// méthode distinct, hors énumération explicite de R10-13) n'est pas traitée par cet incrément.

/**
 * Met en forme un horodatage ISO 8601 et un repli commun, réutilisés par plusieurs écrans de restitution.
 */
export class HorodatageUtils {
  /**
   * Complète un nombre à deux chiffres par un zéro non significatif si nécessaire.
   * @param valeur - Nombre à mettre en forme.
   * @returns Le nombre mis en forme sur deux chiffres au moins.
   */
  private static deuxChiffres(valeur: number): string {
    return valeur.toString().padStart(2, '0');
  }

  /**
   * Met en forme un horodatage ISO 8601 en libellé court `JJ/MM HH:mm`, sur le modèle de la maquette de référence
   * (`docs/01_besoin/Suivi Qualimetrie.dc.html`, barre supérieure : « sauvegardé 08/07 17:45 »). Reprise à
   * l'identique de l'implémentation précédemment dupliquée dans `SqmShellComponent` et `SqmAccueilComponent`.
   * @param horodatageIso - Horodatage ISO 8601 à mettre en forme.
   * @returns Le libellé court correspondant.
   */
  public static formaterHorodatageCourt(horodatageIso: string): string {
    const date = new Date(horodatageIso);
    return (
      `${HorodatageUtils.deuxChiffres(date.getDate())}/${HorodatageUtils.deuxChiffres(date.getMonth() + 1)} ` +
      `${HorodatageUtils.deuxChiffres(date.getHours())}:${HorodatageUtils.deuxChiffres(date.getMinutes())}`
    );
  }

  /**
   * Met en forme un horodatage ISO 8601 en libellé court `AAAA-MM-JJ`, `—` si absent. Reprise à l'identique de
   * l'implémentation précédemment dupliquée dans `SqmListeTravailComponent`.
   * @param horodatageIso - Horodatage ISO 8601 à mettre en forme, absent si non calculable.
   * @returns Le libellé court correspondant, `—` si {@link horodatageIso} est absent.
   */
  public static formaterDateAvecRepli(horodatageIso: string | undefined): string {
    if (horodatageIso === undefined) {
      return '—';
    }
    const date = new Date(horodatageIso);
    return `${date.getFullYear()}-${HorodatageUtils.deuxChiffres(date.getMonth() + 1)}-${HorodatageUtils.deuxChiffres(date.getDate())}`;
  }
}
