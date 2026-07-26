// Test du calcul du badge SONAR_KO (cf. badge-sonar-ko.utils.ts, RG-013), généré avec l'assistance de l'IA
// (Claude Code), conformément à .claude/rules/01-usage-ia-et-conventions.md.
import { BadgeSonarKoUtils } from './badge-sonar-ko.utils';

const TOLERANCE = { toleranceJours: 7 };

describe('BadgeSonarKoUtils', () => {
  describe('calculerBadgeSonarKo', () => {
    it('ne déclenche pas le badge si l’écart est sous la tolérance', () => {
      const resultat = BadgeSonarKoUtils.calculerBadgeSonarKo(
        '2026-07-01',
        '2026-07-03',
        TOLERANCE,
      );
      expect(resultat).toEqual({ declenche: false, ecartJours: 2 });
    });

    it('ne déclenche pas le badge si l’écart est exactement égal à la tolérance (cas limite : > strict)', () => {
      const resultat = BadgeSonarKoUtils.calculerBadgeSonarKo(
        '2026-07-01',
        '2026-07-08',
        TOLERANCE,
      );
      expect(resultat).toEqual({ declenche: false, ecartJours: 7 });
    });

    it('déclenche le badge si l’écart dépasse strictement la tolérance', () => {
      const resultat = BadgeSonarKoUtils.calculerBadgeSonarKo(
        '2026-07-01',
        '2026-07-09',
        TOLERANCE,
      );
      expect(resultat).toEqual({ declenche: true, ecartJours: 8 });
    });

    it('déclenche le badge si le projet n’a jamais été analysé par Sonar', () => {
      const resultat = BadgeSonarKoUtils.calculerBadgeSonarKo('2026-07-01', null, TOLERANCE);
      expect(resultat).toEqual({ declenche: true, ecartJours: null });
    });

    it('calcule l’écart en valeur absolue, quel que soit l’ordre chronologique des deux dates', () => {
      const resultat = BadgeSonarKoUtils.calculerBadgeSonarKo(
        '2026-07-09',
        '2026-07-01',
        TOLERANCE,
      );
      expect(resultat).toEqual({ declenche: true, ecartJours: 8 });
    });

    it('ne déclenche pas le badge si la dernière analyse coïncide avec le dernier commit', () => {
      const resultat = BadgeSonarKoUtils.calculerBadgeSonarKo(
        '2026-07-01',
        '2026-07-01',
        TOLERANCE,
      );
      expect(resultat).toEqual({ declenche: false, ecartJours: 0 });
    });
  });
});
