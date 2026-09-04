// Fichier généré avec l'assistance de l'IA (Claude Code), conformément à la mention d'origine requise par
// .claude/rules/01-usage-ia-et-conventions.md.
//
// Comparaisons triviales autour de la date de prise en charge d'un projet (premier commit interne, US-058,
// RG-058, plan_18). Deux besoins distincts, tous deux de simples comparaisons de chaînes :
// - `recalculNecessaire` : pré-filtre du calcul lors d'une campagne cochant l'option (décision 2 du plan) ;
// - `identique` : garde « pas d'écriture si le résultat est inchangé » (décision 6 du plan), utilisée par le
//   bouton « recalculer » de la Fiche projet et par l'orchestrateur de campagne.
//
// Le §4.2 du plan rattachait initialement ces deux helpers au module de coordination Rust ; ils sont réalisés ici,
// côté interface, conformément au §5.3 (« logique triviale de comparaison, sans hash côté interface ») : l'unique
// producteur du condensé `empreinteReferentiel` reste le cœur natif (commande `empreinteReferentielInterne`,
// décision 15), aucun SHA-256 n'est recalculé en TypeScript.
//
// Décision d'architecture (cf. `statut-membre.utils.ts`, même problème de couches) : ce module n'importe pas
// `PremierCommitInterne` de `services/avecetat/etat/types-donnees.ts` (le Moteur de jugement, sous
// `services/sansetat/`, ne dépend jamais d'un Store `avecetat/`). Il consomme la forme structurelle minimale
// {@link EtatPriseEnCharge}, que l'union `PremierCommitInterne` satisfait déjà.

/**
 * Forme structurelle minimale d'un résultat de calcul de prise en charge lue par ce module : le discriminant
 * `statut`, la `date` (présente uniquement quand `statut === 'determine'`) et l'empreinte du référentiel `interne`
 * figée au calcul. L'union `PremierCommitInterne` (`services/avecetat/etat/types-donnees.ts`) est assignable à ce
 * type.
 */
export interface EtatPriseEnCharge {
  /** Discriminant du statut du calcul (`'determine'` ou l'une des valeurs « non déterminé »). */
  readonly statut: string;
  /** Date calendaire `AAAA-MM-JJ` du premier commit interne, présente uniquement si `statut === 'determine'`. */
  readonly date?: string;
  /** Empreinte (`sha256:…`) du sous-ensemble `interne` des membres connus au moment du calcul. */
  readonly empreinteReferentiel: string;
}

/**
 * Comparaisons de la date de prise en charge d'un projet (RG-058), toutes triviales et sans recalcul de condensé.
 */
export class PriseEnChargeUtils {
  /**
   * Décide si le calcul de prise en charge d'un projet doit être (re)fait lors d'une campagne cochant l'option
   * « Calculer la date de prise en charge » (RG-058, décision 2 du plan_18) : aucun résultat stocké, statut autre
   * que `determine`, ou empreinte du référentiel `interne` différente de celle figée au dernier calcul. Le bouton
   * « recalculer » unitaire de la Fiche projet, lui, ignore ce pré-filtre et recalcule toujours.
   * @param existant - Résultat de prise en charge actuellement stocké sur le projet, ou `undefined` si jamais calculé.
   * @param empreinteCourante - Empreinte actuelle du référentiel `interne` du groupe (commande `empreinteReferentielInterne`).
   * @returns `true` si un (re)calcul est utile.
   */
  public static recalculNecessaire(
    existant: EtatPriseEnCharge | undefined,
    empreinteCourante: string,
  ): boolean {
    if (existant === undefined) {
      return true;
    }
    return existant.statut !== 'determine' || existant.empreinteReferentiel !== empreinteCourante;
  }

  /**
   * Indique si deux résultats de calcul sont équivalents du point de vue de la décision « pas d'écriture si
   * inchangé » (RG-058, décision 6 du plan_18) : même `statut` et, pour `determine`, même `date`. `calculeLe`,
   * `empreinteReferentiel` et `sha` sont volontairement ignorés — un `calculeLe` systématiquement renouvelé ne
   * doit provoquer ni ressaisie du mot de passe (RG-002), ni sauvegarde, ni entrée de journal (RG-023).
   * @param a - Premier résultat.
   * @param b - Second résultat.
   * @returns `true` si les deux résultats sont équivalents pour la décision d'écriture.
   */
  public static identique(a: EtatPriseEnCharge, b: EtatPriseEnCharge): boolean {
    if (a.statut !== b.statut) {
      return false;
    }
    if (a.statut === 'determine') {
      return a.date === b.date;
    }
    return true;
  }
}
