// Fichier généré avec l'assistance de l'IA (Claude Code), conformément à la mention d'origine requise par
// .claude/rules/01-usage-ia-et-conventions.md.
//
// Regroupe par thème (Sonar, dépendances, membres, IA) les résultats du dernier audit intégré d'un projet (US-017,
// Fiche projet, Phase 6 incrément 5), afin que l'écran appelant ne traverse `Audit.resultats` qu'une seule fois par
// thème plutôt que de dupliquer une recherche par type à chaque zone de l'écran (même motif de « lecture unique »
// déjà appliqué à `parametres.seuils`/`referentiels` par `ParametresJugementUtils`, RG-022, ici appliqué aux
// constats bruts plutôt qu'aux seuils/référentiels). `gitlab.merge_requests` (MR ouvertes), `gitlab.vitalite` et
// `gitlab.taille_depot` (métadonnées) ne font PAS partie des quatre thèmes ci-dessus : ils restent recherchés
// directement par `SqmFicheProjetComponent`, sur le modèle déjà établi par `SqmSyntheseAuditsComponent.
// trouverResultat` (aucune zone dédiée à ces indicateurs n'est nommée « thème » par la maquette de référence,
// `docs/02_documentation/09_maquettes.md#fiche-projet`).
//
// Décision d'architecture (à valider par un humain, cf. rapport de développement de cet incrément) : ce module,
// classé sous `services/sansetat/`, n'importe rien de `services/avecetat/` (frontière de couches du projet). Or
// `Audit.resultats` est typé côté `services/avecetat/etat/types-donnees.ts` par l'union discriminée `Resultat` (16
// variantes, Phase 6 incrément 1), qui réexporte les 13 variantes de `services/sansetat/commandes/types-facade.ts`
// et réutilise 3 variantes croisées propres à `services/avecetat/campagne/connecteur-croise.utils.ts`
// (`croise.*`). Plutôt que d'importer ce dernier (ce qui romprait la frontière de couches), {@link
// ResultatThemeFicheProjet} ci-dessous ne déclare, pour les 10 variantes non consommées par ce module (dont les 3
// `croise.*`), que leur seul discriminant `type` (aucun champ de charge utile) : un objet réel plus riche (ex. une
// variante `croise.fraicheur_sonar` complète) reste structurellement assignable à cette forme minimale (surtypage
// par largeur, TypeScript), ce qui permet de transmettre directement `Audit.resultats` à {@link
// AgregationThemeFicheProjetUtils.regrouper} sans assertion de type (`as`, interdite par
// `@typescript-eslint/consistent-type-assertions` de ce projet) ni généricité complexe.
import type {
  Dependance,
  Marqueur,
  MembreGitlab,
  ResultatGitlabDependances,
  ResultatGitlabMarqueursIa,
  ResultatGitlabMembres,
  ResultatSonarCouverture,
  ResultatSonarNotes,
  ResultatSonarViolations,
} from '../commandes/types-facade';

/**
 * Discriminants des onze variantes du catalogue figé des résultats d'audit non consommées par ce module (cf.
 * commentaire d'en-tête), réduites à leur seul champ `type` : `gitlab.branches`/`gitlab.vitalite`/
 * `gitlab.contributeurs`/`gitlab.taille_depot`/`gitlab.merge_requests` (métadonnées et MR ouvertes, recherchées
 * directement par l'écran appelant), `sonar.dette`/`sonar.ncloc` (hors périmètre de la Fiche projet, US-017) et les
 * trois variantes `croise.*` (calculées côté UI, `services/avecetat/campagne/connecteur-croise.utils.ts`, non
 * importables ici).
 */
type ResultatAutreFicheProjet =
  | { readonly type: 'gitlab.branches' }
  | { readonly type: 'gitlab.vitalite' }
  | { readonly type: 'gitlab.contributeurs' }
  | { readonly type: 'gitlab.taille_depot' }
  | { readonly type: 'gitlab.merge_requests' }
  | { readonly type: 'sonar.dette' }
  | { readonly type: 'sonar.ncloc' }
  | { readonly type: 'croise.fraicheur_sonar' }
  | { readonly type: 'croise.activite_sans_qualite' }
  | { readonly type: 'croise.ia_nouveau_code' };

/**
 * Sous-ensemble du catalogue figé des résultats d'audit (`Resultat`, `services/avecetat/etat/types-donnees.ts`)
 * effectivement consommé par {@link AgregationThemeFicheProjetUtils}, cf. commentaire d'en-tête pour la raison de
 * cette redéclaration locale plutôt qu'un import direct de `Resultat`.
 */
export type ResultatThemeFicheProjet =
  | ({ readonly type: 'gitlab.dependances' } & ResultatGitlabDependances)
  | ({ readonly type: 'gitlab.membres' } & ResultatGitlabMembres)
  | ({ readonly type: 'gitlab.marqueurs_ia' } & ResultatGitlabMarqueursIa)
  | ({ readonly type: 'sonar.couverture' } & ResultatSonarCouverture)
  | ({ readonly type: 'sonar.notes' } & ResultatSonarNotes)
  | ({ readonly type: 'sonar.violations' } & ResultatSonarViolations)
  | ResultatAutreFicheProjet;

/**
 * Thème Sonar du dernier audit intégré, présent uniquement si au moins un constat Sonar consommé par la Fiche
 * projet a été produit par ce dernier audit (cf. {@link ThemesFicheProjet.pasDeSonar}).
 */
export interface ThemeSonarFicheProjet {
  /** Constat brut de couverture de tests, absent si non produit par ce dernier audit. */
  readonly couverture: ResultatSonarCouverture | undefined;
  /** Constat brut des notes A–E, absent si non produit par ce dernier audit. */
  readonly notes: ResultatSonarNotes | undefined;
  /** Constat brut des violations par sévérité, absent si non produit par ce dernier audit. */
  readonly violations: ResultatSonarViolations | undefined;
}

/**
 * Résultats du dernier audit intégré d'un projet, regroupés par thème (Sonar, dépendances, membres, IA).
 */
export interface ThemesFicheProjet {
  /**
   * `true` si aucun des trois constats Sonar consommés par la Fiche projet (couverture, notes, violations) n'a été
   * produit par ce dernier audit (aucune source Sonar rattachée, ou source rattachée mais n'ayant produit aucun de
   * ces trois constats) : distinct du grisage SONAR_KO (RG-013), qui suppose au contraire une source Sonar
   * existante mais devenue obsolète.
   */
  readonly pasDeSonar: boolean;
  /** Thème Sonar, `undefined` si {@link pasDeSonar}. */
  readonly sonar: ThemeSonarFicheProjet | undefined;
  /**
   * `true` si un constat `gitlab.dependances` a été produit par ce dernier audit, y compris si son tableau de
   * dépendances est vide (distingue « aucune dépendance déclarée » de « aucune donnée de dépendances disponible »).
   */
  readonly dependancesDisponibles: boolean;
  /** Dépendances déclarées par les manifestes du dépôt, tableau vide si {@link dependancesDisponibles} est faux. */
  readonly dependances: readonly Dependance[];
  /** Membres du dépôt constatés, tableau vide si non produit par ce dernier audit. */
  readonly membres: readonly MembreGitlab[];
  /** Marqueurs d'outils IA détectés dans l'arborescence, tableau vide si non produit par ce dernier audit. */
  readonly marqueursIa: readonly Marqueur[];
}

/**
 *
 */
export class AgregationThemeFicheProjetUtils {
  /**
   * Retrouve, dans les résultats du dernier audit intégré, l'unique résultat portant le discriminant `type` demandé
   * (sur le modèle de `SqmSyntheseAuditsComponent.trouverResultat`, cf. commentaire d'en-tête).
   * @param resultats - Résultats du dernier audit intégré.
   * @param type - Discriminant `type` recherché.
   * @returns Le résultat trouvé, `undefined` si absent de ce dernier audit.
   */
  private static trouver<TType extends ResultatThemeFicheProjet['type']>(
    resultats: readonly ResultatThemeFicheProjet[],
    type: TType,
  ): Extract<ResultatThemeFicheProjet, { type: TType }> | undefined {
    return resultats.find(
      (resultat): resultat is Extract<ResultatThemeFicheProjet, { type: TType }> =>
        resultat.type === type,
    );
  }

  /**
   * Regroupe par thème (Sonar, dépendances, membres, IA) les résultats du dernier audit intégré d'un projet
   * (US-017). Fonction pure, sans effet de bord : ne fait que retrouver et réorganiser les constats déjà présents
   * dans `resultats`, sans y appliquer le moindre jugement (RG-011, la classification relève des autres fonctions
   * du Moteur de jugement, ex. `StatutObsolescenceUtils`/`StatutIaUtils`/`BadgeSonarKoUtils`).
   * @param resultats - Résultats du dernier audit intégré du projet (`Audit.resultats`).
   * @returns Les résultats regroupés par thème.
   */
  public static regrouper(resultats: readonly ResultatThemeFicheProjet[]): ThemesFicheProjet {
    const couverture = AgregationThemeFicheProjetUtils.trouver(resultats, 'sonar.couverture');
    const notes = AgregationThemeFicheProjetUtils.trouver(resultats, 'sonar.notes');
    const violations = AgregationThemeFicheProjetUtils.trouver(resultats, 'sonar.violations');
    const pasDeSonar = couverture === undefined && notes === undefined && violations === undefined;

    const dependancesResultat = AgregationThemeFicheProjetUtils.trouver(
      resultats,
      'gitlab.dependances',
    );
    const membresResultat = AgregationThemeFicheProjetUtils.trouver(resultats, 'gitlab.membres');
    const marqueursResultat = AgregationThemeFicheProjetUtils.trouver(
      resultats,
      'gitlab.marqueurs_ia',
    );

    return {
      pasDeSonar,
      sonar: pasDeSonar ? undefined : { couverture, notes, violations },
      dependancesDisponibles: dependancesResultat !== undefined,
      dependances: dependancesResultat?.dependances ?? [],
      membres: membresResultat?.membres ?? [],
      marqueursIa: marqueursResultat?.marqueurs ?? [],
    };
  }
}
