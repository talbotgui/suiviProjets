// Fichier généré avec l'assistance de l'IA (Claude Code), conformément à la mention d'origine requise par
// .claude/rules/01-usage-ia-et-conventions.md.
//
// Confronte une dépendance constatée (référence + version) aux règles courantes de `referentiels.reglesDependances`
// (`ParametresJugementUtils.lireReglesDependances`) pour déterminer son statut d'obsolescence.
import { ParametresJugementUtils, type RegleDependance } from './parametres-jugement.utils';

/**
 *
 */
export class StatutObsolescenceUtils {
  /**
   * Statuts d'obsolescence bénéficiant d'un traitement dédié à l'affichage (libellé + couleur) sur les écrans de
   * restitution (Fiche projet, Comparaison d'audits, Synthèse des audits, Obsolescence), dans leur casse canonique.
   * Le champ `statut` d'une borne de version reste une chaîne libre (RG-022) : toute autre valeur est acceptée et
   * affichée telle quelle. Source unique de vérité, réutilisée par le formulaire unitaire de règle de dépendances
   * (avertissement RG-043) et par {@link canoniserCasseStatut}.
   */
  public static readonly STATUTS_CANONIQUES: readonly string[] = [
    'obsolete',
    'maintenu',
    'aJourM1',
    'aJourM3',
  ];

  /**
   * Corrige la casse d'un statut d'obsolescence qui correspond, casse mise à part, à l'une des quatre valeurs
   * canoniques (`MAINTENU`/`Maintenu` → `maintenu`, `AJOURM1` → `aJourM1`, ...), pour que le Moteur de jugement et
   * les écrans de restitution (comparaisons sensibles à la casse) le reconnaissent (RG-043). Toute valeur ne
   * correspondant à aucune des quatre canoniques est renvoyée inchangée : `statut` demeure un champ libre (RG-022),
   * et un simple passage en minuscules casserait `aJourM1`/`aJourM3`.
   * @param statut - Statut saisi, déjà débarrassé de ses espaces superflus par l'appelant.
   * @returns La forme canonique correspondante, ou `statut` inchangé si aucune ne correspond.
   */
  public static canoniserCasseStatut(statut: string): string {
    const canonique = StatutObsolescenceUtils.STATUTS_CANONIQUES.find(
      (valeur) => valeur.toLowerCase() === statut.toLowerCase(),
    );
    return canonique ?? statut;
  }

  /**
   * Retire le préfixe de plage sémantique (`^` ou `~`) éventuellement porté en tête d'une version constatée de
   * dépendance (`"^6.1.4"` → `"6.1.4"`, `"~2.3.0"` → `"2.3.0"`), afin que la confrontation aux motifs de version des
   * règles ({@link calculerStatutObsolescence}, via `ParametresJugementUtils.correspondMotifGlob`) et le calcul du
   * retard d'obsolescence (`ObsolescenceRetardUtils`, `obsolescence-retard.utils.ts`) portent sur le numéro de
   * version lui-même : sans ce retrait, `"^6.1.4"` ne correspond à aucun motif `"6.*"` et sa tête non numérique
   * l'exclut du calcul du retard. Seul ce caractère de tête est retiré ; toute autre chaîne (dont les plages plus
   * riches `>=`, `1.x`, intervalles, non spécifiées par un texte normatif) est renvoyée inchangée.
   * @param version - Version constatée d'une dépendance, telle que remontée par l'audit (`Dependance.version`).
   * @returns La version sans son préfixe `^`/`~` de tête, ou `version` inchangée.
   */
  public static normaliserVersionConstatee(version: string): string {
    return version.startsWith('^') || version.startsWith('~') ? version.slice(1) : version;
  }

  /**
   * Calcule le statut d'obsolescence d'une dépendance constatée (RG-011 : ce statut n'est jamais stocké comme un
   * constat, seulement calculé à l'affichage) : la première règle dont le motif (glob) correspond à la référence
   * de la dépendance est retenue (précédence par ordre de déclaration du référentiel, décision arbitraire à
   * valider par un humain — le texte normatif ne spécifie pas le comportement en cas de motifs de référence se
   * recouvrant), puis, au sein de cette règle, la première borne de version dont le motif (glob) correspond à la
   * version constatée détermine le statut restitué.
   *
   * Décision arbitraire (à valider par un humain, cf. rapport de développement de cet incrément) : ni l'absence de
   * règle correspondant à la référence, ni la correspondance d'une règle sans qu'aucune de ses bornes de version ne
   * corresponde à la version constatée, ne produisent de statut d'obsolescence par défaut (ni `obsolete` ni
   * `maintenu` ne sont supposés sans base normative, cf. consigne explicite de cet incrément) : les deux cas sont
   * restitués identiquement par le type `nonReference`.
   * @param dependance - Dépendance constatée (référence + version, `Dependance.reference`/`Dependance.version`).
   * @param regles - Règles de dépendances courantes (`referentiels.reglesDependances`).
   * @returns Le statut d'obsolescence calculé.
   */
  public static calculerStatutObsolescence(
    dependance: DependanceConstatee,
    regles: readonly RegleDependance[],
  ): ResultatObsolescence {
    const regleCorrespondante = StatutObsolescenceUtils.trouverRegle(dependance.reference, regles);
    if (regleCorrespondante === undefined) {
      return { type: 'nonReference' };
    }
    const versionConstatee = StatutObsolescenceUtils.normaliserVersionConstatee(dependance.version);
    const versionCorrespondante = regleCorrespondante.versions.find((version) =>
      ParametresJugementUtils.correspondMotifGlob(version.motifVersion, versionConstatee),
    );
    if (versionCorrespondante === undefined) {
      return { type: 'nonReference' };
    }
    return { type: 'statut', statut: versionCorrespondante.statut };
  }

  /**
   * Retrouve la première règle de dépendances dont le motif (glob) correspond à la référence donnée (précédence par
   * ordre de déclaration du référentiel, cf. {@link calculerStatutObsolescence}). Extrait pour être réutilisé par
   * `ObsolescenceRetardUtils` (`obsolescence-retard.utils.ts`, RG-050) sans dupliquer cette sélection.
   * @param reference - Référence de la dépendance constatée (`Dependance.reference`).
   * @param regles - Règles de dépendances courantes (`referentiels.reglesDependances`).
   * @returns La règle correspondante, ou `undefined` si aucune ne correspond.
   */
  public static trouverRegle(
    reference: string,
    regles: readonly RegleDependance[],
  ): RegleDependance | undefined {
    return regles.find((regle) =>
      ParametresJugementUtils.correspondMotifGlob(regle.motif, reference),
    );
  }
}

/**
 * Dépendance constatée à confronter aux règles de dépendances (mirroir structurel minimal de `Dependance`, cf.
 * `services/sansetat/commandes/types-facade.ts`).
 */
export interface DependanceConstatee {
  /** Référence de la dépendance (ex. `org.springframework:spring-core`, `@angular/core`). */
  readonly reference: string;
  /** Version constatée de la dépendance. */
  readonly version: string;
}

/**
 * Statut d'obsolescence d'une dépendance constatée.
 */
export type ResultatObsolescence =
  { readonly type: 'statut'; readonly statut: string } | { readonly type: 'nonReference' };
