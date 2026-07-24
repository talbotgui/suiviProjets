// Fichier généré avec l'assistance de l'IA (Claude Code), conformément à la mention d'origine requise par
// .claude/rules/01-usage-ia-et-conventions.md.
//
// Raccourcis intelligents de sélection du périmètre d'une campagne (F07, Phase 5, incrément 5), consommés par
// l'écran Constitution de campagne : « rejouer les échecs de la dernière campagne » et « projets non audités
// depuis plus de N jours » (`docs/01_besoin/Specification.md#57-f07--audit-partiel-et-reprise-sur-échec`).
import type { Campagne, Groupe } from '../etat/types-donnees';

/**
 * Raccourcis intelligents de sélection du périmètre d'une campagne (F07) : classe utilitaire à membres statiques
 * uniquement, sur le gabarit `ExempleReferenceUtils`. Chaque méthode reste pure, sans effet de bord.
 */
export class PerimetreCampagneUtils {
  /**
   * Détermine les projets en échec lors de la dernière campagne exécutée (F07 : « rejouer les échecs de la
   * dernière campagne »). La dernière campagne est celle de date la plus récente parmi `campagnes` ; un projet
   * `ignoré` n'est pas considéré comme un échec (RG-018 : un projet ignoré n'a simplement pas été traité, il n'a
   * pas échoué).
   * @param campagnes - Traces d'exécution des campagnes déjà réalisées (`DonneesRacine.campagnes`).
   * @returns Les identifiants des projets en échec de la dernière campagne, tableau vide si aucune campagne n'a
   * encore été réalisée ou si la dernière campagne ne comporte aucun échec.
   */
  public static projetsEnEchecDerniereCampagne(campagnes: readonly Campagne[]): readonly string[] {
    const derniereCampagne = this.trouverDerniereCampagne(campagnes);
    if (derniereCampagne === undefined) {
      return [];
    }
    return derniereCampagne.verdicts
      .filter((verdict) => verdict.statut === 'echec')
      .map((verdict) => verdict.projetId);
  }

  /**
   * Détermine les projets non audités depuis plus de `ancienJours` jours (F07 : « projets non audités depuis plus
   * de N jours »), y compris les projets n'ayant encore jamais été audités.
   * @param groupes - Grappe complète des groupes/projets (`DonneesRacine.groupes`).
   * @param ancienJours - Seuil en jours (`parametres.seuils.fraicheurAudit.ancienJours`, connu de l'appelant).
   * @param maintenant - Date de référence pour le calcul de l'ancienneté (permet des tests déterministes).
   * @returns Les identifiants des projets concernés, tous groupes confondus.
   */
  public static projetsNonAuditesDepuis(
    groupes: readonly Groupe[],
    ancienJours: number,
    maintenant: Date,
  ): readonly string[] {
    const seuilMs = ancienJours * 24 * 60 * 60 * 1000;
    const projetsConcernes: string[] = [];
    for (const groupe of groupes) {
      for (const projet of groupe.projets) {
        const dernierAudit = projet.audits.at(-1);
        if (dernierAudit === undefined) {
          projetsConcernes.push(projet.id);
          continue;
        }
        const anciennete = maintenant.getTime() - new Date(dernierAudit.date).getTime();
        if (anciennete > seuilMs) {
          projetsConcernes.push(projet.id);
        }
      }
    }
    return projetsConcernes;
  }

  /**
   * Trouve la campagne de date la plus récente.
   * @param campagnes - Traces d'exécution des campagnes déjà réalisées.
   * @returns La dernière campagne, `undefined` si `campagnes` est vide.
   */
  private static trouverDerniereCampagne(campagnes: readonly Campagne[]): Campagne | undefined {
    return campagnes.reduce<Campagne | undefined>((derniere, campagne) => {
      if (
        derniere === undefined ||
        new Date(campagne.date).getTime() > new Date(derniere.date).getTime()
      ) {
        return campagne;
      }
      return derniere;
    }, undefined);
  }
}
