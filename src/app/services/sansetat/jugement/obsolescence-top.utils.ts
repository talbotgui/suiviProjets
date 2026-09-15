// Fichier généré avec l'assistance de l'IA (Claude Code), conformément à la mention d'origine requise par
// .claude/rules/01-usage-ia-et-conventions.md.
//
// Calcule le score de retard d'obsolescence cumulé d'un projet et restreint un classement au « Top 10 » des
// projets les plus en retard (US-065, RG-065 ; écran Obsolescence, plan_20 Partie F). Fonction pure, sans état ni
// effet de bord, sans aucun import de `services/avecetat/` (frontière de couches du projet, cf.
// `.claude/rules/09-normes-developpement.md#structure-et-nommage`).
//
// Décisions actées par le plan (arbitrages utilisateur du 2026-09-11) :
// - Score = somme NON PONDÉRÉE, sur toutes les catégories du référentiel, du retard maximal en versions majeures
//   affiché sur la tuile (RG-050/RG-051) ; une catégorie sans dépendance concernée ou à jour compte pour 0.
// - Tri par score décroissant, puis par nom croissant (départage des ex æquo, `TriAlphabetiqueUtils.comparerTextes`).
// - Coupe au score du dixième projet du classement, ex æquo inclus : la grille peut donc afficher plus de dix
//   tuiles si plusieurs projets partagent le score du 10ᵉ rang.
// - Exclusion des projets de score nul (parfaitement à jour, ou sans audit retenu, ou sans dépendance concernée).
import type { CategorieDependance } from './parametres-jugement.utils';
import { TriAlphabetiqueUtils } from './tri-alphabetique.utils';

/**
 * Ligne minimale requise pour calculer et classer un score d'obsolescence : tout projet porteur d'un nom (pour le
 * départage des ex æquo) et d'un retard par catégorie.
 */
export interface LigneAvecRetardParCategorie {
  /** Nom du projet, utilisé pour départager les ex æquo par ordre alphabétique. */
  readonly nomProjet: string;
  /** Retard par identifiant de catégorie ; une catégorie absente compte pour 0 dans le score. */
  readonly valeurParCategorie: ReadonlyMap<string, number>;
}

/**
 * Moteur de calcul et de classement du score de retard d'obsolescence cumulé d'un projet (RG-065).
 */
export class ObsolescenceTopUtils {
  /**
   * Score de retard d'obsolescence d'un projet : somme non pondérée, sur toutes les catégories du référentiel, du
   * retard maximal en versions majeures affiché. Une catégorie absente de `valeurParCategorie` (aucune dépendance
   * concernée) ou de valeur `0` (à jour) compte pour `0`.
   * @param valeurParCategorie - Retard par identifiant de catégorie.
   * @param categories - Catégories du référentiel courant.
   * @returns Le score cumulé, entier ≥ 0.
   */
  public static scoreObsolescence(
    valeurParCategorie: ReadonlyMap<string, number>,
    categories: readonly CategorieDependance[],
  ): number {
    return categories.reduce(
      (somme, categorie) => somme + (valeurParCategorie.get(categorie.id) ?? 0),
      0,
    );
  }

  /**
   * Restreint un classement de lignes au Top N des projets les plus en retard (RG-065) : exclut les scores nuls,
   * trie par score décroissant puis par nom croissant, puis conserve tous les projets dont le score est supérieur
   * ou égal à celui du `taille`-ième projet du classement (ex æquo au rang `taille` inclus, la grille pouvant donc
   * afficher plus de `taille` lignes).
   * @param lignes - Lignes à classer (déjà filtrées par les autres filtres de l'écran).
   * @param categories - Catégories du référentiel courant.
   * @param taille - Nombre de rangs déterminant le score seuil (`TAILLE_TOP_OBSOLESCENCE`).
   * @returns Les lignes retenues, dans l'ordre du classement.
   */
  public static classerTop<T extends LigneAvecRetardParCategorie>(
    lignes: readonly T[],
    categories: readonly CategorieDependance[],
    taille: number,
  ): readonly T[] {
    const classees = lignes
      .map((ligne) => ({
        ligne,
        score: ObsolescenceTopUtils.scoreObsolescence(ligne.valeurParCategorie, categories),
      }))
      .filter((entree) => entree.score > 0)
      .sort(
        (a, b) =>
          b.score - a.score ||
          TriAlphabetiqueUtils.comparerTextes(a.ligne.nomProjet, b.ligne.nomProjet),
      );
    if (classees.length <= taille) {
      return classees.map((entree) => entree.ligne);
    }
    const scoreSeuil = classees[taille - 1].score;
    return classees.filter((entree) => entree.score >= scoreSeuil).map((entree) => entree.ligne);
  }
}
