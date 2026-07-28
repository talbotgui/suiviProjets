// Fichier généré avec l'assistance de l'IA (Claude Code), conformément à la mention d'origine requise par
// .claude/rules/01-usage-ia-et-conventions.md.
//
// Filtre les vues enregistrées applicables à un écran donné (US-028, RG-027, Phase 9 incrément 1) et applique la
// règle de migration douce documentée par `docs/02_documentation/12_modeleDonnees.md#stratégie-de-migration-des-
// données` : « Un filtre de VueEnregistrée dont versionFiltres ne correspond plus au schéma courant est ignoré
// avec avertissement plutôt que de bloquer le chargement du fichier ». Aucune fonction de ce module ne mute ni ne
// supprime la vue obsolète elle-même : elle reste présente dans le fichier de données (au cas où un import ou une
// installation antérieure la rendrait de nouveau valide), seulement absente des vues proposées à l'écran, avec un
// compte disponible pour que celui-ci restitue l'avertissement requis.
//
// Ce module n'importe RIEN de `services/avecetat/` (frontière de couches du projet, cf.
// docs/02_documentation/14_normesDeveloppement.md#structuration-du-code-et-découpage-en-couches) : `VueEnregistree`,
// défini côté `services/avecetat/etat/types-donnees.ts`, n'est donc pas importé ici, sur le modèle déjà retenu par
// `AlertesAccueilUtils` (Phase 8) ; {@link VueEnregistreeConnue} en reprend la forme structurelle utile.
/**
 *
 */
export class VuesEnregistreesUtils {
  /**
   * Sépare, parmi les vues enregistrées d'un écran donné, celles dont la version de filtres correspond au schéma
   * courant de cet écran (applicables) de celles devenues obsolètes (ignorées avec avertissement, cf. commentaire
   * d'en-tête).
   * @param vues - Ensemble complet des vues enregistrées connues (`DonneesRacine.vuesEnregistrees`).
   * @param ecran - Identifiant stable de l'écran appelant.
   * @param versionFiltresAttendue - Version courante du schéma de filtres de cet écran.
   * @returns Les vues applicables (dans l'ordre reçu) et le nombre de vues du même écran ignorées pour cause de
   * version de filtres obsolète.
   */
  public static filtrerPourEcran(
    vues: readonly VueEnregistreeConnue[],
    ecran: string,
    versionFiltresAttendue: number,
  ): ResultatFiltrageVues {
    const vuesDeLecran = vues.filter((vue) => vue.ecran === ecran);
    const applicables = vuesDeLecran.filter((vue) => vue.versionFiltres === versionFiltresAttendue);
    return {
      applicables,
      nombreIgnorees: vuesDeLecran.length - applicables.length,
    };
  }

  /**
   * Retrouve la vue par défaut parmi un ensemble de vues déjà filtrées pour un écran (RG-027 : « possibilité de la
   * définir comme vue par défaut de son écran »), au plus une seule attendue par construction (garantie côté cœur
   * natif par `persistance::vues::definir_vue`).
   * @param vuesApplicables - Vues déjà restreintes à un écran et à la version de filtres courante.
   * @returns La vue par défaut, `undefined` si aucune ne l'est.
   */
  public static trouverVueParDefaut(
    vuesApplicables: readonly VueEnregistreeConnue[],
  ): VueEnregistreeConnue | undefined {
    return vuesApplicables.find((vue) => vue.parDefaut);
  }
}

/**
 * Forme structurelle d'une vue enregistrée consommée par ce module (mirroir partiel de `VueEnregistree`, cf.
 * commentaire d'en-tête de ce fichier).
 */
export interface VueEnregistreeConnue {
  /** Identifiant UUID v4 de la vue enregistrée. */
  readonly id: string;
  /** Nom donné par l'utilisateur. */
  readonly nom: string;
  /** Identifiant stable de l'écran auquel s'applique la vue. */
  readonly ecran: string;
  /** Version du schéma de filtres, propre à l'écran concerné. */
  readonly versionFiltres: number;
  /** Indique si cette vue est la vue par défaut de son écran. */
  readonly parDefaut: boolean;
  /** Filtres, structure propre à l'écran concerné. */
  readonly filtres: unknown;
}

/**
 * Résultat du filtrage des vues enregistrées d'un écran par version de filtres courante.
 */
export interface ResultatFiltrageVues {
  /** Vues applicables, dans l'ordre reçu. */
  readonly applicables: readonly VueEnregistreeConnue[];
  /** Nombre de vues du même écran ignorées pour cause de version de filtres obsolète. */
  readonly nombreIgnorees: number;
}
