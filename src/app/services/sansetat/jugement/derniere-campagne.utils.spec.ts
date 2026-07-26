// Test de DerniereCampagneUtils (cf. derniere-campagne.utils.ts, US-017), généré avec l'assistance de l'IA (Claude
// Code), conformément à .claude/rules/01-usage-ia-et-conventions.md.
import type { CampagneMinimale } from './derniere-campagne.utils';
import { DerniereCampagneUtils } from './derniere-campagne.utils';

describe('DerniereCampagneUtils', () => {
  describe('trouverDerniereCampagnePourProjet', () => {
    it('restitue undefined quand aucune campagne ne concerne le projet', () => {
      const campagnes: readonly CampagneMinimale[] = [
        {
          id: 'c1',
          date: '2026-01-01T00:00:00Z',
          perimetre: ['autre-projet'],
          verdicts: [{ projetId: 'autre-projet', statut: 'succes' }],
        },
      ];

      expect(
        DerniereCampagneUtils.trouverDerniereCampagnePourProjet(campagnes, 'projet-1'),
      ).toBeUndefined();
    });

    it('restitue undefined quand aucune campagne n’est fournie', () => {
      expect(
        DerniereCampagneUtils.trouverDerniereCampagnePourProjet([], 'projet-1'),
      ).toBeUndefined();
    });

    it('retient la campagne la plus récente parmi plusieurs campagnes concernant le projet', () => {
      const campagnes: readonly CampagneMinimale[] = [
        {
          id: 'ancienne',
          date: '2026-01-01T00:00:00Z',
          perimetre: ['projet-1'],
          verdicts: [{ projetId: 'projet-1', statut: 'succes' }],
        },
        {
          id: 'recente',
          date: '2026-06-01T00:00:00Z',
          perimetre: ['projet-1'],
          verdicts: [{ projetId: 'projet-1', statut: 'echec' }],
        },
        {
          id: 'intermediaire',
          date: '2026-03-01T00:00:00Z',
          perimetre: ['projet-1'],
          verdicts: [{ projetId: 'projet-1', statut: 'ignore' }],
        },
      ];

      const resultat = DerniereCampagneUtils.trouverDerniereCampagnePourProjet(
        campagnes,
        'projet-1',
      );

      expect(resultat?.campagne.id).toBe('recente');
      expect(resultat?.verdict.statut).toBe('echec');
    });

    it('ne retient que les campagnes dont le périmètre inclut réellement le projet', () => {
      const campagnes: readonly CampagneMinimale[] = [
        {
          id: 'plus-recente-mais-hors-perimetre',
          date: '2026-06-01T00:00:00Z',
          perimetre: ['autre-projet'],
          verdicts: [{ projetId: 'autre-projet', statut: 'succes' }],
        },
        {
          id: 'concernee',
          date: '2026-01-01T00:00:00Z',
          perimetre: ['projet-1'],
          verdicts: [{ projetId: 'projet-1', statut: 'succes' }],
        },
      ];

      const resultat = DerniereCampagneUtils.trouverDerniereCampagnePourProjet(
        campagnes,
        'projet-1',
      );

      expect(resultat?.campagne.id).toBe('concernee');
    });

    it('restitue undefined si la campagne concernée ne porte, par incohérence de données, aucun verdict pour ce projet', () => {
      const campagnes: readonly CampagneMinimale[] = [
        {
          id: 'c1',
          date: '2026-01-01T00:00:00Z',
          perimetre: ['projet-1'],
          verdicts: [],
        },
      ];

      expect(
        DerniereCampagneUtils.trouverDerniereCampagnePourProjet(campagnes, 'projet-1'),
      ).toBeUndefined();
    });

    it('restitue les anomalies et la durée portées par le verdict', () => {
      const campagnes: readonly CampagneMinimale[] = [
        {
          id: 'c1',
          date: '2026-01-01T00:00:00Z',
          perimetre: ['projet-1'],
          verdicts: [
            {
              projetId: 'projet-1',
              statut: 'echec',
              anomalies: [{ categorie: 'authentificationRefusee' }],
            },
          ],
        },
      ];

      const resultat = DerniereCampagneUtils.trouverDerniereCampagnePourProjet(
        campagnes,
        'projet-1',
      );

      expect(resultat?.verdict.anomalies).toHaveLength(1);
    });
  });
});
