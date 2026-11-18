// Test du composant Icône de mode d'authentification (cf. icone-authentification.component.ts), généré avec
// l'assistance de l'IA (Claude Code), conformément à .claude/rules/01-usage-ia-et-conventions.md.
import { TestBed } from '@angular/core/testing';
import { SqmIconeAuthentificationComponent } from './icone-authentification.component';
import { DomTestUtils } from '../../testing/dom-test.utils';

describe('SqmIconeAuthentificationComponent (RG-067)', () => {
  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [SqmIconeAuthentificationComponent],
    }).compileComponents();
  });

  it.each([
    ['OIDC', 'authentification/oidc.svg', 'Authentification OIDC'],
    ['SAML', 'authentification/saml.svg', 'Authentification SAML'],
    ['CAS', 'authentification/cas.svg', 'Authentification CAS'],
  ])('rend le pictogramme local du mode « %s »', (variante, sourceAttendue, libelleAttendu) => {
    const fixture = TestBed.createComponent(SqmIconeAuthentificationComponent);
    fixture.componentRef.setInput('variante', variante);
    fixture.componentRef.setInput('references', ['org.keycloak:keycloak-core', 'keycloak-js']);
    fixture.detectChanges();

    const image = DomTestUtils.obtenirElementNatif(fixture).querySelector(
      'img.icone-authentification',
    );
    expect(image?.getAttribute('src')).toBe(sourceAttendue);
    expect(image?.getAttribute('alt')).toBe(libelleAttendu);
    expect(image?.getAttribute('title')).toBe(
      `${libelleAttendu} détectée via : org.keycloak:keycloak-core, keycloak-js`,
    );
  });

  it('omet la liste des dépendances de l’infobulle quand aucune référence n’est fournie', () => {
    const fixture = TestBed.createComponent(SqmIconeAuthentificationComponent);
    fixture.componentRef.setInput('variante', 'CAS');
    fixture.detectChanges();

    const image = DomTestUtils.obtenirElementNatif(fixture).querySelector('img');
    expect(image?.getAttribute('title')).toBe('Authentification CAS détectée');
  });

  it('rend la mention neutre pour la variante « aucun », sans affirmer d’absence d’authentification', () => {
    const fixture = TestBed.createComponent(SqmIconeAuthentificationComponent);
    fixture.componentRef.setInput('variante', 'aucun');
    fixture.detectChanges();

    const image = DomTestUtils.obtenirElementNatif(fixture).querySelector('img');
    expect(image?.getAttribute('src')).toBe('authentification/aucun.svg');
    expect(image?.getAttribute('alt')).toBe('Aucune authentification détectée');
    expect(image?.getAttribute('title')).toBe(
      'Aucune authentification détectée parmi les dépendances déclarées',
    );
  });

  it('bascule sur la puce de repli quand le pictogramme ne se charge pas, puis réarme au changement de variante', () => {
    const fixture = TestBed.createComponent(SqmIconeAuthentificationComponent);
    fixture.componentRef.setInput('variante', 'SAML');
    fixture.componentRef.setInput('taille', 'sm');
    fixture.detectChanges();

    const racine = DomTestUtils.obtenirElementNatif(fixture);
    racine.querySelector('img.icone-authentification')?.dispatchEvent(new Event('error'));
    fixture.detectChanges();

    expect(racine.querySelector('img')).toBeNull();
    const puce = racine.querySelector('span.icone-authentification--repli');
    expect(puce?.textContent?.trim()).toBe('SAML');
    expect(puce?.getAttribute('aria-label')).toBe('Authentification SAML');
    expect(puce?.classList.contains('icone-authentification--sm')).toBe(true);

    fixture.componentRef.setInput('variante', 'OIDC');
    fixture.detectChanges();
    expect(racine.querySelector('img')?.getAttribute('src')).toBe('authentification/oidc.svg');
  });
});
