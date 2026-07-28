// Fichier généré avec l'assistance de l'IA (Claude Code), conformément à la mention d'origine requise par
// .claude/rules/01-usage-ia-et-conventions.md.
//
// Bouchon TS de `FacadeCommandesService`, activé par `InvocationCommandeUtils` hors contexte Tauri (`ng serve`)
// pour permettre le test manuel de l'interface sans cœur natif, conformément à l'échange du 2026-07-28. Deux
// conventions actées lors de cet échange :
// - `tester_connectivite` répond toujours un succès (portée non excessive) ;
// - les résultats Sonar (`interroger_violations`, `interroger_dette`, `interroger_couverture`) reçoivent un
//   aléatoire de ± 10 % à chaque appel (cf. `AMPLITUDE_ALEATOIRE_SONAR`), pour donner à voir des valeurs qui
//   varient d'un rafraîchissement à l'autre plutôt qu'un jeu de données figé. Les notes Sonar (`interroger_notes`,
//   échelle discrète 1.0–5.0) et le volume de code (`interroger_ncloc`) restent volontairement fixes : les
//   randomiser produirait des grades ou des répartitions par langage incohérents plutôt que réalistes.
import type {
  Branche,
  Dependance,
  ResultatGitlabBranches,
  ResultatGitlabContributeurs,
  ResultatGitlabDependances,
  ResultatGitlabMarqueursIa,
  ResultatGitlabMembres,
  ResultatGitlabMergeRequests,
  ResultatGitlabTailleDepot,
  ResultatGitlabVitalite,
  ResultatSonarCouverture,
  ResultatSonarDette,
  ResultatSonarNcloc,
  ResultatSonarNotes,
  ResultatSonarViolations,
  VerdictConnectivite,
} from '../types-facade';
import {
  CONSTATS_GITLAB_BOUCHON,
  CONSTATS_SONAR_BOUCHON,
  CONSTAT_GITLAB_REPLI,
  CONSTAT_SONAR_REPLI,
  type ConstatGitlabBouchon,
  type ConstatSonarBouchon,
} from './donnees-bouchon';

/** Amplitude de l'aléatoire appliqué aux résultats Sonar (± 10 % des valeurs continues), cf. en-tête ci-dessus. */
const AMPLITUDE_ALEATOIRE_SONAR = 0.1;

/**
 * Union de toutes les réponses brutes que peut produire ce bouchon, une par commande couverte. Sert uniquement à
 * typer la signature d'implémentation de {@link BouchonCommandesUtils.invoquer} (cf. commentaire de cette
 * méthode) : `FacadeCommandesService` continue de consommer le résultat via le paramètre de type `TReponse` de la
 * signature surchargée, jamais via ce type.
 */
type ReponseBouchon =
  | VerdictConnectivite
  | undefined
  | readonly string[]
  | string
  | null
  | ResultatGitlabVitalite
  | ResultatGitlabTailleDepot
  | ResultatGitlabContributeurs
  | ResultatGitlabMergeRequests
  | ResultatGitlabMembres
  | ResultatGitlabBranches
  | ResultatGitlabDependances
  | ResultatGitlabMarqueursIa
  | ResultatSonarViolations
  | ResultatSonarDette
  | ResultatSonarCouverture
  | ResultatSonarNotes
  | ResultatSonarNcloc;

/**
 * Correspondance `Source.idExterne` (dépôt GitLab) -> `Source.id`, nécessaire à `interrogerBranches` (US-008,
 * autocomplétion) qui ne reçoit pas `sourceId` (cf. `docs/01_besoin/exemple-donnees.json#groupes[].projets[].sources[]`).
 */
const SOURCE_ID_PAR_ID_EXTERNE_GITLAB: ReadonlyMap<string, string> = new Map([
  ['1234', 'f0000000-0000-4000-8000-000000000001'],
  ['1567', 'f0000000-0000-4000-8000-000000000003'],
  ['402', 'f0000000-0000-4000-8000-000000000005'],
  ['88', 'f0000000-0000-4000-8000-000000000006'],
  ['91', 'f0000000-0000-4000-8000-000000000008'],
  ['104', 'f0000000-0000-4000-8000-000000000010'],
]);

/**
 * Correspondance `Source.idExterne` (projet Sonar) -> `Source.id`, nécessaire à `interrogerDerniereAnalyse` (Phase
 * 5, incrément 3) qui ne reçoit pas `sourceId` (cf. commentaire de `SOURCE_ID_PAR_ID_EXTERNE_GITLAB` ci-dessus).
 */
const SOURCE_ID_PAR_ID_EXTERNE_SONAR: ReadonlyMap<string, string> = new Map([
  ['entreprise:api-facturation', 'f0000000-0000-4000-8000-000000000002'],
  ['entreprise:batch-comptable', 'f0000000-0000-4000-8000-000000000004'],
  ['nova:front-portail', 'f0000000-0000-4000-8000-000000000007'],
  ['nova:api-portail', 'f0000000-0000-4000-8000-000000000009'],
]);

/**
 * Bouchon TS des commandes de la Façade portées par `FacadeCommandesService` (connectivité, interrogations
 * GitLab/Sonar), activé hors contexte Tauri par `InvocationCommandeUtils`. Reproduit la forme brute des réponses
 * `invoke` (jamais l'enveloppe `{ type: 'succes' | 'echec', ... }` reconstituée par `FacadeCommandesService`
 * lui-même), pour rester indiscernable du vrai pont IPC du point de vue de la Façade.
 */
export class BouchonCommandesUtils {
  /**
   * Résout une commande bouchonnée, sur le modèle de `invoke<TReponse>(commande, parametres)`. Signature
   * surchargée : la signature générique ci-dessous est celle exposée aux appelants (`InvocationCommandeUtils`,
   * sur le modèle exact de `invoke<TReponse>`) ; la signature d'implémentation qui suit, plus précise
   * (`Promise<ReponseBouchon>`), est celle que le corps de la méthode doit réellement respecter. Ce couple évite
   * toute assertion de type (`@typescript-eslint/consistent-type-assertions`, `assertionStyle: 'never'`) à cette
   * frontière, sur le modèle du découplage déclaration/implémentation déjà accepté sans assertion pour `invoke`
   * lui-même (déclaration ambiante côté `@tauri-apps/api/core`).
   * @param commande - Nom de la commande (`snake_case`, identique côté cœur natif).
   * @param parametres - Paramètres de la commande, tels que transmis par la Façade à `invoke`.
   * @returns La réponse typée de la commande, ou un rejet si `commande` n'est pas bouchonnée (cf.
   * {@link resoudre}) : la connectivité bouchonnée, elle, est toujours un succès.
   */
  public static invoquer<TReponse>(
    commande: string,
    parametres: Readonly<Record<string, unknown>>,
  ): Promise<TReponse>;
  public static invoquer(
    commande: string,
    parametres: Readonly<Record<string, unknown>>,
  ): Promise<ReponseBouchon> {
    try {
      return Promise.resolve(BouchonCommandesUtils.resoudre(commande, parametres));
    } catch (erreur: unknown) {
      return Promise.reject(erreur instanceof Error ? erreur : new Error(String(erreur)));
    }
  }

  /**
   * Distribue la commande vers sa résolution bouchonnée dédiée.
   * @param commande - Nom de la commande.
   * @param parametres - Paramètres de la commande.
   * @returns La réponse brute, enveloppée par {@link invoquer}.
   */
  private static resoudre(
    commande: string,
    parametres: Readonly<Record<string, unknown>>,
  ): ReponseBouchon {
    switch (commande) {
      case 'tester_connectivite':
        return BouchonCommandesUtils.testerConnectivite();
      case 'definir_credentials':
        return undefined;
      case 'interroger_branches':
        return BouchonCommandesUtils.interrogerBranches(parametres);
      case 'interroger_vitalite':
        return BouchonCommandesUtils.constatVitalite(parametres);
      case 'interroger_taille_depot':
        return BouchonCommandesUtils.constatTailleDepot(parametres);
      case 'interroger_contributeurs':
        return BouchonCommandesUtils.constatContributeurs(parametres);
      case 'interroger_merge_requests':
        return BouchonCommandesUtils.constatMergeRequests(parametres);
      case 'interroger_membres':
        return BouchonCommandesUtils.constatMembres(parametres);
      case 'interroger_branches_completes':
        return BouchonCommandesUtils.constatBranchesCompletes(parametres);
      case 'interroger_dependances':
        return BouchonCommandesUtils.constatDependances(parametres);
      case 'interroger_marqueurs_ia':
        return BouchonCommandesUtils.constatMarqueursIa(parametres);
      case 'interroger_violations':
        return BouchonCommandesUtils.constatViolations(parametres);
      case 'interroger_dette':
        return BouchonCommandesUtils.constatDette(parametres);
      case 'interroger_couverture':
        return BouchonCommandesUtils.constatCouverture(parametres);
      case 'interroger_notes':
        return BouchonCommandesUtils.constatNotes(parametres);
      case 'interroger_ncloc':
        return BouchonCommandesUtils.constatNcloc(parametres);
      case 'interroger_derniere_analyse':
        return BouchonCommandesUtils.derniereAnalyse(parametres);
      default:
        throw new Error(`BouchonCommandesUtils : commande « ${commande} » non bouchonnée.`);
    }
  }

  /**
   * Verdict de connectivité bouchonné : toujours un succès à portée non excessive (convention actée le
   * 2026-07-28, à défaut de scénario d'anomalie explicitement demandé pour le test manuel).
   * @returns Un verdict de connectivité toujours favorable.
   */
  private static testerConnectivite(): VerdictConnectivite {
    return { porteeExcessive: false };
  }

  /**
   * Lit `sourceId` dans les paramètres reçus, requis par toutes les commandes d'interrogation d'indicateur.
   * @param parametres - Paramètres de la commande.
   * @returns La valeur de `sourceId`, ou une chaîne vide si absente ou de type inattendu (frontière non fiable).
   */
  private static lireSourceId(parametres: Readonly<Record<string, unknown>>): string {
    const valeur = parametres['sourceId'];
    return typeof valeur === 'string' ? valeur : '';
  }

  /**
   * Résout le constat GitLab bouchonné associé à `sourceId`, ou le constat de repli si inconnu du jeu de données
   * (ex. projet créé pendant la session de test manuel plutôt qu'importé du jeu de données d'exemple).
   * @param parametres - Paramètres de la commande, portant `sourceId`.
   * @returns Le constat GitLab bouchonné, jamais absent.
   */
  private static resoudreConstatGitlab(
    parametres: Readonly<Record<string, unknown>>,
  ): ConstatGitlabBouchon {
    const sourceId = BouchonCommandesUtils.lireSourceId(parametres);
    return CONSTATS_GITLAB_BOUCHON.get(sourceId) ?? CONSTAT_GITLAB_REPLI;
  }

  /**
   * Résout le constat Sonar bouchonné associé à `sourceId`, sur le modèle de {@link resoudreConstatGitlab}.
   * @param parametres - Paramètres de la commande, portant `sourceId`.
   * @returns Le constat Sonar bouchonné, jamais absent.
   */
  private static resoudreConstatSonar(
    parametres: Readonly<Record<string, unknown>>,
  ): ConstatSonarBouchon {
    const sourceId = BouchonCommandesUtils.lireSourceId(parametres);
    return CONSTATS_SONAR_BOUCHON.get(sourceId) ?? CONSTAT_SONAR_REPLI;
  }

  /**
   * Résout la commande `interroger_vitalite`.
   * @param parametres - Paramètres de la commande, portant `sourceId`.
   * @returns Le constat de vitalité bouchonné.
   */
  private static constatVitalite(
    parametres: Readonly<Record<string, unknown>>,
  ): ResultatGitlabVitalite {
    const sourceId = BouchonCommandesUtils.lireSourceId(parametres);
    const constat = BouchonCommandesUtils.resoudreConstatGitlab(parametres);
    return {
      sourceId,
      refEffective: constat.refEffective,
      shaTete: constat.shaTete,
      dernierCommitLe: constat.dernierCommitLe,
    };
  }

  /**
   * Résout la commande `interroger_taille_depot`.
   * @param parametres - Paramètres de la commande, portant `sourceId`.
   * @returns Le constat de taille de dépôt bouchonné.
   */
  private static constatTailleDepot(
    parametres: Readonly<Record<string, unknown>>,
  ): ResultatGitlabTailleDepot {
    const sourceId = BouchonCommandesUtils.lireSourceId(parametres);
    const constat = BouchonCommandesUtils.resoudreConstatGitlab(parametres);
    return {
      sourceId,
      refEffective: constat.refEffective,
      shaTete: constat.shaTete,
      tailleOctets: constat.tailleOctets,
    };
  }

  /**
   * Résout la commande `interroger_contributeurs`.
   * @param parametres - Paramètres de la commande, portant `sourceId`.
   * @returns Le constat de contributeurs bouchonné (fenêtre glissante fixe de 90 jours).
   */
  private static constatContributeurs(
    parametres: Readonly<Record<string, unknown>>,
  ): ResultatGitlabContributeurs {
    const sourceId = BouchonCommandesUtils.lireSourceId(parametres);
    const constat = BouchonCommandesUtils.resoudreConstatGitlab(parametres);
    return {
      sourceId,
      refEffective: constat.refEffective,
      shaTete: constat.shaTete,
      fenetreJours: 90,
      contributeurs: constat.contributeurs,
    };
  }

  /**
   * Résout la commande `interroger_merge_requests`.
   * @param parametres - Paramètres de la commande, portant `sourceId`.
   * @returns Le constat de demandes de fusion ouvertes bouchonné.
   */
  private static constatMergeRequests(
    parametres: Readonly<Record<string, unknown>>,
  ): ResultatGitlabMergeRequests {
    const sourceId = BouchonCommandesUtils.lireSourceId(parametres);
    const constat = BouchonCommandesUtils.resoudreConstatGitlab(parametres);
    return {
      sourceId,
      refEffective: constat.refEffective,
      shaTete: constat.shaTete,
      mrOuvertes: constat.mrOuvertes,
    };
  }

  /**
   * Résout la commande `interroger_membres`.
   * @param parametres - Paramètres de la commande, portant `sourceId`.
   * @returns Le constat de membres du dépôt bouchonné.
   */
  private static constatMembres(
    parametres: Readonly<Record<string, unknown>>,
  ): ResultatGitlabMembres {
    const sourceId = BouchonCommandesUtils.lireSourceId(parametres);
    const constat = BouchonCommandesUtils.resoudreConstatGitlab(parametres);
    return {
      sourceId,
      refEffective: constat.refEffective,
      shaTete: constat.shaTete,
      membres: constat.membres,
    };
  }

  /**
   * Résout la commande `interroger_branches_completes` (US-009, RG-030 ; distincte de l'autocomplétion
   * {@link interrogerBranches}).
   * @param parametres - Paramètres de la commande, portant `sourceId`.
   * @returns Le constat de branches complètes bouchonné.
   */
  private static constatBranchesCompletes(
    parametres: Readonly<Record<string, unknown>>,
  ): ResultatGitlabBranches {
    const sourceId = BouchonCommandesUtils.lireSourceId(parametres);
    const constat = BouchonCommandesUtils.resoudreConstatGitlab(parametres);
    const branches: readonly Branche[] = constat.branches;
    return { sourceId, refEffective: constat.refEffective, shaTete: constat.shaTete, branches };
  }

  /**
   * Résout la commande `interroger_dependances`.
   * @param parametres - Paramètres de la commande, portant `sourceId`.
   * @returns Le constat de dépendances déclarées bouchonné.
   */
  private static constatDependances(
    parametres: Readonly<Record<string, unknown>>,
  ): ResultatGitlabDependances {
    const sourceId = BouchonCommandesUtils.lireSourceId(parametres);
    const constat = BouchonCommandesUtils.resoudreConstatGitlab(parametres);
    const dependances: readonly Dependance[] = constat.dependances;
    return { sourceId, refEffective: constat.refEffective, shaTete: constat.shaTete, dependances };
  }

  /**
   * Résout la commande `interroger_marqueurs_ia` (F18).
   * @param parametres - Paramètres de la commande, portant `sourceId` (le référentiel `reglesMarqueursIa` transmis
   * par l'appelant n'est pas consommé par ce bouchon : les marqueurs détectés du jeu de données sont déjà réputés
   * conformes au référentiel d'exemple, cf. `docs/01_besoin/exemple-donnees.json#referentiels.reglesMarqueursIA`).
   * @returns Le constat de marqueurs d'outils IA bouchonné.
   */
  private static constatMarqueursIa(
    parametres: Readonly<Record<string, unknown>>,
  ): ResultatGitlabMarqueursIa {
    const sourceId = BouchonCommandesUtils.lireSourceId(parametres);
    const constat = BouchonCommandesUtils.resoudreConstatGitlab(parametres);
    return {
      sourceId,
      refEffective: constat.refEffective,
      shaTete: constat.shaTete,
      marqueurs: constat.marqueurs,
    };
  }

  /**
   * Autocomplétion des branches (US-008), résolue par `idExterne` (pas de `sourceId` transmis par cette commande).
   * @param parametres - Paramètres de la commande, portant `idExterne` et `recherche`.
   * @returns La liste des noms de branches, filtrée par `recherche` si transmis.
   */
  private static interrogerBranches(
    parametres: Readonly<Record<string, unknown>>,
  ): readonly string[] {
    const idExterne = parametres['idExterne'];
    const sourceId =
      typeof idExterne === 'string' ? SOURCE_ID_PAR_ID_EXTERNE_GITLAB.get(idExterne) : undefined;
    const constat =
      sourceId === undefined
        ? CONSTAT_GITLAB_REPLI
        : (CONSTATS_GITLAB_BOUCHON.get(sourceId) ?? CONSTAT_GITLAB_REPLI);
    const recherche = parametres['recherche'];
    if (typeof recherche !== 'string' || recherche.length === 0) {
      return constat.branchesAutocompletion;
    }
    return constat.branchesAutocompletion.filter((nom) => nom.includes(recherche));
  }

  /**
   * Résout la commande `interroger_violations`, avec aléatoire (cf. en-tête de fichier).
   * @param parametres - Paramètres de la commande, portant `sourceId`.
   * @returns Le constat de violations Sonar bouchonné, jitteré.
   */
  private static constatViolations(
    parametres: Readonly<Record<string, unknown>>,
  ): ResultatSonarViolations {
    const sourceId = BouchonCommandesUtils.lireSourceId(parametres);
    const constat = BouchonCommandesUtils.resoudreConstatSonar(parametres);
    return {
      sourceId,
      parSeverite: {
        bloquant: BouchonCommandesUtils.jitterEntier(constat.violations.bloquant),
        critique: BouchonCommandesUtils.jitterEntier(constat.violations.critique),
        majeur: BouchonCommandesUtils.jitterEntier(constat.violations.majeur),
        mineur: BouchonCommandesUtils.jitterEntier(constat.violations.mineur),
        info: BouchonCommandesUtils.jitterEntier(constat.violations.info),
      },
      nouvellesViolations: BouchonCommandesUtils.jitterEntier(constat.nouvellesViolations),
    };
  }

  /**
   * Résout la commande `interroger_dette`, avec aléatoire (cf. en-tête de fichier).
   * @param parametres - Paramètres de la commande, portant `sourceId`.
   * @returns Le constat de dette technique Sonar bouchonné, jitteré.
   */
  private static constatDette(parametres: Readonly<Record<string, unknown>>): ResultatSonarDette {
    const sourceId = BouchonCommandesUtils.lireSourceId(parametres);
    const constat = BouchonCommandesUtils.resoudreConstatSonar(parametres);
    return {
      sourceId,
      detteMinutes: BouchonCommandesUtils.jitterEntier(constat.dette.detteMinutes),
      ratioDette: BouchonCommandesUtils.jitterDecimal(constat.dette.ratioDette, 100),
    };
  }

  /**
   * Résout la commande `interroger_couverture`, avec aléatoire (cf. en-tête de fichier).
   * @param parametres - Paramètres de la commande, portant `sourceId`.
   * @returns Le constat de couverture de tests Sonar bouchonné, jitteré.
   */
  private static constatCouverture(
    parametres: Readonly<Record<string, unknown>>,
  ): ResultatSonarCouverture {
    const sourceId = BouchonCommandesUtils.lireSourceId(parametres);
    const constat = BouchonCommandesUtils.resoudreConstatSonar(parametres);
    const duplicationNouveauCode =
      constat.couverture.duplicationNouveauCode === undefined
        ? undefined
        : BouchonCommandesUtils.jitterDecimal(constat.couverture.duplicationNouveauCode, 100);
    return {
      sourceId,
      couverture: BouchonCommandesUtils.jitterDecimal(constat.couverture.couverture, 100),
      couvertureNouveauCode: BouchonCommandesUtils.jitterDecimal(
        constat.couverture.couvertureNouveauCode,
        100,
      ),
      ...(duplicationNouveauCode === undefined ? {} : { duplicationNouveauCode }),
    };
  }

  /**
   * Résout la commande `interroger_notes`. Jamais randomisée (échelle discrète RG-011, cf. en-tête de fichier).
   * @param parametres - Paramètres de la commande, portant `sourceId`.
   * @returns Le constat de notes Sonar bouchonné.
   */
  private static constatNotes(parametres: Readonly<Record<string, unknown>>): ResultatSonarNotes {
    const sourceId = BouchonCommandesUtils.lireSourceId(parametres);
    const constat = BouchonCommandesUtils.resoudreConstatSonar(parametres);
    // Notes sur échelle discrète 1.0-5.0 (RG-011) : jamais randomisées, cf. en-tête de fichier.
    return { sourceId, ...constat.notes };
  }

  /**
   * Résout la commande `interroger_ncloc`. Jamais randomisée (cf. en-tête de fichier).
   * @param parametres - Paramètres de la commande, portant `sourceId`.
   * @returns Le constat de volume de code Sonar bouchonné.
   */
  private static constatNcloc(parametres: Readonly<Record<string, unknown>>): ResultatSonarNcloc {
    const sourceId = BouchonCommandesUtils.lireSourceId(parametres);
    const constat = BouchonCommandesUtils.resoudreConstatSonar(parametres);
    // Volume de code jamais randomisé, cf. en-tête de fichier.
    return { sourceId, ...constat.ncloc };
  }

  /**
   * Date de dernière analyse Sonar (Phase 5, incrément 3), résolue par `idExterne` (pas de `sourceId` transmis).
   * @param parametres - Paramètres de la commande, portant `idExterne`.
   * @returns La date de dernière analyse bouchonnée, ou `null` si le projet Sonar est inconnu du jeu de données.
   */
  private static derniereAnalyse(parametres: Readonly<Record<string, unknown>>): string | null {
    const idExterne = parametres['idExterne'];
    const sourceId =
      typeof idExterne === 'string' ? SOURCE_ID_PAR_ID_EXTERNE_SONAR.get(idExterne) : undefined;
    if (sourceId === undefined) {
      return CONSTAT_SONAR_REPLI.derniereAnalyseLe;
    }
    return (CONSTATS_SONAR_BOUCHON.get(sourceId) ?? CONSTAT_SONAR_REPLI).derniereAnalyseLe;
  }

  /**
   * Applique l'aléatoire de ± {@link AMPLITUDE_ALEATOIRE_SONAR} à une valeur entière positive (dénombrement).
   * @param valeur - Valeur d'origine du jeu de données du bouchon.
   * @returns La valeur jitterée, jamais négative.
   */
  private static jitterEntier(valeur: number): number {
    const facteur = 1 + (Math.random() * 2 - 1) * AMPLITUDE_ALEATOIRE_SONAR;
    return Math.max(0, Math.round(valeur * facteur));
  }

  /**
   * Applique l'aléatoire de ± {@link AMPLITUDE_ALEATOIRE_SONAR} à une valeur décimale bornée à `[0, plafond]` (ex.
   * un pourcentage borné à 100).
   * @param valeur - Valeur d'origine du jeu de données du bouchon.
   * @param plafond - Borne supérieure de la valeur (100 pour un pourcentage/ratio, sans autre signification).
   * @returns La valeur jitterée, arrondie à une décimale, bornée à `[0, plafond]`.
   */
  private static jitterDecimal(valeur: number, plafond: number): number {
    const facteur = 1 + (Math.random() * 2 - 1) * AMPLITUDE_ALEATOIRE_SONAR;
    const jittee = Math.min(plafond, Math.max(0, valeur * facteur));
    return Number(jittee.toFixed(1));
  }
}
