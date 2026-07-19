// Test du composant de référence exemplaire (cf. exemple-reference.component.ts), généré avec l'assistance de
// l'IA (Claude Code), conformément à .claude/rules/01-usage-ia-et-conventions.md.
import { TestBed } from '@angular/core/testing';
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
});
