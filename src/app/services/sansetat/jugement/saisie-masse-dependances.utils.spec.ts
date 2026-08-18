// Test du parsing/validation/regroupement de la saisie en masse de règles de dépendances (cf.
// saisie-masse-dependances.utils.ts, US-043, RG-040), généré avec l'assistance de l'IA (Claude Code), conformément
// à .claude/rules/01-usage-ia-et-conventions.md.
import { SaisieMasseDependancesUtils } from './saisie-masse-dependances.utils';

describe('SaisieMasseDependancesUtils', () => {
  describe('analyser', () => {
    it('renvoie un résultat vide pour un texte vide ou ne contenant que des lignes blanches', () => {
      expect(SaisieMasseDependancesUtils.analyser('', [])).toEqual({ groupes: [], erreurs: [] });
      expect(SaisieMasseDependancesUtils.analyser('   \n\n  \t \n', [])).toEqual({
        groupes: [],
        erreurs: [],
      });
    });

    it('analyse une ligne valide unique en un groupe portant une seule borne de version', () => {
      const resultat = SaisieMasseDependancesUtils.analyser('lodash;4.17.0=maintenu', []);

      expect(resultat.erreurs).toEqual([]);
      expect(resultat.groupes).toEqual([
        {
          motif: 'lodash',
          versions: [{ motifVersion: '4.17.0', statut: 'maintenu' }],
          lignesOriginales: ['lodash;4.17.0=maintenu'],
        },
      ]);
    });

    it('ignore les espaces superflus autour du motif, du motif de version et du statut', () => {
      const resultat = SaisieMasseDependancesUtils.analyser('  lodash ; 4.17.0 = maintenu  ', []);

      expect(resultat.groupes).toEqual([
        {
          motif: 'lodash',
          versions: [{ motifVersion: '4.17.0', statut: 'maintenu' }],
          lignesOriginales: ['lodash ; 4.17.0 = maintenu'],
        },
      ]);
    });

    it('regroupe plusieurs lignes de la même soumission partageant le même motif en une seule règle multi-bornes (RG-040)', () => {
      const resultat = SaisieMasseDependancesUtils.analyser(
        'lodash;4.*=obsolete\nlodash;5.*=maintenu',
        [],
      );

      expect(resultat.erreurs).toEqual([]);
      expect(resultat.groupes).toEqual([
        {
          motif: 'lodash',
          versions: [
            { motifVersion: '4.*', statut: 'obsolete' },
            { motifVersion: '5.*', statut: 'maintenu' },
          ],
          lignesOriginales: ['lodash;4.*=obsolete', 'lodash;5.*=maintenu'],
        },
      ]);
    });

    it('produit un groupe distinct par motif différent, dans l’ordre de première apparition', () => {
      const resultat = SaisieMasseDependancesUtils.analyser(
        'moment;*=obsolete\nlodash;4.*=maintenu',
        [],
      );

      expect(resultat.groupes.map((groupe) => groupe.motif)).toEqual(['moment', 'lodash']);
    });

    it('rejette une ligne dont le motif correspond à une règle déjà existante, sans bloquer les autres lignes valides (RG-040, additivité stricte)', () => {
      const resultat = SaisieMasseDependancesUtils.analyser(
        'moment;*=obsolete\nlodash;4.*=maintenu',
        ['moment'],
      );

      expect(resultat.groupes).toEqual([
        {
          motif: 'lodash',
          versions: [{ motifVersion: '4.*', statut: 'maintenu' }],
          lignesOriginales: ['lodash;4.*=maintenu'],
        },
      ]);
      expect(resultat.erreurs).toEqual([
        {
          ligne: 'moment;*=obsolete',
          message:
            'Une règle existe déjà pour le motif « moment » : ligne rejetée (saisie en masse strictement additive).',
        },
      ]);
    });

    it('rejette une ligne sans séparateur « ; »', () => {
      const resultat = SaisieMasseDependancesUtils.analyser('lodash4.17.0=maintenu', []);

      expect(resultat.groupes).toEqual([]);
      expect(resultat.erreurs).toEqual([
        {
          ligne: 'lodash4.17.0=maintenu',
          message:
            'Format attendu : « motif;motifVersion=statut » (ex. « lodash;4.17.0=maintenu »).',
        },
      ]);
    });

    it('rejette une ligne commençant par le séparateur « ; » (motif absent)', () => {
      const resultat = SaisieMasseDependancesUtils.analyser(';4.17.0=maintenu', []);

      expect(resultat.groupes).toEqual([]);
      expect(resultat.erreurs).toHaveLength(1);
    });

    it('rejette une ligne se terminant par le séparateur « ; » (bornes absentes)', () => {
      const resultat = SaisieMasseDependancesUtils.analyser('lodash;', []);

      expect(resultat.groupes).toEqual([]);
      expect(resultat.erreurs).toHaveLength(1);
    });

    it('rejette une ligne sans séparateur « = » dans les bornes de version', () => {
      const resultat = SaisieMasseDependancesUtils.analyser('lodash;4.17.0maintenu', []);

      expect(resultat.groupes).toEqual([]);
      expect(resultat.erreurs).toHaveLength(1);
    });

    it('rejette une ligne dont le motif de version est absent (bornes commençant par « = »)', () => {
      const resultat = SaisieMasseDependancesUtils.analyser('lodash;=maintenu', []);

      expect(resultat.groupes).toEqual([]);
      expect(resultat.erreurs).toHaveLength(1);
    });

    it('rejette une ligne dont le statut est absent (bornes se terminant par « = »)', () => {
      const resultat = SaisieMasseDependancesUtils.analyser('lodash;4.17.0=', []);

      expect(resultat.groupes).toEqual([]);
      expect(resultat.erreurs).toHaveLength(1);
    });

    it('traite un mélange de lignes valides, malformées et en conflit au sein de la même soumission', () => {
      const resultat = SaisieMasseDependancesUtils.analyser(
        [
          'lodash;4.17.0=maintenu',
          'ligne-invalide',
          'moment;*=obsolete',
          'lodash;5.0.0=maintenu',
        ].join('\n'),
        ['moment'],
      );

      expect(resultat.groupes).toEqual([
        {
          motif: 'lodash',
          versions: [
            { motifVersion: '4.17.0', statut: 'maintenu' },
            { motifVersion: '5.0.0', statut: 'maintenu' },
          ],
          lignesOriginales: ['lodash;4.17.0=maintenu', 'lodash;5.0.0=maintenu'],
        },
      ]);
      expect(resultat.erreurs).toHaveLength(2);
      expect(resultat.erreurs.map((erreur) => erreur.ligne)).toEqual([
        'ligne-invalide',
        'moment;*=obsolete',
      ]);
    });
  });
});
