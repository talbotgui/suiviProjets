// Test de ModeAuthentificationUtils (cf. mode-authentification.utils.ts), généré avec l'assistance de l'IA
// (Claude Code), conformément à .claude/rules/01-usage-ia-et-conventions.md.
import { ModeAuthentificationUtils } from './mode-authentification.utils';
import type { RegleAuthentification } from './parametres-jugement.utils';

describe('ModeAuthentificationUtils.detecter (RG-067)', () => {
  const regles: readonly RegleAuthentification[] = [
    { mode: 'CAS', motif: 'org.jasig.cas.client:*' },
    { mode: 'OIDC', motif: 'org.keycloak:*' },
    { mode: 'OIDC', motif: 'keycloak-js' },
    { mode: 'SAML', motif: '*saml*' },
  ];

  it('rend aucunDetecte sans dépendance', () => {
    expect(ModeAuthentificationUtils.detecter([], regles)).toEqual({ type: 'aucunDetecte' });
  });

  it('rend aucunDetecte sans règle', () => {
    expect(
      ModeAuthentificationUtils.detecter([{ reference: 'org.keycloak:keycloak-core' }], []),
    ).toEqual({ type: 'aucunDetecte' });
  });

  it('rend aucunDetecte quand aucune règle ne correspond', () => {
    expect(
      ModeAuthentificationUtils.detecter(
        [{ reference: 'org.springframework.boot:spring-boot-starter-web' }],
        regles,
      ),
    ).toEqual({ type: 'aucunDetecte' });
  });

  it('détecte un mode unique et restitue la référence déclenchante', () => {
    expect(
      ModeAuthentificationUtils.detecter([{ reference: 'org.keycloak:keycloak-core' }], regles),
    ).toEqual({
      type: 'detecte',
      modes: [{ mode: 'OIDC', references: ['org.keycloak:keycloak-core'] }],
    });
  });

  it('restitue plusieurs modes dans l’ordre fixe OIDC, SAML, CAS quel que soit l’ordre des dépendances', () => {
    const detection = ModeAuthentificationUtils.detecter(
      [
        { reference: 'org.jasig.cas.client:cas-client-core' },
        { reference: 'keycloak-js' },
        { reference: 'org.opensaml:opensaml-core' },
      ],
      regles,
    );
    expect(detection.type === 'detecte' ? detection.modes.map((m) => m.mode) : []).toEqual([
      'OIDC',
      'SAML',
      'CAS',
    ]);
  });

  it('dédoublonne et trie les références d’un même mode (plusieurs manifestes, plusieurs règles)', () => {
    expect(
      ModeAuthentificationUtils.detecter(
        [
          { reference: 'org.keycloak:keycloak-core' },
          { reference: 'keycloak-js' },
          { reference: 'org.keycloak:keycloak-core' },
        ],
        regles,
      ),
    ).toEqual({
      type: 'detecte',
      modes: [{ mode: 'OIDC', references: ['keycloak-js', 'org.keycloak:keycloak-core'] }],
    });
  });

  it('trie les références par comparaison relationnelle brute, quel que soit leur ordre d’apparition', () => {
    const detection = ModeAuthentificationUtils.detecter(
      [
        { reference: 'org.keycloak:keycloak-core' },
        { reference: 'keycloak-js' },
        { reference: 'org.keycloak:keycloak-admin' },
        { reference: 'angular-oauth2-oidc' },
      ],
      [...regles, { mode: 'OIDC', motif: 'angular-oauth2-oidc' }],
    );
    expect(detection).toEqual({
      type: 'detecte',
      modes: [
        {
          mode: 'OIDC',
          references: [
            'angular-oauth2-oidc',
            'keycloak-js',
            'org.keycloak:keycloak-admin',
            'org.keycloak:keycloak-core',
          ],
        },
      ],
    });
  });

  it('autorise une même dépendance à déclencher deux modes', () => {
    expect(
      ModeAuthentificationUtils.detecter(
        [{ reference: 'org.jasig.cas.client:saml-bridge' }],
        regles,
      ),
    ).toEqual({
      type: 'detecte',
      modes: [
        { mode: 'SAML', references: ['org.jasig.cas.client:saml-bridge'] },
        { mode: 'CAS', references: ['org.jasig.cas.client:saml-bridge'] },
      ],
    });
  });

  it('accepte un joker au milieu du motif', () => {
    expect(
      ModeAuthentificationUtils.detecter(
        [{ reference: 'org.keycloak:keycloak-core' }, { reference: 'org.autre:keycloak-js' }],
        [{ mode: 'OIDC', motif: 'org.*:keycloak-core' }],
      ),
    ).toEqual({
      type: 'detecte',
      modes: [{ mode: 'OIDC', references: ['org.keycloak:keycloak-core'] }],
    });
  });

  it('applique le motif glob en correspondance intégrale (pas de sous-chaîne implicite)', () => {
    expect(
      ModeAuthentificationUtils.detecter(
        [{ reference: 'keycloak-js-extra' }],
        [{ mode: 'OIDC', motif: 'keycloak-js' }],
      ),
    ).toEqual({ type: 'aucunDetecte' });
  });
});
