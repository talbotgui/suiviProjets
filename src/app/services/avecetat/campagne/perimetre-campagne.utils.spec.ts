// Test de PerimetreCampagneUtils (cf. perimetre-campagne.utils.ts), généré avec l'assistance de l'IA (Claude
// Code), conformément à .claude/rules/01-usage-ia-et-conventions.md.
import { PerimetreCampagneUtils } from './perimetre-campagne.utils';
import type { Audit, Campagne, Groupe, Projet } from '../etat/types-donnees';

/**
 * Fabrique de données de test, classe à membres statiques uniquement conformément à la règle « aucune fonction
 * hors classe » des normes de développement du projet.
 */
class DonneesDeTest {
  /**
   * Construit un projet de test.
   * @param id - Identifiant du projet.
   * @param audits - Historique d'audits intégrés, vide par défaut.
   * @returns Le projet construit.
   */
  public static projet(id: string, audits: readonly Audit[] = []): Projet {
    return {
      id,
      nom: id,
      description: '',
      iaAutorisee: false,
      sources: [],
      annotations: [],
      audits,
    };
  }

  /**
   * Construit un groupe de test.
   * @param projets - Projets rattachés au groupe.
   * @returns Le groupe construit.
   */
  public static groupe(projets: readonly Projet[]): Groupe {
    return {
      id: 'groupe-1',
      nom: 'Groupe',
      description: '',
      instances: [],
      membresConnus: [],
      annotations: [],
      indicateursDesactives: [],
      projets,
    };
  }

  /**
   * Construit un audit de test à la date donnée.
   * @param date - Date ISO 8601 de l'audit.
   * @returns L'audit construit.
   */
  public static audit(date: string): Audit {
    return { id: `audit-${date}`, date, campagneId: 'campagne-x', resultats: [] };
  }
}

describe('PerimetreCampagneUtils', () => {
  describe('projetsEnEchecDerniereCampagne', () => {
    it("doit retourner un tableau vide si aucune campagne n'a encore été réalisée", () => {
      expect(PerimetreCampagneUtils.projetsEnEchecDerniereCampagne([])).toEqual([]);
    });

    it('doit retourner les projets en échec de la campagne la plus récente uniquement', () => {
      const ancienne: Campagne = {
        id: 'campagne-1',
        date: '2026-06-01T00:00:00Z',
        perimetre: ['projet-1'],
        verdicts: [{ projetId: 'projet-1', statut: 'echec' }],
      };
      const recente: Campagne = {
        id: 'campagne-2',
        date: '2026-07-01T00:00:00Z',
        perimetre: ['projet-2', 'projet-3'],
        verdicts: [
          { projetId: 'projet-2', statut: 'echec' },
          { projetId: 'projet-3', statut: 'succes' },
        ],
      };

      const resultat = PerimetreCampagneUtils.projetsEnEchecDerniereCampagne([ancienne, recente]);

      expect(resultat).toEqual(['projet-2']);
    });

    it('ne doit pas considérer un projet « ignoré » comme un échec', () => {
      const campagne: Campagne = {
        id: 'campagne-1',
        date: '2026-07-01T00:00:00Z',
        perimetre: ['projet-1'],
        verdicts: [{ projetId: 'projet-1', statut: 'ignore' }],
      };

      expect(PerimetreCampagneUtils.projetsEnEchecDerniereCampagne([campagne])).toEqual([]);
    });
  });

  describe('projetsNonAuditesDepuis', () => {
    const MAINTENANT = new Date('2026-07-23T00:00:00Z');

    it("doit inclure un projet n'ayant jamais été audité", () => {
      const groupes = [DonneesDeTest.groupe([DonneesDeTest.projet('projet-1')])];

      const resultat = PerimetreCampagneUtils.projetsNonAuditesDepuis(groupes, 30, MAINTENANT);

      expect(resultat).toEqual(['projet-1']);
    });

    it('doit inclure un projet dont le dernier audit dépasse le seuil', () => {
      const projet = DonneesDeTest.projet('projet-1', [
        DonneesDeTest.audit('2026-06-01T00:00:00Z'),
      ]);
      const groupes = [DonneesDeTest.groupe([projet])];

      const resultat = PerimetreCampagneUtils.projetsNonAuditesDepuis(groupes, 30, MAINTENANT);

      expect(resultat).toEqual(['projet-1']);
    });

    it('ne doit pas inclure un projet audité récemment', () => {
      const projet = DonneesDeTest.projet('projet-1', [
        DonneesDeTest.audit('2026-07-20T00:00:00Z'),
      ]);
      const groupes = [DonneesDeTest.groupe([projet])];

      const resultat = PerimetreCampagneUtils.projetsNonAuditesDepuis(groupes, 30, MAINTENANT);

      expect(resultat).toEqual([]);
    });

    it('ne doit pas inclure un projet audité exactement au seuil (strictement « plus de » N jours)', () => {
      const ilYA30Jours = new Date(MAINTENANT.getTime() - 30 * 24 * 60 * 60 * 1000).toISOString();
      const projet = DonneesDeTest.projet('projet-1', [DonneesDeTest.audit(ilYA30Jours)]);
      const groupes = [DonneesDeTest.groupe([projet])];

      const resultat = PerimetreCampagneUtils.projetsNonAuditesDepuis(groupes, 30, MAINTENANT);

      expect(resultat).toEqual([]);
    });

    it("doit se fonder sur le dernier audit, pas le premier, en cas d'historique multiple", () => {
      const projet = DonneesDeTest.projet('projet-1', [
        DonneesDeTest.audit('2026-01-01T00:00:00Z'),
        DonneesDeTest.audit('2026-07-20T00:00:00Z'),
      ]);
      const groupes = [DonneesDeTest.groupe([projet])];

      const resultat = PerimetreCampagneUtils.projetsNonAuditesDepuis(groupes, 30, MAINTENANT);

      expect(resultat).toEqual([]);
    });

    it('doit parcourir tous les groupes', () => {
      const groupes = [
        DonneesDeTest.groupe([DonneesDeTest.projet('projet-1')]),
        DonneesDeTest.groupe([DonneesDeTest.projet('projet-2')]),
      ];

      const resultat = PerimetreCampagneUtils.projetsNonAuditesDepuis(groupes, 30, MAINTENANT);

      expect(resultat).toEqual(['projet-1', 'projet-2']);
    });
  });
});
