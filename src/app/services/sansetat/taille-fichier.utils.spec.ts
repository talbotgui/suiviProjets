// Test de TailleFichierUtils (cf. taille-fichier.utils.ts), généré avec l'assistance de l'IA (Claude Code),
// conformément à .claude/rules/01-usage-ia-et-conventions.md.
import { TailleFichierUtils } from './taille-fichier.utils';

describe('TailleFichierUtils', () => {
  describe('formaterMegaOctets', () => {
    it('met en forme en mégaoctets avec une décimale et une virgule décimale française', () => {
      expect(TailleFichierUtils.formaterMegaOctets(2_400_000)).toBe('2,4 Mo');
      expect(TailleFichierUtils.formaterMegaOctets(0)).toBe('0,0 Mo');
      expect(TailleFichierUtils.formaterMegaOctets(1_050_000)).toBe('1,1 Mo');
    });
  });

  describe('ventilationPourcentages (RG-055)', () => {
    it('renvoie cinq zéros pour un total nul', () => {
      expect(TailleFichierUtils.ventilationPourcentages(0, 0, 0, 0, 0)).toEqual({
        parametrage: 0,
        journal: 0,
        administration: 0,
        audits: 0,
        autre: 0,
      });
    });

    it('produit une somme de 100 sur une ventilation simple', () => {
      const p = TailleFichierUtils.ventilationPourcentages(20, 20, 20, 20, 20);
      expect(p.parametrage + p.journal + p.administration + p.audits + p.autre).toBe(100);
      expect(p).toEqual({
        parametrage: 20,
        journal: 20,
        administration: 20,
        audits: 20,
        autre: 20,
      });
    });

    it('garantit une somme de 100 sur des cas d’arrondi défavorables (trois tiers)', () => {
      const p = TailleFichierUtils.ventilationPourcentages(1, 1, 1, 0, 0);
      expect(p.parametrage + p.journal + p.administration + p.audits + p.autre).toBe(100);
      // 33,33 % chacun : planchers [33,33,33] (somme 99), une seule unité à distribuer => [34,33,33].
      expect([...[p.parametrage, p.journal, p.administration]].sort((a, b) => a - b)).toEqual([
        33, 33, 34,
      ]);
    });

    it('garantit une somme de 100 sur une ventilation très déséquilibrée', () => {
      const p = TailleFichierUtils.ventilationPourcentages(9_997, 1, 1, 1, 0);
      expect(p.parametrage + p.journal + p.administration + p.audits + p.autre).toBe(100);
      expect(p.parametrage).toBeGreaterThanOrEqual(99);
    });

    it('ignore les valeurs négatives (traitées comme nulles)', () => {
      const p = TailleFichierUtils.ventilationPourcentages(50, 50, -10, 0, 0);
      expect(p.parametrage + p.journal + p.administration + p.audits + p.autre).toBe(100);
      expect(p.administration).toBe(0);
    });
  });
});
