// Test du calcul du statut d'obsolescence d'une dépendance (cf. statut-obsolescence.utils.ts), généré avec
// l'assistance de l'IA (Claude Code), conformément à .claude/rules/01-usage-ia-et-conventions.md.
import { StatutObsolescenceUtils } from './statut-obsolescence.utils';
import type { RegleDependance } from './parametres-jugement.utils';

const REGLES: readonly RegleDependance[] = [
  {
    motif: 'org.springframework:*',
    versions: [
      { motifVersion: '4.*', statut: 'obsolete' },
      { motifVersion: '5.3.*', statut: 'maintenu' },
      { motifVersion: '6.1.*', statut: 'aJourM1' },
    ],
  },
  { motif: 'log4j:log4j', versions: [{ motifVersion: '*', statut: 'obsolete' }] },
  { motif: 'moment', versions: [{ motifVersion: '*', statut: 'obsolete' }] },
];

describe('StatutObsolescenceUtils', () => {
  describe('calculerStatutObsolescence', () => {
    it('restitue le statut de la première borne de version correspondante', () => {
      expect(
        StatutObsolescenceUtils.calculerStatutObsolescence(
          { reference: 'org.springframework:spring-core', version: '5.3.30' },
          REGLES,
        ),
      ).toEqual({ type: 'statut', statut: 'maintenu' });
    });

    it('restitue obsolete pour une version couverte par un motif générique (*)', () => {
      expect(
        StatutObsolescenceUtils.calculerStatutObsolescence(
          { reference: 'log4j:log4j', version: '1.2.17' },
          REGLES,
        ),
      ).toEqual({ type: 'statut', statut: 'obsolete' });
    });

    it('restitue nonReference si aucune règle ne correspond à la référence', () => {
      expect(
        StatutObsolescenceUtils.calculerStatutObsolescence(
          { reference: 'com.google.guava:guava', version: '32.0.0' },
          REGLES,
        ),
      ).toEqual({ type: 'nonReference' });
    });

    it('restitue nonReference si la référence correspond mais qu’aucune borne de version ne correspond', () => {
      expect(
        StatutObsolescenceUtils.calculerStatutObsolescence(
          { reference: 'org.springframework:spring-core', version: '3.2.0' },
          REGLES,
        ),
      ).toEqual({ type: 'nonReference' });
    });

    it('restitue nonReference si le référentiel de règles est vide (cas limite : référentiel vide)', () => {
      expect(
        StatutObsolescenceUtils.calculerStatutObsolescence(
          { reference: 'moment', version: '2.29.0' },
          [],
        ),
      ).toEqual({ type: 'nonReference' });
    });
  });
});
