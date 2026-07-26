// Test du calcul du badge AUDIT ANCIEN (cf. badge-audit-ancien.utils.ts, US-015), généré avec l'assistance de l'IA
// (Claude Code), conformément à .claude/rules/01-usage-ia-et-conventions.md.
import { BadgeAuditAncienUtils } from './badge-audit-ancien.utils';

const JOUR_MS = 24 * 60 * 60 * 1000;
const MAINTENANT = new Date('2026-07-25T00:00:00Z');

describe('BadgeAuditAncienUtils', () => {
  describe('calculerAuditAncien', () => {
    it('ne déclenche jamais le badge pour un projet jamais audité (état distinct, porté par l’écran appelant)', () => {
      expect(BadgeAuditAncienUtils.calculerAuditAncien(null, 30, MAINTENANT)).toBe(false);
    });

    it('ne déclenche pas le badge quand le dernier audit est récent (ancienneté sous le seuil)', () => {
      const dateRecente = new Date(MAINTENANT.getTime() - 10 * JOUR_MS).toISOString();
      expect(BadgeAuditAncienUtils.calculerAuditAncien(dateRecente, 30, MAINTENANT)).toBe(false);
    });

    it('ne déclenche pas le badge quand l’ancienneté est exactement égale au seuil (comparaison stricte)', () => {
      const dateAuSeuil = new Date(MAINTENANT.getTime() - 30 * JOUR_MS).toISOString();
      expect(BadgeAuditAncienUtils.calculerAuditAncien(dateAuSeuil, 30, MAINTENANT)).toBe(false);
    });

    it('déclenche le badge quand l’ancienneté dépasse strictement le seuil', () => {
      const dateAncienne = new Date(MAINTENANT.getTime() - 31 * JOUR_MS).toISOString();
      expect(BadgeAuditAncienUtils.calculerAuditAncien(dateAncienne, 30, MAINTENANT)).toBe(true);
    });
  });
});
