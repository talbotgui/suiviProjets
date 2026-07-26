// Fichier généré avec l'assistance de l'IA (Claude Code), conformément à la mention d'origine requise par
// .claude/rules/01-usage-ia-et-conventions.md.
//
// Agrège, pour l'encart « alertes non traitées » de l'écran Accueil (US-005), les causes d'alerte actuellement
// détectées avec l'historique de traitement persisté (RG-026 : « une alerte est identifiée par une clé stable,
// indépendante des audits, et porte un statut vu/traité persistant ; une alerte traitée dont la cause persiste au
// constat suivant réapparaît avec la mention de son traitement antérieur »).
//
// Décision d'architecture (à valider par un humain, cf. rapport de développement de cet incrément) : ce module
// reste volontairement agnostique du TYPE de cause d'alerte (membre inconnu, badge SONAR_KO, violation politique
// IA…) : il ne fait que combiner une liste de causes actuellement actives (fournie par l'écran appelant, qui seul
// sait détecter ces causes à partir des données réellement chargées) avec l'historique `traitementsAlertes` de la
// racine. Une cause active dont la clé ne porte aucune entrée de traitement, ou dont l'entrée la plus récente est
// au statut `vue`, est restituée sans mention de traitement antérieur ; une cause active dont l'entrée la plus
// récente est au statut `traitee` est restituée AVEC cette mention (RG-026 : elle réapparaît). Une cause qui
// n'est plus détectée par l'écran appelant (sa condition a disparu) n'apparaît simplement plus dans la liste des
// causes actives fournie en entrée : elle ne peut donc jamais réapparaître ici, qu'elle ait été traitée ou non.
//
// Ce module n'importe RIEN de `services/avecetat/` (frontière de couches du projet, cf.
// docs/02_documentation/14_normesDeveloppement.md#structuration-du-code-et-découpage-en-couches) : `TraitementAlerte`/
// `StatutTraitementAlerte`, définis côté `services/avecetat/etat/types-donnees.ts`, ne sont donc pas importés ici.
// {@link TraitementAlerteConnu} en reprend la forme structurelle utile (sur le modèle de `RegleMembreConnu<TStatut>`
// de `statut-membre.utils.ts`), avec un champ `traitee: boolean` plutôt qu'un champ `statut` recopiant l'énumération
// `StatutTraitementAlerte` : ce module ne distingue jamais qu'un seul cas parmi les deux valeurs possibles (traité ou
// non), un booléen est donc la restitution la plus simple de ce qui est réellement consommé ici, plutôt qu'un
// import du type concret. La traduction `statut === StatutTraitementAlerte.Traitee` reste à la charge de l'écran
// appelant (`AccueilComponent`), seul consommateur autorisé à connaître ce type concret et à respecter la frontière
// de couches en ne l'important que côté `avecetat`.
//
// Décision arbitraire (à valider par un humain) : le format de clé stable retenu pour les causes actuellement
// branchées par `AccueilComponent` (membre inconnu, seule cause détectable avant les écrans Synthèse des audits/
// Fiche projet/Liste de travail, hors périmètre de cet incrément) est `membreInconnu|{projetId}|{username}`,
// conforme au gabarit `typeAlerte|projetId|discriminant` déjà documenté par `TraitementAlerte.cleAlerte`
// (`services/avecetat/etat/types-donnees.ts`).
/**
 *
 */
export class AlertesAccueilUtils {
  /**
   * Combine les causes d'alerte actuellement actives avec l'historique de traitement persisté (RG-026).
   * @param causesActives - Causes d'alerte actuellement détectées par l'écran appelant, dans l'ordre de priorité
   * d'affichage souhaité.
   * @param traitements - Historique complet des statuts de traitement connus (`DonneesRacine.traitementsAlertes`),
   * traduit par l'appelant en {@link TraitementAlerteConnu} (champ `traitee` plutôt que l'énumération native, cf.
   * commentaire d'en-tête).
   * @returns Les alertes actives à afficher, chacune enrichie de la mention de son traitement antérieur si son
   * entrée la plus récente est au statut traité (RG-026), dans le même ordre que `causesActives`.
   */
  public static calculerAlertesActives(
    causesActives: readonly CauseAlerteActive[],
    traitements: readonly TraitementAlerteConnu[],
  ): readonly AlerteAccueil[] {
    return causesActives.map((cause) => {
      const traitementAnterieur = AlertesAccueilUtils.trouverTraitementAnterieur(
        cause.cleAlerte,
        traitements,
      );
      return traitementAnterieur === undefined
        ? { cleAlerte: cause.cleAlerte, libelle: cause.libelle }
        : { cleAlerte: cause.cleAlerte, libelle: cause.libelle, traitementAnterieur };
    });
  }

  /**
   * Retrouve, parmi l'historique de traitement, l'entrée la plus récente pour une clé d'alerte donnée, à condition
   * qu'elle soit au statut traité (RG-026 : seul un traitement effectif, jamais une simple prise de connaissance
   * `vue`, produit la mention « traitement antérieur »).
   * @param cleAlerte - Clé stable de la cause d'alerte recherchée.
   * @param traitements - Historique complet des statuts de traitement connus.
   * @returns Le détail du traitement antérieur le plus récent, `undefined` si la clé ne porte aucune entrée traitée.
   */
  private static trouverTraitementAnterieur(
    cleAlerte: string,
    traitements: readonly TraitementAlerteConnu[],
  ): TraitementAnterieur | undefined {
    const entreesTraitees = traitements.filter(
      (traitement) => traitement.cleAlerte === cleAlerte && traitement.traitee,
    );
    if (entreesTraitees.length === 0) {
      return undefined;
    }
    const plusRecente = entreesTraitees.reduce((plusRecenteConnue, candidate) =>
      new Date(candidate.horodatage).getTime() > new Date(plusRecenteConnue.horodatage).getTime()
        ? candidate
        : plusRecenteConnue,
    );
    return {
      horodatage: plusRecente.horodatage,
      commentaire: plusRecente.commentaire,
    };
  }
}

/**
 * Cause d'alerte actuellement détectée par l'écran appelant (ex. membre inconnu sur un projet donné), indépendante
 * de tout historique de traitement.
 */
export interface CauseAlerteActive {
  /** Clé stable de l'alerte (`typeAlerte|projetId|discriminant`, RG-026). */
  readonly cleAlerte: string;
  /** Libellé affichable de l'alerte. */
  readonly libelle: string;
}

/**
 * Forme structurelle d'une entrée d'historique de traitement d'alerte consommée par ce module (mirroir partiel de
 * `TraitementAlerte`, cf. commentaire d'en-tête de ce fichier).
 */
export interface TraitementAlerteConnu {
  /** Clé stable de l'alerte concernée. */
  readonly cleAlerte: string;
  /** `true` si cette entrée porte le statut traité (traduction, par l'appelant, de `StatutTraitementAlerte.Traitee`). */
  readonly traitee: boolean;
  /** Commentaire libre optionnel associé à ce traitement. */
  readonly commentaire?: string;
  /** Horodatage de cette entrée. */
  readonly horodatage: string;
}

/**
 * Détail du traitement antérieur d'une alerte réapparue (RG-026).
 */
export interface TraitementAnterieur {
  /** Horodatage du traitement antérieur le plus récent. */
  readonly horodatage: string;
  /** Commentaire libre associé à ce traitement, s'il en portait un. */
  readonly commentaire?: string;
}

/**
 * Alerte active restituée pour l'encart de l'Accueil, éventuellement enrichie de la mention de son traitement
 * antérieur (RG-026).
 */
export interface AlerteAccueil {
  /** Clé stable de l'alerte. */
  readonly cleAlerte: string;
  /** Libellé affichable de l'alerte. */
  readonly libelle: string;
  /** Mention du traitement antérieur, présente uniquement si la cause a réapparu après un traitement (RG-026). */
  readonly traitementAnterieur?: TraitementAnterieur;
}
