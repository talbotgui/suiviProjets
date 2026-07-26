// Test du calcul du statut IA d'un projet (cf. statut-ia.utils.ts, RG-016), généré avec l'assistance de l'IA
// (Claude Code), conformément à .claude/rules/01-usage-ia-et-conventions.md.
import { StatutIaUtils } from './statut-ia.utils';
import type { MarqueurIaDetecte } from './statut-ia.utils';

const MARQUEUR: MarqueurIaDetecte = { chemin: 'CLAUDE.md', nature: 'fichier', outil: 'claude' };

describe('StatutIaUtils', () => {
  describe('calculerStatutIA', () => {
    it('restitue violation si l’IA est interdite et qu’un marqueur est détecté', () => {
      expect(StatutIaUtils.calculerStatutIA(false, [MARQUEUR])).toEqual({
        type: 'violation',
        marqueursDetectes: [MARQUEUR],
      });
    });

    it('restitue conformeSousReserve si l’IA est interdite et qu’aucun marqueur n’est détecté', () => {
      expect(StatutIaUtils.calculerStatutIA(false, [])).toEqual({ type: 'conformeSousReserve' });
    });

    it('restitue autorisee si l’IA est autorisée, même en présence de marqueurs détectés', () => {
      expect(StatutIaUtils.calculerStatutIA(true, [MARQUEUR])).toEqual({
        type: 'autorisee',
        marqueursDetectes: [MARQUEUR],
      });
    });

    it('restitue autorisee si l’IA est autorisée et qu’aucun marqueur n’est détecté', () => {
      expect(StatutIaUtils.calculerStatutIA(true, [])).toEqual({
        type: 'autorisee',
        marqueursDetectes: [],
      });
    });
  });
});
