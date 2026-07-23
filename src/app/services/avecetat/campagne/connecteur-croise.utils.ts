// Fichier généré avec l'assistance de l'IA (Claude Code), conformément à la mention d'origine requise par
// .claude/rules/01-usage-ia-et-conventions.md.
//
// Connecteur croisé (UI, Phase 5, incrément 3), tel que défini à l'étape 6
// (cf. docs/02_documentation/11_architectureTechnique.md#découpage-en-composantsmodules-et-responsabilités) :
// calcule des résultats croisés à partir des résultats déjà obtenus des connecteurs GitLab et Sonar pour le même
// audit, sans aucun appel réseau ni credential propre (cf. docs/02_documentation/13_conceptionDetaillee.md#détail-
// des-modulescomposants-et-de-leurs-interfaces). Classé sous `services/avecetat/campagne/` conformément à la
// structure déjà fixée en Phase 0 (cf. README.md de ce dossier), aux côtés du futur Orchestrateur de campagne, son
// seul appelant prévu (incrément ultérieur).
//
// Périmètre de cet incrément : `calculerFraicheurSonar` et `calculerActiviteSansQualite`, seuls des trois calculs
// du catalogue figé (`docs/01_besoin/Specification.md#55-f05--audits-et-catalogue-des-indicateurs`) intégralement
// calculables à partir des indicateurs déjà construits aux incréments 1 et 3 (le second nécessitant l'exposition
// de la date de dernière analyse Sonar, ajoutée à cet incrément via `interrogerDerniereAnalyse`).
// `calculerIaNouveauCode` reste différé : il dépend de `gitlab.marqueurs_ia`, dont la production reste
// elle-même différée (heuristique de détection non spécifiée par la documentation source).
//
// Chaque fonction reste pure (résultat ne dépendant que de ses paramètres, RG-011 : aucun verdict n'y est jamais
// calculé, seul le constat brut structurel — présence des sources, date d'une éventuelle analyse) ; les seuils
// permettant de transformer ces constats en verdict affiché (tolérance de fraîcheur RG-013, seuils RG-013)
// relèvent exclusivement du Moteur de jugement (Phase 6), à partir de `parametres.seuils`, resté une valeur JSON
// générique par décision de modélisation actée dès la Phase 1.
import type {
  ResultatGitlabContributeurs,
  ResultatSonarViolations,
} from '../../sansetat/commandes/types-facade';

/**
 * Constat brut de `croise.fraicheur_sonar` (mirroir de `ResultatCroiseFraicheurSonar` côté cœur natif).
 */
export interface ResultatCroiseFraicheurSonar {
  readonly dernierCommitLe?: string;
  readonly derniereAnalyseLe?: string;
  readonly aucuneAnalyse: boolean;
}

/**
 * Constat brut de `croise.activite_sans_qualite` (mirroir de `ResultatCroiseActiviteSansQualite` côté cœur natif).
 */
export interface ResultatCroiseActiviteSansQualite {
  readonly nombreCommits: number;
  readonly nouvellesViolations: number;
  readonly evaluable: boolean;
}

/**
 * Connecteur croisé (UI) : calcule des résultats croisés à partir des résultats déjà obtenus des connecteurs
 * GitLab et Sonar pour le même audit, sans aucun appel réseau ni credential propre. Chaque méthode reste pure,
 * conformément aux normes de développement du projet.
 */
export class ConnecteurCroiseUtils {
  /**
   * Calcule le constat brut de fraîcheur Sonar (`croise.fraicheur_sonar`) à partir de la date du dernier commit
   * (`gitlab.vitalite`) et de la date de la dernière analyse Sonar (`FacadeCommandesService.interrogerDerniereAnalyse`).
   * Ne calcule aucun badge SONAR_KO : l'écart entre ces deux dates n'est comparé à la tolérance paramétrable
   * qu'au moment de la restitution, par le Moteur de jugement (RG-011, RG-013).
   * @param dernierCommitLe - Date du dernier commit sur la ref auditée (`gitlab.vitalite.dernierCommitLe`),
   * absente si cet indicateur n'a pas pu être obtenu.
   * @param derniereAnalyseLe - Date de la dernière analyse Sonar, absente si le projet n'a jamais été analysé ou
   * si cet indicateur n'a pas pu être obtenu.
   * @returns Le constat brut de fraîcheur Sonar.
   */
  public static calculerFraicheurSonar(
    dernierCommitLe: string | undefined,
    derniereAnalyseLe: string | undefined,
  ): ResultatCroiseFraicheurSonar {
    return {
      dernierCommitLe,
      derniereAnalyseLe,
      aucuneAnalyse: derniereAnalyseLe === undefined,
    };
  }

  /**
   * Calcule le constat brut d'activité sans qualité (`croise.activite_sans_qualite`) à partir des contributeurs
   * GitLab (`gitlab.contributeurs`) et des violations Sonar (`sonar.violations`). Ne calcule aucun signal : le
   * dépassement des seuils de commits/violations n'est évalué qu'au moment de la restitution, par le Moteur de
   * jugement (RG-011).
   *
   * Décision arbitraire (cf. rapport de développement de cette phase) : `evaluable` ne reflète ici que la
   * présence effective des deux sources en entrée, à l'exclusion du badge SONAR_KO (lui-même un verdict calculé
   * à l'affichage, cf. `calculerFraicheurSonar`) que `docs/01_besoin/Specification.md#55-f05` mentionne pourtant
   * comme second motif de non-évaluabilité — l'intégrer ici aurait fait dépendre un constat stocké d'un verdict,
   * ce que RG-011 interdit explicitement.
   * @param contributeurs - Constat brut des contributeurs GitLab sur la fenêtre glissante, absent si cet
   * indicateur n'a pas pu être obtenu.
   * @param violations - Constat brut des violations Sonar, absent si cet indicateur n'a pas pu être obtenu.
   * @returns Le constat brut d'activité sans qualité.
   */
  public static calculerActiviteSansQualite(
    contributeurs: ResultatGitlabContributeurs | undefined,
    violations: ResultatSonarViolations | undefined,
  ): ResultatCroiseActiviteSansQualite {
    const nombreCommits = (contributeurs?.contributeurs ?? []).reduce(
      (total, contributeur) => total + contributeur.nombreCommits,
      0,
    );
    return {
      nombreCommits,
      nouvellesViolations: violations?.nouvellesViolations ?? 0,
      evaluable: contributeurs !== undefined && violations !== undefined,
    };
  }
}
