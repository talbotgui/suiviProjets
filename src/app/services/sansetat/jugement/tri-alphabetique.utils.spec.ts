// Test du tri alphabétique insensible à la casse (cf. tri-alphabetique.utils.ts), généré avec l'assistance de
// l'IA (Claude Code), conformément à .claude/rules/01-usage-ia-et-conventions.md.
import { TriAlphabetiqueUtils } from './tri-alphabetique.utils';

describe('TriAlphabetiqueUtils', () => {
  describe('trierParNom', () => {
    it('trie par ordre alphabétique sans tenir compte de la casse', () => {
      const elements = [{ nom: 'zoo' }, { nom: 'Alpha' }, { nom: 'bravo' }, { nom: 'Charlie' }];

      expect(TriAlphabetiqueUtils.trierParNom(elements).map((e) => e.nom)).toEqual([
        'Alpha',
        'bravo',
        'Charlie',
        'zoo',
      ]);
    });

    it('respecte les distinctions accentuées propres au tri français', () => {
      const elements = [{ nom: 'Été' }, { nom: 'Automne' }, { nom: 'été' }];

      expect(TriAlphabetiqueUtils.trierParNom(elements).map((e) => e.nom)).toEqual([
        'Automne',
        'Été',
        'été',
      ]);
    });

    it('ne mute pas le tableau d’origine', () => {
      const elements = [{ nom: 'zoo' }, { nom: 'alpha' }];

      TriAlphabetiqueUtils.trierParNom(elements);

      expect(elements.map((e) => e.nom)).toEqual(['zoo', 'alpha']);
    });

    it('retourne un tableau vide pour une entrée vide', () => {
      expect(TriAlphabetiqueUtils.trierParNom([])).toEqual([]);
    });
  });

  describe('comparerTextes', () => {
    it('retourne 0 pour deux textes identiques à la casse près', () => {
      expect(TriAlphabetiqueUtils.comparerTextes('Alpha', 'alpha')).toBe(0);
    });

    it('retourne une valeur négative si le premier texte précède le second', () => {
      expect(TriAlphabetiqueUtils.comparerTextes('alpha', 'Bravo')).toBeLessThan(0);
    });

    it('retourne une valeur positive si le premier texte suit le second', () => {
      expect(TriAlphabetiqueUtils.comparerTextes('Bravo', 'alpha')).toBeGreaterThan(0);
    });
  });

  describe('comparerParNom', () => {
    it('retourne 0 pour deux noms identiques à la casse près', () => {
      expect(TriAlphabetiqueUtils.comparerParNom({ nom: 'Alpha' }, { nom: 'alpha' })).toBe(0);
    });

    it('retourne une valeur négative si le premier nom précède le second', () => {
      expect(TriAlphabetiqueUtils.comparerParNom({ nom: 'alpha' }, { nom: 'Bravo' })).toBeLessThan(
        0,
      );
    });

    it('retourne une valeur positive si le premier nom suit le second', () => {
      expect(
        TriAlphabetiqueUtils.comparerParNom({ nom: 'Bravo' }, { nom: 'alpha' }),
      ).toBeGreaterThan(0);
    });
  });
});
