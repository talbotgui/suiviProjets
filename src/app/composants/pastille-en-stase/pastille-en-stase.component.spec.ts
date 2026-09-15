// Test du composant Pastille en stase (cf. pastille-en-stase.component.ts), généré avec l'assistance de l'IA
// (Claude Code), conformément à .claude/rules/01-usage-ia-et-conventions.md.
import { TestBed } from '@angular/core/testing';
import { SqmPastilleEnStaseComponent } from './pastille-en-stase.component';
import { DomTestUtils } from '../../testing/dom-test.utils';

describe('SqmPastilleEnStaseComponent', () => {
  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [SqmPastilleEnStaseComponent],
    }).compileComponents();
  });

  it('affiche le libellé « en stase » en clair, jamais la seule couleur (RNF-020)', () => {
    const fixture = TestBed.createComponent(SqmPastilleEnStaseComponent);
    fixture.detectChanges();

    const texte = DomTestUtils.obtenirElementNatif(fixture).textContent;
    expect(texte).toContain('en stase');
  });

  it('expose un rôle status pour les technologies d’assistance', () => {
    const fixture = TestBed.createComponent(SqmPastilleEnStaseComponent);
    fixture.detectChanges();

    const pastille = DomTestUtils.obtenirElementNatif(fixture).querySelector('[role="status"]');
    expect(pastille).not.toBeNull();
  });

  it('rend une pastille distincte de app-badge (aucune classe badge)', () => {
    const fixture = TestBed.createComponent(SqmPastilleEnStaseComponent);
    fixture.detectChanges();

    const racine = DomTestUtils.obtenirElementNatif(fixture).querySelector('.pastille-en-stase');
    expect(racine).not.toBeNull();
    expect(racine?.classList.contains('badge')).toBe(false);
  });
});
