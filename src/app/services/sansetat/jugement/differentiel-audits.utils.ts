// Fichier généré avec l'assistance de l'IA (Claude Code), conformément à la mention d'origine requise par
// .claude/rules/01-usage-ia-et-conventions.md.
//
// Calcule le différentiel complet entre deux audits d'un même projet (US-018, Comparaison entre deux audits, Phase 6
// incrément 6), recalculé à l'affichage à partir des seuils/référentiels COURANTS (RG-011 : jamais stocké, jamais
// calculé avec les seuils historiques de l'époque de chaque audit) : réutilise explicitement `StatutObsolescenceUtils`
// (dépendances), `StatutMembreUtils` (membres et contributeurs) et `StatutIaUtils` (statut IA global du projet)
// plutôt que de réécrire cette logique, sur le modèle déjà établi par `agregation-theme-fiche-projet.utils.ts` et
// `derniere-campagne.utils.ts` (Phase 6, incrément 5).
//
// Décision d'architecture (à valider par un humain, cf. rapport de développement de cet incrément) : ce module,
// classé sous `services/sansetat/`, n'importe rien de `services/avecetat/` (frontière de couches du projet). Les
// résultats d'audit consommés (`resultatsAvant`/`resultatsApres`) sont donc typés par {@link
// ResultatDifferentielAudits} ci-dessous, sous-ensemble structurel minimal du catalogue figé des 16 variantes de
// résultats (`Resultat`, `services/avecetat/etat/types-donnees.ts`), exactement sur le modèle déjà retenu par
// `ResultatThemeFicheProjet` (`agregation-theme-fiche-projet.utils.ts`) : les sept variantes effectivement consommées
// (dépendances, membres, marqueurs IA, couverture, violations, notes, taille du dépôt) portent leur charge utile
// complète, les neuf autres ne portent que leur discriminant `type`, ce qui rend `Audit.resultats` (réel, typé côté
// `avecetat`) directement assignable à `readonly ResultatDifferentielAudits[]` par surtypage structurel, sans
// assertion de type (`as`, interdite par `@typescript-eslint/consistent-type-assertions` de ce projet).
//
// Décision d'architecture (à valider par un humain) : contrairement à `ParametresJugementUtils`, ce module ne lit
// PAS lui-même `referentiels`/`parametres.seuils` bruts (`unknown`) : il reçoit `reglesDependances` déjà résolues
// (lecture défensive déjà effectuée par le composant appelant, exactement comme `SqmFicheProjetComponent.
// construireLigneDependance` le fait déjà pour `StatutObsolescenceUtils`), ce qui garde ce module concentré sur le
// seul calcul de différentiel et évite de dupliquer le point unique de lecture défensive.
import type {
  Dependance,
  Marqueur,
  MembreGitlab,
  ResultatGitlabDependances,
  ResultatGitlabMarqueursIa,
  ResultatGitlabMembres,
  ResultatGitlabTailleDepot,
  ResultatSonarCouverture,
  ResultatSonarNotes,
  ResultatSonarViolations,
} from '../commandes/types-facade';
import type { RegleDependance } from './parametres-jugement.utils';
import type { ResultatObsolescence } from './statut-obsolescence.utils';
import { StatutObsolescenceUtils } from './statut-obsolescence.utils';
import type {
  IdentifiantMembre,
  RegleMembreConnu,
  ResolutionStatutMembre,
} from './statut-membre.utils';
import { StatutMembreUtils } from './statut-membre.utils';
import type { StatutIA } from './statut-ia.utils';
import { StatutIaUtils } from './statut-ia.utils';

/**
 * Discriminants des neuf variantes du catalogue figé des résultats d'audit non consommées par ce module, réduites à
 * leur seul champ `type` (cf. commentaire d'en-tête) : `gitlab.branches`/`gitlab.vitalite`/`gitlab.contributeurs`/
 * `gitlab.merge_requests` (hors périmètre des quatre volets de l'US-018), `sonar.dette`/`sonar.ncloc` (hors
 * périmètre) et les trois variantes `croise.*` (calculées côté UI, non importables ici).
 */
type ResultatAutreDifferentielAudits =
  | { readonly type: 'gitlab.branches' }
  | { readonly type: 'gitlab.vitalite' }
  | { readonly type: 'gitlab.contributeurs' }
  | { readonly type: 'gitlab.merge_requests' }
  | { readonly type: 'sonar.dette' }
  | { readonly type: 'sonar.ncloc' }
  | { readonly type: 'croise.fraicheur_sonar' }
  | { readonly type: 'croise.activite_sans_qualite' }
  | { readonly type: 'croise.ia_nouveau_code' };

/**
 * Sous-ensemble du catalogue figé des résultats d'audit (`Resultat`, `services/avecetat/etat/types-donnees.ts`)
 * effectivement consommé par {@link DifferentielAuditsUtils}, cf. commentaire d'en-tête pour la raison de cette
 * redéclaration locale plutôt qu'un import direct de `Resultat`.
 */
export type ResultatDifferentielAudits =
  | ({ readonly type: 'gitlab.dependances' } & ResultatGitlabDependances)
  | ({ readonly type: 'gitlab.membres' } & ResultatGitlabMembres)
  | ({ readonly type: 'gitlab.marqueurs_ia' } & ResultatGitlabMarqueursIa)
  | ({ readonly type: 'sonar.couverture' } & ResultatSonarCouverture)
  | ({ readonly type: 'sonar.violations' } & ResultatSonarViolations)
  | ({ readonly type: 'sonar.notes' } & ResultatSonarNotes)
  | ({ readonly type: 'gitlab.taille_depot' } & ResultatGitlabTailleDepot)
  | ResultatAutreDifferentielAudits;

/**
 * Valeur numérique avant/après/delta d'un indicateur du premier volet du différentiel, `undefined` sur un côté (ou
 * les deux) si l'indicateur concerné n'a pas été produit par l'audit correspondant (ex. aucune source Sonar
 * rattachée) ; {@link delta} n'est calculé que si les deux côtés sont disponibles.
 */
export interface ValeurIndicateurDifferentiel {
  /** Valeur constatée par l'audit le plus ancien des deux, absente si non calculable. */
  readonly avant: number | undefined;
  /** Valeur constatée par l'audit le plus récent des deux, absente si non calculable. */
  readonly apres: number | undefined;
  /** Différence (`apres - avant`), absente si l'une des deux valeurs est absente. */
  readonly delta: number | undefined;
}

/**
 * Premier volet du différentiel : indicateurs avant/après/delta. Décision arbitraire (à valider par un humain, cf.
 * rapport de développement de cet incrément, faute de maquette haute-fidélité pour cet écran) : ensemble
 * d'indicateurs retenu parmi ceux déjà restitués ailleurs dans l'application (Synthèse des audits, Fiche projet) —
 * couverture de tests, violations bloquantes et critiques, taille du dépôt, et les quatre notes A–E Sonar.
 */
export interface DifferentielIndicateurs {
  /** Couverture de tests Sonar (pourcentage). */
  readonly couverture: ValeurIndicateurDifferentiel;
  /** Nombre de violations Sonar de sévérité bloquante. */
  readonly violationsBloquant: ValeurIndicateurDifferentiel;
  /** Nombre de violations Sonar de sévérité critique. */
  readonly violationsCritique: ValeurIndicateurDifferentiel;
  /** Taille du dépôt, en octets. */
  readonly tailleDepot: ValeurIndicateurDifferentiel;
  /** Note Sonar de fiabilité (1.0–5.0). */
  readonly noteFiabilite: ValeurIndicateurDifferentiel;
  /** Note Sonar de sécurité (1.0–5.0). */
  readonly noteSecurite: ValeurIndicateurDifferentiel;
  /** Note Sonar de maintenabilité (1.0–5.0). */
  readonly noteMaintenabilite: ValeurIndicateurDifferentiel;
  /** Note Sonar de revue de sécurité (1.0–5.0). */
  readonly noteRevueSecurite: ValeurIndicateurDifferentiel;
}

/**
 * Dépendance présente dans le différentiel (ajout, retrait ou changement de statut d'obsolescence), avec son statut
 * d'obsolescence recalculé à chaque bord à partir des règles de dépendances COURANTES (RG-011).
 */
export interface DependanceDifferentielle {
  /** Référence de la dépendance. */
  readonly reference: string;
  /** Chemin du manifeste d'où provient cette dépendance. */
  readonly manifeste: string;
  /** Version constatée par l'audit le plus ancien des deux, absente si la dépendance est un ajout. */
  readonly versionAvant: string | undefined;
  /** Version constatée par l'audit le plus récent des deux, absente si la dépendance est un retrait. */
  readonly versionApres: string | undefined;
  /** Statut d'obsolescence recalculé côté audit le plus ancien (`nonReference` si la dépendance est un ajout). */
  readonly statutAvant: ResultatObsolescence;
  /** Statut d'obsolescence recalculé côté audit le plus récent (`nonReference` si la dépendance est un retrait). */
  readonly statutApres: ResultatObsolescence;
}

/**
 * Deuxième volet du différentiel : dépendances ajoutées, retirées, ou dont le statut d'obsolescence recalculé
 * diffère entre les deux audits comparés (RG-011 : les deux statuts sont recalculés avec les mêmes règles
 * courantes, un changement de statut ne peut donc provenir que d'un changement de la version constatée, jamais
 * d'une dérive du référentiel entre les deux dates).
 */
export interface DifferentielDependances {
  /** Dépendances présentes uniquement dans l'audit le plus récent. */
  readonly ajouts: readonly DependanceDifferentielle[];
  /** Dépendances présentes uniquement dans l'audit le plus ancien. */
  readonly retraits: readonly DependanceDifferentielle[];
  /** Dépendances présentes aux deux dates, dont le statut d'obsolescence recalculé diffère. */
  readonly modifications: readonly DependanceDifferentielle[];
}

/**
 * Membre présent dans le différentiel (ajout, retrait ou changement de statut de rattachement), avec sa résolution
 * de statut recalculée à chaque bord à partir des membres connus COURANTS (RG-006 à RG-011).
 */
export interface MembreDifferentiel<TStatut> {
  /** Identifiant de connexion du membre. */
  readonly username: string;
  /** Nom lisible constaté par l'audit le plus ancien, absent si le membre est un ajout. */
  readonly nomAvant: string | undefined;
  /** Nom lisible constaté par l'audit le plus récent, absent si le membre est un retrait. */
  readonly nomApres: string | undefined;
  /** Résolution du statut de rattachement côté audit le plus ancien, absente si le membre est un ajout. */
  readonly resolutionAvant: ResolutionStatutMembre<TStatut> | undefined;
  /** Résolution du statut de rattachement côté audit le plus récent, absente si le membre est un retrait. */
  readonly resolutionApres: ResolutionStatutMembre<TStatut> | undefined;
}

/**
 * Troisième volet du différentiel : membres et contributeurs ajoutés, retirés, ou dont le statut de rattachement
 * recalculé diffère entre les deux audits comparés, générique sur le type du statut restitué par
 * {@link StatutMembreUtils} (cf. commentaire d'en-tête de `statut-membre.utils.ts` pour la raison de cette
 * généricité, plutôt qu'un import direct de `StatutMembre` côté `avecetat`).
 */
export interface DifferentielMembres<TStatut> {
  /** Membres présents uniquement dans l'audit le plus récent. */
  readonly ajouts: readonly MembreDifferentiel<TStatut>[];
  /** Membres présents uniquement dans l'audit le plus ancien. */
  readonly retraits: readonly MembreDifferentiel<TStatut>[];
  /** Membres présents aux deux dates, dont le statut de rattachement recalculé diffère. */
  readonly modifications: readonly MembreDifferentiel<TStatut>[];
}

/**
 * Quatrième volet du différentiel : marqueurs d'outils IA détectés ajoutés/retirés entre les deux audits comparés,
 * complété du statut IA global du projet (RG-016) recalculé à chaque bord avec la politique d'autorisation
 * COURANTE du projet (`Projet.iaAutorisee`) — seuls les marqueurs détectés varient entre les deux bords, jamais la
 * politique elle-même (RG-011 : jugement recalculé avec les données courantes, pas celles de l'époque de l'audit).
 */
export interface DifferentielMarqueursIa {
  /** Marqueurs détectés uniquement par l'audit le plus récent. */
  readonly ajouts: readonly Marqueur[];
  /** Marqueurs détectés uniquement par l'audit le plus ancien. */
  readonly retraits: readonly Marqueur[];
  /** Statut IA global du projet recalculé côté audit le plus ancien. */
  readonly statutIaAvant: StatutIA;
  /** Statut IA global du projet recalculé côté audit le plus récent. */
  readonly statutIaApres: StatutIA;
}

/**
 * Différentiel complet entre deux audits d'un même projet (US-018), les quatre volets attendus par
 * `docs/02_documentation/09_maquettes.md#comparaison-entre-deux-audits`.
 */
export interface DifferentielAudits<TStatut> {
  /** Premier volet : indicateurs avant/après/delta. */
  readonly indicateurs: DifferentielIndicateurs;
  /** Deuxième volet : dépendances. */
  readonly dependances: DifferentielDependances;
  /** Troisième volet : membres et contributeurs. */
  readonly membres: DifferentielMembres<TStatut>;
  /** Quatrième volet : marqueurs IA détectés. */
  readonly marqueursIa: DifferentielMarqueursIa;
}

/**
 *
 */
export class DifferentielAuditsUtils {
  /**
   * Retrouve, dans une liste de résultats typés, l'unique résultat portant le discriminant `type` demandé (sur le
   * modèle de `AgregationThemeFicheProjetUtils.trouver`).
   * @param resultats - Résultats d'un audit.
   * @param type - Discriminant `type` recherché.
   * @returns Le résultat trouvé, `undefined` si absent de cet audit.
   */
  private static trouver<TType extends ResultatDifferentielAudits['type']>(
    resultats: readonly ResultatDifferentielAudits[],
    type: TType,
  ): Extract<ResultatDifferentielAudits, { type: TType }> | undefined {
    return resultats.find(
      (resultat): resultat is Extract<ResultatDifferentielAudits, { type: TType }> =>
        resultat.type === type,
    );
  }

  /**
   * Construit une valeur avant/après/delta (cf. {@link ValeurIndicateurDifferentiel}).
   * @param avant - Valeur constatée par l'audit le plus ancien, absente si non calculable.
   * @param apres - Valeur constatée par l'audit le plus récent, absente si non calculable.
   * @returns La valeur avant/après/delta construite.
   */
  private static construireValeur(
    avant: number | undefined,
    apres: number | undefined,
  ): ValeurIndicateurDifferentiel {
    return {
      avant,
      apres,
      delta: avant === undefined || apres === undefined ? undefined : apres - avant,
    };
  }

  /**
   * Calcule le premier volet du différentiel (indicateurs avant/après/delta), fonction pure : ne fait que retrouver
   * les constats bruts déjà présents dans les deux audits, sans y appliquer le moindre jugement de couleur (RG-011,
   * la coloration éventuelle relève du composant appelant, sur le modèle déjà établi par `SqmFicheProjetComponent`).
   * @param resultatsAvant - Résultats de l'audit le plus ancien des deux.
   * @param resultatsApres - Résultats de l'audit le plus récent des deux.
   * @returns Le premier volet du différentiel.
   */
  private static calculerDifferentielIndicateurs(
    resultatsAvant: readonly ResultatDifferentielAudits[],
    resultatsApres: readonly ResultatDifferentielAudits[],
  ): DifferentielIndicateurs {
    const couvertureAvant = DifferentielAuditsUtils.trouver(resultatsAvant, 'sonar.couverture');
    const couvertureApres = DifferentielAuditsUtils.trouver(resultatsApres, 'sonar.couverture');
    const violationsAvant = DifferentielAuditsUtils.trouver(resultatsAvant, 'sonar.violations');
    const violationsApres = DifferentielAuditsUtils.trouver(resultatsApres, 'sonar.violations');
    const tailleAvant = DifferentielAuditsUtils.trouver(resultatsAvant, 'gitlab.taille_depot');
    const tailleApres = DifferentielAuditsUtils.trouver(resultatsApres, 'gitlab.taille_depot');
    const notesAvant = DifferentielAuditsUtils.trouver(resultatsAvant, 'sonar.notes');
    const notesApres = DifferentielAuditsUtils.trouver(resultatsApres, 'sonar.notes');

    return {
      couverture: DifferentielAuditsUtils.construireValeur(
        couvertureAvant?.couverture,
        couvertureApres?.couverture,
      ),
      violationsBloquant: DifferentielAuditsUtils.construireValeur(
        violationsAvant?.parSeverite.bloquant,
        violationsApres?.parSeverite.bloquant,
      ),
      violationsCritique: DifferentielAuditsUtils.construireValeur(
        violationsAvant?.parSeverite.critique,
        violationsApres?.parSeverite.critique,
      ),
      tailleDepot: DifferentielAuditsUtils.construireValeur(
        tailleAvant?.tailleOctets,
        tailleApres?.tailleOctets,
      ),
      noteFiabilite: DifferentielAuditsUtils.construireValeur(
        notesAvant?.fiabilite,
        notesApres?.fiabilite,
      ),
      noteSecurite: DifferentielAuditsUtils.construireValeur(
        notesAvant?.securite,
        notesApres?.securite,
      ),
      noteMaintenabilite: DifferentielAuditsUtils.construireValeur(
        notesAvant?.maintenabilite,
        notesApres?.maintenabilite,
      ),
      noteRevueSecurite: DifferentielAuditsUtils.construireValeur(
        notesAvant?.revueSecurite,
        notesApres?.revueSecurite,
      ),
    };
  }

  /**
   * Clé stable d'une dépendance constatée (référence + manifeste), utilisée pour apparier une même dépendance entre
   * les deux audits comparés.
   * @param dependance - Dépendance constatée.
   * @returns La clé stable de cette dépendance.
   */
  private static cleDependance(dependance: Dependance): string {
    return `${dependance.reference} ${dependance.manifeste}`;
  }

  /**
   * Indique si deux statuts d'obsolescence calculés sont identiques.
   * @param a - Premier statut comparé.
   * @param b - Second statut comparé.
   * @returns `true` si les deux statuts sont identiques.
   */
  private static memeStatutObsolescence(a: ResultatObsolescence, b: ResultatObsolescence): boolean {
    if (a.type !== b.type) {
      return false;
    }
    return a.type === 'statut' && b.type === 'statut' ? a.statut === b.statut : true;
  }

  /**
   * Calcule le deuxième volet du différentiel (dépendances), en réutilisant explicitement
   * `StatutObsolescenceUtils.calculerStatutObsolescence` avec les règles de dépendances COURANTES pour recalculer
   * le statut de chaque dépendance aux deux bords (RG-011).
   * @param resultatsAvant - Résultats de l'audit le plus ancien des deux.
   * @param resultatsApres - Résultats de l'audit le plus récent des deux.
   * @param reglesDependances - Règles de dépendances courantes (`referentiels.reglesDependances`), déjà lues
   * défensivement par le composant appelant.
   * @returns Le deuxième volet du différentiel.
   */
  private static calculerDifferentielDependances(
    resultatsAvant: readonly ResultatDifferentielAudits[],
    resultatsApres: readonly ResultatDifferentielAudits[],
    reglesDependances: readonly RegleDependance[],
  ): DifferentielDependances {
    const dependancesAvant =
      DifferentielAuditsUtils.trouver(resultatsAvant, 'gitlab.dependances')?.dependances ?? [];
    const dependancesApres =
      DifferentielAuditsUtils.trouver(resultatsApres, 'gitlab.dependances')?.dependances ?? [];
    const mapAvant = new Map(
      dependancesAvant.map((dependance) => [
        DifferentielAuditsUtils.cleDependance(dependance),
        dependance,
      ]),
    );
    const mapApres = new Map(
      dependancesApres.map((dependance) => [
        DifferentielAuditsUtils.cleDependance(dependance),
        dependance,
      ]),
    );

    const ajouts: DependanceDifferentielle[] = [];
    const retraits: DependanceDifferentielle[] = [];
    const modifications: DependanceDifferentielle[] = [];

    for (const [cle, dependance] of mapApres) {
      if (!mapAvant.has(cle)) {
        ajouts.push({
          reference: dependance.reference,
          manifeste: dependance.manifeste,
          versionAvant: undefined,
          versionApres: dependance.version,
          statutAvant: { type: 'nonReference' },
          statutApres: StatutObsolescenceUtils.calculerStatutObsolescence(
            dependance,
            reglesDependances,
          ),
        });
      }
    }
    for (const [cle, dependance] of mapAvant) {
      if (!mapApres.has(cle)) {
        retraits.push({
          reference: dependance.reference,
          manifeste: dependance.manifeste,
          versionAvant: dependance.version,
          versionApres: undefined,
          statutAvant: StatutObsolescenceUtils.calculerStatutObsolescence(
            dependance,
            reglesDependances,
          ),
          statutApres: { type: 'nonReference' },
        });
      }
    }
    for (const [cle, dependanceApres] of mapApres) {
      const dependanceAvant = mapAvant.get(cle);
      if (dependanceAvant === undefined) {
        continue;
      }
      const statutAvant = StatutObsolescenceUtils.calculerStatutObsolescence(
        dependanceAvant,
        reglesDependances,
      );
      const statutApres = StatutObsolescenceUtils.calculerStatutObsolescence(
        dependanceApres,
        reglesDependances,
      );
      if (!DifferentielAuditsUtils.memeStatutObsolescence(statutAvant, statutApres)) {
        modifications.push({
          reference: dependanceApres.reference,
          manifeste: dependanceApres.manifeste,
          versionAvant: dependanceAvant.version,
          versionApres: dependanceApres.version,
          statutAvant,
          statutApres,
        });
      }
    }

    return { ajouts, retraits, modifications };
  }

  /**
   * Résout l'identifiant (username + email public) d'un membre du dépôt, forme attendue par
   * `StatutMembreUtils.calculerStatutMembre`.
   * @param membre - Membre du dépôt constaté.
   * @returns L'identifiant à résoudre.
   */
  private static identifiantMembre(membre: MembreGitlab): IdentifiantMembre {
    return { username: membre.username, email: membre.emailPublic };
  }

  /**
   * Indique si deux résolutions de statut de rattachement sont identiques.
   * @param a - Première résolution comparée.
   * @param b - Seconde résolution comparée.
   * @returns `true` si les deux résolutions sont identiques.
   */
  private static memeResolutionMembre<TStatut>(
    a: ResolutionStatutMembre<TStatut>,
    b: ResolutionStatutMembre<TStatut>,
  ): boolean {
    if (a.type !== b.type) {
      return false;
    }
    return a.type === 'connu' && b.type === 'connu' ? a.statut === b.statut : true;
  }

  /**
   * Calcule le troisième volet du différentiel (membres et contributeurs), en réutilisant explicitement
   * `StatutMembreUtils.calculerStatutMembre` avec les membres connus COURANTS pour recalculer le statut de
   * rattachement de chaque membre aux deux bords (RG-006 à RG-011).
   * @param resultatsAvant - Résultats de l'audit le plus ancien des deux.
   * @param resultatsApres - Résultats de l'audit le plus récent des deux.
   * @param membresConnus - Membres connus courants (`Groupe.membresConnus`).
   * @returns Le troisième volet du différentiel.
   */
  private static calculerDifferentielMembres<TStatut>(
    resultatsAvant: readonly ResultatDifferentielAudits[],
    resultatsApres: readonly ResultatDifferentielAudits[],
    membresConnus: readonly RegleMembreConnu<TStatut>[],
  ): DifferentielMembres<TStatut> {
    const membresAvant =
      DifferentielAuditsUtils.trouver(resultatsAvant, 'gitlab.membres')?.membres ?? [];
    const membresApres =
      DifferentielAuditsUtils.trouver(resultatsApres, 'gitlab.membres')?.membres ?? [];
    const mapAvant = new Map(membresAvant.map((membre) => [membre.username, membre]));
    const mapApres = new Map(membresApres.map((membre) => [membre.username, membre]));

    const ajouts: MembreDifferentiel<TStatut>[] = [];
    const retraits: MembreDifferentiel<TStatut>[] = [];
    const modifications: MembreDifferentiel<TStatut>[] = [];

    for (const [username, membre] of mapApres) {
      if (!mapAvant.has(username)) {
        ajouts.push({
          username,
          nomAvant: undefined,
          nomApres: membre.nom,
          resolutionAvant: undefined,
          resolutionApres: StatutMembreUtils.calculerStatutMembre(
            DifferentielAuditsUtils.identifiantMembre(membre),
            membresConnus,
          ),
        });
      }
    }
    for (const [username, membre] of mapAvant) {
      if (!mapApres.has(username)) {
        retraits.push({
          username,
          nomAvant: membre.nom,
          nomApres: undefined,
          resolutionAvant: StatutMembreUtils.calculerStatutMembre(
            DifferentielAuditsUtils.identifiantMembre(membre),
            membresConnus,
          ),
          resolutionApres: undefined,
        });
      }
    }
    for (const [username, membreApres] of mapApres) {
      const membreAvant = mapAvant.get(username);
      if (membreAvant === undefined) {
        continue;
      }
      const resolutionAvant = StatutMembreUtils.calculerStatutMembre(
        DifferentielAuditsUtils.identifiantMembre(membreAvant),
        membresConnus,
      );
      const resolutionApres = StatutMembreUtils.calculerStatutMembre(
        DifferentielAuditsUtils.identifiantMembre(membreApres),
        membresConnus,
      );
      if (!DifferentielAuditsUtils.memeResolutionMembre(resolutionAvant, resolutionApres)) {
        modifications.push({
          username,
          nomAvant: membreAvant.nom,
          nomApres: membreApres.nom,
          resolutionAvant,
          resolutionApres,
        });
      }
    }

    return { ajouts, retraits, modifications };
  }

  /**
   * Clé stable d'un marqueur d'outil IA détecté (chemin + outil), utilisée pour apparier un même marqueur entre les
   * deux audits comparés.
   * @param marqueur - Marqueur détecté.
   * @returns La clé stable de ce marqueur.
   */
  private static cleMarqueur(marqueur: Marqueur): string {
    return `${marqueur.chemin} ${marqueur.outil}`;
  }

  /**
   * Calcule le quatrième volet du différentiel (marqueurs IA détectés), en réutilisant explicitement
   * `StatutIaUtils.calculerStatutIA` avec la politique d'autorisation COURANTE du projet pour recalculer le statut
   * IA global aux deux bords (RG-016).
   * @param resultatsAvant - Résultats de l'audit le plus ancien des deux.
   * @param resultatsApres - Résultats de l'audit le plus récent des deux.
   * @param iaAutorisee - Politique d'autorisation de l'IA COURANTE du projet (`Projet.iaAutorisee`).
   * @returns Le quatrième volet du différentiel.
   */
  private static calculerDifferentielMarqueursIa(
    resultatsAvant: readonly ResultatDifferentielAudits[],
    resultatsApres: readonly ResultatDifferentielAudits[],
    iaAutorisee: boolean,
  ): DifferentielMarqueursIa {
    const marqueursAvant =
      DifferentielAuditsUtils.trouver(resultatsAvant, 'gitlab.marqueurs_ia')?.marqueurs ?? [];
    const marqueursApres =
      DifferentielAuditsUtils.trouver(resultatsApres, 'gitlab.marqueurs_ia')?.marqueurs ?? [];
    const clesAvant = new Set(
      marqueursAvant.map((marqueur) => DifferentielAuditsUtils.cleMarqueur(marqueur)),
    );
    const clesApres = new Set(
      marqueursApres.map((marqueur) => DifferentielAuditsUtils.cleMarqueur(marqueur)),
    );

    return {
      ajouts: marqueursApres.filter(
        (marqueur) => !clesAvant.has(DifferentielAuditsUtils.cleMarqueur(marqueur)),
      ),
      retraits: marqueursAvant.filter(
        (marqueur) => !clesApres.has(DifferentielAuditsUtils.cleMarqueur(marqueur)),
      ),
      statutIaAvant: StatutIaUtils.calculerStatutIA(iaAutorisee, marqueursAvant),
      statutIaApres: StatutIaUtils.calculerStatutIA(iaAutorisee, marqueursApres),
    };
  }

  /**
   * Calcule le différentiel complet entre deux audits d'un même projet (US-018), les quatre volets attendus par
   * `docs/02_documentation/09_maquettes.md#comparaison-entre-deux-audits`, recalculés à l'affichage à partir des
   * seuils/référentiels COURANTS (RG-011) plutôt que des seuils historiques de l'époque de chaque audit. Fonction
   * pure, sans effet de bord : ne fait que retrouver, apparier et recalculer des constats déjà présents dans les
   * deux jeux de résultats fournis, en réutilisant explicitement `StatutObsolescenceUtils`, `StatutMembreUtils` et
   * `StatutIaUtils` déjà livrés (aucune réécriture de cette logique).
   * @param resultatsAvant - Résultats de l'audit le plus ancien des deux comparés (`Audit.resultats`).
   * @param resultatsApres - Résultats de l'audit le plus récent des deux comparés (`Audit.resultats`).
   * @param reglesDependances - Règles de dépendances courantes (`referentiels.reglesDependances`), déjà lues
   * défensivement par le composant appelant (`ParametresJugementUtils.lireReglesDependances`).
   * @param membresConnus - Membres connus courants (`Groupe.membresConnus`).
   * @param iaAutorisee - Politique d'autorisation de l'IA COURANTE du projet (`Projet.iaAutorisee`).
   * @returns Le différentiel complet entre les deux audits.
   */
  public static calculerDifferentiel<TStatut>(
    resultatsAvant: readonly ResultatDifferentielAudits[],
    resultatsApres: readonly ResultatDifferentielAudits[],
    reglesDependances: readonly RegleDependance[],
    membresConnus: readonly RegleMembreConnu<TStatut>[],
    iaAutorisee: boolean,
  ): DifferentielAudits<TStatut> {
    return {
      indicateurs: DifferentielAuditsUtils.calculerDifferentielIndicateurs(
        resultatsAvant,
        resultatsApres,
      ),
      dependances: DifferentielAuditsUtils.calculerDifferentielDependances(
        resultatsAvant,
        resultatsApres,
        reglesDependances,
      ),
      membres: DifferentielAuditsUtils.calculerDifferentielMembres(
        resultatsAvant,
        resultatsApres,
        membresConnus,
      ),
      marqueursIa: DifferentielAuditsUtils.calculerDifferentielMarqueursIa(
        resultatsAvant,
        resultatsApres,
        iaAutorisee,
      ),
    };
  }
}
