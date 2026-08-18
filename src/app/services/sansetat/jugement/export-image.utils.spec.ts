// Test de la construction du nom de fichier suggéré lors de l'export PNG d'un écran (cf. export-image.utils.ts,
// US-047/RG-047, C15-15), généré avec l'assistance de l'IA (Claude Code), conformément à
// .claude/rules/01-usage-ia-et-conventions.md.
import { ExportImageUtils } from './export-image.utils';

describe('ExportImageUtils', () => {
  describe('normaliserNomProjet', () => {
    it('conserve un nom déjà valide tel quel', () => {
      expect(ExportImageUtils.normaliserNomProjet('mon-projet')).toBe('mon-projet');
    });

    it('remplace les espaces par un tiret', () => {
      expect(ExportImageUtils.normaliserNomProjet('Mon Projet Web')).toBe('Mon-Projet-Web');
    });

    it('supprime les diacritiques', () => {
      expect(ExportImageUtils.normaliserNomProjet('Café Élégant à Zürich')).toBe(
        'Cafe-Elegant-a-Zurich',
      );
    });

    it('remplace les caractères interdits multiplateforme par un tiret', () => {
      expect(ExportImageUtils.normaliserNomProjet('projet/back:api*test?"<x>|y')).toBe(
        'projet-back-api-test-x-y',
      );
    });

    it('réduit les séparateurs consécutifs (interdits et déjà présents) à un seul tiret', () => {
      expect(ExportImageUtils.normaliserNomProjet('Mon   Projet -- Test')).toBe('Mon-Projet-Test');
    });

    it('supprime les tirets en début et fin de chaîne résultante', () => {
      expect(ExportImageUtils.normaliserNomProjet('  /mon-projet/  ')).toBe('mon-projet');
    });

    it('tronque à 50 caractères maximum', () => {
      const nomLong = 'a'.repeat(80);
      const resultat = ExportImageUtils.normaliserNomProjet(nomLong);
      expect(resultat).toBe('a'.repeat(50));
      expect(resultat.length).toBe(50);
    });

    it('supprime un tiret résiduel en fin de chaîne après troncature à 50 caractères', () => {
      // Les 50 premiers caractères se terminent exactement sur le séparateur entre les deux mots.
      const nomProjet = `${'a'.repeat(49)} b`;
      const resultat = ExportImageUtils.normaliserNomProjet(nomProjet);
      expect(resultat).toBe('a'.repeat(49));
      expect(resultat.endsWith('-')).toBe(false);
    });

    it('replie sur "projet" lorsque le nom ne contient plus aucun caractère alphanumérique', () => {
      expect(ExportImageUtils.normaliserNomProjet('///???***')).toBe('projet');
    });

    it('replie sur "projet" pour une chaîne vide', () => {
      expect(ExportImageUtils.normaliserNomProjet('')).toBe('projet');
    });

    it('replie sur "projet" pour un nom composé uniquement d’espaces', () => {
      expect(ExportImageUtils.normaliserNomProjet('   ')).toBe('projet');
    });

    it('conserve les chiffres', () => {
      expect(ExportImageUtils.normaliserNomProjet('Projet 2026')).toBe('Projet-2026');
    });
  });

  describe('construireHorodatage', () => {
    it('met en forme une date en horodatage complet AAAA-MM-JJ_HH-mm-ss', () => {
      const date = new Date(2026, 7, 18, 14, 32, 7);
      expect(ExportImageUtils.construireHorodatage(date)).toBe('2026-08-18_14-32-07');
    });

    it('complète chaque composante à un chiffre par un zéro non significatif', () => {
      const date = new Date(2026, 0, 2, 3, 4, 5);
      expect(ExportImageUtils.construireHorodatage(date)).toBe('2026-01-02_03-04-05');
    });

    it('met en forme minuit correctement (heures/minutes/secondes à zéro)', () => {
      const date = new Date(2026, 11, 31, 0, 0, 0);
      expect(ExportImageUtils.construireHorodatage(date)).toBe('2026-12-31_00-00-00');
    });
  });
});
