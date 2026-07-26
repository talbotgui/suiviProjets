// Test de la conversion des notes Sonar en lettre colorée (cf. note-sonar.utils.ts, US-015), généré avec
// l'assistance de l'IA (Claude Code), conformément à .claude/rules/01-usage-ia-et-conventions.md.
import { NoteSonarUtils } from './note-sonar.utils';

describe('NoteSonarUtils', () => {
  describe('calculerNoteLettre', () => {
    it.each([
      [1, 'A', 'vert'],
      [2, 'B', 'vert'],
      [3, 'C', 'orange'],
      [4, 'D', 'rouge'],
      [5, 'E', 'rouge'],
    ])('convertit la note %i en lettre %s (couleur %s)', (valeur, lettre, couleur) => {
      expect(NoteSonarUtils.calculerNoteLettre(valeur)).toEqual({ lettre, couleur });
    });

    it('arrondit une valeur non entière à la note la plus proche', () => {
      expect(NoteSonarUtils.calculerNoteLettre(1.4)).toEqual({ lettre: 'A', couleur: 'vert' });
      expect(NoteSonarUtils.calculerNoteLettre(4.6)).toEqual({ lettre: 'E', couleur: 'rouge' });
    });

    it('borne une valeur hors intervalle [1, 5] plutôt que de produire une lettre invalide', () => {
      expect(NoteSonarUtils.calculerNoteLettre(0)).toEqual({ lettre: 'A', couleur: 'vert' });
      expect(NoteSonarUtils.calculerNoteLettre(9)).toEqual({ lettre: 'E', couleur: 'rouge' });
    });
  });
});
