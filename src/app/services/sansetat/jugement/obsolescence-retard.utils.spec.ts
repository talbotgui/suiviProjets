// Test du calcul du retard d'obsolescence par versions majeures (cf. obsolescence-retard.utils.ts), généré avec
// l'assistance de l'IA (Claude Code), conformément à .claude/rules/01-usage-ia-et-conventions.md.
import { ObsolescenceRetardUtils } from './obsolescence-retard.utils';
import type { CategorieDependance, RegleDependance } from './parametres-jugement.utils';
import type { DependanceConstatee } from './statut-obsolescence.utils';

const CATEGORIES: readonly CategorieDependance[] = [
  { id: 'exec', libelle: 'exec', sigle: 'EXE' },
  { id: 'fmkBack', libelle: 'fmkBack', sigle: 'FMB' },
  { id: 'fmkFront', libelle: 'fmkFront', sigle: 'FMF' },
];

const REGLES: readonly RegleDependance[] = [
  {
    motif: 'java',
    categorie: 'exec',
    versions: [
      { motifVersion: '21.*', statut: 'maintenu' },
      { motifVersion: '17.*', statut: 'aJourM1' },
      { motifVersion: '*', statut: 'obsolete' },
    ],
  },
  {
    motif: 'org.springframework:*',
    categorie: 'fmkBack',
    versions: [
      { motifVersion: '6.*', statut: 'maintenu' },
      { motifVersion: '*', statut: 'obsolete' },
    ],
  },
  {
    // Règle sans catégorie : jamais agrégée (RG-049).
    motif: 'lodash',
    versions: [{ motifVersion: '4.*', statut: 'obsolete' }],
  },
  {
    // Règle rattachée à une catégorie inconnue du référentiel : ignorée.
    motif: '@angular/*',
    categorie: 'categorie-supprimee',
    versions: [{ motifVersion: '18.*', statut: 'maintenu' }],
  },
];

/**
 * Fabriques de données de test, classe à membres statiques uniquement conformément à la règle « aucune fonction
 * hors classe » des normes de développement du projet.
 */
class Fixtures {
  /**
   * Construit une dépendance constatée.
   * @param reference - Référence de la dépendance.
   * @param version - Version constatée.
   * @returns La dépendance constatée.
   */
  public static dep(reference: string, version: string): DependanceConstatee {
    return { reference, version };
  }
}

describe('ObsolescenceRetardUtils', () => {
  describe('parseMajeur', () => {
    it.each([
      ['6.1.4', 6],
      ['21.*', 21],
      ['17', 17],
      ['  8 ', 8],
      ['17.0.2', 17],
    ])('extrait le majeur de « %s »', (version, attendu) => {
      expect(ObsolescenceRetardUtils.parseMajeur(version)).toBe(attendu);
    });

    it.each(['*', '', '${java.version}', 'v2', 'latest'])(
      'renvoie undefined pour une tête non numérique « %s »',
      (version) => {
        expect(ObsolescenceRetardUtils.parseMajeur(version)).toBeUndefined();
      },
    );
  });

  describe('majeurReferenceRegle', () => {
    it('prend le majeur de la première borne de version (RG-050)', () => {
      expect(ObsolescenceRetardUtils.majeurReferenceRegle(REGLES[0])).toBe(21);
    });

    it('renvoie undefined si la règle n’a aucune borne', () => {
      expect(
        ObsolescenceRetardUtils.majeurReferenceRegle({ motif: 'x', versions: [] }),
      ).toBeUndefined();
    });

    it('renvoie undefined si la première borne n’est pas numériquement analysable', () => {
      expect(
        ObsolescenceRetardUtils.majeurReferenceRegle({
          motif: 'x',
          versions: [{ motifVersion: '*', statut: 'obsolete' }],
        }),
      ).toBeUndefined();
    });
  });

  describe('calculerRetardDependance', () => {
    it('calcule max(0, référence − détecté)', () => {
      expect(
        ObsolescenceRetardUtils.calculerRetardDependance(Fixtures.dep('java', '17'), REGLES[0]),
      ).toBe(4);
      expect(
        ObsolescenceRetardUtils.calculerRetardDependance(Fixtures.dep('java', '8'), REGLES[0]),
      ).toBe(13);
    });

    it('plafonne le retard à 0 pour une dépendance en avance sur la référence', () => {
      expect(
        ObsolescenceRetardUtils.calculerRetardDependance(Fixtures.dep('java', '25'), REGLES[0]),
      ).toBe(0);
      expect(
        ObsolescenceRetardUtils.calculerRetardDependance(Fixtures.dep('java', '21'), REGLES[0]),
      ).toBe(0);
    });

    it('renvoie undefined si la version détectée n’est pas analysable', () => {
      expect(
        ObsolescenceRetardUtils.calculerRetardDependance(Fixtures.dep('java', '${x}'), REGLES[0]),
      ).toBeUndefined();
    });

    it('renvoie undefined si la règle n’a pas de majeur de référence', () => {
      expect(
        ObsolescenceRetardUtils.calculerRetardDependance(Fixtures.dep('x', '3'), {
          motif: 'x',
          versions: [],
        }),
      ).toBeUndefined();
    });
  });

  describe('calculerObsolescenceParCategorie', () => {
    it('agrège le retard maximal par catégorie, dans l’ordre du référentiel des catégories', () => {
      const resultat = ObsolescenceRetardUtils.calculerObsolescenceParCategorie(
        [
          Fixtures.dep('java', '17'), // exec, retard 4
          Fixtures.dep('org.springframework:spring-core', '5.3.1'), // fmkBack, retard 6 − 5 = 1
          Fixtures.dep('org.springframework:spring-web', '3.0.0'), // fmkBack, retard 6 − 3 = 3 -> max
          Fixtures.dep('org.springframework:spring-tx', '5.0.0'), // fmkBack, retard 1 : ne fait pas baisser le max
        ],
        REGLES,
        CATEGORIES,
      );
      expect(resultat).toEqual([
        { categorieId: 'exec', valeur: 4 },
        { categorieId: 'fmkBack', valeur: 3 },
      ]);
    });

    it('ignore une dépendance sans règle, dont la règle n’a pas de catégorie, ou dont la catégorie est inconnue', () => {
      const resultat = ObsolescenceRetardUtils.calculerObsolescenceParCategorie(
        [
          Fixtures.dep('inconnue:artefact', '1.0'), // aucune règle
          Fixtures.dep('lodash', '3.0.0'), // règle sans catégorie
          Fixtures.dep('@angular/core', '16.0.0'), // règle -> catégorie supprimée
        ],
        REGLES,
        CATEGORIES,
      );
      expect(resultat).toEqual([]);
    });

    it('exclut une dépendance dont la version n’est pas analysable', () => {
      const resultat = ObsolescenceRetardUtils.calculerObsolescenceParCategorie(
        [Fixtures.dep('java', '${java.version}')],
        REGLES,
        CATEGORIES,
      );
      expect(resultat).toEqual([]);
    });

    it('omet une catégorie sans aucune dépendance retenue (jamais 0 par défaut)', () => {
      const resultat = ObsolescenceRetardUtils.calculerObsolescenceParCategorie(
        [Fixtures.dep('java', '21')], // retard 0 mais présent
        REGLES,
        CATEGORIES,
      );
      expect(resultat).toEqual([{ categorieId: 'exec', valeur: 0 }]);
    });

    it('renvoie un tableau vide sur des entrées vides', () => {
      expect(ObsolescenceRetardUtils.calculerObsolescenceParCategorie([], [], [])).toEqual([]);
    });
  });
});
