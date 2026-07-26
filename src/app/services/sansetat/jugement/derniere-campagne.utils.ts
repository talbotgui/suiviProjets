// Fichier généré avec l'assistance de l'IA (Claude Code), conformément à la mention d'origine requise par
// .claude/rules/01-usage-ia-et-conventions.md.
//
// Détermine la dernière campagne ayant concerné un projet donné (celle dont le périmètre inclut ce projet, la plus
// récente par date) et son verdict pour ce projet, consommé par l'encart d'anomalie technique et les métadonnées de
// la Fiche projet (US-017, Phase 6 incrément 5) : cf. `docs/02_documentation/09_maquettes.md#états-particuliers`
// (« Dernière campagne en échec : encart d'anomalie technique affiché en tête, indicateurs de la campagne
// précédente conservés »). Reprend le calcul déjà établi par
// `SqmSyntheseAuditsComponent.campagneEnEchecPourProjet` (Phase 6 incrément 4), qui ne restituait qu'un booléen : ce
// module restitue la campagne et le verdict complets, nécessaires ici à l'affichage de la date de la campagne et
// des anomalies détaillées (`services/avecetat/campagne/rapport-anomalies.utils.ts`, réutilisé tel quel par l'écran
// appelant, qui n'est pas contraint par la même frontière de couches que ce module).
//
// Décision d'architecture (à valider par un humain, cf. rapport de développement de cet incrément) : `Campagne`/
// `Verdict` sont typés côté `services/avecetat/etat/types-donnees.ts`, non importables ici (frontière de couches,
// `services/sansetat/` ne dépend jamais de `services/avecetat/`). {@link CampagneMinimale}/{@link VerdictMinimal}
// ci-dessous en reprennent la forme structurelle minimale nécessaire à ce calcul (`Verdict.statut`, une union de
// littéraux côté `avecetat`, est élargi ici en `string` simple) : un tableau `readonly Campagne[]` réel reste
// directement assignable à `readonly CampagneMinimale[]` (sous-typage structurel, TypeScript), sans assertion de
// type (`as`, interdite par `@typescript-eslint/consistent-type-assertions` de ce projet) ni généricité complexe,
// sur le modèle déjà retenu par `agregation-theme-fiche-projet.utils.ts` pour le même problème de couches.
/**
 * Verdict d'exécution d'un projet au sein d'une campagne, forme structurelle minimale consommée par ce module
 * (mirroir structurel de `Verdict`, cf. commentaire d'en-tête).
 */
export interface VerdictMinimal {
  /** Identifiant du projet concerné. */
  readonly projetId: string;
  /** Statut d'exécution (élargi en `string`, cf. commentaire d'en-tête). */
  readonly statut: string;
  /** Durée d'exécution en millisecondes, si le projet a été traité. */
  readonly dureeMs?: number;
  /** Anomalies rencontrées, si le traitement a échoué (catalogue RG-021, non interprété ici). */
  readonly anomalies?: readonly unknown[];
  /** Motif de rejet, si le projet a été rejeté depuis le brouillon. */
  readonly motifRejet?: string;
}

/**
 * Trace d'exécution d'une campagne d'audit, forme structurelle minimale consommée par ce module (mirroir structurel
 * de `Campagne`, cf. commentaire d'en-tête).
 */
export interface CampagneMinimale {
  /** Identifiant de la campagne. */
  readonly id: string;
  /** Date de lancement de la campagne. */
  readonly date: string;
  /** Identifiants des projets du périmètre de la campagne. */
  readonly perimetre: readonly string[];
  /** Verdicts d'exécution par projet. */
  readonly verdicts: readonly VerdictMinimal[];
}

/**
 * Dernière campagne ayant concerné un projet et son verdict pour ce projet.
 */
export interface DerniereCampagneProjet {
  /** Dernière campagne dont le périmètre inclut le projet concerné. */
  readonly campagne: CampagneMinimale;
  /** Verdict de cette campagne pour le projet concerné. */
  readonly verdict: VerdictMinimal;
}

/**
 *
 */
export class DerniereCampagneUtils {
  /**
   * Détermine la dernière campagne (la plus récente par date) dont le périmètre inclut le projet donné, et son
   * verdict pour ce projet. Fonction pure, sans effet de bord : ne fait que retrouver une entrée déjà présente dans
   * `campagnes`, sans y appliquer le moindre jugement.
   * @param campagnes - Traces d'exécution des campagnes (`DonneesRacine.campagnes`).
   * @param projetId - Identifiant du projet concerné.
   * @returns La dernière campagne et son verdict pour ce projet, `undefined` si aucune campagne ne concerne ce
   * projet (jamais audité, ou projet retiré de tout périmètre de campagne depuis).
   */
  public static trouverDerniereCampagnePourProjet(
    campagnes: readonly CampagneMinimale[],
    projetId: string,
  ): DerniereCampagneProjet | undefined {
    const campagnesDuProjet = campagnes.filter((campagne) => campagne.perimetre.includes(projetId));
    const derniere = campagnesDuProjet.reduce<CampagneMinimale | undefined>(
      (plusRecente, campagne) => {
        if (
          plusRecente === undefined ||
          new Date(campagne.date).getTime() > new Date(plusRecente.date).getTime()
        ) {
          return campagne;
        }
        return plusRecente;
      },
      undefined,
    );
    if (derniere === undefined) {
      return undefined;
    }
    const verdict = derniere.verdicts.find((candidat) => candidat.projetId === projetId);
    if (verdict === undefined) {
      return undefined;
    }
    return { campagne: derniere, verdict };
  }
}
