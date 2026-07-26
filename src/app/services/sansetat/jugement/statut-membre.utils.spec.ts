// Test du calcul du statut de rattachement d'un membre ou contributeur (cf. statut-membre.utils.ts, RG-006 à
// RG-010), généré avec l'assistance de l'IA (Claude Code), conformément à .claude/rules/01-usage-ia-et-conventions.md.
import { StatutMembreUtils } from './statut-membre.utils';
import type { RegleMembreConnu } from './statut-membre.utils';

type StatutTest = 'interne' | 'client' | 'partenaire';

const REGLES: readonly RegleMembreConnu<StatutTest>[] = [
  { critere: '*@entreprise.fr', typeCritere: 'domaineEmail', statut: 'interne' },
  {
    critere: 'mdurand',
    typeCritere: 'username',
    statut: 'interne',
    aliasEmail: 'marie.durand@entreprise.fr',
  },
  {
    critere: 'alopez-ext',
    typeCritere: 'username',
    statut: 'partenaire',
    aliasEmail: 'a.lopez@presta-dev.io',
  },
  { critere: 'client@partenaire.io', typeCritere: 'email', statut: 'client' },
];

describe('StatutMembreUtils', () => {
  describe('calculerStatutMembre', () => {
    it('résout par username exact (précédence 1)', () => {
      expect(StatutMembreUtils.calculerStatutMembre({ username: 'mdurand' }, REGLES)).toEqual({
        type: 'connu',
        statut: 'interne',
      });
    });

    it('résout par email exact (précédence 2)', () => {
      expect(
        StatutMembreUtils.calculerStatutMembre({ email: 'client@partenaire.io' }, REGLES),
      ).toEqual({
        type: 'connu',
        statut: 'client',
      });
    });

    it('résout via l’alias courriel d’une règle username quand seul l’email est connu (précédence 2)', () => {
      expect(
        StatutMembreUtils.calculerStatutMembre({ email: 'a.lopez@presta-dev.io' }, REGLES),
      ).toEqual({ type: 'connu', statut: 'partenaire' });
    });

    it('résout par domaine email (précédence 3) en dernier recours', () => {
      expect(
        StatutMembreUtils.calculerStatutMembre({ email: 'nouveau.venu@entreprise.fr' }, REGLES),
      ).toEqual({ type: 'connu', statut: 'interne' });
    });

    it('donne priorité au username même si l’email correspondrait à un statut différent', () => {
      const regles: readonly RegleMembreConnu<StatutTest>[] = [
        { critere: 'jdupont', typeCritere: 'username', statut: 'interne' },
        { critere: 'jdupont@partenaire.io', typeCritere: 'email', statut: 'partenaire' },
      ];
      expect(
        StatutMembreUtils.calculerStatutMembre(
          { username: 'jdupont', email: 'jdupont@partenaire.io' },
          regles,
        ),
      ).toEqual({ type: 'connu', statut: 'interne' });
    });

    it('restitue inconnu si aucune règle ne correspond à aucun niveau', () => {
      expect(
        StatutMembreUtils.calculerStatutMembre(
          { username: 'inconnu', email: 'inconnu@ailleurs.com' },
          REGLES,
        ),
      ).toEqual({ type: 'inconnu' });
    });

    it('restitue inconnu si l’identifiant ne porte ni username ni email', () => {
      expect(StatutMembreUtils.calculerStatutMembre({}, REGLES)).toEqual({ type: 'inconnu' });
    });

    it('restitue conflit si deux règles de même précédence portent des statuts contradictoires (RG-008)', () => {
      const regles: readonly RegleMembreConnu<StatutTest>[] = [
        { critere: '*@entreprise.fr', typeCritere: 'domaineEmail', statut: 'interne' },
        { critere: '*@entreprise.fr', typeCritere: 'domaineEmail', statut: 'client' },
      ];
      const resolution = StatutMembreUtils.calculerStatutMembre(
        { email: 'x@entreprise.fr' },
        regles,
      );
      expect(resolution.type).toBe('conflit');
      if (resolution.type === 'conflit') {
        expect(resolution.reglesEnConflit).toHaveLength(2);
      }
    });

    it('ne restitue pas conflit si deux règles de même précédence portent le même statut', () => {
      const regles: readonly RegleMembreConnu<StatutTest>[] = [
        { critere: 'x@entreprise.fr', typeCritere: 'email', statut: 'interne' },
        { critere: 'x@entreprise.fr', typeCritere: 'email', statut: 'interne' },
      ];
      expect(StatutMembreUtils.calculerStatutMembre({ email: 'x@entreprise.fr' }, regles)).toEqual({
        type: 'connu',
        statut: 'interne',
      });
    });

    it('ne descend pas au niveau domaine en cas de conflit au niveau email (le conflit est terminal)', () => {
      const regles: readonly RegleMembreConnu<StatutTest>[] = [
        { critere: 'x@entreprise.fr', typeCritere: 'email', statut: 'interne' },
        { critere: 'x@entreprise.fr', typeCritere: 'email', statut: 'client' },
        { critere: '*@entreprise.fr', typeCritere: 'domaineEmail', statut: 'partenaire' },
      ];
      const resolution = StatutMembreUtils.calculerStatutMembre(
        { email: 'x@entreprise.fr' },
        regles,
      );
      expect(resolution.type).toBe('conflit');
    });
  });

  describe('calculerGraviteAlerteMembreInconnu', () => {
    it('restitue elevee pour un niveau d’accès mainteneur (40)', () => {
      expect(StatutMembreUtils.calculerGraviteAlerteMembreInconnu(40)).toBe('elevee');
    });

    it('restitue elevee pour un niveau d’accès propriétaire (50)', () => {
      expect(StatutMembreUtils.calculerGraviteAlerteMembreInconnu(50)).toBe('elevee');
    });

    it('restitue moderee pour un niveau d’accès développeur (30)', () => {
      expect(StatutMembreUtils.calculerGraviteAlerteMembreInconnu(30)).toBe('moderee');
    });

    it('restitue moderee pour un niveau d’accès invité (10) ou lecteur (20)', () => {
      expect(StatutMembreUtils.calculerGraviteAlerteMembreInconnu(10)).toBe('moderee');
      expect(StatutMembreUtils.calculerGraviteAlerteMembreInconnu(20)).toBe('moderee');
    });
  });
});
