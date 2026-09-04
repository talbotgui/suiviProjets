// Fichier généré avec l'assistance de l'IA (Claude Code), conformément à la mention d'origine requise par
// .claude/rules/01-usage-ia-et-conventions.md.
//
// Logique de parsing et de validation des lignes de la saisie en masse de qualifications de membres connus
// (US-044, RG-041), consommée comme stratégie injectée dans la modale transverse `SqmModaleSaisieMasseComponent`
// (`composants/modale-saisie-masse/`) par `SqmFicheProjetComponent`. Classe à membres statiques uniquement
// (`allowStaticOnly: true`), sur le modèle exact de `SaisieMasseDependancesUtils` (C15-07, même dossier), adapté
// aux membres : ici, à la différence des règles de dépendances, aucun regroupement n'est effectué (RG-041, point
// 4 : chaque critère désigne un seul membre, une ligne validée = un appel natif), et le statut de chaque ligne
// n'est jamais déduit ni pré-rempli (RG-041, point 3).
//
// Décision d'architecture (à valider par un humain, reprise à l'identique de `statut-membre.utils.ts` et de
// `saisie-masse-dependances.utils.ts`) : ce module, placé sous `services/sansetat/`, n'importe jamais
// `TypeCritereMembre`/`StatutMembre`/`MembreConnu` de `services/avecetat/etat/types-donnees.ts` (aucune dépendance
// de `services/sansetat/` vers `services/avecetat/`). Les trois valeurs valides de type de critère et les trois
// valeurs valides de statut sont donc reprises ici sous forme de types union de chaînes littérales
// ({@link TypeCritereMembreSaisieMasse}, {@link StatutMembreSaisieMasse}), dont les valeurs de chaîne coïncident
// avec celles des enums `TypeCritereMembre`/`StatutMembre` côté `avecetat` sans les importer ; la conversion vers
// ces enums, nécessaire à l'appel de la commande native `qualifierMembre`, reste à la charge de l'appelant
// (`SqmFicheProjetComponent`, déjà consommateur de ces enums), par un switch exhaustif plutôt qu'une assertion
// `as` non justifiée.
//
// Grammaire retenue pour une ligne de saisie (décision arbitraire de ce développement, à valider par un humain,
// faute de précision documentaire sur la forme exacte d'une ligne de saisie en masse de membres dans
// `04_casUsage.md`/`05_reglesGestion.md`/`10_charteErgonomie.md`) : une ligne par membre, au format
// `critere;typeCritere=statut` (ex. `jdupont;username=interne`), séparateur `;` puis `=` réutilisés tels quels de
// la grammaire déjà retenue par `SaisieMasseDependancesUtils` pour la cohérence visuelle entre les deux modales de
// saisie en masse partageant le même squelette (RG-040/RG-041). `typeCritere` et `statut` reprennent littéralement
// les valeurs de chaîne des enums `TypeCritereMembre`/`StatutMembre` (`username`/`email`/`domaineEmail`,
// `interne`/`client`/`partenaire`), cohérent avec la réutilisation déjà faite de ces mêmes valeurs comme paramètres
// de requête d'URL par `SqmMembresConnusAdminComponent.analyserTypeCritere` (lien « Qualifier ce membre » unitaire
// de la Fiche projet). Volontairement hors périmètre de cette grammaire (décision arbitraire à valider par un
// humain) : `libelle` et `aliasEmail`, deux champs optionnels du formulaire unitaire absents de l'énoncé de
// US-044/RG-041 (qui ne cite que « username/email/domaine + statut ») — une règle créée en masse ayant besoin de
// l'un de ces deux champs reste modifiable ensuite via le formulaire unitaire d'administration.
//
// Extension plan_18 (US-061, RG-061) : une quatrième composante positionnelle optionnelle, la date de départ
// `partiLe`, est acceptée en fin de ligne — `critere;typeCritere=statut;AAAA-MM-JJ` (ex.
// `jdupont;username=interne;2025-06-30`). Validée par ligne selon les mêmes règles que le formulaire unitaire
// (date `AAAA-MM-JJ` valide, non postérieure au jour de saisie, refusée sur un critère `domaineEmail`) ; une ligne
// dont la date de départ est invalide est rejetée sans bloquer les autres.
//
// Clé de correspondance retenue pour le rejet d'un doublon (RG-041, points 1 et 2), décision arbitraire de ce
// développement à valider par un humain : le couple (critère, type de critère), et non le seul critère — RG-041
// justifie ce rejet par analogie avec « le blocage de doublon de username déjà posé par RG-008 », qui ne bloque
// que les doublons *au sein d'un même type* (RG-007 : un même texte peut légitimement apparaître comme username
// pour une règle et, séparément, comme partie d'un domaine email pour une autre, sans ambiguïté de résolution
// puisque RG-007 les départage déjà par niveau de précédence).

/**
 * Type de critère d'une ligne de saisie en masse de membres, valeurs de chaîne identiques à celles de l'enum
 * `TypeCritereMembre` côté `avecetat`, reprises ici sans importer cet enum (cf. commentaire d'en-tête).
 */
export type TypeCritereMembreSaisieMasse = 'username' | 'email' | 'domaineEmail';

/**
 * Statut d'une ligne de saisie en masse de membres, valeurs de chaîne identiques à celles de l'enum `StatutMembre`
 * côté `avecetat`, reprises ici sans importer cet enum (cf. commentaire d'en-tête).
 */
export type StatutMembreSaisieMasse = 'interne' | 'client' | 'partenaire';

/**
 * Types de critère reconnus par une ligne de saisie en masse de membres (RG-041), dans l'ordre affiché à
 * l'utilisateur en cas d'erreur.
 */
const TYPES_CRITERE_RECONNUS: readonly TypeCritereMembreSaisieMasse[] = [
  'username',
  'email',
  'domaineEmail',
];

/**
 * Statuts reconnus par une ligne de saisie en masse de membres (RG-041), dans l'ordre affiché à l'utilisateur en
 * cas d'erreur.
 */
const STATUTS_RECONNUS: readonly StatutMembreSaisieMasse[] = ['interne', 'client', 'partenaire'];

/**
 * Erreur associée à une ligne précise de la saisie en masse de qualifications de membres (échec de validation,
 * conflit avec une règle déjà existante ou doublon interne au lot).
 */
export interface ErreurLigneSaisieMasseMembres {
  /** Texte exact de la ligne fautive, tel que saisi par l'utilisateur. */
  readonly ligne: string;
  /** Message explicite sur la correction attendue. */
  readonly message: string;
}

/**
 * Qualification de membre connu valide, prête à être soumise à la commande native `qualifierMembre` (RG-041 :
 * un appel indépendant par ligne, aucun regroupement).
 */
export interface EntreeSaisieMasseMembres {
  /** Critère de reconnaissance saisi (login, email ou domaine selon {@link typeCritere}). */
  readonly critere: string;
  /** Type du critère de reconnaissance saisi. */
  readonly typeCritere: TypeCritereMembreSaisieMasse;
  /** Statut saisi explicitement (RG-041 : jamais déduit ni pré-rempli). */
  readonly statut: StatutMembreSaisieMasse;
  /**
   * Date de départ optionnelle (`AAAA-MM-JJ`, RG-061), quatrième composante positionnelle de la ligne : absente si
   * non saisie.
   */
  readonly partiLe?: string;
  /** Ligne originale ayant produit cette entrée, conservée pour restituer le texte de la modale en cas d'échec. */
  readonly ligneOriginale: string;
}

/**
 * Règle de membre connu déjà enregistrée avant l'ouverture de la modale, uniquement les deux champs nécessaires à
 * la détection d'un conflit (RG-041, point 1) : projection minimale à construire par l'appelant à partir de
 * `Groupe.membresConnus`, sans importer le type `MembreConnu` complet (cf. commentaire d'en-tête).
 */
export interface CritereMembreExistant {
  /** Critère de reconnaissance de la règle déjà enregistrée. */
  readonly critere: string;
  /** Type de critère de la règle déjà enregistrée. */
  readonly typeCritere: string;
}

/**
 * Résultat de l'analyse (parsing, validation) d'un texte collé de saisie en masse de qualifications de membres,
 * avant tout enregistrement natif.
 */
export interface ResultatAnalyseSaisieMasseMembres {
  /** Qualifications valides, prêtes à être soumises, dans l'ordre de saisie. */
  readonly entrees: readonly EntreeSaisieMasseMembres[];
  /** Erreurs de validation, de conflit ou de doublon interne, une par ligne fautive. */
  readonly erreurs: readonly ErreurLigneSaisieMasseMembres[];
}

/**
 * Analyse et valide les lignes d'une saisie en masse de qualifications de membres connus (US-044, RG-041).
 */
export class SaisieMasseMembresUtils {
  /**
   * Analyse le texte collé d'une soumission de saisie en masse de membres : ignore les lignes vides, rejette les
   * lignes malformées, de type de critère ou de statut non reconnu, en conflit avec une règle déjà existante
   * (RG-041, point 1) ou constituant un doublon interne à ce même lot (RG-041, point 2), sans jamais bloquer la
   * validation des autres lignes.
   * @param texte - Texte collé, une ligne par membre au format `critere;typeCritere=statut`.
   * @param reglesExistantes - Règles de membres connus du groupe déjà enregistrées avant cette soumission (RG-041 :
   * additivité stricte, jamais modifiées ni fusionnées par cette saisie en masse).
   * @returns Les qualifications valides et les erreurs par ligne fautive.
   */
  public static analyser(
    texte: string,
    reglesExistantes: readonly CritereMembreExistant[],
  ): ResultatAnalyseSaisieMasseMembres {
    const erreurs: ErreurLigneSaisieMasseMembres[] = [];
    const entrees: EntreeSaisieMasseMembres[] = [];
    const clesDejaVues = new Set<string>();

    const lignes = texte
      .split('\n')
      .map((ligne) => ligne.trim())
      .filter((ligne) => ligne.length > 0);

    for (const ligne of lignes) {
      const analyseLigne = SaisieMasseMembresUtils.analyserLigne(ligne);
      if (analyseLigne === undefined) {
        erreurs.push({
          ligne,
          message:
            'Format attendu : « critere;typeCritere=statut » (ex. « jdupont;username=interne »).',
        });
        continue;
      }

      const { critere, typeCritereBrut, statutBrut, partiLeBrut } = analyseLigne;

      const typeCritere = TYPES_CRITERE_RECONNUS.find((valeur) => valeur === typeCritereBrut);
      if (typeCritere === undefined) {
        erreurs.push({
          ligne,
          message: `Type de critère « ${typeCritereBrut} » non reconnu (attendu : ${TYPES_CRITERE_RECONNUS.join(', ')}).`,
        });
        continue;
      }

      const statut = STATUTS_RECONNUS.find((valeur) => valeur === statutBrut);
      if (statut === undefined) {
        erreurs.push({
          ligne,
          message: `Statut « ${statutBrut} » non reconnu : une valeur explicite parmi ${STATUTS_RECONNUS.join(', ')} est exigée sur chaque ligne (RG-041, aucune valeur pré-remplie par défaut).`,
        });
        continue;
      }

      const messagePartiLe = SaisieMasseMembresUtils.validerPartiLe(partiLeBrut, typeCritere);
      if (messagePartiLe !== null) {
        erreurs.push({ ligne, message: messagePartiLe });
        continue;
      }

      const cle = `${typeCritere}:${critere}`;
      const existeDeja = reglesExistantes.some(
        (regle) => regle.typeCritere === typeCritere && regle.critere === critere,
      );
      if (existeDeja) {
        erreurs.push({
          ligne,
          message: `Une règle existe déjà pour le critère « ${critere} » (${typeCritere}) : ligne rejetée (saisie en masse strictement additive).`,
        });
        continue;
      }
      if (clesDejaVues.has(cle)) {
        erreurs.push({
          ligne,
          message: `Doublon interne à cette soumission pour le critère « ${critere} » (${typeCritere}) : seule la première occurrence est conservée.`,
        });
        continue;
      }
      clesDejaVues.add(cle);

      entrees.push({ critere, typeCritere, statut, partiLe: partiLeBrut, ligneOriginale: ligne });
    }

    return { entrees, erreurs };
  }

  /**
   * Valide la date de départ optionnelle d'une ligne de saisie en masse (RG-061), sur le modèle de
   * `SqmMembresConnusAdminComponent.validerPartiLe` et de `persistance::administration::valider_parti_le`.
   * @param partiLe - Quatrième composante brute de la ligne, `undefined` si non saisie.
   * @param typeCritere - Type de critère déjà reconnu de la ligne.
   * @returns Le message d'erreur à afficher, ou `null` si la date est absente ou valide.
   */
  private static validerPartiLe(
    partiLe: string | undefined,
    typeCritere: TypeCritereMembreSaisieMasse,
  ): string | null {
    if (partiLe === undefined) {
      return null;
    }
    if (typeCritere === 'domaineEmail') {
      return 'Une règle de type domaine ne peut pas porter de date de départ (RG-061).';
    }
    const horodatage = Date.parse(`${partiLe}T00:00:00Z`);
    if (!/^\d{4}-\d{2}-\d{2}$/.test(partiLe) || Number.isNaN(horodatage)) {
      return `Date de départ « ${partiLe} » invalide : format attendu AAAA-MM-JJ.`;
    }
    if (horodatage > Date.now()) {
      return `Date de départ « ${partiLe} » invalide : elle ne peut pas être dans le futur.`;
    }
    return null;
  }

  /**
   * Analyse une ligne unique au format `critere;typeCritere=statut`, sans encore valider que le type de critère et
   * le statut extraits correspondent à des valeurs reconnues (cf. {@link analyser}).
   * @param ligne - Ligne déjà nettoyée de ses espaces superflus, non vide.
   * @returns Le critère et les valeurs brutes de type de critère/statut analysées, `undefined` si la ligne est
   * malformée (séparateur `;` ou `=` absent, ou composante vide).
   */
  private static analyserLigne(ligne: string):
    | {
        readonly critere: string;
        readonly typeCritereBrut: string;
        readonly statutBrut: string;
        readonly partiLeBrut: string | undefined;
      }
    | undefined {
    const indexSeparateur = ligne.indexOf(';');
    if (indexSeparateur <= 0 || indexSeparateur === ligne.length - 1) {
      return undefined;
    }
    const critere = ligne.slice(0, indexSeparateur).trim();
    const reste = ligne.slice(indexSeparateur + 1).trim();

    const indexEgal = reste.indexOf('=');
    if (indexEgal <= 0 || indexEgal === reste.length - 1) {
      return undefined;
    }
    const typeCritereBrut = reste.slice(0, indexEgal).trim();
    // Après le `=`, le statut, puis éventuellement `;AAAA-MM-JJ` (date de départ, RG-061).
    const apresEgal = reste.slice(indexEgal + 1).trim();
    const indexPartiLe = apresEgal.indexOf(';');
    if (indexPartiLe === -1) {
      return { critere, typeCritereBrut, statutBrut: apresEgal, partiLeBrut: undefined };
    }
    const statutBrut = apresEgal.slice(0, indexPartiLe).trim();
    const partiLeBrut = apresEgal.slice(indexPartiLe + 1).trim();
    if (statutBrut.length === 0 || partiLeBrut.length === 0) {
      return undefined;
    }
    return { critere, typeCritereBrut, statutBrut, partiLeBrut };
  }
}
