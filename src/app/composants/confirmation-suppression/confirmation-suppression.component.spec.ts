// Test du composant de confirmation de suppression (cf. confirmation-suppression.component.ts), généré avec
// l'assistance de l'IA (Claude Code), conformément à .claude/rules/01-usage-ia-et-conventions.md.
import { TestBed } from '@angular/core/testing';
import { SqmConfirmationSuppressionComponent } from './confirmation-suppression.component';

describe('SqmConfirmationSuppressionComponent', () => {
  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [SqmConfirmationSuppressionComponent],
    }).compileComponents();
  });

  it('émet confirmee lorsque la suppression est confirmée', () => {
    const fixture = TestBed.createComponent(SqmConfirmationSuppressionComponent);
    fixture.componentRef.setInput('message', 'Cette suppression est irréversible.');
    const composant = fixture.componentInstance;
    let confirmee = false;
    composant.confirmee.subscribe(() => {
      confirmee = true;
    });

    composant.confirmer();

    expect(confirmee).toBe(true);
  });

  it('émet annulee lorsque la suppression est annulée', () => {
    const fixture = TestBed.createComponent(SqmConfirmationSuppressionComponent);
    fixture.componentRef.setInput('message', 'Cette suppression est irréversible.');
    const composant = fixture.componentInstance;
    let annulee = false;
    composant.annulee.subscribe(() => {
      annulee = true;
    });

    composant.annuler();

    expect(annulee).toBe(true);
  });

  it('utilise « Supprimer » comme libellé de confirmation par défaut', () => {
    const fixture = TestBed.createComponent(SqmConfirmationSuppressionComponent);
    fixture.componentRef.setInput('message', 'Cette suppression est irréversible.');

    expect(fixture.componentInstance.libelleConfirmation()).toBe('Supprimer');
  });
});
