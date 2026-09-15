// Test de la construction de la liste transverse des audits (cf. audit-transverse.utils.ts, US-063, plan_20
// Partie D), généré avec l'assistance de l'IA (Claude Code), conformément à .claude/rules/01-usage-ia-et-
// conventions.md.
import type { RacineSourceLigneAuditTransverse } from './audit-transverse.utils';
import { AuditTransverseUtils } from './audit-transverse.utils';

describe('AuditTransverseUtils', () => {
  describe('construireLignes', () => {
    it('construit une ligne par audit, tous groupes et projets confondus', () => {
      const racine: RacineSourceLigneAuditTransverse = {
        campagnes: [{ id: 'campagne-1', date: '2026-06-15T10:00:00Z' }],
        groupes: [
          {
            id: 'groupe-1',
            nom: 'Socle Comptable',
            projets: [
              {
                id: 'projet-1',
                nom: 'API Facturation',
                audits: [
                  {
                    id: 'audit-1',
                    date: '2026-06-15T10:00:00Z',
                    campagneId: 'campagne-1',
                    typeAudit: 'reguliere',
                    resultats: [{ type: 'sonar.notes' }, { type: 'sonar.dette' }],
                  },
                ],
              },
            ],
          },
          {
            id: 'groupe-2',
            nom: 'Portail Nova',
            projets: [
              {
                id: 'projet-2',
                nom: 'Front Nova',
                audits: [],
              },
            ],
          },
        ],
      };

      const lignes = AuditTransverseUtils.construireLignes(racine);

      expect(lignes).toHaveLength(1);
      expect(lignes[0]).toEqual(
        expect.objectContaining({
          auditId: 'audit-1',
          groupeId: 'groupe-1',
          groupeLabel: 'Socle Comptable',
          projetId: 'projet-1',
          projetLabel: 'API Facturation',
          type: 'reguliere',
          typeLabel: 'régulier',
          nombreIndicateurs: 2,
        }),
      );
    });

    it('audit régulier : date ciblée et date de réalisation coïncident (dateExecution absent)', () => {
      const racine: RacineSourceLigneAuditTransverse = {
        campagnes: [],
        groupes: [
          {
            id: 'groupe-1',
            nom: 'Groupe',
            projets: [
              {
                id: 'projet-1',
                nom: 'Projet',
                audits: [
                  {
                    id: 'audit-1',
                    date: '2026-09-01T08:30:00Z',
                    campagneId: 'campagne-inconnue',
                    typeAudit: 'reguliere',
                    resultats: [],
                  },
                ],
              },
            ],
          },
        ],
      };

      const [ligne] = AuditTransverseUtils.construireLignes(racine);

      expect(ligne?.dateCibleeLabel).toBe(ligne?.dateRealisationLabel);
      expect(ligne?.campagneLabel).toBe('—');
    });

    it('audit historique : date ciblée (calendaire) distincte de la date de réalisation (dateExecution, horodatage réel)', () => {
      const racine: RacineSourceLigneAuditTransverse = {
        campagnes: [],
        groupes: [
          {
            id: 'groupe-1',
            nom: 'Groupe',
            projets: [
              {
                id: 'projet-1',
                nom: 'Projet',
                audits: [
                  {
                    id: 'audit-historique-1',
                    date: '2026-01-15',
                    dateExecution: '2026-09-10T14:00:00Z',
                    campagneId: 'campagne-1',
                    typeAudit: 'historique',
                    resultats: [{ type: 'sonar.notes' }],
                  },
                ],
              },
            ],
          },
        ],
      };

      const [ligne] = AuditTransverseUtils.construireLignes(racine);

      expect(ligne?.typeLabel).toBe('historique');
      expect(ligne?.dateCibleeLabel).toBe('15/01/2026');
      expect(ligne?.dateRealisationLabel).toBe('10/09/2026');
      expect(ligne?.dateCibleeTri).toBe('2026-01-15');
      expect(ligne?.dateRealisationTri).toBe('2026-09-10T14:00:00Z');
    });

    it('résout le libellé de la campagne à sa date mise en forme, ou « — » si introuvable', () => {
      const racine: RacineSourceLigneAuditTransverse = {
        campagnes: [{ id: 'campagne-1', date: '2026-03-05T09:00:00Z' }],
        groupes: [
          {
            id: 'groupe-1',
            nom: 'Groupe',
            projets: [
              {
                id: 'projet-1',
                nom: 'Projet',
                audits: [
                  {
                    id: 'audit-1',
                    date: '2026-03-05T09:00:00Z',
                    campagneId: 'campagne-1',
                    typeAudit: 'reguliere',
                    resultats: [],
                  },
                  {
                    id: 'audit-2',
                    date: '2026-04-01T09:00:00Z',
                    campagneId: 'campagne-supprimee',
                    typeAudit: 'reguliere',
                    resultats: [],
                  },
                ],
              },
            ],
          },
        ],
      };

      const lignes = AuditTransverseUtils.construireLignes(racine);

      expect(lignes.find((ligne) => ligne.auditId === 'audit-1')?.campagneLabel).toBe('05/03/2026');
      expect(lignes.find((ligne) => ligne.auditId === 'audit-2')?.campagneLabel).toBe('—');
    });
  });
});
