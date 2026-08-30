// Test de DernierAuditRegulierUtils (cf. dernier-audit-regulier.utils.ts, convention C15-14/US-046/RG-046), généré
// avec l'assistance de l'IA (Claude Code), conformément à .claude/rules/01-usage-ia-et-conventions.md.
import { DernierAuditRegulierUtils } from './dernier-audit-regulier.utils';

/**
 * Audit de test réduit à ce que consomme la méthode testée (identifiant et catégorie).
 */
interface AuditDeTest {
  readonly id: string;
  readonly typeAudit: 'reguliere' | 'historique';
}

/**
 * Fabrique d'audits de test, classe à membres statiques uniquement conformément à la règle « aucune fonction hors
 * classe » des normes de développement du projet.
 */
class DonneesDeTest {
  /**
   * Construit un audit de test.
   * @param id - Identifiant de l'audit.
   * @param typeAudit - Catégorie de l'audit.
   * @returns L'audit construit.
   */
  public static audit(id: string, typeAudit: 'reguliere' | 'historique'): AuditDeTest {
    return { id, typeAudit };
  }
}

describe('DernierAuditRegulierUtils', () => {
  describe('dernierAuditRegulier', () => {
    it("retourne undefined quand le tableau d'audits est vide", () => {
      expect(DernierAuditRegulierUtils.dernierAuditRegulier([])).toBeUndefined();
    });

    it("retourne undefined quand le projet n'a que des audits historiques", () => {
      const audits = [
        DonneesDeTest.audit('a1', 'historique'),
        DonneesDeTest.audit('a2', 'historique'),
      ];

      expect(DernierAuditRegulierUtils.dernierAuditRegulier(audits)).toBeUndefined();
    });

    it('retourne le dernier audit régulier dans un historique uniquement régulier', () => {
      const audits = [
        DonneesDeTest.audit('a1', 'reguliere'),
        DonneesDeTest.audit('a2', 'reguliere'),
      ];

      expect(DernierAuditRegulierUtils.dernierAuditRegulier(audits)?.id).toBe('a2');
    });

    it("ignore un audit historique intégré après coup en dernière position (ordre d'intégration, C15-14)", () => {
      const audits = [
        DonneesDeTest.audit('regulier-recent', 'reguliere'),
        DonneesDeTest.audit('historique-date-passee', 'historique'),
      ];

      expect(DernierAuditRegulierUtils.dernierAuditRegulier(audits)?.id).toBe('regulier-recent');
    });

    it('ignore un audit historique intercalé entre deux audits réguliers', () => {
      const audits = [
        DonneesDeTest.audit('regulier-1', 'reguliere'),
        DonneesDeTest.audit('historique', 'historique'),
        DonneesDeTest.audit('regulier-2', 'reguliere'),
      ];

      expect(DernierAuditRegulierUtils.dernierAuditRegulier(audits)?.id).toBe('regulier-2');
    });
  });
});
