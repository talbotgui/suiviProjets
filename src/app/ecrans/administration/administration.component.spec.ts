// Test de l'écran Administration (cf. administration.component.ts), généré avec l'assistance de l'IA (Claude
// Code), conformément à .claude/rules/01-usage-ia-et-conventions.md.
import { TestBed } from '@angular/core/testing';
import { SqmAdministrationComponent } from './administration.component';

describe('SqmAdministrationComponent', () => {
  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [SqmAdministrationComponent],
    }).compileComponents();
  });

  it("affiche l'onglet Groupes par défaut", () => {
    const composant = TestBed.createComponent(SqmAdministrationComponent).componentInstance;

    expect(composant.ongletActif).toBe('groupes');
  });

  it.each(['groupes', 'projets', 'sources'] as const)('sélectionne l’onglet « %s »', (onglet) => {
    const composant = TestBed.createComponent(SqmAdministrationComponent).componentInstance;

    composant.selectionnerOnglet(onglet);

    expect(composant.ongletActif).toBe(onglet);
  });
});
