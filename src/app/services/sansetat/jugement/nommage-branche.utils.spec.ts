// Test du calcul de conformité de nommage d'une branche (cf. nommage-branche.utils.ts, RG-030), généré avec
// l'assistance de l'IA (Claude Code), conformément à .claude/rules/01-usage-ia-et-conventions.md.
import { NommageBrancheUtils } from './nommage-branche.utils';

const MOTIF_GITFLOW = '^(main|develop|release/.+|feature/.+|hotfix/.+)$';

describe('NommageBrancheUtils', () => {
  describe('calculerNommageBranche', () => {
    it('restitue conforme pour un nom respectant le motif', () => {
      expect(NommageBrancheUtils.calculerNommageBranche('feature/US-042', MOTIF_GITFLOW)).toEqual({
        type: 'conforme',
      });
    });

    it('restitue conforme pour les branches permanentes du motif Gitflow', () => {
      expect(NommageBrancheUtils.calculerNommageBranche('main', MOTIF_GITFLOW)).toEqual({
        type: 'conforme',
      });
      expect(NommageBrancheUtils.calculerNommageBranche('develop', MOTIF_GITFLOW)).toEqual({
        type: 'conforme',
      });
    });

    it('restitue nonConforme pour un nom ne respectant pas le motif', () => {
      expect(NommageBrancheUtils.calculerNommageBranche('wip-truc', MOTIF_GITFLOW)).toEqual({
        type: 'nonConforme',
      });
    });

    it('restitue motifInvalide si le motif configuré n’est pas une expression régulière valide', () => {
      expect(NommageBrancheUtils.calculerNommageBranche('feature/US-042', '(')).toEqual({
        type: 'motifInvalide',
      });
    });

    it('cas limite : un motif vide correspond à tout nom de branche', () => {
      expect(NommageBrancheUtils.calculerNommageBranche('n-importe-quoi', '')).toEqual({
        type: 'conforme',
      });
    });
  });
});
