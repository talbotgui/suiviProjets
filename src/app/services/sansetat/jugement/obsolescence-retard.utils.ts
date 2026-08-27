// Fichier généré avec l'assistance de l'IA (Claude Code), conformément à la mention d'origine requise par
// .claude/rules/01-usage-ia-et-conventions.md.
//
// Calcule le retard d'obsolescence, en versions majeures, d'une dépendance constatée et l'agrège par catégorie de
// dépendance pour un projet (RG-050, RG-051 ; écran Obsolescence, US-051). Fonctions pures, sans état ni effet de
// bord, sans aucun import de `services/avecetat/` (frontière de couches du projet, cf.
// `.claude/rules/09-normes-developpement.md#structure-et-nommage`).
//
// Décisions arbitraires (à valider par un humain, cf. rapport de développement de cet incrément), faute de texte
// normatif :
// - Le majeur d'une version est le premier groupe de chiffres en tête de la chaîne (`"6.1.4"` -> 6, `"21.*"` ->
//   21) ; une version dont la tête n'est pas numérique (`"*"`, `"${x}"`, `""`, `"v2"`) est exclue du calcul, sans
//   valeur de repli inventée (RG-011). Le préfixe de plage sémantique `^`/`~` d'une version constatée est retiré au
//   préalable (`StatutObsolescenceUtils.normaliserVersionConstatee`), faute de quoi `"^6.1.4"` serait exclu.
// - Le majeur de référence d'une règle est celui de sa PREMIÈRE borne de version : par convention retenue avec
//   l'utilisateur, la première ligne saisie fait foi de la dernière version majeure connue (RG-050).
// - Le retard d'une dépendance est `max(0, majeurRéférence − majeurDétecté)` : jamais négatif (une dépendance en
//   avance sur la référence a un retard nul).
import type { CategorieDependance, RegleDependance } from './parametres-jugement.utils';
import { StatutObsolescenceUtils, type DependanceConstatee } from './statut-obsolescence.utils';

/**
 * Obsolescence d'un projet pour une catégorie de dépendance : le retard maximal, en versions majeures, d'une de
 * ses dépendances rattachées à cette catégorie (RG-051).
 */
export interface ObsolescenceCategorie {
  /** Identifiant de la catégorie de dépendance concernée. */
  readonly categorieId: string;
  /** Retard maximal en versions majeures (entier ≥ 0). */
  readonly valeur: number;
}

/**
 * Moteur de calcul du retard d'obsolescence par versions majeures (RG-050, RG-051).
 */
export class ObsolescenceRetardUtils {
  /**
   * Numéro majeur en tête d'une chaîne de version.
   * @param version - Version constatée ou motif de borne (`"6.1.4"`, `"21.*"`, `"17"`).
   * @returns Le numéro majeur, ou `undefined` si la tête de la chaîne n'est pas un entier.
   */
  public static parseMajeur(version: string): number | undefined {
    const chiffresDeTete = /^\s*(\d+)/.exec(version)?.[1];
    if (chiffresDeTete === undefined) {
      return undefined;
    }
    return Number.parseInt(chiffresDeTete, 10);
  }

  /**
   * Majeur de référence d'une règle de dépendances : celui de sa première borne de version (cf. commentaire
   * d'en-tête, RG-050).
   * @param regle - Règle de dépendances.
   * @returns Le majeur de référence, ou `undefined` si la règle n'a aucune borne ou si le motif de sa première
   * borne n'est pas numériquement analysable.
   */
  public static majeurReferenceRegle(regle: RegleDependance): number | undefined {
    const premiereBorne = regle.versions[0];
    if (premiereBorne === undefined) {
      return undefined;
    }
    return ObsolescenceRetardUtils.parseMajeur(premiereBorne.motifVersion);
  }

  /**
   * Retard en versions majeures d'une dépendance constatée au regard d'une règle donnée.
   * @param dependance - Dépendance constatée (référence + version).
   * @param regle - Règle de dépendances retenue pour cette dépendance.
   * @returns `max(0, majeurRéférence − majeurDétecté)`, ou `undefined` si l'un des deux majeurs n'est pas
   * analysable.
   */
  public static calculerRetardDependance(
    dependance: DependanceConstatee,
    regle: RegleDependance,
  ): number | undefined {
    const majeurReference = ObsolescenceRetardUtils.majeurReferenceRegle(regle);
    const majeurDetecte = ObsolescenceRetardUtils.parseMajeur(
      StatutObsolescenceUtils.normaliserVersionConstatee(dependance.version),
    );
    if (majeurReference === undefined || majeurDetecte === undefined) {
      return undefined;
    }
    return Math.max(0, majeurReference - majeurDetecte);
  }

  /**
   * Obsolescence d'un projet par catégorie de dépendance (RG-050, RG-051) : pour chaque dépendance constatée, la
   * première règle dont le motif correspond à sa référence est retenue ; seules les dépendances dont la règle porte
   * une catégorie connue et dont le retard est calculable entrent dans le résultat ; la valeur d'une catégorie est
   * le maximum des retards de ses dépendances retenues. Une catégorie sans aucune dépendance retenue est absente du
   * résultat (jamais `0` par défaut, RG-011).
   * @param dependances - Dépendances constatées du dernier audit retenu, déjà fusionnées entre sources.
   * @param regles - Règles de dépendances courantes (`referentiels.reglesDependances`).
   * @param categories - Catégories de dépendance courantes (`referentiels.categoriesDependances`), qui fixent aussi
   * l'ordre du résultat.
   * @returns Une entrée par catégorie ayant au moins une dépendance retenue, dans l'ordre de `categories`.
   */
  public static calculerObsolescenceParCategorie(
    dependances: readonly DependanceConstatee[],
    regles: readonly RegleDependance[],
    categories: readonly CategorieDependance[],
  ): readonly ObsolescenceCategorie[] {
    const identifiantsConnus = new Set(categories.map((categorie) => categorie.id));
    const retardMaxParCategorie = new Map<string, number>();
    for (const dependance of dependances) {
      const regle = StatutObsolescenceUtils.trouverRegle(dependance.reference, regles);
      if (regle?.categorie === undefined || !identifiantsConnus.has(regle.categorie)) {
        continue;
      }
      const retard = ObsolescenceRetardUtils.calculerRetardDependance(dependance, regle);
      if (retard === undefined) {
        continue;
      }
      const retardCourant = retardMaxParCategorie.get(regle.categorie);
      if (retardCourant === undefined || retard > retardCourant) {
        retardMaxParCategorie.set(regle.categorie, retard);
      }
    }
    const resultat: ObsolescenceCategorie[] = [];
    for (const categorie of categories) {
      const valeur = retardMaxParCategorie.get(categorie.id);
      if (valeur !== undefined) {
        resultat.push({ categorieId: categorie.id, valeur });
      }
    }
    return resultat;
  }
}
