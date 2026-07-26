// Fichier généré avec l'assistance de l'IA (Claude Code), conformément à la mention d'origine requise par
// .claude/rules/01-usage-ia-et-conventions.md.
//
// Calcule, à partir du journal des modifications (RG-023), les changements de seuil à représenter en lignes
// verticales étiquetées sur le graphique d'évolution (US-016, écran Synthèse graphique, Phase 6 incrément 7).
// Fonction pure, lecture seule, sans effet de bord : ne fait que filtrer et mettre en forme des entrées déjà
// présentes dans le journal fourni.
//
// Décision d'architecture (à valider par un humain, cf. rapport de développement de cet incrément) : `EntreeJournal`
// est typée côté `services/avecetat/etat/types-donnees.ts`, non importable ici (frontière de couches du Moteur de
// jugement, `services/sansetat/` ne dépend jamais de `services/avecetat/`, cf. `derniere-campagne.utils.ts` et
// `differentiel-audits.utils.ts` pour le même problème). {@link EntreeJournalMinimale} ci-dessous en reprend la
// forme structurelle minimale nécessaire à ce calcul : un tableau `readonly EntreeJournal[]` réel reste directement
// assignable à `readonly EntreeJournalMinimale[]` (sous-typage structurel TypeScript), sans assertion de type (`as`,
// interdite par `@typescript-eslint/consistent-type-assertions` de ce projet).
//
// Décision arbitraire (à valider par un humain) : le journal des modifications (RG-023) couvre un périmètre plus
// large que les seuls seuils de couleur (référentiels de dépendances/marqueurs IA, qualification de membre,
// politique IA, ref auditée d'une source, cf. `docs/02_documentation/05_reglesGestion.md#seuils-référentiels-et-
// historisation`) ; ce module se limite strictement, par défaut, aux entrées dont `objet` commence par le préfixe
// `parametres.seuils.` (convention illustrée par `docs/01_besoin/exemple-donnees.json`, ex.
// `parametres.seuils.vitalite.mortJours`), conformément au périmètre explicite de cet incrément (« déterminer les
// changements de SEUIL »). Un préfixe plus étroit peut être transmis par l'écran appelant pour restreindre les
// lignes verticales aux seuils pertinents pour l'indicateur affiché (ex. `parametres.seuils.couverture`).

/**
 * Entrée du journal des modifications de paramétrage (RG-023), forme structurelle minimale consommée par ce module
 * (mirroir structurel d'`EntreeJournal`, cf. commentaire d'en-tête).
 */
export interface EntreeJournalMinimale {
  /** Horodatage de la modification (ISO 8601). */
  readonly horodatage: string;
  /** Chemin de l'objet modifié. */
  readonly objet: string;
  /** Valeur avant modification. */
  readonly avant: unknown;
  /** Valeur après modification. */
  readonly apres: unknown;
}

/**
 * Changement de seuil à représenter par une ligne verticale étiquetée sur le graphique d'évolution (US-016).
 */
export interface ChangementSeuil {
  /** Horodatage ISO 8601 de la modification (`EntreeJournal.horodatage`), position de la ligne verticale. */
  readonly date: string;
  /** Chemin complet de l'objet modifié (`EntreeJournal.objet`). */
  readonly objet: string;
  /** Libellé court affichable sur la ligne verticale (chemin abrégé et valeurs avant/après). */
  readonly libelle: string;
}

/**
 * Fonctions pures de calcul des changements de seuil du journal des modifications (RG-023) à représenter en
 * lignes verticales étiquetées sur le graphique d'évolution (US-016). Classe à membres statiques uniquement,
 * conformément à la règle « aucune fonction hors classe » des normes de développement du projet.
 */
export class ChangementSeuilUtils {
  /**
   * Préfixe structurel constant de toute entrée de journal concernant un seuil de couleur (`parametres.seuils.`),
   * valeur par défaut du paramètre de filtrage de {@link calculerChangementsSeuil}.
   */
  private static readonly PREFIXE_SEUILS = 'parametres.seuils.';

  /**
   * Met en forme une valeur `avant`/`apres` du journal (`unknown`) en texte affichable sur une ligne verticale, sans
   * accès non sûr à cette valeur.
   * @param valeur - Valeur à mettre en forme.
   * @returns Le texte affichable, `—` si `valeur` est absente (`null`/`undefined`).
   */
  private static formaterValeur(valeur: unknown): string {
    if (valeur === null || valeur === undefined) {
      return '—';
    }
    if (typeof valeur === 'string' || typeof valeur === 'number' || typeof valeur === 'boolean') {
      return String(valeur);
    }
    return JSON.stringify(valeur) ?? '—';
  }

  /**
   * Construit le changement de seuil affichable correspondant à une entrée du journal déjà retenue (cf.
   * {@link calculerChangementsSeuil}).
   * @param entree - Entrée du journal concernant un seuil.
   * @returns Le changement de seuil construit.
   */
  private static construireChangement(entree: EntreeJournalMinimale): ChangementSeuil {
    const cheminCourt = entree.objet.startsWith(ChangementSeuilUtils.PREFIXE_SEUILS)
      ? entree.objet.slice(ChangementSeuilUtils.PREFIXE_SEUILS.length)
      : entree.objet;
    const libelle = `${cheminCourt} : ${ChangementSeuilUtils.formaterValeur(entree.avant)} → ${ChangementSeuilUtils.formaterValeur(entree.apres)}`;
    return { date: entree.horodatage, objet: entree.objet, libelle };
  }

  /**
   * Calcule les changements de seuil du journal des modifications (RG-023) à représenter en lignes verticales
   * étiquetées sur le graphique d'évolution, fonction pure sans effet de bord : ne fait que filtrer et mettre en
   * forme des entrées déjà présentes dans `journal`, jamais recalculées ni modifiées. Seules les entrées dont
   * `objet` commence par le préfixe fourni sont retenues (par défaut, tout changement de seuil, cf. commentaire
   * d'en-tête) ; les entrées retenues sont triées de la plus ancienne à la plus récente (ordre d'affichage naturel
   * sur l'axe temporel du graphique).
   * @param journal - Journal complet des modifications (`DonneesRacine.journal`, RG-023).
   * @param prefixeObjet - Préfixe de filtrage de `EntreeJournal.objet` ; `parametres.seuils.` par défaut (tout
   * changement de seuil confondu) ; un préfixe plus étroit (ex. `parametres.seuils.couverture`) restreint le
   * résultat aux seuils pertinents pour un indicateur donné.
   * @returns Les changements de seuil retenus, triés de la plus ancienne à la plus récente modification.
   */
  public static calculerChangementsSeuil(
    journal: readonly EntreeJournalMinimale[],
    prefixeObjet: string = ChangementSeuilUtils.PREFIXE_SEUILS,
  ): readonly ChangementSeuil[] {
    return journal
      .filter((entree) => entree.objet.startsWith(prefixeObjet))
      .map((entree) => ChangementSeuilUtils.construireChangement(entree))
      .sort((a, b) => (a.date < b.date ? -1 : a.date > b.date ? 1 : 0));
  }
}
