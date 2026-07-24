// Test du Connecteur croisé (cf. connecteur-croise.utils.ts), généré avec l'assistance de l'IA (Claude Code),
// conformément à .claude/rules/01-usage-ia-et-conventions.md.
import { ConnecteurCroiseUtils } from './connecteur-croise.utils';
import type {
  ResultatGitlabContributeurs,
  ResultatGitlabMarqueursIa,
  ResultatSonarCouverture,
  ResultatSonarViolations,
} from '../../sansetat/commandes/types-facade';

const CONTRIBUTEURS: ResultatGitlabContributeurs = {
  sourceId: 'source-1',
  refEffective: 'develop',
  shaTete: '8c1d0e44',
  fenetreJours: 90,
  contributeurs: [
    { email: 'marie@entreprise.fr', nom: 'Marie', nombreCommits: 42 },
    { email: 'julien@entreprise.fr', nom: 'Julien', nombreCommits: 17 },
  ],
};

const VIOLATIONS: ResultatSonarViolations = {
  sourceId: 'source-2',
  parSeverite: { bloquant: 4, critique: 15, majeur: 88, mineur: 240, info: 31 },
  nouvellesViolations: 9,
};

describe('ConnecteurCroiseUtils', () => {
  describe('calculerFraicheurSonar', () => {
    it('doit signaler aucune analyse si la date de dernière analyse est absente', () => {
      const resultat = ConnecteurCroiseUtils.calculerFraicheurSonar('2026-06-05', undefined);

      expect(resultat).toEqual({
        dernierCommitLe: '2026-06-05',
        derniereAnalyseLe: undefined,
        aucuneAnalyse: true,
      });
    });

    it('doit reporter les deux dates sans aucune analyse si elles sont toutes deux présentes', () => {
      const resultat = ConnecteurCroiseUtils.calculerFraicheurSonar('2026-06-05', '2026-06-05');

      expect(resultat).toEqual({
        dernierCommitLe: '2026-06-05',
        derniereAnalyseLe: '2026-06-05',
        aucuneAnalyse: false,
      });
    });

    it('doit rester cohérent si les deux dates sont absentes (aucun indicateur obtenu)', () => {
      const resultat = ConnecteurCroiseUtils.calculerFraicheurSonar(undefined, undefined);

      expect(resultat).toEqual({
        dernierCommitLe: undefined,
        derniereAnalyseLe: undefined,
        aucuneAnalyse: true,
      });
    });
  });

  describe('calculerActiviteSansQualite', () => {
    it('doit sommer les commits des contributeurs et reporter les nouvelles violations', () => {
      const resultat = ConnecteurCroiseUtils.calculerActiviteSansQualite(CONTRIBUTEURS, VIOLATIONS);

      expect(resultat).toEqual({
        nombreCommits: 59,
        nouvellesViolations: 9,
        evaluable: true,
      });
    });

    it('doit distinguer une source présente mais vide (evaluable) d’une source absente (non évaluable)', () => {
      const contributeursVides: ResultatGitlabContributeurs = {
        ...CONTRIBUTEURS,
        contributeurs: [],
      };

      const resultat = ConnecteurCroiseUtils.calculerActiviteSansQualite(
        contributeursVides,
        VIOLATIONS,
      );

      expect(resultat).toEqual({
        nombreCommits: 0,
        nouvellesViolations: 9,
        evaluable: true,
      });
    });

    it("doit marquer non évaluable si les contributeurs GitLab n'ont pas pu être obtenus", () => {
      const resultat = ConnecteurCroiseUtils.calculerActiviteSansQualite(undefined, VIOLATIONS);

      expect(resultat).toEqual({
        nombreCommits: 0,
        nouvellesViolations: 9,
        evaluable: false,
      });
    });

    it("doit marquer non évaluable si les violations Sonar n'ont pas pu être obtenues", () => {
      const resultat = ConnecteurCroiseUtils.calculerActiviteSansQualite(CONTRIBUTEURS, undefined);

      expect(resultat).toEqual({
        nombreCommits: 59,
        nouvellesViolations: 0,
        evaluable: false,
      });
    });

    it('doit rester cohérent si les deux sources sont absentes', () => {
      const resultat = ConnecteurCroiseUtils.calculerActiviteSansQualite(undefined, undefined);

      expect(resultat).toEqual({
        nombreCommits: 0,
        nouvellesViolations: 0,
        evaluable: false,
      });
    });
  });

  describe('calculerIaNouveauCode', () => {
    const MARQUEURS: ResultatGitlabMarqueursIa = {
      sourceId: 'source-1',
      refEffective: 'develop',
      shaTete: '8c1d0e44',
      marqueurs: [
        { chemin: 'CLAUDE.md', nature: 'fichier', outil: 'claude' },
        { chemin: '.claude', nature: 'repertoire', outil: 'claude' },
        { chemin: '.cursorrules', nature: 'fichier', outil: 'cursor' },
      ],
    };

    const COUVERTURE: ResultatSonarCouverture = {
      sourceId: 'source-2',
      couverture: 82,
      couvertureNouveauCode: 91,
      duplicationNouveauCode: 3.5,
    };

    it('doit juxtaposer les séries et dédupliquer les outils détectés', () => {
      const resultat = ConnecteurCroiseUtils.calculerIaNouveauCode(
        MARQUEURS,
        COUVERTURE,
        VIOLATIONS,
      );

      expect(resultat).toEqual({
        marqueursPresents: true,
        outilsDetectes: ['claude', 'cursor'],
        couvertureNouveauCode: 91,
        nouvellesViolations: 9,
        duplicationNouveauCode: 3.5,
      });
    });

    it("doit signaler l'absence de marqueurs si aucun n'est détecté", () => {
      const marqueursVides: ResultatGitlabMarqueursIa = { ...MARQUEURS, marqueurs: [] };

      const resultat = ConnecteurCroiseUtils.calculerIaNouveauCode(
        marqueursVides,
        COUVERTURE,
        VIOLATIONS,
      );

      expect(resultat.marqueursPresents).toBe(false);
      expect(resultat.outilsDetectes).toEqual([]);
    });

    it("doit rester cohérent si les marqueurs IA n'ont pas pu être obtenus", () => {
      const resultat = ConnecteurCroiseUtils.calculerIaNouveauCode(
        undefined,
        COUVERTURE,
        VIOLATIONS,
      );

      expect(resultat.marqueursPresents).toBe(false);
      expect(resultat.outilsDetectes).toEqual([]);
      expect(resultat.couvertureNouveauCode).toBe(91);
    });

    it("doit rester cohérent si les métriques Sonar n'ont pas pu être obtenues", () => {
      const resultat = ConnecteurCroiseUtils.calculerIaNouveauCode(MARQUEURS, undefined, undefined);

      expect(resultat).toEqual({
        marqueursPresents: true,
        outilsDetectes: ['claude', 'cursor'],
        couvertureNouveauCode: undefined,
        nouvellesViolations: undefined,
        duplicationNouveauCode: undefined,
      });
    });

    it('doit rester cohérent si tout est absent', () => {
      const resultat = ConnecteurCroiseUtils.calculerIaNouveauCode(undefined, undefined, undefined);

      expect(resultat).toEqual({
        marqueursPresents: false,
        outilsDetectes: [],
        couvertureNouveauCode: undefined,
        nouvellesViolations: undefined,
        duplicationNouveauCode: undefined,
      });
    });
  });
});
