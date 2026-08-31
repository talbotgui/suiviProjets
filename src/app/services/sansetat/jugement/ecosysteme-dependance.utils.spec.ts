// Test de EcosystemeDependanceUtils (cf. ecosysteme-dependance.utils.ts), généré avec l'assistance de l'IA
// (Claude Code), conformément à .claude/rules/01-usage-ia-et-conventions.md.
import { EcosystemeDependanceUtils } from './ecosysteme-dependance.utils';

describe('EcosystemeDependanceUtils', () => {
  describe('classifier (RG-056)', () => {
    it.each([
      ['pom.xml', 'maven'],
      ['module-a/pom.xml', 'maven'],
      ['build.gradle', 'maven'],
      ['sous/module/build.gradle', 'maven'],
      ['package.json', 'npm'],
      ['front/package.json', 'npm'],
      ['Cargo.toml', 'autres'],
      ['go.mod', 'autres'],
      ['', 'autres'],
    ] as const)('classe le manifeste « %s » dans « %s »', (manifeste, attendu) => {
      expect(
        EcosystemeDependanceUtils.classifier({ reference: 'com.example:lib', manifeste }),
      ).toBe(attendu);
    });

    it('rattache la pseudo-dépendance de référence « java » à Maven quel que soit le manifeste', () => {
      expect(EcosystemeDependanceUtils.classifier({ reference: 'java', manifeste: '' })).toBe(
        'maven',
      );
      expect(
        EcosystemeDependanceUtils.classifier({ reference: 'java', manifeste: 'front/package.json' }),
      ).toBe('maven');
    });
  });

  describe('ORDRE et titre', () => {
    it('expose les trois écosystèmes dans l’ordre Maven, NPM, Autres', () => {
      expect(EcosystemeDependanceUtils.ORDRE).toEqual(['maven', 'npm', 'autres']);
    });

    it.each([
      ['maven', 'Maven'],
      ['npm', 'NPM'],
      ['autres', 'Autres'],
    ] as const)('rend le titre « %s » → « %s »', (ecosysteme, attendu) => {
      expect(EcosystemeDependanceUtils.titre(ecosysteme)).toBe(attendu);
    });
  });
});
