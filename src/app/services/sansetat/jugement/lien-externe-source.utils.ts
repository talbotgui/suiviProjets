// Fichier généré avec l'assistance de l'IA (Claude Code), conformément à la mention d'origine requise par
// .claude/rules/01-usage-ia-et-conventions.md.
//
// Construction du lien direct vers l'instance GitLab/Sonar réellement interrogée par une source (US-008/RG-045,
// C15-13, arbitrage humain du 2026-08-18) : format unique par type de source, sans distinction SonarQube
// auto-hébergé/SonarCloud (option 1 de `docs/03_plan/analyse_C15-13.md`).
//
// Pas de dépendance à `TypeSource`/`Source` (`services/avecetat/etat/types-donnees.ts`) : ce module relève du
// Moteur de jugement (`services/sansetat/jugement/`), qui ne dépend jamais de `services/avecetat/`
// (`docs/02_documentation/14_normesDeveloppement.md#structuration-du-code-et-découpage-en-couches`) ; deux méthodes
// dédiées, une par type de source, plutôt qu'un paramètre de discriminant importé de cette couche.
//
// Formats vérifiés par recherche externe (cf. analyse, section 2.4) : GitLab, comportement de redirection documenté
// de l'application web (`{urlBase}/projects/{id}`) vers l'URL complète du dépôt, non contractualisé au même titre
// que l'API REST v4 — d'où l'indice au survol affiché par l'appelant plutôt que par ce module, propre à l'affichage.
// Sonar (SonarQube auto-hébergé), `{urlBase}/dashboard?id={idExterne}`, format standard depuis la version 5.2 :
// limite connue et assumée pour SonarCloud (`{urlBase}/project/overview?id=...}` attendu, non couvert ici).

/**
 * Utilitaires purs de construction du lien direct vers une source GitLab/Sonar réellement interrogée (US-008,
 * RG-045), à partir des seuls champs déjà chargés en mémoire (`Instance.urlBase`, `Source.idExterne`), sans aucun
 * appel réseau ni nouvelle commande de la Façade.
 */
export class LienExterneSourceUtils {
  /** Segment de chemin de la redirection GitLab par identifiant numérique de projet. */
  private static readonly CHEMIN_PROJET_GITLAB = '/projects/';

  /** Segment de chemin du tableau de bord de mesure Sonar (SonarQube auto-hébergé, depuis la version 5.2). */
  private static readonly CHEMIN_DASHBOARD_SONAR = '/dashboard?id=';

  /**
   * Retire tout `/` final de l'URL de base d'une instance, sur le même principe défensif que
   * `url_base.trim_end_matches('/')` déjà appliqué par chaque appel des connecteurs côté cœur natif
   * (`src-tauri/src/connecteurs/gitlab.rs`/`sonar.rs`).
   * @param urlBase - URL de base de l'instance (`Instance.urlBase`), avec ou sans `/` final.
   * @returns L'URL de base sans `/` final.
   */
  private static normaliserUrlBase(urlBase: string): string {
    return urlBase.replace(/\/+$/, '');
  }

  /**
   * Construit le lien direct vers le dépôt GitLab d'une source (`{urlBase}/projects/{idExterne}`), reposant sur un
   * comportement de redirection de l'application web GitLab à partir du seul identifiant numérique de projet
   * (`gitlab-org/gitlab#438195`) : ce lien n'est pas un point de contrat garanti au même titre que l'API REST v4,
   * l'appelant est responsable d'en avertir l'utilisateur (indice au survol).
   * @param urlBase - URL de base de l'instance GitLab (`Instance.urlBase`).
   * @param idExterne - Identifiant numérique du projet GitLab (`Source.idExterne`).
   * @returns Le lien direct construit.
   */
  public static construireLienGitlab(urlBase: string, idExterne: string): string {
    return `${LienExterneSourceUtils.normaliserUrlBase(urlBase)}${LienExterneSourceUtils.CHEMIN_PROJET_GITLAB}${encodeURIComponent(idExterne)}`;
  }

  /**
   * Construit le lien direct vers le tableau de bord de mesure Sonar d'une source
   * (`{urlBase}/dashboard?id={idExterne}`), format SonarQube auto-hébergé uniquement (limite connue et assumée pour
   * SonarCloud, cf. commentaire d'en-tête de ce fichier).
   * @param urlBase - URL de base de l'instance Sonar (`Instance.urlBase`).
   * @param idExterne - Clé du projet Sonar (`Source.idExterne`).
   * @returns Le lien direct construit.
   */
  public static construireLienSonar(urlBase: string, idExterne: string): string {
    return `${LienExterneSourceUtils.normaliserUrlBase(urlBase)}${LienExterneSourceUtils.CHEMIN_DASHBOARD_SONAR}${encodeURIComponent(idExterne)}`;
  }
}
