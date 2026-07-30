// Test du composant Badge (cf. badge.component.ts), généré avec l'assistance de l'IA (Claude Code), conformément
// à .claude/rules/01-usage-ia-et-conventions.md.
import { TestBed } from '@angular/core/testing';
import { SqmBadgeComponent } from './badge.component';
import { DomTestUtils } from '../../testing/dom-test.utils';

describe('SqmBadgeComponent', () => {
  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [SqmBadgeComponent],
    }).compileComponents();
  });

  it('affiche le libellé textuel fourni, jamais la seule couleur (RNF-020)', () => {
    const fixture = TestBed.createComponent(SqmBadgeComponent);
    fixture.componentRef.setInput('couleur', 'rouge');
    fixture.componentRef.setInput('libelle', 'SONAR_KO');
    fixture.detectChanges();

    const texte = DomTestUtils.obtenirElementNatif(fixture).textContent;
    expect(texte).toContain('SONAR_KO');
  });

  it('applique la classe correspondant à la couleur vert', () => {
    const fixture = TestBed.createComponent(SqmBadgeComponent);
    fixture.componentRef.setInput('couleur', 'vert');
    fixture.componentRef.setInput('libelle', 'Conforme');
    fixture.detectChanges();

    const pastille = DomTestUtils.obtenirElementNatif(fixture).querySelector('.badge');
    expect(pastille?.classList.contains('badge--vert')).toBe(true);
    expect(pastille?.classList.contains('badge--orange')).toBe(false);
    expect(pastille?.classList.contains('badge--rouge')).toBe(false);
  });

  it('applique la classe correspondant à la couleur orange', () => {
    const fixture = TestBed.createComponent(SqmBadgeComponent);
    fixture.componentRef.setInput('couleur', 'orange');
    fixture.componentRef.setInput('libelle', 'Vigilance');
    fixture.detectChanges();

    const pastille = DomTestUtils.obtenirElementNatif(fixture).querySelector('.badge');
    expect(pastille?.classList.contains('badge--orange')).toBe(true);
  });

  it('applique la classe correspondant à la couleur bleu', () => {
    const fixture = TestBed.createComponent(SqmBadgeComponent);
    fixture.componentRef.setInput('couleur', 'bleu');
    fixture.componentRef.setInput('libelle', 'IA interdite — ok sous réserve');
    fixture.detectChanges();

    const pastille = DomTestUtils.obtenirElementNatif(fixture).querySelector('.badge');
    expect(pastille?.classList.contains('badge--bleu')).toBe(true);
    expect(pastille?.classList.contains('badge--vert')).toBe(false);
    expect(pastille?.classList.contains('badge--orange')).toBe(false);
    expect(pastille?.classList.contains('badge--rouge')).toBe(false);
  });

  it('expose un rôle status pour les technologies d’assistance', () => {
    const fixture = TestBed.createComponent(SqmBadgeComponent);
    fixture.componentRef.setInput('couleur', 'rouge');
    fixture.componentRef.setInput('libelle', 'SONAR_KO');
    fixture.detectChanges();

    const pastille = DomTestUtils.obtenirElementNatif(fixture).querySelector('[role="status"]');
    expect(pastille).not.toBeNull();
  });
});
