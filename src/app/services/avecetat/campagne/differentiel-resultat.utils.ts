// Fichier généré avec l'assistance de l'IA (Claude Code), conformément à la mention d'origine requise par
// .claude/rules/01-usage-ia-et-conventions.md.
//
// Différentiel générique des indicateurs d'un brouillon de campagne par rapport au dernier audit intégré du même
// projet (F09, écran Brouillon, Phase 5 incrément 6) : « indicateurs bougeant au-delà d'un seuil de matérialité
// paramétrable ». Distinct de `AberrationUtils` (RG-020, incrément 4), qui ne couvre que 3 indicateurs avec des
// formules d'aberration extrême propres à chacun (ex. ×10) ; ce module couvre tous les indicateurs déjà produits
// (12 des 16 du catalogue figé, cf. commentaire ci-dessous) avec un seuil de matérialité unique et symétrique
// (`parametres.seuils.materialiteBrouillon.variationRelative`, la même valeur que celle consommée par
// `AberrationUtils`, réutilisée ici par simple ratio ± cette valeur plutôt qu'avec une formule dédiée par
// indicateur — décision arbitraire documentée dans le rapport de développement de cette phase).
//
// `gitlab.dependances`, `gitlab.branches`, `gitlab.marqueurs_ia` et `croise.ia_nouveau_code` restent hors
// périmètre (production différée, cf. commentaires de `orchestrateur-campagne.service.ts` et
// `connecteur-croise.utils.ts`) : absents de la liste des tags comparés ci-dessous. `gitlab.vitalite` et
// `croise.fraicheur_sonar` ne portent que des dates/booléens, sans mesure numérique comparable par ratio : eux
// aussi hors périmètre de ce différentiel (leur variation reste visible via le résultat brut affiché tel quel).
//
// Chaque fonction reste pure (RG-011 : aucun verdict, seulement un constat de mouvement), sur le modèle
// d'`AberrationUtils`/`ExempleReferenceUtils`.

/**
 * Mesure numérique nommée extraite d'un résultat d'audit (constat brut, RG-011).
 */
export interface Mesure {
  /** Libellé lisible de la mesure (ex. « Taille du dépôt »). */
  readonly libelle: string;
  /** Valeur numérique constatée. */
  readonly valeur: number;
}

/**
 * Écart matériel détecté entre le dernier audit intégré et le nouvel audit en attente de validation, pour une
 * mesure d'un indicateur donné (F09 : « indicateurs bougeant au-delà d'un seuil de matérialité paramétrable »).
 */
export interface EcartMateriel {
  /** Tag `Resultat` du catalogue figé concerné. */
  readonly indicateur: string;
  /** Libellé lisible de la mesure concernée au sein de ce résultat. */
  readonly libelle: string;
  /** Valeur constatée lors du dernier audit intégré. */
  readonly ancienneValeur: number;
  /** Valeur constatée lors du nouvel audit, en attente de validation dans le brouillon. */
  readonly nouvelleValeur: number;
}

/**
 * Tags `Resultat` déjà produits et comparés par ce différentiel (cf. commentaire d'en-tête : les 4 indicateurs à
 * production différée et les 2 indicateurs sans mesure numérique en sont exclus).
 */
const TAGS_COMPARES: readonly string[] = [
  'gitlab.taille_depot',
  'gitlab.contributeurs',
  'gitlab.merge_requests',
  'gitlab.membres',
  'sonar.violations',
  'sonar.dette',
  'sonar.couverture',
  'sonar.notes',
  'sonar.ncloc',
  'croise.activite_sans_qualite',
];

/**
 * Différentiel générique des résultats d'audit (UI, Phase 5 incrément 6) : classe utilitaire à membres statiques
 * uniquement, sur le modèle du gabarit `ExempleReferenceUtils`. Chaque méthode reste pure, sans effet de bord.
 */
export class DifferentielResultatUtils {
  /**
   * Compare les résultats du dernier audit intégré d'un projet aux résultats du nouvel audit en attente de
   * validation dans le brouillon, et retourne les mesures dont le mouvement dépasse le seuil de matérialité
   * paramétré (F09).
   * @param ancienResultats - Résultats du dernier audit intégré du projet, absents si premier audit.
   * @param nouveauxResultats - Résultats du nouvel audit en attente de validation.
   * @param variationRelative - Seuil de matérialité paramétrable (`parametres.seuils.materialiteBrouillon.
   * variationRelative`).
   * @returns Les écarts matériels détectés, tableau vide si aucun (ou si `ancienResultats` est absent : aucune
   * comparaison n'est possible pour un premier audit).
   */
  public static comparerAudits(
    ancienResultats: readonly unknown[] | undefined,
    nouveauxResultats: readonly unknown[],
    variationRelative: number,
  ): readonly EcartMateriel[] {
    if (ancienResultats === undefined) {
      return [];
    }
    const ecarts: EcartMateriel[] = [];
    for (const tag of TAGS_COMPARES) {
      const ancien = this.trouverResultatTague(ancienResultats, tag);
      const nouveau = this.trouverResultatTague(nouveauxResultats, tag);
      const mesuresAnciennes = this.extraireMesures(ancien, tag);
      const mesuresNouvelles = this.extraireMesures(nouveau, tag);
      for (const mesureNouvelle of mesuresNouvelles) {
        const mesureAncienne = mesuresAnciennes.find(
          (candidate) => candidate.libelle === mesureNouvelle.libelle,
        );
        if (mesureAncienne === undefined || mesureAncienne.valeur === 0) {
          continue;
        }
        const ratio = mesureNouvelle.valeur / mesureAncienne.valeur;
        if (ratio >= 1 + variationRelative || ratio <= 1 - variationRelative) {
          ecarts.push({
            indicateur: tag,
            libelle: mesureNouvelle.libelle,
            ancienneValeur: mesureAncienne.valeur,
            nouvelleValeur: mesureNouvelle.valeur,
          });
        }
      }
    }
    return ecarts;
  }

  /**
   * Retrouve, sans accès non sûr à la valeur reçue, l'entrée d'un tableau de résultats bruts (`Audit.resultats`,
   * typé `unknown` côté interface) portant le tag `Resultat` demandé, sur le modèle de
   * `OrchestrateurCampagneService.estResultatTague`.
   * @param resultats - Résultats bruts d'un audit.
   * @param tag - Tag `Resultat` recherché.
   * @returns Le résultat trouvé, `undefined` si absent.
   */
  private static trouverResultatTague(resultats: readonly unknown[], tag: string): unknown {
    return resultats.find((resultat) => {
      if (typeof resultat !== 'object' || resultat === null || !('type' in resultat)) {
        return false;
      }
      return resultat.type === tag;
    });
  }

  /**
   * Type-guard sans assertion `as` : vérifie qu'une valeur `unknown` est un objet non nul, donc indexable en
   * sûreté par une clé dynamique, sur le modèle de `OrchestrateurCampagneService.estObjetIndexable`.
   * @param valeur - Valeur à vérifier.
   * @returns `true` si `valeur` est un objet non nul.
   */
  private static estObjetIndexable(valeur: unknown): valeur is Record<string, unknown> {
    return typeof valeur === 'object' && valeur !== null;
  }

  /**
   * Extrait, pour un ensemble de paires (champ, libellé), les mesures numériques portées par un objet indexable.
   * @param objet - Objet dont les champs numériques sont extraits.
   * @param paires - Paires (nom du champ, libellé lisible) à extraire.
   * @returns Les mesures dont le champ correspondant est bien un nombre.
   */
  private static mesuresNumeriques(
    objet: Record<string, unknown>,
    paires: readonly (readonly [string, string])[],
  ): readonly Mesure[] {
    const mesures: Mesure[] = [];
    for (const [champ, libelle] of paires) {
      const valeur = objet[champ];
      if (typeof valeur === 'number') {
        mesures.push({ libelle, valeur });
      }
    }
    return mesures;
  }

  /**
   * Extrait les mesures numériques comparables d'un résultat brut typé `unknown`, selon son tag `Resultat`
   * (catalogue figé, cf. commentaire d'en-tête pour les tags hors périmètre).
   * @param resultat - Résultat brut (entrée de `Audit.resultats`), `undefined` si l'indicateur n'a pas été obtenu.
   * @param tag - Tag `Resultat` du résultat.
   * @returns Les mesures numériques extraites, tableau vide si le résultat est absent ou ne porte aucune mesure
   * comparable.
   */
  private static extraireMesures(resultat: unknown, tag: string): readonly Mesure[] {
    if (!this.estObjetIndexable(resultat)) {
      return [];
    }
    switch (tag) {
      case 'gitlab.taille_depot':
        return this.mesuresNumeriques(resultat, [['tailleOctets', 'Taille du dépôt (octets)']]);
      case 'gitlab.contributeurs': {
        const contributeurs = resultat['contributeurs'];
        return Array.isArray(contributeurs)
          ? [{ libelle: 'Nombre de contributeurs', valeur: contributeurs.length }]
          : [];
      }
      case 'gitlab.merge_requests': {
        const mrOuvertes = resultat['mrOuvertes'];
        return Array.isArray(mrOuvertes)
          ? [{ libelle: 'Demandes de fusion ouvertes', valeur: mrOuvertes.length }]
          : [];
      }
      case 'gitlab.membres': {
        const membres = resultat['membres'];
        return Array.isArray(membres)
          ? [{ libelle: 'Nombre de membres', valeur: membres.length }]
          : [];
      }
      case 'sonar.violations': {
        const mesures: Mesure[] = [
          ...this.mesuresNumeriques(resultat, [['nouvellesViolations', 'Nouvelles violations']]),
        ];
        const parSeverite = resultat['parSeverite'];
        if (this.estObjetIndexable(parSeverite)) {
          mesures.push(
            ...this.mesuresNumeriques(parSeverite, [
              ['bloquant', 'Violations bloquantes'],
              ['critique', 'Violations critiques'],
              ['majeur', 'Violations majeures'],
              ['mineur', 'Violations mineures'],
              ['info', "Violations d'information"],
            ]),
          );
        }
        return mesures;
      }
      case 'sonar.dette':
        return this.mesuresNumeriques(resultat, [
          ['detteMinutes', 'Dette technique (minutes)'],
          ['ratioDette', 'Ratio de dette'],
        ]);
      case 'sonar.couverture':
        return this.mesuresNumeriques(resultat, [
          ['couverture', 'Couverture de tests'],
          ['couvertureNouveauCode', 'Couverture du nouveau code'],
        ]);
      case 'sonar.notes':
        return this.mesuresNumeriques(resultat, [
          ['fiabilite', 'Note de fiabilité'],
          ['securite', 'Note de sécurité'],
          ['maintenabilite', 'Note de maintenabilité'],
          ['revueSecurite', 'Note de revue de sécurité'],
        ]);
      case 'sonar.ncloc':
        return this.mesuresNumeriques(resultat, [['ncloc', 'Volume de code (ncloc)']]);
      case 'croise.activite_sans_qualite':
        return this.mesuresNumeriques(resultat, [
          ['nombreCommits', 'Commits sans qualité (activité)'],
          ['nouvellesViolations', 'Nouvelles violations (activité sans qualité)'],
        ]);
      default:
        return [];
    }
  }
}
