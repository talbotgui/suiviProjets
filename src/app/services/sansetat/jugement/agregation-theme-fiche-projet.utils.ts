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
   * (sur le modèle de `SqmSyntheseAuditsComponent.trouverResultat`, cf. commentaire d'en-tête). Réservé aux thèmes
   * Sonar, un projet ne portant en pratique qu'une seule source Sonar active à la fois (à la différence des thèmes
   * GitLab ci-dessous, cf. {@link trouverTous}).
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
   * Retrouve, dans les résultats du dernier audit intégré, TOUS les résultats portant le discriminant `type`
   * demandé : un projet portant plusieurs sources GitLab (ex. un dépôt back et un dépôt front) produit un résultat
   * de ce type par source (`OrchestrateurCampagneService.auditerProjet`, une entrée par source dans `Audit.
   * resultats`) — corrige R15-06 (Phase 15, recette du 2026-08-16), où seule la première source trouvée par {@link
   * trouver} était jusqu'ici exploitée, les dépendances/membres/marqueurs IA des sources suivantes étant
   * silencieusement perdus.
   * @param resultats - Résultats du dernier audit intégré.
   * @param type - Discriminant `type` recherché.
   * @returns Tous les résultats trouvés, tableau vide si aucun.
   */
  private static trouverTous<TType extends ResultatThemeFicheProjet['type']>(
    resultats: readonly ResultatThemeFicheProjet[],
    type: TType,
  ): readonly Extract<ResultatThemeFicheProjet, { type: TType }>[] {
    return resultats.filter(
      (resultat): resultat is Extract<ResultatThemeFicheProjet, { type: TType }> =>
        resultat.type === type,
    );
  }

  /**
   * Fusionne les dépendances de toutes les sources GitLab d'un projet en une seule liste, sans doublon apparent :
   * deux sources déclarant la même dépendance, dans le même chemin de manifeste et la même version (ex. `pom.xml`
   * racine d'un dépôt back et d'un dépôt front), sont fusionnées en une seule ligne plutôt que montrées deux fois,
   * cet écran ne portant aucune
   * colonne « source » permettant de les distinguer visuellement (corrige, avec {@link fusionnerMembres}/{@link
   * fusionnerMarqueurs}, le doublon de clé de suivi R15-04 constaté à l'export PNG). La version fait partie de la
   * clé : deux modules d'un même dépôt (chemins de manifeste distincts désormais portés par le cœur natif, ex.
   * `module-a/pom.xml`), ou deux sources déclarant la même dépendance en versions différentes, produisent deux
   * lignes distinctes plutôt qu'un choix silencieux de l'une d'elles.
   * @param dependances - Dépendances de toutes les sources GitLab du projet, à plat.
   * @returns Les dépendances fusionnées, sans doublon de triplet référence/version/manifeste.
   */
  private static fusionnerDependances(dependances: readonly Dependance[]): readonly Dependance[] {
    const parCle = new Map<string, Dependance>();
    for (const dependance of dependances) {
      const cle = `${dependance.reference} ${dependance.version} ${dependance.manifeste}`;
      if (!parCle.has(cle)) {
        parCle.set(cle, dependance);
      }
    }
    return [...parCle.values()];
  }

  /**
   * Fusionne les membres de toutes les sources GitLab d'un projet en une seule liste : une même personne membre de
   * plusieurs dépôts n'apparaît qu'une seule fois, avec le niveau d'accès le plus élevé constaté, `direct` à `true`
   * dès qu'elle est membre direct d'au moins un des dépôts, et `groupesInvites` égal à l'union (sans doublon, ordre
   * de première apparition) des groupes invités constatés sur chaque source (US-017, cf. {@link
   * fusionnerDependances}).
   * @param membres - Membres de toutes les sources GitLab du projet, à plat.
   * @returns Les membres fusionnés, sans doublon de nom d'utilisateur.
   */
  private static fusionnerMembres(membres: readonly MembreGitlab[]): readonly MembreGitlab[] {
    const parUsername = new Map<string, MembreGitlab>();
    for (const membre of membres) {
      const existant = parUsername.get(membre.username);
      if (existant === undefined) {
        parUsername.set(membre.username, membre);
        continue;
      }
      parUsername.set(membre.username, {
        username: membre.username,
        nom: existant.nom,
        niveauAcces: Math.max(existant.niveauAcces, membre.niveauAcces),
        direct: existant.direct || membre.direct,
        groupesInvites: [
          ...new Set<string>([...existant.groupesInvites, ...membre.groupesInvites]),
        ],
        emailPublic: existant.emailPublic ?? membre.emailPublic,
      });
    }
    return [...parUsername.values()];
  }

  /**
   * Fusionne les marqueurs IA de toutes les sources GitLab d'un projet en une seule liste, sans doublon apparent de
   * couple chemin/outil (cf. {@link fusionnerDependances}).
   * @param marqueurs - Marqueurs IA de toutes les sources GitLab du projet, à plat.
   * @returns Les marqueurs fusionnés, sans doublon de couple chemin/outil.
   */
  private static fusionnerMarqueurs(marqueurs: readonly Marqueur[]): readonly Marqueur[] {
    const parCle = new Map<string, Marqueur>();
    for (const marqueur of marqueurs) {
      const cle = `${marqueur.chemin} ${marqueur.outil}`;
      if (!parCle.has(cle)) {
        parCle.set(cle, marqueur);
      }
    }
    return [...parCle.values()];
  }

  /**
   * Regroupe par thème (Sonar, dépendances, membres, IA) les résultats du dernier audit intégré d'un projet
   * (US-017). Fonction pure, sans effet de bord : ne fait que retrouver, fusionner à plat entre sources GitLab et
   * réorganiser les constats déjà présents dans `resultats`, sans y appliquer le moindre jugement (RG-011, la
   * classification relève des autres fonctions du Moteur de jugement, ex. `StatutObsolescenceUtils`/
   * `StatutIaUtils`/`BadgeSonarKoUtils`).
   * @param resultats - Résultats du dernier audit intégré du projet (`Audit.resultats`).
   * @returns Les résultats regroupés par thème.
   */
  public static regrouper(resultats: readonly ResultatThemeFicheProjet[]): ThemesFicheProjet {
    const couverture = AgregationThemeFicheProjetUtils.trouver(resultats, 'sonar.couverture');
    const notes = AgregationThemeFicheProjetUtils.trouver(resultats, 'sonar.notes');
    const violations = AgregationThemeFicheProjetUtils.trouver(resultats, 'sonar.violations');
    const pasDeSonar = couverture === undefined && notes === undefined && violations === undefined;

    const dependancesResultats = AgregationThemeFicheProjetUtils.trouverTous(
      resultats,
      'gitlab.dependances',
    );
    const membresResultats = AgregationThemeFicheProjetUtils.trouverTous(
      resultats,
      'gitlab.membres',
    );
    const marqueursResultats = AgregationThemeFicheProjetUtils.trouverTous(
      resultats,
      'gitlab.marqueurs_ia',
    );

    return {
      pasDeSonar,
      sonar: pasDeSonar ? undefined : { couverture, notes, violations },
      dependancesDisponibles: dependancesResultats.length > 0,
      dependances: AgregationThemeFicheProjetUtils.fusionnerDependances(
        dependancesResultats.flatMap((resultat) => resultat.dependances),
      ),
      membres: AgregationThemeFicheProjetUtils.fusionnerMembres(
        membresResultats.flatMap((resultat) => resultat.membres),
      ),
      marqueursIa: AgregationThemeFicheProjetUtils.fusionnerMarqueurs(
        marqueursResultats.flatMap((resultat) => resultat.marqueurs),
      ),
    };
  }
}
