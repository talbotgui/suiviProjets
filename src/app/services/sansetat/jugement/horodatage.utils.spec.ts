// Test de la mise en forme partagée d'un horodatage (cf. horodatage.utils.ts, R10-13), généré avec l'assistance de
// l'IA (Claude Code), conformément à .claude/rules/01-usage-ia-et-conventions.md.
import { HorodatageUtils } from './horodatage.utils';

describe('HorodatageUtils', () => {
  describe('formaterHorodatageCourt', () => {
    it('met en forme un horodatage ISO 8601 en libellé court JJ/MM HH:mm', () => {
      expect(HorodatageUtils.formaterHorodatageCourt('2026-07-08T17:45:00')).toBe('08/07 17:45');
    });

    it('complète les valeurs à un chiffre par un zéro non significatif', () => {
      expect(HorodatageUtils.formaterHorodatageCourt('2026-01-02T03:04:00')).toBe('02/01 03:04');
    });
  });

  describe('formaterDateAvecRepli', () => {
    it('met en forme un horodatage ISO 8601 en libellé court AAAA-MM-JJ', () => {
      expect(HorodatageUtils.formaterDateAvecRepli('2026-07-08T17:45:00')).toBe('2026-07-08');
    });

    it('complète les valeurs à un chiffre par un zéro non significatif', () => {
      expect(HorodatageUtils.formaterDateAvecRepli('2026-01-02T00:00:00')).toBe('2026-01-02');
    });

    it("restitue un tiret cadratin lorsque l'horodatage est absent", () => {
      expect(HorodatageUtils.formaterDateAvecRepli(undefined)).toBe('—');
    });
  });
});
