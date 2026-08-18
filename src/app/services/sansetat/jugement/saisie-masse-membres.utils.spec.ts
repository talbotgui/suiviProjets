// Test du parsing/validation de la saisie en masse de qualifications de membres (cf.
// saisie-masse-membres.utils.ts, US-044, RG-041), généré avec l'assistance de l'IA (Claude Code), conformément à
// .claude/rules/01-usage-ia-et-conventions.md.
import { SaisieMasseMembresUtils } from './saisie-masse-membres.utils';
import type { CritereMembreExistant } from './saisie-masse-membres.utils';

describe('SaisieMasseMembresUtils', () => {
  describe('analyser', () => {
    it('renvoie un résultat vide pour un texte vide ou ne contenant que des lignes blanches', () => {
      expect(SaisieMasseMembresUtils.analyser('', [])).toEqual({ entrees: [], erreurs: [] });
      expect(SaisieMasseMembresUtils.analyser('   \n\n  \t \n', [])).toEqual({
        entrees: [],
        erreurs: [],
      });
    });

    it('analyse une ligne valide de type username', () => {
      const resultat = SaisieMasseMembresUtils.analyser('jdupont;username=interne', []);

      expect(resultat.erreurs).toEqual([]);
      expect(resultat.entrees).toEqual([
        {
          critere: 'jdupont',
          typeCritere: 'username',
          statut: 'interne',
          ligneOriginale: 'jdupont;username=interne',
        },
      ]);
    });

    it('analyse une ligne valide de type email', () => {
      const resultat = SaisieMasseMembresUtils.analyser('jdupont@exemple.test;email=client', []);

      expect(resultat.erreurs).toEqual([]);
      expect(resultat.entrees).toEqual([
        {
          critere: 'jdupont@exemple.test',
          typeCritere: 'email',
          statut: 'client',
          ligneOriginale: 'jdupont@exemple.test;email=client',
        },
      ]);
    });

    it('analyse une ligne valide de type domaineEmail', () => {
      const resultat = SaisieMasseMembresUtils.analyser('exemple.test;domaineEmail=partenaire', []);

      expect(resultat.erreurs).toEqual([]);
      expect(resultat.entrees).toEqual([
        {
          critere: 'exemple.test',
          typeCritere: 'domaineEmail',
          statut: 'partenaire',
          ligneOriginale: 'exemple.test;domaineEmail=partenaire',
        },
      ]);
    });

    it('ignore les espaces superflus autour du critère, du type de critère et du statut', () => {
      const resultat = SaisieMasseMembresUtils.analyser('  jdupont ; username = interne  ', []);

      expect(resultat.entrees).toEqual([
        {
          critere: 'jdupont',
          typeCritere: 'username',
          statut: 'interne',
          ligneOriginale: 'jdupont ; username = interne',
        },
      ]);
    });

    it('ne jamais pré-remplir ni déduire le statut : rejette une ligne dont le statut est absent (RG-041, point 3)', () => {
      const resultat = SaisieMasseMembresUtils.analyser('jdupont;username=', []);

      expect(resultat.entrees).toEqual([]);
      expect(resultat.erreurs).toEqual([
        {
          ligne: 'jdupont;username=',
          message:
            'Format attendu : « critere;typeCritere=statut » (ex. « jdupont;username=interne »).',
        },
      ]);
    });

    it('rejette une ligne dont le statut ne correspond à aucune valeur reconnue', () => {
      const resultat = SaisieMasseMembresUtils.analyser('jdupont;username=inexistant', []);

      expect(resultat.entrees).toEqual([]);
      expect(resultat.erreurs).toEqual([
        {
          ligne: 'jdupont;username=inexistant',
          message:
            'Statut « inexistant » non reconnu : une valeur explicite parmi interne, client, partenaire est exigée sur chaque ligne (RG-041, aucune valeur pré-remplie par défaut).',
        },
      ]);
    });

    it('rejette une ligne dont le type de critère ne correspond à aucune valeur reconnue', () => {
      const resultat = SaisieMasseMembresUtils.analyser('jdupont;telephone=interne', []);

      expect(resultat.entrees).toEqual([]);
      expect(resultat.erreurs).toEqual([
        {
          ligne: 'jdupont;telephone=interne',
          message:
            'Type de critère « telephone » non reconnu (attendu : username, email, domaineEmail).',
        },
      ]);
    });

    it('rejette une ligne sans séparateur « ; »', () => {
      const resultat = SaisieMasseMembresUtils.analyser('jdupontusername=interne', []);

      expect(resultat.entrees).toEqual([]);
      expect(resultat.erreurs).toEqual([
        {
          ligne: 'jdupontusername=interne',
          message:
            'Format attendu : « critere;typeCritere=statut » (ex. « jdupont;username=interne »).',
        },
      ]);
    });

    it('rejette une ligne commençant par le séparateur « ; » (critère absent)', () => {
      const resultat = SaisieMasseMembresUtils.analyser(';username=interne', []);

      expect(resultat.entrees).toEqual([]);
      expect(resultat.erreurs).toHaveLength(1);
    });

    it('rejette une ligne se terminant par le séparateur « ; » (type et statut absents)', () => {
      const resultat = SaisieMasseMembresUtils.analyser('jdupont;', []);

      expect(resultat.entrees).toEqual([]);
      expect(resultat.erreurs).toHaveLength(1);
    });

    it('rejette une ligne sans séparateur « = »', () => {
      const resultat = SaisieMasseMembresUtils.analyser('jdupont;usernameinterne', []);

      expect(resultat.entrees).toEqual([]);
      expect(resultat.erreurs).toHaveLength(1);
    });

    it('rejette une ligne dont le type de critère est absent (bornes commençant par « = »)', () => {
      const resultat = SaisieMasseMembresUtils.analyser('jdupont;=interne', []);

      expect(resultat.entrees).toEqual([]);
      expect(resultat.erreurs).toHaveLength(1);
    });

    it(
      'rejette une ligne dont le critère correspond à une règle déjà existante de même type, sans bloquer les ' +
        'autres lignes valides (RG-041, point 1, additivité stricte)',
      () => {
        const reglesExistantes: readonly CritereMembreExistant[] = [
          { critere: 'jdupont', typeCritere: 'username' },
        ];
        const resultat = SaisieMasseMembresUtils.analyser(
          'jdupont;username=interne\nmnovak;username=client',
          reglesExistantes,
        );

        expect(resultat.entrees).toEqual([
          {
            critere: 'mnovak',
            typeCritere: 'username',
            statut: 'client',
            ligneOriginale: 'mnovak;username=client',
          },
        ]);
        expect(resultat.erreurs).toEqual([
          {
            ligne: 'jdupont;username=interne',
            message:
              'Une règle existe déjà pour le critère « jdupont » (username) : ligne rejetée (saisie en masse strictement additive).',
          },
        ]);
      },
    );

    it("n'entre pas en conflit avec une règle existante de même critère mais de type différent (RG-007 : types distincts)", () => {
      const reglesExistantes: readonly CritereMembreExistant[] = [
        { critere: 'jdupont', typeCritere: 'username' },
      ];
      const resultat = SaisieMasseMembresUtils.analyser('jdupont;email=interne', reglesExistantes);

      expect(resultat.erreurs).toEqual([]);
      expect(resultat.entrees).toEqual([
        {
          critere: 'jdupont',
          typeCritere: 'email',
          statut: 'interne',
          ligneOriginale: 'jdupont;email=interne',
        },
      ]);
    });

    it('rejette la seconde occurrence d’un doublon interne au même lot (RG-041, point 2)', () => {
      const resultat = SaisieMasseMembresUtils.analyser(
        'jdupont;username=interne\njdupont;username=client',
        [],
      );

      expect(resultat.entrees).toEqual([
        {
          critere: 'jdupont',
          typeCritere: 'username',
          statut: 'interne',
          ligneOriginale: 'jdupont;username=interne',
        },
      ]);
      expect(resultat.erreurs).toEqual([
        {
          ligne: 'jdupont;username=client',
          message:
            'Doublon interne à cette soumission pour le critère « jdupont » (username) : seule la première occurrence est conservée.',
        },
      ]);
    });

    it('traite un mélange de lignes valides, malformées, en conflit et en doublon interne au sein de la même soumission', () => {
      const reglesExistantes: readonly CritereMembreExistant[] = [
        { critere: 'connu', typeCritere: 'username' },
      ];
      const resultat = SaisieMasseMembresUtils.analyser(
        [
          'jdupont;username=interne',
          'ligne-invalide',
          'connu;username=client',
          'jdupont;username=partenaire',
          'mnovak;email=client',
        ].join('\n'),
        reglesExistantes,
      );

      expect(resultat.entrees).toEqual([
        {
          critere: 'jdupont',
          typeCritere: 'username',
          statut: 'interne',
          ligneOriginale: 'jdupont;username=interne',
        },
        {
          critere: 'mnovak',
          typeCritere: 'email',
          statut: 'client',
          ligneOriginale: 'mnovak;email=client',
        },
      ]);
      expect(resultat.erreurs).toHaveLength(3);
      expect(resultat.erreurs.map((erreur) => erreur.ligne)).toEqual([
        'ligne-invalide',
        'connu;username=client',
        'jdupont;username=partenaire',
      ]);
    });
  });
});
