// Fichier généré avec l'assistance de l'IA (Claude Code), conformément à la mention d'origine requise par
// .claude/rules/01-usage-ia-et-conventions.md.
//
// Mise en forme d'une date calendaire (`AAAA-MM-JJ`, sans composante horaire ni fuseau), sans jamais passer par
// `Date` ni `DatePipe` (plan_20 Partie B) : ces deux mécanismes interprètent une chaîne sans fuseau via les
// accesseurs locaux du poste, puis, selon le paramètre éventuel de `DatePipe`, reconvertissent l'instant obtenu
// vers un autre fuseau — ce qui décale la date affichée d'un jour selon la position du poste par rapport à UTC
// (constat R18-W-09, correction erronée du 2026-09-07 remplacée par le présent utilitaire, cf.
// `docs/03_plan/plan_18_relecture.md`). Une date calendaire n'a pas d'instant : elle se met en forme par simple
// manipulation de chaîne, cf. `docs/02_documentation/14_normesDeveloppement.md#règles-de-qualité-de-code`.

/** Nombre de millisecondes dans un jour, pour convertir un écart de `Date.UTC` en nombre entier de jours. */
const MILLISECONDES_PAR_JOUR = 24 * 60 * 60 * 1000;

/**
 * Met en forme une date calendaire ISO (`AAAA-MM-JJ`) sans aucune interprétation de fuseau horaire.
 */
export class DateCalendaireUtils {
  private static readonly MOTIF_DATE_CALENDAIRE = /^(\d{4})-(\d{2})-(\d{2})$/;

  /**
   * Indique si la valeur fournie est une date calendaire ISO valide (`AAAA-MM-JJ`).
   * @param valeur - Valeur à contrôler.
   * @returns `true` si {@link valeur} respecte le format `AAAA-MM-JJ`.
   */
  public static estDateCalendaire(valeur: string): boolean {
    return DateCalendaireUtils.MOTIF_DATE_CALENDAIRE.test(valeur);
  }

  /**
   * Met en forme une date calendaire ISO `AAAA-MM-JJ` en `JJ/MM/AAAA`, par simple manipulation de chaîne, sans
   * jamais construire d'objet `Date` ni interpréter de fuseau horaire.
   * @param dateIso - Date calendaire au format `AAAA-MM-JJ`.
   * @returns Le libellé `JJ/MM/AAAA` correspondant, ou {@link dateIso} telle quelle si elle ne respecte pas ce
   * format (aucune exception d'affichage).
   */
  public static formaterFr(dateIso: string): string {
    const correspondance = DateCalendaireUtils.MOTIF_DATE_CALENDAIRE.exec(dateIso);
    if (correspondance === null) {
      return dateIso;
    }
    const [, annee, mois, jour] = correspondance;
    return `${jour}/${mois}/${annee}`;
  }

  /**
   * Nombre de jours calendaires écoulés entre une date calendaire et une date de référence, en comparant
   * uniquement les triplets année/mois/jour via `Date.UTC` — jamais `new Date(dateCalendaire)` ni de soustraction
   * d'instants locaux, qui décaleraient le résultat d'un jour selon le fuseau du poste (même défaut que R18-W-09,
   * cf. commentaire d'en-tête de ce fichier). `Date.UTC` ne construit aucun objet `Date` local ni n'interprète de
   * fuseau : à triplet identique, il renvoie toujours le même instant, quel que soit le poste.
   * @param dateCalendaire - Date calendaire au format `AAAA-MM-JJ`.
   * @param maintenant - Date de référence ; seuls son année/mois/jour **locaux** sont retenus (le jour civil du
   * poste, cohérent avec l'affichage d'une date calendaire indépendante de l'heure).
   * @returns Le nombre de jours écoulés, `0` si {@link dateCalendaire} ne respecte pas le format attendu ou est
   * postérieure à {@link maintenant}.
   */
  public static joursEcoules(dateCalendaire: string, maintenant: Date): number {
    const correspondance = DateCalendaireUtils.MOTIF_DATE_CALENDAIRE.exec(dateCalendaire);
    if (correspondance === null) {
      return 0;
    }
    const [, annee, mois, jour] = correspondance;
    const origineMs = Date.UTC(Number(annee), Number(mois) - 1, Number(jour));
    const aujourdhuiMs = Date.UTC(
      maintenant.getFullYear(),
      maintenant.getMonth(),
      maintenant.getDate(),
    );
    return Math.max(0, Math.round((aujourdhuiMs - origineMs) / MILLISECONDES_PAR_JOUR));
  }
}
