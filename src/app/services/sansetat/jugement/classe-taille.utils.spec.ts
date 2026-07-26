// Test du calcul de la classe de taille d'un dépôt (cf. classe-taille.utils.ts), généré avec l'assistance de l'IA
// (Claude Code), conformément à .claude/rules/01-usage-ia-et-conventions.md.
import { ClasseTailleUtils } from './classe-taille.utils';

const BORNES = { borneS: 20000000, borneL: 100000000, borneXL: 500000000 };

describe('ClasseTailleUtils', () => {
  describe('calculerClasseTaille', () => {
    it('classe S en-dessous de borneS', () => {
      expect(ClasseTailleUtils.calculerClasseTaille(1000, BORNES)).toBe('S');
    });

    it('classe S exactement à borneS (cas limite : <=)', () => {
      expect(ClasseTailleUtils.calculerClasseTaille(BORNES.borneS, BORNES)).toBe('S');
    });

    it('classe M juste au-dessus de borneS', () => {
      expect(ClasseTailleUtils.calculerClasseTaille(BORNES.borneS + 1, BORNES)).toBe('M');
    });

    it('classe M exactement à borneL (cas limite : <=)', () => {
      expect(ClasseTailleUtils.calculerClasseTaille(BORNES.borneL, BORNES)).toBe('M');
    });

    it('classe L juste au-dessus de borneL', () => {
      expect(ClasseTailleUtils.calculerClasseTaille(BORNES.borneL + 1, BORNES)).toBe('L');
    });

    it('classe L exactement à borneXL (cas limite : <=)', () => {
      expect(ClasseTailleUtils.calculerClasseTaille(BORNES.borneXL, BORNES)).toBe('L');
    });

    it('classe XL au-dessus de borneXL', () => {
      expect(ClasseTailleUtils.calculerClasseTaille(BORNES.borneXL + 1, BORNES)).toBe('XL');
    });

    it('classe S pour une taille nulle', () => {
      expect(ClasseTailleUtils.calculerClasseTaille(0, BORNES)).toBe('S');
    });
  });
});
