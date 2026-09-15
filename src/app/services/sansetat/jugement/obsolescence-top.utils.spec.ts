// Test de l'utilitaire ObsolescenceTopUtils (cf. obsolescence-top.utils.ts), généré avec l'assistance de l'IA
// (Claude Code), conformément à .claude/rules/01-usage-ia-et-conventions.md.
import { ObsolescenceTopUtils } from './obsolescence-top.utils';
import type { LigneAvecRetardParCategorie } from './obsolescence-top.utils';
import type { CategorieDependance } from './parametres-jugement.utils';

const CATEGORIES: readonly CategorieDependance[] = [
  { id: 'exec', libelle: 'Exécution', sigle: 'EX' },
  { id: 'build', libelle: 'Build', sigle: 'BU' },
];

/**
 * Fabrique de données de test, classe à membres statiques uniquement conformément à la règle « aucune fonction
 * hors classe » des normes de développement du projet.
 */
class DonneesDeTest {
  /**
   * Construit une ligne de test minimale.
   * @param nomProjet - Nom du projet.
   * @param valeurs - Retard par identifiant de catégorie (un couple `[id, valeur]` par entrée).
   * @returns La ligne de test.
   */
  public static ligne(
    nomProjet: string,
    valeurs: readonly (readonly [string, number])[],
  ): LigneAvecRetardParCategorie {
    return { nomProjet, valeurParCategorie: new Map(valeurs) };
  }
}

describe('ObsolescenceTopUtils', () => {
  describe('scoreObsolescence', () => {
    it('additionne le retard de toutes les catégories du référentiel', () => {
      const score = ObsolescenceTopUtils.scoreObsolescence(
        new Map([
          ['exec', 3],
          ['build', 2],
        ]),
        CATEGORIES,
      );
      expect(score).toBe(5);
    });

    it('compte 0 pour une catégorie absente (aucune dépendance concernée)', () => {
      const score = ObsolescenceTopUtils.scoreObsolescence(new Map([['exec', 3]]), CATEGORIES);
      expect(score).toBe(3);
    });

    it('compte 0 pour une catégorie à jour (valeur 0)', () => {
      const score = ObsolescenceTopUtils.scoreObsolescence(
        new Map([
          ['exec', 0],
          ['build', 4],
        ]),
        CATEGORIES,
      );
      expect(score).toBe(4);
    });

    it('renvoie 0 pour un projet sans aucune valeur (sans audit retenu)', () => {
      expect(ObsolescenceTopUtils.scoreObsolescence(new Map(), CATEGORIES)).toBe(0);
    });
  });

  describe('classerTop', () => {
    it('trie par score décroissant puis par nom croissant à égalité', () => {
      const lignes = [
        DonneesDeTest.ligne('Zoo', [['exec', 2]]),
        DonneesDeTest.ligne('Alpha', [['exec', 5]]),
        DonneesDeTest.ligne('Bravo', [['exec', 5]]),
      ];
      const classement = ObsolescenceTopUtils.classerTop(lignes, CATEGORIES, 10);
      expect(classement.map((l) => l.nomProjet)).toEqual(['Alpha', 'Bravo', 'Zoo']);
    });

    it('exclut les projets de score nul', () => {
      const lignes = [
        DonneesDeTest.ligne('AJour', [['exec', 0]]),
        DonneesDeTest.ligne('EnRetard', [['exec', 1]]),
      ];
      const classement = ObsolescenceTopUtils.classerTop(lignes, CATEGORIES, 10);
      expect(classement.map((l) => l.nomProjet)).toEqual(['EnRetard']);
    });

    it('affiche tous les projets en retard quand ils sont dix ou moins', () => {
      const lignes = Array.from({ length: 7 }, (_, i) =>
        DonneesDeTest.ligne(`Projet${i}`, [['exec', i + 1]]),
      );
      const classement = ObsolescenceTopUtils.classerTop(lignes, CATEGORIES, 10);
      expect(classement).toHaveLength(7);
    });

    it('restreint exactement à dix projets sans ex æquo au seuil', () => {
      const lignes = Array.from({ length: 15 }, (_, i) =>
        DonneesDeTest.ligne(`Projet${i}`, [['exec', 15 - i]]),
      );
      const classement = ObsolescenceTopUtils.classerTop(lignes, CATEGORIES, 10);
      expect(classement).toHaveLength(10);
      expect(classement[0].nomProjet).toBe('Projet0');
    });

    it('conserve un 11ᵉ projet dont le score est égal à celui du 10ᵉ (ex æquo au rang 10 inclus)', () => {
      const lignes = [
        ...Array.from({ length: 9 }, (_, i) =>
          DonneesDeTest.ligne(`Projet${i}`, [['exec', 20 - i]]),
        ),
        DonneesDeTest.ligne('Dixieme', [['exec', 5]]),
        DonneesDeTest.ligne('OnziemeExAequo', [['exec', 5]]),
      ];
      const classement = ObsolescenceTopUtils.classerTop(lignes, CATEGORIES, 10);
      expect(classement).toHaveLength(11);
      expect(classement.map((l) => l.nomProjet)).toContain('OnziemeExAequo');
    });

    it('exclut un 11ᵉ projet dont le score est strictement inférieur à celui du 10ᵉ', () => {
      const lignes = [
        ...Array.from({ length: 10 }, (_, i) =>
          DonneesDeTest.ligne(`Projet${i}`, [['exec', 20 - i]]),
        ),
        DonneesDeTest.ligne('Onzieme', [['exec', 1]]),
      ];
      const classement = ObsolescenceTopUtils.classerTop(lignes, CATEGORIES, 10);
      expect(classement).toHaveLength(10);
      expect(classement.map((l) => l.nomProjet)).not.toContain('Onzieme');
    });
  });
});
