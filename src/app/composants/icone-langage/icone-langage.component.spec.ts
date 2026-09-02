// Test du composant Icône de langage (cf. icone-langage.component.ts), généré avec l'assistance de l'IA
// (Claude Code), conformément à .claude/rules/01-usage-ia-et-conventions.md.
import { TestBed } from '@angular/core/testing';
import { SqmIconeLangageComponent } from './icone-langage.component';
import { DomTestUtils } from '../../testing/dom-test.utils';

describe('SqmIconeLangageComponent (RG-057)', () => {
  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [SqmIconeLangageComponent],
    }).compileComponents();
  });

  it.each([
    ['java', 'langages/java.svg', 'Java'],
    ['ts', 'langages/typescript.svg', 'TypeScript'],
    ['js', 'langages/javascript.svg', 'JavaScript'],
    ['web', 'langages/html5.svg', 'HTML'],
    ['css', 'langages/css3.svg', 'CSS'],
  ])('rend l’icône SVG locale pour la clé « %s »', (cleSonar, sourceAttendue, libelleAttendu) => {
    const fixture = TestBed.createComponent(SqmIconeLangageComponent);
    fixture.componentRef.setInput('cleSonar', cleSonar);
    fixture.detectChanges();

    const image = DomTestUtils.obtenirElementNatif(fixture).querySelector('img.icone-langage');
    expect(image).not.toBeNull();
    expect(image?.getAttribute('src')).toBe(sourceAttendue);
    expect(image?.getAttribute('alt')).toBe(libelleAttendu);
    expect(image?.getAttribute('title')).toBe(libelleAttendu);
  });

  it('ignore la casse de la clé Sonar', () => {
    const fixture = TestBed.createComponent(SqmIconeLangageComponent);
    fixture.componentRef.setInput('cleSonar', 'JAVA');
    fixture.detectChanges();

    const image = DomTestUtils.obtenirElementNatif(fixture).querySelector('img.icone-langage');
    expect(image?.getAttribute('src')).toBe('langages/java.svg');
  });

  it.each(['autre', 'cobol', ''])(
    'rend une puce de repli portant le libellé pour la clé non reconnue « %s »',
    (cleSonar) => {
      const fixture = TestBed.createComponent(SqmIconeLangageComponent);
      fixture.componentRef.setInput('cleSonar', cleSonar);
      fixture.detectChanges();

      const racine = DomTestUtils.obtenirElementNatif(fixture);
      expect(racine.querySelector('img')).toBeNull();
      const puce = racine.querySelector('span.icone-langage--repli');
      expect(puce).not.toBeNull();
      expect(puce?.getAttribute('title')).toBe(cleSonar);
      expect(puce?.getAttribute('aria-label')).toBe(cleSonar);
      expect(puce?.textContent?.trim()).toBe(cleSonar.slice(0, 4).toUpperCase());
    },
  );

  it('bascule sur la puce de repli quand le fichier SVG ne se charge pas, puis réarme au changement de clé', () => {
    const fixture = TestBed.createComponent(SqmIconeLangageComponent);
    fixture.componentRef.setInput('cleSonar', 'java');
    fixture.detectChanges();

    const racine = DomTestUtils.obtenirElementNatif(fixture);
    racine.querySelector('img.icone-langage')?.dispatchEvent(new Event('error'));
    fixture.detectChanges();

    expect(racine.querySelector('img')).toBeNull();
    expect(racine.querySelector('span.icone-langage--repli')?.textContent?.trim()).toBe('JAVA');

    // Changement de clé Sonar : nouveau fichier ciblé, l'état d'échec est réarmé et l'image retentée.
    fixture.componentRef.setInput('cleSonar', 'ts');
    fixture.detectChanges();

    const image = racine.querySelector('img.icone-langage');
    expect(image).not.toBeNull();
    expect(image?.getAttribute('src')).toBe('langages/typescript.svg');
  });

  it('applique la classe de taille réduite à la puce de repli quand taille vaut « sm »', () => {
    const fixture = TestBed.createComponent(SqmIconeLangageComponent);
    fixture.componentRef.setInput('cleSonar', 'cobol');
    fixture.componentRef.setInput('taille', 'sm');
    fixture.detectChanges();

    const puce = DomTestUtils.obtenirElementNatif(fixture).querySelector(
      'span.icone-langage--repli',
    );
    expect(puce?.classList.contains('icone-langage--sm')).toBe(true);
  });

  it('applique la classe de taille réduite quand taille vaut « sm »', () => {
    const fixture = TestBed.createComponent(SqmIconeLangageComponent);
    fixture.componentRef.setInput('cleSonar', 'java');
    fixture.componentRef.setInput('taille', 'sm');
    fixture.detectChanges();

    const image = DomTestUtils.obtenirElementNatif(fixture).querySelector('img.icone-langage');
    expect(image?.classList.contains('icone-langage--sm')).toBe(true);
  });

  it('n’applique pas la classe de taille réduite par défaut (taille « md »)', () => {
    const fixture = TestBed.createComponent(SqmIconeLangageComponent);
    fixture.componentRef.setInput('cleSonar', 'java');
    fixture.detectChanges();

    const image = DomTestUtils.obtenirElementNatif(fixture).querySelector('img.icone-langage');
    expect(image?.classList.contains('icone-langage--sm')).toBe(false);
  });
});
