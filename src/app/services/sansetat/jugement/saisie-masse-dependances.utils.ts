// Fichier généré avec l'assistance de l'IA (Claude Code), conformément à la mention d'origine requise par
// .claude/rules/01-usage-ia-et-conventions.md.
//
// Logique de parsing, validation et regroupement des lignes de la saisie en masse de règles de dépendances
// (US-043, RG-040), consommée comme stratégie injectée dans la modale transverse `SqmModaleSaisieMasseComponent`
// (`composants/modale-saisie-masse/`) par `SqmFicheProjetComponent`. Classe à membres statiques uniquement
// (`allowStaticOnly: true`), sur le modèle des autres utilitaires purs de ce dossier (ex. `BadgeSonarKoUtils`).
// Placée sous `services/sansetat/jugement/` plutôt que dans un nouveau bucket dédié : comme
// `AgregationThemeFicheProjetUtils`/`StatutObsolescenceUtils`, il s'agit d'une classe utilitaire pure et sans état,
// consommée par l'écran Fiche projet, cohérente avec le seul bucket de ce type déjà établi par ce projet
// (`services/sansetat/{jugement,commandes}/`, ce module n'invoquant lui-même jamais `invoke`).
//
// Grammaire retenue pour une ligne de saisie (décision arbitraire de ce développement, à valider par un humain,
// faute de précision documentaire sur la forme exacte d'une ligne de saisie en masse dans `04_casUsage.md`/
// `05_reglesGestion.md`/`10_charteErgonomie.md`) : une ligne par borne de version, au format
// `motif;motifVersion=statut`, réutilisant tel quel le sous-format `motifVersion=statut` déjà retenu par le
// formulaire unitaire de règle de dépendances (`SqmReferentielsParametrageComponent.analyserVersions`), complété
// d'un préfixe `motif;` séparé par un point-virgule (caractère absent des deux composantes existantes, donc sans
// ambiguïté de séparation). Plusieurs lignes partageant le même motif sont regroupées en une seule règle
// multi-bornes (RG-040, point 3) ; une ligne dont le motif correspond à une règle déjà existante (paramètre
// `motifsExistants`) est rejetée sans bloquer la validation des autres lignes (RG-040, point 2).
//
// Complément RG-044 (Phase 15, C15-12, arbitrage humain du 2026-08-18, périmètre étendu à cette saisie en masse,
// cf. `docs/03_plan/analyse_C15-12.md`) : chaque groupe résultant du regroupement par motif, s'il ne porte encore
// aucune borne de motif `*`, se voit compléter automatiquement d'une borne de repli `*=obsolete` en dernière
// position de son tableau `versions`. Ce complément n'entre pas en contradiction avec l'additivité stricte de
// RG-040 (aucune règle déjà existante avant l'ouverture de la modale n'est jamais modifiée ni fusionnée) : il ne
// s'applique qu'à une règle nouvellement créée par la soumission en cours, jamais à une règle préexistante. La
// borne synthétique n'est jamais ajoutée à `lignesOriginales`, qui doit rester le texte réellement saisi par
// l'utilisateur (restitution fidèle du texte en cas d'échec partiel d'enregistrement d'un groupe).
import type { VersionDependance } from './parametres-jugement.utils';
import { StatutObsolescenceUtils } from './statut-obsolescence.utils';

/**
 * Borne de repli injectée automatiquement dans un groupe nouvellement créé dépourvu de borne `*` (RG-044).
 * Décision arbitraire déjà validée par l'arbitrage humain du 2026-08-18 (cf. `docs/03_plan/analyse_C15-12.md`),
 * identique à celle retenue pour le formulaire unitaire (`SqmReferentielsParametrageComponent`), sur le modèle des
 * autres valeurs par défaut arbitraires déjà documentées dans ce projet (cf.
 * `.claude/rules/09-normes-developpement.md#structure-et-nommage`, nombre de sauvegardes de sécurité).
 */
const BORNE_DE_REPLI_PAR_DEFAUT: VersionDependance = { motifVersion: '*', statut: 'obsolete' };

/**
 * Erreur associée à une ligne précise de la saisie en masse de règles de dépendances (échec de validation ou
 * conflit avec une règle déjà existante).
 */
export interface ErreurLigneSaisieMasseDependances {
  /** Texte exact de la ligne fautive, tel que saisi par l'utilisateur. */
  readonly ligne: string;
  /** Message explicite sur la correction attendue. */
  readonly message: string;
}

/**
 * Règle de dépendances regroupée à partir d'une ou plusieurs lignes valides partageant le même motif (RG-040),
 * prête à être soumise à la commande native `definirReferentiel`.
 */
export interface GroupeReglesDependances {
  /** Motif de la règle regroupée. */
  readonly motif: string;
  /** Bornes de version regroupées, dans l'ordre de première apparition des lignes correspondantes. */
  readonly versions: readonly VersionDependance[];
  /**
   * Lignes originales ayant produit ce groupe, dans l'ordre de saisie, conservées pour restaurer le texte de la
   * modale en cas d'échec d'enregistrement de ce groupe.
   */
  readonly lignesOriginales: readonly string[];
}

/**
 * Résultat de l'analyse (parsing, validation, regroupement) d'un texte collé de saisie en masse de règles de
 * dépendances, avant tout enregistrement natif.
 */
export interface ResultatAnalyseSaisieMasseDependances {
  /** Règles regroupées, valides et prêtes à être soumises. */
  readonly groupes: readonly GroupeReglesDependances[];
  /** Erreurs de validation ou de conflit, une par ligne fautive. */
  readonly erreurs: readonly ErreurLigneSaisieMasseDependances[];
}

/**
 * Analyse, valide et regroupe les lignes d'une saisie en masse de règles de dépendances (US-043, RG-040).
 */
export class SaisieMasseDependancesUtils {
  /**
   * Analyse le texte collé d'une soumission de saisie en masse de règles de dépendances : ignore les lignes vides,
   * rejette les lignes malformées ou en conflit avec une règle déjà existante (sans bloquer les autres lignes),
   * puis regroupe les lignes valides restantes par motif (RG-040). Complète ensuite chaque groupe résultant d'une
   * borne de repli `*=obsolete` en dernière position s'il n'en porte encore aucune (RG-044, cf. commentaire
   * d'en-tête de ce fichier) : ce complément ne s'applique qu'à une règle nouvellement créée par cette soumission,
   * jamais à une règle déjà existante, et n'est jamais reflété dans `lignesOriginales`.
   * @param texte - Texte collé, une ligne par borne au format `motif;motifVersion=statut`.
   * @param motifsExistants - Motifs des règles de dépendances déjà enregistrées avant cette soumission (RG-040 :
   * additivité stricte, jamais modifiées ni fusionnées par cette saisie en masse).
   * @returns Les règles regroupées valides et les erreurs par ligne fautive.
   */
  public static analyser(
    texte: string,
    motifsExistants: readonly string[],
  ): ResultatAnalyseSaisieMasseDependances {
    const erreurs: ErreurLigneSaisieMasseDependances[] = [];
    const groupesParMotif = new Map<
      string,
      { readonly versions: VersionDependance[]; readonly lignesOriginales: string[] }
    >();

    const lignes = texte
      .split('\n')
      .map((ligne) => ligne.trim())
      .filter((ligne) => ligne.length > 0);

    for (const ligne of lignes) {
      const analyseLigne = SaisieMasseDependancesUtils.analyserLigne(ligne);
      if (analyseLigne === undefined) {
        erreurs.push({
          ligne,
          message:
            'Format attendu : « motif;motifVersion=statut » (ex. « lodash;4.17.0=maintenu »).',
        });
        continue;
      }
      const { motif, version } = analyseLigne;
      if (motifsExistants.includes(motif)) {
        erreurs.push({
          ligne,
          message: `Une règle existe déjà pour le motif « ${motif} » : ligne rejetée (saisie en masse strictement additive).`,
        });
        continue;
      }
      const groupeExistant = groupesParMotif.get(motif);
      if (groupeExistant === undefined) {
        groupesParMotif.set(motif, { versions: [version], lignesOriginales: [ligne] });
      } else {
        groupeExistant.versions.push(version);
        groupeExistant.lignesOriginales.push(ligne);
      }
    }

    const groupes: GroupeReglesDependances[] = Array.from(groupesParMotif.entries()).map(
      ([motif, { versions, lignesOriginales }]) => {
        const contientDejaUneBorneDeRepli = versions.some(
          (version) => version.motifVersion === '*',
        );
        return {
          motif,
          versions: contientDejaUneBorneDeRepli
            ? versions
            : [...versions, BORNE_DE_REPLI_PAR_DEFAUT],
          lignesOriginales,
        };
      },
    );

    return { groupes, erreurs };
  }

  /**
   * Analyse une ligne unique au format `motif;motifVersion=statut`.
   * @param ligne - Ligne déjà nettoyée de ses espaces superflus, non vide.
   * @returns Le motif et la borne de version analysés, `undefined` si la ligne est malformée.
   */
  private static analyserLigne(
    ligne: string,
  ): { readonly motif: string; readonly version: VersionDependance } | undefined {
    const indexSeparateur = ligne.indexOf(';');
    if (indexSeparateur <= 0 || indexSeparateur === ligne.length - 1) {
      return undefined;
    }
    const motif = ligne.slice(0, indexSeparateur).trim();
    const reste = ligne.slice(indexSeparateur + 1).trim();

    const indexEgal = reste.indexOf('=');
    if (indexEgal <= 0 || indexEgal === reste.length - 1) {
      return undefined;
    }
    const motifVersion = reste.slice(0, indexEgal).trim();
    // Casse d'un des quatre statuts canoniques corrigée automatiquement (RG-043), à l'identique du formulaire
    // unitaire (`SqmReferentielsParametrageComponent.analyserVersions`) ; tout autre libellé conservé tel quel
    // (champ libre RG-022).
    const statut = StatutObsolescenceUtils.canoniserCasseStatut(reste.slice(indexEgal + 1).trim());

    return { motif, version: { motifVersion, statut } };
  }
}
