// Test de l'écran Paramétrage (cf. parametrage.component.ts), généré avec l'assistance de l'IA (Claude Code),
// conformément à .claude/rules/01-usage-ia-et-conventions.md.
import { TestBed } from '@angular/core/testing';
import { DomTestUtils } from '../../testing/dom-test.utils';
import { SqmParametrageComponent } from './parametrage.component';

jest.mock('@tauri-apps/api/core', () => ({ invoke: jest.fn() }));

describe('SqmParametrageComponent', () => {
  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [SqmParametrageComponent],
    }).compileComponents();
  });

  it("affiche l'onglet Seuils et référentiels par défaut", () => {
    const composant = TestBed.createComponent(SqmParametrageComponent).componentInstance;

    expect(composant.ongletActif).toBe('seuilsReferentiels');
  });

  it.each(['seuilsReferentiels', 'journal', 'purge', 'exportImport'] as const)(
    'sélectionne l’onglet « %s »',
    (onglet) => {
      const composant = TestBed.createComponent(SqmParametrageComponent).componentInstance;

      composant.selectionnerOnglet(onglet);

      expect(composant.ongletActif).toBe(onglet);
    },
  );

  it.each(['exportImport'] as const)(
    'affiche un contenu de repli explicite pour l’onglet « %s », non encore construit',
    (onglet) => {
      const fixture = TestBed.createComponent(SqmParametrageComponent);
      fixture.componentInstance.selectionnerOnglet(onglet);
      fixture.detectChanges();
      const element = DomTestUtils.obtenirElementNatif(fixture);

      expect(element.textContent).toContain('Onglet à venir');
    },
  );

  it("affiche l'onglet Journal des modifications, construit à cet incrément (US-027)", () => {
    const fixture = TestBed.createComponent(SqmParametrageComponent);
    fixture.componentInstance.selectionnerOnglet('journal');
    fixture.detectChanges();
    const element = DomTestUtils.obtenirElementNatif(fixture);

    expect(element.textContent).not.toContain('Onglet à venir');
    expect(element.textContent).toContain('Journal des modifications');
  });

  it("affiche l'onglet Purge des audits, construit à cet incrément (US-025)", () => {
    const fixture = TestBed.createComponent(SqmParametrageComponent);
    fixture.componentInstance.selectionnerOnglet('purge');
    fixture.detectChanges();
    const element = DomTestUtils.obtenirElementNatif(fixture);

    expect(element.textContent).not.toContain('Onglet à venir');
    expect(element.textContent).toContain('Purge des audits');
  });
});
