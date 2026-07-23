// Test de AberrationUtils (cf. aberration.utils.ts), généré avec l'assistance de l'IA (Claude Code), conformément
// à .claude/rules/01-usage-ia-et-conventions.md.
import { AberrationUtils } from './aberration.utils';
import type { ValeursComparablesAberration } from './aberration.utils';

const VARIATION_RELATIVE = 0.1;

describe('AberrationUtils', () => {
  describe('detecterAberrations - gitlab.taille_depot', () => {
    it('doit détecter une hausse aberrante (×10 ou plus)', () => {
      const ancien: ValeursComparablesAberration = { tailleOctets: 1_000_000 };
      const nouveau: ValeursComparablesAberration = { tailleOctets: 10_000_000 };

      const resultat = AberrationUtils.detecterAberrations(ancien, nouveau, VARIATION_RELATIVE);

      expect(resultat).toEqual([
        {
          indicateur: 'gitlab.taille_depot',
          ancienneValeur: 1_000_000,
          nouvelleValeur: 10_000_000,
        },
      ]);
    });

    it('doit détecter une baisse aberrante (÷10 ou plus)', () => {
      const ancien: ValeursComparablesAberration = { tailleOctets: 10_000_000 };
      const nouveau: ValeursComparablesAberration = { tailleOctets: 1_000_000 };

      const resultat = AberrationUtils.detecterAberrations(ancien, nouveau, VARIATION_RELATIVE);

      expect(resultat).toEqual([
        {
          indicateur: 'gitlab.taille_depot',
          ancienneValeur: 10_000_000,
          nouvelleValeur: 1_000_000,
        },
      ]);
    });

    it('ne doit rien détecter pour une variation en deçà du ratio aberrant', () => {
      const ancien: ValeursComparablesAberration = { tailleOctets: 1_000_000 };
      const nouveau: ValeursComparablesAberration = { tailleOctets: 1_500_000 };

      const resultat = AberrationUtils.detecterAberrations(ancien, nouveau, VARIATION_RELATIVE);

      expect(resultat).toEqual([]);
    });

    it("ne doit rien détecter si l'ancienne valeur est nulle (ratio non significatif)", () => {
      const ancien: ValeursComparablesAberration = { tailleOctets: 0 };
      const nouveau: ValeursComparablesAberration = { tailleOctets: 5_000_000 };

      const resultat = AberrationUtils.detecterAberrations(ancien, nouveau, VARIATION_RELATIVE);

      expect(resultat).toEqual([]);
    });
  });

  describe('detecterAberrations - sonar.ncloc', () => {
    it('doit détecter un doublement', () => {
      const ancien: ValeursComparablesAberration = { ncloc: 10_000 };
      const nouveau: ValeursComparablesAberration = { ncloc: 20_000 };

      const resultat = AberrationUtils.detecterAberrations(ancien, nouveau, VARIATION_RELATIVE);

      expect(resultat).toEqual([
        { indicateur: 'sonar.ncloc', ancienneValeur: 10_000, nouvelleValeur: 20_000 },
      ]);
    });

    it('doit détecter un ncloc divisé par deux, conformément à l’exemple de la Spec', () => {
      const ancien: ValeursComparablesAberration = { ncloc: 10_000 };
      const nouveau: ValeursComparablesAberration = { ncloc: 5_000 };

      const resultat = AberrationUtils.detecterAberrations(ancien, nouveau, VARIATION_RELATIVE);

      expect(resultat).toEqual([
        { indicateur: 'sonar.ncloc', ancienneValeur: 10_000, nouvelleValeur: 5_000 },
      ]);
    });

    it('ne doit rien détecter pour une variation modérée', () => {
      const ancien: ValeursComparablesAberration = { ncloc: 10_000 };
      const nouveau: ValeursComparablesAberration = { ncloc: 11_000 };

      const resultat = AberrationUtils.detecterAberrations(ancien, nouveau, VARIATION_RELATIVE);

      expect(resultat).toEqual([]);
    });
  });

  describe('detecterAberrations - sonar.couverture', () => {
    it('doit détecter un effondrement conforme à l’exemple de la Spec (60 % → 0 %)', () => {
      const ancien: ValeursComparablesAberration = { couverture: 60 };
      const nouveau: ValeursComparablesAberration = { couverture: 0 };

      const resultat = AberrationUtils.detecterAberrations(ancien, nouveau, VARIATION_RELATIVE);

      expect(resultat).toEqual([
        { indicateur: 'sonar.couverture', ancienneValeur: 60, nouvelleValeur: 0 },
      ]);
    });

    it('ne doit rien détecter pour une baisse modérée', () => {
      const ancien: ValeursComparablesAberration = { couverture: 60 };
      const nouveau: ValeursComparablesAberration = { couverture: 50 };

      const resultat = AberrationUtils.detecterAberrations(ancien, nouveau, VARIATION_RELATIVE);

      expect(resultat).toEqual([]);
    });

    it("ne doit rien détecter si l'ancienne couverture est déjà nulle", () => {
      const ancien: ValeursComparablesAberration = { couverture: 0 };
      const nouveau: ValeursComparablesAberration = { couverture: 0 };

      const resultat = AberrationUtils.detecterAberrations(ancien, nouveau, VARIATION_RELATIVE);

      expect(resultat).toEqual([]);
    });
  });

  describe('detecterAberrations - cas transverses', () => {
    it("ne doit rien détecter si l'ancien audit est absent (premier audit du projet)", () => {
      const nouveau: ValeursComparablesAberration = {
        tailleOctets: 10_000_000,
        ncloc: 5_000,
        couverture: 0,
      };

      const resultat = AberrationUtils.detecterAberrations(undefined, nouveau, VARIATION_RELATIVE);

      expect(resultat).toEqual([]);
    });

    it('doit cumuler plusieurs aberrations détectées simultanément', () => {
      const ancien: ValeursComparablesAberration = {
        tailleOctets: 1_000_000,
        ncloc: 10_000,
        couverture: 60,
      };
      const nouveau: ValeursComparablesAberration = {
        tailleOctets: 10_000_000,
        ncloc: 5_000,
        couverture: 0,
      };

      const resultat = AberrationUtils.detecterAberrations(ancien, nouveau, VARIATION_RELATIVE);

      expect(resultat).toEqual([
        {
          indicateur: 'gitlab.taille_depot',
          ancienneValeur: 1_000_000,
          nouvelleValeur: 10_000_000,
        },
        { indicateur: 'sonar.ncloc', ancienneValeur: 10_000, nouvelleValeur: 5_000 },
        { indicateur: 'sonar.couverture', ancienneValeur: 60, nouvelleValeur: 0 },
      ]);
    });

    it('ne doit rien détecter si un indicateur est absent des deux côtés', () => {
      const resultat = AberrationUtils.detecterAberrations({}, {}, VARIATION_RELATIVE);

      expect(resultat).toEqual([]);
    });
  });
});
