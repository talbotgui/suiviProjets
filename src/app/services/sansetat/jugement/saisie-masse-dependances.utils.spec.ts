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

    it('analyse une ligne valide unique en un groupe portant une seule borne de version, complétée de la borne de repli (RG-044)', () => {
      const resultat = SaisieMasseDependancesUtils.analyser('lodash;4.17.0=maintenu', []);

      expect(resultat.erreurs).toEqual([]);
      expect(resultat.groupes).toEqual([
        {
          motif: 'lodash',
          versions: [
            { motifVersion: '4.17.0', statut: 'maintenu' },
            { motifVersion: '*', statut: 'obsolete' },
          ],
          lignesOriginales: ['lodash;4.17.0=maintenu'],
        },
      ]);
    });

    it('corrige la casse d’un statut correspondant à l’une des quatre valeurs canoniques (amendement RG-043)', () => {
      const resultat = SaisieMasseDependancesUtils.analyser(
        'lodash;4.17.0=MAINTENU\nexpress;3.*=Obsolete',
        [],
      );

      expect(resultat.erreurs).toEqual([]);
      expect(resultat.groupes).toEqual([
        {
          motif: 'lodash',
          versions: [
            { motifVersion: '4.17.0', statut: 'maintenu' },
            { motifVersion: '*', statut: 'obsolete' },
          ],
          lignesOriginales: ['lodash;4.17.0=MAINTENU'],
        },
        {
          motif: 'express',
          versions: [
            { motifVersion: '3.*', statut: 'obsolete' },
            { motifVersion: '*', statut: 'obsolete' },
          ],
          lignesOriginales: ['express;3.*=Obsolete'],
        },
      ]);
    });

    it('ignore les espaces superflus autour du motif, du motif de version et du statut', () => {
      const resultat = SaisieMasseDependancesUtils.analyser('  lodash ; 4.17.0 = maintenu  ', []);

      expect(resultat.groupes).toEqual([
        {
          motif: 'lodash',
          versions: [
            { motifVersion: '4.17.0', statut: 'maintenu' },
            { motifVersion: '*', statut: 'obsolete' },
          ],
          lignesOriginales: ['lodash ; 4.17.0 = maintenu'],
        },
      ]);
    });

    it('regroupe plusieurs lignes de la même soumission partageant le même motif en une seule règle multi-bornes (RG-040), complétée de la borne de repli (RG-044)', () => {
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
            { motifVersion: '*', statut: 'obsolete' },
          ],
          lignesOriginales: ['lodash;4.*=obsolete', 'lodash;5.*=maintenu'],
        },
      ]);
    });

    it('n’ajoute aucune borne de repli supplémentaire si le groupe porte déjà une borne « *=obsolete » saisie par l’utilisateur (RG-044)', () => {
      const resultat = SaisieMasseDependancesUtils.analyser('lodash;*=obsolete', []);

      expect(resultat.groupes).toEqual([
        {
          motif: 'lodash',
          versions: [{ motifVersion: '*', statut: 'obsolete' }],
          lignesOriginales: ['lodash;*=obsolete'],
        },
      ]);
    });

    it('n’ajoute aucune borne de repli supplémentaire si le groupe porte déjà une borne « * » avec un statut différent (RG-044, détection par motif seul)', () => {
      const resultat = SaisieMasseDependancesUtils.analyser('lodash;*=maintenu', []);

      expect(resultat.groupes).toEqual([
        {
          motif: 'lodash',
          versions: [{ motifVersion: '*', statut: 'maintenu' }],
          lignesOriginales: ['lodash;*=maintenu'],
        },
      ]);
    });

    it('n’ajoute jamais la borne de repli synthétique à `lignesOriginales` (RG-044)', () => {
      const resultat = SaisieMasseDependancesUtils.analyser('lodash;4.17.0=maintenu', []);

      expect(resultat.groupes[0]?.lignesOriginales).toEqual(['lodash;4.17.0=maintenu']);
      expect(resultat.groupes[0]?.lignesOriginales).not.toContain('lodash;*=obsolete');
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
          versions: [
            { motifVersion: '4.*', statut: 'maintenu' },
            { motifVersion: '*', statut: 'obsolete' },
          ],
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
            { motifVersion: '*', statut: 'obsolete' },
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

  describe('EXEMPLE_PROMPT_IA', () => {
    it('décrit la grammaire réellement acceptée : joker « * » et non une expression régulière, statuts canoniques', () => {
      const prompt = SaisieMasseDependancesUtils.EXEMPLE_PROMPT_IA;

      // Le joker « toute version » de la grammaire s'écrit « ;* », jamais la forme regex « ;.* ».
      expect(prompt).not.toContain(';.*=');
      expect(prompt).toContain('7.*=maintenu');
      expect(prompt).toContain('org.hibernate.orm:hibernate-core;*=obsolete');
      expect(prompt).toContain('maintenu');
      expect(prompt).toContain('obsolete');
    });

    it('se termine par un bloc vide où coller les lignes à traiter', () => {
      expect(SaisieMasseDependancesUtils.EXEMPLE_PROMPT_IA).toMatch(
        /Voici les lignes que je veux que tu traites :\n'''\n'''$/,
      );
    });

    it('produit des lignes d’exemple valides pour analyser (aucune erreur de format)', () => {
      const lignesExemple = [
        'org.hibernate.orm:hibernate-core;7.*=maintenu',
        'org.hibernate.orm:hibernate-core;*=obsolete',
      ];
      expect(SaisieMasseDependancesUtils.EXEMPLE_PROMPT_IA).toContain(lignesExemple.join('\n'));

      const resultat = SaisieMasseDependancesUtils.analyser(lignesExemple.join('\n'), []);
      expect(resultat.erreurs).toEqual([]);
      expect(resultat.groupes).toHaveLength(1);
    });
  });
});
