// Fichier généré avec l'assistance de l'IA (Claude Code), conformément à la mention d'origine requise par
// .claude/rules/01-usage-ia-et-conventions.md.
//
// Détecte le mode d'authentification d'une application auditée (RG-067) à partir des dépendances déjà collectées
// par le Connecteur GitLab et persistées dans le résultat `gitlab.dependances`, confrontées aux règles paramétrables
// `referentiels.reglesAuthentification`. Fonction pure du Moteur de jugement, sans effet de bord, jamais persistée :
// `DetectionAuthentification` est une vue calculée interne recalculée à chaque affichage, sur le modèle des
// langages principaux (RG-057). Aucune I/O, aucun import depuis `services/avecetat/`.

import {
  ParametresJugementUtils,
  type ModeAuthentification,
  type RegleAuthentification,
} from './parametres-jugement.utils';

/**
 * Mode d'authentification détecté, accompagné des références de dépendances qui l'ont déclenché (RG-067).
 */
export interface ModeAuthentificationDetecte {
  /** Mode d'authentification détecté. */
  readonly mode: ModeAuthentification;
  /** Références distinctes des dépendances déclenchant ce mode, triées (restituées en infobulle). */
  readonly references: readonly string[];
}

/**
 * Résultat de la détection du mode d'authentification (RG-067). L'absence de résultat `gitlab.dependances` (état
 * « non déterminé ») n'est pas portée ici : l'appelant n'invoque pas la détection et n'affiche rien.
 */
export type DetectionAuthentification =
  | { readonly type: 'detecte'; readonly modes: readonly ModeAuthentificationDetecte[] }
  | { readonly type: 'aucunDetecte' };

/**
 * Utilitaires de détection du mode d'authentification d'une application à partir de ses dépendances (RG-067).
 * Classe à membres statiques uniquement (règle « aucune fonction hors classe »).
 */
export class ModeAuthentificationUtils {
  /**
   * Détecte le ou les modes d'authentification signalés par les dépendances d'une application (RG-067). Une
   * dépendance déclenche un mode dès qu'au moins une règle de ce mode correspond à sa `reference` (glob, cf.
   * {@link ParametresJugementUtils.correspondMotifGlob}) ; une même dépendance peut déclencher plusieurs modes.
   * Les modes sont restitués dans l'ordre fixe {@link ParametresJugementUtils.MODES_AUTHENTIFICATION}, leurs
   * références dédoublonnées et triées par comparaison relationnelle brute (jamais `localeCompare`, dont l'ordre
   * dépend de la locale de l'hôte) pour un rendu rejouable à l'identique.
   * @param dependances - Dépendances du dernier audit retenu (seule la `reference` est exploitée).
   * @param regles - Règles de détection lues défensivement depuis `referentiels.reglesAuthentification`.
   * @returns `detecte` avec au moins un mode, ou `aucunDetecte` si aucune règle ne correspond (y compris en
   * l'absence de dépendance ou de règle) — jamais la preuve d'une absence d'authentification.
   */
  public static detecter(
    dependances: readonly { readonly reference: string }[],
    regles: readonly RegleAuthentification[],
  ): DetectionAuthentification {
    const referencesParMode = new Map<ModeAuthentification, Set<string>>();
    for (const { reference } of dependances) {
      for (const regle of regles) {
        if (ParametresJugementUtils.correspondMotifGlob(regle.motif, reference)) {
          const references = referencesParMode.get(regle.mode) ?? new Set<string>();
          references.add(reference);
          referencesParMode.set(regle.mode, references);
        }
      }
    }

    const modes: ModeAuthentificationDetecte[] = [];
    for (const mode of ParametresJugementUtils.MODES_AUTHENTIFICATION) {
      const references = referencesParMode.get(mode);
      if (references !== undefined) {
        // Les références d'un `Set` sont toujours distinctes : le cas d'égalité n'est pas atteignable ici.
        modes.push({ mode, references: [...references].sort((a, b) => (a < b ? -1 : 1)) });
      }
    }
    return modes.length === 0 ? { type: 'aucunDetecte' } : { type: 'detecte', modes };
  }
}
