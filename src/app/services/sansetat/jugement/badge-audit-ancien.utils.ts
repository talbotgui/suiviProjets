// Fichier généré avec l'assistance de l'IA (Claude Code), conformément à la mention d'origine requise par
// .claude/rules/01-usage-ia-et-conventions.md.
//
// Calcule le déclenchement du badge AUDIT ANCIEN (Synthèse des audits, US-015, cf.
// docs/02_documentation/09_maquettes.md#synthèse-des-audits) à partir de la date du dernier audit intégré d'un
// projet et du seuil courant `parametres.seuils.fraicheurAudit.ancienJours`
// (`ParametresJugementUtils.lireAncienJoursAvecRepli`).
//
// Décision d'architecture (à valider par un humain, cf. rapport de développement de cet incrément) : distinct de
// l'état « jamais audité » (ligne grisée sans seuil de couleur applicable, cf.
// docs/02_documentation/09_maquettes.md#états-particuliers) — ce badge ne s'applique qu'à un projet DÉJÀ audité au
// moins une fois, dont le dernier audit intégré remonte à plus de `ancienJours` jours ; un projet jamais audité
// restitue `false` ici (son état est porté séparément par l'écran appelant, jamais par ce badge). Ce module reste
// distinct de `PerimetreCampagneUtils.projetsNonAuditesDepuis` (`services/avecetat/campagne/`), qui répond à un
// besoin voisin mais différent (sélection du périmètre d'une campagne, où un projet jamais audité EST inclus) :
// mélanger les deux aurait fait dépendre le Moteur de jugement (`services/sansetat/`) d'un module `avecetat/`,
// contraire à la frontière de couches du projet.
const MILLISECONDES_PAR_JOUR = 24 * 60 * 60 * 1000;

/**
 *
 */
export class BadgeAuditAncienUtils {
  /**
   * Calcule le déclenchement du badge AUDIT ANCIEN : `true` si le projet a déjà été audité au moins une fois et que
   * l'ancienneté de son dernier audit intégré dépasse strictement `ancienJours` jours, `false` sinon (y compris si
   * le projet n'a jamais été audité, cf. commentaire d'en-tête). Cas limite documenté : une ancienneté exactement
   * égale au seuil ne déclenche PAS le badge (comparaison stricte `>`), cohérent avec la convention déjà retenue par
   * `BadgeSonarKoUtils.calculerBadgeSonarKo`.
   * @param dateDernierAudit - Date ISO 8601 du dernier audit intégré du projet, `null` si le projet n'a jamais été
   * audité.
   * @param ancienJours - Seuil en jours courant (`parametres.seuils.fraicheurAudit.ancienJours`, résolu par
   * l'appelant via `ParametresJugementUtils.lireAncienJoursAvecRepli`).
   * @param maintenant - Date de référence pour le calcul de l'ancienneté (permet des tests déterministes).
   * @returns `true` si le badge AUDIT ANCIEN doit être affiché.
   */
  public static calculerAuditAncien(
    dateDernierAudit: string | null,
    ancienJours: number,
    maintenant: Date,
  ): boolean {
    if (dateDernierAudit === null) {
      return false;
    }
    const anciennete = maintenant.getTime() - new Date(dateDernierAudit).getTime();
    return anciennete > ancienJours * MILLISECONDES_PAR_JOUR;
  }
}
