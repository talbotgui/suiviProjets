// Fichier généré avec l'assistance de l'IA (Claude Code), conformément à la mention d'origine requise par
// .claude/rules/01-usage-ia-et-conventions.md.
//
// Point UNIQUE de lecture défensive de `parametres.seuils`/`referentiels` (RG-022 : « un seul point de lecture des
// seuils/référentiels, jamais dupliqué par écran »). Toutes les autres fonctions du Moteur de jugement de ce dossier
// consomment les types exportés ici plutôt que de relire `parametres`/`referentiels` par elles-mêmes.
//
// Décision d'architecture (à valider par un humain, cf. rapport de développement de cet incrément) : ce module
// n'importe RIEN de `services/avecetat/` (règle de découpage en couches, cf.
// docs/02_documentation/14_normesDeveloppement.md#structuration-du-code-et-découpage-en-couches — le Moteur de
// jugement, classé sous `services/sansetat/`, ne dépend jamais d'un Store `avecetat/`). Les paramètres reçus par
// chaque fonction ci-dessous sont donc traités comme des valeurs `unknown` et validés au moment de la lecture, sans
// aucune assertion de type (`as`, interdite par `@typescript-eslint/consistent-type-assertions` de ce projet). Ce
// choix n'est pas qu'une contrainte de couches : côté cœur natif, `parametres.seuils` et `referentiels.reglesDependances`/
// `reglesMarqueursIA` restent une valeur JSON générique (`serde_json::Value`, décision actée dès la Phase 1, cf.
// commentaire d'en-tête de `services/avecetat/etat/types-donnees.ts`) — rien ne garantit donc, y compris à
// l'exécution, qu'un document chargé respecte la forme attendue (document historique, édition manuelle du fichier
// en clair). La lecture défensive effectuée ici n'est donc pas cosmétique.
//
// Ajout Phase 6, incrément 4 (correction de relecture) : `lireReglesMarqueursIA` complète la lecture défensive de
// `referentiels` avec le référentiel des marqueurs IA (F18), jusqu'ici absent de ce point unique bien que
// `lireReglesDependances` couvre déjà symétriquement `referentiels.reglesDependances` — nécessaire pour que
// `SqmExplicationJugementComponent` puisse expliquer le calcul du statut IA (colonne « IA » de la Synthèse des
// audits), au même titre que les seuils. Réutilise les types stricts `RegleMarqueurIA`/`TypeCorrespondanceMarqueur`/
// `PorteeMarqueur`/`NatureMarqueur` déjà définis côté `services/sansetat/commandes/types-facade.ts` (import de
// types uniquement, aucun couplage comportemental, les deux modules restant sous `services/sansetat/`) plutôt que
// de les dupliquer structurellement comme le sont `RegleDependance`/`VersionDependance` ci-dessous.
//
// Ajout US-049 : `RegleDependance.categorie` (identifiant facultatif d'une catégorie du référentiel) et
// `lireCategoriesDependances` complètent la lecture défensive de `referentiels` avec `categoriesDependances`
// (US-048), consommé par l'écran Obsolescence et le calcul du retard par catégorie (RG-050, RG-051).
import type {
  NatureMarqueur,
  PorteeMarqueur,
  RegleMarqueurIA,
  TypeCorrespondanceMarqueur,
} from '../commandes/types-facade';

/**
 *
 */
export class ParametresJugementUtils {
  /**
   * Indique si la valeur fournie est un enregistrement JSON simple (objet non tableau, non nul), préalable
   * nécessaire à toute lecture défensive d'une branche de `parametres.seuils`/`referentiels`.
   * @param valeur - Valeur brute à qualifier.
   * @returns `true` si `valeur` est un objet simple.
   */
  private static estEnregistrement(valeur: unknown): valeur is Record<string, unknown> {
    return typeof valeur === 'object' && valeur !== null && !Array.isArray(valeur);
  }

  /**
   * Indique si la valeur fournie est un nombre exploitable (fini, ni `NaN` ni infini).
   * @param valeur - Valeur brute à qualifier.
   * @returns `true` si `valeur` est un nombre fini.
   */
  private static estNombreFini(valeur: unknown): valeur is number {
    return typeof valeur === 'number' && Number.isFinite(valeur);
  }

  /**
   * Indique si la valeur fournie est une chaîne non vide.
   * @param valeur - Valeur brute à qualifier.
   * @returns `true` si `valeur` est une chaîne non vide.
   */
  private static estChaineNonVide(valeur: unknown): valeur is string {
    return typeof valeur === 'string' && valeur.length > 0;
  }

  /**
   * Lit défensivement les seuils de vitalité (`parametres.seuils.vitalite`).
   * @param seuilsBruts - Valeur brute de `parametres.seuils`, non garantie conforme à la forme attendue.
   * @returns Le résultat de la lecture, `absent` si la branche est manquante ou malformée.
   */
  public static lireSeuilsVitalite(seuilsBruts: unknown): LectureDefensive<SeuilsVitalite> {
    if (!ParametresJugementUtils.estEnregistrement(seuilsBruts)) {
      return { type: 'absent' };
    }
    const branche = seuilsBruts['vitalite'];
    if (!ParametresJugementUtils.estEnregistrement(branche)) {
      return { type: 'absent' };
    }
    const { mourantJours, mortJours } = branche;
    if (
      !ParametresJugementUtils.estNombreFini(mourantJours) ||
      !ParametresJugementUtils.estNombreFini(mortJours)
    ) {
      return { type: 'absent' };
    }
    return { type: 'valeur', valeur: { mourantJours, mortJours } };
  }

  /**
   * Lit défensivement les bornes de classe de taille de dépôt (`parametres.seuils.tailleDepot`).
   * @param seuilsBruts - Valeur brute de `parametres.seuils`, non garantie conforme à la forme attendue.
   * @returns Le résultat de la lecture, `absent` si la branche est manquante ou malformée.
   */
  public static lireSeuilsTailleDepot(seuilsBruts: unknown): LectureDefensive<SeuilsTailleDepot> {
    if (!ParametresJugementUtils.estEnregistrement(seuilsBruts)) {
      return { type: 'absent' };
    }
    const branche = seuilsBruts['tailleDepot'];
    if (!ParametresJugementUtils.estEnregistrement(branche)) {
      return { type: 'absent' };
    }
    const { borneS, borneL, borneXL } = branche;
    if (
      !ParametresJugementUtils.estNombreFini(borneS) ||
      !ParametresJugementUtils.estNombreFini(borneL) ||
      !ParametresJugementUtils.estNombreFini(borneXL)
    ) {
      return { type: 'absent' };
    }
    return { type: 'valeur', valeur: { borneS, borneL, borneXL } };
  }

  /**
   * Lit défensivement les seuils de couverture de tests (`parametres.seuils.couverture`).
   * @param seuilsBruts - Valeur brute de `parametres.seuils`, non garantie conforme à la forme attendue.
   * @returns Le résultat de la lecture, `absent` si la branche est manquante ou malformée.
   */
  public static lireSeuilsCouverture(seuilsBruts: unknown): LectureDefensive<SeuilsCouverture> {
    if (!ParametresJugementUtils.estEnregistrement(seuilsBruts)) {
      return { type: 'absent' };
    }
    const branche = seuilsBruts['couverture'];
    if (!ParametresJugementUtils.estEnregistrement(branche)) {
      return { type: 'absent' };
    }
    const { seuilRouge, seuilOrange } = branche;
    if (
      !ParametresJugementUtils.estNombreFini(seuilRouge) ||
      !ParametresJugementUtils.estNombreFini(seuilOrange)
    ) {
      return { type: 'absent' };
    }
    return { type: 'valeur', valeur: { seuilRouge, seuilOrange } };
  }

  /**
   * Lit défensivement la tolérance de fraîcheur Sonar (`parametres.seuils.fraicheurSonar`, RG-013).
   * @param seuilsBruts - Valeur brute de `parametres.seuils`, non garantie conforme à la forme attendue.
   * @returns Le résultat de la lecture, `absent` si la branche est manquante ou malformée.
   */
  public static lireSeuilsFraicheurSonar(
    seuilsBruts: unknown,
  ): LectureDefensive<SeuilsFraicheurSonar> {
    if (!ParametresJugementUtils.estEnregistrement(seuilsBruts)) {
      return { type: 'absent' };
    }
    const branche = seuilsBruts['fraicheurSonar'];
    if (!ParametresJugementUtils.estEnregistrement(branche)) {
      return { type: 'absent' };
    }
    const { toleranceJours } = branche;
    if (!ParametresJugementUtils.estNombreFini(toleranceJours)) {
      return { type: 'absent' };
    }
    return { type: 'valeur', valeur: { toleranceJours } };
  }

  /**
   * Lit défensivement les seuils d'activité sans qualité (`parametres.seuils.activiteSansQualite`).
   * @param seuilsBruts - Valeur brute de `parametres.seuils`, non garantie conforme à la forme attendue.
   * @returns Le résultat de la lecture, `absent` si la branche est manquante ou malformée.
   */
  public static lireSeuilsActiviteSansQualite(
    seuilsBruts: unknown,
  ): LectureDefensive<SeuilsActiviteSansQualite> {
    if (!ParametresJugementUtils.estEnregistrement(seuilsBruts)) {
      return { type: 'absent' };
    }
    const branche = seuilsBruts['activiteSansQualite'];
    if (!ParametresJugementUtils.estEnregistrement(branche)) {
      return { type: 'absent' };
    }
    const { minCommits, minNouvellesViolations } = branche;
    if (
      !ParametresJugementUtils.estNombreFini(minCommits) ||
      !ParametresJugementUtils.estNombreFini(minNouvellesViolations)
    ) {
      return { type: 'absent' };
    }
    return { type: 'valeur', valeur: { minCommits, minNouvellesViolations } };
  }

  /**
   * Lit défensivement le seuil de fraîcheur d'audit (`parametres.seuils.fraicheurAudit`).
   * @param seuilsBruts - Valeur brute de `parametres.seuils`, non garantie conforme à la forme attendue.
   * @returns Le résultat de la lecture, `absent` si la branche est manquante ou malformée.
   */
  public static lireSeuilsFraicheurAudit(
    seuilsBruts: unknown,
  ): LectureDefensive<SeuilsFraicheurAudit> {
    if (!ParametresJugementUtils.estEnregistrement(seuilsBruts)) {
      return { type: 'absent' };
    }
    const branche = seuilsBruts['fraicheurAudit'];
    if (!ParametresJugementUtils.estEnregistrement(branche)) {
      return { type: 'absent' };
    }
    const { ancienJours } = branche;
    if (!ParametresJugementUtils.estNombreFini(ancienJours)) {
      return { type: 'absent' };
    }
    return { type: 'valeur', valeur: { ancienJours } };
  }

  /**
   * Valeur de repli du seuil de fraîcheur d'audit (`parametres.seuils.fraicheurAudit.ancienJours`), utilisée quand
   * le document courant ne porte pas ce seuil sous une forme valide (aucun fichier chargé, document historique,
   * valeur nulle ou négative) : reprise de `docs/01_besoin/exemple-donnees.json`, conformément à la convention du
   * projet pour toute valeur par défaut non fixée par un texte normatif (cf.
   * `docs/02_documentation/14_normesDeveloppement.md#règles-de-qualité-de-code`). Centralisée ici depuis la Phase 6,
   * incrément 4 (RG-022) : ce seuil était auparavant dupliqué à l'identique dans `SqmConstitutionCampagneComponent`
   * et `SqmAccueilComponent` (duplication assumée et signalée en relecture de l'incrément 3, cf. rapport de
   * développement), et un troisième consommateur (Synthèse des audits, badge AUDIT ANCIEN) apparaît à cet
   * incrément — occasion retenue pour extraire la valeur et sa lecture vers ce point unique plutôt que de créer une
   * troisième duplication.
   */
  public static readonly ANCIEN_JOURS_PAR_DEFAUT: number = 30;

  /**
   * Lit le seuil de fraîcheur d'audit (`parametres.seuils.fraicheurAudit.ancienJours`) avec repli sur
   * {@link ANCIEN_JOURS_PAR_DEFAUT} si la branche est absente, malformée, nulle ou négative (même garde que
   * l'ancienne implémentation locale à chaque écran consommateur, reprise ici à l'identique : aucun changement de
   * comportement).
   * @param seuilsBruts - Valeur brute de `parametres.seuils`, non garantie conforme à la forme attendue.
   * @returns Le seuil à appliquer, toujours strictement positif.
   */
  public static lireAncienJoursAvecRepli(seuilsBruts: unknown): number {
    const lecture = ParametresJugementUtils.lireSeuilsFraicheurAudit(seuilsBruts);
    return lecture.type === 'valeur' && lecture.valeur.ancienJours > 0
      ? lecture.valeur.ancienJours
      : ParametresJugementUtils.ANCIEN_JOURS_PAR_DEFAUT;
  }

  /**
   * Lit défensivement les seuils des demandes de fusion ouvertes (`parametres.seuils.mrOuvertes`).
   * @param seuilsBruts - Valeur brute de `parametres.seuils`, non garantie conforme à la forme attendue.
   * @returns Le résultat de la lecture, `absent` si la branche est manquante ou malformée.
   */
  public static lireSeuilsMrOuvertes(seuilsBruts: unknown): LectureDefensive<SeuilsMrOuvertes> {
    if (!ParametresJugementUtils.estEnregistrement(seuilsBruts)) {
      return { type: 'absent' };
    }
    const branche = seuilsBruts['mrOuvertes'];
    if (!ParametresJugementUtils.estEnregistrement(branche)) {
      return { type: 'absent' };
    }
    const { ageOrangeJours, ageRougeJours, pourcentageConflitRouge } = branche;
    if (
      !ParametresJugementUtils.estNombreFini(ageOrangeJours) ||
      !ParametresJugementUtils.estNombreFini(ageRougeJours) ||
      !ParametresJugementUtils.estNombreFini(pourcentageConflitRouge)
    ) {
      return { type: 'absent' };
    }
    return { type: 'valeur', valeur: { ageOrangeJours, ageRougeJours, pourcentageConflitRouge } };
  }

  /**
   * Lit défensivement un couple de seuils orange/rouge (`{ seuilOrange, seuilRouge }`), forme commune aux deux
   * sévérités de `parametres.seuils.couleursViolations`.
   * @param brut - Valeur brute de la branche (`couleursViolations.bloquant` ou `.critique`).
   * @returns Le couple lu, ou `undefined` si la branche est manquante ou malformée.
   */
  private static lireCoupleSeuilOrangeRouge(brut: unknown): SeuilsCouleurViolations | undefined {
    if (!ParametresJugementUtils.estEnregistrement(brut)) {
      return undefined;
    }
    const { seuilOrange, seuilRouge } = brut;
    if (
      !ParametresJugementUtils.estNombreFini(seuilOrange) ||
      !ParametresJugementUtils.estNombreFini(seuilRouge)
    ) {
      return undefined;
    }
    return { seuilOrange, seuilRouge };
  }

  /**
   * Lit défensivement les seuils de couleur des violations bloquantes/critiques
   * (`parametres.seuils.couleursViolations`).
   * @param seuilsBruts - Valeur brute de `parametres.seuils`, non garantie conforme à la forme attendue.
   * @returns Le résultat de la lecture, `absent` si la branche est manquante ou malformée (pour l'une ou l'autre
   * sévérité).
   */
  public static lireSeuilsCouleursViolations(
    seuilsBruts: unknown,
  ): LectureDefensive<SeuilsCouleursViolations> {
    if (!ParametresJugementUtils.estEnregistrement(seuilsBruts)) {
      return { type: 'absent' };
    }
    const branche = seuilsBruts['couleursViolations'];
    if (!ParametresJugementUtils.estEnregistrement(branche)) {
      return { type: 'absent' };
    }
    const bloquant = ParametresJugementUtils.lireCoupleSeuilOrangeRouge(branche['bloquant']);
    const critique = ParametresJugementUtils.lireCoupleSeuilOrangeRouge(branche['critique']);
    if (bloquant === undefined || critique === undefined) {
      return { type: 'absent' };
    }
    return { type: 'valeur', valeur: { bloquant, critique } };
  }

  /**
   * Lit défensivement le seuil de matérialité du brouillon (`parametres.seuils.materialiteBrouillon`, RG-020).
   * @param seuilsBruts - Valeur brute de `parametres.seuils`, non garantie conforme à la forme attendue.
   * @returns Le résultat de la lecture, `absent` si la branche est manquante ou malformée.
   */
  public static lireSeuilsMaterialiteBrouillon(
    seuilsBruts: unknown,
  ): LectureDefensive<SeuilsMaterialiteBrouillon> {
    if (!ParametresJugementUtils.estEnregistrement(seuilsBruts)) {
      return { type: 'absent' };
    }
    const branche = seuilsBruts['materialiteBrouillon'];
    if (!ParametresJugementUtils.estEnregistrement(branche)) {
      return { type: 'absent' };
    }
    const { variationRelative } = branche;
    if (!ParametresJugementUtils.estNombreFini(variationRelative)) {
      return { type: 'absent' };
    }
    return { type: 'valeur', valeur: { variationRelative } };
  }

  /**
   * Lit défensivement le motif de nommage de branche (`referentiels.motifNommageBranches`, RG-030), consommé
   * exclusivement par {@link calculerNommageBranche} (`nommage-branche.utils.ts`).
   * @param referentielsBruts - Valeur brute de `referentiels`, non garantie conforme à la forme attendue.
   * @returns Le résultat de la lecture, `absent` si le motif est manquant ou n'est pas une chaîne non vide.
   */
  public static lireMotifNommageBranches(referentielsBruts: unknown): LectureDefensive<string> {
    if (!ParametresJugementUtils.estEnregistrement(referentielsBruts)) {
      return { type: 'absent' };
    }
    const motif = referentielsBruts['motifNommageBranches'];
    if (!ParametresJugementUtils.estChaineNonVide(motif)) {
      return { type: 'absent' };
    }
    return { type: 'valeur', valeur: motif };
  }

  /**
   * Valide une entrée brute de `versions` d'une règle de `referentiels.reglesDependances`.
   * @param brut - Élément brut du tableau `versions` d'une règle.
   * @returns L'entrée validée, ou `undefined` si elle est malformée (entrée silencieusement écartée).
   */
  private static validerVersionDependance(brut: unknown): VersionDependance | undefined {
    if (!ParametresJugementUtils.estEnregistrement(brut)) {
      return undefined;
    }
    const { motifVersion, statut } = brut;
    if (
      !ParametresJugementUtils.estChaineNonVide(motifVersion) ||
      !ParametresJugementUtils.estChaineNonVide(statut)
    ) {
      return undefined;
    }
    return { motifVersion, statut };
  }

  /**
   * Valide une entrée brute de `referentiels.reglesDependances`.
   * @param brut - Élément brut du tableau `reglesDependances`.
   * @returns L'entrée validée, ou `undefined` si elle est malformée (entrée silencieusement écartée, cf.
   * {@link lireReglesDependances}).
   */
  private static validerRegleDependance(brut: unknown): RegleDependance | undefined {
    if (!ParametresJugementUtils.estEnregistrement(brut)) {
      return undefined;
    }
    const { motif, versions, categorie } = brut;
    if (!ParametresJugementUtils.estChaineNonVide(motif) || !Array.isArray(versions)) {
      return undefined;
    }
    const versionsValidees = versions
      .map((version) => ParametresJugementUtils.validerVersionDependance(version))
      .filter((version): version is VersionDependance => version !== undefined);
    // `categorie` est facultatif (US-049) : une valeur présente mais malformée (non chaîne non vide) est
    // silencieusement ignorée plutôt que de disqualifier toute la règle, sur le même principe défensif que les
    // bornes de version ci-dessus. Le cœur natif, lui, refuse une telle valeur à l'enregistrement (RG-049).
    const regle: RegleDependance = { motif, versions: versionsValidees };
    if (ParametresJugementUtils.estChaineNonVide(categorie)) {
      return { ...regle, categorie };
    }
    return regle;
  }

  /**
   * Lit défensivement les règles de dépendances (`referentiels.reglesDependances`), consommées exclusivement par
   * {@link calculerStatutObsolescence} (`statut-obsolescence.utils.ts`). Chaque entrée malformée du tableau est
   * silencieusement écartée plutôt que de faire échouer la lecture de l'ensemble du référentiel (décision arbitraire
   * documentée dans le rapport de développement de cet incrément) ; un référentiel vide (aucune règle déclarée)
   * n'est pas une lecture `absent` mais une lecture `valeur` avec un tableau vide, cas limite couvert par les tests.
   * @param referentielsBruts - Valeur brute de `referentiels`, non garantie conforme à la forme attendue.
   * @returns Le résultat de la lecture, `absent` uniquement si `reglesDependances` n'est pas un tableau.
   */
  public static lireReglesDependances(
    referentielsBruts: unknown,
  ): LectureDefensive<readonly RegleDependance[]> {
    if (!ParametresJugementUtils.estEnregistrement(referentielsBruts)) {
      return { type: 'absent' };
    }
    const brut = referentielsBruts['reglesDependances'];
    if (!Array.isArray(brut)) {
      return { type: 'absent' };
    }
    const regles = brut
      .map((regle) => ParametresJugementUtils.validerRegleDependance(regle))
      .filter((regle): regle is RegleDependance => regle !== undefined);
    return { type: 'valeur', valeur: regles };
  }

  /** Valeurs valides de `RegleMarqueurIA.typeCorrespondance` (F18), utilisées pour valider sans assertion de type. */
  private static readonly TYPES_CORRESPONDANCE_MARQUEUR: readonly TypeCorrespondanceMarqueur[] = [
    'exact',
    'motif',
  ];

  /** Valeurs valides de `RegleMarqueurIA.portee` (F18), utilisées pour valider sans assertion de type. */
  private static readonly PORTEES_MARQUEUR: readonly PorteeMarqueur[] = ['racine', 'partout'];

  /** Valeurs valides de `RegleMarqueurIA.nature` (F18), utilisées pour valider sans assertion de type. */
  private static readonly NATURES_MARQUEUR: readonly NatureMarqueur[] = ['fichier', 'repertoire'];

  /**
   * Valide une entrée brute de `referentiels.reglesMarqueursIA` (F18), sur le modèle de {@link
   * validerRegleDependance} : chaque champ énuméré (`typeCorrespondance`, `portee`, `nature`) est confronté à
   * l'ensemble de ses valeurs valides par recherche (`Array.prototype.find`) plutôt que par assertion de type,
   * conformément à l'interdiction d'`as` de ce projet.
   * @param brut - Élément brut du tableau `reglesMarqueursIA`.
   * @returns L'entrée validée, ou `undefined` si elle est malformée (entrée silencieusement écartée, cf.
   * {@link lireReglesMarqueursIA}).
   */
  private static validerRegleMarqueurIA(brut: unknown): RegleMarqueurIA | undefined {
    if (!ParametresJugementUtils.estEnregistrement(brut)) {
      return undefined;
    }
    const { motif, typeCorrespondance, portee, nature, outil } = brut;
    if (
      !ParametresJugementUtils.estChaineNonVide(motif) ||
      !ParametresJugementUtils.estChaineNonVide(outil)
    ) {
      return undefined;
    }
    const typeCorrespondanceValide = ParametresJugementUtils.TYPES_CORRESPONDANCE_MARQUEUR.find(
      (candidat) => candidat === typeCorrespondance,
    );
    const porteeValide = ParametresJugementUtils.PORTEES_MARQUEUR.find(
      (candidat) => candidat === portee,
    );
    const natureValide = ParametresJugementUtils.NATURES_MARQUEUR.find(
      (candidat) => candidat === nature,
    );
    if (
      typeCorrespondanceValide === undefined ||
      porteeValide === undefined ||
      natureValide === undefined
    ) {
      return undefined;
    }
    return {
      motif,
      typeCorrespondance: typeCorrespondanceValide,
      portee: porteeValide,
      nature: natureValide,
      outil,
    };
  }

  /**
   * Lit défensivement le référentiel des marqueurs IA (`referentiels.reglesMarqueursIA`, F18), consommé
   * exclusivement par {@link SqmExplicationJugementComponent} (`composants/explication-jugement/`) pour expliquer
   * le calcul du statut IA (RG-016). Symétrique de {@link lireReglesDependances} : chaque entrée malformée du
   * tableau est silencieusement écartée, un référentiel vide restitue une lecture `valeur` avec un tableau vide
   * (pas `absent`).
   * @param referentielsBruts - Valeur brute de `referentiels`, non garantie conforme à la forme attendue.
   * @returns Le résultat de la lecture, `absent` uniquement si `reglesMarqueursIA` n'est pas un tableau.
   */
  public static lireReglesMarqueursIA(
    referentielsBruts: unknown,
  ): LectureDefensive<readonly RegleMarqueurIA[]> {
    if (!ParametresJugementUtils.estEnregistrement(referentielsBruts)) {
      return { type: 'absent' };
    }
    const brut = referentielsBruts['reglesMarqueursIA'];
    if (!Array.isArray(brut)) {
      return { type: 'absent' };
    }
    const regles = brut
      .map((regle) => ParametresJugementUtils.validerRegleMarqueurIA(regle))
      .filter((regle): regle is RegleMarqueurIA => regle !== undefined);
    return { type: 'valeur', valeur: regles };
  }

  /**
   * Valide une entrée brute de `referentiels.categoriesDependances` (US-048) : `id` et `libelle` chaînes non
   * vides ; `sigle` tronqué aux trois premiers caractères s'il est plus long (le cœur natif et l'interface
   * plafonnent à trois, mais un fichier édité ou importé à la main pourrait déborder), repli sur les trois
   * premières lettres du libellé en majuscules si `sigle` est absent, non-chaîne ou vide.
   * @param brut - Élément brut du tableau `categoriesDependances`.
   * @returns L'entrée validée, ou `undefined` si elle est malformée (entrée silencieusement écartée).
   */
  private static validerCategorieDependance(brut: unknown): CategorieDependance | undefined {
    if (!ParametresJugementUtils.estEnregistrement(brut)) {
      return undefined;
    }
    const { id, libelle, sigle } = brut;
    if (
      !ParametresJugementUtils.estChaineNonVide(id) ||
      !ParametresJugementUtils.estChaineNonVide(libelle)
    ) {
      return undefined;
    }
    const sigleNettoye =
      typeof sigle === 'string' && sigle.length > 0
        ? sigle.slice(0, 3)
        : libelle.slice(0, 3).toUpperCase();
    return { id, libelle, sigle: sigleNettoye };
  }

  /**
   * Lit défensivement le référentiel des catégories de dépendance (`referentiels.categoriesDependances`, US-048),
   * consommé par l'écran Obsolescence (US-051) et le calcul du retard par catégorie (RG-050, RG-051). Symétrique
   * de {@link lireReglesDependances} : chaque entrée malformée est silencieusement écartée, un référentiel vide
   * restitue une lecture `valeur` avec un tableau vide (pas `absent`).
   * @param referentielsBruts - Valeur brute de `referentiels`, non garantie conforme à la forme attendue.
   * @returns Le résultat de la lecture, `absent` uniquement si `categoriesDependances` n'est pas un tableau.
   */
  public static lireCategoriesDependances(
    referentielsBruts: unknown,
  ): LectureDefensive<readonly CategorieDependance[]> {
    if (!ParametresJugementUtils.estEnregistrement(referentielsBruts)) {
      return { type: 'absent' };
    }
    const brut = referentielsBruts['categoriesDependances'];
    if (!Array.isArray(brut)) {
      return { type: 'absent' };
    }
    const categories = brut
      .map((categorie) => ParametresJugementUtils.validerCategorieDependance(categorie))
      .filter((categorie): categorie is CategorieDependance => categorie !== undefined);
    return { type: 'valeur', valeur: categories };
  }

  /**
   * Confronte une valeur à un motif glob simple, où seul `*` est spécial (correspond à toute sous-chaîne,
   * y compris vide), tous les autres caractères étant comparés littéralement — convention déjà retenue par ce
   * projet pour `RegleMarqueurIA.motif` (cf. `services/sansetat/commandes/types-facade.ts`), reprise ici pour
   * `referentiels.reglesDependances` (`motif`/`motifVersion`) ainsi que pour le critère `domaineEmail` d'un membre
   * connu (ex. `*@entreprise.fr`, cf. `docs/01_besoin/exemple-donnees.json`).
   * @param motif - Motif glob (ex. `org.springframework:*`, `*@entreprise.fr`).
   * @param valeur - Valeur confrontée au motif.
   * @returns `true` si `valeur` correspond intégralement au motif.
   */
  public static correspondMotifGlob(motif: string, valeur: string): boolean {
    const motifEchappe = motif
      .split('*')
      .map((segment) => segment.replace(/[.+?^${}()|[\]\\]/g, '\\$&'))
      .join('.*');
    return new RegExp(`^${motifEchappe}$`).test(valeur);
  }
}

/**
 * Résultat d'une lecture défensive d'une branche de `parametres.seuils`/`referentiels` : `absent` si le document
 * chargé ne porte pas (encore), ou porte sous une forme invalide, la branche attendue (ex. document historique
 * antérieur à l'ajout d'un seuil, édition manuelle du fichier en clair). La fonction du Moteur de jugement appelante
 * traite ce cas comme un jugement « indisponible » explicite plutôt que de supposer une valeur par défaut non
 * spécifiée par un texte normatif (RG-022 : aucune valeur de seuil codée en dur).
 */
export type LectureDefensive<T> =
  { readonly type: 'valeur'; readonly valeur: T } | { readonly type: 'absent' };

/**
 * Seuils de vitalité du dépôt (`parametres.seuils.vitalite`).
 */
export interface SeuilsVitalite {
  /** Nombre de jours sans commit à partir duquel un dépôt est considéré mourant. */
  readonly mourantJours: number;
  /** Nombre de jours sans commit à partir duquel un dépôt est considéré mort. */
  readonly mortJours: number;
}

/**
 * Bornes de classe de taille du dépôt (`parametres.seuils.tailleDepot`), en octets.
 */
export interface SeuilsTailleDepot {
  /** Borne supérieure de la classe « S ». */
  readonly borneS: number;
  /** Borne supérieure de la classe « L ». */
  readonly borneL: number;
  /** Borne supérieure de la classe « XL ». */
  readonly borneXL: number;
}

/**
 * Seuils de couverture de tests Sonar (`parametres.seuils.couverture`), en pourcentage.
 */
export interface SeuilsCouverture {
  /** Seuil en-dessous duquel la couverture est jugée rouge. */
  readonly seuilRouge: number;
  /** Seuil en-dessous duquel la couverture est jugée orange (au-delà de {@link seuilRouge}). */
  readonly seuilOrange: number;
}

/**
 * Tolérance de fraîcheur Sonar (`parametres.seuils.fraicheurSonar`, RG-013).
 */
export interface SeuilsFraicheurSonar {
  /** Nombre de jours d'écart toléré entre le dernier commit et la dernière analyse Sonar avant badge SONAR_KO. */
  readonly toleranceJours: number;
}

/**
 * Seuils d'activité sans qualité (`parametres.seuils.activiteSansQualite`).
 */
export interface SeuilsActiviteSansQualite {
  /** Nombre minimal de commits sur la fenêtre glissante pour que le signal soit évaluable. */
  readonly minCommits: number;
  /** Nombre minimal de nouvelles violations Sonar pour déclencher le signal. */
  readonly minNouvellesViolations: number;
}

/**
 * Seuil de fraîcheur d'audit (`parametres.seuils.fraicheurAudit`).
 */
export interface SeuilsFraicheurAudit {
  /** Nombre de jours au-delà duquel un projet est considéré non audité depuis trop longtemps. */
  readonly ancienJours: number;
}

/**
 * Seuils des demandes de fusion ouvertes (`parametres.seuils.mrOuvertes`).
 */
export interface SeuilsMrOuvertes {
  /** Âge en jours à partir duquel une MR ouverte est jugée orange. */
  readonly ageOrangeJours: number;
  /** Âge en jours à partir duquel une MR ouverte est jugée rouge. */
  readonly ageRougeJours: number;
  /** Pourcentage de MR ouvertes en conflit à partir duquel le signal est jugé rouge. */
  readonly pourcentageConflitRouge: number;
}

/**
 * Seuils orange/rouge appliqués à un décompte de violations d'une sévérité donnée
 * (`parametres.seuils.couleursViolations.{bloquant,critique}`).
 */
export interface SeuilsCouleurViolations {
  /** Nombre de violations à partir duquel la sévérité concernée est jugée orange. */
  readonly seuilOrange: number;
  /** Nombre de violations à partir duquel la sévérité concernée est jugée rouge. */
  readonly seuilRouge: number;
}

/**
 * Seuils de couleur des violations bloquantes/critiques (`parametres.seuils.couleursViolations`).
 */
export interface SeuilsCouleursViolations {
  /** Seuils appliqués au décompte de violations bloquantes. */
  readonly bloquant: SeuilsCouleurViolations;
  /** Seuils appliqués au décompte de violations critiques. */
  readonly critique: SeuilsCouleurViolations;
}

/**
 * Seuil de matérialité du brouillon (`parametres.seuils.materialiteBrouillon`, RG-020, F09).
 */
export interface SeuilsMaterialiteBrouillon {
  /** Ratio de variation relative au-delà duquel un mouvement est signalé comme matériel. */
  readonly variationRelative: number;
}

/**
 * Bornes de version d'une règle de dépendance (`referentiels.reglesDependances[].versions[]`).
 */
export interface VersionDependance {
  /** Motif glob (cf. {@link ParametresJugementUtils.correspondMotifGlob}) appliqué à la version constatée. */
  readonly motifVersion: string;
  /**
   * Statut d'obsolescence associé (ex. `obsolete`, `maintenu`, `aJourM1`, `aJourM3`, valeurs définies par le
   * référentiel lui-même, non énumérées en dur ici, cf. RG-022).
   */
  readonly statut: string;
}

/**
 * Règle de dépendance (`referentiels.reglesDependances[]`).
 */
export interface RegleDependance {
  /** Motif glob (cf. {@link ParametresJugementUtils.correspondMotifGlob}) appliqué à la référence de la dépendance. */
  readonly motif: string;
  /** Règles de version, évaluées dans l'ordre déclaré, la première correspondance l'emportant. */
  readonly versions: readonly VersionDependance[];
  /**
   * Identifiant d'une {@link CategorieDependance} du référentiel (US-049), facultatif et sans valeur par défaut :
   * une règle sans catégorie, ou dont la catégorie a été supprimée du référentiel, est ignorée par les indicateurs
   * de l'écran Obsolescence (RG-049).
   */
  readonly categorie?: string;
}

/**
 * Catégorie de dépendance administrable (`referentiels.categoriesDependances[]`, US-048). Forme minimale
 * redéclarée ici, comme {@link RegleDependance}, pour ne pas dépendre de `services/avecetat/` (mirroir de
 * `EntreeCategorieDependance` de `services/avecetat/etat/types-donnees.ts`).
 */
export interface CategorieDependance {
  /** Identifiant UUID v4 de la catégorie, stable d'une édition à l'autre. */
  readonly id: string;
  /** Libellé affiché dans l'administration et les infobulles. */
  readonly libelle: string;
  /** Sigle de trois lettres au plus, colonne compacte de l'écran Obsolescence. */
  readonly sigle: string;
}
