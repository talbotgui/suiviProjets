// Test du composant Bandeau d'alerte (cf. bandeau-alerte.component.ts, RG-009), généré avec l'assistance de l'IA
// (Claude Code), conformément à .claude/rules/01-usage-ia-et-conventions.md.
import { TestBed } from '@angular/core/testing';
import { SqmBandeauAlerteComponent } from './bandeau-alerte.component';
import { DomTestUtils } from '../../testing/dom-test.utils';

describe('SqmBandeauAlerteComponent', () => {
  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [SqmBandeauAlerteComponent],
    }).compileComponents();
  });

  it('affiche le message d’alerte fourni avec un rôle alert', () => {
    const fixture = TestBed.createComponent(SqmBandeauAlerteComponent);
    fixture.componentRef.setInput('message', '2 membres inconnus détectés sur ce projet.');
    fixture.detectChanges();

    const element = DomTestUtils.obtenirElementNatif(fixture);
    expect(element.querySelector('[role="alert"]')?.textContent).toContain(
      '2 membres inconnus détectés',
    );
  });

  it('n’affiche aucun bouton d’action si libelleAction n’est pas fourni', () => {
    const fixture = TestBed.createComponent(SqmBandeauAlerteComponent);
    fixture.componentRef.setInput('message', 'Alerte.');
    fixture.detectChanges();

    const bouton = DomTestUtils.obtenirElementNatif(fixture).querySelector('button');
    expect(bouton).toBeNull();
  });

  it('affiche un bouton d’action focusable au clavier quand libelleAction est fourni', () => {
    const fixture = TestBed.createComponent(SqmBandeauAlerteComponent);
    fixture.componentRef.setInput('message', 'Alerte.');
    fixture.componentRef.setInput('libelleAction', 'Voir le détail');
    fixture.detectChanges();

    const bouton = DomTestUtils.obtenirElementNatif(fixture).querySelector('button');
    expect(bouton).not.toBeNull();
    expect(bouton?.textContent?.trim()).toBe('Voir le détail');
    expect(bouton?.tabIndex).toBeGreaterThanOrEqual(0);

    bouton?.focus();
    expect(document.activeElement).toBe(bouton);
  });

  it('émet action lorsque le bouton est activé', () => {
    const fixture = TestBed.createComponent(SqmBandeauAlerteComponent);
    fixture.componentRef.setInput('message', 'Alerte.');
    fixture.componentRef.setInput('libelleAction', 'Voir le détail');
    fixture.detectChanges();
    const composant = fixture.componentInstance;
    let declenchee = false;
    composant.action.subscribe(() => {
      declenchee = true;
    });

    const bouton = DomTestUtils.obtenirElementNatif(fixture).querySelector('button');
    bouton?.click();

    expect(declenchee).toBe(true);
  });
});
