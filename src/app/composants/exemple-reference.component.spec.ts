// Test du composant de référence exemplaire (cf. exemple-reference.component.ts), généré avec l'assistance de
// l'IA (Claude Code), conformément à .claude/rules/01-usage-ia-et-conventions.md.
import { TestBed } from '@angular/core/testing';
import { DomTestUtils } from '../testing/dom-test.utils';
import { SqmExempleReferenceComponent } from './exemple-reference.component';

describe('SqmExempleReferenceComponent', () => {
  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [SqmExempleReferenceComponent],
    }).compileComponents();
  });

  it('doit émettre le libellé courant lors de son activation', () => {
    const fixture = TestBed.createComponent(SqmExempleReferenceComponent);
    fixture.componentRef.setInput('libelle', 'Bonjour');
    const composant = fixture.componentInstance;
    let libelleEmis: string | undefined;
    composant.activation.subscribe((libelle: string) => {
      libelleEmis = libelle;
    });

    composant.gererActivation();

    expect(libelleEmis).toBe('Bonjour');
  });

  it('doit afficher le formulaire puis poser le focus sur son premier champ après rendu (C15-02)', async () => {
    const fixture = TestBed.createComponent(SqmExempleReferenceComponent);
    fixture.componentRef.setInput('libelle', 'Bonjour');
    fixture.detectChanges();
    const composant = fixture.componentInstance;

    composant.ouvrirFormulaire();
    fixture.detectChanges();
    await fixture.whenStable();

    const champ: HTMLInputElement | null = DomTestUtils.obtenirElementNatif(fixture).querySelector(
      '[type="text"].champ__controle',
    );
    expect(champ).not.toBeNull();
    expect(document.activeElement).toBe(champ);
  });
});
