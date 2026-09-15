// Test de la mise en forme d'une date calendaire (cf. date-calendaire.utils.ts, plan_20 Partie B), généré avec
// l'assistance de l'IA (Claude Code), conformément à .claude/rules/01-usage-ia-et-conventions.md.
import { DateCalendaireUtils } from './date-calendaire.utils';

describe('DateCalendaireUtils', () => {
  describe('formaterFr', () => {
    it('met en forme une date calendaire ISO en JJ/MM/AAAA', () => {
      expect(DateCalendaireUtils.formaterFr('2026-09-01')).toBe('01/09/2026');
      expect(DateCalendaireUtils.formaterFr('2026-12-31')).toBe('31/12/2026');
    });

    it("restitue la valeur telle quelle lorsqu'elle ne respecte pas le format AAAA-MM-JJ", () => {
      expect(DateCalendaireUtils.formaterFr('2026-9-1')).toBe('2026-9-1');
      expect(DateCalendaireUtils.formaterFr('')).toBe('');
      expect(DateCalendaireUtils.formaterFr('2026-09-01T10:00:00Z')).toBe('2026-09-01T10:00:00Z');
    });

    it("reste invariant au fuseau horaire du poste, faute de toute construction d'objet Date", () => {
      const original = process.env['TZ'];
      try {
        for (const fuseau of ['Etc/UTC', 'Europe/Paris', 'America/New_York']) {
          process.env['TZ'] = fuseau;
          expect(DateCalendaireUtils.formaterFr('2026-09-01')).toBe('01/09/2026');
        }
      } finally {
        if (original === undefined) {
          delete process.env['TZ'];
        } else {
          process.env['TZ'] = original;
        }
      }
    });
  });

  describe('joursEcoules', () => {
    it('calcule le nombre de jours calendaires écoulés depuis une date calendaire', () => {
      expect(DateCalendaireUtils.joursEcoules('2026-09-01', new Date(2026, 8, 15, 10, 0, 0))).toBe(
        14,
      );
    });

    it('ne renvoie jamais un nombre négatif pour une date calendaire postérieure à la référence', () => {
      expect(DateCalendaireUtils.joursEcoules('2026-09-20', new Date(2026, 8, 15, 10, 0, 0))).toBe(
        0,
      );
    });

    it('reste invariant au fuseau horaire du poste (comparaison par triplets année/mois/jour, jamais par soustraction d’instants)', () => {
      const original = process.env['TZ'];
      try {
        const resultats = ['Etc/UTC', 'Europe/Paris', 'America/New_York'].map((fuseau) => {
          process.env['TZ'] = fuseau;
          return DateCalendaireUtils.joursEcoules('2026-09-01', new Date(2026, 8, 15, 23, 59, 0));
        });
        expect(new Set(resultats).size).toBe(1);
        expect(resultats[0]).toBe(14);
      } finally {
        if (original === undefined) {
          delete process.env['TZ'];
        } else {
          process.env['TZ'] = original;
        }
      }
    });

    it('restitue 0 pour une entrée qui ne respecte pas le format AAAA-MM-JJ', () => {
      expect(DateCalendaireUtils.joursEcoules('2026-9-1', new Date())).toBe(0);
    });
  });

  describe('estDateCalendaire', () => {
    it('reconnaît une date calendaire ISO valide', () => {
      expect(DateCalendaireUtils.estDateCalendaire('2026-09-01')).toBe(true);
    });

    it('rejette une valeur ne respectant pas le format AAAA-MM-JJ', () => {
      expect(DateCalendaireUtils.estDateCalendaire('2026-9-1')).toBe(false);
      expect(DateCalendaireUtils.estDateCalendaire('2026-09-01T10:00:00Z')).toBe(false);
      expect(DateCalendaireUtils.estDateCalendaire('')).toBe(false);
    });
  });
});
