// Test de la construction du lien direct vers une source GitLab/Sonar (cf. lien-externe-source.utils.ts,
// US-008/RG-045, C15-13), généré avec l'assistance de l'IA (Claude Code), conformément à
// .claude/rules/01-usage-ia-et-conventions.md.
import { LienExterneSourceUtils } from './lien-externe-source.utils';

describe('LienExterneSourceUtils', () => {
  describe('construireLienGitlab', () => {
    it('construit le lien de redirection GitLab par identifiant numérique de projet', () => {
      expect(LienExterneSourceUtils.construireLienGitlab('https://gitlab.exemple.fr', '1234')).toBe(
        'https://gitlab.exemple.fr/projects/1234',
      );
    });

    it('retire un `/` final de l’URL de base avant construction', () => {
      expect(
        LienExterneSourceUtils.construireLienGitlab('https://gitlab.exemple.fr/', '1234'),
      ).toBe('https://gitlab.exemple.fr/projects/1234');
    });
  });

  describe('construireLienSonar', () => {
    it('construit le lien du tableau de bord de mesure Sonar (SonarQube auto-hébergé)', () => {
      expect(
        LienExterneSourceUtils.construireLienSonar(
          'https://sonar.exemple.fr',
          'entreprise:api-facturation',
        ),
      ).toBe('https://sonar.exemple.fr/dashboard?id=entreprise%3Aapi-facturation');
    });

    it('retire un `/` final de l’URL de base avant construction', () => {
      expect(
        LienExterneSourceUtils.construireLienSonar('https://sonar.exemple.fr/', 'cle-projet'),
      ).toBe('https://sonar.exemple.fr/dashboard?id=cle-projet');
    });
  });
});
