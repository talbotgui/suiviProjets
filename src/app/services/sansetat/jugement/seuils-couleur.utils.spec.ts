// Test des fonctions génériques « valeur + seuils orange/rouge → couleur » (cf. seuils-couleur.utils.ts, RG-022),
// généré avec l'assistance de l'IA (Claude Code), conformément à .claude/rules/01-usage-ia-et-conventions.md.
import { SeuilsCouleurUtils } from './seuils-couleur.utils';

describe('SeuilsCouleurUtils', () => {
  describe('calculerCouleurCroissante', () => {
    it('restitue vert sous le seuil orange', () => {
      expect(SeuilsCouleurUtils.calculerCouleurCroissante(0, 10, 25)).toBe('vert');
    });

    it('restitue orange exactement au seuil orange (cas limite : >=)', () => {
      expect(SeuilsCouleurUtils.calculerCouleurCroissante(10, 10, 25)).toBe('orange');
    });

    it('restitue orange entre les deux seuils', () => {
      expect(SeuilsCouleurUtils.calculerCouleurCroissante(15, 10, 25)).toBe('orange');
    });

    it('restitue rouge exactement au seuil rouge (cas limite : >=)', () => {
      expect(SeuilsCouleurUtils.calculerCouleurCroissante(25, 10, 25)).toBe('rouge');
    });

    it('restitue rouge au-delà du seuil rouge', () => {
      expect(SeuilsCouleurUtils.calculerCouleurCroissante(100, 10, 25)).toBe('rouge');
    });
  });

  describe('calculerCouleurDecroissante', () => {
    it('restitue vert au-dessus du seuil orange', () => {
      expect(SeuilsCouleurUtils.calculerCouleurDecroissante(80, 40, 60)).toBe('vert');
    });

    it('restitue orange exactement au seuil orange (cas limite : appartient à la couleur supérieure)', () => {
      expect(SeuilsCouleurUtils.calculerCouleurDecroissante(60, 40, 60)).toBe('vert');
    });

    it('restitue orange juste sous le seuil orange', () => {
      expect(SeuilsCouleurUtils.calculerCouleurDecroissante(59, 40, 60)).toBe('orange');
    });

    it('restitue orange exactement au seuil rouge (cas limite : appartient à la couleur supérieure)', () => {
      expect(SeuilsCouleurUtils.calculerCouleurDecroissante(40, 40, 60)).toBe('orange');
    });

    it('restitue rouge juste sous le seuil rouge', () => {
      expect(SeuilsCouleurUtils.calculerCouleurDecroissante(39, 40, 60)).toBe('rouge');
    });
  });

  describe('calculerCouleurSeuilUnique', () => {
    it('restitue vert sous le seuil', () => {
      expect(SeuilsCouleurUtils.calculerCouleurSeuilUnique(49, 50)).toBe('vert');
    });

    it('restitue rouge exactement au seuil (cas limite : >=)', () => {
      expect(SeuilsCouleurUtils.calculerCouleurSeuilUnique(50, 50)).toBe('rouge');
    });

    it('restitue rouge au-delà du seuil', () => {
      expect(SeuilsCouleurUtils.calculerCouleurSeuilUnique(100, 50)).toBe('rouge');
    });
  });

  describe('calculerCouleurVitalite', () => {
    it('délègue à calculerCouleurCroissante avec mourantJours/mortJours', () => {
      expect(SeuilsCouleurUtils.calculerCouleurVitalite(90, 180, 365)).toBe('vert');
      expect(SeuilsCouleurUtils.calculerCouleurVitalite(180, 180, 365)).toBe('orange');
      expect(SeuilsCouleurUtils.calculerCouleurVitalite(365, 180, 365)).toBe('rouge');
    });
  });

  describe('calculerCouleurAgeMrOuverte', () => {
    it('délègue à calculerCouleurCroissante avec ageOrangeJours/ageRougeJours', () => {
      expect(SeuilsCouleurUtils.calculerCouleurAgeMrOuverte(10, 30, 90)).toBe('vert');
      expect(SeuilsCouleurUtils.calculerCouleurAgeMrOuverte(30, 30, 90)).toBe('orange');
      expect(SeuilsCouleurUtils.calculerCouleurAgeMrOuverte(90, 30, 90)).toBe('rouge');
    });
  });

  describe('calculerCouleurConflitMrOuvertes', () => {
    it('délègue à calculerCouleurSeuilUnique avec pourcentageConflitRouge', () => {
      expect(SeuilsCouleurUtils.calculerCouleurConflitMrOuvertes(10, 50)).toBe('vert');
      expect(SeuilsCouleurUtils.calculerCouleurConflitMrOuvertes(50, 50)).toBe('rouge');
    });
  });

  describe('calculerCouleurCouverture', () => {
    it('délègue à calculerCouleurDecroissante avec seuilRouge/seuilOrange', () => {
      expect(SeuilsCouleurUtils.calculerCouleurCouverture(80, 40, 60)).toBe('vert');
      expect(SeuilsCouleurUtils.calculerCouleurCouverture(50, 40, 60)).toBe('orange');
      expect(SeuilsCouleurUtils.calculerCouleurCouverture(20, 40, 60)).toBe('rouge');
    });
  });

  describe('calculerCouleurViolations', () => {
    it('délègue à calculerCouleurCroissante avec seuilOrange/seuilRouge', () => {
      expect(SeuilsCouleurUtils.calculerCouleurViolations(0, 1, 3)).toBe('vert');
      expect(SeuilsCouleurUtils.calculerCouleurViolations(1, 1, 3)).toBe('orange');
      expect(SeuilsCouleurUtils.calculerCouleurViolations(3, 1, 3)).toBe('rouge');
    });
  });
});
