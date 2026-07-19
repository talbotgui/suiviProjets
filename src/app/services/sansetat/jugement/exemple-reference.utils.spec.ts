// Test de la classe utilitaire de référence exemplaire (cf. exemple-reference.utils.ts), généré avec l'assistance
// de l'IA (Claude Code), conformément à .claude/rules/01-usage-ia-et-conventions.md.
import { ExempleReferenceUtils } from './exemple-reference.utils';

describe('ExempleReferenceUtils', () => {
  it('doit additionner deux nombres', () => {
    expect(ExempleReferenceUtils.additionner(2, 3)).toBe(5);
  });

  it('doit détecter une valeur atteignant exactement le seuil', () => {
    expect(ExempleReferenceUtils.atteintLeSeuil(10, 10)).toBe(true);
  });

  it('doit détecter une valeur sous le seuil', () => {
    expect(ExempleReferenceUtils.atteintLeSeuil(9, 10)).toBe(false);
  });
});
