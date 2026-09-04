// Test de PriseEnChargeUtils (cf. prise-en-charge.utils.ts, US-058, RG-058, plan_18), généré avec l'assistance de
// l'IA (Claude Code), conformément à .claude/rules/01-usage-ia-et-conventions.md.
import { PriseEnChargeUtils } from './prise-en-charge.utils';
import type { EtatPriseEnCharge } from './prise-en-charge.utils';

/**
 * Fabrique de résultats de prise en charge de test, classe à membres statiques uniquement conformément à la règle
 * « aucune fonction hors classe » des normes de développement du projet.
 */
class DonneesDeTest {
  /**
   * Construit un résultat `determine`.
   * @param date - Date du premier commit interne.
   * @param empreinte - Empreinte du référentiel `interne` figée au calcul.
   * @returns Le résultat.
   */
  public static determine(date: string, empreinte: string): EtatPriseEnCharge {
    return { statut: 'determine', date, empreinteReferentiel: empreinte };
  }

  /**
   * Construit un résultat non déterminé.
   * @param statut - Discriminant du statut.
   * @param empreinte - Empreinte du référentiel `interne` figée au calcul.
   * @returns Le résultat.
   */
  public static autre(statut: string, empreinte: string): EtatPriseEnCharge {
    return { statut, empreinteReferentiel: empreinte };
  }
}

describe('PriseEnChargeUtils', () => {
  describe('recalculNecessaire', () => {
    it('exige un calcul quand aucun résultat n’est stocké', () => {
      expect(PriseEnChargeUtils.recalculNecessaire(undefined, 'sha256:aaa')).toBe(true);
    });

    it('exige un calcul quand le statut stocké n’est pas « determine »', () => {
      expect(
        PriseEnChargeUtils.recalculNecessaire(
          DonneesDeTest.autre('aucun_membre_interne', 'sha256:aaa'),
          'sha256:aaa',
        ),
      ).toBe(true);
    });

    it('exige un calcul quand l’empreinte du référentiel « interne » a changé', () => {
      expect(
        PriseEnChargeUtils.recalculNecessaire(
          DonneesDeTest.determine('2021-03-15', 'sha256:aaa'),
          'sha256:bbb',
        ),
      ).toBe(true);
    });

    it('n’exige aucun calcul quand le résultat est « determine » et l’empreinte inchangée', () => {
      expect(
        PriseEnChargeUtils.recalculNecessaire(
          DonneesDeTest.determine('2021-03-15', 'sha256:aaa'),
          'sha256:aaa',
        ),
      ).toBe(false);
    });
  });

  describe('identique', () => {
    it('ignore calculeLe, empreinteReferentiel et sha : seuls statut et date comptent', () => {
      const gauche: EtatPriseEnCharge = {
        statut: 'determine',
        date: '2021-03-15',
        empreinteReferentiel: 'sha256:aaa',
      };
      const droite: EtatPriseEnCharge = {
        statut: 'determine',
        date: '2021-03-15',
        empreinteReferentiel: 'sha256:zzz',
      };
      expect(PriseEnChargeUtils.identique(gauche, droite)).toBe(true);
    });

    it('distingue deux résultats « determine » de dates différentes', () => {
      expect(
        PriseEnChargeUtils.identique(
          DonneesDeTest.determine('2021-03-15', 'sha256:aaa'),
          DonneesDeTest.determine('2020-01-02', 'sha256:aaa'),
        ),
      ).toBe(false);
    });

    it('distingue deux statuts différents', () => {
      expect(
        PriseEnChargeUtils.identique(
          DonneesDeTest.autre('aucun_membre_interne', 'sha256:aaa'),
          DonneesDeTest.autre('non_applicable', 'sha256:aaa'),
        ),
      ).toBe(false);
    });

    it('juge équivalents deux résultats non déterminés de même statut', () => {
      expect(
        PriseEnChargeUtils.identique(
          DonneesDeTest.autre('depot_vide', 'sha256:aaa'),
          DonneesDeTest.autre('depot_vide', 'sha256:bbb'),
        ),
      ).toBe(true);
    });
  });
});
